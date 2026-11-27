// Application Orchestrator V6: 3-Layer Liquid Shell, Native Mobile Dock, RBAC Router, V6 Modules & Safe State Lifecycle
import { ROLE, IMAP } from './js/config.js';
import { api, saveSession, loadSession, isV4SecurityActive } from './js/api.js';
import { icon } from './js/icons.js';
import {
  $,
  $$,
  esc,
  toast,
  confirmDialog,
  applyTheme,
  resolveTheme,
  initThemeListener,
  avatarHtml,
  skeletonDashboardHtml,
  animateCounters
} from './js/ui.js';
import { syncLiquidPills, bindScrollAwareTopbar } from './js/motion.js';
import { renderLogin, renderPasswordChange } from './js/views/auth.js';
import { buildNotifications, markLocalNotifRead, openGlobalSearch } from './js/command.js';
import { renderDashboard, renderMyResults, renderAnalytics, resetDashboardViewState } from './js/views/dashboard.js';
import { renderRanking, resetRankingViewState } from './js/views/ranking.js';
import { renderTeachersDirectory, renderProfile, renderPortfolioPrint, resetProfileViewState } from './js/views/profile.js';
import { renderAddEntry, renderReviews, renderCriteria, resetEntriesViewState } from './js/views/entries.js';
import { renderAdmin, renderReports, renderSettings, resetAdminViewState } from './js/views/admin.js';
import { renderMonitoring } from './js/views/monitoring.js';
import { renderMyActivity } from './js/views/activity.js';
import { renderAppeals, resetAppealsViewState } from './js/views/appeals.js';
import { renderDevPlan, resetDevPlanViewState } from './js/views/dev_plan.js';

const STATE = {
  users: [],
  entries: [],
  monitoring: { available: false, activities: [], logins: [], presence: [] },
  myActivity: { available: null, rows: [] },
  appeals: { available: null, rows: [] },
  devGoals: { available: null, rows: [] },
  serverNotifications: [],
  loading: false,
  syncError: null,
  lastSync: null
};

let ME = null;
let SESSION_EXPIRES_AT = null;
let CUR_ROUTE = 'dashboard';
let ROUTE_PARAMS = {};
let SIDEBAR_COLLAPSED = localStorage.getItem('reyting_sidebar_collapsed') === '1';
let MOBILE_DRAWER_OPEN = false;
let IS_OFFLINE = !navigator.onLine;
let LAST_CREDS = [];
let DIRTY_FORM = false;
let LAST_RENDERED_ROUTE = null;
let IS_BACKGROUND_REFRESH = false;
let HEARTBEAT_TIMER = null;
let EXPIRY_WARNED = false;

const ROUTE_TITLES = {
  dashboard: 'Boshqaruv paneli',
  my_results: 'Mening natijam',
  add_entry: 'Yutuq qo‘shish',
  ranking: 'Reyting jadvali',
  teachers: 'Pedagoglar',
  profile: 'Pedagog profili',
  portfolio_print: 'A4 Portfolio',
  reviews: 'Tasdiqlash markazi',
  criteria: 'Baholash mezonlari',
  analytics: 'Statistika',
  reports: 'Hisobotlar',
  admin: 'Foydalanuvchilar',
  monitoring: 'So‘nggi harakatlar',
  login_history: 'Kirishlar tarixi',
  presence: 'Faol foydalanuvchilar',
  my_activity: 'Mening faoliyatim',
  appeals: 'Murojaatlar va apellyatsiyalar',
  dev_plan: 'Rivojlanish rejasi',
  settings: 'Sozlamalar'
};

