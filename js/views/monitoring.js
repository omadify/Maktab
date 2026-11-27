// Real Monitoring Center: Activity Logs, Login History (Asia/Tashkent), and Live User Presence
import { ROLE } from '../config.js';
import { icon } from '../icons.js';
import { $, $$, esc, avatarHtml, emptyStateHtml, formatDateTimeTashkent, openDetailDrawer } from '../ui.js';

let monFilter = {
  actSearch: '',
  actAction: 'all',
  actOutcome: 'all',
  actPage: 1,
  logSearch: '',
  logRole: 'all',
  logOutcome: 'all',
  logDevice: 'all',
  logDate: '',
  presFilter: 'all'
};

const ACTION_LABELS = {
  login_success: 'Muvaffaqiyatli kirish',
  login_failed: 'Kirishda xatolik',
  logout: 'Tizimdan chiqish',
  user_create: 'Foydalanuvchi yaratildi',
  user_update: 'Foydalanuvchi tahrirlandi',
  password_reset: 'Parol tiklandi',
  password_change: 'Parol almashtirildi',
  entry_submit: 'Yutuq kiritildi',
  entry_approved: 'Yutuq tasdiqlandi',
  entry_rejected: 'Yutuq rad etildi',
  entry_delete: 'Ariza o‘chirildi'
};

function presenceStatus(lastSeenIso, activeSessions, nowMs) {
  if (!lastSeenIso || activeSessions <= 0) return 'offline';
  const diff = nowMs - new Date(lastSeenIso).getTime();
  if (diff <= 2 * 60 * 1000) return 'online';
  if (diff <= 15 * 60 * 1000) return 'recent';
  return 'offline';
}

export function renderMonitoring(el, ctx) {
  const { route, monitoring } = ctx;
  const tab = route === 'login_history' ? 'logins' : (route === 'presence' ? 'presence' : 'activity');

  const available = Boolean(monitoring?.available);
  const activities = monitoring?.activities || [];
  const logins = monitoring?.logins || [];
  const presence = monitoring?.presence || [];
  const nowMs = monitoring?.serverTime ? new Date(monitoring.serverTime).getTime() : Date.now();

  if (!available) {
    el.innerHTML = `
      <div class="stack-v">
        <div class="page-header">
          <div>
            <h1 class="page-title">${tab === 'logins' ? 'Kirishlar tarixi' : (tab === 'presence' ? 'Faol foydalanuvchilar' : 'So‘nggi harakatlar')}</h1>
            <p class="page-desc">Server-side xavfsizlik va monitoring markazi</p>
          </div>
          <div class="page-actions">
            <button type="button" class="btn btn-secondary" id="mon-refresh">${icon('refresh-cw', 15)} Tekshirish</button>
          </div>
        </div>
        <div class="card">
          ${emptyStateHtml({
            iconName: 'shield',
            title: 'V4 Monitoring va Xavfsizlik migratsiyasi hali qo‘llanmagan',
            desc: 'Haqiqiy server-side audit loglar, kirishlar tarixi va jonli faollik jadvallari soxta ma’lumotsiz ishlashi uchun Supabase SQL Editor’da supabase/migrations/20261127_v4_security_monitoring.sql migratsiyasini ishga tushiring.'
          })}
        </div>
      </div>
    `;
    $('#mon-refresh').onclick = () => ctx.refresh();
    return;
  }

  if (tab === 'activity') return renderActivityView(el, ctx, activities);
  if (tab === 'logins') return renderLoginHistoryView(el, ctx, logins);
  return renderPresenceView(el, ctx, presence, nowMs);
}

