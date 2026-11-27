// Main Application Orchestrator: State, RBAC Router, Collapsible Sidebar, Topbar, Offline Handling
import { ROLE, IMAP } from './js/config.js';
import { api, saveSession, loadSession } from './js/api.js';
import { icon } from './js/icons.js';
import {
  $,
  $$,
  esc,
  toast,
  applyTheme,
  resolveTheme,
  initThemeListener,
  avatarHtml,
  skeletonDashboardHtml,
  animateCounters
} from './js/ui.js';
import { renderLogin, renderPasswordChange } from './js/views/auth.js';
import { buildNotifications, openGlobalSearch } from './js/command.js';
import { renderDashboard, renderMyResults, renderAnalytics } from './js/views/dashboard.js';
import { renderRanking } from './js/views/ranking.js';
import { renderTeachersDirectory, renderProfile, renderPortfolioPrint } from './js/views/profile.js';
import { renderAddEntry, renderReviews, renderCriteria } from './js/views/entries.js';
import { renderAdmin, renderReports, renderSettings } from './js/views/admin.js';

const STATE = {
  users: [],
  entries: [],
  loading: false,
  syncError: null,
  lastSync: null
};

let ME = null;
let CUR_ROUTE = 'dashboard';
let ROUTE_PARAMS = {};
let SIDEBAR_COLLAPSED = localStorage.getItem('reyting_sidebar_collapsed') === '1';
let MOBILE_DRAWER_OPEN = false;
let IS_OFFLINE = !navigator.onLine;
let LAST_CREDS = [];

const ROUTE_TITLES = {
  dashboard: 'Boshqaruv paneli',
  my_results: 'Mening natijam',
  add_entry: 'Yutuq qo‘shish',
  ranking: 'Reyting jadvali',
  teachers: 'Pedagoglar',
  profile: 'Pedagog profili',
  portfolio_print: 'A4 Portfolio',
  reviews: 'Baholash va tasdiqlash',
  criteria: 'Baholash mezonlari',
  analytics: 'Statistika va tahlil',
  reports: 'Hisobotlar',
  admin: 'Administrator paneli',
  settings: 'Sozlamalar'
};

function getNavSections() {
  if (!ME) return [];
  const role = ME.role;
  const pendingReviewCount = STATE.entries.filter(e => {
    if (e.status !== 'pending') return false;
    if (role === 'director') return true;
    if (role === 'reviewer') {
      const ind = IMAP[e.ind];
      return ind && ind.resp.includes(ME.name);
    }
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
        { id: 'reviews', label: 'Tasdiqlash navbati', icon: 'check-circle', badge: pendingReviewCount },
        { id: 'criteria', label: 'Baholash mezonlari', icon: 'book-open' }
      ]
    });
    sections.push({
      title: 'Tahlil va boshqaruv',
      items: [
        { id: 'analytics', label: 'Statistika', icon: 'bar-chart-3' },
        { id: 'reports', label: 'Hisobotlar', icon: 'file-text' },
        { id: 'admin', label: 'Boshqaruv (Admin)', icon: 'shield' }
      ]
    });
  } else if (role === 'it_admin') {
    sections.push({
      title: 'Asosiy',
      items: [
        { id: 'dashboard', label: 'Boshqaruv paneli', icon: 'layout-dashboard' },
        { id: 'admin', label: 'Pedagoglar va import', icon: 'users' },
        { id: 'ranking', label: 'Reyting jadvali', icon: 'trophy' },
        { id: 'teachers', label: 'Pedagog profillari', icon: 'user-check' }
      ]
    });
    sections.push({
      title: 'Ma’lumotnoma',
      items: [
        { id: 'criteria', label: 'Baholash mezonlari', icon: 'book-open' },
        { id: 'reports', label: 'Hisobotlar', icon: 'file-text' }
      ]
    });
  } else if (role === 'reviewer') {
    sections.push({
      title: 'Asosiy',
      items: [
        { id: 'dashboard', label: 'Boshqaruv paneli', icon: 'layout-dashboard' },
        { id: 'reviews', label: 'Tasdiqlash', icon: 'check-circle', badge: pendingReviewCount },
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
    // Teacher
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
        { id: 'profile', label: 'Shaxsiy profil va portfolio', icon: 'user' },
        { id: 'criteria', label: 'Baholash mezonlari', icon: 'book-open' }
      ]
    });
  }

  sections.push({
    title: 'Tizim',
    items: [
      { id: 'settings', label: 'Sozlamalar', icon: 'settings' }
    ]
  });

  return sections;
}

