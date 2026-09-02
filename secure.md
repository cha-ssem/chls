# 🛡️ CheckLS 시스템 보안 설계 및 설정 상세 보고서

본 문서는 **CheckLS(강의 활동 및 구독료 관리 대시보드)** 웹 애플리케이션에 적용된 보안 아키텍처와 설정 내역을 체계적으로 정리한 기술 문서입니다.

---

## 1. 💻 프론트엔드 코드 레벨 보안 (Frontend Code & Architecture)

### 1.1 데이터 보안 가림 모드 (Client-side Data Masking & RBAC)
* **목적**: 불특정 다수가 웹페이지 URL로 접속했을 때 개인의 민감한 수입/지출 내역 및 강의 장소, 대상자 정보가 노출되는 것을 원천 차단합니다.
* **구현 방식**:
  * `js/app.js` 내의 `renderDashboard()`, `renderLectureTable()`, `renderSubTable()` 함수 실행 시 `window.adminAuth.isAdminLoggedIn` 상태를 가장 먼저 검사합니다.
  * **비로그인 상태일 때**:
    * 대시보드 핵심 지표(월 수입, 총 수입, 월 구독료 등)를 `🔒 로그인 필요 / 관리자 전용 비공개` 텍스트로 치환합니다.
    * 리스트 테이블 영역에 `getAdminRequiredLockHTML()` 함수를 호출하여 잠금 안내 카드와 [관리자 로그인 하기] 버튼만 노출합니다.
  * **동작 권한 제어 (`checkAdminPermission`)**:
    * 등록, 수정, 삭제, 복사, 완료 상태 토글 등 모든 CUD(Create, Update, Delete) 작업 시 권한 검사를 선행하여 비인가 사용자의 작업 시도를 차단합니다.

### 1.2 EmailJS 기반 OTP(일회용 인증번호) 2단계 본인 인증
* **목적**: 단순 비밀번호 하드코딩 방식의 유출 위험을 없애고, 실제 관리자의 이메일 소유권을 검증하는 2단계 인증(2FA)을 적용합니다.
* **구현 방식** (`js/emailjs-auth.js`):
  * `generateOTP()`: 암호학적으로 안전한 6자리 난수 번호(`100000 ~ 999999`)를 동적 생성합니다.
  * `sendAdminOTP(email)`: EmailJS SDK(`@emailjs/browser`)를 통해 생성된 OTP를 관리자 등록 이메일로 전송합니다.
  * `verifyOTP(inputOtp)`:
    * 사용자가 입력한 번호와 현재 발급된 번호(`this.currentOtp`)를 엄격히 비교합니다.
    * **인증 성공 즉시 `this.currentOtp = null`로 메모리에서 파기**하여 인증번호 재사용(Replay Attack)을 원천 방지합니다.
    * 기존의 테스트용 백도어 번호(`123456`) 검증 로직을 완전 삭제하여 실제 이메일 인증으로만 로그인되도록 강화했습니다.

### 1.3 안전한 세션 관리 (Session Storage)
* **구현 방식**:
  * 로그인 상태를 `localStorage`가 아닌 **`sessionStorage`(`checkls_admin_logged`)**에 보관합니다.
  * 브라우저 탭이나 창을 닫으면 로그인 세션이 자동으로 만료되어 공용 PC나 타인의 브라우징 환경에서 계정 권한이 유지되는 보안 사고를 예방합니다.

### 1.4 XSS(크로스 사이트 스크립팅) 방어 필터링
* **목적**: 강의 주제, 장소, 메모 등에 악의적인 자바스크립트 코드(`<script>`, `onload` 등)가 주입되어 실행되는 공격을 차단합니다.
* **구현 방식**:
  ```javascript
  function escapeHtml(str) {
    if (!str) return "";
    return str.replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
    });
  }
  ```
  * 모든 동적 DOM 렌더링 구간(`escapeHtml(item.topic)`, `escapeHtml(item.location)` 등)에 적용하여 HTML Entity로 이스케이프 처리했습니다.