function renderActivityView(el, ctx, activities) {
  const actionTypes = Array.from(new Set(activities.map(a => a.action))).sort();

  el.innerHTML = `
    <div class="stack-v">
      <div class="page-header">
        <div>
          <h1 class="page-title">So‘nggi harakatlar (Audit Log)</h1>
          <p class="page-desc">Tizimdagi barcha muhim harakatlarning o‘zgarmas server jurnali (Asia/Tashkent).</p>
        </div>
        <div class="page-actions">
          <button type="button" class="btn btn-secondary" id="act-refresh">${icon('refresh-cw', 15)} Yangilash</button>
        </div>
      </div>

      <div class="card">
        <div class="filter-bar">
          <div class="filter-controls">
            <div class="input-icon-wrap" style="min-width:200px;max-width:280px;flex:1">
              <span class="input-leading">${icon('search', 15)}</span>
              <input id="act-search" class="input has-leading" type="search" value="${esc(monFilter.actSearch)}" placeholder="Foydalanuvchi yoki ob’ekt…">
            </div>
            <select id="act-type" class="input" style="width:auto;min-width:180px">
              <option value="all">Barcha amallar</option>
              ${actionTypes.map(a => `<option value="${esc(a)}" ${monFilter.actAction === a ? 'selected' : ''}>${esc(ACTION_LABELS[a] || a)}</option>`).join('')}
            </select>
            <select id="act-outcome" class="input" style="width:auto;min-width:140px">
              <option value="all">Barcha natijalar</option>
              <option value="success" ${monFilter.actOutcome === 'success' ? 'selected' : ''}>Muvaffaqiyatli</option>
              <option value="failed" ${monFilter.actOutcome === 'failed' ? 'selected' : ''}>Muvaffaqiyatsiz</option>
            </select>
          </div>
          <span id="act-count" style="font-size:12.5px;color:var(--text-muted)"></span>
        </div>
        <div id="act-zone"></div>
      </div>
    </div>
  `;

  function draw() {
    const q = monFilter.actSearch.trim().toLowerCase();
    const filtered = activities.filter(a => {
      if (monFilter.actAction !== 'all' && a.action !== monFilter.actAction) return false;
      if (monFilter.actOutcome !== 'all' && a.outcome !== monFilter.actOutcome) return false;
      if (q) {
        const hay = `${a.actor_name} ${a.action} ${a.target_type} ${a.target_id}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const pageSize = 20;
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    if (monFilter.actPage > totalPages) monFilter.actPage = totalPages;
    const rows = filtered.slice((monFilter.actPage - 1) * pageSize, monFilter.actPage * pageSize);

    $('#act-count').textContent = `${filtered.length} ta hodisa`;
    const zone = $('#act-zone');
    if (rows.length === 0) {
      zone.innerHTML = emptyStateHtml({ iconName: 'activity', title: 'Harakatlar topilmadi', desc: 'Tanlangan filtrlar bo‘yicha hodisalar mavjud emas.' });
      return;
    }

    zone.innerHTML = `
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>Vaqt</th><th>Foydalanuvchi</th><th>Rol</th><th>Amal</th><th>Ob’ekt</th><th>Natija</th><th style="text-align:right">Tafsilot</th></tr></thead>
          <tbody>
            ${rows.map(a => `
              <tr>
                <td style="white-space:nowrap;font-size:12.5px;color:var(--text-muted)">${formatDateTimeTashkent(a.created_at)}</td>
                <td><b>${esc(a.actor_name || 'Tizim')}</b></td>
                <td><span class="badge badge-neutral">${esc(ROLE[a.actor_role] || a.actor_role || '—')}</span></td>
                <td>${esc(ACTION_LABELS[a.action] || a.action)}</td>
                <td><code>${esc(a.target_type || '')}${a.target_id ? `:${esc(a.target_id)}` : ''}</code></td>
                <td><span class="badge ${a.outcome === 'failed' ? 'badge-error' : 'badge-success'}">${esc(a.outcome)}</span></td>
                <td style="text-align:right"><button type="button" class="btn btn-ghost btn-sm" data-act-id="${a.id}">Ko‘rish</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px;align-items:center">
        <button type="button" class="btn btn-secondary btn-sm" id="act-prev" ${monFilter.actPage <= 1 ? 'disabled' : ''}>Oldingi</button>
        <span style="font-size:12.5px">${monFilter.actPage} / ${totalPages}</span>
        <button type="button" class="btn btn-secondary btn-sm" id="act-next" ${monFilter.actPage >= totalPages ? 'disabled' : ''}>Keyingi</button>
      </div>
    `;

    $('#act-prev').onclick = () => { if (monFilter.actPage > 1) { monFilter.actPage -= 1; draw(); } };
    $('#act-next').onclick = () => { if (monFilter.actPage < totalPages) { monFilter.actPage += 1; draw(); } };
    $$('[data-act-id]', zone).forEach(btn => {
      btn.onclick = () => {
        const a = activities.find(x => x.id === Number(btn.dataset.actId));
        if (!a) return;
        openDetailDrawer({
          title: ACTION_LABELS[a.action] || a.action,
          subtitle: `Event #${a.id} · ${formatDateTimeTashkent(a.created_at)}`,
          bodyHtml: `
            <div class="stack-v" style="gap:12px">
              <div style="padding:12px;border-radius:10px;background:var(--bg-subtle);border:1px solid var(--border);font-size:13px">
                <div><b>Foydalanuvchi:</b> ${esc(a.actor_name)} (ID: ${esc(a.actor_uid ?? '—')})</div>
                <div style="margin-top:4px"><b>Rol:</b> ${esc(ROLE[a.actor_role] || a.actor_role)}</div>
                <div style="margin-top:4px"><b>Ob’ekt:</b> ${esc(a.target_type)} #${esc(a.target_id)}</div>
                <div style="margin-top:4px"><b>Natija:</b> ${esc(a.outcome)}</div>
              </div>
              <div>
                <div style="font-size:12px;font-weight:600;color:var(--text-muted);margin-bottom:6px">Xavfsiz metadata</div>
                <pre style="margin:0;padding:12px;border-radius:10px;background:var(--bg-subtle);border:1px solid var(--border);font-size:12px;overflow-x:auto">${esc(JSON.stringify(a.metadata || {}, null, 2))}</pre>
              </div>
            </div>
          `
        });
      };
    });
  }

  $('#act-refresh').onclick = () => ctx.refresh();
  $('#act-search').oninput = e => { monFilter.actSearch = e.target.value; monFilter.actPage = 1; draw(); };
  $('#act-type').onchange = e => { monFilter.actAction = e.target.value; monFilter.actPage = 1; draw(); };
  $('#act-outcome').onchange = e => { monFilter.actOutcome = e.target.value; monFilter.actPage = 1; draw(); };
  draw();
}

function renderLoginHistoryView(el, ctx, logins) {
  const now = Date.now();
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tashkent' });
  const todayLogs = logins.filter(l => new Date(l.created_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Tashkent' }) === todayStr);
  const todayUnique = new Set(todayLogs.filter(l => l.success && l.uid).map(l => l.uid)).size;
  const last7d = logins.filter(l => (now - new Date(l.created_at).getTime()) <= 7 * 86400000).length;
  const last30d = logins.filter(l => (now - new Date(l.created_at).getTime()) <= 30 * 86400000).length;
  const failedCount = logins.filter(l => !l.success).length;

  const firstLog = logins.length ? logins[logins.length - 1].created_at : null;

  el.innerHTML = `
    <div class="stack-v">
      <div class="page-header">
        <div>
          <h1 class="page-title">Kirishlar tarixi</h1>
          <p class="page-desc">
            Server-side autentifikatsiya hodisalari (Asia/Tashkent vaqt zonasi)
            ${firstLog ? ` · Monitoring boshlanishi: ${formatDateTimeTashkent(firstLog)}` : ''}
          </p>
        </div>
        <div class="page-actions">
          <button type="button" class="btn btn-secondary" id="lh-refresh">${icon('refresh-cw', 15)} Yangilash</button>
        </div>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-top"><span class="kpi-label">Bugun kirganlar (noyob)</span><span class="kpi-icon primary">${icon('users', 16)}</span></div>
          <div class="kpi-value-row"><span class="kpi-value">${todayUnique}</span><span class="kpi-unit">nafar</span></div>
          <div class="kpi-foot"><span>Bugungi jami kirishlar: ${todayLogs.length}</span></div>
        </div>
        <div class="kpi-card">
          <div class="kpi-top"><span class="kpi-label">So‘nggi 7 kun</span><span class="kpi-icon success">${icon('log-in', 16)}</span></div>
          <div class="kpi-value-row"><span class="kpi-value">${last7d}</span><span class="kpi-unit">ta urinish</span></div>
          <div class="kpi-foot"><span>So‘nggi 30 kun: ${last30d}</span></div>
        </div>
        <div class="kpi-card">
          <div class="kpi-top"><span class="kpi-label">Muvaffaqiyatsiz urinishlar</span><span class="kpi-icon error">${icon('alert-circle', 16)}</span></div>
          <div class="kpi-value-row"><span class="kpi-value">${failedCount}</span><span class="kpi-unit">ta</span></div>
          <div class="kpi-foot"><span>Brute-force himoyasi faol</span></div>
        </div>
        <div class="kpi-card">
          <div class="kpi-top"><span class="kpi-label">Qurilmalar ulushi</span><span class="kpi-icon">${icon('laptop', 16)}</span></div>
          <div class="kpi-value-row"><span class="kpi-value">${logins.filter(l => l.device_type === 'mobile').length}</span><span class="kpi-unit">mobil</span></div>
          <div class="kpi-foot"><span>Kompyuter: ${logins.filter(l => l.device_type === 'desktop').length}</span></div>
        </div>
      </div>

      <div class="card">
        <div class="filter-bar">
          <div class="filter-controls">
            <div class="input-icon-wrap" style="min-width:190px;max-width:260px;flex:1">
              <span class="input-leading">${icon('search', 15)}</span>
              <input id="lh-search" class="input has-leading" type="search" value="${esc(monFilter.logSearch)}" placeholder="Ism yoki login…">
            </div>
            <select id="lh-role" class="input" style="width:auto">
              <option value="all">Barcha rollar</option>
              ${Object.entries(ROLE).map(([k, v]) => `<option value="${k}" ${monFilter.logRole === k ? 'selected' : ''}>${esc(v)}</option>`).join('')}
            </select>
            <select id="lh-res" class="input" style="width:auto">
              <option value="all">Barcha natijalar</option>
              <option value="ok" ${monFilter.logOutcome === 'ok' ? 'selected' : ''}>Muvaffaqiyatli</option>
              <option value="fail" ${monFilter.logOutcome === 'fail' ? 'selected' : ''}>Muvaffaqiyatsiz</option>
            </select>
            <select id="lh-dev" class="input" style="width:auto">
              <option value="all">Barcha qurilmalar</option>
              <option value="desktop" ${monFilter.logDevice === 'desktop' ? 'selected' : ''}>Kompyuter</option>
              <option value="mobile" ${monFilter.logDevice === 'mobile' ? 'selected' : ''}>Telefon</option>
              <option value="tablet" ${monFilter.logDevice === 'tablet' ? 'selected' : ''}>Planshet</option>
            </select>
            <input id="lh-date" class="input" type="date" value="${esc(monFilter.logDate)}" style="width:auto">
          </div>
        </div>
        <div id="lh-zone"></div>
      </div>
    </div>
  `;

  function draw() {
    const q = monFilter.logSearch.trim().toLowerCase();
    const filtered = logins.filter(l => {
      if (monFilter.logRole !== 'all' && l.role !== monFilter.logRole) return false;
      if (monFilter.logOutcome === 'ok' && !l.success) return false;
      if (monFilter.logOutcome === 'fail' && l.success) return false;
      if (monFilter.logDevice !== 'all' && l.device_type !== monFilter.logDevice) return false;
      if (monFilter.logDate) {
        const dStr = new Date(l.created_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Tashkent' });
        if (dStr !== monFilter.logDate) return false;
      }
      if (q && !`${l.user_name} ${l.login}`.toLowerCase().includes(q)) return false;
      return true;
    });

    const zone = $('#lh-zone');
    if (!filtered.length) {
      zone.innerHTML = emptyStateHtml({ iconName: 'history', title: 'Kirishlar topilmadi', desc: 'Tanlangan filtrlar bo‘yicha yozuvlar yo‘q.' });
      return;
    }

    zone.innerHTML = `
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>Foydalanuvchi</th><th>Rol</th><th>Vaqt (Toshkent)</th><th>Qurilma</th><th>Brauzer / OT</th><th>Natija</th></tr></thead>
          <tbody>
            ${filtered.slice(0, 80).map(l => `
              <tr>
                <td>
                  <div style="font-weight:600">${esc(l.user_name || l.login)}</div>
                  <div style="font-size:11.5px;color:var(--text-muted)"><code>${esc(l.login)}</code></div>
                </td>
                <td><span class="badge badge-neutral">${esc(ROLE[l.role] || l.role || '—')}</span></td>
                <td style="white-space:nowrap;font-size:12.5px">${formatDateTimeTashkent(l.created_at)}</td>
                <td><span style="display:inline-flex;align-items:center;gap:5px">${icon(l.device_type === 'mobile' ? 'smartphone' : 'laptop', 14)} ${esc(l.device_type)}</span></td>
                <td style="color:var(--text-muted)">${esc(l.browser || '—')} · ${esc(l.os || '—')}</td>
                <td>
                  <span class="badge ${l.success ? 'badge-success' : 'badge-error'}">
                    ${l.success ? 'Muvaffaqiyatli' : esc(l.failure_reason || 'Rad etildi')}
                  </span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  $('#lh-refresh').onclick = () => ctx.refresh();
  $('#lh-search').oninput = e => { monFilter.logSearch = e.target.value; draw(); };
  $('#lh-role').onchange = e => { monFilter.logRole = e.target.value; draw(); };
  $('#lh-res').onchange = e => { monFilter.logOutcome = e.target.value; draw(); };
  $('#lh-dev').onchange = e => { monFilter.logDevice = e.target.value; draw(); };
  $('#lh-date').onchange = e => { monFilter.logDate = e.target.value; draw(); };
  draw();
}

function renderPresenceView(el, ctx, presence, nowMs) {
  const enriched = presence.map(p => ({
    ...p,
    status: presenceStatus(p.last_seen_at, p.active_sessions, nowMs)
  }));

  const onlineCnt = enriched.filter(p => p.status === 'online').length;
  const recentCnt = enriched.filter(p => p.status === 'recent').length;
  const offlineCnt = enriched.filter(p => p.status === 'offline').length;

  el.innerHTML = `
    <div class="stack-v">
      <div class="page-header">
        <div>
          <h1 class="page-title">Faol foydalanuvchilar</h1>
          <p class="page-desc">Taxminiy jonli holat: Onlayn (≤2 daq.), Yaqinda faol (≤15 daq.), Oflayn.</p>
        </div>
        <div class="page-actions">
          <button type="button" class="btn btn-secondary" id="pr-refresh">${icon('refresh-cw', 15)} Yangilash</button>
        </div>
      </div>

      <div class="kpi-grid" style="grid-template-columns:repeat(3,minmax(0,1fr))">
        <div class="kpi-card">
          <div class="kpi-top"><span class="kpi-label">Hozir onlayn</span><span class="presence-dot online"></span></div>
          <div class="kpi-value-row"><span class="kpi-value">${onlineCnt}</span><span class="kpi-unit">nafar</span></div>
          <div class="kpi-foot"><span>So‘nggi 2 daqiqa ichida faol</span></div>
        </div>
        <div class="kpi-card">
          <div class="kpi-top"><span class="kpi-label">Yaqinda faol</span><span class="presence-dot recent"></span></div>
          <div class="kpi-value-row"><span class="kpi-value">${recentCnt}</span><span class="kpi-unit">nafar</span></div>
          <div class="kpi-foot"><span>So‘nggi 15 daqiqa ichida</span></div>
        </div>
        <div class="kpi-card">
          <div class="kpi-top"><span class="kpi-label">Oflayn</span><span class="presence-dot offline"></span></div>
          <div class="kpi-value-row"><span class="kpi-value">${offlineCnt}</span><span class="kpi-unit">nafar</span></div>
          <div class="kpi-foot"><span>Faol sessiya mavjud emas</span></div>
        </div>
      </div>

      <div class="card">
        <div class="filter-bar">
          <div class="tabs-pill">
            <button type="button" class="tab-btn ${monFilter.presFilter === 'all' ? 'active' : ''}" data-pf="all">Barchasi (${enriched.length})</button>
            <button type="button" class="tab-btn ${monFilter.presFilter === 'online' ? 'active' : ''}" data-pf="online">Onlayn (${onlineCnt})</button>
            <button type="button" class="tab-btn ${monFilter.presFilter === 'recent' ? 'active' : ''}" data-pf="recent">Yaqinda (${recentCnt})</button>
            <button type="button" class="tab-btn ${monFilter.presFilter === 'offline' ? 'active' : ''}" data-pf="offline">Oflayn (${offlineCnt})</button>
          </div>
        </div>

        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th>Foydalanuvchi</th><th>Rol</th><th>Holat</th><th>Oxirgi faoliyat</th><th>Oxirgi kirish</th><th>Sessiyalar</th></tr></thead>
            <tbody>
              ${enriched.filter(p => monFilter.presFilter === 'all' || p.status === monFilter.presFilter).map(p => `
                <tr>
                  <td>
                    <div style="display:flex;align-items:center;gap:10px">
                      ${avatarHtml(p.name, 'sm')}
                      <div>
                        <div style="font-weight:600">${esc(p.name)}</div>
                        <div style="font-size:11.5px;color:var(--text-muted)"><code>${esc(p.login)}</code></div>
                      </div>
                    </div>
                  </td>
                  <td><span class="badge badge-neutral">${esc(ROLE[p.role] || p.role)}</span></td>
                  <td>
                    <span style="display:inline-flex;align-items:center;gap:7px;font-size:13px">
                      <span class="presence-dot ${p.status}"></span>
                      ${p.status === 'online' ? 'Onlayn' : (p.status === 'recent' ? 'Yaqinda faol' : 'Oflayn')}
                    </span>
                  </td>
                  <td style="font-size:12.5px;color:var(--text-muted)">${formatDateTimeTashkent(p.last_seen_at)}</td>
                  <td style="font-size:12.5px;color:var(--text-muted)">${formatDateTimeTashkent(p.last_login_at)}</td>
                  <td><span class="badge badge-neutral">${p.active_sessions || 0}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  $('#pr-refresh').onclick = () => ctx.refresh();
  $$('[data-pf]').forEach(b => {
    b.onclick = () => { monFilter.presFilter = b.dataset.pf; renderPresenceView(el, ctx, presence, nowMs); };
  });
}
