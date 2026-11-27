// Admin Panel (Add/Edit Users, Bulk Excel/CSV Import, Roles, Password Reset), Reports & Settings
import { ROLE, IMAP, getRanking, makeLogin, tempPw } from '../config.js';
import { api } from '../api.js';
import { icon } from '../icons.js';
import {
  $,
  $$,
  esc,
  csvCell,
  toast,
  openModal,
  closeModal,
  confirmDialog,
  avatarHtml,
  emptyStateHtml,
  getThemePref,
  applyTheme
} from '../ui.js';
import { exportRankingCSV } from './ranking.js';

let adminState = { tab: 'users', search: '', roleFilter: 'all' };

function downloadCredsCSV(list) {
  const rows = list.map(c => [c.login, c.pw, c.name, c.subject || ''].map(csvCell).join(';'));
  const b = new Blob(['\ufeffLogin;Vaqtinchalik Parol;F.I.Sh.;Fan\n' + rows.join('\n')], {
    type: 'text/csv;charset=utf-8'
  });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(b);
  a.download = 'pedagoglar_parollari.csv';
  a.click();
  toast('Parollar ro‘yxati CSV faylda yuklab olindi.', 'success');
}

function renderCredBanner(list) {
  if (!list || !list.length) return '';
  return `
    <div class="card" style="border-color:var(--success-border);background:var(--success-soft)">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:12px">
        <div style="display:flex;align-items:center;gap:10px">
          <div class="kpi-icon success">${icon('check-circle', 18)}</div>
          <div>
            <h3 class="card-title">${list.length} ta pedagog uchun login va parol yaratildi</h3>
            <p class="card-subtitle" style="color:var(--text-2)">Ushbu ma’lumotlarni yuklab oling. Pedagoglar birinchi kirishda parolni yangilaydilar.</p>
          </div>
        </div>
        <button type="button" class="btn btn-primary" id="dl-creds-btn">${icon('download', 15)} Parollarni CSV yuklab olish</button>
      </div>

      <div class="table-wrap" style="max-height:220px;overflow-y:auto">
        <table class="data-table">
          <thead><tr><th>Login</th><th>Vaqtinchalik parol</th><th>F.I.Sh.</th><th>Sinf / Fan</th></tr></thead>
          <tbody>
            ${list.map(c => `
              <tr>
                <td><b>${esc(c.login)}</b></td>
                <td><code>${esc(c.pw)}</code></td>
                <td>${esc(c.name)}</td>
                <td>${esc(c.subject || '—')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

/* ==========================================================================
   ADMINISTRATOR PANELI (Director & IT Admin)
   ========================================================================== */
export function renderAdmin(el, ctx) {
  const { me, users, lastCreds, setLastCreds } = ctx;
  const q = adminState.search.trim().toLowerCase();

  const filteredUsers = users.filter(u => {
    if (adminState.roleFilter !== 'all' && u.role !== adminState.roleFilter) return false;
    if (q) {
      const hay = `${u.login} ${u.name} ${u.subject || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  el.innerHTML = `
    <div class="stack-v">
      <div class="page-header">
        <div>
          <h1 class="page-title">Administrator paneli</h1>
          <p class="page-desc">Jami ${users.length} nafar xodim va pedagog · Barcha ma’lumotlar markaziy bazada saqlanadi.</p>
        </div>
      </div>

      <div id="cred-zone">${renderCredBanner(lastCreds)}</div>

      <div class="tabs-pill">
        <button type="button" class="tab-btn ${adminState.tab === 'users' ? 'active' : ''}" data-atab="users">
          ${icon('users', 15)} Xodimlar ro‘yxati <span class="tab-count">${users.length}</span>
        </button>
        <button type="button" class="tab-btn ${adminState.tab === 'add' ? 'active' : ''}" data-atab="add">
          ${icon('user-plus', 15)} Bitta pedagog qo‘shish
        </button>
        <button type="button" class="tab-btn ${adminState.tab === 'import' ? 'active' : ''}" data-atab="import">
          ${icon('file-spreadsheet', 15)} Ommaviy yuklash (Excel / CSV)
        </button>
      </div>

      <div id="admin-tab-body"></div>
    </div>
  `;

  const dlBtn = $('#dl-creds-btn');
  if (dlBtn) dlBtn.onclick = () => downloadCredsCSV(lastCreds);

  $$('[data-atab]').forEach(btn => {
    btn.onclick = () => { adminState.tab = btn.dataset.atab; renderAdmin(el, ctx); };
  });

  const body = $('#admin-tab-body');

  if (adminState.tab === 'users') {
    body.innerHTML = `
      <div class="card">
        <div class="filter-bar">
          <div class="filter-controls">
            <div class="input-icon-wrap" style="min-width:220px;max-width:320px;flex:1">
              <span class="input-leading">${icon('search', 15)}</span>
              <input id="adm-search" class="input has-leading" type="search" value="${esc(adminState.search)}" placeholder="F.I.Sh., login yoki fan…">
            </div>
            <select id="adm-role-filter" class="input" style="width:auto;min-width:170px">
              <option value="all" ${adminState.roleFilter === 'all' ? 'selected' : ''}>Barcha rollar</option>
              ${Object.entries(ROLE).map(([k, v]) => `<option value="${k}" ${adminState.roleFilter === k ? 'selected' : ''}>${esc(v)}</option>`).join('')}
            </select>
          </div>
          <span style="font-size:13px;color:var(--text-muted)">${filteredUsers.length} ta yozuv</span>
        </div>

        ${filteredUsers.length === 0
          ? emptyStateHtml({ iconName: 'users', title: 'Foydalanuvchi topilmadi', desc: 'Qidiruv yoki rol filtrini o‘zgartirib ko‘ring.' })
          : `
            <div class="table-wrap desktop-table-only">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Xodim</th>
                    <th>Login</th>
                    <th>Sinf / Fan / Lavozim</th>
                    <th>Rol</th>
                    <th>Reytingda</th>
                    <th>Holat</th>
                    <th style="text-align:right">Amallar</th>
                  </tr>
                </thead>
                <tbody>
                  ${filteredUsers.map(u => `
                    <tr style="${u.active ? '' : 'opacity:0.55'}">
                      <td>
                        <div style="display:flex;align-items:center;gap:10px">
                          ${avatarHtml(u.name, 'sm')}
                          <span style="font-weight:600">${esc(u.name)}</span>
                        </div>
                      </td>
                      <td><code>${esc(u.login)}</code></td>
                      <td style="color:var(--text-2)">${esc(u.subject || '—')}</td>
                      <td>
                        <select class="input" style="min-height:32px;padding:4px 8px;font-size:12.5px;width:auto" data-u-role="${u.id}" ${u.id === me.id ? 'disabled' : ''}>
                          ${Object.entries(ROLE).map(([r, l]) => `<option value="${r}" ${u.role === r ? 'selected' : ''}>${esc(l)}</option>`).join('')}
                        </select>
                      </td>
                      <td>
                        <input type="checkbox" class="checkbox" data-u-ranked="${u.id}" ${u.ranked ? 'checked' : ''} aria-label="Reytingda qatnashadi">
                      </td>
                      <td>
                        <span class="badge ${u.active ? 'badge-success' : 'badge-neutral'}">${u.active ? 'Faol' : 'O‘chirilgan'}</span>
                      </td>
                      <td style="text-align:right">
                        <div style="display:inline-flex;gap:6px">
                          <button type="button" class="btn btn-secondary btn-sm" data-u-edit="${u.id}" title="Tahrirlash">${icon('edit-3', 14)}</button>
                          <button type="button" class="btn btn-secondary btn-sm" data-u-reset="${u.id}" title="Parolni tiklash">${icon('key', 14)}</button>
                          ${u.id !== me.id ? `<button type="button" class="btn btn-danger btn-sm" data-u-toggle="${u.id}">${u.active ? 'O‘chirish' : 'Yoqish'}</button>` : ''}
                        </div>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>

            <div class="mobile-card-list">
              ${filteredUsers.map(u => `
                <div class="card card-compact" style="box-shadow:none;${u.active ? '' : 'opacity:0.6'}">
                  <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:8px">
                    <div style="display:flex;align-items:center;gap:10px;min-width:0">
                      ${avatarHtml(u.name, 'sm')}
                      <div style="min-width:0">
                        <div style="font-weight:600;font-size:14px">${esc(u.name)}</div>
                        <div style="font-size:12px;color:var(--text-muted)"><code>${esc(u.login)}</code> · ${esc(ROLE[u.role] || u.role)}</div>
                      </div>
                    </div>
                    <span class="badge ${u.active ? 'badge-success' : 'badge-neutral'}">${u.active ? 'Faol' : 'Nofaol'}</span>
                  </div>
                  <div style="font-size:12.5px;color:var(--text-2);margin-bottom:10px">${esc(u.subject || '—')}</div>
                  <div style="display:flex;gap:8px;flex-wrap:wrap">
                    <button type="button" class="btn btn-secondary btn-sm" style="flex:1" data-u-edit="${u.id}">${icon('edit-3', 14)} Tahrirlash</button>
                    <button type="button" class="btn btn-secondary btn-sm" style="flex:1" data-u-reset="${u.id}">${icon('key', 14)} Parol</button>
                    ${u.id !== me.id ? `<button type="button" class="btn btn-danger btn-sm" data-u-toggle="${u.id}">${u.active ? 'O‘chirish' : 'Yoqish'}</button>` : ''}
                  </div>
                </div>
              `).join('')}
            </div>
          `}
      </div>
    `;

    const sInp = $('#adm-search');
    sInp.oninput = () => {
      const pos = sInp.selectionStart;
      adminState.search = sInp.value;
      renderAdmin(el, ctx);
      const ni = $('#adm-search');
      if (ni) { ni.focus(); ni.setSelectionRange(pos, pos); }
    };
    $('#adm-role-filter').onchange = e => { adminState.roleFilter = e.target.value; renderAdmin(el, ctx); };

    $$('[data-u-role]').forEach(sel => {
      sel.onchange = async () => {
        const uid = Number(sel.dataset.uRole);
        try {
          await api.updateUser(uid, { role: sel.value });
          toast('Foydalanuvchi roli yangilandi.', 'success');
          await ctx.refresh();
        } catch (err) {
          toast('Xatolik: ' + err.message, 'error');
        }
      };
    });

    $$('[data-u-ranked]').forEach(chk => {
      chk.onchange = async () => {
        const uid = Number(chk.dataset.uRanked);
        try {
          await api.updateUser(uid, { ranked: chk.checked ? 1 : 0 });
          toast('Reyting holati saqlandi.', 'success');
          await ctx.refresh();
        } catch (err) {
          toast('Xatolik: ' + err.message, 'error');
        }
      };
    });

    $$('[data-u-edit]').forEach(btn => {
      btn.onclick = () => {
        const u = users.find(x => x.id === Number(btn.dataset.uEdit));
        if (!u) return;
        openModal({
          title: 'Foydalanuvchini tahrirlash',
          bodyHtml: `
            <div class="stack-v" style="gap:14px">
              <div class="field">
                <label for="eu-name">F.I.Sh.</label>
                <input id="eu-name" class="input" value="${esc(u.name)}" required>
              </div>
              <div class="field">
                <label for="eu-subj">Sinf / Fan / Lavozim</label>
                <input id="eu-subj" class="input" value="${esc(u.subject || '')}" placeholder="Masalan: 10-A sinf | Matematika">
              </div>
              <div class="field">
                <label for="eu-role">Rol</label>
                <select id="eu-role" class="input" ${u.id === me.id ? 'disabled' : ''}>
                  ${Object.entries(ROLE).map(([r, l]) => `<option value="${r}" ${u.role === r ? 'selected' : ''}>${esc(l)}</option>`).join('')}
                </select>
              </div>
              <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
                <input id="eu-ranked" type="checkbox" class="checkbox" ${u.ranked ? 'checked' : ''}>
                <span>Reyting jadvalida ishtirok etadi</span>
              </label>
            </div>
          `,
          footerHtml: `
            <button type="button" class="btn btn-secondary" id="eu-cancel">Bekor qilish</button>
            <button type="button" class="btn btn-primary" id="eu-save">Saqlash</button>
          `,
          onMount: panel => {
            panel.querySelector('#eu-cancel').onclick = closeModal;
            panel.querySelector('#eu-save').onclick = async () => {
              const name = panel.querySelector('#eu-name').value.trim();
              const subject = panel.querySelector('#eu-subj').value.trim();
              const role = panel.querySelector('#eu-role').value;
              const ranked = panel.querySelector('#eu-ranked').checked ? 1 : 0;
              if (!name) return toast('F.I.Sh. bo‘sh bo‘lmasligi kerak.', 'warning');
              try {
                await api.updateUser(u.id, { name, subject, role, ranked });
                closeModal();
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

    $$('[data-u-reset]').forEach(btn => {
      btn.onclick = async () => {
        const u = users.find(x => x.id === Number(btn.dataset.uReset));
        if (!u) return;
        const ok = await confirmDialog({
          title: 'Parolni tiklash',
          message: `${u.name} (${u.login}) uchun yangi vaqtinchalik parol yaratilsinmi?`,
          confirmText: 'Tiklash'
        });
        if (!ok) return;
        const np = tempPw();
        try {
          await api.updateUser(u.id, { pw: np, must_change: 1 });
          openModal({
            title: 'Yangi vaqtinchalik parol yaratildi',
            bodyHtml: `
              <div class="stack-v" style="gap:12px">
                <p style="margin:0;color:var(--text-2)">Ushbu ma’lumotlarni pedagogga taqdim eting. Birinchi kirishda parol almashtirilishi shart bo‘ladi.</p>
                <div style="padding:14px;border-radius:10px;background:var(--bg-subtle);border:1px solid var(--border);display:flex;flex-direction:column;gap:8px">
                  <div><b>F.I.Sh.:</b> ${esc(u.name)}</div>
                  <div><b>Login:</b> <code>${esc(u.login)}</code></div>
                  <div><b>Vaqtinchalik parol:</b> <code id="new-pw-val" style="font-size:14px;font-weight:700">${esc(np)}</code></div>
                </div>
              </div>
            `,
            footerHtml: `
              <button type="button" class="btn btn-secondary" id="copy-pw-btn">${icon('copy', 15)} Nusxa olish</button>
              <button type="button" class="btn btn-primary" id="close-pw-m">Yopish</button>
            `,
            onMount: panel => {
              panel.querySelector('#close-pw-m').onclick = closeModal;
              panel.querySelector('#copy-pw-btn').onclick = () => {
                navigator.clipboard?.writeText(`Login: ${u.login}\nParol: ${np}`);
                toast('Login va parol nusxalandi.', 'success');
              };
            }
          });
          await ctx.refresh();
        } catch (err) {
          toast('Xatolik: ' + err.message, 'error');
        }
      };
    });

    $$('[data-u-toggle]').forEach(btn => {
      btn.onclick = async () => {
        const u = users.find(x => x.id === Number(btn.dataset.uToggle));
        if (!u) return;
        const newActive = u.active ? 0 : 1;
        const ok = await confirmDialog({
          title: newActive ? 'Hisobni faollashtirish' : 'Hisobni o‘chirish',
          message: `${u.name} hisobini ${newActive ? 'faollashtirish' : 'vaqtincha o‘chirish'}ni tasdiqlaysizmi?`,
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
  } else if (adminState.tab === 'add') {
    body.innerHTML = `
      <div class="card" style="max-width:680px">
        <div class="card-header">
          <div>
            <h3 class="card-title">Bitta pedagog yoki xodim qo‘shish</h3>
            <p class="card-subtitle">Vaqtinchalik parol avtomatik generatsiya qilinadi</p>
          </div>
        </div>
        <form id="nf" class="stack-v" style="gap:14px">
          <div class="field">
            <label for="nn">F.I.Sh. (To‘liq)</label>
            <input id="nn" class="input" placeholder="Masalan: Karimov Anvar Jo‘rayevich" required>
          </div>
          <div class="grid-2">
            <div class="field">
              <label for="nc">Sinfi (ixtiyoriy)</label>
              <input id="nc" class="input" placeholder="Masalan: 10-A sinf">
            </div>
            <div class="field">
              <label for="ns">Fani / Lavozimi</label>
              <input id="ns" class="input" placeholder="Masalan: Matematika">
            </div>
          </div>
          <div class="grid-2">
            <div class="field">
              <label for="nl">Login (bo‘sh qolsa avtomatik)</label>
              <input id="nl" class="input" placeholder="Masalan: a.karimov">
            </div>
            <div class="field">
              <label for="nr">Rol</label>
              <select id="nr" class="input">
                ${Object.entries(ROLE).map(([r, l]) => `<option value="${r}" ${r === 'teacher' ? 'selected' : ''}>${esc(l)}</option>`).join('')}
              </select>
            </div>
          </div>
          <div>
            <button class="btn btn-primary" type="submit" id="add-one-btn">${icon('user-plus', 15)} Qo‘shish va parol yaratish</button>
          </div>
        </form>
      </div>
    `;

    $('#nf').onsubmit = async e => {
      e.preventDefault();
      const name = $('#nn').value.trim();
      if (!name) return;
      const sinf = $('#nc').value.trim();
      const fan = $('#ns').value.trim();
      const subjectDesc = [sinf, fan].filter(Boolean).join(' | ');
      const login = $('#nl').value.trim().toLowerCase() || makeLogin(name, null, users);
      const role = $('#nr').value;
      const pw = tempPw();
      const u = {
        login,
        name,
        subject: subjectDesc,
        role,
        ranked: role === 'teacher' ? 1 : 0,
        pw,
        active: 1,
        must_change: 1
      };
      const btn = $('#add-one-btn');
      btn.disabled = true;
      btn.textContent = 'Qo‘shilmoqda…';
      try {
        await api.insertUsers([u]);
        setLastCreds([u]);
        toast(`${name} muvaffaqiyatli qo‘shildi.`, 'success');
        adminState.tab = 'users';
        await ctx.refresh();
      } catch (err) {
        toast('Xatolik: ' + err.message, 'error');
        btn.disabled = false;
        btn.innerHTML = `${icon('user-plus', 15)} Qo‘shish va parol yaratish`;
      }
    };
  } else {
    // Bulk import tab
    body.innerHTML = `
      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">Pedagoglarni ommaviy yuklash (Excel / CSV / Matn)</h3>
            <p class="card-subtitle">Fayl brauzer xotirasida o‘qiladi, har bir pedagog uchun avtomatik login va parol yaratiladi.</p>
          </div>
        </div>

        <div class="form-alert info" style="margin-bottom:16px">
          ${icon('file-spreadsheet', 18)}
          <div>
            <b>Kiritish formati (har bir qatorda):</b> <code>F.I.Sh.; Sinf; Fan</code> (yoki <code>F.I.Sh.; Fan</code>)<br>
            <span style="font-size:12px">Misol: <code>Karimov Anvar Jo‘rayevich; 10-A sinf; Matematika</code></span>
          </div>
        </div>

        <div class="dropzone" id="uf-drop" style="margin-bottom:14px">
          <input type="file" id="uf" accept=".xlsx,.csv,.txt" style="display:none">
          <div style="display:flex;flex-direction:column;align-items:center;gap:6px">
            <div class="kpi-icon primary">${icon('upload-cloud', 18)}</div>
            <div id="fn" style="font-size:13.5px;font-weight:500">Excel (.xlsx), CSV yoki TXT faylini tanlang</div>
          </div>
        </div>

        <div class="field">
          <label for="bt">Yoki ro‘yxat matnini joylashtiring</label>
          <textarea id="bt" class="input" rows="6" placeholder="Karimov Anvar Jo‘rayevich; 10-A sinf; Matematika&#10;Rasulova Ziyoda Akramovna; 9-B sinf; Ingliz tili"></textarea>
        </div>

        <div style="margin-top:16px">
          <button type="button" class="btn btn-primary" id="bb">${icon('check-circle', 16)} Bazaga kiritish va parollarni yaratish</button>
        </div>
      </div>
    `;

    const uf = $('#uf');
    $('#uf-drop').onclick = () => uf.click();
    uf.onchange = e => {
      const f = e.target.files[0];
      if (!f) return;
      $('#fn').textContent = `${f.name} (${Math.round(f.size / 1024)} KB)`;
      if (f.name.endsWith('.xlsx')) {
        if (typeof window.XLSX === 'undefined') return toast('Excel kutubxonasi yuklanmoqda, biroz kuting…', 'warning');
        const r = new FileReader();
        r.onload = ev => {
          const wb = window.XLSX.read(ev.target.result, { type: 'binary' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const data = window.XLSX.utils.sheet_to_json(ws, { header: 1 });
          $('#bt').value = data.filter(row => row && row.length).map(row => row.join('; ')).join('\n');
        };
        r.readAsBinaryString(f);
      } else {
        const r = new FileReader();
        r.onload = ev => { $('#bt').value = ev.target.result; };
        r.readAsText(f);
      }
      uf.value = '';
    };

    $('#bb').onclick = async () => {
      const val = $('#bt').value.trim();
      if (!val) return toast('Iltimos, pedagoglar ro‘yxatini kiriting.', 'warning');
      const lines = val.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
      const toInsert = [];
      const credsList = [];
      const existingLogins = new Set(users.map(u => u.login));

      for (const line of lines) {
        const delim = line.includes(';') ? ';' : (line.includes('\t') ? '\t' : ',');
        const parts = line.split(delim).map(p => p.trim());
        if (!parts[0]) continue;
        const name = parts[0];
        const sinf = parts[1] || '';
        const fan = parts[2] || '';
        const subjectDesc = [sinf, fan].filter(Boolean).join(' | ');
        const login = makeLogin(name, existingLogins, users);
        const pw = tempPw();
        const u = {
          login,
          name,
          subject: subjectDesc,
          role: 'teacher',
          ranked: 1,
          pw,
          active: 1,
          must_change: 1
        };
        toInsert.push(u);
        credsList.push(u);
      }

      if (!toInsert.length) return toast('Yaroqli pedagog ma’lumotlari topilmadi.', 'warning');
      const btn = $('#bb');
      btn.disabled = true;
      btn.textContent = `Yuklanmoqda (${toInsert.length} nafar)…`;
      try {
        await api.insertUsers(toInsert);
        setLastCreds(credsList);
        toast(`${toInsert.length} nafar pedagog muvaffaqiyatli qo‘shildi.`, 'success');
        adminState.tab = 'users';
        await ctx.refresh();
      } catch (err) {
        toast('Xatolik: ' + err.message, 'error');
        btn.disabled = false;
        btn.innerHTML = `${icon('check-circle', 16)} Bazaga kiritish va parollarni yaratish`;
      }
    };
  }
}

/* ==========================================================================
   HISOBOTLAR (Reports & Official Exports)
   ========================================================================== */
export function renderReports(el, ctx) {
  const { users, entries } = ctx;
  const ranking = getRanking(users, entries);
  const approvedEntries = entries.filter(e => e.status === 'approved');

  function exportDetailedEntriesCSV() {
    const rows = approvedEntries.map(e => {
      const u = users.find(x => x.id === e.uid);
      const ind = IMAP[e.ind];
      return [e.date, u?.name || '', u?.subject || '', `${e.ind}. ${ind?.name || ''}`, e.type, e.qty, e.pts, e.descr].map(csvCell).join(';');
    });
    const b = new Blob(['\ufeffSana;Pedagog;Fan;Mezon;Turi;Soni;Ball;Tavsif\n' + rows.join('\n')], {
      type: 'text/csv;charset=utf-8'
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(b);
    a.download = 'pedagoglar_yutuqlar_hisoboti.csv';
    a.click();
    toast('Tasdiqlangan yutuqlar hisoboti yuklab olindi.', 'success');
  }

  el.innerHTML = `
    <div class="stack-v">
      <div class="page-header">
        <div>
          <h1 class="page-title">Hisobotlar va eksport</h1>
          <p class="page-desc">26-AF buyruq asosida ustama belgilash va rasmiy A4 portfoliolar.</p>
        </div>
      </div>

      <div class="grid-2">
        <div class="card" style="display:flex;flex-direction:column;justify-content:space-between;gap:16px">
          <div>
            <div class="kpi-icon primary" style="margin-bottom:12px">${icon('file-spreadsheet', 18)}</div>
            <h3 class="card-title">Oylik reyting va ustama hisoboti</h3>
            <p class="card-subtitle" style="margin-top:6px">
              Barcha faol pedagoglarning A, B, C bo‘limlari va umumiy reyting ballari jamlangan rasmiy CSV/Excel jadvali.
            </p>
          </div>
          <div>
            <button type="button" class="btn btn-primary" id="rep-rank-csv">${icon('download', 15)} Reyting jadvalini yuklab olish (CSV)</button>
          </div>
        </div>

        <div class="card" style="display:flex;flex-direction:column;justify-content:space-between;gap:16px">
          <div>
            <div class="kpi-icon success" style="margin-bottom:12px">${icon('file-text', 18)}</div>
            <h3 class="card-title">Tasdiqlangan yutuqlar reestri</h3>
            <p class="card-subtitle" style="margin-top:6px">
              Tasdiqlangan ${approvedEntries.length} ta yutuqning batafsil ro‘yxati, sanalari va ballari kesimida eksport.
            </p>
          </div>
          <div>
            <button type="button" class="btn btn-secondary" id="rep-entries-csv">${icon('download', 15)} Yutuqlar reestrini yuklab olish (CSV)</button>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">Pedagoglarning A4 portfoliolari</h3>
            <p class="card-subtitle">Istalgan pedagogning rasmiy portfoliosini ochish va PDF formatda chop etish</p>
          </div>
        </div>
        ${ranking.length === 0
          ? emptyStateHtml({ iconName: 'file-text', title: 'Ma’lumotlar mavjud emas', desc: 'Reytingda faol pedagoglar bo‘lgach portfoliolar shu yerda ko‘rinadi.' })
          : `
            <div class="table-wrap">
              <table class="data-table">
                <thead>
                  <tr><th>O‘rin</th><th>Pedagog</th><th>Fan / Sinf</th><th>Jami ball</th><th style="text-align:right">Portfolio</th></tr>
                </thead>
                <tbody>
                  ${ranking.map(r => `
                    <tr>
                      <td><b>#${r.rank}</b></td>
                      <td><b>${esc(r.name)}</b></td>
                      <td style="color:var(--text-muted)">${esc(r.subject)}</td>
                      <td><b style="color:var(--primary)">${r.T} ball</b></td>
                      <td style="text-align:right">
                        <button type="button" class="btn btn-secondary btn-sm" data-rep-port="${r.id}">${icon('printer', 14)} A4 Portfolio</button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `}
      </div>
    </div>
  `;

  $('#rep-rank-csv').onclick = () => exportRankingCSV(ranking);
  $('#rep-entries-csv').onclick = exportDetailedEntriesCSV;
  $$('[data-rep-port]').forEach(btn => {
    btn.onclick = () => ctx.openPortfolioPrint(Number(btn.dataset.repPort));
  });
}

/* ==========================================================================
   SOZLAMALAR (Theme, Password, Account Preferences)
   ========================================================================== */
export function renderSettings(el, ctx) {
  const { me } = ctx;
  const pref = getThemePref();

  el.innerHTML = `
    <div class="stack-v" style="max-width:780px">
      <div class="page-header">
        <div>
          <h1 class="page-title">Sozlamalar</h1>
          <p class="page-desc">Interfeys mavzusi, xavfsizlik va shaxsiy hisob parametrlari.</p>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">Ko‘rinish va mavzu</h3>
            <p class="card-subtitle">Yorug‘, qorong‘i yoki tizim sozlamasiga moslashuvchi rejimni tanlang</p>
          </div>
        </div>
        <div class="tabs-pill">
          <button type="button" class="tab-btn ${pref === 'light' ? 'active' : ''}" data-theme-pref="light">${icon('sun', 15)} Yorug‘</button>
          <button type="button" class="tab-btn ${pref === 'dark' ? 'active' : ''}" data-theme-pref="dark">${icon('moon', 15)} Qorong‘i</button>
          <button type="button" class="tab-btn ${pref === 'system' ? 'active' : ''}" data-theme-pref="system">${icon('monitor', 15)} Tizim bo‘yicha</button>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">Xavfsizlik va hisob ma’lumotlari</h3>
            <p class="card-subtitle">Tizimga kirish ma’lumotlari va parol boshqaruvi</p>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:12px;font-size:13.5px;margin-bottom:18px">
          <div style="display:flex;justify-content:space-between;padding:10px 12px;border-radius:8px;background:var(--bg-subtle)">
            <span style="color:var(--text-muted)">F.I.Sh.</span>
            <b>${esc(me.name)}</b>
          </div>
          <div style="display:flex;justify-content:space-between;padding:10px 12px;border-radius:8px;background:var(--bg-subtle)">
            <span style="color:var(--text-muted)">Login</span>
            <code>${esc(me.login)}</code>
          </div>
          <div style="display:flex;justify-content:space-between;padding:10px 12px;border-radius:8px;background:var(--bg-subtle)">
            <span style="color:var(--text-muted)">Rol</span>
            <b>${esc(ROLE[me.role] || me.role)}</b>
          </div>
          <div style="display:flex;justify-content:space-between;padding:10px 12px;border-radius:8px;background:var(--bg-subtle)">
            <span style="color:var(--text-muted)">Fan / Lavozim</span>
            <b>${esc(me.subject || '—')}</b>
          </div>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button type="button" class="btn btn-primary" id="set-pw-btn">${icon('key', 15)} Parolni almashtirish</button>
          <button type="button" class="btn btn-danger" id="set-logout-btn">${icon('log-out', 15)} Tizimdan chiqish</button>
        </div>
      </div>
    </div>
  `;

  $$('[data-theme-pref]').forEach(btn => {
    btn.onclick = () => {
      applyTheme(btn.dataset.themePref);
      toast('Interfeys mavzusi yangilandi.', 'success');
      ctx.navigate('settings');
    };
  });

  $('#set-pw-btn').onclick = () => ctx.openPasswordModal();
  $('#set-logout-btn').onclick = () => ctx.logout();
}