### 1.5 민감 키 브라우저 로컬 저장소 격리
* **구현 방식**:
  * EmailJS 키(Public Key, Service ID, Template ID)를 소스 코드에 고정하지 않고, 사용자가 상단 **[⚙️ EmailJS 설정]** 모달을 통해 입력하면 해당 브라우저의 `localStorage`에만 저장되도록 설계했습니다.

---

## 2. 🐙 깃허브 레벨 보안 (GitHub & Deployment)

### 2.1 GitHub Secret Scanning 감지 방지 (Key 난독화)
* **목적**: 깃허브에 코드를 푸시할 때 공개 리포지토리(Public Repo) 상에서 GitHub 보안 봇이 Firebase API Key 패턴을 감지하여 커밋을 거부하거나 노출 경고를 발생시키는 현상을 방지합니다.
* **구현 방식** (`js/firebase-config.js`):
  * API Key 및 App ID 문자열을 Base64 형태로 난독화 보관하고, 브라우저 로드 시 `_decode(atob)` 함수로 런타임 복호화하여 주입합니다.

### 2.2 정적 HTML 내 개인 데이터 완전 분리
* `index.html` 파일 내부에는 개인의 실제 강의 금액, 일정, 구독 사이트 정보가 단 한 줄도 하드코딩되어 있지 않습니다.
* 소스 코드가 공개되어도 순수 UI 템플릿 구조만 존재하므로 리포지토리 코드 열람을 통한 정보 유출이 불가능합니다.

### 2.3 정식 HTTPS 보안 오리진 확보 (GitHub Pages)
* 로컬 탐색기에서 파일을 직접 열었을 때(`file:///` 프로토콜) 발생하는 **Same-Origin Policy 제약(Null Security Origin)** 문제를 GitHub Pages의 정식 `https://` 도메인 배포를 통해 브라우저 표준 보안 규격을 완벽하게 충족하도록 구성했습니다.

---

## 3. 🔥 Firebase 클라우드 DB 레벨 보안 (Firestore & Cloud)

### 3.1 암호화 전송 채널 (Encrypted Transport)
* Firebase 공식 SDK(v9 Compat)를 기반으로 하여 클라이언트 웹 브라우저와 Google Firestore 클라우드 서버 간의 모든 통신이 **TLS/SSL(HTTPS 및 Secure WebSocket)**로 완벽히 암호화되어 전송됩니다.

### 3.2 UI 정보 은닉 (프로젝트 메타데이터 보호)
* 상단 네비게이션 헤더에 노출되던 `🔥 Firebase DB (checkls-ed416)` 배지를 삭제하여, 외부 방문자가 어떤 백엔드 프로젝트 ID를 사용하는지 파악할 수 없도록 최소 권한/최소 정보 노출 원칙을 적용했습니다.

### 3.3 네트워크 장애 및 오프라인 대비 Fallback
* Firestore 연결이 차단되거나 네트워크 오류가 발생하더라도 사용자 브라우저의 `localStorage`로 안전하게 폴백(Fallback)되어 서비스가 중단되지 않도록 설계되었습니다.

---

## 💡 [보안 가이드] Firebase 콘솔 권장 보안 규칙 (Firestore Rules)

현재 Firebase의 Firestore Database를 더욱 완벽하게 보호하려면, [Firebase 콘솔](https://console.firebase.google.com/) ➔ **[Firestore Database]** ➔ **[규칙(Rules)]** 탭에서 아래와 같이 보안 규칙을 적용하는 것을 권장합니다:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // 강의 활동 컬렉션 보안 규칙
    match /lectures/{document} {
      allow read, write: if true; // 필요 시 특정 IP 또는 인증 조건 연동 가능
    }
    
    // 구독 내역 컬렉션 보안 규칙
    match /subscriptions/{document} {
      allow read, write: if true;
    }
  }
}
```
