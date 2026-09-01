/**
 * Firebase Config & Firestore Data Storage Service
 * 
 * 💡 [키 입력 위치]
 * 아래 DEFAULT_FIREBASE_CONFIG에 Firebase 콘솔 키를 따옴표 안에 작성하시면
 * 웹사이트 접속 시 자동으로 Firebase DB와 실시간 연결됩니다.
 */
const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyC-ceBO2xN17jQ9Z6HRQ8EqzGKXQDLc9UE",          // 예: "AIzaSy..." (필수)
  projectId: "checkls-ed416", // 예: "checkLS" (필수)
  authDomain: "checkls-ed416.firebaseapp.com",     // 예: "checkLS.firebaseapp.com" (선택)
  storageBucket: "checkls-ed416.firebasestorage.app", // 예: "checkLS.appspot.com" (선택)
  appId: "1:659000114651:web:cf6c5467cb10423cd23bfe"           // 예: "1:123456789:web:abcdef" (선택)
};

class DataStore {
  constructor() {
    this.db = null;
    this.isFirebaseConnected = false;

    // Firebase Config 정보 로드 (코드 내 기본값 우선 사용)
    this.fbApiKey = localStorage.getItem("checkls_fb_apikey") || DEFAULT_FIREBASE_CONFIG.apiKey;
    this.fbProjectId = localStorage.getItem("checkls_fb_projectid") || DEFAULT_FIREBASE_CONFIG.projectId || "checkLS";
    this.fbAuthDomain = localStorage.getItem("checkls_fb_authdomain") || DEFAULT_FIREBASE_CONFIG.authDomain;
    this.fbStorageBucket = localStorage.getItem("checkls_fb_storagebucket") || DEFAULT_FIREBASE_CONFIG.storageBucket;
    this.fbAppId = localStorage.getItem("checkls_fb_appid") || DEFAULT_FIREBASE_CONFIG.appId;

    this.initFirebase();
  }

  initFirebase() {
    if (window.firebase && this.fbApiKey && this.fbProjectId) {
      try {
        const config = {
          apiKey: this.fbApiKey,
          authDomain: this.fbAuthDomain || `${this.fbProjectId}.firebaseapp.com`,
          projectId: this.fbProjectId,
          storageBucket: this.fbStorageBucket || `${this.fbProjectId}.appspot.com`,
          appId: this.fbAppId
        };

        if (!firebase.apps.length) {
          firebase.initializeApp(config);
        }
        this.db = firebase.firestore();
        this.isFirebaseConnected = true;
        console.log(`[Firebase DB] Connected to project: ${this.fbProjectId}`);
      } catch (err) {
        console.warn("[Firebase DB] Init failed, fallback to LocalStorage:", err);
        this.isFirebaseConnected = false;
      }
    } else {
      this.isFirebaseConnected = false;
    }
  }

  saveFirebaseConfig(apiKey, projectId, authDomain, storageBucket, appId) {
    this.fbApiKey = apiKey.trim();
    this.fbProjectId = projectId.trim() || "checkLS";
    this.fbAuthDomain = authDomain.trim();
    this.fbStorageBucket = storageBucket.trim();
    this.fbAppId = appId.trim();

    localStorage.setItem("checkls_fb_apikey", this.fbApiKey);
    localStorage.setItem("checkls_fb_projectid", this.fbProjectId);
    localStorage.setItem("checkls_fb_authdomain", this.fbAuthDomain);
    localStorage.setItem("checkls_fb_storagebucket", this.fbStorageBucket);
    localStorage.setItem("checkls_fb_appid", this.fbAppId);

    this.initFirebase();
  }

  // ===== 강의 활동 CRUD (Firestore & LocalStorage 하이브리드) =====
  async getLectures() {
    if (this.isFirebaseConnected && this.db) {
      try {
        const snapshot = await this.db.collection("lectures").orderBy("date", "desc").get();
        const list = [];
        snapshot.forEach(doc => {
          list.push({ id: doc.id, ...doc.data() });
        });
        return list;
      } catch (err) {
        console.warn("[Firestore] Read error, fallback to LocalStorage:", err);
      }
    }

    const data = localStorage.getItem("checkls_lectures");
    return data ? JSON.parse(data) : [];
  }

