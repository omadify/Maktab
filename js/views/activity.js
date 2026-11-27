// NEW MODULE 1: Mening faoliyatim (Personal Activity Center, Asia/Tashkent Timeline, Strictly Scoped)
import { IMAP } from '../config.js';
import { icon } from '../icons.js';
import { $, $$, esc, emptyStateHtml, formatDateTimeTashkent } from '../ui.js';
import { syncLiquidPills } from '../motion.js';

let actFilter = { category: 'all', search: '', page: 1 };

const EVENT_META = {
  entry_submit: { label: 'Yutuq kiritildi', icon: 'plus', tone: 'primary', route: 'my_results' },
  entry_approved: { label: 'Yutuq tasdiqlandi', icon: 'check-circle', tone: 'success', route: 'my_results' },
  entry_rejected: { label: 'Yutuq rad etildi', icon: 'x-circle', tone: 'error', route: 'my_results' },
  entry_delete: { label: 'Ariza o‘chirildi', icon: 'trash-2', tone: 'neutral', route: 'my_results' },
  profile_update: { label: 'Profil yangilandi', icon: 'user', tone: 'primary', route: 'profile' },
  appeal_created: { label: 'Murojaat yuborildi', icon: 'message-square', tone: 'primary', route: 'appeals' },
  appeal_reply: { label: 'Murojaatga javob keldi', icon: 'message-square', tone: 'primary', route: 'appeals' },
  appeal_status_changed: { label: 'Murojaat holati yangilandi', icon: 'flag', tone: 'warning', route: 'appeals' },
  goal_created: { label: 'Rivojlanish maqsadi qo‘shildi', icon: 'target', tone: 'success', route: 'dev_plan' },
  password_change: { label: 'Parol yangilandi', icon: 'key', tone: 'warning', route: 'settings' },
  session_revoked: { label: 'Sessiya yakunlandi', icon: 'laptop', tone: 'neutral', route: 'settings' },
  login_success: { label: 'Tizimga kirish', icon: 'log-in', tone: 'neutral', route: null },
  logout: { label: 'Tizimdan chiqish', icon: 'log-out', tone: 'neutral', route: null }
};

function getCategory(action) {
  if (action.startsWith('entry_')) return 'entries';
  if (action.startsWith('appeal_')) return 'appeals';
  if (action === 'profile_update' || action === 'goal_created') return 'profile';
  return 'security';
}

function describeEvent(ev) {
  const meta = ev.metadata || {};
  if (ev.action === 'entry_submit') {
    const indName = meta.ind ? `${meta.ind}. ${IMAP[meta.ind]?.name || ''}` : 'Mezon';
    return `${indName} bo‘yicha +${meta.pts || 0} ballik ariza yuborildi.`;
  }
  if (ev.action === 'entry_approved') {
    const indName = meta.ind ? `${meta.ind}. ${IMAP[meta.ind]?.name || ''}` : 'Mezon';
    return `${ev.actor_name || 'Ekspert'} tomonidan (${indName}) tasdiqlandi.`;
  }
  if (ev.action === 'entry_rejected') {
    const indName = meta.ind ? `${meta.ind}. ${IMAP[meta.ind]?.name || ''}` : 'Mezon';
    return `${ev.actor_name || 'Ekspert'} tomonidan (${indName}) rad etildi.`;
  }
  if (ev.action === 'profile_update') {
    const fields = Array.isArray(meta.fields) ? meta.fields.join(', ') : 'shaxsiy ma’lumotlar';
    return `Yangilangan maydonlar: ${fields}.`;
  }
  if (ev.action === 'appeal_status_changed') {
    return `Holat "${meta.status || ''}" ga o‘zgartirildi.`;
  }
  if (ev.action === 'login_success') {
    return `${meta.device || 'desktop'} · ${meta.browser || 'Brauzer'} orqali tizimga kirildi.`;
  }
  return ev.target_type ? `${ev.target_type}${ev.target_id ? ` #${ev.target_id}` : ''}` : 'Tizim harakati qayd etildi.';
}

