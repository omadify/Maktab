// Achievement Submission, Split-Panel Review Center (Desktop + Mobile Sheet) & Criteria Explorer V6
import { IND, IMAP, SEC, calcAuthoritativePts } from '../config.js';
import { api, validateProofFile } from '../api.js';
import { icon } from '../icons.js';
import { $, $$, esc, toast, badgeStatus, emptyStateHtml, formatDateUz, avatarHtml, openDetailDrawer, closeModal, getTodayTashkent } from '../ui.js';
import { syncLiquidPills } from '../motion.js';

let revState = { status: 'pending', search: '', ind: 'all', selectedId: null };
let critState = { sec: 'all', search: '' };
let draftForm = { ind: '', type: '', qty: 1, date: '', descr: '', file: null, previewUrl: null };

export function resetEntriesViewState() {
  if (draftForm.previewUrl) URL.revokeObjectURL(draftForm.previewUrl);
  revState = { status: 'pending', search: '', ind: 'all', selectedId: null };
  critState = { sec: 'all', search: '' };
  draftForm = { ind: '', type: '', qty: 1, date: '', descr: '', file: null, previewUrl: null };
}

/* ==========================================================================
   1. YUTUQ QO'SHISH (Achievement Submission)
   ========================================================================== */
export function renderAddEntry(el, ctx) {
  if (ctx.me.role !== 'teacher') {
    el.innerHTML = `<div class="card">${emptyStateHtml({ iconName: 'shield', title: 'Faqat pedagoglar uchun', desc: 'Mas’ul baholovchilar va rahbariyat faqat tekshiruvchi hisoblanadi, reytingga ball kiritmaydi.' })}</div>`;
    return;
  }
  const today = getTodayTashkent();
  if (!draftForm.date) draftForm.date = today;

  el.innerHTML = `
    <div class="stack-v">
      <div class="page-header">
        <div>
          <h1 class="page-title">Yangi yutuq kiritish</h1>
          <p class="page-desc">26-AF buyruq mezonlari asosida tasdiqlovchi hujjat bilan ariza yuborish.</p>
        </div>
        <div class="page-actions">
          <button type="button" class="btn btn-secondary" id="add-crit-link">${icon('book-open', 15)} Mezonlarni ko‘rish</button>
        </div>
      </div>

      <div class="grid-asymmetric">
        <div class="card">
          <form id="af" class="stack-v" style="gap:16px">
            <div class="field">
              <label for="ai">1. Baholash mezoni (Indikator)</label>
              <select id="ai" class="input" required>
                <option value="">— Mezonni tanlang —</option>
                ${['A', 'B', 'C'].map(secKey => `
                  <optgroup label="${secKey}-bo‘lim: ${esc(SEC[secKey][0])} (maks ${SEC[secKey][1]} ball)">
                    ${IND.filter(i => i.sec === secKey).map(i => `
                      <option value="${i.id}" ${String(draftForm.ind) === String(i.id) ? 'selected' : ''}>${i.id}. ${esc(i.name)} (maks: ${i.max} ball)</option>
                    `).join('')}
                  </optgroup>
                `).join('')}
              </select>
            </div>

            <div id="at-wrap" style="display:none" class="stack-v">
              <div class="field">
                <label for="at">2. Yutuq turi va darajasi</label>
                <select id="at" class="input" required></select>
              </div>
              <div id="adoc" class="form-alert info"></div>
            </div>

            <div class="grid-2">
              <div class="field">
                <label for="aq">3. Soni (o‘quvchi yoki sinflar soni)</label>
                <input id="aq" class="input" type="number" min="1" max="50" value="${esc(draftForm.qty)}" required>
              </div>
              <div class="field">
                <label for="adt">4. Yutuq sanasi</label>
                <input id="adt" class="input" type="date" value="${esc(draftForm.date)}" required>
              </div>
            </div>

            <div id="pts-preview-box" style="display:none;padding:13px 15px;border-radius:12px;background:var(--primary-soft);border:1px solid var(--primary-border);align-items:center;justify-content:space-between">
              <span style="font-size:13px;font-weight:500;color:var(--text-2)">Hisoblanadigan ball (server tekshiradi)</span>
              <span id="pts-preview" style="font-size:17px;font-weight:700;color:var(--primary)"></span>
            </div>

            <div class="field">
              <label for="ad">5. Batafsil tavsif</label>
              <textarea id="ad" class="input" rows="3" placeholder="Masalan: 10-A sinf o‘quvchisi Anvarov Bobur IELTS 7.5 sertifikatini oldi (sertifikat raqami, sana)…" required>${esc(draftForm.descr)}</textarea>
            </div>

            <div class="field">
              <label>6. Tasdiqlovchi hujjat (PDF, JPG, PNG — 15 MB gacha)</label>
              <div class="dropzone" id="af-dropzone" tabindex="0" role="button" aria-label="Hujjat faylini tanlash">
                <input id="af-file" type="file" accept=".pdf,.jpg,.jpeg,.png" style="display:none">
                <div id="af-dz-body" style="display:flex;flex-direction:column;align-items:center;gap:6px">
                  <div class="kpi-icon primary">${icon('upload-cloud', 18)}</div>
                  <div style="font-size:13.5px;font-weight:500;color:var(--text)">Faylni shu yerga tashlang yoki tanlash uchun bosing</div>
                  <div style="font-size:12px;color:var(--text-muted)">Format va hajm serverdan oldin tekshiriladi</div>
                </div>
              </div>
              <div id="af-file-preview" style="display:none;margin-top:8px;padding:10px 12px;border-radius:10px;border:1px solid var(--border);background:var(--surface-soft);align-items:center;justify-content:space-between;gap:10px"></div>
            </div>

            <div id="af-err" class="form-alert error" style="display:none" role="alert">
              ${icon('alert-circle', 16)}<span id="af-err-txt"></span>
            </div>

            <div style="display:flex;gap:10px;flex-wrap:wrap;padding-top:4px">
              <button class="btn btn-primary" type="submit" id="sub-btn">${icon('check-circle', 16)} Tasdiqlashga yuborish</button>
              <button class="btn btn-secondary" type="button" id="cancel-add-btn">Bekor qilish</button>
            </div>
          </form>
        </div>

        <div class="card" style="height:fit-content">
          <div class="card-header"><div><h3 class="card-title">Yuborish qoidalari</h3><p class="card-subtitle">Xavfsiz va tez tasdiqlash bo‘yicha eslatma</p></div></div>
          <div style="display:flex;flex-direction:column;gap:12px;font-size:13px;color:var(--text-2)">
            <div style="display:flex;gap:10px;align-items:flex-start"><span style="color:var(--primary)">${icon('check-circle', 16)}</span><span>Ballar 26-AF buyruq limitlariga muvofiq serverda avtomatik hisoblanadi.</span></div>
            <div style="display:flex;gap:10px;align-items:flex-start"><span style="color:var(--primary)">${icon('paperclip', 16)}</span><span>Faqat haqiqiy PDF, JPG yoki PNG skanlar qabul qilinadi.</span></div>
            <div style="display:flex;gap:10px;align-items:flex-start"><span style="color:var(--primary)">${icon('clock', 16)}</span><span>Mas’ul ekspert tasdiqlaganidan so‘ng ball reytingga qo‘shiladi.</span></div>
          </div>
        </div>
      </div>
    </div>
  `;

  $('#add-crit-link').onclick = () => ctx.navigate('criteria');
  $('#cancel-add-btn').onclick = () => {
    if (draftForm.previewUrl) URL.revokeObjectURL(draftForm.previewUrl);
    draftForm = { ind: '', type: '', qty: 1, date: today, descr: '', file: null, previewUrl: null };
    ctx.setDirtyForm(false);
    ctx.navigate('my_results');
  };

  const dz = $('#af-dropzone');
  const fileInp = $('#af-file');
  const previewBox = $('#af-file-preview');

  function renderFilePreview() {
    const f = draftForm.file;
    if (!f) {
      previewBox.style.display = 'none';
      dz.style.display = 'block';
      return;
    }
    dz.style.display = 'none';
    previewBox.style.display = 'flex';
    const sizeLabel = f.size >= 1024 * 1024 ? `${(f.size / (1024 * 1024)).toFixed(2)} MB` : `${Math.round(f.size / 1024)} KB`;
    previewBox.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;min-width:0">
        ${draftForm.previewUrl
          ? `<img src="${draftForm.previewUrl}" alt="Yuklangan rasm" style="width:44px;height:44px;object-fit:cover;border-radius:8px;border:1px solid var(--border)">`
          : `<div class="kpi-icon primary">${icon('file-text', 17)}</div>`}
        <div style="min-width:0">
          <div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(f.name)}</div>
          <div style="font-size:11.5px;color:var(--text-muted)">${sizeLabel}</div>
        </div>
      </div>
      <div style="display:flex;gap:6px">
        <button type="button" class="btn btn-secondary btn-sm" id="af-replace">Almashtirish</button>
        <button type="button" class="btn btn-danger btn-sm" id="af-remove">${icon('trash-2', 14)}</button>
      </div>
    `;
    $('#af-replace').onclick = () => fileInp.click();
    $('#af-remove').onclick = () => {
      if (draftForm.previewUrl) URL.revokeObjectURL(draftForm.previewUrl);
      draftForm.file = null;
      draftForm.previewUrl = null;
      fileInp.value = '';
      renderFilePreview();
    };
  }

  async function handleFileSelect(f) {
    if (!f) return;
    try {
      await validateProofFile(f);
      if (draftForm.previewUrl) URL.revokeObjectURL(draftForm.previewUrl);
      draftForm.file = f;
      draftForm.previewUrl = f.type.startsWith('image/') ? URL.createObjectURL(f) : null;
      renderFilePreview();
      ctx.setDirtyForm(true);
    } catch (err) {
      toast(err.message, 'error');
      fileInp.value = '';
    }
  }

  dz.onclick = () => fileInp.click();
  dz.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInp.click(); } };
  dz.ondragover = e => { e.preventDefault(); dz.classList.add('dragover'); };
  dz.ondragleave = () => dz.classList.remove('dragover');
  dz.ondrop = e => { e.preventDefault(); dz.classList.remove('dragover'); if (e.dataTransfer.files?.length) handleFileSelect(e.dataTransfer.files[0]); };
  fileInp.onchange = () => handleFileSelect(fileInp.files[0]);

  function syncTypeAndPreview() {
    const id = Number($('#ai').value);
    const ind = IMAP[id];
    draftForm.ind = $('#ai').value;
    if (!ind) {
      $('#at-wrap').style.display = 'none';
      $('#pts-preview-box').style.display = 'none';
      return;
    }
    $('#at-wrap').style.display = 'flex';
    $('#at').innerHTML = ind.types.map(t => `<option value="${esc(t[0])}" data-pts="${t[1]}" ${draftForm.type === t[0] ? 'selected' : ''}>${esc(t[0])} — +${t[1]} ball</option>`).join('');
    draftForm.type = $('#at').value;
    $('#adoc').innerHTML = `${icon('file-text', 16)}<div><div><b>Kerakli hujjat:</b> ${esc(ind.doc)}</div><div style="margin-top:2px"><b>Mas’ul baholovchi:</b> ${esc(ind.respStr)}</div></div>`;
    updatePts();
  }

  function updatePts() {
    const id = Number($('#ai').value);
    const ind = IMAP[id];
    const sel = $('#at').selectedOptions[0];
    const box = $('#pts-preview-box');
    if (!ind || !sel) { box.style.display = 'none'; return; }
    const qty = Math.max(1, Math.min(50, Number($('#aq').value) || 1));
    draftForm.qty = qty;
    draftForm.type = sel.value;
    const raw = Number(sel.dataset.pts) * qty;
    const capped = calcAuthoritativePts(id, sel.value, qty) ?? Math.min(raw, ind.max);
    box.style.display = 'flex';
    $('#pts-preview').textContent = raw > ind.max ? `+${capped} ball (limit: ${ind.max})` : `+${capped} ball`;
  }

  $('#ai').onchange = () => { ctx.setDirtyForm(true); syncTypeAndPreview(); };
  $('#at').onchange = () => { ctx.setDirtyForm(true); updatePts(); };
  $('#aq').oninput = () => { ctx.setDirtyForm(true); updatePts(); };
  $('#adt').onchange = e => { draftForm.date = e.target.value; ctx.setDirtyForm(true); };
  $('#ad').oninput = e => { draftForm.descr = e.target.value; ctx.setDirtyForm(Boolean(e.target.value.trim())); };

  if (draftForm.ind) syncTypeAndPreview();
  renderFilePreview();

  let submitting = false;
  $('#af').onsubmit = async e => {
    e.preventDefault();
    if (submitting) return;
    const errBox = $('#af-err');
    errBox.style.display = 'none';
    const showErr = m => { $('#af-err-txt').textContent = m; errBox.style.display = 'flex'; };

    const indId = Number($('#ai').value);
    const ind = IMAP[indId];
    if (!ind) return showErr('Iltimos, baholash mezonini tanlang.');
    const selType = $('#at').selectedOptions[0];
    const qty = Math.max(1, Math.min(50, Number($('#aq').value) || 1));
    const pts = calcAuthoritativePts(indId, selType.value, qty);
    if (pts === null) return showErr('Mezon yoki miqdor noto‘g‘ri.');
    const descr = $('#ad').value.trim();
    if (descr.length < 3) return showErr('Batafsil tavsifni kiriting (kamida 3 belgi).');

    submitting = true;
    const btn = $('#sub-btn');
    btn.disabled = true;
    let uploadedObject = null;

    try {
      let fname = null;
      let fpath = null;
      if (draftForm.file) {
        btn.innerHTML = `${icon('upload-cloud', 15)} Hujjat yuklanmoqda…`;
        const up = await api.uploadProofFile(draftForm.file);
        fname = up.fname;
        fpath = up.fpath;
        uploadedObject = up.objectName;
      }

      btn.innerHTML = `${icon('refresh-cw', 15)} Saqlanmoqda…`;
      await api.submitEntry({
        uid: ctx.me.id,
        ind: indId,
        type: selType.value,
        qty,
        pts,
        descr,
        date: $('#adt').value,
        fname,
        fpath,
        status: 'pending',
        note: ''
      });

      if (draftForm.previewUrl) URL.revokeObjectURL(draftForm.previewUrl);
      draftForm = { ind: '', type: '', qty: 1, date: today, descr: '', file: null, previewUrl: null };
      ctx.setDirtyForm(false);
      toast('Yutuq muvaffaqiyatli yuborildi va tasdiqlash navbatiga qo‘yildi.', 'success');
      await ctx.refresh();
      ctx.navigate('my_results');
    } catch (err) {
      if (uploadedObject) {
        await api.deleteProofObject(uploadedObject);
      }
      showErr(err.message || 'Saqlashda xatolik yuz berdi. Qayta urinib ko‘ring.');
      btn.disabled = false;
      btn.innerHTML = `${icon('check-circle', 16)} Tasdiqlashga yuborish`;
      submitting = false;
    }
  };
}

/* ==========================================================================
   2. SPLIT-PANEL REVIEW CENTER (Desktop Split + Mobile Sheet)
   ========================================================================== */
export function renderReviews(el, ctx) {
  const { me, users, entries } = ctx;
  const userMap = new Map(users.map(u => [u.id, u]));
  const isDirector = me.role === 'director';

  const scopedEntries = entries.filter(e => {
    if (isDirector) return true;
    const ind = IMAP[e.ind];
    return ind && ind.resp.includes(me.name);
  });

  const counts = {
    pending: scopedEntries.filter(e => e.status === 'pending').length,
    approved: scopedEntries.filter(e => e.status === 'approved').length,
    rejected: scopedEntries.filter(e => e.status === 'rejected').length,
    all: scopedEntries.length
  };

  el.innerHTML = `
    <div class="stack-v">
      <div class="page-header">
        <div>
          <h1 class="page-title">Tasdiqlash markazi</h1>
          <p class="page-desc">
            ${isDirector
              ? 'Maktab direktori sifatida barcha 15 ta indikator bo‘yicha arizalarni ko‘rib chiqish.'
              : `Mas’ul ekspert (${esc(me.name)}) ga biriktirilgan mezonlar navbati.`}
          </p>
        </div>
      </div>

      <div class="card card-compact">
        <div class="filter-bar" style="margin-bottom:0">
          <div class="tabs-pill" role="tablist">
            <button type="button" class="tab-btn ${revState.status === 'pending' ? 'active' : ''}" data-rev-st="pending">Kutilmoqda <span class="tab-count">${counts.pending}</span></button>
            <button type="button" class="tab-btn ${revState.status === 'approved' ? 'active' : ''}" data-rev-st="approved">Tasdiqlangan <span class="tab-count">${counts.approved}</span></button>
            <button type="button" class="tab-btn ${revState.status === 'rejected' ? 'active' : ''}" data-rev-st="rejected">Rad etilgan <span class="tab-count">${counts.rejected}</span></button>
            <button type="button" class="tab-btn ${revState.status === 'all' ? 'active' : ''}" data-rev-st="all">Barchasi <span class="tab-count">${counts.all}</span></button>
          </div>
          <div class="filter-controls" style="justify-content:flex-end">
            <div class="input-icon-wrap" style="min-width:190px;max-width:250px">
              <span class="input-leading">${icon('search', 15)}</span>
              <input id="rev-search" class="input has-leading" type="search" value="${esc(revState.search)}" placeholder="Pedagog yoki tavsif…">
            </div>
            <select id="rev-ind" class="input" style="width:auto;max-width:230px">
              <option value="all">Barcha mezonlar</option>
              ${IND.filter(i => isDirector || i.resp.includes(me.name)).map(i => `<option value="${i.id}" ${revState.ind === String(i.id) ? 'selected' : ''}>${i.id}. ${esc(i.name)}</option>`).join('')}
            </select>
          </div>
        </div>
      </div>

      <div id="rev-split-zone"></div>
    </div>
  `;

  function buildDetailHtml(sel) {
    const owner = userMap.get(sel.uid);
    const ind = IMAP[sel.ind];
    const isOwn = sel.uid === me.id;
    const isImg = sel.fpath && /\.(png|jpe?g|webp)(\?|$)/i.test(sel.fpath);
    return `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;padding-bottom:16px;border-bottom:1px solid var(--border)">
        <div style="display:flex;align-items:center;gap:12px">
          ${avatarHtml(owner?.name || '?', 'lg', owner?.avatar_url)}
          <div>
            <div style="font-size:16px;font-weight:700">${esc(owner?.name || 'Noma’lum')}</div>
            <div style="font-size:12.5px;color:var(--text-muted)">${esc(owner?.subject || 'Pedagog')} · ${formatDateUz(sel.date)}</div>
          </div>
        </div>
        <div style="text-align:right">
          ${badgeStatus(sel.status)}
          <div style="font-size:20px;font-weight:700;color:var(--primary);margin-top:4px">+${sel.pts} ball</div>
        </div>
      </div>

      <div class="stack-v" style="gap:14px;margin-top:16px">
        <div style="padding:12px 14px;border-radius:12px;background:var(--surface-soft);border:1px solid var(--border)">
          <div style="font-size:12px;color:var(--text-muted)">Mezon va yutuq turi</div>
          <div style="font-weight:600;margin-top:2px">${sel.ind}. ${esc(ind?.name || '')} (maks: ${ind?.max || 0} ball)</div>
          <div style="font-size:13px;color:var(--primary);margin-top:3px">${esc(sel.type)} × ${sel.qty} ta</div>
          <div style="font-size:11.5px;color:var(--text-muted);margin-top:4px">Mas’ul: ${esc(ind?.respStr || '')}</div>
        </div>

        <div>
          <div style="font-size:12px;font-weight:600;color:var(--text-muted);margin-bottom:4px">Pedagog tavsifi</div>
          <div style="font-size:13.5px;line-height:1.55;color:var(--text)">${esc(sel.descr)}</div>
        </div>

        <div>
          <div style="font-size:12px;font-weight:600;color:var(--text-muted);margin-bottom:6px">Tasdiqlovchi hujjat</div>
          ${sel.fpath ? `
            <div style="display:flex;flex-direction:column;gap:8px">
              ${isImg ? `<img src="${esc(sel.fpath)}" alt="Tasdiqlovchi hujjat" style="max-height:240px;width:100%;object-fit:contain;border-radius:10px;border:1px solid var(--border);background:var(--surface-soft)">` : ''}
              <div>
                <a href="${esc(sel.fpath)}" target="_blank" rel="noopener" class="btn btn-secondary btn-sm">${icon('external-link', 14)} Hujjatni ochish (${esc(sel.fname || 'Fayl')})</a>
              </div>
            </div>
          ` : '<span style="font-size:13px;color:var(--text-muted)">Hujjat biriktirilmagan</span>'}
        </div>

        ${isOwn && !isDirector ? `
          <div class="form-alert warning">
            ${icon('shield', 16)}
            <span>O‘z yutug‘ingizni tasdiqlay olmaysiz. Uni boshqa mas’ul ekspert yoki direktor ko‘rib chiqadi.</span>
          </div>
        ` : `
          <div class="field" style="padding-top:8px;border-top:1px solid var(--border)">
            <label for="rev-inline-note">Ekspert izohi (rad etilganda sabab majburiy)</label>
            <textarea id="rev-inline-note" class="input" rows="2" placeholder="Izoh yoki rad etish sababini yozing…">${esc(sel.note || '')}</textarea>
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap">
            ${sel.status !== 'approved' ? `<button type="button" class="btn btn-success" id="rev-do-approve" style="flex:1">${icon('check', 15)} Tasdiqlash</button>` : ''}
            ${sel.status !== 'rejected' ? `<button type="button" class="btn btn-danger" id="rev-do-reject" style="flex:1">${icon('x', 15)} Rad etish</button>` : ''}
          </div>
        `}
      </div>
    `;
  }

  function bindDecisionHandlers(container, sel, onDone) {
    const handleDecision = async status => {
      const note = ($('#rev-inline-note', container)?.value || '').trim();
      if (status === 'rejected' && !note) {
        return toast('Rad etish uchun sabab kiritilishi shart.', 'warning');
      }
      const b1 = $('#rev-do-approve', container);
      const b2 = $('#rev-do-reject', container);
      if (b1) b1.disabled = true;
      if (b2) b2.disabled = true;
      try {
        await api.reviewEntry(sel.id, status, note, me.id);
        toast(status === 'approved' ? 'Yutuq muvaffaqiyatli tasdiqlandi.' : 'Ariza rad etildi.', status === 'approved' ? 'success' : 'info');
        if (onDone) onDone();
        await ctx.refresh();
      } catch (err) {
        toast('Xatolik: ' + err.message, 'error');
        if (b1) b1.disabled = false;
        if (b2) b2.disabled = false;
      }
    };
    const appBtn = $('#rev-do-approve', container);
    if (appBtn) appBtn.onclick = () => handleDecision('approved');
    const rejBtn = $('#rev-do-reject', container);
    if (rejBtn) rejBtn.onclick = () => handleDecision('rejected');
  }

  function renderSplit() {
    const q = revState.search.trim().toLowerCase();
    const filtered = scopedEntries.filter(e => {
      if (revState.status !== 'all' && e.status !== revState.status) return false;
      if (revState.ind !== 'all' && String(e.ind) !== revState.ind) return false;
      if (q) {
        const u = userMap.get(e.uid);
        const ind = IMAP[e.ind];
        const hay = `${u?.name || ''} ${u?.subject || ''} ${ind?.name || ''} ${e.type || ''} ${e.descr || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const zone = $('#rev-split-zone');
    if (filtered.length === 0) {
      zone.innerHTML = `<div class="card">${emptyStateHtml({
        iconName: 'check-circle',
        title: revState.status === 'pending' ? 'Tasdiqlash kutayotgan arizalar yo‘q' : 'Arizalar topilmadi',
        desc: 'Tanlangan filtrlar bo‘yicha hech qanday ariza aniqlanmadi.'
      })}</div>`;
      return;
    }

    if (!filtered.some(e => e.id === revState.selectedId)) {
      revState.selectedId = filtered[0].id;
    }
    const sel = filtered.find(e => e.id === revState.selectedId) || filtered[0];

    zone.innerHTML = `
      <div class="review-split">
        <div class="review-queue-list" role="listbox" aria-label="Arizalar navbati">
          ${filtered.map(e => {
            const u = userMap.get(e.uid);
            return `
              <button type="button" class="review-queue-item ${e.id === sel.id ? 'active' : ''}" data-q-id="${e.id}">
                <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:4px">
                  <span style="font-size:13px;font-weight:600;color:var(--text)">${esc(u?.name || 'Pedagog')}</span>
                  <span class="badge badge-primary">+${e.pts} ball</span>
                </div>
                <div style="font-size:12px;color:var(--text-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e.ind}. ${esc(IMAP[e.ind]?.name || '')}</div>
                <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px">
                  <span style="font-size:11.5px;color:var(--text-muted)">${formatDateUz(e.date)}</span>
                  ${badgeStatus(e.status)}
                </div>
              </button>
            `;
          }).join('')}
        </div>

        <div class="card hide-xs" id="rev-detail-pane">${buildDetailHtml(sel)}</div>
      </div>
    `;

    const pane = $('#rev-detail-pane', zone);
    if (pane) bindDecisionHandlers(pane, sel);

    $$('[data-q-id]', zone).forEach(btn => {
      btn.onclick = () => {
        const id = Number(btn.dataset.qId);
        revState.selectedId = id;
        const picked = filtered.find(x => x.id === id);
        if (window.innerWidth < 768 && picked) {
          openDetailDrawer({
            title: 'Arizani ko‘rib chiqish',
            subtitle: `${picked.ind}. ${IMAP[picked.ind]?.name || ''}`,
            bodyHtml: buildDetailHtml(picked),
            onMount: panel => bindDecisionHandlers(panel, picked, () => closeModal(true))
          });
        } else {
          renderSplit();
        }
      };
    });
  }

  $$('[data-rev-st]').forEach(btn => {
    btn.onclick = () => {
      revState.status = btn.dataset.revSt;
      $$('[data-rev-st]').forEach(b => b.classList.toggle('active', b.dataset.revSt === revState.status));
      syncLiquidPills(el);
      renderSplit();
    };
  });
  $('#rev-search').oninput = e => { revState.search = e.target.value; renderSplit(); };
  $('#rev-ind').onchange = e => { revState.ind = e.target.value; renderSplit(); };

  syncLiquidPills(el);
  renderSplit();
}

