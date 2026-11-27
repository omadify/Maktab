// Application Orchestrator V4.0: RBAC Router, Collapsible Shell, Single-Tab Heartbeat, Session Expiry & Notification Center
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
import { renderLogin, renderPasswordChange } from './js/views/auth.js';
import { buildNotifications, markLocalNotifRead, openGlobalSearch } from './js/command.js';
import { renderDashboard, renderMyResults, renderAnalytics } from './js/views/dashboard.js';
import { renderRanking } from './js/views/ranking.js';
import { renderTeachersDirectory, renderProfile, renderPortfolioPrint } from './js/views/profile.js';
import { renderAddEntry, renderReviews, renderCriteria } from './js/views/entries.js';
import { renderAdmin, renderReports, renderSettings } from './js/views/admin.js';
import { renderMonitoring } from './js/views/monitoring.js';

const STATE = {
  users: [],
  entries: [],
  monitoring: { available: false, activities: [], logins: [], presence: [] },
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
      title: 'Baholash',
      items: [
        { id: 'reviews', label: 'Tasdiqlash markazi', icon: 'check-circle', badge: pendingReviewCount },
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
      title: 'Monitoring',
      items: [
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
        { id: 'monitoring', label: 'So‘nggi harakatlar', icon: 'activity' },
        { id: 'login_history', label: 'Kirishlar tarixi', icon: 'history' },
        { id: 'presence', label: 'Faol foydalanuvchilar', icon: 'radio' }
      ]
    });
  } else if (role === 'reviewer') {
    sections.push({
      title: 'Asosiy',
      items: [
        { id: 'dashboard', label: 'Boshqaruv paneli', icon: 'layout-dashboard' },
        { id: 'reviews', label: 'Tasdiqlash navbati', icon: 'check-circle', badge: pendingReviewCount },
        { id: 'my_results', label: 'Mening natijam', icon: 'award' },
        { id: 'ranking', label: 'Reyting jadvali', icon: 'trophy' }
      ]
    });
    sections.push({
      title: 'Faoliyat',
      items: [
        { id: 'add_entry', label: 'Yutuq qo‘shish', icon: 'plus' },
        { id: 'teachers', label: 'Pedagoglar', icon: 'users' },
        { id: 'criteria', label: 'Baholash mezonlari', icon: 'book-open' }
      ]
    });
    sections.push({
      title: 'Tahlil',
      items: [
        { id: 'analytics', label: 'Statistika', icon: 'bar-chart-3' },
        { id: 'reports', label: 'Hisobotlar', icon: 'file-text' }
      ]
    });
  } else {
    sections.push({
      title: 'Asosiy',
      items: [
        { id: 'dashboard', label: 'Boshqaruv paneli', icon: 'layout-dashboard' },
        { id: 'my_results', label: 'Mening natijam', icon: 'award' },
        { id: 'ranking', label: 'Reyting jadvali', icon: 'trophy' }
      ]
    });
    sections.push({
      title: 'Faoliyat',
      items: [
        { id: 'add_entry', label: 'Yutuq qo‘shish', icon: 'plus' },
        { id: 'profile', label: 'Profil va portfolio', icon: 'user' },
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

function getAllowedRoutes(role) {
  if (role === 'director') {
    return ['dashboard', 'reviews', 'ranking', 'teachers', 'criteria', 'analytics', 'reports', 'admin', 'monitoring', 'login_history', 'presence', 'profile', 'portfolio_print', 'settings'];
  }
  if (role === 'it_admin') {
    return ['dashboard', 'admin', 'teachers', 'ranking', 'criteria', 'reports', 'monitoring', 'login_history', 'presence', 'profile', 'portfolio_print', 'settings'];
  }
  if (role === 'reviewer') {
    return ['dashboard', 'reviews', 'my_results', 'add_entry', 'ranking', 'teachers', 'criteria', 'analytics', 'reports', 'profile', 'portfolio_print', 'settings'];
  }
  return ['dashboard', 'my_results', 'add_entry', 'ranking', 'criteria', 'profile', 'portfolio_print', 'settings'];
}

function startHeartbeat() {
  stopHeartbeat();
  if (!ME || !isV4SecurityActive()) return;
  const beat = () => {
    if (!ME || document.visibilityState !== 'visible') return;
    // Deduplicate heartbeat across multiple browser tabs via localStorage timestamp
    const now = Date.now();
    const lastBeat = Number(localStorage.getItem('reyting_last_beat') || 0);
    if (now - lastBeat < 40000) return;
    localStorage.setItem('reyting_last_beat', String(now));
    api.heartbeatPresence();

    // Check session expiry warning (<= 10 minutes remaining)
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

async function handleLogout() {
  stopHeartbeat();
  DIRTY_FORM = false;
  await api.logout();
  ME = null;
  SESSION_EXPIRES_AT = null;
  CUR_ROUTE = 'dashboard';
  ROUTE_PARAMS = {};
  LAST_CREDS = [];
  STATE.users = [];
  STATE.entries = [];
  STATE.monitoring = { available: false, activities: [], logins: [], presence: [] };
  STATE.serverNotifications = [];
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

    if (['director', 'it_admin'].includes(ME.role) && isV4SecurityActive()) {
      STATE.monitoring = await api.fetchMonitoringData(150);
    }
    if (isV4SecurityActive()) {
      STATE.serverNotifications = await api.fetchNotifications();
    }
    startHeartbeat();
  } catch (err) {
    STATE.syncError = err.message || 'Ma’lumotlarni yuklashda xatolik yuz berdi.';
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
    serverNotifications: STATE.serverNotifications,
    lastSync: STATE.lastSync,
    route: CUR_ROUTE,
    params: ROUTE_PARAMS,
    navPages,
    lastCreds: LAST_CREDS,
    setLastCreds: creds => { LAST_CREDS = creds; },
    setDirtyForm: flag => { DIRTY_FORM = Boolean(flag); },
    navigate: (route, params = {}) => {
      if (route === CUR_ROUTE && JSON.stringify(params) === JSON.stringify(ROUTE_PARAMS)) return;
      tryLeave(() => {
        const allowed = getAllowedRoutes(ME?.role);
        CUR_ROUTE = allowed.includes(route) ? route : 'dashboard';
        ROUTE_PARAMS = params;
        MOBILE_DRAWER_OPEN = false;
        render();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    },
    openProfile: uid => {
      tryLeave(() => {
        CUR_ROUTE = 'profile';
        ROUTE_PARAMS = { uid };
        MOBILE_DRAWER_OPEN = false;
        render();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    },
    openPortfolioPrint: uid => {
      tryLeave(() => {
        CUR_ROUTE = 'portfolio_print';
        ROUTE_PARAMS = { uid };
        MOBILE_DRAWER_OPEN = false;
        render();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    },
    refresh: async () => {
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
  const notifications = buildNotifications(ctx);
  const unreadCount = notifications.filter(n => !n.read).length;
  const isDark = resolveTheme() === 'dark';

  const quickAction = ['teacher', 'reviewer'].includes(ME.role)
    ? `<button type="button" class="btn btn-primary btn-sm" id="topbar-quick-btn">${icon('plus', 15)} <span class="hide-xs">Yutuq qo‘shish</span></button>`
    : (ME.role === 'director'
      ? `<button type="button" class="btn btn-primary btn-sm" id="topbar-quick-btn">${icon('check-circle', 15)} <span class="hide-xs">Tasdiqlash</span></button>`
      : `<button type="button" class="btn btn-primary btn-sm" id="topbar-quick-btn">${icon('user-plus', 15)} <span class="hide-xs">Pedagog qo‘shish</span></button>`);

  root.innerHTML = `
    <div class="app-shell ${SIDEBAR_COLLAPSED ? 'sidebar-collapsed' : ''} ${MOBILE_DRAWER_OPEN ? 'mobile-drawer-open' : ''}">
      <div class="drawer-backdrop" id="drawer-backdrop"></div>

      <aside class="sidebar noprint" aria-label="Asosiy navigatsiya">
        <div class="sidebar-head">
          <div class="brand-mark">
            <div class="brand-logo">${icon('graduation-cap', 17)}</div>
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
          <div class="sidebar-user-card" style="cursor:pointer" id="sidebar-user-btn" title="Profil">
            ${avatarHtml(ME.name, 'sm')}
            <div class="sidebar-user-meta">
              <div class="sidebar-user-name">${esc(ME.name)}</div>
              <div class="sidebar-user-role">${esc(ROLE[ME.role] || ME.role)}</div>
            </div>
          </div>
        </div>
      </aside>

      <div class="workspace">
        <header class="topbar noprint">
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
                  <span style="font-size:13px;font-weight:600">Bildirishnomalar (${unreadCount} ta o‘qilmagan)</span>
                  ${unreadCount > 0 ? `<button type="button" class="btn btn-ghost btn-sm" id="mark-all-read-btn" style="padding:2px 6px;min-height:24px;font-size:11.5px">${icon('check-check', 13)} Barchasi o‘qildi</button>` : ''}
                </div>
                <div class="dropdown-sep"></div>
                <div style="max-height:300px;overflow-y:auto;display:flex;flex-direction:column;gap:2px">
                  ${notifications.map((n, idx) => `
                    <button type="button" class="dropdown-item" data-notif-idx="${idx}" style="align-items:flex-start;padding:8px 10px;${n.read ? 'opacity:0.65' : 'background:var(--primary-soft)'}">
                      <span style="color:var(--${n.tone === 'neutral' ? 'text-muted' : n.tone});margin-top:1px">${icon(n.icon, 15)}</span>
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
              <button type="button" class="btn btn-ghost" id="profile-menu-btn" style="padding:4px 8px 4px 4px;gap:7px" aria-label="Profil menyusi">
                ${avatarHtml(ME.name, 'sm')}
                <span class="hide-xs" style="font-size:13px;font-weight:500;max-width:120px;overflow:hidden;text-overflow:ellipsis">${esc(ME.name.split(' ')[0])}</span>
                ${icon('chevron-down', 14)}
              </button>
              <div class="popover-menu" id="profile-menu" style="display:none">
                <div style="padding:8px 10px">
                  <div style="font-size:13px;font-weight:600;color:var(--text)">${esc(ME.name)}</div>
                  <div style="font-size:12px;color:var(--text-muted)">${esc(ROLE[ME.role] || ME.role)}</div>
                  ${ME.subject ? `<div style="font-size:11.5px;color:var(--primary);margin-top:2px">${esc(ME.subject)}</div>` : ''}
                </div>
                <div class="dropdown-sep"></div>
                <button type="button" class="dropdown-item" id="pm-profile">${icon('user', 15)} Mening profilim</button>
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

        <main class="main-content ${LAST_RENDERED_ROUTE === CUR_ROUTE ? 'no-anim' : ''}" id="main-view"></main>
      </div>
    </div>
  `;

  LAST_RENDERED_ROUTE = CUR_ROUTE;

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
      renderAppShell();
    };
  }

  $('#mobile-menu-btn').onclick = () => {
    MOBILE_DRAWER_OPEN = !MOBILE_DRAWER_OPEN;
    $('.app-shell').classList.toggle('mobile-drawer-open', MOBILE_DRAWER_OPEN);
  };
  $('#drawer-backdrop').onclick = () => {
    MOBILE_DRAWER_OPEN = false;
    $('.app-shell').classList.remove('mobile-drawer-open');
  };

  $('#sidebar-user-btn').onclick = () => ctx.openProfile(ME.id);
  $('#global-search-btn').onclick = () => openGlobalSearch(ctx);
  $('#topbar-quick-btn').onclick = () => {
    if (['teacher', 'reviewer'].includes(ME.role)) ctx.navigate('add_entry');
    else if (ME.role === 'director') ctx.navigate('reviews');
    else ctx.navigate('admin');
  };
  $('#theme-toggle-btn').onclick = () => {
    const next = resolveTheme() === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    $('#theme-toggle-btn').innerHTML = icon(next === 'dark' ? 'sun' : 'moon', 17);
  };

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
      renderAppShell();
    };
  }

  $$('[data-notif-idx]').forEach(btn => {
    btn.onclick = () => { closePopovers(); notifications[Number(btn.dataset.notifIdx)].action(); };
  });
  $('#pm-profile').onclick = () => { closePopovers(); ctx.openProfile(ME.id); };
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
  else if (CUR_ROUTE === 'settings') renderSettings(main, ctx);

  animateCounters(main);
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
initThemeListener(() => { if (ME) render(); });

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
