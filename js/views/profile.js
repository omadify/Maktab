// Teachers Directory & Telegram-Grade Profile System (Cover, Avatar Crop/Preview, 7 Tabs, Media & Docs, Edit Sheet)
import { IND, IMAP, ROLE, SEC, calcScores, getRanking, extractSubjectLabel } from '../config.js';
import { api, validateImageFile } from '../api.js';
import { icon } from '../icons.js';
import {
  $,
  $$,
  esc,
  toast,
  openModal,
  openDetailDrawer,
  closeModal,
  confirmDialog,
  setModalCloseGuard,
  avatarHtml,
  badgeStatus,
  emptyStateHtml,
  formatDateUz,
  formatDateTimeTashkent
} from '../ui.js';
import { scoreRingSvg, syncLiquidPills } from '../motion.js';
import { renderAreaChart, renderBarChart, renderDonutChart } from '../charts.js';

let dirState = { search: '', subject: 'all', view: 'grid' };
let profileTab = 'overview';
let lastProfileUid = null;
let docsSubTab = 'all';
let docsView = 'grid';

export function resetProfileViewState() {
  dirState = { search: '', subject: 'all', view: 'grid' };
  profileTab = 'overview';
  lastProfileUid = null;
  docsSubTab = 'all';
  docsView = 'grid';
}

const COVER_PRESETS = [
  { id: 'ocean-glass', label: 'Moviy shisha' },
  { id: 'emerald-mist', label: 'Zumrad tuman' },
  { id: 'indigo-slate', label: 'Indigo tun' },
  { id: 'warm-sand', label: 'Issiq qum' },
  { id: 'midnight-aurora', label: 'Tungi aurora' }
];

/* ==========================================================================
   TEACHERS DIRECTORY
   ========================================================================== */
export function renderTeachersDirectory(el, ctx) {
  const { users, entries } = ctx;
  const userMap = new Map(users.map(u => [u.id, u]));
  const ranking = getRanking(users, entries);
  const subjects = Array.from(new Set(ranking.map(r => extractSubjectLabel(r.subject)))).sort();

  el.innerHTML = `
    <div class="stack-v">
      <div class="page-header">
        <div>
          <h1 class="page-title">Pedagoglar katalogi</h1>
          <p class="page-desc">Har bir pedagogning profili, ko‘rsatkichlari va rasmiy portfoliosi.</p>
        </div>
        <div class="page-actions">
          <div class="tabs-pill">
            <button type="button" class="tab-btn ${dirState.view === 'grid' ? 'active' : ''}" data-dview="grid">${icon('layout-grid', 14)} Karta</button>
            <button type="button" class="tab-btn ${dirState.view === 'table' ? 'active' : ''}" data-dview="table">${icon('list', 14)} Jadval</button>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="filter-bar">
          <div class="filter-controls">
            <div class="input-icon-wrap" style="min-width:220px;flex:1;max-width:340px">
              <span class="input-leading">${icon('search', 15)}</span>
              <input id="dir-search" class="input has-leading" type="search" value="${esc(dirState.search)}" placeholder="Pedagog ismi yoki fani…">
            </div>
            <select id="dir-subj" class="input" style="width:auto;min-width:170px">
              <option value="all" ${dirState.subject === 'all' ? 'selected' : ''}>Barcha fanlar</option>
              ${subjects.map(s => `<option value="${esc(s)}" ${dirState.subject === s ? 'selected' : ''}>${esc(s)}</option>`).join('')}
            </select>
          </div>
          <span id="dir-count" style="font-size:13px;color:var(--text-muted)"></span>
        </div>

        <div id="dir-zone"></div>
      </div>
    </div>
  `;

  function renderZone() {
    const q = dirState.search.trim().toLowerCase();
    const filtered = ranking.filter(r => {
      const ms = !q || r.name.toLowerCase().includes(q) || r.subject.toLowerCase().includes(q);
      const msub = dirState.subject === 'all' || extractSubjectLabel(r.subject) === dirState.subject;
      return ms && msub;
    });
    $('#dir-count').textContent = `${filtered.length} nafar pedagog`;
    const zone = $('#dir-zone');

    if (filtered.length === 0) {
      zone.innerHTML = emptyStateHtml({ iconName: 'users', title: 'Pedagog topilmadi', desc: 'Qidiruv yoki fan filtrini o‘zgartirib ko‘ring.' });
      return;
    }

    if (dirState.view === 'table') {
      zone.innerHTML = `
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th>O‘rin</th><th>Pedagog</th><th>Fan / Sinf</th><th>A / B / C</th><th>Jami</th><th style="text-align:right">Amal</th></tr></thead>
            <tbody>
              ${filtered.map(r => {
                const u = userMap.get(r.id);
                return `
                  <tr>
                    <td><span class="rank-badge ${r.rank <= 3 ? `r${r.rank}` : 'rn'}">#${r.rank}</span></td>
                    <td><div style="display:flex;align-items:center;gap:10px">${avatarHtml(r.name, 'sm', u?.avatar_url)}<b>${esc(r.name)}</b></div></td>
                    <td style="color:var(--text-2)">${esc(r.subject)}</td>
                    <td style="color:var(--text-muted)">${r.A} · ${r.B} · ${r.C}</td>
                    <td><b style="color:var(--primary)">${r.T} ball</b></td>
                    <td style="text-align:right"><button type="button" class="btn btn-secondary btn-sm" data-dir-prof="${r.id}">Profil</button></td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;
    } else {
      zone.innerHTML = `
        <div class="grid-3">
          ${filtered.map(r => {
            const u = userMap.get(r.id);
            return `
              <div class="card card-compact card-interactive" data-dir-prof="${r.id}" style="box-shadow:none;display:flex;flex-direction:column;gap:12px">
                <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
                  <span class="rank-badge ${r.rank <= 3 ? `r${r.rank}` : 'rn'}">#${r.rank}</span>
                  <span style="font-size:15.5px;font-weight:700;color:var(--primary);font-variant-numeric:tabular-nums">${r.T} ball</span>
                </div>
                <div style="display:flex;align-items:center;gap:12px">
                  ${avatarHtml(r.name, '', u?.avatar_url)}
                  <div style="min-width:0">
                    <div style="font-weight:600;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(r.name)}</div>
                    <div style="font-size:12px;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(r.subject)}</div>
                    ${u?.bio ? `<div style="font-size:11.5px;color:var(--text-subtle);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px">${esc(u.bio)}</div>` : ''}
                  </div>
                </div>
                <div class="progress-stack">
                  <i class="seg-a" style="width:${(r.A / 130) * 100}%"></i>
                  <i class="seg-b" style="width:${(r.B / 130) * 100}%"></i>
                  <i class="seg-c" style="width:${(r.C / 130) * 100}%"></i>
                </div>
                <div style="display:flex;justify-content:space-between;font-size:11.5px;color:var(--text-muted)">
                  <span>A:${r.A} · B:${r.B} · C:${r.C}</span>
                  <span>${r.approvedCount} ta yutuq</span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }

    $$('[data-dir-prof]', zone).forEach(card => { card.onclick = () => ctx.openProfile(Number(card.dataset.dirProf)); });
  }

  $('#dir-search').oninput = e => { dirState.search = e.target.value; renderZone(); };
  $('#dir-subj').onchange = e => { dirState.subject = e.target.value; renderZone(); };
  $$('[data-dview]').forEach(btn => {
    btn.onclick = () => {
      dirState.view = btn.dataset.dview;
      $$('[data-dview]').forEach(b => b.classList.toggle('active', b.dataset.dview === dirState.view));
      syncLiquidPills(el);
      renderZone();
    };
  });

  syncLiquidPills(el);
  renderZone();
}

