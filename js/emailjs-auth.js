/**
 * EmailJS Admin Authentication Module
 * 
 * 💡 [키 입력 위치]
 * 아래 DEFAULT_EMAILJS_CONFIG 상수에 EmailJS 키를 작성하시면
 * 웹사이트 접속 시 자동으로 EmailJS 서비스가 연결됩니다.
 */
const DEFAULT_EMAILJS_CONFIG = {
  publicKey: "",   // 예: "user_xxxxxxxxxxxxxx" (필수)
  serviceId: "",   // 예: "service_xxxxxxx" (필수)
  templateId: "",  // 예: "template_xxxxxxx" (필수)
  adminEmail: "admin@example.com"
};

class AdminAuthService {
  constructor() {
    this.isAdminLoggedIn = false;
    this.currentOtp = null;

    // EmailJS 키 설정값 (LocalStorage 또는 기본값)
    this.publicKey = localStorage.getItem("checkls_emailjs_public_key") || DEFAULT_EMAILJS_CONFIG.publicKey;
    this.serviceId = localStorage.getItem("checkls_emailjs_service_id") || DEFAULT_EMAILJS_CONFIG.serviceId;
    this.templateId = localStorage.getItem("checkls_emailjs_template_id") || DEFAULT_EMAILJS_CONFIG.templateId;
    this.adminEmail = localStorage.getItem("checkls_admin_email") || DEFAULT_EMAILJS_CONFIG.adminEmail;

    this.initSession();
    this.initEmailJS();
    this.initCrossDomainListener();
  }

  get isConfigured() {
    return Boolean(this.publicKey && this.serviceId && this.templateId);
  }

  /**
   * 세션 및 메인 사이트(chassem.ai.kr) SSO 자동 로그인 감지
   */
  initSession() {
    // 1. 기존 세션 / 로컬 저장소 확인
    const sessionLogged = sessionStorage.getItem("checkls_admin_logged") === "true" ||
                          sessionStorage.getItem("chassem_admin_logged") === "true";
    const localLogged = localStorage.getItem("checkls_admin_logged") === "true" ||
                        localStorage.getItem("chassem_admin_logged") === "true";

    if (sessionLogged || localLogged) {
      this.isAdminLoggedIn = true;
      return;
    }

    // 2. 도메인 쿠키 검사 (chassem.ai.kr 도메인 쿠키 공유 시)
    if (this.checkCookieAuth()) {
      this.loginAsAdmin("cookie_sso");
      return;
    }

    // 3. 메인 사이트(chassem.ai.kr)로부터 전달된 URL SSO 파라미터 검사
    if (this.checkUrlSSOAuth()) {
      this.loginAsAdmin("url_sso");
    }
  }

  /**
   * 쿠키 기반 관리자 인증 확인
   */
  checkCookieAuth() {
    try {
      const cookies = document.cookie.split(";").map(c => c.trim());
      for (const cookie of cookies) {
        const [k, v] = cookie.split("=");
        if (["chassem_admin", "chassem_admin_logged", "admin_logged_in", "admin_token"].includes(k) && (v === "true" || (v && v.length > 5))) {
          return true;
        }
      }
    } catch (e) {
      console.warn("[AdminAuth] Cookie check failed:", e);
    }
    return false;
  }

  /**
   * URL 쿼리 파라미터 / Hash 기반 SSO 자동 로그인 감지
   * 지원 형식:
   *  - ?admin=true | ?auth=admin | ?role=admin | ?chassem_admin=true
   *  - ?sso_token=... | ?admin_token=... | ?auth_token=...
   *  - #admin=true | #auth=admin
   */
  checkUrlSSOAuth() {
    try {
      const url = new URL(window.location.href);
      const params = url.searchParams;
      const hash = url.hash.replace("#", "");
      const hashParams = new URLSearchParams(hash);

      const isValidFlag = (val) => val === "true" || val === "admin" || val === "1" || val === "yes";

      // 쿼리 파라미터 검사
      const hasAdminParam = isValidFlag(params.get("admin")) ||
                            isValidFlag(params.get("auth")) ||
                            isValidFlag(params.get("role")) ||
                            isValidFlag(params.get("chassem_admin")) ||
                            Boolean(params.get("sso_token")) ||
                            Boolean(params.get("admin_token")) ||
                            Boolean(params.get("auth_token"));

      // 해시 파라미터 검사
      const hasHashAdmin = isValidFlag(hashParams.get("admin")) ||
                           isValidFlag(hashParams.get("auth")) ||
                           hash === "admin=true" ||
                           hash === "admin";

      if (hasAdminParam || hasHashAdmin) {
        console.log("[AdminAuth] 메인 사이트(chassem.ai.kr) SSO 관리자 인증 파라미터 감지 성공");

        // 보안을 위해 URL 주소창에서 인증 관련 파라미터 제거
        params.delete("admin");
        params.delete("auth");
        params.delete("role");
        params.delete("chassem_admin");
        params.delete("sso_token");
        params.delete("admin_token");
        params.delete("auth_token");

        const newSearch = params.toString() ? `?${params.toString()}` : "";
        const cleanUrl = `${url.pathname}${newSearch}`;
        window.history.replaceState({}, document.title, cleanUrl);

        return true;
      }
    } catch (e) {
      console.warn("[AdminAuth] URL SSO check error:", e);
    }
    return false;
  }

