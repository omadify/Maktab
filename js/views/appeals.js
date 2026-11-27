// NEW MODULE 2: Murojaatlar va apellyatsiyalar (Appeals & Requests Management)
import { IND, IMAP, ROLE } from '../config.js';
import { api, validateProofFile } from '../api.js';
import { icon } from '../icons.js';
import { $, $$, esc, toast, openModal, openDetailDrawer, closeModal, avatarHtml, emptyStateHtml, formatDateTimeTashkent } from '../ui.js';
import { syncLiquidPills } from '../motion.js';

let apState = { status: 'all', search: '', selectedId: null };

export function resetAppealsViewState() {
  apState = { status: 'all', search: '', selectedId: null };
}

const APPEAL_STATUSES = {
  new: { label: 'Yangi', cls: 'badge-primary' },
  in_review: { label: 'Ko‘rib chiqilmoqda', cls: 'badge-warning' },
  needs_info: { label: 'Qo‘shimcha ma’lumot kerak', cls: 'badge-warning' },
  resolved: { label: 'Hal qilindi', cls: 'badge-success' },
  rejected: { label: 'Rad etildi', cls: 'badge-error' }
};

const CATEGORIES = {
  evaluation_review: 'Baholash qarorini qayta ko‘rib chiqish',
  clarification: 'Mezon yuzasidan tushuntirish so‘rash',
  technical: 'Hujjat yoki texnik masala'
};

function appealBadge(status) {
  const st = APPEAL_STATUSES[status] || APPEAL_STATUSES.new;
  return `<span class="badge ${st.cls}">${esc(st.label)}</span>`;
}