export function renderMyActivity(el, ctx) {
  const { myActivity, me } = ctx;

  if (!myActivity?.available) {
    el.innerHTML = `
      <div class="stack-v">
        <div class="page-header">
          <div>
            <h1 class="page-title">Mening faoliyatim</h1>
            <p class="page-desc">Shaxsiy harakatlar, yutuq qarorlari va profil o‘zgarishlari xronologiyasi (Asia/Tashkent).</p>
          </div>
          <div class="page-actions">
            <button type="button" class="btn btn-secondary" id="ma-refresh">${icon('refresh-cw', 15)} Tekshirish</button>
          </div>
        </div>
        <div class="card">
          ${emptyStateHtml({
            iconName: 'clock',
            title: 'Shaxsiy faoliyat moduli migratsiyani kutmoqda',
            desc: 'Haqiqiy shaxsiy faoliyat tasmasi faqat sizning autentifikatsiyalangan hisobingiz ma’lumotlarini ko‘rsatishi uchun supabase/migrations/20261127_v6_platform_upgrade.sql migratsiyasini qo‘llang.'
          })}
        </div>
      </div>
    `;
    $('#ma-refresh').onclick = () => ctx.refresh();
    return;
  }

  const rows = myActivity.rows || [];

  el.innerHTML = `
    <div class="stack-v">
      <div class="page-header">
        <div>
          <h1 class="page-title">Mening faoliyatim</h1>
          <p class="page-desc">Faqat sizning hisobingizga tegishli harakatlar va baholash qarorlari (Asia/Tashkent).</p>
        </div>
        <div class="page-actions">
          <button type="button" class="btn btn-secondary" id="ma-refresh">${icon('refresh-cw', 15)} Yangilash</button>
        </div>
      </div>

      <div class="card">
        <div class="filter-bar">
          <div class="tabs-pill">
            <button type="button" class="tab-btn ${actFilter.category === 'all' ? 'active' : ''}" data-macat="all">Barchasi (${rows.length})</button>
            <button type="button" class="tab-btn ${actFilter.category === 'entries' ? 'active' : ''}" data-macat="entries">Yutuqlar</button>
            <button type="button" class="tab-btn ${actFilter.category === 'appeals' ? 'active' : ''}" data-macat="appeals">Murojaatlar</button>
            <button type="button" class="tab-btn ${actFilter.category === 'profile' ? 'active' : ''}" data-macat="profile">Profil va reja</button>
            <button type="button" class="tab-btn ${actFilter.category === 'security' ? 'active' : ''}" data-macat="security">Kirish va xavfsizlik</button>
          </div>
          <div class="input-icon-wrap" style="min-width:200px;max-width:280px;flex:1">
            <span class="input-leading">${icon('search', 15)}</span>
            <input id="ma-search" class="input has-leading" type="search" value="${esc(actFilter.search)}" placeholder="Harakat bo‘yicha qidirish…">
          </div>
        </div>

        <div id="ma-timeline-zone"></div>
      </div>
    </div>
  `;

  function drawTimeline() {
    const q = actFilter.search.trim().toLowerCase();
    const filtered = rows.filter(r => {
      if (actFilter.category !== 'all' && getCategory(r.action) !== actFilter.category) return false;
      if (q) {
        const meta = EVENT_META[r.action] || { label: r.action };
        const hay = `${meta.label} ${describeEvent(r)} ${r.actor_name || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const pageSize = 12;
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    if (actFilter.page > totalPages) actFilter.page = totalPages;
    const pageRows = filtered.slice((actFilter.page - 1) * pageSize, actFilter.page * pageSize);

    const zone = $('#ma-timeline-zone');
    if (pageRows.length === 0) {
      zone.innerHTML = emptyStateHtml({
        iconName: 'clock',
        title: 'Faoliyat yozuvlari topilmadi',
        desc: 'Tanlangan filtr bo‘yicha shaxsiy hodisalar mavjud emas.'
      });
      return;
    }

    zone.innerHTML = `
      <div class="timeline-list">
        ${pageRows.map(ev => {
          const m = EVENT_META[ev.action] || { label: ev.action, icon: 'activity', tone: 'neutral', route: null };
          return `
            <div class="timeline-item">
              <span class="timeline-dot ${m.tone === 'neutral' ? '' : m.tone}">${icon(m.icon, 12)}</span>
              <div class="timeline-card">
                <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">
                  <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                    <span style="font-size:14px;font-weight:600;color:var(--text)">${esc(m.label)}</span>
                    <span class="badge badge-${m.tone === 'neutral' ? 'neutral' : m.tone}">${ev.outcome === 'failed' ? 'Xato' : 'Qayd etildi'}</span>
                  </div>
                  <span style="font-size:12px;color:var(--text-muted);font-variant-numeric:tabular-nums">${formatDateTimeTashkent(ev.created_at)}</span>
                </div>
                <p style="margin:6px 0 0;font-size:13px;color:var(--text-2);line-height:1.5">${esc(describeEvent(ev))}</p>
                ${m.route ? `
                  <div style="margin-top:8px">
                    <button type="button" class="btn btn-ghost btn-sm" data-ma-go="${m.route}" style="padding:2px 8px;min-height:26px;font-size:12px">
                      Sahifani ochish ${icon('arrow-up-right', 13)}
                    </button>
                  </div>
                ` : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>

      ${totalPages > 1 ? `
        <div style="display:flex;justify-content:flex-end;align-items:center;gap:8px;margin-top:16px">
          <button type="button" class="btn btn-secondary btn-sm" id="ma-prev" ${actFilter.page <= 1 ? 'disabled' : ''}>Oldingi</button>
          <span style="font-size:12.5px">${actFilter.page} / ${totalPages}</span>
          <button type="button" class="btn btn-secondary btn-sm" id="ma-next" ${actFilter.page >= totalPages ? 'disabled' : ''}>Keyingi</button>
        </div>
      ` : ''}
    `;

    $$('[data-ma-go]', zone).forEach(b => {
      b.onclick = () => ctx.navigate(b.dataset.maGo, b.dataset.maGo === 'profile' ? { uid: me.id } : {});
    });
    const prev = $('#ma-prev', zone);
    const next = $('#ma-next', zone);
    if (prev) prev.onclick = () => { if (actFilter.page > 1) { actFilter.page -= 1; drawTimeline(); } };
    if (next) next.onclick = () => { if (actFilter.page < totalPages) { actFilter.page += 1; drawTimeline(); } };
  }

  $('#ma-refresh').onclick = () => ctx.refresh();
  $$('[data-macat]').forEach(btn => {
    btn.onclick = () => {
      actFilter.category = btn.dataset.macat;
      actFilter.page = 1;
      $$('[data-macat]').forEach(b => b.classList.toggle('active', b.dataset.macat === actFilter.category));
      syncLiquidPills(el);
      drawTimeline();
    };
  });
  $('#ma-search').oninput = e => { actFilter.search = e.target.value; actFilter.page = 1; drawTimeline(); };

  syncLiquidPills(el);
  drawTimeline();
}