function getNavSections() {
  if (!ME) return [];
  const role = ME.role;
  const pendingReviewCount = STATE.entries.filter(e => {
    if (e.status !== 'pending') return false;
    if (role === 'director') return true;
    if (role === 'reviewer') return Boolean(IMAP[e.ind]?.resp.includes(ME.name));
    return false;
  }).length;

  const openAppealsCount = (STATE.appeals.rows || []).filter(a => ['new', 'in_review', 'needs_info'].includes(a.status)).length;
  const sections = [];

  if (role === 'director') {
    sections.push({
      title: 'Asosiy',
      items: [
        { id: 'dashboard', label: 'Boshqaruv paneli', icon: 'layout-dashboard' },
        { id: 'ranking', label: 'Reyting jadvali', icon: 'trophy' },
        { id: 'teachers', label: 'Pedagoglar', icon: 'users' }
      ]
    });
    sections.push({
      title: 'Baholash va murojaatlar',
      items: [
        { id: 'reviews', label: 'Tasdiqlash markazi', icon: 'check-circle', badge: pendingReviewCount },
        { id: 'appeals', label: 'Murojaatlar', icon: 'message-square', badge: openAppealsCount },
        { id: 'criteria', label: 'Baholash mezonlari', icon: 'book-open' }
      ]
    });
    sections.push({
      title: 'Tahlil va boshqaruv',
      items: [
        { id: 'analytics', label: 'Statistika', icon: 'bar-chart-3' },
        { id: 'reports', label: 'Hisobotlar', icon: 'file-text' },
        { id: 'admin', label: 'Foydalanuvchilar', icon: 'shield' }
      ]
    });
    sections.push({
      title: 'Shaxsiy va monitoring',
      items: [
        { id: 'my_activity', label: 'Mening faoliyatim', icon: 'clock' },
        { id: 'dev_plan', label: 'Rivojlanish rejasi', icon: 'target' },
        { id: 'monitoring', label: 'So‘nggi harakatlar', icon: 'activity' },
        { id: 'login_history', label: 'Kirishlar tarixi', icon: 'history' },
        { id: 'presence', label: 'Faol sessiyalar', icon: 'radio' }
      ]
    });
  } else if (role === 'it_admin') {
    sections.push({
      title: 'Texnik boshqaruv',
      items: [
        { id: 'dashboard', label: 'Boshqaruv paneli', icon: 'layout-dashboard' },
        { id: 'admin', label: 'Pedagoglar va import', icon: 'users' },
        { id: 'ranking', label: 'Reyting jadvali', icon: 'trophy' },
        { id: 'teachers', label: 'Pedagog profillari', icon: 'user-check' }
      ]
    });
    sections.push({
      title: 'Ma’lumotnoma va monitoring',
      items: [
        { id: 'criteria', label: 'Baholash mezonlari', icon: 'book-open' },
        { id: 'reports', label: 'Hisobotlar', icon: 'file-text' },
        { id: 'my_activity', label: 'Mening faoliyatim', icon: 'clock' },
        { id: 'monitoring', label: 'So‘nggi harakatlar', icon: 'activity' },
        { id: 'login_history', label: 'Kirishlar tarixi', icon: 'history' },
        { id: 'presence', label: 'Faol foydalanuvchilar', icon: 'radio' }
      ]
    });
  } else if (role === 'reviewer') {
    sections.push({
      title: 'Baholash markazi',
      items: [
        { id: 'dashboard', label: 'Boshqaruv paneli', icon: 'layout-dashboard' },
        { id: 'reviews', label: 'Tasdiqlash navbati', icon: 'check-circle', badge: pendingReviewCount },
        { id: 'appeals', label: 'Murojaatlar', icon: 'message-square', badge: openAppealsCount },
        { id: 'ranking', label: 'Reyting jadvali', icon: 'trophy' }
      ]
    });
    sections.push({
      title: 'Katalog va tahlil',
      items: [
        { id: 'teachers', label: 'Pedagoglar', icon: 'users' },
        { id: 'criteria', label: 'Baholash mezonlari', icon: 'book-open' },
        { id: 'analytics', label: 'Statistika', icon: 'bar-chart-3' },
        { id: 'reports', label: 'Hisobotlar', icon: 'file-text' },
        { id: 'my_activity', label: 'Mening faoliyatim', icon: 'clock' }
      ]
    });
  } else {
    sections.push({
      title: 'Asosiy',
      items: [
        { id: 'dashboard', label: 'Boshqaruv paneli', icon: 'layout-dashboard' },
        { id: 'my_results', label: 'Mening natijam', icon: 'award' },
        { id: 'ranking', label: 'Reyting jadvali', icon: 'trophy' },
        { id: 'add_entry', label: 'Yutuq qo‘shish', icon: 'plus' }
      ]
    });
    sections.push({
      title: 'Shaxsiy kabinet',
      items: [
        { id: 'profile', label: 'Profil va portfolio', icon: 'user' },
        { id: 'my_activity', label: 'Mening faoliyatim', icon: 'clock' },
        { id: 'appeals', label: 'Murojaatlar', icon: 'message-square', badge: openAppealsCount },
        { id: 'dev_plan', label: 'Rivojlanish rejasi', icon: 'target' },
        { id: 'criteria', label: 'Baholash mezonlari', icon: 'book-open' }
      ]
    });
  }

  sections.push({
    title: 'Tizim',
    items: [{ id: 'settings', label: 'Sozlamalar', icon: 'settings' }]
  });

  return sections;
}