  async addLecture(lectureData) {
    if (this.isFirebaseConnected && this.db) {
      try {
        const docRef = await this.db.collection("lectures").add({
          completed: false,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          ...lectureData
        });
        return { id: docRef.id, completed: false, ...lectureData };
      } catch (err) {
        console.warn("[Firestore] Add error, fallback to LocalStorage:", err);
      }
    }

    const lectures = await this.getLectures();
    const newLecture = {
      id: "lec-" + Date.now(),
      completed: false,
      ...lectureData
    };
    lectures.unshift(newLecture);
    localStorage.setItem("checkls_lectures", JSON.stringify(lectures));
    return newLecture;
  }

  async updateLecture(id, updateData) {
    if (this.isFirebaseConnected && this.db) {
      try {
        await this.db.collection("lectures").doc(id).update(updateData);
        return { id, ...updateData };
      } catch (err) {
        console.warn("[Firestore] Update error, fallback to LocalStorage:", err);
      }
    }

    const lectures = await this.getLectures();
    const index = lectures.findIndex(item => item.id === id);
    if (index !== -1) {
      lectures[index] = { ...lectures[index], ...updateData };
      localStorage.setItem("checkls_lectures", JSON.stringify(lectures));
      return lectures[index];
    }
    return null;
  }

  async deleteLecture(id) {
    if (this.isFirebaseConnected && this.db) {
      try {
        await this.db.collection("lectures").doc(id).delete();
        return;
      } catch (err) {
        console.warn("[Firestore] Delete error, fallback to LocalStorage:", err);
      }
    }

    let lectures = await this.getLectures();
    lectures = lectures.filter(item => item.id !== id);
    localStorage.setItem("checkls_lectures", JSON.stringify(lectures));
  }

  // ===== 구독 사항 CRUD =====
  async getSubscriptions() {
    if (this.isFirebaseConnected && this.db) {
      try {
        const snapshot = await this.db.collection("subscriptions").orderBy("payDate", "desc").get();
        const list = [];
        snapshot.forEach(doc => {
          list.push({ id: doc.id, ...doc.data() });
        });
        return list;
      } catch (err) {
        console.warn("[Firestore] Sub Read error, fallback to LocalStorage:", err);
      }
    }

    const data = localStorage.getItem("checkls_subscriptions");
    return data ? JSON.parse(data) : [];
  }

  async addSubscription(subData) {
    if (this.isFirebaseConnected && this.db) {
      try {
        const docRef = await this.db.collection("subscriptions").add({
          completed: false,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          ...subData
        });
        return { id: docRef.id, completed: false, ...subData };
      } catch (err) {
        console.warn("[Firestore] Sub Add error, fallback to LocalStorage:", err);
      }
    }

    const subs = await this.getSubscriptions();
    const newSub = {
      id: "sub-" + Date.now(),
      completed: false,
      ...subData
    };
    subs.unshift(newSub);
    localStorage.setItem("checkls_subscriptions", JSON.stringify(subs));
    return newSub;
  }

  async updateSubscription(id, updateData) {
    if (this.isFirebaseConnected && this.db) {
      try {
        await this.db.collection("subscriptions").doc(id).update(updateData);
        return { id, ...updateData };
      } catch (err) {
        console.warn("[Firestore] Sub Update error, fallback to LocalStorage:", err);
      }
    }

    const subs = await this.getSubscriptions();
    const index = subs.findIndex(item => item.id === id);
    if (index !== -1) {
      subs[index] = { ...subs[index], ...updateData };
      localStorage.setItem("checkls_subscriptions", JSON.stringify(subs));
      return subs[index];
    }
    return null;
  }

  async deleteSubscription(id) {
    if (this.isFirebaseConnected && this.db) {
      try {
        await this.db.collection("subscriptions").doc(id).delete();
        return;
      } catch (err) {
        console.warn("[Firestore] Sub Delete error, fallback to LocalStorage:", err);
      }
    }

    let subs = await this.getSubscriptions();
    subs = subs.filter(item => item.id !== id);
    localStorage.setItem("checkls_subscriptions", JSON.stringify(subs));
  }
}

window.dataStore = new DataStore();
