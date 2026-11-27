// Global Command Search (Ctrl/Cmd+K) & Topbar Notifications (Permission-aware)
import { IND, IMAP, getDeadlines, getRanking } from './config.js';
import { icon } from './icons.js';
import { esc, openModal, closeModal, avatarHtml } from './ui.js';

export function buildNotifications(ctx) {
  const { me, users, entries } = ctx;
  const items = [];
  const deadlines = getDeadlines();

  if (me.role === 'director' || me.role === 'reviewer') {
    const pending = entries.filter(e => {
      if (e.status !== 'pending') return false;
      if (me.role === 'director') return true;
      const ind = IMAP[e.ind];
      return ind && ind.resp.includes(me.name);
    });
    if (pending.length > 0) {
      items.push({
        id: 'pending_rev',
        tone: 'warning',
        icon: 'clock',
        title: `${pending.length} ta ariza tasdiqlashni kutmoqda`,
        desc: 'Tekshirish va baholash navbatiga o‘tish',
        action: () => ctx.navigate('reviews')
      });
    }
  }

  if (me.role === 'teacher' || me.role === 'reviewer') {
    const myRecent = entries
      .filter(e => e.uid === me.id && (e.status === 'approved' || e.status === 'rejected'))
      .slice(0, 4);
    for (const e of myRecent) {
      const ind = IMAP[e.ind];
      items.push({
        id: `entry_${e.id}`,
        tone: e.status === 'approved' ? 'success' : 'error',
        icon: e.status === 'approved' ? 'check-circle' : 'x-circle',
        title: e.status === 'approved'
          ? `Tasdiqlandi (+${e.pts} ball)`
          : 'Ariza rad etildi',
        desc: `${ind ? ind.name : 'Mezon'}${e.note ? ` · ${e.note}` : ''}`,
        action: () => ctx.navigate('my_results')
      });
    }
  }

  items.push({
    id: 'deadline_20',
    tone: deadlines.n20 <= 3 ? 'warning' : 'primary',
    icon: 'calendar',
    title: `Mas’ullarga topshirish: ${deadlines.d20Label}`,
    desc: `${deadlines.n20} kun qoldi (har oyning 20-sanasi)`,
    action: () => ctx.navigate(me.role === 'director' || me.role === 'it_admin' ? 'reports' : 'add_entry')
  });

  items.push({
    id: 'deadline_25',
    tone: 'neutral',
    icon: 'file-text',
    title: `Yakuniy hisobot muddati: ${deadlines.d25Label}`,
    desc: `${deadlines.n25} kun qoldi (har oyning 25-sanasi)`,
    action: () => ctx.navigate('ranking')
  });

  return items;
}

