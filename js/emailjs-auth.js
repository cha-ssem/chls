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
          message: `[EmailJS 발송 성공] ${email}(으)로 실제 인증번호가 발송되었습니다. 메일함을 확인해주세요.`
        };
      } catch (err) {
        console.warn("[EmailJS] Send failed, falling back to demo notification:", err);
        return {
          success: true,
          message: `[EmailJS 오류 발생: ${err.text || err.message || '설정 확인 필요'}]\n시뮬레이션 인증번호: [ ${this.currentOtp} ] (테스트 PIN: 123456)`
        };
      }
    }

    // 키 미설정 상태일 경우 시뮬레이션 알림
    return {
      success: true,
      message: `[시뮬레이션 발송] EmailJS Key 미설정 상태입니다.\n${email} 님께 발송된 인증번호: [ ${this.currentOtp} ]\n(상단 '⚙️ EmailJS 설정' 메뉴에서 실제 Key를 입력할 수 있습니다)`
    };
  }

  /**
   * OTP 코드 검증
   * @param {string} inputOtp 
   */
  verifyOTP(inputOtp) {
    // 테스트 핀 '123456' 또는 발송된 OTP 번호와 일치 시 성공
    if (inputOtp === this.currentOtp || inputOtp === "123456") {
      this.isAdminLoggedIn = true;
      sessionStorage.setItem("checkls_admin_logged", "true");
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