/* ==========================================================================
   3. CRITERIA EXPLORER (26-AF Decree 15 Indicators)
   ========================================================================== */
export function renderCriteria(el, ctx) {
  const highlightId = ctx.params?.highlightInd || null;

  el.innerHTML = `
    <div class="stack-v">
      <div class="page-header">
        <div>
          <h1 class="page-title">Baholash mezonlari (26-AF buyruq)</h1>
          <p class="page-desc">3 ta bo‘lim, 15 ta indikator va jami 130 ballik rasmiy baholash tizimi.</p>
        </div>
        ${ctx.me.role === 'teacher'
          ? `<div class="page-actions"><button type="button" class="btn btn-primary" id="crit-add-btn">${icon('plus', 15)} Yutuq kiritish</button></div>`
          : ''}
      </div>

      <div class="grid-3">
        <div class="card card-compact"><span class="badge badge-primary">A bo‘lim · 50 ball</span><div style="font-size:15px;font-weight:600;margin-top:8px">${SEC.A[0]}</div><div style="font-size:12px;color:var(--text-muted);margin-top:3px">1–7 indikatorlar · Salohiyat va metodika</div></div>
        <div class="card card-compact"><span class="badge badge-success">B bo‘lim · 30 ball</span><div style="font-size:15px;font-weight:600;margin-top:8px">${SEC.B[0]}</div><div style="font-size:12px;color:var(--text-muted);margin-top:3px">14–17 indikatorlar · Olimpiada va loyihalar</div></div>
        <div class="card card-compact"><span class="badge badge-warning">C bo‘lim · 50 ball</span><div style="font-size:15px;font-weight:600;margin-top:8px">${SEC.C[0]}</div><div style="font-size:12px;color:var(--text-muted);margin-top:3px">18–21 indikatorlar · O‘zlashtirish va faollik</div></div>
      </div>

      <div class="card">
        <div class="filter-bar">
          <div class="tabs-pill">
            <button type="button" class="tab-btn ${critState.sec === 'all' ? 'active' : ''}" data-csec="all">Barchasi (15)</button>
            <button type="button" class="tab-btn ${critState.sec === 'A' ? 'active' : ''}" data-csec="A">A bo‘lim</button>
            <button type="button" class="tab-btn ${critState.sec === 'B' ? 'active' : ''}" data-csec="B">B bo‘lim</button>
            <button type="button" class="tab-btn ${critState.sec === 'C' ? 'active' : ''}" data-csec="C">C bo‘lim</button>
          </div>
          <div class="input-icon-wrap" style="min-width:220px;max-width:320px;flex:1">
            <span class="input-leading">${icon('search', 15)}</span>
            <input id="crit-search" class="input has-leading" type="search" value="${esc(critState.search)}" placeholder="Mezon, hujjat yoki mas’ul…">
          </div>
        </div>
        <div id="crit-zone"></div>
      </div>
    </div>
  `;

  function renderCritZone() {
    const q = critState.search.trim().toLowerCase();
    const filtered = IND.filter(i => {
      if (critState.sec !== 'all' && i.sec !== critState.sec) return false;
      if (q) {
        const hay = `${i.id} ${i.name} ${i.doc} ${i.respStr} ${i.types.map(t => t[0]).join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const zone = $('#crit-zone');
    if (filtered.length === 0) {
      zone.innerHTML = emptyStateHtml({ iconName: 'book-open', title: 'Mezon topilmadi', desc: 'Qidiruv so‘zini o‘zgartirib ko‘ring.' });
      return;
    }

    zone.innerHTML = `
      <div class="grid-2">
        ${filtered.map(i => `
          <div class="card card-compact" style="box-shadow:none;${highlightId === i.id ? 'border-color:var(--primary);box-shadow:0 0 0 3px var(--primary-glow)' : ''}">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:10px">
              <div>
                <span class="badge ${i.sec === 'A' ? 'badge-primary' : (i.sec === 'B' ? 'badge-success' : 'badge-warning')}">${i.sec}-${i.id}</span>
                <h4 style="font-size:14.5px;font-weight:600;margin-top:6px">${esc(i.name)}</h4>
              </div>
              <span class="badge badge-neutral" style="font-weight:700">Maks: ${i.max} ball</span>
            </div>
            <div style="display:flex;flex-direction:column;gap:5px;margin-bottom:12px">
              ${i.types.map(t => `
                <div style="display:flex;justify-content:space-between;font-size:12.5px;padding:6px 10px;border-radius:8px;background:var(--surface-soft)">
                  <span>${esc(t[0])}</span>
                  <b style="color:var(--primary)">+${t[1]} ball</b>
                </div>
              `).join('')}
            </div>
            <div style="font-size:12px;color:var(--text-muted);line-height:1.5;border-top:1px solid var(--border);padding-top:10px">
              <div><b>Kerakli hujjat:</b> ${esc(i.doc)}</div>
              <div style="margin-top:2px"><b>Mas’ul ekspert:</b> ${esc(i.respStr)}</div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  const ab = $('#crit-add-btn');
  if (ab) ab.onclick = () => ctx.navigate('add_entry');
  $$('[data-csec]').forEach(btn => {
    btn.onclick = () => {
      critState.sec = btn.dataset.csec;
      $$('[data-csec]').forEach(b => b.classList.toggle('active', b.dataset.csec === critState.sec));
      syncLiquidPills(el);
      renderCritZone();
    };
  });
  $('#crit-search').oninput = e => { critState.search = e.target.value; renderCritZone(); };

  syncLiquidPills(el);
  renderCritZone();
}