export function openGlobalSearch(ctx) {
  const { me, users, entries, navigate, openProfile } = ctx;
  const ranking = getRanking(users, entries);
  const canSeeStaffUsers = ['director', 'it_admin', 'reviewer'].includes(me.role);

  openModal({
    title: 'Tezkor qidiruv',
    size: 'lg',
    bodyHtml: `
      <div class="command-input-row" style="margin:-24px -24px 12px;background:var(--bg-subtle)">
        ${icon('search', 18)}
        <input id="cmd-search-input" class="command-input" type="search" placeholder="Pedagog, fan, mezon yoki bo‘lim nomini yozing…" autocomplete="off">
        <span class="kbd-hint">ESC</span>
      </div>
      <div id="cmd-results" class="command-results" style="padding:0;max-height:360px"></div>
    `,
    onMount: panel => {
      const input = panel.querySelector('#cmd-search-input');
      const resultsEl = panel.querySelector('#cmd-results');

      const renderResults = q => {
        const query = q.trim().toLowerCase();
        const groups = [];

        // 1. Teachers (RBAC: ranked teachers for everyone; all staff users for admin/director/reviewer)
        const searchableUsers = canSeeStaffUsers
          ? users.filter(u => u.active)
          : users.filter(u => u.active && u.ranked);

        const matchedUsers = searchableUsers
          .filter(u => !query || u.name.toLowerCase().includes(query) || (u.subject || '').toLowerCase().includes(query))
          .slice(0, 6);

        if (matchedUsers.length) {
          groups.push({
            label: 'Pedagoglar',
            items: matchedUsers.map(u => {
              const rk = ranking.find(r => r.id === u.id);
              return {
                html: `
                  <div style="display:flex;align-items:center;gap:10px;min-width:0">
                    ${avatarHtml(u.name, 'sm')}
                    <div style="min-width:0">
                      <div style="font-size:13.5px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(u.name)}</div>
                      <div style="font-size:12px;color:var(--text-muted)">${esc(u.subject || 'Pedagog')}</div>
                    </div>
                  </div>
                  <span class="badge badge-neutral">${rk ? `#${rk.rank} · ${rk.T} ball` : 'Reytingdan tashqari'}</span>
                `,
                onSelect: () => {
                  closeModal();
                  openProfile(u.id);
                }
              };
            })
          });
        }

        // 2. Criteria (26-AF 15 indicators)
        const matchedInd = IND
          .filter(i => !query || i.name.toLowerCase().includes(query) || i.doc.toLowerCase().includes(query) || String(i.id) === query)
          .slice(0, 5);

        if (matchedInd.length) {
          groups.push({
            label: '26-AF Baholash mezonlari',
            items: matchedInd.map(i => ({
              html: `
                <div style="display:flex;align-items:center;gap:10px;min-width:0">
                  <span class="badge badge-primary">${i.sec}-${i.id}</span>
                  <div style="min-width:0">
                    <div style="font-size:13.5px;font-weight:500">${esc(i.name)}</div>
                    <div style="font-size:12px;color:var(--text-muted)">Mas’ul: ${esc(i.respStr)}</div>
                  </div>
                </div>
                <span style="font-size:12px;font-weight:600;color:var(--text-muted)">Maks: ${i.max} ball</span>
              `,
              onSelect: () => {
                closeModal();
                navigate('criteria', { highlightInd: i.id });
              }
            }))
          });
        }

        // 3. Own entries (or pending entries for reviewer/director)
        const visibleEntries = entries.filter(e => {
          if (me.role === 'director') return true;
          if (me.role === 'reviewer') {
            const ind = IMAP[e.ind];
            return e.uid === me.id || (ind && ind.resp.includes(me.name));
          }
          return e.uid === me.id;
        });

        const matchedEntries = query
          ? visibleEntries.filter(e =>
              (e.descr || '').toLowerCase().includes(query) ||
              (e.type || '').toLowerCase().includes(query) ||
              (IMAP[e.ind]?.name || '').toLowerCase().includes(query)
            ).slice(0, 4)
          : [];

        if (matchedEntries.length) {
          groups.push({
            label: 'Yutuq va arizalar',
            items: matchedEntries.map(e => {
              const owner = users.find(u => u.id === e.uid);
              return {
                html: `
                  <div style="min-width:0">
                    <div style="font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(e.type)} (${esc(owner?.name || '')})</div>
                    <div style="font-size:12px;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(e.descr)}</div>
                  </div>
                  <span class="badge ${e.status === 'approved' ? 'badge-success' : (e.status === 'rejected' ? 'badge-error' : 'badge-warning')}">+${e.pts}</span>
                `,
                onSelect: () => {
                  closeModal();
                  if (e.status === 'pending' && ['director', 'reviewer'].includes(me.role)) {
                    navigate('reviews');
                  } else {
                    openProfile(e.uid);
                  }
                }
              };
            })
          });
        }

        if (!groups.length) {
          resultsEl.innerHTML = `
            <div class="empty-state" style="padding:36px 16px">
              <div class="empty-icon">${icon('search', 20)}</div>
              <p class="empty-title">Hech narsa topilmadi</p>
              <p class="empty-desc">“${esc(q)}” so‘rovi bo‘yicha mos natijalar aniqlanmadi.</p>
            </div>
          `;
          return;
        }

        const flatActions = [];
        resultsEl.innerHTML = groups.map(g => `
          <div class="command-group-label">${esc(g.label)}</div>
          ${g.items.map(it => {
            const idx = flatActions.length;
            flatActions.push(it.onSelect);
            return `<button type="button" class="command-item" data-cmd-idx="${idx}">${it.html}</button>`;
          }).join('')}
        `).join('');

        resultsEl.querySelectorAll('[data-cmd-idx]').forEach(btn => {
          btn.onclick = () => flatActions[Number(btn.dataset.cmdIdx)]();
        });
      };

      input.oninput = () => renderResults(input.value);
      renderResults('');
      setTimeout(() => input.focus(), 30);
    }
  });
}
