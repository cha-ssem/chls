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
  }

  get isConfigured() {
    return Boolean(this.publicKey && this.serviceId && this.templateId);
  }

  initSession() {
    const savedStatus = sessionStorage.getItem("checkls_admin_logged");
    if (savedStatus === "true") {
      this.isAdminLoggedIn = true;
    }
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
      this.isAdminLoggedIn = true;
      sessionStorage.setItem("checkls_admin_logged", "true");
      this.currentOtp = null; // 사용 완료 후 일회용 만료
      return true;
    }
    return false;
  }

  logout() {
    this.isAdminLoggedIn = false;
    sessionStorage.removeItem("checkls_admin_logged");
  }
}

window.adminAuth = new AdminAuthService();