export function renderAppeals(el, ctx) {
  const { me, users, entries, appeals } = ctx;
  const userMap = new Map(users.map(u => [u.id, u]));
  const isStaff = ['director', 'reviewer'].includes(me.role);
  const canCreate = me.role === 'teacher';

  if (!appeals?.available) {
    el.innerHTML = `
      <div class="stack-v">
        <div class="page-header">
          <div>
            <h1 class="page-title">Murojaatlar va apellyatsiyalar</h1>
            <p class="page-desc">Baholash qarorlari yuzasidan rasmiy tushuntirish va apellyatsiya markazi.</p>
          </div>
          <div class="page-actions">
            <button type="button" class="btn btn-secondary" id="ap-refresh">${icon('refresh-cw', 15)} Tekshirish</button>
          </div>
        </div>
        <div class="card">
          ${emptyStateHtml({
            iconName: 'message-square',
            title: 'Murojaatlar moduli migratsiyani kutmoqda',
            desc: 'Murojaat va apellyatsiya yozuvlari serverda xavfsiz saqlanishi uchun supabase/migrations/20261127_v6_platform_upgrade.sql migratsiyasini qo‘llang.'
          })}
        </div>
      </div>
    `;
    $('#ap-refresh').onclick = () => ctx.refresh();
    return;
  }

  const rows = appeals.rows || [];
  const counts = {
    all: rows.length,
    open: rows.filter(r => ['new', 'in_review', 'needs_info'].includes(r.status)).length,
    resolved: rows.filter(r => r.status === 'resolved').length,
    rejected: rows.filter(r => r.status === 'rejected').length
  };

  el.innerHTML = `
    <div class="stack-v">
      <div class="page-header">
        <div>
          <h1 class="page-title">Murojaatlar va apellyatsiyalar</h1>
          <p class="page-desc">Pedagog murojaatlari, tushuntirish so‘rovlari va ekspert javoblari. Apellyatsiya rasmiy ballni avtomatik o‘zgartirmaydi.</p>
        </div>
        <div class="page-actions">
          ${canCreate ? `<button type="button" class="btn btn-primary" id="ap-new-btn">${icon('plus', 15)} Yangi murojaat</button>` : ''}
        </div>
      </div>

      <div class="card card-compact">
        <div class="filter-bar" style="margin-bottom:0">
          <div class="tabs-pill">
            <button type="button" class="tab-btn ${apState.status === 'all' ? 'active' : ''}" data-apst="all">Barchasi <span class="tab-count">${counts.all}</span></button>
            <button type="button" class="tab-btn ${apState.status === 'open' ? 'active' : ''}" data-apst="open">Ochiq <span class="tab-count">${counts.open}</span></button>
            <button type="button" class="tab-btn ${apState.status === 'resolved' ? 'active' : ''}" data-apst="resolved">Hal qilindi <span class="tab-count">${counts.resolved}</span></button>
            <button type="button" class="tab-btn ${apState.status === 'rejected' ? 'active' : ''}" data-apst="rejected">Rad etildi <span class="tab-count">${counts.rejected}</span></button>
          </div>
          <div class="input-icon-wrap" style="min-width:200px;max-width:280px;flex:1">
            <span class="input-leading">${icon('search', 15)}</span>
            <input id="ap-search" class="input has-leading" type="search" value="${esc(apState.search)}" placeholder="Mavzu yoki pedagog…">
          </div>
        </div>
      </div>

      <div id="ap-split-zone"></div>
    </div>
  `;

  function buildCaseDetailHtml(ap) {
    const owner = userMap.get(ap.uid);
    const msgs = ap.messages || [];
    const linkedEntry = ap.entry_id ? entries.find(e => e.id === ap.entry_id) : null;
    const canManageCase = me.role === 'director' || (me.role === 'reviewer' && ap.uid !== me.id);

    return `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;padding-bottom:14px;border-bottom:1px solid var(--border)">
        <div style="display:flex;align-items:center;gap:12px">
          ${avatarHtml(ap.user_name || owner?.name || '?', 'lg', owner?.avatar_url)}
          <div>
            <div style="font-size:16px;font-weight:700">${esc(ap.subject)}</div>
            <div style="font-size:12.5px;color:var(--text-muted)">${esc(ap.user_name || owner?.name || '')} · ${formatDateTimeTashkent(ap.created_at)}</div>
          </div>
        </div>
        <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
          ${appealBadge(ap.status)}
          ${ap.escalated_to_director ? `<span class="badge badge-error">${icon('flag', 12)} Direktorga yo‘naltirilgan</span>` : ''}
        </div>
      </div>

      <div class="stack-v" style="gap:14px;margin-top:16px">
        <div style="padding:12px 14px;border-radius:12px;background:var(--surface-soft);border:1px solid var(--border);font-size:13px">
          <div><b>Toifa:</b> ${esc(CATEGORIES[ap.category] || ap.category)}</div>
          ${ap.ind ? `<div style="margin-top:3px"><b>Indikator:</b> ${ap.ind}. ${esc(IMAP[ap.ind]?.name || '')}</div>` : ''}
          ${linkedEntry ? `<div style="margin-top:3px"><b>Bog‘langan ariza:</b> ${esc(linkedEntry.type)} (+${linkedEntry.pts} ball · ${linkedEntry.status})</div>` : ''}
          <div style="margin-top:8px;color:var(--text);line-height:1.55">${esc(ap.message)}</div>
          ${ap.attachment_url ? `<div style="margin-top:8px"><a href="${esc(ap.attachment_url)}" target="_blank" rel="noopener" class="btn btn-secondary btn-sm">${icon('paperclip', 13)} ${esc(ap.attachment_name || 'Ilova hujjat')}</a></div>` : ''}
        </div>

        ${ap.resolution_note ? `
          <div class="form-alert info">
            ${icon('info', 16)}
            <div><b>Yakuniy qaror izohi:</b> ${esc(ap.resolution_note)}</div>
          </div>
        ` : ''}

        <!-- Response Thread -->
        <div>
          <div style="font-size:12.5px;font-weight:600;color:var(--text-muted);margin-bottom:8px">Muhokama va javoblar (${msgs.length})</div>
          ${msgs.length === 0
            ? `<p style="font-size:13px;color:var(--text-muted);margin:0">Hozircha javoblar yozilmagan.</p>`
            : `<div class="stack-v" style="gap:8px;max-height:260px;overflow-y:auto">
                ${msgs.map(m => `
                  <div style="padding:10px 12px;border-radius:11px;background:${m.sender_uid === me.id ? 'var(--primary-soft)' : 'var(--surface-soft)'};border:1px solid ${m.sender_uid === me.id ? 'var(--primary-border)' : 'var(--border)'}">
                    <div style="display:flex;justify-content:space-between;gap:8px;font-size:12px">
                      <span><b>${esc(m.sender_name)}</b> <span style="color:var(--text-muted)">(${esc(ROLE[m.sender_role] || m.sender_role)})</span></span>
                      <span style="color:var(--text-muted)">${formatDateTimeTashkent(m.created_at)}</span>
                    </div>
                    <div style="font-size:13px;margin-top:4px;line-height:1.5">${esc(m.body)}</div>
                  </div>
                `).join('')}
              </div>`}
        </div>

        <form id="ap-reply-form" style="display:flex;gap:8px;align-items:flex-end">
          <div class="field" style="flex:1">
            <label for="ap-reply-txt">Javob yoki qo‘shimcha izoh</label>
            <textarea id="ap-reply-txt" class="input" rows="2" placeholder="Rasmiy javob yoki aniqlashtiruvchi savol yozing…"></textarea>
          </div>
          <button type="submit" class="btn btn-primary" id="ap-reply-btn">${icon('send', 15)} Yuborish</button>
        </form>

        ${canManageCase ? `
          <div style="padding-top:12px;border-top:1px solid var(--border)">
            <div style="font-size:12.5px;font-weight:600;color:var(--text-muted);margin-bottom:8px">Holatni boshqarish</div>
            <div style="display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;margin-bottom:8px">
              <select id="ap-st-sel" class="input">
                ${Object.entries(APPEAL_STATUSES).map(([k, v]) => `<option value="${k}" ${ap.status === k ? 'selected' : ''}>${esc(v.label)}</option>`).join('')}
              </select>
              ${me.role === 'reviewer' && !ap.escalated_to_director ? `
                <label style="display:inline-flex;align-items:center;gap:6px;font-size:12.5px;cursor:pointer;white-space:nowrap">
                  <input id="ap-esc-chk" type="checkbox" class="checkbox"> Direktorga oshirish
                </label>
              ` : ''}
            </div>
            <div style="display:flex;gap:8px;align-items:center">
              <input id="ap-res-note" class="input" type="text" value="${esc(ap.resolution_note || '')}" placeholder="Qaror bo‘yicha qisqacha izoh…">
              <button type="button" class="btn btn-secondary" id="ap-st-save">${icon('check', 15)} Saqlash</button>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  function bindCaseHandlers(container, ap, onDone) {
    const replyForm = $('#ap-reply-form', container);
    if (replyForm) {
      replyForm.onsubmit = async e => {
        e.preventDefault();
        const txt = $('#ap-reply-txt', container).value.trim();
        if (txt.length < 2) return toast('Xabar matnini kiriting.', 'warning');
        const btn = $('#ap-reply-btn', container);
        btn.disabled = true;
        try {
          await api.addAppealMessage(ap.id, txt);
          toast('Javob yuborildi.', 'success');
          if (onDone) onDone();
          await ctx.refresh();
        } catch (err) {
          toast(err.message, 'error');
          btn.disabled = false;
        }
      };
    }

    const stBtn = $('#ap-st-save', container);
    if (stBtn) {
      stBtn.onclick = async () => {
        stBtn.disabled = true;
        try {
          const st = $('#ap-st-sel', container).value;
          const note = $('#ap-res-note', container).value.trim();
          const escDir = Boolean($('#ap-esc-chk', container)?.checked);
          await api.updateAppealStatus(ap.id, st, note, escDir);
          toast('Murojaat holati yangilandi.', 'success');
          if (onDone) onDone();
          await ctx.refresh();
        } catch (err) {
          toast(err.message, 'error');
          stBtn.disabled = false;
        }
      };
    }
  }

  function drawSplit() {
    const q = apState.search.trim().toLowerCase();
    const filtered = rows.filter(r => {
      if (apState.status === 'open' && !['new', 'in_review', 'needs_info'].includes(r.status)) return false;
      if (['resolved', 'rejected'].includes(apState.status) && r.status !== apState.status) return false;
      if (q) {
        const hay = `${r.subject} ${r.message} ${r.user_name || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const zone = $('#ap-split-zone');
    if (filtered.length === 0) {
      zone.innerHTML = `<div class="card">${emptyStateHtml({
        iconName: 'message-square',
        title: 'Murojaatlar topilmadi',
        desc: canCreate ? 'Baholash bo‘yicha savolingiz yoki apellyatsiyangiz bo‘lsa, “Yangi murojaat” tugmasini bosing.' : 'Hozircha ko‘rib chiqish uchun murojaatlar yo‘q.'
      })}</div>`;
      return;
    }

    if (!filtered.some(r => r.id === apState.selectedId)) {
      apState.selectedId = filtered[0].id;
    }
    const sel = filtered.find(r => r.id === apState.selectedId) || filtered[0];

    zone.innerHTML = `
      <div class="review-split">
        <div class="review-queue-list">
          ${filtered.map(a => `
            <button type="button" class="review-queue-item ${a.id === sel.id ? 'active' : ''}" data-ap-id="${a.id}">
              <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:4px">
                <span style="font-size:13.5px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(a.subject)}</span>
                ${appealBadge(a.status)}
              </div>
              <div style="font-size:12px;color:var(--text-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(a.user_name || '')} · ${esc(CATEGORIES[a.category] || a.category)}</div>
              <div style="display:flex;justify-content:space-between;margin-top:6px;font-size:11.5px;color:var(--text-muted)">
                <span>${formatDateTimeTashkent(a.updated_at)}</span>
                <span>${(a.messages || []).length} javob</span>
              </div>
            </button>
          `).join('')}
        </div>

        <div class="card hide-xs" id="ap-detail-pane">${buildCaseDetailHtml(sel)}</div>
      </div>
    `;

    const pane = $('#ap-detail-pane', zone);
    if (pane) bindCaseHandlers(pane, sel);

    $$('[data-ap-id]', zone).forEach(btn => {
      btn.onclick = () => {
        const id = Number(btn.dataset.apId);
        apState.selectedId = id;
        const picked = filtered.find(x => x.id === id);
        if (window.innerWidth < 768 && picked) {
          openDetailDrawer({
            title: picked.subject,
            subtitle: picked.user_name || '',
            bodyHtml: buildCaseDetailHtml(picked),
            onMount: panel => bindCaseHandlers(panel, picked, () => closeModal(true))
          });
        } else {
          drawSplit();
        }
      };
    });
  }

  function openNewAppealModal(preEntryId = null) {
    const myEntries = entries.filter(e => e.uid === me.id);
    let attachedFile = null;

    openModal({
      title: 'Yangi murojaat / apellyatsiya',
      subtitle: 'Rasmiy tushuntirish so‘rash yoki qaror yuzasidan asosli e’tiroz bildirish',
      bodyHtml: `
        <div class="stack-v" style="gap:14px">
          <div class="field">
            <label for="na-cat">Murojaat toifasi</label>
            <select id="na-cat" class="input">
              ${Object.entries(CATEGORIES).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label for="na-entry">Bog‘liq yutuq (ixtiyoriy)</label>
            <select id="na-entry" class="input">
              <option value="">— Umumiy murojaat —</option>
              ${myEntries.map(e => `<option value="${e.id}" ${Number(preEntryId) === e.id ? 'selected' : ''}>${e.ind}. ${esc(IMAP[e.ind]?.name || '')} — ${esc(e.type)} (${e.status})</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label for="na-ind">Mezon (Indikator)</label>
            <select id="na-ind" class="input">
              <option value="">— Tanlanmagan —</option>
              ${IND.map(i => `<option value="${i.id}">${i.id}. ${esc(i.name)}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label for="na-subj">Mavzu</label>
            <input id="na-subj" class="input" maxlength="180" placeholder="Masalan: IELTS sertifikati bo‘yicha ballarni aniqlashtirish" required>
          </div>
          <div class="field">
            <label for="na-msg">Batafsil izoh</label>
            <textarea id="na-msg" class="input" rows="4" maxlength="2000" placeholder="Asoslar va savolingizni aniq bayon qiling…" required></textarea>
          </div>
          <div class="field">
            <label>Qo‘shimcha hujjat (ixtiyoriy, PDF/JPG/PNG)</label>
            <input id="na-file" type="file" accept=".pdf,.jpg,.jpeg,.png" class="input">
          </div>
        </div>
      `,
      footerHtml: `<button type="button" class="btn btn-secondary" id="na-cancel">Bekor qilish</button><button type="button" class="btn btn-primary" id="na-send">${icon('send', 15)} Yuborish</button>`,
      onMount: panel => {
        const entrySel = panel.querySelector('#na-entry');
        const indSel = panel.querySelector('#na-ind');
        const syncIndFromEntry = () => {
          const eid = Number(entrySel.value);
          const found = myEntries.find(x => x.id === eid);
          if (found) indSel.value = String(found.ind);
        };
        entrySel.onchange = syncIndFromEntry;
        if (preEntryId) syncIndFromEntry();

        panel.querySelector('#na-file').onchange = async e => {
          const f = e.target.files[0];
          if (!f) { attachedFile = null; return; }
          try {
            await validateProofFile(f);
            attachedFile = f;
          } catch (err) {
            toast(err.message, 'error');
            e.target.value = '';
            attachedFile = null;
          }
        };

        panel.querySelector('#na-cancel').onclick = () => closeModal(true);
        panel.querySelector('#na-send').onclick = async () => {
          const subject = panel.querySelector('#na-subj').value.trim();
          const message = panel.querySelector('#na-msg').value.trim();
          if (subject.length < 3 || message.length < 5) {
            return toast('Mavzu va murojaat matnini to‘liq kiriting.', 'warning');
          }
          const btn = panel.querySelector('#na-send');
          btn.disabled = true;
          btn.textContent = 'Yuborilmoqda…';
          try {
            let attName = null;
            let attUrl = null;
            if (attachedFile) {
              const up = await api.uploadProofFile(attachedFile);
              attName = up.fname;
              attUrl = up.fpath;
            }
            await api.createAppeal({
              entry_id: entrySel.value ? Number(entrySel.value) : null,
              ind: indSel.value ? Number(indSel.value) : null,
              category: panel.querySelector('#na-cat').value,
              subject,
              message,
              attachment_name: attName,
              attachment_url: attUrl
            });
            closeModal(true);
            toast('Murojaat yuborildi.', 'success');
            await ctx.refresh();
          } catch (err) {
            toast(err.message, 'error');
            btn.disabled = false;
            btn.innerHTML = `${icon('send', 15)} Yuborish`;
          }
        };
      }
    });
  }

  const newBtn = $('#ap-new-btn');
  if (newBtn) newBtn.onclick = () => openNewAppealModal(null);

  $$('[data-apst]').forEach(btn => {
    btn.onclick = () => {
      apState.status = btn.dataset.apst;
      $$('[data-apst]').forEach(b => b.classList.toggle('active', b.dataset.apst === apState.status));
      syncLiquidPills(el);
      drawSplit();
    };
  });
  $('#ap-search').oninput = e => { apState.search = e.target.value; drawSplit(); };

  syncLiquidPills(el);
  drawSplit();

  if (ctx.params?.createForEntryId && canCreate) {
    const eid = ctx.params.createForEntryId;
    ctx.params.createForEntryId = null;
    openNewAppealModal(eid);
  }
}
