// User Management Pro, Report Center & 2-Column V6 Settings (Appearance, Notifications, Security, Active Sessions)
import { IND, ROLE, IMAP, SEC, getRanking, extractSubjectLabel, makeLogin } from '../config.js';
import { api, isV4SecurityActive } from '../api.js';
import { icon } from '../icons.js';
import {
  $,
  $$,
  esc,
  csvCell,
  copyToClipboard,
  toast,
  openModal,
  openDetailDrawer,
  closeModal,
  confirmDialog,
  avatarHtml,
  renderSwitchHtml,
  emptyStateHtml,
  getThemePref,
  applyTheme,
  getTransparencyPref,
  applyTransparencyPref,
  formatDateTimeTashkent
} from '../ui.js';
import { syncLiquidPills } from '../motion.js';
import { exportRankingCSV } from './ranking.js';

let adminState = { tab: 'users', search: '', roleFilter: 'all' };
let reportState = { startDate: '', endDate: '' };
let settingsSection = 'appearance';

export function resetAdminViewState() {
  adminState = { tab: 'users', search: '', roleFilter: 'all' };
  reportState = { startDate: '', endDate: '' };
  settingsSection = 'appearance';
}

function triggerBlobDownload(filename, content) {
  const b = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(b);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function downloadCredsCSV(list) {
  const rows = list.map(c => [c.login, c.pw, c.name, c.subject || ''].map(csvCell).join(';'));
  triggerBlobDownload('pedagoglar_parollari.csv', 'Login;Vaqtinchalik Parol;F.I.Sh.;Fan\n' + rows.join('\n'));
  toast('Vaqtinchalik parollar CSV faylda yuklab olindi.', 'success');
}

function renderCredBanner(list) {
  if (!list || !list.length) return '';
  return `
    <div class="card" style="border-color:var(--success-border);background:var(--success-soft)">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:12px">
        <div style="display:flex;align-items:center;gap:10px">
          <div class="kpi-icon success">${icon('check-circle', 18)}</div>
          <div>
            <h3 class="card-title">${list.length} ta hisob uchun bir martalik kirish parollari yaratildi</h3>
            <p class="card-subtitle" style="color:var(--text-2)">Xavfsizlik sababli parollar faqat hozir ko‘rsatilmoqda. CSV faylni yuklab oling.</p>
          </div>
        </div>
        <button type="button" class="btn btn-primary" id="dl-creds-btn">${icon('download', 15)} Parollarni CSV yuklab olish</button>
      </div>
      <div class="table-wrap" style="max-height:220px;overflow-y:auto">
        <table class="data-table">
          <thead><tr><th>Login</th><th>Vaqtinchalik parol</th><th>F.I.Sh.</th><th>Sinf / Fan</th></tr></thead>
          <tbody>
            ${list.map(c => `<tr><td><b>${esc(c.login)}</b></td><td><code>${esc(c.pw)}</code></td><td>${esc(c.name)}</td><td>${esc(c.subject || '—')}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

/* ==========================================================================
   USER MANAGEMENT PRO (Director & IT Admin)
   ========================================================================== */
export function renderAdmin(el, ctx) {
  const { me, users, monitoring, lastCreds, setLastCreds } = ctx;
  const isDirector = me.role === 'director';
  const teachersCount = users.filter(u => u.role === 'teacher').length;
  const reviewersCount = users.filter(u => u.role === 'reviewer').length;
  const activeCount = users.filter(u => u.active).length;
  const inactiveCount = users.length - activeCount;

  const presenceMap = new Map((monitoring?.presence || []).map(p => [p.uid, p]));
  const nowMs = monitoring?.serverTime ? new Date(monitoring.serverTime).getTime() : Date.now();
  const onlineNow = (monitoring?.presence || []).filter(p => p.active_sessions > 0 && p.last_seen_at && (nowMs - new Date(p.last_seen_at).getTime()) <= 2 * 60 * 1000).length;

  el.innerHTML = `
    <div class="stack-v">
      <div class="page-header">
        <div>
          <h1 class="page-title">Foydalanuvchilar boshqaruvi</h1>
          <p class="page-desc">Pedagoglar va xodimlar hisoblarini boshqarish, tahrirlash va Excel/CSV ommaviy import.</p>
        </div>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-top"><span class="kpi-label">Jami foydalanuvchilar</span><span class="kpi-icon primary">${icon('users', 16)}</span></div>
          <div class="kpi-value-row"><span class="kpi-value">${users.length}</span><span class="kpi-unit">nafar</span></div>
          <div class="kpi-foot"><span>${teachersCount} pedagog · ${reviewersCount} mas’ul</span></div>
        </div>
        <div class="kpi-card">
          <div class="kpi-top"><span class="kpi-label">Faol akkauntlar</span><span class="kpi-icon success">${icon('user-check', 16)}</span></div>
          <div class="kpi-value-row"><span class="kpi-value">${activeCount}</span><span class="kpi-unit">ta</span></div>
          <div class="kpi-foot"><span>Faolsiz: ${inactiveCount} ta</span></div>
        </div>
        <div class="kpi-card">
          <div class="kpi-top"><span class="kpi-label">Hozir faol (onlayn)</span><span class="kpi-icon">${icon('radio', 16)}</span></div>
          <div class="kpi-value-row"><span class="kpi-value">${monitoring?.available ? onlineNow : '—'}</span><span class="kpi-unit">${monitoring?.available ? 'nafar' : ''}</span></div>
          <div class="kpi-foot"><span>${monitoring?.available ? 'So‘nggi 2 daqiqada' : 'Migratsiyadan so‘ng'}</span></div>
        </div>
        <div class="kpi-card">
          <div class="kpi-top"><span class="kpi-label">Xavfsizlik holati</span><span class="kpi-icon ${isV4SecurityActive() ? 'success' : 'warning'}">${icon('shield', 16)}</span></div>
          <div class="kpi-value-row"><span class="kpi-value" style="font-size:18px">${isV4SecurityActive() ? 'Himoyalangan' : 'Bazaviy rejim'}</span></div>
          <div class="kpi-foot"><span>${users.filter(u => u.active && u.must_change).length} ta parol almashtirishi kerak</span></div>
        </div>
      </div>

      <div id="cred-zone">${renderCredBanner(lastCreds)}</div>

      <div class="tabs-pill">
        <button type="button" class="tab-btn ${adminState.tab === 'users' ? 'active' : ''}" data-atab="users">${icon('users', 14)} Xodimlar ro‘yxati <span class="tab-count">${users.length}</span></button>
        <button type="button" class="tab-btn ${adminState.tab === 'add' ? 'active' : ''}" data-atab="add">${icon('user-plus', 14)} Yangi qo‘shish</button>
        <button type="button" class="tab-btn ${adminState.tab === 'import' ? 'active' : ''}" data-atab="import">${icon('file-spreadsheet', 14)} Ommaviy import (Excel / CSV)</button>
      </div>

      <div id="admin-tab-body"></div>
    </div>
  `;

  const dlBtn = $('#dl-creds-btn');
  if (dlBtn) dlBtn.onclick = () => downloadCredsCSV(lastCreds);

  $$('[data-atab]').forEach(btn => {
    btn.onclick = () => { adminState.tab = btn.dataset.atab; renderAdmin(el, ctx); };
  });

  syncLiquidPills(el);

  const body = $('#admin-tab-body');
  if (adminState.tab === 'users') renderUsersListTab(body, ctx, presenceMap, nowMs, isDirector);
  else if (adminState.tab === 'add') renderAddSingleUserTab(body, ctx, isDirector);
  else renderBulkImportTab(body, ctx, setLastCreds);
}

function renderUsersListTab(body, ctx, presenceMap, nowMs, isDirector) {
  const { me, users, monitoring } = ctx;

  body.innerHTML = `
    <div class="card">
      <div class="filter-bar">
        <div class="filter-controls">
          <div class="input-icon-wrap" style="min-width:210px;max-width:300px;flex:1">
            <span class="input-leading">${icon('search', 15)}</span>
            <input id="adm-search" class="input has-leading" type="search" value="${esc(adminState.search)}" placeholder="F.I.Sh., login yoki fan…">
          </div>
          <select id="adm-role-filter" class="input" style="width:auto;min-width:165px">
            <option value="all" ${adminState.roleFilter === 'all' ? 'selected' : ''}>Barcha rollar</option>
            ${Object.entries(ROLE).map(([k, v]) => `<option value="${k}" ${adminState.roleFilter === k ? 'selected' : ''}>${esc(v)}</option>`).join('')}
          </select>
        </div>
        <span id="adm-count" style="font-size:12.5px;color:var(--text-muted)"></span>
      </div>
      <div id="adm-table-zone"></div>
    </div>
  `;

  function drawUsers() {
    const q = adminState.search.trim().toLowerCase();
    const filtered = users.filter(u => {
      if (adminState.roleFilter !== 'all' && u.role !== adminState.roleFilter) return false;
      if (q && !`${u.login} ${u.name} ${u.subject || ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
    $('#adm-count').textContent = `${filtered.length} ta yozuv`;
    const zone = $('#adm-table-zone');

    if (!filtered.length) {
      zone.innerHTML = emptyStateHtml({ iconName: 'users', title: 'Foydalanuvchi topilmadi', desc: 'Qidiruv yoki rol filtrini o‘zgartirib ko‘ring.' });
      return;
    }

    const activeDirectorsCount = users.filter(x => x.role === 'director' && x.active).length;

    zone.innerHTML = `
      <div class="table-wrap desktop-table-only">
        <table class="data-table">
          <thead>
            <tr><th>Xodim</th><th>Login</th><th>Sinf / Fan</th><th>Rol</th><th>Reyting</th><th>Oxirgi faoliyat</th><th>Holat</th><th style="text-align:right">Amallar</th></tr>
          </thead>
          <tbody>
            ${filtered.map(u => {
              const pr = presenceMap.get(u.id);
              const isOnline = pr && pr.active_sessions > 0 && pr.last_seen_at && (nowMs - new Date(pr.last_seen_at).getTime()) <= 2 * 60 * 1000;
              const isRecent = pr && pr.active_sessions > 0 && pr.last_seen_at && (nowMs - new Date(pr.last_seen_at).getTime()) <= 15 * 60 * 1000;
              const dotClass = isOnline ? 'online' : (isRecent ? 'recent' : 'offline');
              const isTargetDirector = u.role === 'director';
              const canManageTarget = isDirector || !isTargetDirector;
              const isLastDirector = isTargetDirector && u.active && activeDirectorsCount <= 1;

              return `
                <tr style="${u.active ? '' : 'opacity:0.55'}">
                  <td>
                    <div style="display:flex;align-items:center;gap:10px;cursor:pointer" data-u-drawer="${u.id}">
                      ${avatarHtml(u.name, 'sm', u.avatar_url)}
                      <div>
                        <div style="font-weight:600;display:flex;align-items:center;gap:6px">
                          <span class="presence-dot ${dotClass}" title="${isOnline ? 'Onlayn' : (isRecent ? 'Yaqinda faol' : 'Oflayn')}"></span>
                          ${esc(u.name)}
                        </div>
                        <div style="font-size:11.5px;color:var(--text-muted)">Ro‘yxatdan: ${u.created ? formatDateTimeTashkent(u.created).split(',')[0] : '—'}</div>
                      </div>
                    </div>
                  </td>
                  <td><code>${esc(u.login)}</code></td>
                  <td style="color:var(--text-2)">${esc(u.subject || '—')}</td>
                  <td>
                    <select class="input" style="min-height:32px;padding:4px 8px;font-size:12px;width:auto" data-u-role="${u.id}" ${u.id === me.id || !canManageTarget || isLastDirector ? 'disabled' : ''}>
                      ${Object.entries(ROLE).map(([r, l]) => {
                        const disabledOpt = r === 'director' && !isDirector ? 'disabled' : '';
                        return `<option value="${r}" ${u.role === r ? 'selected' : ''} ${disabledOpt}>${esc(l)}</option>`;
                      }).join('')}
                    </select>
                  </td>
                  <td><input type="checkbox" class="checkbox" data-u-ranked="${u.id}" ${u.ranked && u.role === 'teacher' ? 'checked' : ''} ${u.role !== 'teacher' ? 'disabled title="Faqat pedagoglar reytingda qatnashadi"' : ''} aria-label="Reytingda qatnashadi"></td>
                  <td style="font-size:12px;color:var(--text-muted)">${pr?.last_seen_at ? formatDateTimeTashkent(pr.last_seen_at) : (u.last_login_at ? formatDateTimeTashkent(u.last_login_at) : '—')}</td>
                  <td><span class="badge ${u.active ? 'badge-success' : 'badge-neutral'}">${u.active ? 'Faol' : 'O‘chirilgan'}</span></td>
                  <td style="text-align:right">
                    <div style="display:inline-flex;gap:5px">
                      <button type="button" class="btn btn-ghost btn-sm" data-u-drawer="${u.id}" title="Tafsilotlar">${icon('info', 14)}</button>
                      <button type="button" class="btn btn-secondary btn-sm" data-u-edit="${u.id}" ${!canManageTarget ? 'disabled' : ''} title="Tahrirlash">${icon('edit-3', 14)}</button>
                      <button type="button" class="btn btn-secondary btn-sm" data-u-reset="${u.id}" ${!canManageTarget ? 'disabled' : ''} title="Parolni tiklash">${icon('key', 14)}</button>
                      ${u.id !== me.id && !isLastDirector && canManageTarget ? `<button type="button" class="btn btn-danger btn-sm" data-u-toggle="${u.id}">${u.active ? 'O‘chirish' : 'Yoqish'}</button>` : ''}
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>

      <div class="mobile-card-list">
        ${filtered.map(u => {
          const canManageTarget = isDirector || u.role !== 'director';
          const isLastDirector = u.role === 'director' && u.active && activeDirectorsCount <= 1;
          return `
            <div class="card card-compact" style="box-shadow:none;${u.active ? '' : 'opacity:0.6'}">
              <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:8px">
                <div style="display:flex;align-items:center;gap:10px;min-width:0" data-u-drawer="${u.id}">
                  ${avatarHtml(u.name, 'sm', u.avatar_url)}
                  <div style="min-width:0">
                    <div style="font-weight:600;font-size:14px">${esc(u.name)}</div>
                    <div style="font-size:12px;color:var(--text-muted)"><code>${esc(u.login)}</code> · ${esc(ROLE[u.role] || u.role)}</div>
                  </div>
                </div>
                <span class="badge ${u.active ? 'badge-success' : 'badge-neutral'}">${u.active ? 'Faol' : 'Nofaol'}</span>
              </div>
              <div style="font-size:12.5px;color:var(--text-2);margin-bottom:10px">${esc(u.subject || '—')}</div>
              <div style="display:flex;gap:8px;flex-wrap:wrap">
                <button type="button" class="btn btn-secondary btn-sm" style="flex:1" data-u-edit="${u.id}" ${!canManageTarget ? 'disabled' : ''}>Tahrirlash</button>
                <button type="button" class="btn btn-secondary btn-sm" style="flex:1" data-u-reset="${u.id}" ${!canManageTarget ? 'disabled' : ''}>Parol</button>
                ${u.id !== me.id && !isLastDirector && canManageTarget ? `<button type="button" class="btn btn-danger btn-sm" data-u-toggle="${u.id}">${u.active ? 'O‘chirish' : 'Yoqish'}</button>` : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    $$('[data-u-drawer]', zone).forEach(elBtn => {
      elBtn.onclick = () => {
        const u = users.find(x => x.id === Number(elBtn.dataset.uDrawer));
        if (!u) return;
        const pr = presenceMap.get(u.id);
        const uLogs = (monitoring?.activities || []).filter(a => a.actor_uid === u.id).slice(0, 6);
        const uLogins = (monitoring?.logins || []).filter(l => l.uid === u.id).slice(0, 5);
        openDetailDrawer({
          title: u.name,
          subtitle: `${ROLE[u.role] || u.role} · @${u.login}`,
          bodyHtml: `
            <div class="stack-v" style="gap:16px">
              <div style="padding:14px;border-radius:12px;background:var(--surface-soft);border:1px solid var(--border);font-size:13px;display:flex;flex-direction:column;gap:6px">
                <div><b>Sinf / Fan:</b> ${esc(u.subject || '—')}</div>
                <div><b>Holat:</b> ${u.active ? 'Faol' : 'O‘chirilgan'} · <b>Reytingda:</b> ${u.ranked ? 'Ha' : 'Yo‘q'}</div>
                <div><b>Oxirgi kirish:</b> ${formatDateTimeTashkent(pr?.last_login_at || u.last_login_at)}</div>
                <div><b>Oxirgi faoliyat:</b> ${formatDateTimeTashkent(pr?.last_seen_at || u.last_active_at)}</div>
                <div><b>Faol sessiyalar:</b> ${pr?.active_sessions ?? '—'}</div>
              </div>
              <div>
                <h4 style="font-size:13.5px;margin-bottom:8px">Oxirgi kirishlar</h4>
                ${uLogins.length === 0 ? '<p style="font-size:12.5px;color:var(--text-muted)">Ma’lumot mavjud emas</p>' : `
                  <div style="display:flex;flex-direction:column;gap:6px">
                    ${uLogins.map(l => `<div style="font-size:12px;display:flex;justify-content:space-between;padding:6px 8px;border-radius:8px;border:1px solid var(--border)"><span>${formatDateTimeTashkent(l.created_at)} · ${esc(l.device_type)}</span><span class="badge ${l.success ? 'badge-success' : 'badge-error'}">${l.success ? 'OK' : 'Xato'}</span></div>`).join('')}
                  </div>`}
              </div>
              <div>
                <h4 style="font-size:13.5px;margin-bottom:8px">Oxirgi harakatlar</h4>
                ${uLogs.length === 0 ? '<p style="font-size:12.5px;color:var(--text-muted)">Harakatlar qayd etilmagan</p>' : `
                  <div style="display:flex;flex-direction:column;gap:6px">
                    ${uLogs.map(a => `<div style="font-size:12px;display:flex;justify-content:space-between;padding:6px 8px;border-radius:8px;border:1px solid var(--border)"><span>${esc(a.action)}</span><span style="color:var(--text-muted)">${formatDateTimeTashkent(a.created_at)}</span></div>`).join('')}
                  </div>`}
              </div>
            </div>
          `,
          footerHtml: `<button type="button" class="btn btn-primary" id="ud-prof">Profilni ochish</button>`,
          onMount: panel => {
            panel.querySelector('#ud-prof').onclick = () => { closeModal(true); ctx.openProfile(u.id); };
          }
        });
      };
    });

    $$('[data-u-role]', zone).forEach(sel => {
      sel.onchange = async () => {
        sel.disabled = true;
        try {
          await api.updateUser(Number(sel.dataset.uRole), { role: sel.value });
          toast('Rol yangilandi (eski sessiyalar bekor qilindi).', 'success');
          await ctx.refresh();
        } catch (err) {
          toast('Xatolik: ' + err.message, 'error');
          await ctx.refresh();
        }
      };
    });

    $$('[data-u-ranked]', zone).forEach(chk => {
      chk.onchange = async () => {
        const prev = !chk.checked;
        chk.disabled = true;
        try {
          await api.updateUser(Number(chk.dataset.uRanked), { ranked: chk.checked ? 1 : 0 });
          toast('Reyting holati saqlandi.', 'success');
          await ctx.refresh();
        } catch (err) {
          chk.checked = prev;
          chk.disabled = false;
          toast('Xatolik: ' + err.message, 'error');
        }
      };
    });

    $$('[data-u-edit]', zone).forEach(btn => {
      btn.onclick = () => {
        const u = users.find(x => x.id === Number(btn.dataset.uEdit));
        if (!u) return;
        openDetailDrawer({
          title: 'Foydalanuvchini tahrirlash',
          subtitle: `@${u.login}`,
          bodyHtml: `
            <div class="stack-v" style="gap:14px">
              <div class="field"><label for="eu-name">F.I.Sh.</label><input id="eu-name" class="input" value="${esc(u.name)}" required></div>
              <div class="field"><label for="eu-subj">Sinf / Fan / Lavozim</label><input id="eu-subj" class="input" value="${esc(u.subject || '')}"></div>
              <div class="field">
                <label for="eu-role">Rol</label>
                <select id="eu-role" class="input" ${u.id === me.id ? 'disabled' : ''}>
                  ${Object.entries(ROLE).map(([r, l]) => `<option value="${r}" ${u.role === r ? 'selected' : ''} ${r === 'director' && !isDirector ? 'disabled' : ''}>${esc(l)}</option>`).join('')}
                </select>
              </div>
              <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
                <input id="eu-ranked" type="checkbox" class="checkbox" ${u.ranked ? 'checked' : ''}>
                <span>Reyting jadvalida ishtirok etadi</span>
              </label>
            </div>
          `,
          footerHtml: `<button type="button" class="btn btn-secondary" id="eu-cancel">Bekor qilish</button><button type="button" class="btn btn-primary" id="eu-save">Saqlash</button>`,
          onMount: panel => {
            panel.querySelector('#eu-cancel').onclick = () => closeModal(true);
            panel.querySelector('#eu-save').onclick = async () => {
              const name = panel.querySelector('#eu-name').value.trim();
              if (!name) return toast('F.I.Sh. kiritilishi shart.', 'warning');
              try {
                await api.updateUser(u.id, {
                  name,
                  subject: panel.querySelector('#eu-subj').value.trim(),
                  role: panel.querySelector('#eu-role').value,
                  ranked: panel.querySelector('#eu-ranked').checked ? 1 : 0
                });
                closeModal(true);
                toast('Ma’lumotlar yangilandi.', 'success');
                await ctx.refresh();
              } catch (err) {
                toast('Xatolik: ' + err.message, 'error');
              }
            };
          }
        });
      };
    });

    $$('[data-u-reset]', zone).forEach(btn => {
      btn.onclick = async () => {
        const u = users.find(x => x.id === Number(btn.dataset.uReset));
        if (!u) return;
        const ok = await confirmDialog({
          title: 'Parolni tiklash',
          message: `${u.name} (${u.login}) uchun yangi bir martalik parol yaratilsinmi?`,
          confirmText: 'Tiklash'
        });
        if (!ok) return;
        try {
          const res = await api.resetUserPassword(u);
          openModal({
            title: 'Yangi vaqtinchalik parol',
            bodyHtml: `
              <div class="stack-v" style="gap:12px">
                <p style="margin:0;color:var(--text-2)">Ushbu parol faqat bir marta ko‘rsatiladi. Pedagog birinchi kirishda uni yangilaydi.</p>
                <div style="padding:14px;border-radius:10px;background:var(--surface-soft);border:1px solid var(--border);display:flex;flex-direction:column;gap:6px">
                  <div><b>F.I.Sh.:</b> ${esc(res.name)}</div>
                  <div><b>Login:</b> <code>${esc(res.login)}</code></div>
                  <div><b>Parol:</b> <code style="font-size:14px;font-weight:700">${esc(res.pw)}</code></div>
                </div>
              </div>
            `,
            footerHtml: `<button type="button" class="btn btn-secondary" id="copy-pw-btn">${icon('copy', 14)} Nusxa olish</button><button type="button" class="btn btn-primary" id="close-pw-m">Yopish</button>`,
            onMount: panel => {
              panel.querySelector('#close-pw-m').onclick = () => closeModal(true);
              panel.querySelector('#copy-pw-btn').onclick = async () => {
                const copied = await copyToClipboard(`Login: ${res.login}\nParol: ${res.pw}`);
                toast(copied ? 'Login va parol nusxalandi.' : 'Nusxalash imkoni bo‘lmadi — qo‘lda ko‘chirib oling.', copied ? 'success' : 'error');
              };
            }
          });
          await ctx.refresh();
        } catch (err) {
          toast('Xatolik: ' + err.message, 'error');
        }
      };
    });

    $$('[data-u-toggle]', zone).forEach(btn => {
      btn.onclick = async () => {
        const u = users.find(x => x.id === Number(btn.dataset.uToggle));
        if (!u) return;
        const newActive = u.active ? 0 : 1;
        const ok = await confirmDialog({
          title: newActive ? 'Hisobni faollashtirish' : 'Hisobni faolsizlantirish',
          message: `${u.name} hisobini ${newActive ? 'yoqish' : 'o‘chirish'}ni tasdiqlaysizmi?`,
          confirmText: newActive ? 'Yoqish' : 'O‘chirish',
          danger: !newActive
        });
        if (!ok) return;
        try {
          await api.updateUser(u.id, { active: newActive });
          toast(newActive ? 'Hisob yoqildi.' : 'Hisob o‘chirildi.', 'success');
          await ctx.refresh();
        } catch (err) {
          toast('Xatolik: ' + err.message, 'error');
        }
      };
    });
  }

  $('#adm-search').oninput = e => { adminState.search = e.target.value; drawUsers(); };
  $('#adm-role-filter').onchange = e => { adminState.roleFilter = e.target.value; drawUsers(); };
  drawUsers();
}

function renderAddSingleUserTab(body, ctx, isDirector) {
  const { users, setLastCreds } = ctx;
  body.innerHTML = `
    <div class="card" style="max-width:660px">
      <div class="card-header"><div><h3 class="card-title">Bitta foydalanuvchi qo‘shish</h3><p class="card-subtitle">Kriptografik xavfsiz vaqtinchalik parol generatsiya qilinadi</p></div></div>
      <form id="nf" class="stack-v" style="gap:14px">
        <div class="field"><label for="nn">F.I.Sh. (To‘liq)</label><input id="nn" class="input" placeholder="Masalan: Karimov Anvar Jo‘rayevich" required></div>
        <div class="grid-2">
          <div class="field"><label for="nc">Sinfi (ixtiyoriy)</label><input id="nc" class="input" placeholder="10-A sinf"></div>
          <div class="field"><label for="ns">Fani / Lavozimi</label><input id="ns" class="input" placeholder="Matematika"></div>
        </div>
        <div class="grid-2">
          <div class="field"><label for="nl">Login (ixtiyoriy)</label><input id="nl" class="input" placeholder="Avtomatik generatsiya"></div>
          <div class="field">
            <label for="nr">Rol</label>
            <select id="nr" class="input">
              ${Object.entries(ROLE).map(([r, l]) => `<option value="${r}" ${r === 'teacher' ? 'selected' : ''} ${r === 'director' && !isDirector ? 'disabled' : ''}>${esc(l)}</option>`).join('')}
            </select>
          </div>
        </div>
        <div><button class="btn btn-primary" type="submit" id="add-one-btn">${icon('user-plus', 15)} Qo‘shish</button></div>
      </form>
    </div>
  `;

  $('#nf').onsubmit = async e => {
    e.preventDefault();
    const name = $('#nn').value.trim();
    if (!name) return;
    const subjectDesc = [$('#nc').value.trim(), $('#ns').value.trim()].filter(Boolean).join(' | ');
    const login = $('#nl').value.trim().toLowerCase() || makeLogin(name, null, users);
    if (users.some(u => u.login === login)) return toast(`Login "${login}" allaqachon band.`, 'warning');
    const role = $('#nr').value;
    const btn = $('#add-one-btn');
    btn.disabled = true;
    btn.textContent = 'Qo‘shilmoqda…';
    try {
      const created = await api.createUsers([{ login, name, subject: subjectDesc, role, ranked: role === 'teacher' ? 1 : 0 }]);
      setLastCreds(created);
      toast(`${name} muvaffaqiyatli qo‘shildi.`, 'success');
      adminState.tab = 'users';
      await ctx.refresh();
    } catch (err) {
      toast('Xatolik: ' + err.message, 'error');
      btn.disabled = false;
      btn.innerHTML = `${icon('user-plus', 15)} Qo‘shish`;
    }
  };
}

function renderBulkImportTab(body, ctx, setLastCreds) {
  const { users } = ctx;
  let parsedPreview = null;

  body.innerHTML = `
    <div class="card">
      <div class="card-header">
        <div><h3 class="card-title">Ommaviy import (Excel / CSV / TXT)</h3><p class="card-subtitle">Fayl brauzer xotirasida o‘qiladi, server diskiga saqlanmaydi. Yuklashdan oldin validatsiya va preview ko‘rsatiladi.</p></div>
      </div>

      <div class="form-alert info" style="margin-bottom:16px">
        ${icon('file-spreadsheet', 18)}
        <div><b>Format:</b> <code>F.I.Sh.; Sinf; Fan</code> (yoki <code>F.I.Sh.; Fan</code>) · Har bir qator bitta pedagog.</div>
      </div>

      <div class="dropzone" id="uf-drop" style="margin-bottom:14px">
        <input type="file" id="uf" accept=".xlsx,.csv,.txt" style="display:none">
        <div style="display:flex;flex-direction:column;align-items:center;gap:6px">
          <div class="kpi-icon primary">${icon('upload-cloud', 18)}</div>
          <div id="fn" style="font-size:13.5px;font-weight:500">Excel (.xlsx), CSV yoki TXT faylini tanlang (maks 5 MB)</div>
        </div>
      </div>

      <div class="field">
        <label for="bt">Ro‘yxat matni</label>
        <textarea id="bt" class="input" rows="5" placeholder="Karimov Anvar Jo‘rayevich; 10-A sinf; Matematika&#10;Rasulova Ziyoda Akramovna; 9-B sinf; Ingliz tili"></textarea>
      </div>

      <div style="display:flex;gap:10px;margin-top:14px;flex-wrap:wrap">
        <button type="button" class="btn btn-secondary" id="imp-preview-btn">${icon('eye', 15)} Tekshirish va Preview</button>
        <button type="button" class="btn btn-primary" id="imp-run-btn" style="display:none">${icon('check-circle', 15)} Importni tasdiqlash</button>
      </div>

      <div id="imp-preview-zone" style="margin-top:16px"></div>
    </div>
  `;

  const uf = $('#uf');
  $('#uf-drop').onclick = () => uf.click();
  uf.onchange = e => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) return toast('Import fayli 5 MB dan oshmasligi kerak.', 'error');
    $('#fn').textContent = `${f.name} (${Math.round(f.size / 1024)} KB)`;
    if (f.name.endsWith('.xlsx')) {
      if (typeof window.XLSX === 'undefined') return toast('Excel kutubxonasi yuklanmoqda, biroz kuting…', 'warning');
      const r = new FileReader();
      r.onload = ev => {
        const wb = window.XLSX.read(ev.target.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = window.XLSX.utils.sheet_to_json(ws, { header: 1 });
        $('#bt').value = data.filter(row => row && row.length).map(row => row.join('; ')).join('\n');
        validateAndPreview();
      };
      r.readAsBinaryString(f);
    } else {
      const r = new FileReader();
      r.onload = ev => { $('#bt').value = ev.target.result; validateAndPreview(); };
      r.readAsText(f);
    }
    uf.value = '';
  };

  function validateAndPreview() {
    const val = $('#bt').value.trim();
    const zone = $('#imp-preview-zone');
    const runBtn = $('#imp-run-btn');
    if (!val) {
      zone.innerHTML = '';
      runBtn.style.display = 'none';
      parsedPreview = null;
      return;
    }

    const lines = val.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
    const existingLogins = new Set(users.map(u => u.login));
    const existingNames = new Set(users.map(u => u.name.trim().toLowerCase()));
    const valid = [];
    const errors = [];

    lines.forEach((line, idx) => {
      const delim = line.includes(';') ? ';' : (line.includes('\t') ? '\t' : ',');
      const parts = line.split(delim).map(p => p.trim());
      const name = parts[0] || '';
      if (name.length < 3) {
        errors.push({ line: idx + 1, raw: line, reason: 'Ism bo‘sh yoki juda qisqa' });
        return;
      }
      const sinf = parts[1] || '';
      const fan = parts[2] || '';
      const subjectDesc = [sinf, fan].filter(Boolean).join(' | ');
      const dupName = existingNames.has(name.toLowerCase());
      const login = makeLogin(name, existingLogins, users);
      valid.push({ login, name, subject: subjectDesc, role: 'teacher', ranked: 1, dupName });
    });

    parsedPreview = valid;
    runBtn.style.display = valid.length > 0 ? 'inline-flex' : 'none';
    runBtn.textContent = `Importni tasdiqlash (${valid.length} nafar)`;

    zone.innerHTML = `
      <div style="display:flex;gap:10px;margin-bottom:10px;flex-wrap:wrap">
        <span class="badge badge-success">Yaroqli: ${valid.length} ta</span>
        ${errors.length ? `<span class="badge badge-error">Xato qatorlar: ${errors.length} ta</span>` : ''}
      </div>
      ${errors.length ? `<div class="form-alert error" style="margin-bottom:10px">${icon('alert-circle', 16)}<div>${errors.slice(0, 5).map(e => `<div>Qator ${e.line}: ${esc(e.reason)} (<code>${esc(e.raw)}</code>)</div>`).join('')}</div></div>` : ''}
      ${valid.length ? `<div class="table-wrap" style="max-height:240px;overflow-y:auto">
        <table class="data-table">
          <thead><tr><th>#</th><th>F.I.Sh.</th><th>Avtomatik login</th><th>Sinf / Fan</th><th>Eslatma</th></tr></thead>
          <tbody>
            ${valid.map((v, i) => `<tr><td>${i + 1}</td><td><b>${esc(v.name)}</b></td><td><code>${esc(v.login)}</code></td><td>${esc(v.subject || '—')}</td><td>${v.dupName ? '<span class="badge badge-warning">O‘xshash ism mavjud</span>' : '<span class="badge badge-success">Tayyor</span>'}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>` : ''}
    `;
  }

  $('#imp-preview-btn').onclick = validateAndPreview;

  $('#imp-run-btn').onclick = async () => {
    if (!parsedPreview || !parsedPreview.length) return;
    const btn = $('#imp-run-btn');
    btn.disabled = true;
    btn.textContent = `Bazaga kiritilmoqda (${parsedPreview.length} nafar)…`;
    try {
      const created = await api.createUsers(parsedPreview.map(({ dupName, ...u }) => u));
      setLastCreds(created);
      toast(`${created.length} nafar pedagog muvaffaqiyatli yuklandi.`, 'success');
      adminState.tab = 'users';
      await ctx.refresh();
    } catch (err) {
      toast('Import xatosi: ' + err.message, 'error');
      btn.disabled = false;
      btn.textContent = `Importni tasdiqlash (${parsedPreview.length} nafar)`;
    }
  };
}

/* ==========================================================================
   REPORT CENTER (Role-Scoped, Date Range, Formula-Safe CSV, A4 Print)
   ========================================================================== */
export function renderReports(el, ctx) {
  const { me, users, entries } = ctx;
  const isStaff = ['director', 'reviewer'].includes(me.role);
  const ranking = getRanking(users, entries);

  const inRange = e => {
    if (reportState.startDate && e.date < reportState.startDate) return false;
    if (reportState.endDate && e.date > reportState.endDate) return false;
    return true;
  };

  const rangedEntries = entries.filter(inRange);
  const approvedEntries = rangedEntries.filter(e => e.status === 'approved');
  const rejectedEntries = rangedEntries.filter(e => e.status === 'rejected');

  function downloadCsv(filename, header, rows) {
    const body = rows.map(r => r.map(csvCell).join(';')).join('\n');
    triggerBlobDownload(filename, header + '\n' + body);
    toast(`${filename} yuklab olindi.`, 'success');
  }

  el.innerHTML = `
    <div class="stack-v">
      <div class="page-header">
        <div>
          <h1 class="page-title">Hisobotlar markazi</h1>
          <p class="page-desc">Generatsiya sanasi: ${new Date().toLocaleDateString('uz-UZ')} · Barcha CSV fayllar Excel UTF-8 va formula-himoyasi bilan.</p>
        </div>
      </div>

      <div class="card card-compact">
        <div class="filter-bar" style="margin-bottom:0">
          <div class="filter-controls">
            <span style="font-size:13px;font-weight:500;color:var(--text-2)">Yutuqlar sanasi oralig‘i:</span>
            <input id="rep-start" type="date" class="input" value="${esc(reportState.startDate)}" style="width:auto" aria-label="Boshlanish sanasi">
            <span style="color:var(--text-muted)">—</span>
            <input id="rep-end" type="date" class="input" value="${esc(reportState.endDate)}" style="width:auto" aria-label="Tugash sanasi">
            ${(reportState.startDate || reportState.endDate) ? '<button type="button" class="btn btn-ghost btn-sm" id="rep-clear">Tozalash</button>' : ''}
          </div>
          <span style="font-size:12.5px;color:var(--text-muted)">Oraliqdagi yutuqlar: <b>${rangedEntries.length}</b> ta</span>
        </div>
      </div>

      <div class="grid-3">
        <div class="card card-compact" style="display:flex;flex-direction:column;justify-content:space-between;gap:14px">
          <div>
            <div class="kpi-icon primary" style="margin-bottom:10px">${icon('trophy', 17)}</div>
            <h3 class="card-title">Umumiy reyting hisoboti</h3>
            <p class="card-subtitle" style="margin-top:4px">${ranking.length} nafar pedagogning A, B, C va jami ballari.</p>
          </div>
          <button type="button" class="btn btn-primary btn-sm" id="rep-rk-btn">${icon('download', 14)} Yuklab olish (CSV)</button>
        </div>

        <div class="card card-compact" style="display:flex;flex-direction:column;justify-content:space-between;gap:14px">
          <div>
            <div class="kpi-icon success" style="margin-bottom:10px">${icon('check-circle', 17)}</div>
            <h3 class="card-title">Tasdiqlangan natijalar</h3>
            <p class="card-subtitle" style="margin-top:4px">Oraliqdagi ${approvedEntries.length} ta tasdiqlangan yutuq reestri.</p>
          </div>
          <button type="button" class="btn btn-secondary btn-sm" id="rep-app-btn">${icon('download', 14)} Yuklab olish (CSV)</button>
        </div>

        <div class="card card-compact" style="display:flex;flex-direction:column;justify-content:space-between;gap:14px">
          <div>
            <div class="kpi-icon" style="margin-bottom:10px">${icon('bar-chart-3', 17)}</div>
            <h3 class="card-title">Fanlar va indikatorlar</h3>
            <p class="card-subtitle" style="margin-top:4px">Fan kafedralari va 15 mezon kesimidagi jamlanma.</p>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <button type="button" class="btn btn-secondary btn-sm" id="rep-subj-btn">${icon('download', 14)} Fanlar</button>
            <button type="button" class="btn btn-secondary btn-sm" id="rep-ind-btn">${icon('download', 14)} Mezonlar</button>
          </div>
        </div>

        ${isStaff ? `
          <div class="card card-compact" style="display:flex;flex-direction:column;justify-content:space-between;gap:14px">
            <div>
              <div class="kpi-icon error" style="margin-bottom:10px">${icon('x-circle', 17)}</div>
              <h3 class="card-title">Rad etilgan natijalar</h3>
              <p class="card-subtitle" style="margin-top:4px">${rejectedEntries.length} ta rad etilgan ariza va sabablar.</p>
            </div>
            <button type="button" class="btn btn-secondary btn-sm" id="rep-rej-btn">${icon('download', 14)} Yuklab olish (CSV)</button>
          </div>
        ` : ''}
      </div>

      <div class="card">
        <div class="card-header"><div><h3 class="card-title">Pedagoglarning rasmiy A4 portfoliolari</h3><p class="card-subtitle">Chop etish yoki PDF saqlash uchun istalgan pedagogni tanlang</p></div></div>
        ${ranking.length === 0
          ? emptyStateHtml({ iconName: 'file-text', title: 'Ma’lumotlar mavjud emas', desc: 'Reytingda faol pedagoglar bo‘lgach portfoliolar shu yerda ko‘rinadi.' })
          : `<div class="table-wrap">
              <table class="data-table">
                <thead><tr><th>O‘rin</th><th>Pedagog</th><th>Fan / Sinf</th><th>Jami ball</th><th style="text-align:right">Portfolio</th></tr></thead>
                <tbody>
                  ${ranking.map(r => `
                    <tr>
                      <td><b>#${r.rank}</b></td>
                      <td><b>${esc(r.name)}</b></td>
                      <td style="color:var(--text-muted)">${esc(r.subject)}</td>
                      <td><b style="color:var(--primary)">${r.T} ball</b></td>
                      <td style="text-align:right"><button type="button" class="btn btn-secondary btn-sm" data-rep-port="${r.id}">${icon('printer', 14)} A4 Portfolio</button></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>`}
      </div>
    </div>
  `;

  $('#rep-start').onchange = e => { reportState.startDate = e.target.value; renderReports(el, ctx); };
  $('#rep-end').onchange = e => { reportState.endDate = e.target.value; renderReports(el, ctx); };
  const cl = $('#rep-clear');
  if (cl) cl.onclick = () => { reportState = { startDate: '', endDate: '' }; renderReports(el, ctx); };

  $('#rep-rk-btn').onclick = () => exportRankingCSV(ranking.map(r => ({ ...r, globalRank: r.rank })), 'Umumiy');

  $('#rep-app-btn').onclick = () => downloadCsv(
    'tasdiqlangan_yutuqlar.csv',
    'Sana;Pedagog;Fan;Mezon;Turi;Soni;Ball;Tavsif',
    approvedEntries.map(e => {
      const u = users.find(x => x.id === e.uid);
      return [e.date, u?.name || '', u?.subject || '', `${e.ind}. ${IMAP[e.ind]?.name || ''}`, e.type, e.qty, e.pts, e.descr];
    })
  );

  $('#rep-subj-btn').onclick = () => {
    const map = {};
    ranking.forEach(r => {
      const s = extractSubjectLabel(r.subject);
      if (!map[s]) map[s] = { s, n: 0, t: 0, a: 0, b: 0, c: 0 };
      map[s].n++; map[s].t += r.T; map[s].a += r.A; map[s].b += r.B; map[s].c += r.C;
    });
    downloadCsv(
      'fanlar_hisoboti.csv',
      'Fan;Pedagoglar soni;O‘rtacha A;O‘rtacha B;O‘rtacha C;O‘rtacha Jami',
      Object.values(map).map(m => [m.s, m.n, (m.a / m.n).toFixed(1), (m.b / m.n).toFixed(1), (m.c / m.n).toFixed(1), (m.t / m.n).toFixed(1)])
    );
  };

  $('#rep-ind-btn').onclick = () => {
    downloadCsv(
      'indikatorlar_hisoboti.csv',
      'Indikator;Bo‘lim;Maksimal ball;Tasdiqlangan arizalar;Jami ball',
      IND.map(i => {
        const list = approvedEntries.filter(e => e.ind === i.id);
        return [`${i.id}. ${i.name}`, SEC[i.sec][0], i.max, list.length, list.reduce((s, e) => s + Number(e.pts || 0), 0)];
      })
    );
  };

  const rejBtn = $('#rep-rej-btn');
  if (rejBtn) {
    rejBtn.onclick = () => downloadCsv(
      'rad_etilgan_arizalar.csv',
      'Sana;Pedagog;Mezon;Turi;Izoh',
      rejectedEntries.map(e => {
        const u = users.find(x => x.id === e.uid);
        return [e.date, u?.name || '', `${e.ind}. ${IMAP[e.ind]?.name || ''}`, e.type, e.note || ''];
      })
    );
  }

  $$('[data-rep-port]').forEach(b => { b.onclick = () => ctx.openPortfolioPrint(Number(b.dataset.repPort)); });
}

/* ==========================================================================
   V6 2-COLUMN SETTINGS EXPERIENCE
   ========================================================================== */
export function renderSettings(el, ctx) {
  const { me } = ctx;
  const pref = getThemePref();
  const transPref = getTransparencyPref();
  const notifPrefs = me.preferences?.notif_prefs || { reviews: true, appeals: true, goals: true, deadlines: true };

  const sections = [
    { id: 'profile', label: 'Profil', icon: 'user' },
    { id: 'appearance', label: 'Ko‘rinish', icon: 'sun' },
    { id: 'notifications', label: 'Bildirishnomalar', icon: 'bell' },
    { id: 'security', label: 'Xavfsizlik', icon: 'shield' },
    { id: 'sessions', label: 'Sessiyalar', icon: 'laptop' },
    { id: 'account', label: 'Hisob ma’lumotlari', icon: 'info' }
  ];

  el.innerHTML = `
    <div class="stack-v" style="max-width:1020px">
      <div class="page-header">
        <div>
          <h1 class="page-title">Sozlamalar</h1>
          <p class="page-desc">Ko‘rinish, bildirishnomalar, faol sessiyalar va hisob xavfsizligi.</p>
        </div>
      </div>

      <div class="settings-layout">
        <nav class="card settings-nav" aria-label="Sozlamalar bo‘limlari">
          ${sections.map(s => `
            <button type="button" class="nav-item ${settingsSection === s.id ? 'active' : ''}" data-set-sec="${s.id}">
              ${icon(s.icon, 16)}
              <span class="nav-item-label">${esc(s.label)}</span>
            </button>
          `).join('')}
        </nav>

        <div id="settings-pane" class="stack-v"></div>
      </div>
    </div>
  `;

  $$('[data-set-sec]').forEach(btn => {
    btn.onclick = () => {
      settingsSection = btn.dataset.setSec;
      renderSettings(el, ctx);
    };
  });

  const pane = $('#settings-pane');

  if (settingsSection === 'profile') {
    pane.innerHTML = `
      <div class="card">
        <div class="card-header"><div><h3 class="card-title">Shaxsiy profil</h3><p class="card-subtitle">Avatar, muqova, bio va aloqa ma’lumotlarini boshqarish</p></div></div>
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px">
          ${avatarHtml(me.name, 'lg', me.avatar_url)}
          <div>
            <div style="font-size:16px;font-weight:700">${esc(me.name)}</div>
            <div style="font-size:13px;color:var(--text-muted)">${esc(me.subject || ROLE[me.role])}</div>
          </div>
        </div>
        <button type="button" class="btn btn-primary" id="set-go-prof">${icon('user', 15)} Profil sahifasini ochish</button>
      </div>
    `;
    $('#set-go-prof', pane).onclick = () => ctx.openProfile(me.id);
    return;
  }

  if (settingsSection === 'appearance') {
    pane.innerHTML = `
      <div class="card">
        <div class="card-header"><div><h3 class="card-title">Mavzu (Theme)</h3><p class="card-subtitle">Yorug‘, qorong‘i yoki qurilma tizimiga mos rejim</p></div></div>
        <div class="tabs-pill">
          <button type="button" class="tab-btn ${pref === 'light' ? 'active' : ''}" data-theme-pref="light">${icon('sun', 14)} Yorug‘</button>
          <button type="button" class="tab-btn ${pref === 'dark' ? 'active' : ''}" data-theme-pref="dark">${icon('moon', 14)} Qorong‘i</button>
          <button type="button" class="tab-btn ${pref === 'system' ? 'active' : ''}" data-theme-pref="system">${icon('monitor', 14)} Tizim bo‘yicha</button>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><div><h3 class="card-title">Liquid Glass shaffoflik darajasi</h3><p class="card-subtitle">Qurilma unumdorligi yoki yuqori kontrast ehtiyojiga moslash</p></div></div>
        <div class="tabs-pill">
          <button type="button" class="tab-btn ${transPref === 'glass' ? 'active' : ''}" data-trans-pref="glass">${icon('sparkles', 14)} Liquid Glass</button>
          <button type="button" class="tab-btn ${transPref === 'reduced' ? 'active' : ''}" data-trans-pref="reduced">${icon('sliders', 14)} Yuqori kontrast (Shaffofliksiz)</button>
        </div>
      </div>
    `;
    $$('[data-theme-pref]', pane).forEach(btn => {
      btn.onclick = () => {
        applyTheme(btn.dataset.themePref);
        api.updateMyPreferences({ theme: btn.dataset.themePref });
        toast('Mavzu yangilandi.', 'success');
        renderSettings(el, ctx);
      };
    });
    $$('[data-trans-pref]', pane).forEach(btn => {
      btn.onclick = () => {
        applyTransparencyPref(btn.dataset.transPref);
        toast('Shaffoflik sozlamasi saqlandi.', 'success');
        renderSettings(el, ctx);
      };
    });
    syncLiquidPills(pane);
    return;
  }

  if (settingsSection === 'notifications') {
    const rows = [
      { key: 'reviews', title: 'Yutuqlar tasdiqlanishi va rad etilishi', desc: 'Arizalaringiz bo‘yicha ekspert qarori chiqqanda bildirishnoma olish' },
      { key: 'appeals', title: 'Murojaatlar va apellyatsiya javoblari', desc: 'Murojaatingizga javob yoki holat o‘zgarishi kelganda xabar berish' },
      { key: 'goals', title: 'Rivojlanish rejasi muddatlari', desc: 'Shaxsiy maqsadlaringiz muddati 7 kun ichida yaqinlashganda eslatma' },
      { key: 'deadlines', title: 'Rasmiy hisobot muddatlari (20 va 25-sana)', desc: 'Har oylik hujjat topshirish va yakuniy hisobot eslatmalari' }
    ];
    pane.innerHTML = `
      <div class="card">
        <div class="card-header"><div><h3 class="card-title">Bildirishnoma sozlamalari</h3><p class="card-subtitle">Qaysi hodisalar bo‘yicha xabarnomalar ko‘rsatilishini tanlang</p></div></div>
        <div class="stack-v" style="gap:12px">
          ${rows.map(r => `
            <div style="display:flex;align-items:center;justify-content:space-between;gap:14px;padding:12px 14px;border-radius:12px;background:var(--surface-soft);border:1px solid var(--border)">
              <div>
                <div style="font-size:13.5px;font-weight:600">${esc(r.title)}</div>
                <div style="font-size:12px;color:var(--text-muted);margin-top:2px">${esc(r.desc)}</div>
              </div>
              ${renderSwitchHtml({ id: `np-${r.key}`, checked: notifPrefs[r.key] !== false, label: r.title })}
            </div>
          `).join('')}
        </div>
      </div>
    `;
    rows.forEach(r => {
      const sw = $(`#np-${r.key}`, pane);
      sw.onclick = async () => {
        const nextVal = sw.getAttribute('aria-checked') !== 'true';
        sw.setAttribute('aria-checked', String(nextVal));
        const nextPrefs = { ...notifPrefs, [r.key]: nextVal };
        me.preferences = { ...(me.preferences || {}), notif_prefs: nextPrefs };
        await api.updateMyPreferences({ notif_prefs: nextPrefs });
        toast('Bildirishnoma sozlamasi saqlandi.', 'success');
      };
    });
    return;
  }

  if (settingsSection === 'security') {
    pane.innerHTML = `
      <div class="card">
        <div class="card-header"><div><h3 class="card-title">Xavfsizlik va parol</h3><p class="card-subtitle">Shaxsiy hisob himoyasini boshqarish</p></div></div>
        <div style="display:flex;flex-direction:column;gap:10px;font-size:13.5px;margin-bottom:18px">
          <div style="display:flex;justify-content:space-between;padding:11px 14px;border-radius:10px;background:var(--surface-soft)"><span style="color:var(--text-muted)">Autentifikatsiya rejimi</span><span class="badge ${isV4SecurityActive() ? 'badge-success' : 'badge-warning'}">${isV4SecurityActive() ? 'Server Session Token' : 'Standart RPC'}</span></div>
          <div style="display:flex;justify-content:space-between;padding:11px 14px;border-radius:10px;background:var(--surface-soft)"><span style="color:var(--text-muted)">Oxirgi kirish</span><b>${me.last_login_at ? formatDateTimeTashkent(me.last_login_at) : '—'}</b></div>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button type="button" class="btn btn-primary" id="set-pw-btn">${icon('key', 15)} Parolni almashtirish</button>
          <button type="button" class="btn btn-danger" id="set-logout-btn">${icon('log-out', 15)} Tizimdan chiqish</button>
        </div>
      </div>
    `;
    $('#set-pw-btn', pane).onclick = () => ctx.openPasswordModal();
    $('#set-logout-btn', pane).onclick = () => ctx.logout();
    return;
  }

  if (settingsSection === 'sessions') {
    pane.innerHTML = `<div class="card"><div class="skeleton" style="height:140px;width:100%"></div></div>`;
    api.fetchMySessions().then(res => {
      if (!res.available) {
        pane.innerHTML = `<div class="card">${emptyStateHtml({ iconName: 'laptop', title: 'Faol sessiyalar ro‘yxati ulanmagan', desc: 'Ushbu bo‘lim V6 SQL migratsiyasi qo‘llangandan so‘ng faol qurilmalaringizni real vaqtda ko‘rsatadi.' })}</div>`;
        return;
      }
      const list = res.rows || [];
      pane.innerHTML = `
        <div class="card">
          <div class="card-header"><div><h3 class="card-title">Faol sessiyalar (${list.length})</h3><p class="card-subtitle">Hisobingizga kirilgan joriy va boshqa qurilmalar</p></div></div>
          ${list.length === 0
            ? emptyStateHtml({ iconName: 'laptop', title: 'Faol sessiyalar topilmadi', desc: 'Hozircha faol sessiya ma’lumoti mavjud emas.' })
            : `<div class="stack-v" style="gap:10px">
                ${list.map(s => `
                  <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px;border-radius:12px;background:var(--surface-soft);border:1px solid ${s.is_current ? 'var(--primary-border)' : 'var(--border)'};flex-wrap:wrap">
                    <div style="display:flex;align-items:center;gap:12px">
                      <div class="kpi-icon ${s.is_current ? 'primary' : ''}">${icon(s.device_type === 'mobile' ? 'smartphone' : 'laptop', 17)}</div>
                      <div>
                        <div style="font-size:13.5px;font-weight:600">${esc(s.browser || 'Brauzer')} · ${esc(s.os || 'OT')} ${s.is_current ? '<span class="badge badge-primary" style="margin-left:6px">Joriy qurilma</span>' : ''}</div>
                        <div style="font-size:12px;color:var(--text-muted)">Oxirgi faoliyat: ${formatDateTimeTashkent(s.last_seen_at)} · Kirgan: ${formatDateTimeTashkent(s.created_at)}</div>
                      </div>
                    </div>
                    ${!s.is_current ? `<button type="button" class="btn btn-danger btn-sm" data-rev-sess="${esc(s.id)}">Tugatish</button>` : ''}
                  </div>
                `).join('')}
              </div>`}
        </div>
      `;
      $$('[data-rev-sess]', pane).forEach(b => {
        b.onclick = async () => {
          b.disabled = true;
          try {
            await api.revokeMySession(b.dataset.revSess);
            toast('Sessiya tugatildi.', 'success');
            renderSettings(el, ctx);
          } catch (err) {
            toast(err.message, 'error');
            b.disabled = false;
          }
        };
      });
    }).catch(err => {
      pane.innerHTML = `<div class="card">${emptyStateHtml({ iconName: 'alert-circle', title: 'Xatolik', desc: err.message })}</div>`;
    });
    return;
  }

  // Account info
  pane.innerHTML = `
    <div class="card">
      <div class="card-header"><div><h3 class="card-title">Hisob ma’lumotlari</h3><p class="card-subtitle">Tizimdagi rasmiy identifikator va lavozim</p></div></div>
      <div style="display:flex;flex-direction:column;gap:10px;font-size:13.5px">
        <div style="display:flex;justify-content:space-between;padding:11px 14px;border-radius:10px;background:var(--surface-soft)"><span style="color:var(--text-muted)">Foydalanuvchi ID</span><code>#${me.id}</code></div>
        <div style="display:flex;justify-content:space-between;padding:11px 14px;border-radius:10px;background:var(--surface-soft)"><span style="color:var(--text-muted)">F.I.Sh.</span><b>${esc(me.name)}</b></div>
        <div style="display:flex;justify-content:space-between;padding:11px 14px;border-radius:10px;background:var(--surface-soft)"><span style="color:var(--text-muted)">Login</span><code>${esc(me.login)}</code></div>
        <div style="display:flex;justify-content:space-between;padding:11px 14px;border-radius:10px;background:var(--surface-soft)"><span style="color:var(--text-muted)">Fan / Lavozim</span><b>${esc(me.subject || '—')}</b></div>
        <div style="display:flex;justify-content:space-between;padding:11px 14px;border-radius:10px;background:var(--surface-soft)"><span style="color:var(--text-muted)">Rol</span><b>${esc(ROLE[me.role] || me.role)}</b></div>
      </div>
    </div>
  `;
}