/* ==========================================================================
   TELEGRAM-INSPIRED PROFILE PAGE
   ========================================================================== */
export function renderProfile(el, ctx) {
  const { me, users, entries } = ctx;
  const targetUid = ctx.params?.uid || me.id;
  if (lastProfileUid !== targetUid) {
    profileTab = 'overview';
    lastProfileUid = targetUid;
  }

  const user = users.find(u => u.id === targetUid) || me;
  const isOwn = user.id === me.id;
  const isTeacherAccount = user.role === 'teacher';
  const isStaff = ['director', 'reviewer', 'it_admin'].includes(me.role);
  const canViewPrivate = isOwn || me.role === 'director' || me.role === 'reviewer';
  const canViewContacts = isOwn || me.role === 'director' || Boolean(user.contact_public);

  const allUserEntries = isTeacherAccount ? entries.filter(e => e.uid === user.id) : [];
  const visibleEntries = canViewPrivate ? allUserEntries : allUserEntries.filter(e => e.status === 'approved');
  const approvedEntries = allUserEntries.filter(e => e.status === 'approved');
  const k = calcScores(allUserEntries);
  const ranking = getRanking(users, entries);
  const rank = isTeacherAccount ? ranking.find(r => r.id === user.id) : null;

  const coverStyle = user.cover_style || 'ocean-glass';
  const coverInline = coverStyle === 'custom' && user.cover_url
    ? `background-image:url('${esc(user.cover_url)}')`
    : '';

  const tabs = isTeacherAccount
    ? [
        { id: 'overview', label: 'Umumiy ma’lumot', icon: 'layers' },
        { id: 'achievements', label: 'Mening yutuqlarim', icon: 'award', count: visibleEntries.length },
        { id: 'stats', label: 'Reyting va statistika', icon: 'bar-chart-3' },
        { id: 'portfolio', label: 'Portfolio', icon: 'printer' },
        { id: 'documents', label: 'Hujjatlar', icon: 'folder', count: visibleEntries.filter(e => e.fpath).length }
      ]
    : [
        { id: 'overview', label: 'Umumiy ma’lumot', icon: 'layers' }
      ];
  if (isOwn) {
    tabs.push({ id: 'activity', label: 'Faollik', icon: 'clock' });
    tabs.push({ id: 'settings', label: 'Sozlamalar', icon: 'settings' });
  }
  if (!tabs.some(t => t.id === profileTab)) profileTab = 'overview';

  el.innerHTML = `
    <div class="stack-v">
      <div class="page-header noprint" style="margin-bottom:4px">
        <button type="button" class="btn btn-secondary btn-sm" id="prof-back-btn">${icon('chevron-left', 15)} Orqaga</button>
        <div class="page-actions">
          ${isOwn ? `<button type="button" class="btn btn-secondary" id="prof-edit-btn">${icon('edit-3', 15)} Profilni tahrirlash</button>` : ''}
          ${isTeacherAccount ? `<button type="button" class="btn btn-primary" id="prof-print-btn">${icon('printer', 15)} A4 Chop etish</button>` : ''}
        </div>
      </div>

      <!-- Telegram-Inspired Profile Cover & Identity Hero -->
      <section class="profile-hero-card noprint">
        <div class="profile-cover cover-${esc(coverStyle)}" style="${coverInline}">
          <div class="profile-cover-actions">
            ${isOwn ? `<button type="button" class="btn btn-glass btn-sm" id="prof-cover-btn">${icon('image', 14)} Muqovani o‘zgartirish</button>` : ''}
          </div>
        </div>

        <div class="profile-identity-bar">
          <div class="profile-identity-left">
            <div class="profile-avatar-float">
              <button type="button" class="profile-avatar-btn" id="prof-avatar-preview-btn" aria-label="Profil rasmini kattalashtirish">
                ${avatarHtml(user.name, 'hero', user.avatar_url)}
              </button>
              ${isOwn ? `
                <button type="button" class="profile-avatar-cam" id="prof-avatar-edit-btn" title="Rasmni yangilash" aria-label="Profil rasmini yangilash">
                  ${icon('camera', 14)}
                </button>
              ` : ''}
            </div>

            <div class="profile-identity-meta">
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                <h1 style="font-size:22px;font-weight:700;letter-spacing:-0.025em">${esc(user.name)}</h1>
                <span class="badge badge-neutral">${esc(ROLE[user.role] || user.role)}</span>
                <span class="badge ${user.active ? 'badge-success' : 'badge-neutral'}">${user.active ? 'Faol' : 'Nofaol'}</span>
                ${rank ? `<span class="badge badge-primary">#${rank.rank}-o‘rin (${ranking.length} tadan)</span>` : ''}
              </div>
              <div style="font-size:13.5px;color:var(--text-2);margin-top:4px;font-weight:500">${esc(user.subject || 'Mutaxassislik belgilanmagan')}</div>
              ${user.bio ? `<p style="margin:6px 0 0;font-size:13px;color:var(--text-muted);max-width:620px;line-height:1.5">${esc(user.bio)}</p>` : ''}

              <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-top:8px;font-size:12.5px;color:var(--text-muted)">
                ${canViewContacts && user.phone ? `<span style="display:inline-flex;align-items:center;gap:5px">${icon('phone', 13)} ${esc(user.phone)}</span>` : ''}
                ${canViewContacts && user.telegram_handle ? `<span style="display:inline-flex;align-items:center;gap:5px">${icon('at-sign', 13)} ${esc(user.telegram_handle)}</span>` : ''}
                ${!canViewPrivate ? `<span style="display:inline-flex;align-items:center;gap:4px;color:var(--text-subtle)">${icon('shield', 12)} Faqat tasdiqlangan ommaviy natijalar</span>` : ''}
              </div>
            </div>
          </div>

          ${isTeacherAccount ? `
            <div class="profile-score-box">
              <div style="display:flex;align-items:baseline;justify-content:space-between;gap:12px">
                <span style="font-size:12px;color:var(--text-muted);font-weight:500">Rasmiy ball</span>
                <span style="font-size:28px;font-weight:800;color:var(--primary);line-height:1.05;font-variant-numeric:tabular-nums">
                  ${k.T} <small style="font-size:12.5px;font-weight:500;color:var(--text-muted)">/ 130</small>
                </span>
              </div>
              <div class="progress-stack" style="margin-top:9px">
                <i class="seg-a" style="width:${(k.A / 130) * 100}%"></i>
                <i class="seg-b" style="width:${(k.B / 130) * 100}%"></i>
                <i class="seg-c" style="width:${(k.C / 130) * 100}%"></i>
              </div>
              <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-muted);margin-top:6px">
                <span>A: <b>${k.A}</b>/50</span><span>B: <b>${k.B}</b>/30</span><span>C: <b>${k.C}</b>/50</span>
              </div>
            </div>
          ` : `
            <div class="profile-score-box">
              <div style="font-size:12px;color:var(--text-muted);font-weight:600">Maqom</div>
              <div style="font-size:15px;font-weight:700;color:var(--text);margin-top:4px">${esc(ROLE[user.role] || user.role)}</div>
              <div style="font-size:12px;color:var(--text-muted);margin-top:4px">Reytingda qatnashmaydi</div>
            </div>
          `}
        </div>

        <div class="profile-tabs-strip">
          <div class="tabs-pill" role="tablist">
            ${tabs.map(t => `
              <button type="button" class="tab-btn ${profileTab === t.id ? 'active' : ''}" data-ptab="${t.id}" role="tab">
                ${icon(t.icon, 14)} ${esc(t.label)}
                ${t.count !== undefined ? `<span class="tab-count">${t.count}</span>` : ''}
              </button>
            `).join('')}
          </div>
        </div>
      </section>

      <div id="prof-tab-body"></div>
    </div>
  `;

  $('#prof-back-btn').onclick = () => ctx.navigate(isStaff ? 'teachers' : 'ranking');
  const printBtn = $('#prof-print-btn');
  if (printBtn) printBtn.onclick = () => ctx.openPortfolioPrint(user.id);
  const editBtn = $('#prof-edit-btn');
  if (editBtn) editBtn.onclick = () => openEditProfileSheet(user, ctx, () => renderProfile(el, ctx));
  const coverBtn = $('#prof-cover-btn');
  if (coverBtn) coverBtn.onclick = () => openEditProfileSheet(user, ctx, () => renderProfile(el, ctx), 'cover');
  const avEditBtn = $('#prof-avatar-edit-btn');
  if (avEditBtn) avEditBtn.onclick = () => openAvatarCropperModal(user, ctx, () => renderProfile(el, ctx));
  $('#prof-avatar-preview-btn').onclick = () => openAvatarLightbox(user, isOwn, () => openAvatarCropperModal(user, ctx, () => renderProfile(el, ctx)));

  $$('[data-ptab]').forEach(btn => {
    btn.onclick = () => {
      profileTab = btn.dataset.ptab;
      renderProfile(el, ctx);
    };
  });

  syncLiquidPills(el);

  const body = $('#prof-tab-body');
  if (profileTab === 'overview') {
    if (isTeacherAccount) renderProfileOverview(body, k, approvedEntries, canViewPrivate);
    else renderStaffOverview(body, user);
  }
  else if (profileTab === 'achievements') renderProfileAchievements(body, ctx, visibleEntries, canViewPrivate, isOwn);
  else if (profileTab === 'stats') renderProfileStats(body, k, approvedEntries);
  else if (profileTab === 'portfolio') body.innerHTML = buildPortfolioSheetHtml(user, approvedEntries, k, rank);
  else if (profileTab === 'documents') renderProfileDocuments(body, visibleEntries, canViewPrivate);
  else if (profileTab === 'activity') renderProfileActivity(body, ctx);
  else if (profileTab === 'settings') renderProfileSettingsShortcut(body, user, ctx, () => renderProfile(el, ctx));
}

function renderStaffOverview(body, user) {
  const assigned = user.role === 'reviewer' ? IND.filter(i => i.resp.includes(user.name)) : [];
  body.innerHTML = `
    <div class="card">
      <div class="card-header">
        <div>
          <h3 class="card-title">${user.role === 'reviewer' ? 'Mas’ul baholovchi vakolatlari' : 'Rahbariyat / Texnik ma’lumot'}</h3>
          <p class="card-subtitle">Ushbu hisob reyting jadvaliga kiritilmaydi va unga ball hisoblanmaydi.</p>
        </div>
      </div>
      ${user.role === 'reviewer' ? `
        <div class="grid-2">
          ${assigned.map(i => `
            <div style="padding:12px 14px;border-radius:12px;background:var(--surface-soft);border:1px solid var(--border)">
              <span class="badge badge-primary">${i.sec}-${i.id}</span>
              <div style="font-size:14px;font-weight:600;margin-top:6px">${esc(i.name)}</div>
              <div style="font-size:12px;color:var(--text-muted);margin-top:3px">Tasdiqlovchi hujjat: ${esc(i.doc)}</div>
            </div>
          `).join('')}
        </div>
      ` : `<p style="margin:0;font-size:13.5px;color:var(--text-2)">Tizim boshqaruvi va nazorati uchun xizmat akkaunti.</p>`}
    </div>
  `;
}

function openAvatarLightbox(user, isOwn, onEdit) {
  openModal({
    title: user.name,
    subtitle: user.subject || ROLE[user.role],
    bodyHtml: `
      <div style="display:flex;flex-direction:column;align-items:center;gap:16px;padding:12px 0">
        ${user.avatar_url
          ? `<img src="${esc(user.avatar_url)}" alt="${esc(user.name)}" style="width:240px;height:240px;border-radius:50%;object-fit:cover;border:3px solid var(--border);box-shadow:var(--shadow-lg)">`
          : `<div style="transform:scale(1.6);margin:24px 0">${avatarHtml(user.name, 'hero')}</div>`}
      </div>
    `,
    footerHtml: `
      ${isOwn ? `<button type="button" class="btn btn-primary" id="lb-change-av">${icon('camera', 15)} Rasmni o‘zgartirish</button>` : ''}
      <button type="button" class="btn btn-secondary" id="lb-close">Yopish</button>
    `,
    onMount: panel => {
      panel.querySelector('#lb-close').onclick = () => closeModal(true);
      const ed = panel.querySelector('#lb-change-av');
      if (ed) ed.onclick = () => { closeModal(true); onEdit(); };
    }
  });
}

function openAvatarCropperModal(user, ctx, onSaved) {
  let img = null;
  let zoom = 1;
  let offX = 0;
  let offY = 0;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  openModal({
    title: 'Profil rasmini sozlash',
    subtitle: 'Rasmni yuklang, joylashuvini suring va kattalashtiring',
    bodyHtml: `
      <div class="stack-v" style="gap:16px;align-items:center">
        <div style="position:relative;width:240px;height:240px;border-radius:50%;overflow:hidden;border:2px solid var(--primary-border);background:var(--surface-soft);cursor:grab;touch-action:none" id="av-crop-stage">
          <canvas id="av-crop-canvas" width="240" height="240"></canvas>
          <div id="av-crop-placeholder" style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;color:var(--text-muted);font-size:12.5px;text-align:center;padding:16px">
            ${icon('camera', 26)}
            <span>Yangi rasm tanlang (PNG, JPG, WEBP)</span>
          </div>
        </div>

        <div id="av-zoom-row" style="display:none;width:100%;max-width:300px;align-items:center;gap:10px">
          ${icon('zoom-out', 15)}
          <input id="av-zoom" type="range" min="1" max="2.6" step="0.05" value="1" style="flex:1;accent-color:var(--primary)">
          ${icon('zoom-in', 15)}
        </div>

        <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center">
          <input id="av-file-inp" type="file" accept=".png,.jpg,.jpeg,.webp" style="display:none">
          <button type="button" class="btn btn-secondary" id="av-pick-btn">${icon('upload-cloud', 15)} Rasm tanlash</button>
          ${user.avatar_url ? `<button type="button" class="btn btn-danger" id="av-del-btn">${icon('trash-2', 15)} Rasmni o‘chirish</button>` : ''}
        </div>
      </div>
    `,
    footerHtml: `
      <button type="button" class="btn btn-secondary" id="av-cancel">Bekor qilish</button>
      <button type="button" class="btn btn-primary" id="av-save" disabled>${icon('check', 15)} Saqlash</button>
    `,
    onMount: panel => {
      const canvas = panel.querySelector('#av-crop-canvas');
      const ctx2d = canvas.getContext('2d');
      const ph = panel.querySelector('#av-crop-placeholder');
      const zoomRow = panel.querySelector('#av-zoom-row');
      const zoomInp = panel.querySelector('#av-zoom');
      const fileInp = panel.querySelector('#av-file-inp');
      const saveBtn = panel.querySelector('#av-save');

      const draw = () => {
        ctx2d.clearRect(0, 0, 240, 240);
        if (!img) return;
        const baseScale = Math.max(240 / img.width, 240 / img.height);
        const s = baseScale * zoom;
        const dw = img.width * s;
        const dh = img.height * s;
        const maxDx = Math.max(0, (dw - 240) / 2);
        const maxDy = Math.max(0, (dh - 240) / 2);
        offX = Math.max(-maxDx, Math.min(maxDx, offX));
        offY = Math.max(-maxDy, Math.min(maxDy, offY));
        ctx2d.drawImage(img, (240 - dw) / 2 + offX, (240 - dh) / 2 + offY, dw, dh);
      };

      const stage = panel.querySelector('#av-crop-stage');
      stage.onpointerdown = e => { if (!img) return; dragging = true; lastX = e.clientX; lastY = e.clientY; stage.setPointerCapture(e.pointerId); };
      stage.onpointermove = e => { if (!dragging) return; offX += e.clientX - lastX; offY += e.clientY - lastY; lastX = e.clientX; lastY = e.clientY; draw(); };
      stage.onpointerup = () => { dragging = false; };

      zoomInp.oninput = () => { zoom = Number(zoomInp.value); draw(); };
      panel.querySelector('#av-pick-btn').onclick = () => fileInp.click();
      panel.querySelector('#av-cancel').onclick = () => closeModal(true);

      fileInp.onchange = async () => {
        const f = fileInp.files[0];
        if (!f) return;
        try {
          await validateImageFile(f);
          const url = URL.createObjectURL(f);
          const loaded = new Image();
          loaded.onload = () => {
            img = loaded;
            zoom = 1; offX = 0; offY = 0;
            zoomInp.value = '1';
            ph.style.display = 'none';
            zoomRow.style.display = 'flex';
            saveBtn.disabled = false;
            draw();
            URL.revokeObjectURL(url);
          };
          loaded.src = url;
        } catch (err) {
          toast(err.message, 'error');
        }
      };

      const delBtn = panel.querySelector('#av-del-btn');
      if (delBtn) {
        delBtn.onclick = async () => {
          delBtn.disabled = true;
          try {
            await api.updateMyProfile({ avatar_url: '' });
            ctx.me.avatar_url = null;
            toast('Profil rasmi olib tashlandi.', 'success');
            closeModal(true);
            await ctx.refresh();
            onSaved();
          } catch (err) {
            toast(err.message, 'error');
            delBtn.disabled = false;
          }
        };
      }

      saveBtn.onclick = async () => {
        if (!img) return;
        saveBtn.disabled = true;
        saveBtn.textContent = 'Yuklanmoqda…';
        try {
          const outCanvas = document.createElement('canvas');
          outCanvas.width = 360;
          outCanvas.height = 360;
          const octx = outCanvas.getContext('2d');
          octx.drawImage(canvas, 0, 0, 360, 360);
          const blob = await new Promise(res => outCanvas.toBlob(res, 'image/jpeg', 0.9));
          const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
          const uploaded = await api.uploadProfileMedia(file, 'avatars');
          await api.updateMyProfile({ avatar_url: uploaded.fpath });
          ctx.me.avatar_url = uploaded.fpath;
          toast('Profil rasmi muvaffaqiyatli yangilandi.', 'success');
          closeModal(true);
          await ctx.refresh();
          onSaved();
        } catch (err) {
          toast(err.message, 'error');
          saveBtn.disabled = false;
          saveBtn.innerHTML = `${icon('check', 15)} Saqlash`;
        }
      };
    }
  });
}

function openEditProfileSheet(user, ctx, onSaved, focusTab = 'info') {
  let dirty = false;
  let chosenCover = user.cover_style || 'ocean-glass';
  let uploadedCoverUrl = user.cover_url || '';

  setModalCloseGuard(async () => {
    if (!dirty) return true;
    return confirmDialog({
      title: 'Saqlanmagan o‘zgarishlar',
      message: 'Profilga kiritilgan o‘zgarishlar saqlanmadi. Chiqishni xohlaysizmi?',
      confirmText: 'Chiqish',
      cancelText: 'Qolish'
    });
  });

  openDetailDrawer({
    title: 'Profilni tahrirlash',
    subtitle: 'Telegram uslubidagi shaxsiy sozlash oynasi',
    bodyHtml: `
      <div class="stack-v" style="gap:18px">
        <div class="form-alert info">
          ${icon('shield', 16)}
          <span>Rasmiy F.I.Sh., fan va rol faqat maktab administratori tomonidan tahrirlanadi.</span>
        </div>

        <div class="field">
          <label>Muqova (Cover) dizayni</label>
          <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px" id="ep-covers">
            ${COVER_PRESETS.map(p => `
              <button type="button" class="profile-cover cover-${p.id}" data-cover-id="${p.id}"
                style="height:54px;border-radius:10px;border:2px solid ${chosenCover === p.id ? 'var(--primary)' : 'var(--border)'};cursor:pointer;position:relative;overflow:hidden">
                <span style="position:relative;z-index:2;font-size:11px;font-weight:600;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,0.6)">${esc(p.label)}</span>
              </button>
            `).join('')}
          </div>
          <div style="display:flex;gap:8px;align-items:center;margin-top:6px;flex-wrap:wrap">
            <input id="ep-cover-file" type="file" accept=".png,.jpg,.jpeg,.webp" style="display:none">
            <button type="button" class="btn btn-secondary btn-sm" id="ep-cover-upload">${icon('upload-cloud', 14)} Maxsus muqova yuklash</button>
            ${uploadedCoverUrl ? `<span class="badge badge-success">Yuklangan rasm mavjud</span>` : ''}
          </div>
        </div>

        <div class="field">
          <label for="ep-bio">Qisqacha biografiya (Bio)</label>
          <textarea id="ep-bio" class="input" rows="3" maxlength="320" placeholder="Pedagogik tajribangiz, ilmiy qiziqishlaringiz yoki mutaxassislik yo‘nalishingiz…">${esc(user.bio || '')}</textarea>
          <span class="field-hint">Maksimal 320 ta belgi</span>
        </div>

        <div class="grid-2">
          <div class="field">
            <label for="ep-phone">Ish / aloqa telefoni</label>
            <input id="ep-phone" class="input" type="tel" maxlength="40" value="${esc(user.phone || '')}" placeholder="+998 90 123 45 67">
          </div>
          <div class="field">
            <label for="ep-tg">Telegram username</label>
            <input id="ep-tg" class="input" type="text" maxlength="48" value="${esc(user.telegram_handle || '')}" placeholder="username">
          </div>
        </div>

        <label style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px;border-radius:12px;background:var(--surface-soft);border:1px solid var(--border);cursor:pointer">
          <div>
            <div style="font-size:13px;font-weight:600;color:var(--text)">Aloqa ma’lumotlarini hamkasblarga ko‘rsatish</div>
            <div style="font-size:11.5px;color:var(--text-muted)">O‘chirilgan bo‘lsa, telefon va Telegram faqat sizga va direktorga ko‘rinadi</div>
          </div>
          <input id="ep-pub" type="checkbox" class="checkbox" ${user.contact_public ? 'checked' : ''}>
        </label>

        <div style="padding:12px;border-radius:12px;border:1px solid var(--border);font-size:12.5px;color:var(--text-muted);display:flex;flex-direction:column;gap:4px">
          <div><b>Rasmiy F.I.Sh.:</b> ${esc(user.name)}</div>
          <div><b>Fan / Lavozim:</b> ${esc(user.subject || '—')}</div>
          <div><b>Rol:</b> ${esc(ROLE[user.role] || user.role)}</div>
        </div>
      </div>
    `,
    footerHtml: `
      <button type="button" class="btn btn-secondary" id="ep-cancel">Bekor qilish</button>
      <button type="button" class="btn btn-primary" id="ep-save">${icon('check', 15)} O‘zgarishlarni saqlash</button>
    `,
    onMount: panel => {
      const markDirty = () => { dirty = true; };
      panel.querySelector('#ep-bio').oninput = markDirty;
      panel.querySelector('#ep-phone').oninput = markDirty;
      panel.querySelector('#ep-tg').oninput = markDirty;
      panel.querySelector('#ep-pub').onchange = markDirty;

      panel.querySelectorAll('[data-cover-id]').forEach(btn => {
        btn.onclick = () => {
          chosenCover = btn.dataset.coverId;
          markDirty();
          panel.querySelectorAll('[data-cover-id]').forEach(b => {
            b.style.borderColor = b.dataset.coverId === chosenCover ? 'var(--primary)' : 'var(--border)';
          });
        };
      });

      const coverInp = panel.querySelector('#ep-cover-file');
      panel.querySelector('#ep-cover-upload').onclick = () => coverInp.click();
      coverInp.onchange = async () => {
        const f = coverInp.files[0];
        if (!f) return;
        try {
          await validateImageFile(f);
          const btn = panel.querySelector('#ep-cover-upload');
          btn.disabled = true;
          btn.textContent = 'Yuklanmoqda…';
          const up = await api.uploadProfileMedia(f, 'covers');
          uploadedCoverUrl = up.fpath;
          chosenCover = 'custom';
          dirty = true;
          toast('Muqova rasmi yuklandi. Saqlashni bosing.', 'info');
          btn.disabled = false;
          btn.innerHTML = `${icon('check', 14)} Yuklandi`;
        } catch (err) {
          toast(err.message, 'error');
        }
      };

      panel.querySelector('#ep-cancel').onclick = () => closeModal();
      panel.querySelector('#ep-save').onclick = async () => {
        const saveBtn = panel.querySelector('#ep-save');
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saqlanmoqda…';
        try {
          const payload = {
            bio: panel.querySelector('#ep-bio').value.trim(),
            phone: panel.querySelector('#ep-phone').value.trim(),
            telegram_handle: panel.querySelector('#ep-tg').value.trim().replace(/^@+/, ''),
            contact_public: panel.querySelector('#ep-pub').checked,
            cover_style: chosenCover,
            cover_url: uploadedCoverUrl || ''
          };
          await api.updateMyProfile(payload);
          Object.assign(ctx.me, payload);
          dirty = false;
          setModalCloseGuard(null);
          closeModal(true);
          toast('Profil ma’lumotlari saqlandi.', 'success');
          await ctx.refresh();
          onSaved();
        } catch (err) {
          toast(err.message, 'error');
          saveBtn.disabled = false;
          saveBtn.innerHTML = `${icon('check', 15)} O‘zgarishlarni saqlash`;
        }
      };

      if (focusTab === 'cover') {
        panel.querySelector('#ep-covers').scrollIntoView({ behavior: 'smooth' });
      }
    }
  });
}

function renderProfileOverview(body, k, approvedEntries, canViewPrivate) {
  body.innerHTML = `
    <div class="stack-v">
      <div class="grid-3">
        <div class="card card-compact">
          <div style="font-size:12px;color:var(--text-muted)">A bo‘lim — ${SEC.A[0]}</div>
          <div style="font-size:26px;font-weight:700;margin:5px 0">${k.A} <small style="font-size:13px;color:var(--text-muted)">/ 50</small></div>
          <div class="progress-single"><i style="width:${(k.A / 50) * 100}%;background:var(--sec-a)"></i></div>
        </div>
        <div class="card card-compact">
          <div style="font-size:12px;color:var(--text-muted)">B bo‘lim — ${SEC.B[0]}</div>
          <div style="font-size:26px;font-weight:700;margin:5px 0">${k.B} <small style="font-size:13px;color:var(--text-muted)">/ 30</small></div>
          <div class="progress-single"><i style="width:${(k.B / 30) * 100}%;background:var(--sec-b)"></i></div>
        </div>
        <div class="card card-compact">
          <div style="font-size:12px;color:var(--text-muted)">C bo‘lim — ${SEC.C[0]}</div>
          <div style="font-size:26px;font-weight:700;margin:5px 0">${k.C} <small style="font-size:13px;color:var(--text-muted)">/ 50</small></div>
          <div class="progress-single"><i style="width:${(k.C / 50) * 100}%;background:var(--sec-c)"></i></div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div><h3 class="card-title">15 ta indikator bo‘yicha natijalar</h3><p class="card-subtitle">Tasdiqlangan (${approvedEntries.length} ta yutuq) natijalar kesimi</p></div>
        </div>
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th>Bo‘lim</th><th>Indikator</th><th>Tasdiqlangan</th><th>Limit</th><th style="min-width:140px">Bajarilishi</th></tr></thead>
            <tbody>
              ${IND.map(i => {
                const sc = k.by[i.id] || { ok: 0, wait: 0 };
                const pct = Math.round((sc.ok / i.max) * 100);
                return `
                  <tr>
                    <td><span class="badge badge-neutral">${i.sec}-${i.id}</span></td>
                    <td><b>${esc(i.name)}</b></td>
                    <td><b style="color:${sc.ok > 0 ? 'var(--primary)' : 'var(--text-muted)'}">${sc.ok}</b>${canViewPrivate && sc.wait > 0 ? ` <span style="font-size:11.5px;color:var(--warning)">(+${sc.wait})</span>` : ''}</td>
                    <td>${i.max}</td>
                    <td>
                      <div style="display:flex;align-items:center;gap:8px">
                        <div class="progress-single" style="flex:1"><i style="width:${pct}%"></i></div>
                        <span style="font-size:12px;color:var(--text-muted);min-width:34px;text-align:right">${pct}%</span>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

function renderProfileAchievements(body, ctx, entries, canViewPrivate, isOwn) {
  body.innerHTML = `
    <div class="card">
      <div class="card-header">
        <div>
          <h3 class="card-title">Yutuqlar ro‘yxati (${entries.length} ta)</h3>
          <p class="card-subtitle">${canViewPrivate ? 'Barcha kiritilgan arizalar va holatlari' : 'Faqat tasdiqlangan ommaviy natijalar'}</p>
        </div>
        ${isOwn ? `<button type="button" class="btn btn-primary btn-sm" id="pa-add-btn">${icon('plus', 14)} Yutuq qo‘shish</button>` : ''}
      </div>
      ${entries.length === 0
        ? emptyStateHtml({ iconName: 'award', title: 'Yutuqlar mavjud emas', desc: 'Ko‘rsatish uchun yutuqlar topilmadi.' })
        : `<div class="table-wrap">
            <table class="data-table">
              <thead><tr><th>Sana</th><th>Mezon</th><th>Tavsif</th><th>Ball</th><th>Holat</th>${canViewPrivate ? '<th>Hujjat</th>' : ''}</tr></thead>
              <tbody>
                ${entries.map(e => `
                  <tr>
                    <td style="white-space:nowrap">${formatDateUz(e.date)}</td>
                    <td><b>${e.ind}. ${esc(IMAP[e.ind]?.name || '')}</b></td>
                    <td>
                      <div>${esc(e.type)} × ${e.qty}</div>
                      <div style="font-size:12px;color:var(--text-muted)">${esc(e.descr)}</div>
                      ${canViewPrivate && e.note ? `<div style="font-size:12px;color:var(--error);margin-top:2px">Izoh: ${esc(e.note)}</div>` : ''}
                    </td>
                    <td><b>+${e.pts}</b></td>
                    <td>${badgeStatus(e.status)}</td>
                    ${canViewPrivate ? `<td>${e.fpath ? `<a href="${esc(e.fpath)}" target="_blank" rel="noopener" class="btn btn-secondary btn-sm">${icon('external-link', 13)} Ochish</a>` : '—'}</td>` : ''}
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>`}
    </div>
  `;
  const ab = $('#pa-add-btn', body);
  if (ab) ab.onclick = () => ctx.navigate('add_entry');
}

function renderProfileStats(body, k, approvedEntries) {
  const monthMap = {};
  const indPts = {};
  for (const e of approvedEntries) {
    if (e.date && /^\d{4}-\d{2}/.test(e.date)) {
      const mk = e.date.slice(0, 7);
      monthMap[mk] = (monthMap[mk] || 0) + Number(e.pts || 0);
    }
    indPts[e.ind] = (indPts[e.ind] || 0) + Number(e.pts || 0);
  }
  const mKeys = Object.keys(monthMap).sort();
  const indItems = Object.entries(indPts)
    .map(([id, v]) => ({ label: `${id}. ${(IMAP[id]?.name || '').split(' ')[0]}`, value: Math.round(v * 10) / 10 }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  body.innerHTML = `
    <div class="stack-v">
      <div class="card card-compact" style="display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap">
        <div style="display:flex;align-items:center;gap:16px">
          ${scoreRingSvg({ value: k.T, max: 130, size: 96, stroke: 9, color: 'var(--primary)', sub: '/ 130' })}
          <div>
            <h3 class="card-title">Umumiy samaradorlik ko‘rsatkichi</h3>
            <p class="card-subtitle">Tasdiqlangan ${approvedEntries.length} ta yutuq asosida hisoblangan real ballar</p>
          </div>
        </div>
        <div style="display:flex;gap:18px;font-size:13px">
          <div><span style="color:var(--text-muted)">A bo‘lim:</span> <b>${k.A}/50</b></div>
          <div><span style="color:var(--text-muted)">B bo‘lim:</span> <b>${k.B}/30</b></div>
          <div><span style="color:var(--text-muted)">C bo‘lim:</span> <b>${k.C}/50</b></div>
        </div>
      </div>

      <div class="grid-2">
        <div class="card"><div class="card-header"><div><h3 class="card-title">Yutuqlar sanasi bo‘yicha dinamika</h3><p class="card-subtitle">Tasdiqlangan ballar</p></div></div><div id="prof-area-chart"></div></div>
        <div class="card"><div class="card-header"><div><h3 class="card-title">Bo‘limlar bo‘yicha taqsimot</h3><p class="card-subtitle">Jami ${k.T} ball</p></div></div><div id="prof-donut-chart"></div></div>
        <div class="card" style="grid-column:1/-1"><div class="card-header"><div><h3 class="card-title">Asosiy mezonlar</h3><p class="card-subtitle">Eng ko‘p ball keltirgan indikatorlar</p></div></div><div id="prof-bar-chart"></div></div>
      </div>
    </div>
  `;

  renderAreaChart($('#prof-area-chart'), { labels: mKeys, values: mKeys.map(m => Math.round(monthMap[m] * 10) / 10), unit: 'ball' });
  renderDonutChart($('#prof-donut-chart'), {
    centerValue: k.T,
    centerLabel: 'Jami ball',
    unit: 'ball',
    slices: [
      { label: 'A — Salohiyat', value: k.A, color: 'var(--sec-a)' },
      { label: 'B — O‘quvchilar', value: k.B, color: 'var(--sec-b)' },
      { label: 'C — Faollik', value: k.C, color: 'var(--sec-c)' }
    ]
  });
  renderBarChart($('#prof-bar-chart'), { items: indItems, unit: 'ball' });
}

function renderProfileDocuments(body, visibleEntries, canViewPrivate) {
  if (!canViewPrivate) {
    body.innerHTML = `<div class="card">${emptyStateHtml({ iconName: 'shield', title: 'Maxfiy hujjatlar himoyalangan', desc: 'Shaxsiy yuklangan hujjatlar va sertifikatlarni faqat egasi, mas’ul ekspert yoki maktab direktori ko‘ra oladi.' })}</div>`;
    return;
  }

  const withFiles = visibleEntries.filter(e => Boolean(e.fpath));
  const filtered = withFiles.filter(e => {
    if (docsSubTab === 'certs') return [3, 4, 5, 15, 21].includes(e.ind);
    if (docsSubTab === 'awards') return [6, 14, 16, 17, 19, 20].includes(e.ind);
    if (docsSubTab === 'files') return Boolean(e.fname);
    return true;
  });

  body.innerHTML = `
    <div class="card">
      <div class="filter-bar">
        <div class="tabs-pill">
          <button type="button" class="tab-btn ${docsSubTab === 'all' ? 'active' : ''}" data-dsub="all">Hujjatlar (${withFiles.length})</button>
          <button type="button" class="tab-btn ${docsSubTab === 'certs' ? 'active' : ''}" data-dsub="certs">Sertifikatlar</button>
          <button type="button" class="tab-btn ${docsSubTab === 'awards' ? 'active' : ''}" data-dsub="awards">Yutuqlar</button>
          <button type="button" class="tab-btn ${docsSubTab === 'files' ? 'active' : ''}" data-dsub="files">Mavjud fayllar</button>
        </div>
        <div class="tabs-pill">
          <button type="button" class="tab-btn ${docsView === 'grid' ? 'active' : ''}" data-dmode="grid">${icon('layout-grid', 14)} Karta</button>
          <button type="button" class="tab-btn ${docsView === 'list' ? 'active' : ''}" data-dmode="list">${icon('list', 14)} Ro‘yxat</button>
        </div>
      </div>

      ${filtered.length === 0
        ? emptyStateHtml({ iconName: 'folder', title: 'Fayllar topilmadi', desc: 'Ushbu bo‘limda yuklangan hujjatlar mavjud emas.' })
        : (docsView === 'grid'
          ? `<div class="media-grid">
              ${filtered.map(e => {
                const isImg = /\.(png|jpe?g|webp)(\?|$)/i.test(e.fpath || '');
                const ext = (e.fname || e.fpath || '').split('.').pop().split('?')[0].toUpperCase().slice(0, 4);
                return `
                  <div class="media-card">
                    <div class="media-thumb">
                      ${isImg
                        ? `<img src="${esc(e.fpath)}" alt="${esc(e.fname || 'Hujjat')}">`
                        : `<div style="display:flex;flex-direction:column;align-items:center;gap:6px;color:var(--primary)">${icon('file-text', 30)}<span class="badge badge-primary">${esc(ext || 'PDF')}</span></div>`}
                    </div>
                    <div style="padding:12px;display:flex;flex-direction:column;gap:6px;flex:1">
                      <div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(e.fname || `${e.ind}. ${IMAP[e.ind]?.name || 'Hujjat'}`)}</div>
                      <div style="font-size:11.5px;color:var(--text-muted)">${formatDateUz(e.date)} · ${e.ind}. ${esc(IMAP[e.ind]?.name || '')}</div>
                      <div style="margin-top:auto;padding-top:8px;display:flex;justify-content:space-between;align-items:center">
                        ${badgeStatus(e.status)}
                        <a href="${esc(e.fpath)}" target="_blank" rel="noopener" class="btn btn-secondary btn-sm">${icon('external-link', 13)} Ochish</a>
                      </div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>`
          : `<div class="table-wrap">
              <table class="data-table">
                <thead><tr><th>Fayl nomi</th><th>Mezon</th><th>Sana</th><th>Holat</th><th style="text-align:right">Ochish</th></tr></thead>
                <tbody>
                  ${filtered.map(e => `
                    <tr>
                      <td><b>${esc(e.fname || 'Tasdiqlovchi hujjat')}</b></td>
                      <td>${e.ind}. ${esc(IMAP[e.ind]?.name || '')}</td>
                      <td>${formatDateUz(e.date)}</td>
                      <td>${badgeStatus(e.status)}</td>
                      <td style="text-align:right"><a href="${esc(e.fpath)}" target="_blank" rel="noopener" class="btn btn-secondary btn-sm">${icon('external-link', 13)} Yuklab olish</a></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>`)}
    </div>
  `;

  $$('[data-dsub]', body).forEach(b => {
    b.onclick = () => { docsSubTab = b.dataset.dsub; renderProfileDocuments(body, visibleEntries, canViewPrivate); };
  });
  $$('[data-dmode]', body).forEach(b => {
    b.onclick = () => { docsView = b.dataset.dmode; renderProfileDocuments(body, visibleEntries, canViewPrivate); };
  });
  syncLiquidPills(body);
}

function renderProfileActivity(body, ctx) {
  const rows = ctx.myActivity?.rows || [];
  if (!ctx.myActivity?.available) {
    body.innerHTML = `<div class="card">${emptyStateHtml({ iconName: 'clock', title: 'Faoliyat jurnali hali ulanmagan', desc: 'Shaxsiy faoliyat tasmasi V6 SQL migratsiyasi qo‘llangandan so‘ng real server yozuvlari bilan ishlaydi.' })}</div>`;
    return;
  }
  if (!rows.length) {
    body.innerHTML = `<div class="card">${emptyStateHtml({ iconName: 'clock', title: 'Faoliyat yozuvlari yo‘q', desc: 'Tizimdagi harakatlaringiz shu yerda xronologik tarzda aks etadi.' })}</div>`;
    return;
  }
  body.innerHTML = `
    <div class="card">
      <div class="card-header">
        <div><h3 class="card-title">So‘nggi shaxsiy faoliyat</h3><p class="card-subtitle">Oxirgi ${Math.min(rows.length, 10)} ta tasdiqlangan hodisa</p></div>
        <button type="button" class="btn btn-secondary btn-sm" id="pa-full-btn">To‘liq faoliyat ${icon('chevron-right', 14)}</button>
      </div>
      <div class="timeline-list">
        ${rows.slice(0, 10).map(a => `
          <div class="timeline-item">
            <span class="timeline-dot ${a.outcome === 'failed' ? 'error' : 'primary'}">${icon('activity', 12)}</span>
            <div class="timeline-card">
              <div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap">
                <b>${esc(a.action)}</b>
                <span style="font-size:12px;color:var(--text-muted)">${formatDateTimeTashkent(a.created_at)}</span>
              </div>
              <div style="font-size:12.5px;color:var(--text-muted);margin-top:3px">${esc(a.target_type || '')} ${a.target_id ? `#${esc(a.target_id)}` : ''}</div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
  $('#pa-full-btn', body).onclick = () => ctx.navigate('my_activity');
}

function renderProfileSettingsShortcut(body, user, ctx, onSaved) {
  body.innerHTML = `
    <div class="grid-2">
      <div class="card">
        <div class="card-header"><div><h3 class="card-title">Profil ko‘rinishi va maxfiylik</h3><p class="card-subtitle">Avatar, muqova, bio va aloqa ko‘rinishini boshqarish</p></div></div>
        <div style="display:flex;flex-direction:column;gap:10px;font-size:13px;margin-bottom:16px">
          <div style="display:flex;justify-content:space-between;padding:9px 12px;border-radius:10px;background:var(--surface-soft)"><span>Muqova uslubi</span><b>${esc(COVER_PRESETS.find(c => c.id === user.cover_style)?.label || 'Maxsus')}</b></div>
          <div style="display:flex;justify-content:space-between;padding:9px 12px;border-radius:10px;background:var(--surface-soft)"><span>Aloqa ko‘rinishi</span><b>${user.contact_public ? 'Hamkasblarga ochiq' : 'Maxfiy (faqat siz va direktor)'}</b></div>
        </div>
        <button type="button" class="btn btn-primary" id="ps-edit-open">${icon('edit-3', 15)} Profilni tahrirlash</button>
      </div>
      <div class="card">
        <div class="card-header"><div><h3 class="card-title">Xavfsizlik va tizim sozlamalari</h3><p class="card-subtitle">Mavzu, bildirishnomalar, parol va faol sessiyalar</p></div></div>
        <p style="font-size:13px;color:var(--text-2);margin:0 0 16px">Parolni yangilash, bildirishnoma turlarini boshqarish va faol sessiyalarni ko‘rish uchun to‘liq sozlamalar bo‘limiga o‘ting.</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button type="button" class="btn btn-secondary" id="ps-open-settings">${icon('settings', 15)} To‘liq sozlamalar</button>
          <button type="button" class="btn btn-secondary" id="ps-open-pw">${icon('key', 15)} Parolni almashtirish</button>
        </div>
      </div>
    </div>
  `;
  $('#ps-edit-open', body).onclick = () => openEditProfileSheet(user, ctx, onSaved);
  $('#ps-open-settings', body).onclick = () => ctx.navigate('settings');
  $('#ps-open-pw', body).onclick = () => ctx.openPasswordModal();
}

function buildPortfolioSheetHtml(user, approvedEntries, k, rank) {
  return `
    <div class="portfolio-sheet">
      <div style="text-align:center;border-bottom:2px solid #101827;padding-bottom:14px;margin-bottom:20px">
        <h1 style="font-size:20px;margin-bottom:4px">Norin tuman ixtisoslashtirilgan maktabi</h1>
        <p style="margin:0;font-size:13px;color:#506077">Pedagogik faoliyat natijalari va reyting portfoliosi (26-AF buyruq asosida)</p>
      </div>

      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:20px;padding-bottom:14px;border-bottom:1px solid #DCE4EE">
        <div>
          <div style="font-size:17.5px;font-weight:700">${esc(user.name)}</div>
          <div style="font-size:13px;color:#506077;margin-top:3px">Fani / Lavozimi: <b>${esc(user.subject || 'Pedagog')}</b></div>
          <div style="font-size:13px;color:#506077;margin-top:2px">Reytingdagi o‘rni: <b>#${rank ? rank.rank : '—'}</b></div>
        </div>
        <div style="text-align:right">
          <div style="font-size:25px;font-weight:800;color:#3267DB">${k.T} ball</div>
          <div style="font-size:12px;color:#748297">Maksimal ball: 130</div>
          <div style="font-size:11.5px;color:#748297;margin-top:2px">Sana: ${new Date().toLocaleDateString('uz-UZ')}</div>
        </div>
      </div>

      <table style="margin-bottom:22px">
        <thead><tr><th>Bo‘lim</th><th>Maksimal</th><th>To‘plangan ball</th><th>Ko‘rsatkich (%)</th></tr></thead>
        <tbody>
          <tr><td><b>A bo‘lim:</b> ${SEC.A[0]}</td><td>50</td><td><b>${k.A}</b></td><td>${Math.round((k.A / 50) * 100)}%</td></tr>
          <tr><td><b>B bo‘lim:</b> ${SEC.B[0]}</td><td>30</td><td><b>${k.B}</b></td><td>${Math.round((k.B / 30) * 100)}%</td></tr>
          <tr><td><b>C bo‘lim:</b> ${SEC.C[0]}</td><td>50</td><td><b>${k.C}</b></td><td>${Math.round((k.C / 50) * 100)}%</td></tr>
          <tr style="background:#F5F7FB;font-weight:700"><td>JAMI REYTING BALI</td><td>130</td><td style="color:#3267DB">${k.T}</td><td>${Math.round((k.T / 130) * 100)}%</td></tr>
        </tbody>
      </table>

      <h3 style="font-size:14.5px;margin-bottom:10px">Tasdiqlangan yutuqlar ro‘yxati</h3>
      ${approvedEntries.length === 0
        ? '<p style="color:#748297;font-size:13px">Tasdiqlangan yutuqlar mavjud emas.</p>'
        : `<table>
            <thead><tr><th>Sana</th><th>Mezon</th><th>Yutuq tavsifi</th><th>Ball</th></tr></thead>
            <tbody>
              ${approvedEntries.map(e => `
                <tr>
                  <td style="white-space:nowrap">${esc(e.date)}</td>
                  <td>${e.ind}. ${esc(IMAP[e.ind]?.name || '')}</td>
                  <td>${esc(e.type)} × ${e.qty} ta<br><small style="color:#506077">${esc(e.descr)}</small></td>
                  <td><b>+${e.pts}</b></td>
                </tr>
              `).join('')}
            </tbody>
          </table>`}

      <div style="margin-top:36px;display:flex;justify-content:space-between;gap:20px;border-top:1px dashed #94A3B8;padding-top:14px;font-size:13px">
        <div>Pedagog imzosi: _______________________</div>
        <div>Maktab direktori: Alisher Xolmatov (Imzo): _______________________</div>
      </div>
    </div>
  `;
}

export function renderPortfolioPrint(el, ctx) {
  const { me, users, entries } = ctx;
  const uid = ctx.params?.uid || me.id;
  const user = users.find(u => u.id === uid) || me;
  const approvedEntries = entries.filter(e => e.uid === user.id && e.status === 'approved');
  const k = calcScores(approvedEntries);
  const ranking = getRanking(users, entries);
  const rank = ranking.find(r => r.id === user.id);

  el.innerHTML = `
    <div class="noprint" style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:18px;flex-wrap:wrap">
      <button type="button" class="btn btn-secondary" id="pp-back-btn">${icon('chevron-left', 15)} Profilga qaytish</button>
      <button type="button" class="btn btn-primary" id="pp-print-btn">${icon('printer', 15)} A4 formatda chop etish (PDF saqlash)</button>
    </div>
    ${buildPortfolioSheetHtml(user, approvedEntries, k, rank)}
  `;

  $('#pp-back-btn').onclick = () => ctx.openProfile(user.id);
  $('#pp-print-btn').onclick = () => window.print();
}