function getMobileDockItems() {
  if (!ME) return [];
  if (ME.role === 'director') {
    return [
      { id: 'dashboard', label: 'Panel', icon: 'layout-dashboard' },
      { id: 'reviews', label: 'Tasdiq', icon: 'check-circle' },
      { id: 'ranking', label: 'Reyting', icon: 'trophy' },
      { id: 'appeals', label: 'Murojaat', icon: 'message-square' }
    ];
  }
  if (ME.role === 'it_admin') {
    return [
      { id: 'dashboard', label: 'Panel', icon: 'layout-dashboard' },
      { id: 'admin', label: 'Xodimlar', icon: 'users' },
      { id: 'ranking', label: 'Reyting', icon: 'trophy' },
      { id: 'monitoring', label: 'Monitor', icon: 'activity' }
    ];
  }
  if (ME.role === 'reviewer') {
    return [
      { id: 'dashboard', label: 'Panel', icon: 'layout-dashboard' },
      { id: 'reviews', label: 'Navbat', icon: 'check-circle' },
      { id: 'ranking', label: 'Reyting', icon: 'trophy' },
      { id: 'appeals', label: 'Murojaat', icon: 'message-square' }
    ];
  }
  return [
    { id: 'dashboard', label: 'Panel', icon: 'layout-dashboard' },
    { id: 'my_results', label: 'Natija', icon: 'award' },
    { id: 'add_entry', label: 'Qo‘shish', icon: 'plus' },
    { id: 'profile', label: 'Profil', icon: 'user' }
  ];
}

function getAllowedRoutes(role) {
  if (role === 'director') {
    return ['dashboard', 'reviews', 'ranking', 'teachers', 'criteria', 'analytics', 'reports', 'admin', 'monitoring', 'login_history', 'presence', 'my_activity', 'appeals', 'dev_plan', 'profile', 'portfolio_print', 'settings'];
  }
  if (role === 'it_admin') {
    return ['dashboard', 'admin', 'teachers', 'ranking', 'criteria', 'reports', 'monitoring', 'login_history', 'presence', 'my_activity', 'profile', 'portfolio_print', 'settings'];
  }
  if (role === 'reviewer') {
    return ['dashboard', 'reviews', 'ranking', 'teachers', 'criteria', 'analytics', 'reports', 'my_activity', 'appeals', 'profile', 'portfolio_print', 'settings'];
  }
  return ['dashboard', 'my_results', 'add_entry', 'ranking', 'criteria', 'my_activity', 'appeals', 'dev_plan', 'profile', 'portfolio_print', 'settings'];
}

function startHeartbeat() {
  stopHeartbeat();
  if (!ME || !isV4SecurityActive()) return;
  const beat = () => {
    if (!ME || document.visibilityState !== 'visible') return;
    const now = Date.now();
    const lastBeat = Number(localStorage.getItem('reyting_last_beat') || 0);
    if (now - lastBeat < 40000) return;
    localStorage.setItem('reyting_last_beat', String(now));
    api.heartbeatPresence();

    if (SESSION_EXPIRES_AT && !EXPIRY_WARNED) {
      const remMs = new Date(SESSION_EXPIRES_AT).getTime() - now;
      if (remMs > 0 && remMs <= 10 * 60 * 1000) {
        EXPIRY_WARNED = true;
        toast('Sessiya muddati 10 daqiqadan kam qoldi. Muhim o‘zgarishlarni saqlang.', 'warning', 7000);
      } else if (remMs <= 0) {
        toast('Sessiya muddati tugadi. Qayta kiring.', 'warning');
        handleLogout();
      }
    }
  };
  HEARTBEAT_TIMER = setInterval(beat, 50000);
}

function stopHeartbeat() {
  if (HEARTBEAT_TIMER) {
    clearInterval(HEARTBEAT_TIMER);
    HEARTBEAT_TIMER = null;
  }
}

function resetAllModules() {
  resetDashboardViewState();
  resetRankingViewState();
  resetProfileViewState();
  resetEntriesViewState();
  resetAdminViewState();
  resetAppealsViewState();
  resetDevPlanViewState();
}

async function handleLogout() {
  stopHeartbeat();
  DIRTY_FORM = false;
  await api.logout();
  ME = null;
  SESSION_EXPIRES_AT = null;
  CUR_ROUTE = 'dashboard';
  ROUTE_PARAMS = {};
  LAST_CREDS = [];
  LAST_RENDERED_ROUTE = null;
  STATE.users = [];
  STATE.entries = [];
  STATE.monitoring = { available: false, activities: [], logins: [], presence: [] };
  STATE.myActivity = { available: null, rows: [] };
  STATE.appeals = { available: null, rows: [] };
  STATE.devGoals = { available: null, rows: [] };
  STATE.serverNotifications = [];
  resetAllModules();
  render();
}