function getAllowedRoutes(role) {
  if (role === 'director') {
    return ['dashboard', 'reviews', 'ranking', 'teachers', 'criteria', 'analytics', 'reports', 'admin', 'profile', 'portfolio_print', 'settings'];
  }
  if (role === 'it_admin') {
    return ['dashboard', 'admin', 'teachers', 'ranking', 'criteria', 'reports', 'profile', 'portfolio_print', 'settings'];
  }
  if (role === 'reviewer') {
    return ['dashboard', 'reviews', 'my_results', 'add_entry', 'ranking', 'teachers', 'criteria', 'analytics', 'reports', 'profile', 'portfolio_print', 'settings'];
  }
  return ['dashboard', 'my_results', 'add_entry', 'ranking', 'criteria', 'profile', 'portfolio_print', 'settings'];
}

async function syncData(showToastOnError = false) {
  STATE.loading = true;
  STATE.syncError = null;
  try {
    const [u, e] = await Promise.all([api.getUsers(), api.getEntries()]);
    STATE.users = u || [];
    STATE.entries = e || [];
    STATE.lastSync = new Date();
    if (ME) {
      const fresh = STATE.users.find(x => x.id === ME.id);
      if (fresh) {
        if (!fresh.active) {
          ME = null;
          saveSession(null);
          toast('Hisobingiz faolsizlashtirilgan.', 'warning');
          return;
        }
        ME = fresh;
        saveSession(ME);
      }
    }
  } catch (err) {
    STATE.syncError = err.message || 'Ma’lumotlarni yuklashda xatolik yuz berdi.';
    if (showToastOnError) toast(STATE.syncError, 'error');
  } finally {
    STATE.loading = false;
  }
}

