// NEW MODULE 3: Rivojlanish rejasi (Personal Development Plan Workspace)
import { IND, SEC } from '../config.js';
import { api } from '../api.js';
import { icon } from '../icons.js';
import { $, $$, esc, toast, openModal, closeModal, confirmDialog, emptyStateHtml, formatDateUz } from '../ui.js';
import { syncLiquidPills } from '../motion.js';

let devTab = 'active';

export function resetDevPlanViewState() {
  devTab = 'active';
}

const SECTION_BADGES = {
  A: { label: 'A bo‘lim · Salohiyat', cls: 'badge-primary' },
  B: { label: 'B bo‘lim · O‘quvchilar', cls: 'badge-success' },
  C: { label: 'C bo‘lim · Faollik', cls: 'badge-warning' },
  general: { label: 'Umumiy rivojlanish', cls: 'badge-neutral' }
};

export function renderDevPlan(el, ctx) {
  const { devGoals } = ctx;

  if (!devGoals?.available) {
    el.innerHTML = `
      <div class="stack-v">
        <div class="page-header">
          <div>
            <h1 class="page-title">Rivojlanish rejasi</h1>
            <p class="page-desc">Shaxsiy kasbiy maqsadlar, vazifalar va muddatlarni rejalashtirish.</p>
          </div>
          <div class="page-actions">
            <button type="button" class="btn btn-secondary" id="dp-refresh">${icon('refresh-cw', 15)} Tekshirish</button>
          </div>
        </div>
        <div class="card">
          ${emptyStateHtml({
            iconName: 'target',
            title: 'Rivojlanish rejasi moduli migratsiyani kutmoqda',
            desc: 'Shaxsiy maqsad va vazifalaringiz bazada saqlanishi uchun supabase/migrations/20261127_v6_platform_upgrade.sql migratsiyasini qo‘llang.'
          })}
        </div>
      </div>
    `;
    $('#dp-refresh').onclick = () => ctx.refresh();
    return;
  }

  const goals = devGoals.rows || [];
  const activeGoals = goals.filter(g => g.status === 'active');
  const completedGoals = goals.filter(g => g.status === 'completed');
  const allTasks = goals.flatMap(g => g.tasks || []);
  const doneTasks = allTasks.filter(t => t.done).length;
  const pctTotal = allTasks.length ? Math.round((doneTasks / allTasks.length) * 100) : (goals.length ? Math.round((completedGoals.length / goals.length) * 100) : 0);

  const upcoming = activeGoals
    .filter(g => g.target_date)
    .sort((a, b) => a.target_date.localeCompare(b.target_date))[0];

  el.innerHTML = `
    <div class="stack-v">
      <div class="page-header">
        <div>
          <h1 class="page-title">Shaxsiy rivojlanish rejasi</h1>
          <p class="page-desc">Kasbiy o‘sish maqsadlari va bosqichma-bosqich vazifalar. Shaxsiy reja rasmiy 26-AF ballarini avtomatik o‘zgartirmaydi.</p>
        </div>
        <div class="page-actions">
          <button type="button" class="btn btn-primary" id="dp-new-btn">${icon('plus', 15)} Yangi maqsad</button>
        </div>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-top"><span class="kpi-label">Faol maqsadlar</span><span class="kpi-icon primary">${icon('target', 16)}</span></div>
          <div class="kpi-value-row"><span class="kpi-value">${activeGoals.length}</span><span class="kpi-unit">ta reja</span></div>
          <div class="kpi-foot"><span>Jami: ${goals.length} ta maqsad</span></div>
        </div>
        <div class="kpi-card">
          <div class="kpi-top"><span class="kpi-label">Bajarilgan maqsadlar</span><span class="kpi-icon success">${icon('check-circle', 16)}</span></div>
          <div class="kpi-value-row"><span class="kpi-value">${completedGoals.length}</span><span class="kpi-unit">ta</span></div>
          <div class="kpi-foot"><span>Shaxsiy yutuqlar tarixi</span></div>
        </div>
        <div class="kpi-card">
          <div class="kpi-top"><span class="kpi-label">Vazifalar bajarilishi</span><span class="kpi-icon">${icon('check-square', 16)}</span></div>
          <div class="kpi-value-row"><span class="kpi-value">${pctTotal}%</span><span class="kpi-unit">${doneTasks}/${allTasks.length}</span></div>
          <div class="progress-single"><i style="width:${pctTotal}%"></i></div>
        </div>
        <div class="kpi-card">
          <div class="kpi-top"><span class="kpi-label">Eng yaqin muddat</span><span class="kpi-icon warning">${icon('calendar', 16)}</span></div>
          <div class="kpi-value-row"><span class="kpi-value" style="font-size:18px">${upcoming ? formatDateUz(upcoming.target_date) : '—'}</span></div>
          <div class="kpi-foot"><span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${upcoming ? esc(upcoming.title) : 'Muddat belgilanmagan'}</span></div>
        </div>
      </div>

      <div class="card">
        <div class="filter-bar">
          <div class="tabs-pill">
            <button type="button" class="tab-btn ${devTab === 'active' ? 'active' : ''}" data-dptab="active">Faol (${activeGoals.length})</button>
            <button type="button" class="tab-btn ${devTab === 'completed' ? 'active' : ''}" data-dptab="completed">Bajarilgan (${completedGoals.length})</button>
            <button type="button" class="tab-btn ${devTab === 'all' ? 'active' : ''}" data-dptab="all">Barchasi (${goals.length})</button>
          </div>
        </div>

        <div id="dp-list-zone"></div>
      </div>
    </div>
  `;

  function drawGoals() {
    const filtered = goals.filter(g => devTab === 'all' || g.status === devTab);
    const zone = $('#dp-list-zone');

    if (filtered.length === 0) {
      zone.innerHTML = emptyStateHtml({
        iconName: 'target',
        title: devTab === 'completed' ? 'Hali yakunlangan maqsadlar yo‘q' : 'Rivojlanish rejasi bo‘sh',
        desc: 'Malaka oshirish, sertifikat olish yoki olimpiada tayyorgarligi bo‘yicha shaxsiy maqsad qo‘shing.',
        actionHtml: `<button type="button" class="btn btn-primary" id="dp-empty-add">${icon('plus', 15)} Maqsad yaratish</button>`
      });
      const ea = $('#dp-empty-add', zone);
      if (ea) ea.onclick = () => openGoalModal(null);
      return;
    }

    zone.innerHTML = `
      <div class="grid-2">
        ${filtered.map(g => {
          const tasks = g.tasks || [];
          const done = tasks.filter(t => t.done).length;
          const pct = tasks.length ? Math.round((done / tasks.length) * 100) : (g.status === 'completed' ? 100 : 0);
          const sb = SECTION_BADGES[g.section] || SECTION_BADGES.general;
          return `
            <div class="card card-compact" style="box-shadow:none;display:flex;flex-direction:column;gap:12px">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
                <div>
                  <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px">
                    <span class="badge ${sb.cls}">${esc(sb.label)}</span>
                    ${g.status === 'completed' ? '<span class="badge badge-success">Yakunlangan</span>' : ''}
                  </div>
                  <h4 style="font-size:15.5px;font-weight:700">${esc(g.title)}</h4>
                </div>
                <div style="display:flex;gap:4px">
                  <button type="button" class="btn btn-ghost btn-icon btn-sm" data-g-edit="${g.id}" title="Tahrirlash">${icon('edit-3', 14)}</button>
                  <button type="button" class="btn btn-ghost btn-icon btn-sm" data-g-del="${g.id}" title="O‘chirish">${icon('trash-2', 14)}</button>
                </div>
              </div>

              ${g.description ? `<p style="margin:0;font-size:13px;color:var(--text-2);line-height:1.5">${esc(g.description)}</p>` : ''}

              <div>
                <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-muted);margin-bottom:5px">
                  <span>Bajarilish: <b>${pct}%</b> (${done}/${tasks.length} vazifa)</span>
                  ${g.target_date ? `<span>Muddat: <b>${formatDateUz(g.target_date)}</b></span>` : ''}
                </div>
                <div class="progress-single"><i style="width:${pct}%;background:${g.status === 'completed' ? 'var(--success)' : 'var(--primary)'}"></i></div>
              </div>

              <!-- Checklist -->
              <div style="display:flex;flex-direction:column;gap:6px;padding-top:4px">
                ${tasks.map(t => `
                  <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:7px 10px;border-radius:9px;background:var(--surface-soft)">
                    <label style="display:flex;align-items:center;gap:8px;cursor:pointer;flex:1;min-width:0">
                      <input type="checkbox" class="checkbox" data-t-toggle="${t.id}" ${t.done ? 'checked' : ''}>
                      <span style="font-size:13px;${t.done ? 'text-decoration:line-through;color:var(--text-muted)' : ''}">${esc(t.title)}</span>
                    </label>
                    <button type="button" class="btn btn-ghost btn-icon btn-sm" data-t-del="${t.id}" style="width:24px;height:24px" aria-label="Vazifani o‘chirish">${icon('x', 13)}</button>
                  </div>
                `).join('')}

                <form class="dp-task-add-form" data-g-task="${g.id}" style="display:flex;gap:6px;margin-top:4px">
                  <input class="input" type="text" placeholder="Yangi qadam qo‘shish…" style="min-height:34px;font-size:12.5px">
                  <button type="submit" class="btn btn-secondary btn-sm">${icon('plus', 14)}</button>
                </form>
              </div>

              <div style="margin-top:auto;padding-top:8px;border-top:1px solid var(--border);display:flex;justify-content:flex-end">
                <button type="button" class="btn ${g.status === 'completed' ? 'btn-secondary' : 'btn-success'} btn-sm" data-g-complete="${g.id}">
                  ${g.status === 'completed' ? 'Faol holatga qaytarish' : `${icon('check', 14)} Yakunlandi deb belgilash`}
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    $$('[data-t-toggle]', zone).forEach(chk => {
      chk.onchange = async () => {
        try {
          await api.upsertDevTask({ id: Number(chk.dataset.tToggle), done: chk.checked });
          await ctx.refresh();
        } catch (err) {
          toast(err.message, 'error');
        }
      };
    });

    $$('[data-t-del]', zone).forEach(btn => {
      btn.onclick = async () => {
        try {
          await api.deleteDevTask(Number(btn.dataset.tDel));
          await ctx.refresh();
        } catch (err) {
          toast(err.message, 'error');
        }
      };
    });

    $$('.dp-task-add-form', zone).forEach(form => {
      form.onsubmit = async e => {
        e.preventDefault();
        const inp = form.querySelector('input');
        const title = inp.value.trim();
        if (!title) return;
        inp.disabled = true;
        try {
          await api.upsertDevTask({ goal_id: Number(form.dataset.gTask), title });
          await ctx.refresh();
        } catch (err) {
          toast(err.message, 'error');
          inp.disabled = false;
        }
      };
    });

    $$('[data-g-complete]', zone).forEach(btn => {
      btn.onclick = async () => {
        const g = goals.find(x => x.id === Number(btn.dataset.gComplete));
        if (!g) return;
        try {
          await api.upsertDevGoal({ ...g, status: g.status === 'completed' ? 'active' : 'completed' });
          toast(g.status === 'completed' ? 'Maqsad faol holatga qaytarildi.' : 'Maqsad bajarildi!', 'success');
          await ctx.refresh();
        } catch (err) {
          toast(err.message, 'error');
        }
      };
    });

    $$('[data-g-edit]', zone).forEach(btn => {
      btn.onclick = () => openGoalModal(goals.find(x => x.id === Number(btn.dataset.gEdit)));
    });

    $$('[data-g-del]', zone).forEach(btn => {
      btn.onclick = async () => {
        const g = goals.find(x => x.id === Number(btn.dataset.gDel));
        if (!g) return;
        const ok = await confirmDialog({
          title: 'Maqsadni o‘chirish',
          message: `“${g.title}” maqsadi va uning barcha vazifalarini o‘chirishni tasdiqlaysizmi?`,
          confirmText: 'O‘chirish',
          danger: true
        });
        if (!ok) return;
        try {
          await api.deleteDevGoal(g.id);
          toast('Maqsad o‘chirildi.', 'success');
          await ctx.refresh();
        } catch (err) {
          toast(err.message, 'error');
        }
      };
    });
  }

  function openGoalModal(existing) {
    openModal({
      title: existing ? 'Maqsadni tahrirlash' : 'Yangi rivojlanish maqsadi',
      subtitle: '26-AF yo‘nalishlariga bog‘langan shaxsiy kasbiy maqsad',
      bodyHtml: `
        <div class="stack-v" style="gap:14px">
          <div class="field">
            <label for="dg-title">Maqsad nomi</label>
            <input id="dg-title" class="input" value="${esc(existing?.title || '')}" placeholder="Masalan: IELTS 7.5 yoki milliy sertifikat olish" required>
          </div>
          <div class="grid-2">
            <div class="field">
              <label for="dg-sec">Bog‘liq bo‘lim</label>
              <select id="dg-sec" class="input">
                <option value="A" ${existing?.section === 'A' ? 'selected' : ''}>A — ${esc(SEC.A[0])}</option>
                <option value="B" ${existing?.section === 'B' ? 'selected' : ''}>B — ${esc(SEC.B[0])}</option>
                <option value="C" ${existing?.section === 'C' ? 'selected' : ''}>C — ${esc(SEC.C[0])}</option>
                <option value="general" ${existing?.section === 'general' ? 'selected' : ''}>Umumiy kasbiy rivojlanish</option>
              </select>
            </div>
            <div class="field">
              <label for="dg-date">Maqsadli sana</label>
              <input id="dg-date" class="input" type="date" value="${esc(existing?.target_date || '')}">
            </div>
          </div>
          <div class="field">
            <label for="dg-ind">Indikator (ixtiyoriy)</label>
            <select id="dg-ind" class="input">
              <option value="">— Tanlanmagan —</option>
              ${IND.map(i => `<option value="${i.id}" ${existing?.ind === i.id ? 'selected' : ''}>${i.id}. ${esc(i.name)}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label for="dg-desc">Tavsif va kutilayotgan natija</label>
            <textarea id="dg-desc" class="input" rows="3" placeholder="Tayyorgarlik rejasi, resurslar va kutilayotgan natija…">${esc(existing?.description || '')}</textarea>
          </div>
        </div>
      `,
      footerHtml: `<button type="button" class="btn btn-secondary" id="dg-cancel">Bekor qilish</button><button type="button" class="btn btn-primary" id="dg-save">${icon('check', 15)} Saqlash</button>`,
      onMount: panel => {
        panel.querySelector('#dg-cancel').onclick = () => closeModal(true);
        panel.querySelector('#dg-save').onclick = async () => {
          const title = panel.querySelector('#dg-title').value.trim();
          if (title.length < 2) return toast('Maqsad nomini kiriting.', 'warning');
          const btn = panel.querySelector('#dg-save');
          btn.disabled = true;
          try {
            await api.upsertDevGoal({
              id: existing?.id || null,
              title,
              section: panel.querySelector('#dg-sec').value,
              ind: panel.querySelector('#dg-ind').value ? Number(panel.querySelector('#dg-ind').value) : null,
              target_date: panel.querySelector('#dg-date').value,
              description: panel.querySelector('#dg-desc').value.trim(),
              status: existing?.status || 'active'
            });
            closeModal(true);
            toast(existing ? 'Maqsad yangilandi.' : 'Yangi maqsad qo‘shildi.', 'success');
            await ctx.refresh();
          } catch (err) {
            toast(err.message, 'error');
            btn.disabled = false;
          }
        };
      }
    });
  }

  $('#dp-new-btn').onclick = () => openGoalModal(null);
  $$('[data-dptab]').forEach(btn => {
    btn.onclick = () => {
      devTab = btn.dataset.dptab;
      $$('[data-dptab]').forEach(b => b.classList.toggle('active', b.dataset.dptab === devTab));
      syncLiquidPills(el);
      drawGoals();
    };
  });

  syncLiquidPills(el);
  drawGoals();
}
