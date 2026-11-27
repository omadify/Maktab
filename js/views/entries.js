// Achievement Submission, Review Queue (with Modal), and 26-AF Criteria Explorer
import { IND, IMAP, SEC } from '../config.js';
import { api } from '../api.js';
import { icon } from '../icons.js';
import { $, $$, esc, toast, openModal, closeModal, confirmDialog, badgeStatus, emptyStateHtml, formatDateUz, avatarHtml } from '../ui.js';

let revState = { status: 'pending', search: '', ind: 'all' };
let critState = { sec: 'all', search: '' };

/* ==========================================================================
   YUTUQ QO'SHISH (Add Achievement)
   ========================================================================== */
export function renderAddEntry(el, ctx) {
  const { me } = ctx;
  const today = new Date().toISOString().slice(0, 10);

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
              <label for="ai">Baholash mezoni (Indikator)</label>
              <select id="ai" class="input" required>
                <option value="">— Mezonni tanlang —</option>
                ${IND.map(i => `<option value="${i.id}">${i.id}. ${i.sec}-bo‘lim: ${esc(i.name)} (maks: ${i.max} ball)</option>`).join('')}
              </select>
            </div>

            <div id="at-wrap" style="display:none" class="stack-v">
              <div class="field">
                <label for="at">Yutuq turi va darajasi</label>
                <select id="at" class="input" required></select>
              </div>
              <div id="adoc" class="form-alert info"></div>
            </div>

            <div class="grid-2">
              <div class="field">
                <label for="aq">Soni (o‘quvchi yoki sinflar soni)</label>
                <input id="aq" class="input" type="number" min="1" max="50" value="1" required>
              </div>
              <div class="field">
                <label for="adt">Yutuq sanasi</label>
                <input id="adt" class="input" type="date" value="${today}" required>
              </div>
            </div>

            <div id="pts-preview-box" style="display:none;padding:12px 14px;border-radius:10px;background:var(--primary-soft);border:1px solid var(--primary-border);align-items:center;justify-content:space-between">
              <span style="font-size:13px;font-weight:500;color:var(--text-2)">Hisoblanadigan ball</span>
              <span id="pts-preview" style="font-size:16px;font-weight:700;color:var(--primary)"></span>
            </div>

            <div class="field">
              <label for="ad">Batafsil tavsif</label>
              <textarea id="ad" class="input" rows="3" placeholder="Masalan: 10-A sinf o‘quvchisi Anvarov Bobur IELTS 7.5 sertifikatini oldi (sertifikat raqami, sana)…" required></textarea>
            </div>

            <div class="field">
              <label>Tasdiqlovchi hujjat (PDF, JPG, PNG — ixtiyoriy, 15 MB gacha)</label>
              <div class="dropzone" id="af-dropzone" tabindex="0" role="button" aria-label="Hujjat faylini tanlash">
                <input id="af-file" type="file" accept=".pdf,.jpg,.jpeg,.png" style="display:none">
                <div style="display:flex;flex-direction:column;align-items:center;gap:6px">
                  <div class="kpi-icon primary">${icon('upload-cloud', 18)}</div>
                  <div id="af-file-label" style="font-size:13.5px;font-weight:500;color:var(--text)">Faylni shu yerga tashlang yoki tanlash uchun bosing</div>
                  <div style="font-size:12px;color:var(--text-muted)">Hujjat xavfsiz bulutli saqlashga yuklanadi</div>
                </div>
              </div>
            </div>

            <div style="display:flex;gap:10px;flex-wrap:wrap;padding-top:6px">
              <button class="btn btn-primary" type="submit" id="sub-btn">${icon('check-circle', 16)} Tasdiqlashga yuborish</button>
              <button class="btn btn-secondary" type="button" id="cancel-add-btn">Bekor qilish</button>
            </div>
          </form>
        </div>

        <div class="card" style="height:fit-content">
          <div class="card-header">
            <div>
              <h3 class="card-title">Yuborish qoidalari</h3>
              <p class="card-subtitle">Ariza tez tasdiqlanishi uchun tavsiyalar</p>
            </div>
          </div>
          <div style="display:flex;flex-direction:column;gap:12px;font-size:13px;color:var(--text-2)">
            <div style="display:flex;gap:10px;align-items:flex-start">
              <span style="color:var(--primary)">${icon('check-circle', 16)}</span>
              <span>Har bir mezon bo‘yicha ballar 26-AF buyruq limitigacha jamlanadi.</span>
            </div>
            <div style="display:flex;gap:10px;align-items:flex-start">
              <span style="color:var(--primary)">${icon('paperclip', 16)}</span>
              <span>Diplom, sertifikat yoki buyruq nusxasini PDF/rasm ko‘rinishida biriktirish tavsiya etiladi.</span>
            </div>
            <div style="display:flex;gap:10px;align-items:flex-start">
              <span style="color:var(--primary)">${icon('clock', 16)}</span>
              <span>Mas’ul ekspert tasdiqlagandan so‘ng ball avtomatik ravishda reytingga qo‘shiladi.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  $('#add-crit-link').onclick = () => ctx.navigate('criteria');
  $('#cancel-add-btn').onclick = () => ctx.navigate('my_results');

  const dz = $('#af-dropzone');
  const fileInp = $('#af-file');
  const fileLabel = $('#af-file-label');

  const showSelectedFile = f => {
    if (!f) {
      fileLabel.textContent = 'Faylni shu yerga tashlang yoki tanlash uchun bosing';
      return;
    }
    const sizeKb = Math.round(f.size / 1024);
    fileLabel.innerHTML = `Tanlangan fayl: <b>${esc(f.name)}</b> (${sizeKb >= 1024 ? (sizeKb / 1024).toFixed(1) + ' MB' : sizeKb + ' KB'})`;
  };

  dz.onclick = () => fileInp.click();
  dz.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInp.click(); } };
  dz.ondragover = e => { e.preventDefault(); dz.classList.add('dragover'); };
  dz.ondragleave = () => dz.classList.remove('dragover');
  dz.ondrop = e => {
    e.preventDefault();
    dz.classList.remove('dragover');
    if (e.dataTransfer.files?.length) {
      fileInp.files = e.dataTransfer.files;
      showSelectedFile(fileInp.files[0]);
    }
  };
  fileInp.onchange = () => showSelectedFile(fileInp.files[0]);

  function updatePtsPreview() {
    const id = Number($('#ai').value);
    const ind = IMAP[id];
    const selType = $('#at').selectedOptions[0];
    const box = $('#pts-preview-box');
    if (!ind || !selType) {
      box.style.display = 'none';
      return;
    }
    const qty = Math.max(1, Number($('#aq').value) || 1);
    const raw = Number(selType.dataset.pts) * qty;
    const capped = Math.min(raw, ind.max);
    box.style.display = 'flex';
    $('#pts-preview').textContent = raw > ind.max
      ? `+${capped} ball (limit: ${ind.max})`
      : `+${capped} ball`;
  }

  $('#ai').onchange = () => {
    const id = Number($('#ai').value);
    const ind = IMAP[id];
    if (!ind) {
      $('#at-wrap').style.display = 'none';
      $('#pts-preview-box').style.display = 'none';
      return;
    }
    $('#at-wrap').style.display = 'flex';
    $('#at').innerHTML = ind.types.map(t => `<option value="${esc(t[0])}" data-pts="${t[1]}">${esc(t[0])} — +${t[1]} ball</option>`).join('');
    $('#adoc').innerHTML = `
      ${icon('file-text', 16)}
      <div>
        <div><b>Kerakli hujjat:</b> ${esc(ind.doc)}</div>
        <div style="margin-top:2px"><b>Mas’ul baholovchi:</b> ${esc(ind.respStr)}</div>
      </div>
    `;
    updatePtsPreview();
  };

  $('#at').onchange = updatePtsPreview;
  $('#aq').oninput = updatePtsPreview;

  $('#af').onsubmit = async e => {
    e.preventDefault();
    const indId = Number($('#ai').value);
    const ind = IMAP[indId];
    if (!ind) return toast('Iltimos, baholash mezonini tanlang.', 'warning');

    const selType = $('#at').selectedOptions[0];
    const qty = Math.max(1, Number($('#aq').value) || 1);
    const pts = Math.min(Number(selType.dataset.pts) * qty, ind.max);
    const descr = $('#ad').value.trim();
    if (!descr) return toast('Iltimos, yutuq tavsifini kiriting.', 'warning');

    const f = fileInp.files[0];
    const btn = $('#sub-btn');
    btn.disabled = true;
    btn.innerHTML = `${icon('refresh-cw', 15)} Yuborilmoqda…`;

    try {
      let fname = null;
      let fpath = null;
      if (f) {
        if (f.size > 15 * 1024 * 1024) throw new Error('Fayl hajmi 15 MB dan oshmasligi kerak.');
        btn.innerHTML = `${icon('upload-cloud', 15)} Hujjat yuklanmoqda…`;
        const up = await api.uploadProofFile(f);
        fname = up.fname;
        fpath = up.fpath;
      }

      btn.innerHTML = `${icon('refresh-cw', 15)} Saqlanmoqda…`;
      await api.insertEntry({
        uid: me.id,
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

      toast('Yutuq muvaffaqiyatli yuborildi va tekshiruvga qo‘yildi.', 'success');
      await ctx.refresh();
      ctx.navigate('my_results');
    } catch (err) {
      toast('Xatolik: ' + err.message, 'error');
      btn.disabled = false;
      btn.innerHTML = `${icon('check-circle', 16)} Tasdiqlashga yuborish`;
    }
  };
}

/* ==========================================================================
   BAHOLASH VA TASDIQLASH NAVBATI (Director & Reviewer)
   ========================================================================== */
export function renderReviews(el, ctx) {
  const { me, users, entries } = ctx;
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

  const q = revState.search.trim().toLowerCase();
  const filtered = scopedEntries.filter(e => {
    if (revState.status !== 'all' && e.status !== revState.status) return false;
    if (revState.ind !== 'all' && String(e.ind) !== revState.ind) return false;
    if (q) {
      const u = users.find(x => x.id === e.uid);
      const ind = IMAP[e.ind];
      const hay = `${u?.name || ''} ${u?.subject || ''} ${ind?.name || ''} ${e.type || ''} ${e.descr || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  el.innerHTML = `
    <div class="stack-v">
      <div class="page-header">
        <div>
          <h1 class="page-title">Baholash va tasdiqlash</h1>
          <p class="page-desc">
            ${isDirector
              ? 'Maktab direktori sifatida barcha 15 ta indikator bo‘yicha arizalarni tasdiqlash huquqi.'
              : `Mas’ul ekspert (${esc(me.name)}) ga biriktirilgan mezonlar bo‘yicha arizalar.`}
          </p>
        </div>
      </div>

      <div class="card">
        <div class="filter-bar">
          <div class="tabs-pill" role="tablist">
            <button type="button" class="tab-btn ${revState.status === 'pending' ? 'active' : ''}" data-rev-st="pending">
              Kutilmoqda <span class="tab-count">${counts.pending}</span>
            </button>
            <button type="button" class="tab-btn ${revState.status === 'approved' ? 'active' : ''}" data-rev-st="approved">
              Tasdiqlangan <span class="tab-count">${counts.approved}</span>
            </button>
            <button type="button" class="tab-btn ${revState.status === 'rejected' ? 'active' : ''}" data-rev-st="rejected">
              Rad etilgan <span class="tab-count">${counts.rejected}</span>
            </button>
            <button type="button" class="tab-btn ${revState.status === 'all' ? 'active' : ''}" data-rev-st="all">
              Barchasi <span class="tab-count">${counts.all}</span>
            </button>
          </div>

          <div class="filter-controls" style="justify-content:flex-end">
            <div class="input-icon-wrap" style="min-width:200px;max-width:260px">
              <span class="input-leading">${icon('search', 15)}</span>
              <input id="rev-search" class="input has-leading" type="search" value="${esc(revState.search)}" placeholder="Pedagog yoki tavsif…">
            </div>
            <select id="rev-ind" class="input" style="width:auto;max-width:240px">
              <option value="all">Barcha mezonlar</option>
              ${IND.filter(i => isDirector || i.resp.includes(me.name)).map(i => `
                <option value="${i.id}" ${revState.ind === String(i.id) ? 'selected' : ''}>${i.id}. ${esc(i.name)}</option>
              `).join('')}
            </select>
          </div>
        </div>

        ${filtered.length === 0
          ? emptyStateHtml({
              iconName: 'check-circle',
              title: revState.status === 'pending' ? 'Kutayotgan arizalar yo‘q' : 'Arizalar topilmadi',
              desc: revState.status === 'pending'
                ? 'Hozirda tekshirish uchun yangi arizalar mavjud emas.'
                : 'Tanlangan filtrlar bo‘yicha natija topilmadi.'
            })
          : `
            <div class="table-wrap desktop-table-only">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Sana</th>
                    <th>Pedagog</th>
                    <th>Mezon</th>
                    <th>Yutuq va tavsif</th>
                    <th>Ball</th>
                    <th>Hujjat</th>
                    <th>Holat</th>
                    <th style="text-align:right">Amallar</th>
                  </tr>
                </thead>
                <tbody>
                  ${filtered.map(e => {
                    const u = users.find(x => x.id === e.uid);
                    const ind = IMAP[e.ind];
                    const isOwn = e.uid === me.id;
                    return `
                      <tr>
                        <td style="white-space:nowrap">${formatDateUz(e.date)}</td>
                        <td>
                          <div style="display:flex;align-items:center;gap:8px">
                            ${avatarHtml(u?.name || '?', 'sm')}
                            <div>
                              <div style="font-weight:600">${esc(u ? u.name : 'Noma’lum')}</div>
                              <div style="font-size:12px;color:var(--text-muted)">${esc(u?.subject || '')}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div style="font-weight:600">${e.ind}. ${esc(ind?.name || '')}</div>
                          <div style="font-size:11.5px;color:var(--text-muted)">Mas’ul: ${esc(ind?.respStr || '')}</div>
                        </td>
                        <td>
                          <div style="font-weight:500">${esc(e.type)} × ${e.qty}</div>
                          <div style="font-size:12px;color:var(--text-muted)">${esc(e.descr)}</div>
                          ${e.note ? `<div style="font-size:11.5px;color:var(--error);margin-top:2px">Izoh: ${esc(e.note)}</div>` : ''}
                        </td>
                        <td><b style="color:var(--primary)">+${e.pts}</b></td>
                        <td>${e.fpath ? `<a href="${esc(e.fpath)}" target="_blank" rel="noopener" class="btn btn-secondary btn-sm">${icon('external-link', 13)} Ko‘rish</a>` : '—'}</td>
                        <td>${badgeStatus(e.status)}</td>
                        <td style="text-align:right">
                          ${isOwn && !isDirector
                            ? '<span style="font-size:11.5px;color:var(--warning)">O‘zingizniki</span>'
                            : `
                              <div style="display:inline-flex;gap:6px">
                                ${e.status !== 'approved' ? `<button type="button" class="btn btn-success btn-sm" data-rev-act="approved" data-rev-id="${e.id}">${icon('check', 14)} Tasdiqlash</button>` : ''}
                                ${e.status !== 'rejected' ? `<button type="button" class="btn btn-danger btn-sm" data-rev-act="rejected" data-rev-id="${e.id}">${icon('x', 14)} Rad etish</button>` : ''}
                              </div>
                            `}
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>

            <div class="mobile-card-list">
              ${filtered.map(e => {
                const u = users.find(x => x.id === e.uid);
                const ind = IMAP[e.ind];
                const isOwn = e.uid === me.id;
                return `
                  <div class="card card-compact" style="box-shadow:none">
                    <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px">
                      <span style="font-size:12px;color:var(--text-muted)">${formatDateUz(e.date)}</span>
                      ${badgeStatus(e.status)}
                    </div>
                    <div style="font-weight:600;font-size:14px">${esc(u ? u.name : 'Noma’lum')}</div>
                    <div style="font-size:12px;color:var(--text-muted);margin-bottom:6px">${e.ind}. ${esc(ind?.name || '')}</div>
                    <div style="font-size:13px">${esc(e.type)} × ${e.qty} · <b style="color:var(--primary)">+${e.pts} ball</b></div>
                    <div style="font-size:12.5px;color:var(--text-muted);margin-top:4px">${esc(e.descr)}</div>
                    ${e.fpath ? `<div style="margin-top:8px"><a href="${esc(e.fpath)}" target="_blank" rel="noopener" class="btn btn-secondary btn-sm">${icon('external-link', 13)} Tasdiqlovchi hujjat</a></div>` : ''}
                    ${!(isOwn && !isDirector) ? `
                      <div style="display:flex;gap:8px;margin-top:12px">
                        ${e.status !== 'approved' ? `<button type="button" class="btn btn-success" style="flex:1" data-rev-act="approved" data-rev-id="${e.id}">Tasdiqlash</button>` : ''}
                        ${e.status !== 'rejected' ? `<button type="button" class="btn btn-danger" style="flex:1" data-rev-act="rejected" data-rev-id="${e.id}">Rad etish</button>` : ''}
                      </div>
                    ` : ''}
                  </div>
                `;
              }).join('')}
            </div>
          `}
      </div>
    </div>
  `;

  $$('[data-rev-st]').forEach(btn => {
    btn.onclick = () => { revState.status = btn.dataset.revSt; renderReviews(el, ctx); };
  });

  const sInp = $('#rev-search');
  sInp.oninput = () => {
    const pos = sInp.selectionStart;
    revState.search = sInp.value;
    renderReviews(el, ctx);
    const ni = $('#rev-search');
    if (ni) { ni.focus(); ni.setSelectionRange(pos, pos); }
  };

  $('#rev-ind').onchange = e => { revState.ind = e.target.value; renderReviews(el, ctx); };

  $$('[data-rev-act]').forEach(btn => {
    btn.onclick = () => {
      const id = Number(btn.dataset.revId);
      const status = btn.dataset.revAct;
      const entry = entries.find(x => x.id === id);
      if (!entry) return;
      const owner = users.find(u => u.id === entry.uid);
      const ind = IMAP[entry.ind];
      const isApprove = status === 'approved';

      openModal({
        title: isApprove ? 'Yutuqni tasdiqlash' : 'Arizani rad etish',
        bodyHtml: `
          <div class="stack-v" style="gap:14px">
            <div style="padding:12px 14px;border-radius:10px;background:var(--bg-subtle);border:1px solid var(--border)">
              <div style="font-weight:600">${esc(owner?.name || 'Pedagog')} · <span style="color:var(--primary)">+${entry.pts} ball</span></div>
              <div style="font-size:12.5px;color:var(--text-muted);margin-top:3px">${entry.ind}. ${esc(ind?.name || '')} — ${esc(entry.type)} × ${entry.qty}</div>
              <div style="font-size:13px;margin-top:6px">${esc(entry.descr)}</div>
            </div>
            <div class="field">
              <label for="rev-note">${isApprove ? 'Izoh (ixtiyoriy)' : 'Rad etish sababi (majburiy)'}</label>
              <textarea id="rev-note" class="input" rows="3" placeholder="${isApprove ? 'Masalan: Hujjatlar to‘liq tekshirildi…' : 'Masalan: Sertifikat sanasi yoki muhri ko‘rinmayapti…'}">${esc(entry.note || '')}</textarea>
            </div>
          </div>
        `,
        footerHtml: `
          <button type="button" class="btn btn-secondary" id="rev-m-cancel">Bekor qilish</button>
          <button type="button" class="btn ${isApprove ? 'btn-success' : 'btn-danger'}" id="rev-m-ok">
            ${isApprove ? 'Tasdiqlash' : 'Rad etish'}
          </button>
        `,
        onMount: panel => {
          panel.querySelector('#rev-m-cancel').onclick = closeModal;
          panel.querySelector('#rev-m-ok').onclick = async () => {
            const note = panel.querySelector('#rev-note').value.trim();
            if (!isApprove && !note) {
              return toast('Iltimos, rad etish sababini kiriting.', 'warning');
            }
            const okBtn = panel.querySelector('#rev-m-ok');
            okBtn.disabled = true;
            okBtn.textContent = 'Saqlanmoqda…';
            try {
              await api.updateEntry(id, { status, note, rev: me.id });
              closeModal();
              toast(isApprove ? 'Ariza tasdiqlandi.' : 'Ariza rad etildi.', isApprove ? 'success' : 'info');
              await ctx.refresh();
            } catch (err) {
              toast('Xatolik: ' + err.message, 'error');
              okBtn.disabled = false;
              okBtn.textContent = isApprove ? 'Tasdiqlash' : 'Rad etish';
            }
          };
        }
      });
    };
  });
}

/* ==========================================================================
   BAHOLASH MEZONLARI (26-AF Decree 15 Indicators Explorer)
   ========================================================================== */
export function renderCriteria(el, ctx) {
  const highlightId = ctx.params?.highlightInd || null;
  const q = critState.search.trim().toLowerCase();

  const filtered = IND.filter(i => {
    if (critState.sec !== 'all' && i.sec !== critState.sec) return false;
    if (q) {
      const hay = `${i.id} ${i.name} ${i.doc} ${i.respStr} ${i.types.map(t => t[0]).join(' ')}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  el.innerHTML = `
    <div class="stack-v">
      <div class="page-header">
        <div>
          <h1 class="page-title">Baholash mezonlari (26-AF buyruq)</h1>
          <p class="page-desc">3 ta bo‘lim, 15 ta indikator va jami 130 ballik baholash tizimi.</p>
        </div>
        ${['teacher', 'reviewer'].includes(ctx.me.role)
          ? `<div class="page-actions"><button type="button" class="btn btn-primary" id="crit-add-btn">${icon('plus', 15)} Yutuq kiritish</button></div>`
          : ''}
      </div>

      <div class="grid-3">
        <div class="card card-compact">
          <span class="badge badge-primary">A bo‘lim · 50 ball</span>
          <div style="font-size:15px;font-weight:600;margin-top:8px">${SEC.A[0]}</div>
          <div style="font-size:12.5px;color:var(--text-muted);margin-top:3px">1–7 indikatorlar · Ilmiy daraja, toifa, sertifikatlar, metodik ishlar</div>
        </div>
        <div class="card card-compact">
          <span class="badge badge-success">B bo‘lim · 30 ball</span>
          <div style="font-size:15px;font-weight:600;margin-top:8px">${SEC.B[0]}</div>
          <div style="font-size:12.5px;color:var(--text-muted);margin-top:3px">14–17 indikatorlar · Olimpiada, sertifikat, STEAM va sport yutuqlari</div>
        </div>
        <div class="card card-compact">
          <span class="badge badge-warning">C bo‘lim · 50 ball</span>
          <div style="font-size:15px;font-weight:600;margin-top:8px">${SEC.C[0]}</div>
          <div style="font-size:12.5px;color:var(--text-muted);margin-top:3px">18–21 indikatorlar · CHSB o‘zlashtirish, tadbirlar va fan faolligi</div>
        </div>
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

        ${filtered.length === 0
          ? emptyStateHtml({ iconName: 'book-open', title: 'Mezon topilmadi', desc: 'Qidiruv so‘zini o‘zgartirib ko‘ring.' })
          : `
            <div class="grid-2">
              ${filtered.map(i => `
                <div class="card card-compact" style="box-shadow:none;${highlightId === i.id ? 'border-color:var(--primary);box-shadow:0 0 0 3px var(--primary-glow)' : ''}">
                  <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:10px">
                    <div>
                      <span class="badge ${i.sec === 'A' ? 'badge-primary' : (i.sec === 'B' ? 'badge-success' : 'badge-warning')}">${i.sec}-${i.id}</span>
                      <h4 style="font-size:15px;font-weight:600;margin-top:6px">${esc(i.name)}</h4>
                    </div>
                    <span class="badge badge-neutral" style="font-weight:700">Maks: ${i.max} ball</span>
                  </div>

                  <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:12px">
                    ${i.types.map(t => `
                      <div style="display:flex;justify-content:space-between;font-size:13px;padding:6px 10px;border-radius:8px;background:var(--bg-subtle)">
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
          `}
      </div>
    </div>
  `;

  const addBtn = $('#crit-add-btn');
  if (addBtn) addBtn.onclick = () => ctx.navigate('add_entry');

  $$('[data-csec]').forEach(btn => {
    btn.onclick = () => { critState.sec = btn.dataset.csec; renderCriteria(el, ctx); };
  });

  const sInp = $('#crit-search');
  sInp.oninput = () => {
    const pos = sInp.selectionStart;
    critState.search = sInp.value;
    renderCriteria(el, ctx);
    const ni = $('#crit-search');
    if (ni) { ni.focus(); ni.setSelectionRange(pos, pos); }
  };
}