function getContext() {
  return {
    me: ME,
    users: STATE.users,
    entries: STATE.entries,
    loading: STATE.loading,
    syncError: STATE.syncError,
    route: CUR_ROUTE,
    params: ROUTE_PARAMS,
    lastCreds: LAST_CREDS,
    setLastCreds: creds => { LAST_CREDS = creds; },
    navigate: (route, params = {}) => {
      const allowed = getAllowedRoutes(ME?.role);
      CUR_ROUTE = allowed.includes(route) ? route : 'dashboard';
      ROUTE_PARAMS = params;
      MOBILE_DRAWER_OPEN = false;
      render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    openProfile: uid => {
      CUR_ROUTE = 'profile';
      ROUTE_PARAMS = { uid };
      MOBILE_DRAWER_OPEN = false;
      render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    openPortfolioPrint: uid => {
      CUR_ROUTE = 'portfolio_print';
      ROUTE_PARAMS = { uid };
      MOBILE_DRAWER_OPEN = false;
      render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    refresh: async () => {
      await syncData(true);
      render();
    },
    openPasswordModal: () => {
      renderPasswordChange($('#root'), {
        user: ME,
        forced: false,
        onDone: () => render(),
        onCancel: () => render()
      });
    },
    logout: () => {
      ME = null;
      saveSession(null);
      CUR_ROUTE = 'dashboard';
      ROUTE_PARAMS = {};
      LAST_CREDS = [];
      render();
    }
  };
}

function renderBreadcrumb(ctx) {
  const parts = [{ label: 'Platforma', route: 'dashboard' }];
  if (CUR_ROUTE === 'profile') {
    const targetUser = STATE.users.find(u => u.id === (ROUTE_PARAMS.uid || ME.id));
    if (['director', 'reviewer', 'it_admin'].includes(ME.role)) {
      parts.push({ label: 'Pedagoglar', route: 'teachers' });
    } else {
      parts.push({ label: 'Reyting jadvali', route: 'ranking' });
    }
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
      ${parts.map((p, idx) => {
        const isLast = idx === parts.length - 1;
        return `
          ${idx > 0 ? `<span class="breadcrumbs-sep">${icon('chevron-right', 14)}</span>` : ''}
          ${isLast || !p.route
            ? `<span class="breadcrumbs-current">${esc(p.label)}</span>`
            : `<span class="breadcrumbs-root" data-bc-route="${p.route}">${esc(p.label)}</span>`}
        `;
      }).join('')}
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
  const unreadCount = notifications.filter(n => n.tone === 'warning' || n.tone === 'error').length;
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
            <div class="brand-logo">${icon('graduation-cap', 18)}</div>
            <div class="brand-text">
              <div class="brand-name">Pedagog Reyting</div>
              <div class="brand-sub">Norin tuman maktabi</div>
            </div>
          </div>
          <button type="button" class="btn btn-ghost btn-icon btn-sm sidebar-collapse-btn" id="sidebar-toggle-btn"
            title="${SIDEBAR_COLLAPSED ? 'Menyuni yoyish' : 'Menyuni yig‘ish'}"
            aria-label="${SIDEBAR_COLLAPSED ? 'Menyuni yoyish' : 'Menyuni yig‘ish'}">
            ${icon(SIDEBAR_COLLAPSED ? 'panel-left-open' : 'panel-left-close', 17)}
          </button>
        </div>

        <div class="sidebar-nav">
          ${navSections.map(sec => `
            <div class="nav-section">
              <div class="nav-section-title">${esc(sec.title)}</div>
              ${sec.items.map(item => {
                const isActive = CUR_ROUTE === item.id || (item.id === 'profile' && CUR_ROUTE === 'profile' && (ROUTE_PARAMS.uid || ME.id) === ME.id);
                return `
                  <button type="button"
                    class="nav-item ${isActive ? 'active' : ''}"
                    data-route="${item.id}"
                    data-tooltip="${esc(item.label)}"
                    aria-current="${isActive ? 'page' : 'false'}">
                    ${icon(item.icon, 18)}
                    <span class="nav-item-label">${esc(item.label)}</span>
                    ${item.badge > 0 ? `<span class="nav-badge">${item.badge}</span>` : ''}
                  </button>
                `;
              }).join('')}
            </div>
          `).join('')}
        </div>

        <div class="sidebar-foot">
          <div class="sidebar-user-card" style="cursor:pointer" id="sidebar-user-btn" title="Profil va sozlamalar">
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
            <button type="button" class="btn btn-ghost btn-icon mobile-menu-btn" id="mobile-menu-btn" aria-label="Menyuni ochish">
              ${icon('menu', 20)}
            </button>
            ${renderBreadcrumb(ctx)}
          </div>

          <div class="topbar-right">
            <button type="button" class="search-trigger" id="global-search-btn" aria-label="Global qidiruv">
              ${icon('search', 15)}
              <span class="search-trigger-text">Qidiruv…</span>
              <span class="kbd-hint">Ctrl+K</span>
            </button>

            ${quickAction}

            <div class="popover-wrap">
              <button type="button" class="btn btn-ghost btn-icon" id="notif-btn" aria-label="Bildirishnomalar" title="Bildirishnomalar" style="position:relative">
                ${icon('bell', 18)}
                ${unreadCount > 0 ? '<span class="notif-dot"></span>' : ''}
              </button>
              <div class="popover-menu popover-lg" id="notif-menu" style="display:none">
                <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px 6px">
                  <span style="font-size:13px;font-weight:600">Bildirishnomalar</span>
                  <span class="badge badge-neutral">${notifications.length} ta</span>
                </div>
                <div class="dropdown-sep"></div>
                <div style="max-height:300px;overflow-y:auto;display:flex;flex-direction:column;gap:2px">
                  ${notifications.map((n, idx) => `
                    <button type="button" class="dropdown-item" data-notif-idx="${idx}" style="align-items:flex-start;padding:9px 10px">
                      <span style="color:var(--${n.tone === 'neutral' ? 'text-muted' : n.tone});margin-top:1px">${icon(n.icon, 16)}</span>
                      <div style="min-width:0;flex:1">
                        <div style="font-size:12.5px;font-weight:600;color:var(--text);white-space:normal">${esc(n.title)}</div>
                        <div style="font-size:11.5px;color:var(--text-muted);white-space:normal;margin-top:2px">${esc(n.desc)}</div>
                      </div>
                    </button>
                  `).join('')}
                </div>
              </div>
            </div>

            <button type="button" class="btn btn-ghost btn-icon" id="theme-toggle-btn" title="Yorug‘ / Qorong‘i rejim" aria-label="Mavzuni almashtirish">
              ${icon(isDark ? 'sun' : 'moon', 18)}
            </button>

            <div class="popover-wrap">
              <button type="button" class="btn btn-ghost" id="profile-menu-btn" style="padding:4px 8px 4px 4px;gap:8px" aria-label="Profil menyusi">
                ${avatarHtml(ME.name, 'sm')}
                <span class="hide-xs" style="font-size:13px;font-weight:500;max-width:130px;overflow:hidden;text-overflow:ellipsis">${esc(ME.name.split(' ')[0])}</span>
                ${icon('chevron-down', 14)}
              </button>
              <div class="popover-menu" id="profile-menu" style="display:none">
                <div style="padding:8px 10px">
                  <div style="font-size:13.5px;font-weight:600;color:var(--text)">${esc(ME.name)}</div>
                  <div style="font-size:12px;color:var(--text-muted)">${esc(ROLE[ME.role] || ME.role)}</div>
                  ${ME.subject ? `<div style="font-size:11.5px;color:var(--primary);margin-top:2px">${esc(ME.subject)}</div>` : ''}
                </div>
                <div class="dropdown-sep"></div>
                <button type="button" class="dropdown-item" id="pm-profile">${icon('user', 16)} Mening profilim</button>
                <button type="button" class="dropdown-item" id="pm-settings">${icon('settings', 16)} Sozlamalar</button>
                <button type="button" class="dropdown-item" id="pm-password">${icon('key', 16)} Parolni almashtirish</button>
                <div class="dropdown-sep"></div>
                <button type="button" class="dropdown-item danger" id="pm-logout">${icon('log-out', 16)} Tizimdan chiqish</button>
              </div>
            </div>
          </div>
        </header>

        ${IS_OFFLINE ? `
          <div class="offline-banner" role="status">
            ${icon('wifi-off', 16)}
            <span>Internet aloqasi uzilgan. O‘zgarishlar saqlanmasligi mumkin.</span>
          </div>
        ` : ''}

        <main class="main-content" id="main-view"></main>
      </div>
    </div>
  `;

  // Bind navigation & shell events
  $$('[data-route]').forEach(btn => {
    btn.onclick = () => {
      const r = btn.dataset.route;
      ctx.navigate(r, r === 'profile' ? { uid: ME.id } : {});
    };
  });

  $$('[data-bc-route]').forEach(el => {
    el.onclick = () => ctx.navigate(el.dataset.bcRoute);
  });

  const toggleSidebarBtn = $('#sidebar-toggle-btn');
  if (toggleSidebarBtn) {
    toggleSidebarBtn.onclick = () => {
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
    $('#theme-toggle-btn').innerHTML = icon(next === 'dark' ? 'sun' : 'moon', 18);
  };

  // Popovers
  const notifMenu = $('#notif-menu');
  const profileMenu = $('#profile-menu');

  const closePopovers = () => {
    const nm = $('#notif-menu');
    const pm = $('#profile-menu');
    if (nm) nm.style.display = 'none';
    if (pm) pm.style.display = 'none';
  };

  $('#notif-btn').onclick = e => {
    e.stopPropagation();
    const isOpen = notifMenu.style.display === 'block';
    closePopovers();
    notifMenu.style.display = isOpen ? 'none' : 'block';
  };

  $('#profile-menu-btn').onclick = e => {
    e.stopPropagation();
    const isOpen = profileMenu.style.display === 'block';
    closePopovers();
    profileMenu.style.display = isOpen ? 'none' : 'block';
  };

  notifMenu.onclick = e => e.stopPropagation();
  profileMenu.onclick = e => e.stopPropagation();

  $$('[data-notif-idx]').forEach(btn => {
    btn.onclick = () => {
      closePopovers();
      notifications[Number(btn.dataset.notifIdx)].action();
    };
  });

  $('#pm-profile').onclick = () => { closePopovers(); ctx.openProfile(ME.id); };
  $('#pm-settings').onclick = () => { closePopovers(); ctx.navigate('settings'); };
  $('#pm-password').onclick = () => { closePopovers(); ctx.openPasswordModal(); };
  $('#pm-logout').onclick = () => { closePopovers(); ctx.logout(); };

  window._closeTopbarPopovers = closePopovers;

  // Render active view inside #main-view
  const main = $('#main-view');
  if (STATE.loading && !STATE.users.length) {
    main.innerHTML = skeletonDashboardHtml();
    return;
  }

  if (STATE.syncError && !STATE.users.length) {
    main.innerHTML = `
      <div class="card">
        <div class="empty-state">
          <div class="empty-icon" style="color:var(--error);border-color:var(--error-border)">${icon('alert-circle', 24)}</div>
          <h3 class="empty-title">Ma’lumotlarni yuklab bo‘lmadi</h3>
          <p class="empty-desc">${esc(STATE.syncError)}</p>
          <button type="button" class="btn btn-primary" id="retry-sync-btn">${icon('refresh-cw', 16)} Qayta urinish</button>
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
  else if (CUR_ROUTE === 'settings') renderSettings(main, ctx);

  animateCounters(main);
}

function render() {
  const root = $('#root');
  if (!ME) {
    renderLogin(root, {
      onLoginSuccess: async user => {
        ME = user;
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
      onDone: () => render()
    });
    return;
  }

  renderAppShell();
}

// Global click & keyboard listeners
document.addEventListener('click', () => {
  if (window._closeTopbarPopovers) window._closeTopbarPopovers();
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && window._closeTopbarPopovers) {
    window._closeTopbarPopovers();
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    if (!ME || ME.must_change) return;
    e.preventDefault();
    openGlobalSearch(getContext());
  }
});

// Online / Offline listeners
window.addEventListener('online', () => {
  IS_OFFLINE = false;
  toast('Internet aloqasi tiklandi.', 'success');
  if (ME) render();
});
window.addEventListener('offline', () => {
  IS_OFFLINE = true;
  toast('Internet aloqasi uzildi.', 'warning');
  if (ME) render();
});

initThemeListener(() => {
  if (ME) render();
});

// Bootstrap
(async function init() {
  ME = loadSession();
  if (ME) {
    render();
    await syncData(false);
  }
  render();
})();
