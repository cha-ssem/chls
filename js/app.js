/**
 * Application Main Controller
 * Cal.com UI Design System & Business Logic
 */

// 전역 모달 제어 함수 (Top-level Global Scope)
window.openAuthModal = function() {
  const authForm = document.querySelector("#auth-form");
  if (authForm) authForm.reset();
  const modalAuth = document.querySelector("#modal-auth");
  if (modalAuth) {
    modalAuth.style.display = "flex";
    modalAuth.style.opacity = "1";
    modalAuth.style.pointerEvents = "auto";
    modalAuth.style.zIndex = "99999";
    modalAuth.classList.add("active");
  }
};

window.closeAllModals = function() {
  document.querySelectorAll(".modal-backdrop").forEach(m => {
    m.classList.remove("active");
    m.style.display = "none";
    m.style.opacity = "0";
    m.style.pointerEvents = "none";
  });
};

document.addEventListener("DOMContentLoaded", async () => {
  // 앱 상태 (State)
  const state = {
    currentTab: "lectures", // 'lectures' | 'subscriptions'
    currentView: "list",     // 'list' | 'monthly'
    lectureFilterMonth: "all",
    lectureFilterStatus: "all",
    lectureSearchQuery: "",
    subFilterMonth: "all",
    subFilterStatus: "all",
    subSearchQuery: "",
    exchangeRate: 1350, // 기본 USD -> KRW 환율 (네이버 환율 기준 예시)
    editingItem: null
  };

  // DOM 요소를 가져오기 위한 헬퍼 함수
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => document.querySelectorAll(selector);

  // 안전한 이벤트 바인딩 헬퍼 함수 (null 참조 에러 원천 차단)
  const on = (selector, event, handler) => {
    const el = typeof selector === "string" ? $(selector) : selector;
    if (el) {
      el.addEventListener(event, handler);
    }
  };



  // ===== 이벤트 리스너 등록 =====
  
  // 1. 메인 탭 전환 (nav-pill-group)
  $$(".category-tab[data-tab]").forEach(tab => {
    on(tab, "click", (e) => {
      $$(".category-tab[data-tab]").forEach(t => t && t.classList.remove("active"));
      tab.classList.add("active");
      state.currentTab = tab.dataset.tab;
      
      const lecCtrl = $("#lecture-controls");
      const subCtrl = $("#subscription-controls");
      const lecTab = $("#tab-lectures");
      const subTab = $("#tab-subscriptions");

      if (state.currentTab === "lectures") {
        if (lecCtrl) lecCtrl.classList.remove("hidden");
        if (subCtrl) subCtrl.classList.add("hidden");
        if (lecTab) lecTab.classList.remove("hidden");
        if (subTab) subTab.classList.add("hidden");
      } else {
        if (lecCtrl) lecCtrl.classList.add("hidden");
        if (subCtrl) subCtrl.classList.remove("hidden");
        if (lecTab) lecTab.classList.add("hidden");
        if (subTab) subTab.classList.remove("hidden");
      }
      renderApp();
    });
  });

  // 2. 뷰 전환 (리스트 보기 vs 월별 보기)
  $$(".view-btn[data-view]").forEach(btn => {
    on(btn, "click", () => {
      $$(".view-btn[data-view]").forEach(b => b && b.classList.remove("active"));
      btn.classList.add("active");
      state.currentView = btn.dataset.view;
      renderApp();
    });
  });

  // 3. 강의 필터 & 검색
  on("#lecture-month-filter", "change", (e) => {
    state.lectureFilterMonth = e.target.value;
    renderLectures();
  });
  on("#lecture-status-filter", "change", (e) => {
    state.lectureFilterStatus = e.target.value;
    renderLectures();
  });
  on("#lecture-search-input", "input", (e) => {
    state.lectureSearchQuery = e.target.value.toLowerCase().trim();
    renderLectures();
  });

  // 4. 구독 필터 & 검색
  on("#sub-month-filter", "change", (e) => {
    state.subFilterMonth = e.target.value;
    renderSubscriptions();
  });
  on("#sub-status-filter", "change", (e) => {
    state.subFilterStatus = e.target.value;
    renderSubscriptions();
  });
  on("#sub-search-input", "input", (e) => {
    state.subSearchQuery = e.target.value.toLowerCase().trim();
    renderSubscriptions();
  });

  // 5. 관리자 인증 모달 오픈
  on("#btn-admin-login", "click", () => openAuthModal());

  // 모달 닫기
  $$(".close-modal-btn").forEach(btn => {
    on(btn, "click", () => closeAllModals());
  });

  // 6. 강의 폼 제출
  on("#lecture-form", "submit", async (e) => {
    e.preventDefault();
    const formData = {
      date: $("#lec-date") ? $("#lec-date").value : "",
      topic: $("#lec-topic") ? $("#lec-topic").value : "",
      target: $("#lec-target") ? $("#lec-target").value : "",
      location: $("#lec-location") ? $("#lec-location").value : "",
      time: $("#lec-time") ? $("#lec-time").value : "",
      fee: $("#lec-fee") ? (Number($("#lec-fee").value) || 0) : 0,
      groupTitle: $("#lec-group") ? $("#lec-group").value : "",
      remarks: $("#lec-remarks") ? $("#lec-remarks").value : ""
    };

    if (state.editingItem) {
      await window.dataStore.updateLecture(state.editingItem.id, formData);
    } else {
      await window.dataStore.addLecture(formData);
    }

    closeAllModals();
    await renderApp();
  });

  // 7. 구독 폼 제출
  const subFormSelector = $("#sub-form") ? "#sub-form" : "#subscription-form";
  on(subFormSelector, "submit", async (e) => {
    e.preventDefault();
    const usdEl = $("#sub-usd") || $("#form-sub-usd");
    const usd = usdEl ? (Number(usdEl.value) || 0) : 0;
    const krw = Math.round(usd * state.exchangeRate);

    const formData = {
      title: $("#sub-title-input") ? $("#sub-title-input").value : "",
      siteUrl: $("#sub-url") ? $("#sub-url").value : "",
      expiryDate: $("#sub-expiry") ? $("#sub-expiry").value : "",
      amountUSD: usd,
      amountKRW: krw,
      payDate: $("#sub-paydate") ? $("#sub-paydate").value : "",
      groupTitle: $("#sub-group-input") ? $("#sub-group-input").value : "",
      remarks: $("#sub-remarks") ? $("#sub-remarks").value : ""
    };

    if (state.editingItem) {
      await window.dataStore.updateSubscription(state.editingItem.id, formData);
    } else {
      await window.dataStore.addSubscription(formData);
    }

    closeAllModals();
    await renderApp();
  });

  // 8. 네이버 환율 계산기 입력 연동
  on("#calc-usd-input", "input", (e) => {
    const usd = parseFloat(e.target.value) || 0;
    const krw = Math.round(usd * state.exchangeRate);
    const krwRes = $("#calc-krw-result");
    if (krwRes) krwRes.value = krw.toLocaleString() + " 원";
  });

  on("#calc-rate-input", "input", (e) => {
    state.exchangeRate = parseFloat(e.target.value) || 1350;
    const usdInput = $("#calc-usd-input");
    const usd = usdInput ? (parseFloat(usdInput.value) || 0) : 0;
    const krw = Math.round(usd * state.exchangeRate);
    const krwRes = $("#calc-krw-result");
    if (krwRes) krwRes.value = krw.toLocaleString() + " 원";
    const rateDisp = $("#current-rate-display");
    if (rateDisp) rateDisp.textContent = state.exchangeRate.toLocaleString();
  });

  // 9. 관리자 비밀번호 인증 폼 제출
  on("#auth-form", "submit", (e) => {
    e.preventDefault();
    const pinInput = $("#auth-pin-input");
    const pin = pinInput ? pinInput.value.trim() : "";
    if (window.adminAuth.verifyOTP(pin)) {
      alert("관리자 인증에 성공하였습니다!");
      closeAllModals();
      updateAuthUI();
      renderApp();
    } else {
      alert("비밀번호가 올바르지 않습니다. (기본 PIN: 123456)");
    }
  });

  // Initial Load (이벤트 등록 후 화면 렌더링)
  renderApp();

  // Global render caller
  async function renderApp() {
    try { updateAuthUI(); } catch (e) { console.warn("updateAuthUI err:", e); }
    try { await updateMonthFilterOptions(); } catch (e) { console.warn("updateMonthFilterOptions err:", e); }
    try { await renderDashboard(); } catch (e) { console.warn("renderDashboard err:", e); }
    try { await renderLectures(); } catch (e) { console.warn("renderLectures err:", e); }
    try { await renderSubscriptions(); } catch (e) { console.warn("renderSubscriptions err:", e); }
  }

  async function updateMonthFilterOptions() {
    const lectures = await window.dataStore.getLectures();
    const subs = await window.dataStore.getSubscriptions();

    const monthsSet = new Set(["2026-09", "2026-08", "2026-07", "2026-06"]);

    lectures.forEach(l => { if (l.date && l.date.length >= 7) monthsSet.add(l.date.substring(0, 7)); });
    subs.forEach(s => { if (s.payDate && s.payDate.length >= 7) monthsSet.add(s.payDate.substring(0, 7)); });

    const sortedMonths = Array.from(monthsSet).sort().reverse();

    const buildOptionsHTML = (currentVal) => {
      let html = `<option value="all">📅 전체 월 보기</option>`;
      sortedMonths.forEach(m => {
        const [yyyy, mm] = m.split("-");
        const label = `${yyyy}년 ${parseInt(mm, 10)}월`;
        html += `<option value="${m}" ${currentVal === m ? "selected" : ""}>${label}</option>`;
      });
      return html;
    };

    const lecSelect = $("#lecture-month-filter");
    if (lecSelect) lecSelect.innerHTML = buildOptionsHTML(state.lectureFilterMonth);

    const subSelect = $("#sub-month-filter");
    if (subSelect) subSelect.innerHTML = buildOptionsHTML(state.subFilterMonth);
  }

  // ===== 대시보드 요약 통계 렌더링 =====
  async function renderDashboard() {
    const now = new Date();
    const currentYearMonth = now.toISOString().substring(0, 7);
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const formattedMonthStr = `${year}년 ${month}월`;

    if ($("#stat-net-title")) {
      $("#stat-net-title").textContent = `${formattedMonthStr} 강의 수입 합계`;
    }

    // 비로그인 상태일 때 대시보드 통계 보안 가림 처리
    if (!window.adminAuth.isAdminLoggedIn) {
      if ($("#stat-total-fee")) $("#stat-total-fee").textContent = "🔒 로그인 필요";
      if ($("#stat-completed-fee")) $("#stat-completed-fee").textContent = "관리자 전용 비공개";

      if ($("#stat-sub-cost")) $("#stat-sub-cost").textContent = "🔒 로그인 필요";
      if ($("#stat-sub-count")) $("#stat-sub-count").textContent = "관리자 전용 비공개";

      if ($("#stat-net-income")) $("#stat-net-income").textContent = "🔒 로그인 필요";
      if ($("#stat-net-subtext")) {
        $("#stat-net-subtext").textContent = "관리자 로그인 시 실시간 집계";
      }

      if ($("#stat-sub-dday-list")) {
        $("#stat-sub-dday-list").innerHTML = `<span class="muted" style="font-size: 13px;">🔒 로그인 필요</span>`;
      }
      return;
    }

    const lectures = await window.dataStore.getLectures();
    const subs = await window.dataStore.getSubscriptions();

    const totalLectureFee = lectures.reduce((acc, curr) => acc + (curr.fee || 0), 0);
    const completedLectureFee = lectures
      .filter(l => l.completed)
      .reduce((acc, curr) => acc + (curr.fee || 0), 0);

    // 당월 강의 수입 산출
    const currentMonthLectures = lectures.filter(l => l.date && l.date.startsWith(currentYearMonth));
    const currentMonthFee = currentMonthLectures.reduce((acc, curr) => acc + (curr.fee || 0), 0);
    const currentMonthCompletedFee = currentMonthLectures
      .filter(l => l.completed)
      .reduce((acc, curr) => acc + (curr.fee || 0), 0);

    // 당월 구독 지출 산출 (payDate 기준)
    const currentMonthSubs = subs.filter(s => s.payDate && s.payDate.startsWith(currentYearMonth));
    const currentMonthSubKRW = currentMonthSubs.reduce((acc, curr) => acc + (curr.amountKRW || 0), 0);
    const currentMonthSubUSD = currentMonthSubs.reduce((acc, curr) => acc + (curr.amountUSD || 0), 0);

    // 1. 당월 강의 수입
    if ($("#stat-net-title")) {
      $("#stat-net-title").textContent = `${formattedMonthStr} 강의 수입`;
    }
    if ($("#stat-net-income")) {
      $("#stat-net-income").textContent = currentMonthFee.toLocaleString() + "원";
    }
    if ($("#stat-net-subtext")) {
      $("#stat-net-subtext").textContent = `${formattedMonthStr} 완료: ${currentMonthCompletedFee.toLocaleString()}원`;
    }

    // 2. 전체 강의 수입
    if ($("#stat-total-fee")) {
      $("#stat-total-fee").textContent = totalLectureFee.toLocaleString() + "원";
    }
    if ($("#stat-completed-fee")) {
      $("#stat-completed-fee").textContent = `완료: ${completedLectureFee.toLocaleString()}원`;
    }

    // 3. 당월 구독 지출
    if ($("#stat-sub-cost-title")) {
      $("#stat-sub-cost-title").textContent = `${formattedMonthStr} 구독 지출`;
    }
    if ($("#stat-sub-cost")) {
      $("#stat-sub-cost").textContent = `${currentMonthSubKRW.toLocaleString()}원 ($${currentMonthSubUSD})`;
    }
    if ($("#stat-sub-count")) {
      $("#stat-sub-count").textContent = `${formattedMonthStr} 결제: ${currentMonthSubs.length}건 (전체 구독 ${subs.length}개)`;
    }

    // 4. 구독 묶음 그룹명별 임박 D-Day 산출 및 렌더링 (배지 우선 표시)
    const ddayMap = {};
    subs.forEach(s => {
      if (!s.expiryDate) return;
      const key = s.groupTitle ? `📦 ${s.groupTitle}` : s.title;
      if (!ddayMap[key] || new Date(s.expiryDate) < new Date(ddayMap[key])) {
        ddayMap[key] = s.expiryDate;
      }
    });

    const ddayListContainer = $("#stat-sub-dday-list");
    if (ddayListContainer) {
      const entries = Object.entries(ddayMap);
      if (entries.length === 0) {
        ddayListContainer.innerHTML = `<span class="muted" style="font-size: 13px;">만료 예정 구독 없음</span>`;
      } else {
        entries.sort((a, b) => new Date(a[1]) - new Date(b[1]));

        ddayListContainer.innerHTML = `
          <div class="sub-dday-list-wrap">
            ${entries.slice(0, 3).map(([key, expDate]) => `
              <div class="sub-dday-item">
                ${getDDayBadge(expDate)}
                <span class="group-name" title="${escapeHtml(key)}">${escapeHtml(key)}</span>
              </div>
            `).join("")}
          </div>
        `;
      }
    }
  }

  // ===== 강의 활동 내용 렌더링 =====
  async function renderLectures() {
    let lectures = await window.dataStore.getLectures();

    if (state.lectureFilterMonth !== "all") {
      lectures = lectures.filter(l => l.date && l.date.startsWith(state.lectureFilterMonth));
    }
    if (state.lectureSearchQuery) {
      lectures = lectures.filter(l =>
        (l.topic && l.topic.toLowerCase().includes(state.lectureSearchQuery)) ||
        (l.target && l.target.toLowerCase().includes(state.lectureSearchQuery)) ||
        (l.location && l.location.toLowerCase().includes(state.lectureSearchQuery)) ||
        (l.groupTitle && l.groupTitle.toLowerCase().includes(state.lectureSearchQuery))
      );
    }

    const listViewEl = $("#lecture-list-view");
    const monthViewEl = $("#lecture-monthly-view");

    if (state.currentView === "list") {
      listViewEl.classList.remove("hidden");
      monthViewEl.classList.add("hidden");
      renderLectureTable(lectures);
    } else {
      listViewEl.classList.add("hidden");
      monthViewEl.classList.remove("hidden");
      renderLectureMonthly(lectures);
    }
  }

  function renderLectureTable(lectures) {
    const pendingSection = $("#lec-pending-section");
    const completedSection = $("#lec-completed-section");

    // 비로그인 시 데이터 잠금 안내 메시지 렌더링
    if (!window.adminAuth.isAdminLoggedIn) {
      pendingSection.classList.remove("hidden");
      completedSection.classList.add("hidden");

      $("#lec-pending-count").textContent = "🔒 잠김";
      $("#lecture-pending-tbody").innerHTML = getAdminRequiredLockHTML("강의 활동 내역");
      return;
    }

    const pendingLectures = lectures.filter(l => !l.completed);
    const completedLectures = lectures.filter(l => l.completed);

    if (state.lectureFilterStatus === "pending") {
      pendingSection.classList.remove("hidden");
      completedSection.classList.add("hidden");
    } else if (state.lectureFilterStatus === "completed") {
      pendingSection.classList.add("hidden");
      completedSection.classList.remove("hidden");
    } else {
      pendingSection.classList.remove("hidden");
      completedSection.classList.remove("hidden");
    }

    $("#lec-pending-count").textContent = `${pendingLectures.length}건`;
    $("#lec-completed-count").textContent = `${completedLectures.length}건`;

    const pendingTbody = $("#lecture-pending-tbody");
    const completedTbody = $("#lecture-completed-tbody");

    pendingTbody.innerHTML = generateLectureRowsHTML(pendingLectures, false);
    completedTbody.innerHTML = generateLectureRowsHTML(completedLectures, true);

    bindLectureTableEvents(pendingTbody);
    bindLectureTableEvents(completedTbody);
  }

  function generateLectureRowsHTML(items, isCompletedTable) {
    if (items.length === 0) {
      const msg = isCompletedTable ? "처리 완료된 강의 내역이 없습니다." : "진행 중인 강의 내역이 없습니다.";
      return `<tr><td colspan="9" class="text-center muted" style="padding: 24px;">${msg}</td></tr>`;
    }

    return items.map(item => {
      const statusBadge = item.completed
        ? `<span class="badge-pill badge-success">✓ 완료</span>`
        : `<span class="badge-pill badge-pending">⏳ 진행중</span>`;

      const completeBtn = item.completed
        ? `<button class="btn btn-sm" style="background-color: #ecfdf5; color: #047857; border: 1px solid #a7f3d0;" data-id="${item.id}" data-action="toggle-lecture" title="클릭시 진행중 목록으로 복원">✓ 완료됨</button>`
        : `<button class="btn btn-secondary btn-sm" data-id="${item.id}" data-action="toggle-lecture" title="클릭시 완료 목록으로 이동">완료</button>`;

      const groupTag = item.groupTitle
        ? `<span class="badge-pill badge-group">🔗 ${escapeHtml(item.groupTitle)}</span>`
        : "";

      return `
        <tr class="${item.completed ? 'completed-row' : ''} ${item.groupTitle ? 'group-row' : ''}">
          <td class="text-center">${completeBtn}</td>
          <td>${item.date || "-"}</td>
          <td class="topic-cell">
            <strong>${escapeHtml(item.topic)}</strong>
            ${groupTag ? `<div style="margin-top: 4px;">${groupTag}</div>` : ""}
          </td>
          <td>${escapeHtml(item.target || "-")}</td>
          <td>${escapeHtml(item.location || "-")}</td>
          <td>${escapeHtml(item.time || "-")}</td>
          <td class="text-right"><strong>${(item.fee || 0).toLocaleString()}원</strong></td>
          <td class="text-center">${statusBadge}</td>
          <td>
            <div style="display: flex; gap: 6px; align-items: center;">
              <button class="btn btn-secondary btn-sm" data-id="${item.id}" data-action="copy-lecture" title="강의 복사하여 추가">📋 복사</button>
              <button class="btn btn-secondary btn-sm" data-id="${item.id}" data-action="edit-lecture">수정</button>
              <button class="btn btn-secondary btn-sm" data-id="${item.id}" data-action="delete-lecture" style="color: var(--error);">삭제</button>
            </div>
          </td>
        </tr>
      `;
    }).join("");
  }

  function bindLectureTableEvents(tbodyEl) {
    if (!tbodyEl) return;
    tbodyEl.querySelectorAll('[data-action="toggle-lecture"]').forEach(btn => {
      if (!btn) return;
      btn.addEventListener("click", async (e) => {
        if (!checkAdminPermission()) return;
        const id = e.currentTarget.dataset.id;
        const lectures = await window.dataStore.getLectures();
        const currentItem = lectures.find(l => l.id === id);
        if (currentItem) {
          await window.dataStore.updateLecture(id, { completed: !currentItem.completed });
          renderApp();
        }
      });
    });

    tbodyEl.querySelectorAll('[data-action="copy-lecture"]').forEach(btn => {
      if (!btn) return;
      btn.addEventListener("click", async (e) => {
        if (!checkAdminPermission()) return;
        const id = e.currentTarget.dataset.id;
        const lectures = await window.dataStore.getLectures();
        const target = lectures.find(l => l.id === id);
        if (target) openLectureModal(target, true);
      });
    });

    tbodyEl.querySelectorAll('[data-action="edit-lecture"]').forEach(btn => {
      if (!btn) return;
      btn.addEventListener("click", async (e) => {
        if (!checkAdminPermission()) return;
        const id = e.currentTarget.dataset.id;
        const lectures = await window.dataStore.getLectures();
        const target = lectures.find(l => l.id === id);
        if (target) openLectureModal(target, false);
      });
    });

    tbodyEl.querySelectorAll('[data-action="delete-lecture"]').forEach(btn => {
      if (!btn) return;
      btn.addEventListener("click", async (e) => {
        if (!checkAdminPermission()) return;
        if (confirm("이 강의 내역을 삭제하시겠습니까?")) {
          await window.dataStore.deleteLecture(e.currentTarget.dataset.id);
          renderApp();
        }
      });
    });
  }

  // 강의 월별 보기 (시간의 오름차순 정렬)
  function renderLectureMonthly(lectures) {
    const container = $("#lecture-monthly-view");
    container.innerHTML = "";

    if (!window.adminAuth.isAdminLoggedIn) {
      container.innerHTML = getAdminRequiredCardHTML("월별 강의 목록");
      return;
    }

    if (lectures.length === 0) {
      container.innerHTML = `<div class="muted text-center" style="grid-column: 1/-1; padding: 48px;">표시할 강의 내역이 없습니다.</div>`;
      return;
    }

    const groups = {};
    lectures.forEach(item => {
      const monthKey = item.date ? item.date.substring(0, 7) : "날짜 미정";
      if (!groups[monthKey]) groups[monthKey] = [];
      groups[monthKey].push(item);
    });

    // 월별 카드 오름차순(과거->미래) 정렬
    Object.keys(groups).sort().forEach(month => {
      const items = groups[month];
      // 카드 내부 아이템 날짜 오름차순 정렬
      items.sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));

      const monthTotal = items.reduce((acc, curr) => acc + (curr.fee || 0), 0);

      const monthCard = document.createElement("div");
      monthCard.className = "month-card";
      monthCard.innerHTML = `
        <div class="month-card-header">
          <h3>📅 ${month}</h3>
          <span class="badge-pill">합계: ${monthTotal.toLocaleString()}원</span>
        </div>
        <div class="month-item-list">
          ${items.map(l => `
            <div class="month-item">
              <div class="month-item-top">
                <span class="month-item-title">${escapeHtml(l.topic)}</span>
                ${l.completed ? `<span class="badge-pill badge-success">완료</span>` : `<span class="badge-pill badge-pending">진행중</span>`}
              </div>
              <div class="month-item-meta">
                <span>📆 ${l.date}</span>
                <span>📍 ${escapeHtml(l.location || "장소 미정")}</span>
                <span>💰 ${(l.fee || 0).toLocaleString()}원</span>
              </div>
            </div>
          `).join("")}
        </div>
      `;
      container.appendChild(monthCard);
    });
  }

  // ===== 구독 사항 렌더링 =====
  async function renderSubscriptions() {
    let subs = await window.dataStore.getSubscriptions();

    if (state.subFilterMonth !== "all") {
      subs = subs.filter(s => s.payDate && s.payDate.startsWith(state.subFilterMonth));
    }
    if (state.subSearchQuery) {
      subs = subs.filter(s =>
        (s.title && s.title.toLowerCase().includes(state.subSearchQuery)) ||
        (s.groupTitle && s.groupTitle.toLowerCase().includes(state.subSearchQuery))
      );
    }

    const listViewEl = $("#sub-list-view");
    const monthViewEl = $("#sub-monthly-view");

    if (state.currentView === "list") {
      listViewEl.classList.remove("hidden");
      monthViewEl.classList.add("hidden");
      renderSubTable(subs);
    } else {
      listViewEl.classList.add("hidden");
      monthViewEl.classList.remove("hidden");
      renderSubMonthly(subs);
    }
  }

  function getDDayBadge(expiryDateStr) {
    if (!expiryDateStr) return "";
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exp = new Date(expiryDateStr);
    exp.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return `<span class="badge-pill badge-d-day">⚠️ 만료됨</span>`;
    } else if (diffDays === 0) {
      return `<span class="badge-pill badge-d-day">🔥 D-DAY</span>`;
    } else if (diffDays <= 3) {
      return `<span class="badge-pill badge-d-day">🚨 D-${diffDays}</span>`;
    } else if (diffDays <= 7) {
      return `<span class="badge-pill badge-d-warning">⏰ D-${diffDays}</span>`;
    } else {
      return `<span class="badge-pill">D-${diffDays}</span>`;
    }
  }

  function renderSubTable(subs) {
    const pendingSection = $("#sub-pending-section");
    const completedSection = $("#sub-completed-section");

    // 비로그인 시 데이터 잠금 안내
    if (!window.adminAuth.isAdminLoggedIn) {
      pendingSection.classList.remove("hidden");
      completedSection.classList.add("hidden");

      $("#sub-pending-count").textContent = "🔒 잠김";
      $("#sub-pending-tbody").innerHTML = getAdminRequiredLockHTML("구독 사항 내역");
      return;
    }

    const pendingSubs = subs.filter(s => !s.completed);
    const completedSubs = subs.filter(s => s.completed);

    if (state.subFilterStatus === "pending") {
      pendingSection.classList.remove("hidden");
      completedSection.classList.add("hidden");
    } else if (state.subFilterStatus === "completed") {
      pendingSection.classList.add("hidden");
      completedSection.classList.remove("hidden");
    } else {
      pendingSection.classList.remove("hidden");
      completedSection.classList.remove("hidden");
    }

    $("#sub-pending-count").textContent = `${pendingSubs.length}건`;
    $("#sub-completed-count").textContent = `${completedSubs.length}건`;

    const pendingTbody = $("#sub-pending-tbody");
    const completedTbody = $("#sub-completed-tbody");

    pendingTbody.innerHTML = generateSubRowsHTML(pendingSubs, false);
    completedTbody.innerHTML = generateSubRowsHTML(completedSubs, true);

    bindSubTableEvents(pendingTbody);
    bindSubTableEvents(completedTbody);
  }

  function generateSubRowsHTML(items, isCompletedTable) {
    if (items.length === 0) {
      const msg = isCompletedTable ? "처리 완료된 구독 내역이 없습니다." : "진행 중인 구독 내역이 없습니다.";
      return `<tr><td colspan="9" class="text-center muted" style="padding: 24px;">${msg}</td></tr>`;
    }

    return items.map(item => {
      const dDayBadge = getDDayBadge(item.expiryDate);

      // 항목명은 단순 텍스트 표기 (링크 해제)
      const titleDisplay = `<strong>${escapeHtml(item.title)}</strong>`;

      // 동일 구독 묶음 그룹명에 사이트 주소 링크 연결
      let groupTag = "";
      if (item.groupTitle) {
        if (item.siteUrl) {
          groupTag = `<a href="${escapeHtml(item.siteUrl)}" target="_blank" style="text-decoration: none;" title="사이트 바로가기: ${escapeHtml(item.siteUrl)}"><span class="badge-pill badge-group" style="cursor: pointer;">🔗 ${escapeHtml(item.groupTitle)} ↗</span></a>`;
        } else {
          groupTag = `<span class="badge-pill badge-group">📦 ${escapeHtml(item.groupTitle)}</span>`;
        }
      } else if (item.siteUrl) {
        groupTag = `<a href="${escapeHtml(item.siteUrl)}" target="_blank" style="text-decoration: none;" title="사이트 바로가기: ${escapeHtml(item.siteUrl)}"><span class="badge-pill badge-group" style="cursor: pointer;">🔗 바로가기 ↗</span></a>`;
      }

      const completeBtn = item.completed
        ? `<button class="btn btn-sm" style="background-color: #ecfdf5; color: #047857; border: 1px solid #a7f3d0;" data-id="${item.id}" data-action="toggle-sub" title="클릭시 진행중 목록으로 복원">✓ 완료됨</button>`
        : `<button class="btn btn-secondary btn-sm" data-id="${item.id}" data-action="toggle-sub" title="클릭시 완료 목록으로 이동">완료</button>`;

      return `
        <tr class="${item.completed ? 'completed-row' : ''}">
          <td class="text-center">${completeBtn}</td>
          <td>
            ${titleDisplay}
            ${groupTag ? `<div style="margin-top: 4px;">${groupTag}</div>` : ""}
          </td>
          <td>${item.expiryDate || "-"} ${dDayBadge}</td>
          <td class="text-right">$${(item.amountUSD || 0).toLocaleString()}</td>
          <td class="text-right"><strong>${(item.amountKRW || 0).toLocaleString()}원</strong></td>
          <td>${item.payDate || "-"}</td>
          <td class="text-center">
            ${item.completed ? `<span class="badge-pill badge-success">✓ 결제완료</span>` : `<span class="badge-pill badge-pending">⏳ 미결제</span>`}
          </td>
          <td>${escapeHtml(item.remarks || "-")}</td>
          <td>
            <div style="display: flex; gap: 6px;">
              <button class="btn btn-secondary btn-sm" data-id="${item.id}" data-action="copy-sub" title="구독 항목 복사하여 추가">📋 복사</button>
              <button class="btn btn-secondary btn-sm" data-id="${item.id}" data-action="edit-sub">수정</button>
              <button class="btn btn-secondary btn-sm" data-id="${item.id}" data-action="delete-sub" style="color: var(--error);">삭제</button>
            </div>
          </td>
        </tr>
      `;
    }).join("");
  }

  function bindSubTableEvents(tbodyEl) {
    if (!tbodyEl) return;
    tbodyEl.querySelectorAll('[data-action="toggle-sub"]').forEach(btn => {
      if (!btn) return;
      btn.addEventListener("click", async (e) => {
        if (!checkAdminPermission()) return;
        const id = e.currentTarget.dataset.id;
        const subsList = await window.dataStore.getSubscriptions();
        const currentItem = subsList.find(s => s.id === id);
        if (currentItem) {
          await window.dataStore.updateSubscription(id, { completed: !currentItem.completed });
          renderApp();
        }
      });
    });

    tbodyEl.querySelectorAll('[data-action="copy-sub"]').forEach(btn => {
      if (!btn) return;
      btn.addEventListener("click", async (e) => {
        if (!checkAdminPermission()) return;
        const id = e.currentTarget.dataset.id;
        const subsList = await window.dataStore.getSubscriptions();
        const target = subsList.find(s => s.id === e.currentTarget.dataset.id);
        if (target) openSubscriptionModal(target, true);
      });
    });

    tbodyEl.querySelectorAll('[data-action="edit-sub"]').forEach(btn => {
      if (!btn) return;
      btn.addEventListener("click", async (e) => {
        if (!checkAdminPermission()) return;
        const id = e.currentTarget.dataset.id;
        const subsList = await window.dataStore.getSubscriptions();
        const target = subsList.find(s => s.id === e.currentTarget.dataset.id);
        if (target) openSubscriptionModal(target, false);
      });
    });

    tbodyEl.querySelectorAll('[data-action="delete-sub"]').forEach(btn => {
      if (!btn) return;
      btn.addEventListener("click", async (e) => {
        if (!checkAdminPermission()) return;
        if (confirm("이 구독 내역을 삭제하시겠습니까?")) {
          await window.dataStore.deleteSubscription(e.currentTarget.dataset.id);
          renderApp();
        }
      });
    });
  }

  // 구독 월별 보기 (시간의 오름차순 정렬)
  function renderSubMonthly(subs) {
    const container = $("#sub-monthly-view");
    container.innerHTML = "";

    if (!window.adminAuth.isAdminLoggedIn) {
      container.innerHTML = getAdminRequiredCardHTML("월별 구독 목록");
      return;
    }

    if (subs.length === 0) {
      container.innerHTML = `<div class="muted text-center" style="grid-column: 1/-1; padding: 48px;">표시할 구독 내역이 없습니다.</div>`;
      return;
    }

    const groups = {};
    subs.forEach(item => {
      const monthKey = item.payDate ? item.payDate.substring(0, 7) : "날짜 미정";
      if (!groups[monthKey]) groups[monthKey] = [];
      groups[monthKey].push(item);
    });

    // 월별 카드 오름차순(과거->미래) 정렬
    Object.keys(groups).sort().forEach(month => {
      const items = groups[month];
      // 카드 내부 아이템 결제일 오름차순 정렬
      items.sort((a, b) => new Date(a.payDate || 0) - new Date(b.payDate || 0));

      const totalKRW = items.reduce((acc, curr) => acc + (curr.amountKRW || 0), 0);

      const monthCard = document.createElement("div");
      monthCard.className = "month-card";
      monthCard.innerHTML = `
        <div class="month-card-header">
          <h3>💳 ${month} 구독 결제</h3>
          <span class="badge-pill">총 ${totalKRW.toLocaleString()}원</span>
        </div>
        <div class="month-item-list">
          ${items.map(s => `
            <div class="month-item">
              <div class="month-item-top">
                <span class="month-item-title">${escapeHtml(s.title)}</span>
                ${getDDayBadge(s.expiryDate)}
              </div>
              <div class="month-item-meta">
                <span>📅 결제일: ${s.payDate}</span>
                <span>💵 $${s.amountUSD} (${(s.amountKRW).toLocaleString()}원)</span>
              </div>
            </div>
          `).join("")}
        </div>
      `;
      container.appendChild(monthCard);
    });
  }

  // ===== Modals & Permissions =====

  function getAdminRequiredLockHTML(title) {
    return `
      <tr>
        <td colspan="9" class="text-center" style="padding: 48px 24px; background-color: var(--surface-soft);">
          <div style="max-width: 420px; margin: 0 auto; display: flex; flex-direction: column; align-items: center; gap: 12px;">
            <div style="font-size: 36px; line-height: 1;">🔒</div>
            <h4 style="font-size: 16px; font-weight: 600; color: var(--ink); margin: 0;">관리자 전용 데이터 보안</h4>
            <p class="muted" style="font-size: 13px; margin: 0; line-height: 1.5;">
              상세한 ${title} 정보는 개인정보 및 보안을 위해 관리자 로그인 상태에서만 확인하실 수 있습니다.
            </p>
            <button class="btn btn-primary btn-sm" id="btn-lock-login" style="margin-top: 6px;">🔑 관리자 로그인 하기</button>
          </div>
        </td>
      </tr>
    `;
  }

  function getAdminRequiredCardHTML(title) {
    return `
      <div style="grid-column: 1/-1; padding: 48px 24px; background-color: var(--surface-card); border-radius: var(--rounded-lg); text-align: center; border: 1px solid var(--hairline);">
        <div style="max-width: 400px; margin: 0 auto; display: flex; flex-direction: column; align-items: center; gap: 12px;">
          <div style="font-size: 36px;">🔒</div>
          <h4 style="font-size: 16px; font-weight: 600; color: var(--ink);">관리자 인증 필요</h4>
          <p class="muted" style="font-size: 13px;">${title} 정보를 확인하려면 관리자로 로그인하세요.</p>
          <button class="btn btn-primary btn-sm" id="btn-lock-login-card">🔑 관리자 로그인 하기</button>
        </div>
      </div>
    `;
  }

  // 데이터 잠금 안내 내 로그인 버튼 이벤트 핸들러 바인딩
  document.addEventListener("click", (e) => {
    if (e.target && (e.target.id === "btn-lock-login" || e.target.id === "btn-lock-login-card")) {
      openAuthModal();
    }
  });

  function checkAdminPermission() {
    if (!window.adminAuth.isAdminLoggedIn) {
      if (confirm("이 작업은 관리자 권한이 필요합니다. 관리자로 로그인하시겠습니까?")) {
        openAuthModal();
      }
      return false;
    }
    return true;
  }

  function updateAuthUI() {
    const btn = $("#btn-admin-login");
    const statusBadge = $("#admin-status-badge");
    const addLecBtn = $("#btn-add-lecture");
    const addSubBtn = $("#btn-add-subscription");

    const fbStatus = window.dataStore.isFirebaseConnected
      ? `<span class="badge-pill badge-group" style="background: #eff6ff;">🔥 Firebase DB (${escapeHtml(window.dataStore.fbProjectId)})</span>`
      : "";

    if (window.adminAuth.isAdminLoggedIn) {
      btn.textContent = "로그아웃";
      btn.onclick = () => {
        window.adminAuth.logout();
        updateAuthUI();
        renderApp();
        alert("로그아웃 되었습니다.");
      };
      statusBadge.innerHTML = `${fbStatus} <span class="badge-pill badge-success">🔑 관리자 로그인 완료</span>`;

      if (state.currentTab === "lectures") {
        addLecBtn.classList.remove("hidden");
        addSubBtn.classList.add("hidden");
      } else {
        addLecBtn.classList.add("hidden");
        addSubBtn.classList.remove("hidden");
      }
    } else {
      btn.textContent = "관리자 로그인";
      btn.onclick = () => openAuthModal();
      statusBadge.innerHTML = `${fbStatus} <span class="badge-pill">🔒 비로그인 (보안 가림 모드)</span>`;
      addLecBtn.classList.add("hidden");
      addSubBtn.classList.add("hidden");
    }
  }

  async function updateGroupDatalists() {
    const lectures = await window.dataStore.getLectures();
    const subs = await window.dataStore.getSubscriptions();

    const lecGroups = [...new Set(lectures.map(l => l.groupTitle).filter(Boolean))];
    const subGroups = [...new Set(subs.map(s => s.groupTitle).filter(Boolean))];

    const lecDatalist = $("#lec-group-datalist");
    if (lecDatalist) {
      lecDatalist.innerHTML = lecGroups.map(g => `<option value="${escapeHtml(g)}"></option>`).join("");
    }

    const subDatalist = $("#sub-group-datalist");
    if (subDatalist) {
      subDatalist.innerHTML = subGroups.map(g => `<option value="${escapeHtml(g)}"></option>`).join("");
    }
  }

  window.openLectureModal = async function(item = null, isCopy = false) {
    if (!checkAdminPermission()) return;
    await updateGroupDatalists();

    state.editingItem = isCopy ? null : item;
    const titleEl = $("#modal-lecture-title") || $("#lecture-modal-title");
    if (titleEl) titleEl.textContent = isCopy ? "강의 활동 내용 복사하여 추가" : (item ? "강의 활동 내용 수정" : "새 강의 활동 추가");

    const setVal = (id1, id2, val) => {
      const el = $(id1) || $(id2);
      if (el) el.value = val;
    };

    if (item) {
      setVal("#lec-date", "#form-lec-date", item.date || "");
      setVal("#lec-topic", "#form-lec-topic", isCopy ? `${item.topic} (복사본)` : (item.topic || ""));
      setVal("#lec-target", "#form-lec-target", item.target || "");
      setVal("#lec-location", "#form-lec-location", item.location || "");
      setVal("#lec-time", "#form-lec-time", item.time || "");
      setVal("#lec-fee", "#form-lec-fee", item.fee || "");
      setVal("#lec-group", "#form-lec-group", item.groupTitle || "");
      setVal("#lec-remarks", "#form-lec-remarks", item.remarks || "");
    } else {
      const form = $("#lecture-form");
      if (form) form.reset();
    }

    const modal = $("#modal-lecture");
    if (modal) {
      modal.style.display = "flex";
      modal.style.opacity = "1";
      modal.style.pointerEvents = "auto";
      modal.style.zIndex = "99999";
      modal.classList.add("active");
    }
  };

  window.openSubscriptionModal = async function(item = null, isCopy = false) {
    if (!checkAdminPermission()) return;
    await updateGroupDatalists();

    state.editingItem = isCopy ? null : item;
    const titleEl = $("#modal-sub-title") || $("#sub-modal-title");
    if (titleEl) titleEl.textContent = isCopy ? "구독 사항 복사하여 추가" : (item ? "구독 사항 수정" : "새 구독 사항 추가");

    const setVal = (id1, id2, val) => {
      const el = $(id1) || $(id2);
      if (el) el.value = val;
    };

    if (item) {
      setVal("#sub-title-input", "#form-sub-title", isCopy ? `${item.title} (복사본)` : (item.title || ""));
      setVal("#sub-url", "#form-sub-url", item.siteUrl || "");
      setVal("#sub-expiry", "#form-sub-expiry", item.expiryDate || "");
      setVal("#sub-usd", "#form-sub-usd", item.amountUSD || "");
      setVal("#sub-paydate", "#form-sub-paydate", item.payDate || "");
      setVal("#sub-group-input", "#form-sub-group", item.groupTitle || "");
      setVal("#sub-remarks", "#form-sub-remarks", item.remarks || "");
    } else {
      const form = $("#sub-form") || $("#subscription-form");
      if (form) form.reset();
    }

    const modal = $("#modal-subscription");
    if (modal) {
      modal.style.display = "flex";
      modal.style.opacity = "1";
      modal.style.pointerEvents = "auto";
      modal.style.zIndex = "99999";
      modal.classList.add("active");
    }
  };

  window.openAuthModal = function() {
    const authForm = document.querySelector("#auth-form");
    if (authForm) authForm.reset();
    const modalAuth = document.querySelector("#modal-auth");
    if (modalAuth) {
      modalAuth.style.display = "flex";
      modalAuth.style.opacity = "1";
      modalAuth.style.pointerEvents = "auto";
      modalAuth.style.zIndex = "99999";
      modalAuth.classList.add("active");
    }
  };

  window.closeAllModals = function() {
    document.querySelectorAll(".modal-backdrop").forEach(m => {
      m.classList.remove("active");
      m.style.display = "none";
      m.style.opacity = "0";
      m.style.pointerEvents = "none";
    });
  };

  function escapeHtml(str) {
    if (!str) return "";
    return str.replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
    });
  }
});
