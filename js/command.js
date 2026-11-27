// Global Command Palette (Ctrl/Cmd+K + Keyboard Nav) & Real Notification Center
import { IND, IMAP, getDeadlines, getRanking } from './config.js';
import { api } from './api.js';
import { icon } from './icons.js';
import { esc, openModal, closeModal, avatarHtml, formatDateTimeTashkent } from './ui.js';

const READ_STORAGE_KEY = 'reyting_read_notifs';

function getLocalReadSet() {
  try {
    return new Set(JSON.parse(localStorage.getItem(READ_STORAGE_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

export function markLocalNotifRead(id) {
  const s = getLocalReadSet();
  if (Array.isArray(id)) id.forEach(x => s.add(x));
  else s.add(id);
  localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(Array.from(s).slice(-100)));
}

export function buildNotifications(ctx) {
  const { me, entries, serverNotifications = [] } = ctx;
  const items = [];
  const seenKeys = new Set();
  const localRead = getLocalReadSet();
  const deadlines = getDeadlines();

  // 1. Authoritative server notifications (V4)
  for (const sn of serverNotifications) {
    const key = `srv_${sn.id}`;
    seenKeys.add(`${sn.kind}:${sn.ref_id}`);
    items.push({
      id: key,
      serverId: sn.id,
      read: Boolean(sn.is_read),
      tone: sn.kind === 'entry_approved' ? 'success' : (sn.kind === 'entry_rejected' ? 'error' : 'primary'),
      icon: sn.kind === 'entry_approved' ? 'check-circle' : (sn.kind === 'entry_rejected' ? 'x-circle' : 'bell'),
      title: sn.title,
      desc: sn.body || formatDateTimeTashkent(sn.created_at),
      action: () => {
        api.markNotificationRead(sn.id);
        ctx.navigate(me.role === 'director' || me.role === 'it_admin' ? 'dashboard' : 'my_results');
      }
    });
  }

  // 2. Pending review tasks for Director & Reviewer
  if (me.role === 'director' || me.role === 'reviewer') {
    const pending = entries.filter(e => {
      if (e.status !== 'pending') return false;
      if (me.role === 'director') return true;
      const ind = IMAP[e.ind];
      return ind && ind.resp.includes(me.name);
    });
    if (pending.length > 0) {
      const id = `pending_queue_${pending.length}`;
      items.push({
        id,
        read: localRead.has(id),
        tone: 'warning',
        icon: 'clock',
        title: `${pending.length} ta ariza tasdiqlashni kutmoqda`,
        desc: 'Tasdiqlash markazida ko‘rib chiqish',
        action: () => { markLocalNotifRead(id); ctx.navigate('reviews'); }
      });
    }
  }

  // 3. Derived entry updates (deduplicated against server notifications)
  if (me.role === 'teacher' || me.role === 'reviewer') {
    const myRecent = entries
      .filter(e => e.uid === me.id && (e.status === 'approved' || e.status === 'rejected'))
      .slice(0, 4);
    for (const e of myRecent) {
      const dedupKey = `entry_${e.status}:${e.id}`;
      if (seenKeys.has(dedupKey)) continue;
      const id = `entry_${e.id}_${e.status}`;
      const ind = IMAP[e.ind];
      items.push({
        id,
        read: localRead.has(id),
        tone: e.status === 'approved' ? 'success' : 'error',
        icon: e.status === 'approved' ? 'check-circle' : 'x-circle',
        title: e.status === 'approved' ? `Yutuq tasdiqlandi (+${e.pts} ball)` : 'Yutuq rad etildi',
        desc: `${ind ? ind.name : 'Mezon'}${e.note ? ` · ${e.note}` : ''}`,
        action: () => { markLocalNotifRead(id); ctx.navigate('my_results'); }
      });
    }
  }

  // 4. Security reminder if must_change
  if (me.must_change) {
    items.push({
      id: 'sec_must_change',
      read: false,
      tone: 'warning',
      icon: 'shield',
      title: 'Vaqtinchalik parolni almashtiring',
      desc: 'Hisob xavfsizligi uchun shaxsiy parol o‘rnating',
      action: () => ctx.openPasswordModal()
    });
  }

  // 5. Deadlines
  const d20Id = `dl20_${deadlines.d20Label}`;
  items.push({
    id: d20Id,
    read: localRead.has(d20Id),
    tone: deadlines.n20 <= 3 ? 'warning' : 'primary',
    icon: 'calendar',
    title: `Mas’ullarga topshirish: ${deadlines.d20Label}`,
    desc: `${deadlines.n20} kun qoldi (har oyning 20-sanasi)`,
    action: () => {
      markLocalNotifRead(d20Id);
      ctx.navigate(['director', 'it_admin'].includes(me.role) ? 'reports' : 'add_entry');
    }
  });

  const d25Id = `dl25_${deadlines.d25Label}`;
  items.push({
    id: d25Id,
    read: localRead.has(d25Id),
    tone: 'neutral',
    icon: 'file-text',
    title: `Yakuniy hisobot muddati: ${deadlines.d25Label}`,
    desc: `${deadlines.n25} kun qoldi (har oyning 25-sanasi)`,
    action: () => { markLocalNotifRead(d25Id); ctx.navigate('ranking'); }
  });

  return items;
}

export function openGlobalSearch(ctx) {
  const { me, users, entries, navigate, openProfile, navPages = [] } = ctx;
  const ranking = getRanking(users, entries);
  const canSeeStaffUsers = ['director', 'it_admin', 'reviewer'].includes(me.role);
  let selectedIdx = 0;

  openModal({
    title: 'Buyruqlar va tezkor qidiruv',
    size: 'lg',
    bodyHtml: `
      <div class="command-input-row" style="margin:-24px -24px 12px;background:var(--bg-subtle)">
        ${icon('search', 17)}
        <input id="cmd-search-input" class="command-input" type="search" placeholder="Sahifa, pedagog, mezon yoki hisobot nomini yozing…" autocomplete="off">
        <span class="kbd-hint">↑↓ Enter</span>
      </div>
      <div id="cmd-results" class="command-results" style="padding:0;max-height:360px" role="listbox"></div>
    `,
    onMount: panel => {
      const input = panel.querySelector('#cmd-search-input');
      const resultsEl = panel.querySelector('#cmd-results');
      let flatActions = [];

      const updateHighlight = () => {
        const items = resultsEl.querySelectorAll('.command-item');
        items.forEach((el, i) => {
          el.classList.toggle('cmd-selected', i === selectedIdx);
          if (i === selectedIdx) el.scrollIntoView({ block: 'nearest' });
        });
      };

      const renderResults = q => {
        const query = q.trim().toLowerCase();
        const groups = [];
        selectedIdx = 0;

        // 1. Permitted Pages
        const matchedPages = navPages
          .filter(p => !query || p.label.toLowerCase().includes(query))
          .slice(0, query ? 5 : 4);
        if (matchedPages.length) {
          groups.push({
            label: 'Sahifalar',
            items: matchedPages.map(p => ({
              html: `
                <div style="display:flex;align-items:center;gap:10px">
                  <span style="color:var(--text-muted)">${icon(p.icon, 16)}</span>
                  <span style="font-size:13.5px;font-weight:500">${esc(p.label)}</span>
                </div>
                <span style="font-size:11.5px;color:var(--text-muted)">Sahifaga o‘tish</span>
              `,
              onSelect: () => { closeModal(); navigate(p.id, p.id === 'profile' ? { uid: me.id } : {}); }
            }))
          });
        }

        // 2. Teachers (Permission-scoped)
        const searchableUsers = canSeeStaffUsers
          ? users.filter(u => u.active)
          : users.filter(u => u.active && u.ranked);

        const matchedUsers = searchableUsers
          .filter(u => !query || u.name.toLowerCase().includes(query) || (u.subject || '').toLowerCase().includes(query))
          .slice(0, 5);

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
                onSelect: () => { closeModal(); openProfile(u.id); }
              };
            })
          });
        }

        // 3. 26-AF Criteria
        const matchedInd = IND
          .filter(i => !query || i.name.toLowerCase().includes(query) || i.doc.toLowerCase().includes(query) || String(i.id) === query)
          .slice(0, 4);

        if (matchedInd.length) {
          groups.push({
            label: 'Baholash mezonlari',
            items: matchedInd.map(i => ({
              html: `
                <div style="display:flex;align-items:center;gap:10px;min-width:0">
                  <span class="badge badge-primary">${i.sec}-${i.id}</span>
                  <div style="min-width:0">
                    <div style="font-size:13.5px;font-weight:500">${esc(i.name)}</div>
                    <div style="font-size:12px;color:var(--text-muted)">Mas’ul: ${esc(i.respStr)}</div>
                  </div>
                </div>
                <span style="font-size:12px;font-weight:600;color:var(--text-muted)">Maks: ${i.max}</span>
              `,
              onSelect: () => { closeModal(); navigate('criteria', { highlightInd: i.id }); }
            }))
          });
        }

        // 4. Permitted entries (when query >= 2 chars)
        if (query.length >= 2) {
          const visibleEntries = entries.filter(e => {
            if (me.role === 'director') return true;
            if (me.role === 'reviewer') {
              const ind = IMAP[e.ind];
              return e.uid === me.id || (ind && ind.resp.includes(me.name));
            }
            return e.uid === me.id;
          });

          const matchedEntries = visibleEntries.filter(e =>
            (e.descr || '').toLowerCase().includes(query) ||
            (e.type || '').toLowerCase().includes(query) ||
            (IMAP[e.ind]?.name || '').toLowerCase().includes(query)
          ).slice(0, 4);

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
        }

        if (!groups.length) {
          flatActions = [];
          resultsEl.innerHTML = `
            <div class="empty-state" style="padding:36px 16px">
              <div class="empty-icon">${icon('search', 20)}</div>
              <p class="empty-title">Hech narsa topilmadi</p>
              <p class="empty-desc">“${esc(q)}” so‘rovi bo‘yicha mos natijalar aniqlanmadi.</p>
            </div>
          `;
          return;
        }

        flatActions = [];
        resultsEl.innerHTML = groups.map(g => `
          <div class="command-group-label">${esc(g.label)}</div>
          ${g.items.map(it => {
            const idx = flatActions.length;
            flatActions.push(it.onSelect);
            return `<button type="button" role="option" class="command-item ${idx === 0 ? 'cmd-selected' : ''}" data-cmd-idx="${idx}">${it.html}</button>`;
          }).join('')}
        `).join('');

        resultsEl.querySelectorAll('[data-cmd-idx]').forEach(btn => {
          btn.onclick = () => flatActions[Number(btn.dataset.cmdIdx)]();
          btn.onmouseenter = () => { selectedIdx = Number(btn.dataset.cmdIdx); updateHighlight(); };
        });
      };

      input.oninput = () => renderResults(input.value);
      input.onkeydown = e => {
        if (!flatActions.length) return;
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          selectedIdx = (selectedIdx + 1) % flatActions.length;
          updateHighlight();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          selectedIdx = (selectedIdx - 1 + flatActions.length) % flatActions.length;
          updateHighlight();
        } else if (e.key === 'Enter') {
          e.preventDefault();
          flatActions[selectedIdx]?.();
        }
      };

      renderResults('');
      setTimeout(() => input.focus(), 30);
    }
  });
}