async function syncData(showToastOnError = false) {
  if (!ME) return;
  STATE.loading = true;
  STATE.syncError = null;
  try {
    const ws = await api.fetchWorkspaceData();
    STATE.users = ws.users || [];
    STATE.entries = ws.entries || [];
    STATE.lastSync = new Date();

    const serverMe = ws.me || STATE.users.find(x => x.id === ME.id);
    if (serverMe) {
      if (!serverMe.active) {
        toast('Hisobingiz faolsizlashtirilgan.', 'warning');
        await handleLogout();
        return;
      }
      ME = serverMe;
      saveSession(ME);
    }

    const tasks = [];
    if (['director', 'it_admin'].includes(ME.role) && isV4SecurityActive()) {
      tasks.push(api.fetchMonitoringData(150).then(m => { STATE.monitoring = m; }).catch(() => {}));
    }
    if (isV4SecurityActive()) {
      tasks.push(api.fetchNotifications().then(n => { STATE.serverNotifications = n; }).catch(() => {}));
      tasks.push(api.fetchMyActivity(120).then(a => { STATE.myActivity = a; }).catch(() => {}));
      if (['teacher', 'reviewer', 'director'].includes(ME.role)) {
        tasks.push(api.fetchAppeals().then(ap => { STATE.appeals = ap; }).catch(() => {}));
        tasks.push(api.fetchDevGoals().then(dg => { STATE.devGoals = dg; }).catch(() => {}));
      }
    }
    if (tasks.length) await Promise.all(tasks);
    startHeartbeat();
  } catch (err) {
    const msg = err.message || 'Ma’lumotlarni yuklashda xatolik yuz berdi.';
    if (/Sessiya muddati tugagan|yaroqsiz/i.test(msg)) {
      toast('Sessiya muddati tugadi. Qayta tizimga kiring.', 'warning');
      await handleLogout();
      return;
    }
    STATE.syncError = msg;
    if (showToastOnError) toast(STATE.syncError, 'error');
  } finally {
    STATE.loading = false;
  }
}