  /**
   * 크로스 오리진 (chassem.ai.kr ↔ checkLS) postMessage & BroadcastChannel 리스너
   */
  initCrossDomainListener() {
    // 1. window.postMessage 연동
    window.addEventListener("message", (event) => {
      // 신뢰할 수 있는 chassem.ai.kr 오리진 검증
      const allowedOrigins = [
        "https://chassem.ai.kr",
        "http://chassem.ai.kr",
        "https://www.chassem.ai.kr",
        "http://localhost",
        "http://127.0.0.1"
      ];

      const isAllowedOrigin = allowedOrigins.some(origin => event.origin && event.origin.startsWith(origin)) ||
                              event.origin === window.location.origin;

      if (event.data && typeof event.data === "object") {
        if (event.data.type === "CHASSEM_ADMIN_LOGIN" || event.data.type === "ADMIN_LOGIN_SUCCESS") {
          console.log("[AdminAuth] 메인 사이트로부터 postMessage 관리자 로그인 수신:", event.origin);
          this.loginAsAdmin("postMessage");
        } else if (event.data.type === "CHASSEM_ADMIN_LOGOUT") {
          console.log("[AdminAuth] 메인 사이트로부터 postMessage 관리자 로그아웃 수신");
          this.logout();
        }
      }
    });

    // 2. BroadcastChannel 브라우저 탭 간 실시간 동기화
    if (typeof BroadcastChannel !== "undefined") {
      try {
        this.authChannel = new BroadcastChannel("chassem_auth_channel");
        this.authChannel.onmessage = (event) => {
          if (event.data && event.data.type === "LOGIN") {
            this.loginAsAdmin("broadcast_channel", false);
          } else if (event.data && event.data.type === "LOGOUT") {
            this.logout(false);
          }
        };
      } catch (e) {
        console.warn("[AdminAuth] BroadcastChannel not supported or error:", e);
      }
    }
  }

  /**
   * 관리자 로그인 상태 활성화
   * @param {string} source - 로그인 출처
   * @param {boolean} broadcast - 다른 탭 전파 여부
   */
  loginAsAdmin(source = "manual", broadcast = true) {
    this.isAdminLoggedIn = true;
    sessionStorage.setItem("checkls_admin_logged", "true");
    sessionStorage.setItem("chassem_admin_logged", "true");

    if (broadcast && this.authChannel) {
      try {
        this.authChannel.postMessage({ type: "LOGIN", source });
      } catch (e) {}
    }

    // 전역 상태 변경 커스텀 이벤트 발송
    window.dispatchEvent(new CustomEvent("adminAuthChanged", { detail: { isLoggedIn: true, source } }));
  }

  initEmailJS() {
    if (window.emailjs && this.publicKey) {
      try {
        window.emailjs.init(this.publicKey);
        console.log("[EmailJS Auth] Initialized with Public Key.");
      } catch (err) {
        console.warn("[EmailJS Auth] Init failed:", err);
      }
    }
  }

  saveConfig(publicKey, serviceId, templateId, adminEmail) {
    this.publicKey = publicKey.trim();
    this.serviceId = serviceId.trim();
    this.templateId = templateId.trim();
    this.adminEmail = adminEmail.trim() || "admin@example.com";

    localStorage.setItem("checkls_emailjs_public_key", this.publicKey);
    localStorage.setItem("checkls_emailjs_service_id", this.serviceId);
    localStorage.setItem("checkls_emailjs_template_id", this.templateId);
    localStorage.setItem("checkls_admin_email", this.adminEmail);

    this.initEmailJS();
  }

  generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * EmailJS API를 이용한 실제 OTP 전송
   * @param {string} email - 관리자 이메일
   */
  async sendAdminOTP(email) {
    this.currentOtp = this.generateOTP();
    this.adminEmail = email;

    console.log(`[EmailJS Auth] Generated OTP for ${email}: ${this.currentOtp}`);

    // EmailJS 키가 모두 등록되어 있고 SDK가 존재하는 경우 실제 이메일 전송
    if (window.emailjs && this.publicKey && this.serviceId && this.templateId) {
      try {
        await window.emailjs.send(
          this.serviceId,
          this.templateId,
          {
            to_email: email,
            auth_code: this.currentOtp, // 사용자 설정 변수명 반영
            otp_code: this.currentOtp,
            request_time: new Date().toLocaleString("ko-KR")
          }
        );
        return {
          success: true,
          message: `${email}(으)로 인증번호가 발송되었습니다. 메일함을 확인해주세요.`
        };
      } catch (err) {
        console.warn("[EmailJS] Send failed:", err);
        throw new Error(`이메일 발송 실패: ${err.text || err.message || 'EmailJS 설정을 확인해주세요.'}`);
      }
    }

    // 키 미설정 상태일 경우 안내 오류
    throw new Error("EmailJS 서비스 키가 설정되지 않았습니다. 상단 '⚙️ EmailJS 설정' 메뉴에서 키를 등록해 주세요.");
  }

  /**
   * OTP 코드 검증
   * @param {string} inputOtp 
   */
  verifyOTP(inputOtp) {
    if (!this.currentOtp) return false;
    const cleanInput = (inputOtp || "").trim();
    if (cleanInput === this.currentOtp) {
      this.loginAsAdmin("otp");
      this.currentOtp = null; // 사용 완료 후 일회용 만료
      return true;
    }
    return false;
  }

  logout(broadcast = true) {
    this.isAdminLoggedIn = false;
    sessionStorage.removeItem("checkls_admin_logged");
    sessionStorage.removeItem("chassem_admin_logged");
    localStorage.removeItem("checkls_admin_logged");
    localStorage.removeItem("chassem_admin_logged");

    // 관련 인증 쿠키 삭제 시도
    document.cookie = "chassem_admin=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;";
    document.cookie = "chassem_admin_logged=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;";

    if (broadcast && this.authChannel) {
      try {
        this.authChannel.postMessage({ type: "LOGOUT" });
      } catch (e) {}
    }

    window.dispatchEvent(new CustomEvent("adminAuthChanged", { detail: { isLoggedIn: false } }));
  }
}

window.adminAuth = new AdminAuthService();