function getContext() {
  const navPages = getNavSections().flatMap(s => s.items);
  const tryLeave = async nextFn => {
    if (DIRTY_FORM && CUR_ROUTE === 'add_entry') {
      const ok = await confirmDialog({
        title: 'Saqlanmagan ma’lumotlar',
        message: 'Kiritilgan ma’lumotlar hali yuborilmadi. Sahifadan chiqishni xohlaysizmi?',
        confirmText: 'Chiqish',
        cancelText: 'Qolish'
      });
      if (!ok) return;
      DIRTY_FORM = false;
    }
    nextFn();
  };

  return {
    me: ME,
    users: STATE.users,
    entries: STATE.entries,
    monitoring: STATE.monitoring,
    myActivity: STATE.myActivity,
    appeals: STATE.appeals,
    devGoals: STATE.devGoals,
    serverNotifications: STATE.serverNotifications,
    lastSync: STATE.lastSync,
    route: CUR_ROUTE,
    params: ROUTE_PARAMS,
    navPages,
    lastCreds: LAST_CREDS,
    setLastCreds: creds => { LAST_CREDS = creds; },
    setDirtyForm: flag => { DIRTY_FORM = Boolean(flag); },
    toggleTheme: () => {
      const next = resolveTheme() === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      IS_BACKGROUND_REFRESH = true;
      renderAppShell();
    },
    navigate: (route, params = {}) => {
      if (route === CUR_ROUTE && JSON.stringify(params) === JSON.stringify(ROUTE_PARAMS)) return;
      tryLeave(() => {
        const allowed = getAllowedRoutes(ME?.role);
        CUR_ROUTE = allowed.includes(route) ? route : 'dashboard';
        ROUTE_PARAMS = params;
        MOBILE_DRAWER_OPEN = false;
        IS_BACKGROUND_REFRESH = false;
        render();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    },
    openProfile: uid => {
      tryLeave(() => {
        CUR_ROUTE = 'profile';
        ROUTE_PARAMS = { uid };
        MOBILE_DRAWER_OPEN = false;
        IS_BACKGROUND_REFRESH = false;
        render();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    },
    openPortfolioPrint: uid => {
      tryLeave(() => {
        CUR_ROUTE = 'portfolio_print';
        ROUTE_PARAMS = { uid };
        MOBILE_DRAWER_OPEN = false;
        IS_BACKGROUND_REFRESH = false;
        render();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    },
    refresh: async () => {
      IS_BACKGROUND_REFRESH = true;
      await syncData(true);
      render();
    },
    openPasswordModal: () => {
      renderPasswordChange($('#root'), {
        user: ME,
        forced: false,
        onDone: () => { saveSession(ME); render(); },
        onCancel: () => render()
      });
    },
    logout: () => handleLogout()
  };
}

function renderBreadcrumb() {
  const parts = [{ label: 'Platforma', route: 'dashboard' }];
  if (CUR_ROUTE === 'profile') {
    const targetUser = STATE.users.find(u => u.id === (ROUTE_PARAMS.uid || ME.id));
    parts.push(['director', 'reviewer', 'it_admin'].includes(ME.role) ? { label: 'Pedagoglar', route: 'teachers' } : { label: 'Reyting jadvali', route: 'ranking' });
    parts.push({ label: targetUser ? targetUser.name : 'Profil' });
  } else if (CUR_ROUTE === 'portfolio_print') {
    const targetUser = STATE.users.find(u => u.id === (ROUTE_PARAMS.uid || ME.id));
    parts.push({ label: 'Reyting jadvali', route: 'ranking' });
    parts.push({ label: `${targetUser ? targetUser.name : 'Pedagog'} · A4 Portfolio` });
  } else {
    parts.push({ label: ROUTE_TITLES[CUR_ROUTE] || 'Boshqaruv paneli' });
  }

  return `
    <nav class="breadcrumbs" aria-label="Sahifa yo‘li">
      ${parts.map((p, idx) => `
        ${idx > 0 ? `<span class="breadcrumbs-sep">${icon('chevron-right', 13)}</span>` : ''}
        ${idx === parts.length - 1 || !p.route
          ? `<span class="breadcrumbs-current">${esc(p.label)}</span>`
          : `<span class="breadcrumbs-root" data-bc-route="${p.route}">${esc(p.label)}</span>`}
      `).join('')}
    </nav>
  `;
}

function renderAppShell() {
  const root = $('#root');
  const ctx = getContext();
  const allowed = getAllowedRoutes(ME.role);
  if (!allowed.includes(CUR_ROUTE)) CUR_ROUTE = 'dashboard';

  const navSections = getNavSections();
  const dockItems = getMobileDockItems();
  const notifications = buildNotifications({
    ...ctx,
    appeals: STATE.appeals.rows || [],
    devGoals: STATE.devGoals.rows || []
  });
  const unreadCount = notifications.filter(n => !n.read).length;
  const isDark = resolveTheme() === 'dark';

  const quickAction = ME.role === 'teacher'
    ? `<button type="button" class="btn btn-primary btn-sm btn-pill" id="topbar-quick-btn">${icon('plus', 15)} <span class="hide-xs">Yutuq qo‘shish</span></button>`
    : (['director', 'reviewer'].includes(ME.role)
      ? `<button type="button" class="btn btn-primary btn-sm btn-pill" id="topbar-quick-btn">${icon('check-circle', 15)} <span class="hide-xs">Tasdiqlash</span></button>`
      : `<button type="button" class="btn btn-primary btn-sm btn-pill" id="topbar-quick-btn">${icon('user-plus', 15)} <span class="hide-xs">Pedagog qo‘shish</span></button>`);

  const skipPageAnim = LAST_RENDERED_ROUTE === CUR_ROUTE || IS_BACKGROUND_REFRESH;

  root.innerHTML = `
    <div class="app-shell ${SIDEBAR_COLLAPSED ? 'sidebar-collapsed' : ''} ${MOBILE_DRAWER_OPEN ? 'mobile-drawer-open' : ''}">
      <div class="drawer-backdrop" id="drawer-backdrop"></div>

      <aside class="sidebar glass-nav noprint" aria-label="Asosiy navigatsiya">
        <div class="sidebar-head">
          <div class="brand-mark">
            <div class="brand-logo">${icon('graduation-cap', 18)}</div>
            <div class="brand-text">
              <div class="brand-name">Pedagog Reyting</div>
              <div class="brand-sub">Norin tuman maktabi</div>
            </div>
          </div>
          <button type="button" class="btn btn-ghost btn-icon btn-sm sidebar-collapse-btn" id="sidebar-toggle-btn"
            title="${SIDEBAR_COLLAPSED ? 'Menyuni yoyish' : 'Menyuni yig‘ish'}"
            aria-label="${SIDEBAR_COLLAPSED ? 'Menyuni yoyish' : 'Menyuni yig‘ish'}">
            ${icon(SIDEBAR_COLLAPSED ? 'panel-left-open' : 'panel-left-close', 16)}
          </button>
        </div>

        <div class="sidebar-nav">
          ${navSections.map(sec => `
            <div class="nav-section">
              <div class="nav-section-title">${esc(sec.title)}</div>
              ${sec.items.map(item => {
                const isActive = CUR_ROUTE === item.id || (item.id === 'profile' && CUR_ROUTE === 'profile' && (ROUTE_PARAMS.uid || ME.id) === ME.id);
                return `
                  <button type="button" class="nav-item ${isActive ? 'active' : ''}" data-route="${item.id}" data-tooltip="${esc(item.label)}" aria-current="${isActive ? 'page' : 'false'}">
                    ${icon(item.icon, 17)}
                    <span class="nav-item-label">${esc(item.label)}</span>
                    ${item.badge > 0 ? `<span class="nav-badge">${item.badge}</span>` : ''}
                  </button>
                `;
              }).join('')}
            </div>
          `).join('')}
        </div>

        <div class="sidebar-foot">
          <div class="sidebar-user-card" style="cursor:pointer" id="sidebar-user-btn" title="Profilni ochish">
            ${avatarHtml(ME.name, 'sm', ME.avatar_url)}
            <div class="sidebar-user-meta">
              <div class="sidebar-user-name">${esc(ME.name)}</div>
              <div class="sidebar-user-role">${esc(ROLE[ME.role] || ME.role)}</div>
            </div>
          </div>
        </div>
      </aside>

      <div class="workspace">
        <header class="topbar glass-nav noprint" id="app-topbar">
          <div class="topbar-left">
            <button type="button" class="btn btn-ghost btn-icon mobile-menu-btn" id="mobile-menu-btn" aria-label="Menyuni ochish">${icon('menu', 19)}</button>
            ${renderBreadcrumb()}
          </div>

          <div class="topbar-right">
            <button type="button" class="search-trigger" id="global-search-btn" aria-label="Tezkor qidiruv">
              ${icon('search', 14)}
              <span class="search-trigger-text">Qidiruv…</span>
              <span class="kbd-hint">Ctrl+K</span>
            </button>

            ${quickAction}

            <div class="popover-wrap">
              <button type="button" class="btn btn-ghost btn-icon" id="notif-btn" aria-label="Bildirishnomalar" title="Bildirishnomalar" style="position:relative">
                ${icon('bell', 17)}
                ${unreadCount > 0 ? '<span class="notif-dot"></span>' : ''}
              </button>
              <div class="popover-menu popover-lg" id="notif-menu" style="display:none">
                <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px 6px">
                  <span style="font-size:13px;font-weight:600">Bildirishnomalar (${unreadCount})</span>
                  ${unreadCount > 0 ? `<button type="button" class="btn btn-ghost btn-sm" id="mark-all-read-btn" style="padding:2px 8px;min-height:26px;font-size:11.5px">${icon('check-check', 13)} O‘qildi</button>` : ''}
                </div>
                <div class="dropdown-sep"></div>
                <div style="max-height:320px;overflow-y:auto;display:flex;flex-direction:column;gap:3px">
                  ${notifications.length === 0
                    ? `<div style="padding:24px 12px;text-align:center;font-size:12.5px;color:var(--text-muted)">Hozircha yangi bildirishnomalar yo‘q</div>`
                    : notifications.map((n, idx) => `
                      <button type="button" class="dropdown-item" data-notif-idx="${idx}" style="align-items:flex-start;padding:9px 10px;${n.read ? 'opacity:0.65' : 'background:var(--primary-soft)'}">
                        <span style="color:var(--${n.tone === 'neutral' ? 'text-muted' : n.tone});margin-top:2px">${icon(n.icon, 15)}</span>
                        <div style="min-width:0;flex:1">
                          <div style="font-size:12.5px;font-weight:${n.read ? '500' : '600'};color:var(--text);white-space:normal">${esc(n.title)}</div>
                          <div style="font-size:11.5px;color:var(--text-muted);white-space:normal;margin-top:2px">${esc(n.desc)}</div>
                        </div>
                      </button>
                    `).join('')}
                </div>
              </div>
            </div>

            <button type="button" class="btn btn-ghost btn-icon" id="theme-toggle-btn" title="Mavzu" aria-label="Mavzuni almashtirish">
              ${icon(isDark ? 'sun' : 'moon', 17)}
            </button>

            <div class="popover-wrap">
              <button type="button" class="btn btn-ghost btn-pill" id="profile-menu-btn" style="padding:4px 10px 4px 4px;gap:7px" aria-label="Profil menyusi">
                ${avatarHtml(ME.name, 'sm', ME.avatar_url)}
                <span class="hide-xs" style="font-size:13px;font-weight:500;max-width:120px;overflow:hidden;text-overflow:ellipsis">${esc(ME.name.split(' ')[0])}</span>
                <span class="hide-xs" style="display:inline-flex">${icon('chevron-down', 14)}</span>
              </button>
              <div class="popover-menu" id="profile-menu" style="display:none">
                <div style="padding:8px 10px">
                  <div style="font-size:13px;font-weight:600;color:var(--text)">${esc(ME.name)}</div>
                  <div style="font-size:12px;color:var(--text-muted)">${esc(ROLE[ME.role] || ME.role)}</div>
                  ${ME.subject ? `<div style="font-size:11.5px;color:var(--primary);margin-top:2px">${esc(ME.subject)}</div>` : ''}
                </div>
                <div class="dropdown-sep"></div>
                <button type="button" class="dropdown-item" id="pm-profile">${icon('user', 15)} Mening profilim</button>
                <button type="button" class="dropdown-item" id="pm-activity">${icon('clock', 15)} Mening faoliyatim</button>
                <button type="button" class="dropdown-item" id="pm-settings">${icon('settings', 15)} Sozlamalar</button>
                <button type="button" class="dropdown-item" id="pm-password">${icon('key', 15)} Parolni almashtirish</button>
                <div class="dropdown-sep"></div>
                <button type="button" class="dropdown-item danger" id="pm-logout">${icon('log-out', 15)} Tizimdan chiqish</button>
              </div>
            </div>
          </div>
        </header>

        ${IS_OFFLINE ? `
          <div class="offline-banner" role="status">
            ${icon('wifi-off', 15)}<span>Internet aloqasi uzilgan. Ma’lumotlar yangilanmayapti.</span>
          </div>
        ` : ''}

        <main class="main-content ${skipPageAnim ? 'no-anim' : 'page-enter'}" id="main-view"></main>
      </div>

      <!-- Native Mobile Bottom Dock -->
      <nav class="mobile-bottom-nav glass-nav noprint" aria-label="Tezkor mobil navigatsiya">
        ${dockItems.map(item => {
          const isAct = CUR_ROUTE === item.id || (item.id === 'profile' && CUR_ROUTE === 'profile' && (ROUTE_PARAMS.uid || ME.id) === ME.id);
          return `
            <button type="button" class="mbn-item ${isAct ? 'active' : ''}" data-route="${item.id}" aria-current="${isAct ? 'page' : 'false'}">
              ${icon(item.icon, 19)}
              <span class="mbn-label">${esc(item.label)}</span>
            </button>
          `;
        }).join('')}
        <button type="button" class="mbn-item" id="mbn-more-btn" aria-label="Barcha bo‘limlar">
          ${icon('menu', 19)}
          <span class="mbn-label">Menyu</span>
        </button>
      </nav>
    </div>
  `;

  LAST_RENDERED_ROUTE = CUR_ROUTE;
  bindScrollAwareTopbar($('#app-topbar'));

  $$('[data-route]').forEach(btn => {
    btn.onclick = () => {
      const r = btn.dataset.route;
      ctx.navigate(r, r === 'profile' ? { uid: ME.id } : {});
    };
  });
  $$('[data-bc-route]').forEach(el => { el.onclick = () => ctx.navigate(el.dataset.bcRoute); });

  const toggleBtn = $('#sidebar-toggle-btn');
  if (toggleBtn) {
    toggleBtn.onclick = () => {
      SIDEBAR_COLLAPSED = !SIDEBAR_COLLAPSED;
      localStorage.setItem('reyting_sidebar_collapsed', SIDEBAR_COLLAPSED ? '1' : '0');
      IS_BACKGROUND_REFRESH = true;
      renderAppShell();
    };
  }

  const openDrawer = () => {
    MOBILE_DRAWER_OPEN = !MOBILE_DRAWER_OPEN;
    $('.app-shell').classList.toggle('mobile-drawer-open', MOBILE_DRAWER_OPEN);
  };
  $('#mobile-menu-btn').onclick = openDrawer;
  const mbnMore = $('#mbn-more-btn');
  if (mbnMore) mbnMore.onclick = openDrawer;
  $('#drawer-backdrop').onclick = () => {
    MOBILE_DRAWER_OPEN = false;
    $('.app-shell').classList.remove('mobile-drawer-open');
  };

  $('#sidebar-user-btn').onclick = () => ctx.openProfile(ME.id);
  $('#global-search-btn').onclick = () => openGlobalSearch(ctx);
  $('#topbar-quick-btn').onclick = () => {
    if (ME.role === 'teacher') ctx.navigate('add_entry');
    else if (['director', 'reviewer'].includes(ME.role)) ctx.navigate('reviews');
    else ctx.navigate('admin');
  };
  $('#theme-toggle-btn').onclick = () => ctx.toggleTheme();

  const notifMenu = $('#notif-menu');
  const profileMenu = $('#profile-menu');
  const closePopovers = () => {
    const nm = $('#notif-menu');
    const pm = $('#profile-menu');
    if (nm) nm.style.display = 'none';
    if (pm) pm.style.display = 'none';
  };
  window._closeTopbarPopovers = closePopovers;

  $('#notif-btn').onclick = e => {
    e.stopPropagation();
    const open = notifMenu.style.display === 'block';
    closePopovers();
    notifMenu.style.display = open ? 'none' : 'block';
  };
  $('#profile-menu-btn').onclick = e => {
    e.stopPropagation();
    const open = profileMenu.style.display === 'block';
    closePopovers();
    profileMenu.style.display = open ? 'none' : 'block';
  };
  notifMenu.onclick = e => e.stopPropagation();
  profileMenu.onclick = e => e.stopPropagation();

  const markAllBtn = $('#mark-all-read-btn');
  if (markAllBtn) {
    markAllBtn.onclick = async () => {
      markLocalNotifRead(notifications.map(n => n.id));
      STATE.serverNotifications.forEach(sn => { sn.is_read = true; });
      await api.markNotificationRead(null);
      IS_BACKGROUND_REFRESH = true;
      renderAppShell();
    };
  }

  $$('[data-notif-idx]').forEach(btn => {
    btn.onclick = () => { closePopovers(); notifications[Number(btn.dataset.notifIdx)].action(); };
  });
  $('#pm-profile').onclick = () => { closePopovers(); ctx.openProfile(ME.id); };
  $('#pm-activity').onclick = () => { closePopovers(); ctx.navigate('my_activity'); };
  $('#pm-settings').onclick = () => { closePopovers(); ctx.navigate('settings'); };
  $('#pm-password').onclick = () => { closePopovers(); ctx.openPasswordModal(); };
  $('#pm-logout').onclick = () => { closePopovers(); ctx.logout(); };

  const main = $('#main-view');
  if (STATE.loading && !STATE.users.length) {
    main.innerHTML = skeletonDashboardHtml();
    return;
  }

  if (STATE.syncError && !STATE.users.length) {
    main.innerHTML = `
      <div class="card">
        <div class="empty-state">
          <div class="empty-icon" style="color:var(--error);border-color:var(--error-border)">${icon('alert-circle', 22)}</div>
          <h3 class="empty-title">Ma’lumotlarni yuklab bo‘lmadi</h3>
          <p class="empty-desc">${esc(STATE.syncError)}</p>
          <button type="button" class="btn btn-primary" id="retry-sync-btn">${icon('refresh-cw', 15)} Qayta urinish</button>
        </div>
      </div>
    `;
    $('#retry-sync-btn').onclick = () => ctx.refresh();
    return;
  }

  if (CUR_ROUTE === 'dashboard') renderDashboard(main, ctx);
  else if (CUR_ROUTE === 'my_results') renderMyResults(main, ctx);
  else if (CUR_ROUTE === 'add_entry') renderAddEntry(main, ctx);
  else if (CUR_ROUTE === 'ranking') renderRanking(main, ctx);
  else if (CUR_ROUTE === 'teachers') renderTeachersDirectory(main, ctx);
  else if (CUR_ROUTE === 'profile') renderProfile(main, ctx);
  else if (CUR_ROUTE === 'portfolio_print') renderPortfolioPrint(main, ctx);
  else if (CUR_ROUTE === 'reviews') renderReviews(main, ctx);
  else if (CUR_ROUTE === 'criteria') renderCriteria(main, ctx);
  else if (CUR_ROUTE === 'analytics') renderAnalytics(main, ctx);
  else if (CUR_ROUTE === 'reports') renderReports(main, ctx);
  else if (CUR_ROUTE === 'admin') renderAdmin(main, ctx);
  else if (CUR_ROUTE === 'monitoring' || CUR_ROUTE === 'login_history' || CUR_ROUTE === 'presence') renderMonitoring(main, ctx);
  else if (CUR_ROUTE === 'my_activity') renderMyActivity(main, ctx);
  else if (CUR_ROUTE === 'appeals') renderAppeals(main, ctx);
  else if (CUR_ROUTE === 'dev_plan') renderDevPlan(main, ctx);
  else if (CUR_ROUTE === 'settings') renderSettings(main, ctx);

  syncLiquidPills(main);
  animateCounters(main, skipPageAnim);
  IS_BACKGROUND_REFRESH = false;
}

function render() {
  const root = $('#root');
  if (!ME) {
    stopHeartbeat();
    renderLogin(root, {
      onLoginSuccess: async user => {
        const sess = loadSession();
        ME = user;
        SESSION_EXPIRES_AT = sess?.expiresAt || null;
        EXPIRY_WARNED = false;
        CUR_ROUTE = 'dashboard';
        IS_BACKGROUND_REFRESH = false;
        await syncData(true);
        render();
      }
    });
    return;
  }

  if (ME.must_change) {
    renderPasswordChange(root, {
      user: ME,
      forced: true,
      onDone: () => { saveSession(ME); render(); }
    });
    return;
  }

  renderAppShell();
}

document.addEventListener('click', () => { if (window._closeTopbarPopovers) window._closeTopbarPopovers(); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && window._closeTopbarPopovers) window._closeTopbarPopovers();
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    if (!ME || ME.must_change) return;
    e.preventDefault();
    openGlobalSearch(getContext());
  }
});

window.addEventListener('beforeunload', e => {
  if (DIRTY_FORM && CUR_ROUTE === 'add_entry') {
    e.preventDefault();
    e.returnValue = '';
  }
});

window.addEventListener('online', () => { IS_OFFLINE = false; toast('Internet aloqasi tiklandi.', 'success'); if (ME) render(); });
window.addEventListener('offline', () => { IS_OFFLINE = true; toast('Internet aloqasi uzildi.', 'warning'); if (ME) render(); });
initThemeListener(() => { if (ME) { IS_BACKGROUND_REFRESH = true; render(); } });

(async function init() {
  const sess = loadSession();
  if (sess?.user) {
    ME = sess.user;
    SESSION_EXPIRES_AT = sess.expiresAt;
    render();
    await syncData(false);
  }
  render();
})();
