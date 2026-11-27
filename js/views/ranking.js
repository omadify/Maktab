// Reimagined Leaderboard V6: Refined Metallic Podium, Global Rank Preservation, Avatars, Partial Updates & Mobile Cards
import { getRanking, extractSubjectLabel } from '../config.js';
import { icon } from '../icons.js';
import { $, $$, esc, csvCell, toast, avatarHtml, emptyStateHtml } from '../ui.js';

let rankState = {
  search: '',
  subject: 'all',
  period: 'all',
  sortBy: 'globalRank',
  sortDir: 'asc',
  page: 1,
  pageSize: 15
};

export function resetRankingViewState() {
  rankState = { search: '', subject: 'all', period: 'all', sortBy: 'globalRank', sortDir: 'asc', page: 1, pageSize: 15 };
}

export function exportRankingCSV(rows, periodLabel = 'Barcha davr') {
  const csvRows = rows.map(r => [
    r.globalRank,
    r.name,
    r.subject,
    r.A,
    r.B,
    r.C,
    r.T
  ].map(csvCell).join(';'));
  const header = '\ufeffUmumiy o‘rin;F.I.Sh.;Fan;Salohiyat (50);Yutuqlar (30);Rag‘bat (50);Jami (130)\n';
  const blob = new Blob([header + csvRows.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `pedagoglar_reytingi_${periodLabel.replace(/\s+/g, '_').toLowerCase()}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Reyting hisoboti CSV formatida yuklab olindi.', 'success');
}

const PERIOD_LABELS = {
  all: 'Barcha davr (Umumiy)',
  this_month: 'Joriy oy',
  prev_month: 'O‘tgan oy',
  quarter: 'Oxirgi 3 oy',
  this_year: 'Joriy yil'
};

export function renderRanking(el, ctx) {
  const { me, users, entries } = ctx;
  const userMap = new Map(users.map(u => [u.id, u]));
  const globalRanking = getRanking(users, entries, 'all');
  const globalRankMap = new Map(globalRanking.map(r => [r.id, r.rank]));

  if (globalRanking.length === 0) {
    el.innerHTML = `
      <div class="stack-v">
        <div class="page-header">
          <div>
            <h1 class="page-title">Reyting jadvali</h1>
            <p class="page-desc">26-AF buyruq asosidagi pedagoglar umumiy reytingi</p>
          </div>
        </div>
        <div class="card">
          ${emptyStateHtml({
            iconName: 'trophy',
            title: 'Hozircha reytingda pedagoglar mavjud emas',
            desc: 'Maktab ma’muriyati va mas’ul baholovchilar reytingda qatnashmaydi. Pedagoglar ro‘yxati yuklangach, reyting jadvali avtomatik shakllanadi.',
            actionHtml: ['director', 'it_admin'].includes(me.role)
              ? `<button type="button" class="btn btn-primary" id="rk-goto-admin">${icon('user-plus', 15)} Pedagoglarni yuklash</button>`
              : ''
          })}
        </div>
      </div>
    `;
    const ga = $('#rk-goto-admin');
    if (ga) ga.onclick = () => ctx.navigate('admin');
    return;
  }

  const subjects = Array.from(new Set(globalRanking.map(r => extractSubjectLabel(r.subject)))).sort();
  const top3 = globalRanking.slice(0, 3);

  el.innerHTML = `
    <div class="stack-v">
      <div class="page-header">
        <div>
          <h1 class="page-title">Reyting jadvali</h1>
          <p class="page-desc">Jami ${globalRanking.length} nafar pedagog · 130 ballik shkala (A: 50, B: 30, C: 50)</p>
        </div>
        <div class="page-actions">
          <button type="button" class="btn btn-secondary" id="rk-export-btn">${icon('download', 15)} Excel (CSV) yuklab olish</button>
        </div>
      </div>

      <!-- Top 3 Refined Metallic Podium -->
      <div class="podium-grid">
        ${top3.map(r => {
          const u = userMap.get(r.id);
          return `
            <div class="podium-card rank-${r.rank} stagger-item" data-open-prof="${r.id}">
              <div style="display:flex;align-items:center;justify-content:space-between;gap:10px">
                <span class="rank-badge r${r.rank}">#${r.rank}-o‘rin</span>
                <span class="badge badge-neutral">${r.approvedCount} ta yutuq</span>
              </div>
              <div style="display:flex;align-items:center;gap:12px">
                ${avatarHtml(r.name, 'lg', u?.avatar_url)}
                <div style="min-width:0">
                  <div style="font-size:15.5px;font-weight:700;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(r.name)}</div>
                  <div style="font-size:12.5px;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(r.subject)}</div>
                </div>
              </div>
              <div>
                <div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:7px">
                  <span style="font-size:25px;font-weight:800;color:var(--primary);font-variant-numeric:tabular-nums">${r.T} <small style="font-size:12.5px;font-weight:500;color:var(--text-muted)">/ 130</small></span>
                  <span style="font-size:12px;color:var(--text-muted);font-variant-numeric:tabular-nums">A:${r.A} · B:${r.B} · C:${r.C}</span>
                </div>
                <div class="progress-stack">
                  <i class="seg-a" style="width:${(r.A / 130) * 100}%"></i>
                  <i class="seg-b" style="width:${(r.B / 130) * 100}%"></i>
                  <i class="seg-c" style="width:${(r.C / 130) * 100}%"></i>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <div class="card">
        <div class="filter-bar">
          <div class="filter-controls">
            <div class="input-icon-wrap" style="min-width:210px;flex:1;max-width:300px">
              <span class="input-leading">${icon('search', 15)}</span>
              <input id="rk-search" class="input has-leading" type="search" value="${esc(rankState.search)}" placeholder="F.I.Sh., sinf yoki fan…">
            </div>

            <select id="rk-subject" class="input" style="width:auto;min-width:165px" aria-label="Fan bo‘yicha filtrlash">
              <option value="all" ${rankState.subject === 'all' ? 'selected' : ''}>Barcha fanlar</option>
              ${subjects.map(s => `<option value="${esc(s)}" ${rankState.subject === s ? 'selected' : ''}>${esc(s)}</option>`).join('')}
            </select>

            <select id="rk-period" class="input" style="width:auto;min-width:165px" aria-label="Davr bo‘yicha filtrlash">
              ${Object.entries(PERIOD_LABELS).map(([k, v]) => `<option value="${k}" ${rankState.period === k ? 'selected' : ''}>${esc(v)}</option>`).join('')}
            </select>

            <button type="button" class="btn btn-ghost btn-sm" id="rk-clear-btn" style="display:none">${icon('x', 14)} Tozalash</button>
          </div>

          <div style="display:flex;align-items:center;gap:10px;font-size:12px;color:var(--text-muted)">
            <span style="display:inline-flex;align-items:center;gap:5px"><i style="width:9px;height:9px;border-radius:3px;background:var(--sec-a);display:inline-block"></i>A (50)</span>
            <span style="display:inline-flex;align-items:center;gap:5px"><i style="width:9px;height:9px;border-radius:3px;background:var(--sec-b);display:inline-block"></i>B (30)</span>
            <span style="display:inline-flex;align-items:center;gap:5px"><i style="width:9px;height:9px;border-radius:3px;background:var(--sec-c);display:inline-block"></i>C (50)</span>
          </div>
        </div>

        <div id="rk-table-zone"></div>
      </div>
    </div>
  `;

  let currentFilteredRows = [];

  function renderTableZone() {
    const zone = $('#rk-table-zone');
    const periodRanking = getRanking(users, entries, rankState.period).map(r => ({
      ...r,
      globalRank: globalRankMap.get(r.id) || r.rank
    }));

    const q = rankState.search.trim().toLowerCase();
    let filtered = periodRanking.filter(r => {
      const ms = !q || r.name.toLowerCase().includes(q) || r.subject.toLowerCase().includes(q);
      const msub = rankState.subject === 'all' || extractSubjectLabel(r.subject) === rankState.subject;
      return ms && msub;
    });

    const dir = rankState.sortDir === 'asc' ? 1 : -1;
    filtered.sort((a, b) => {
      const k = rankState.sortBy;
      if (k === 'name') return a.name.localeCompare(b.name) * dir;
      if (k === 'globalRank') return (a.globalRank - b.globalRank) * dir;
      return ((a[k] ?? 0) - (b[k] ?? 0)) * dir || a.globalRank - b.globalRank;
    });

    currentFilteredRows = filtered;

    const hasFilters = Boolean(q || rankState.subject !== 'all' || rankState.period !== 'all');
    $('#rk-clear-btn').style.display = hasFilters ? 'inline-flex' : 'none';

    const totalItems = filtered.length;
    const pageSize = rankState.pageSize === 'all' ? Math.max(1, totalItems) : Number(rankState.pageSize);
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    if (rankState.page > totalPages) rankState.page = totalPages;
    const startIdx = (rankState.page - 1) * pageSize;
    const pageRows = filtered.slice(startIdx, startIdx + pageSize);

    const sortIcon = col => {
      if (rankState.sortBy !== col) return icon('arrow-up-down', 13);
      return icon(rankState.sortDir === 'asc' ? 'arrow-up' : 'arrow-down', 13);
    };

    if (pageRows.length === 0) {
      zone.innerHTML = emptyStateHtml({
        iconName: 'search',
        title: 'Mos keluvchi pedagog topilmadi',
        desc: 'Qidiruv so‘rovi yoki tanlangan filtrlarni tozalab qayta urinib ko‘ring.',
        actionHtml: `<button type="button" class="btn btn-secondary" id="rk-empty-reset">Filtrlarni tozalash</button>`
      });
      const er = $('#rk-empty-reset');
      if (er) er.onclick = resetFilters;
      return;
    }

    zone.innerHTML = `
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:10px">
        Topildi: <b>${totalItems}</b> nafar pedagog ${rankState.period !== 'all' ? `· Davr: <b>${esc(PERIOD_LABELS[rankState.period])}</b> (umumiy o‘rin saqlangan)` : ''}
      </div>

      <div class="table-wrap desktop-table-only" style="max-height:600px;overflow-y:auto">
        <table class="data-table">
          <thead>
            <tr>
              <th><button type="button" class="sort-btn" data-sort="globalRank">O‘rin ${sortIcon('globalRank')}</button></th>
              <th><button type="button" class="sort-btn" data-sort="name">Pedagog ${sortIcon('name')}</button></th>
              <th>Fan / Sinf</th>
              <th><button type="button" class="sort-btn" data-sort="T">Ball ${sortIcon('T')}</button></th>
              <th style="min-width:130px">Taqsimot</th>
              <th><button type="button" class="sort-btn" data-sort="A">A (50) ${sortIcon('A')}</button></th>
              <th><button type="button" class="sort-btn" data-sort="B">B (30) ${sortIcon('B')}</button></th>
              <th><button type="button" class="sort-btn" data-sort="C">C (50) ${sortIcon('C')}</button></th>
              <th><button type="button" class="sort-btn" data-sort="approvedCount">Yutuq ${sortIcon('approvedCount')}</button></th>
              <th style="text-align:right">Profil</th>
            </tr>
          </thead>
          <tbody>
            ${pageRows.map(r => {
              const u = userMap.get(r.id);
              return `
                <tr class="${r.id === me.id ? 'is-me' : ''}">
                  <td><span class="rank-badge ${r.globalRank <= 3 ? `r${r.globalRank}` : 'rn'}">#${r.globalRank}</span></td>
                  <td>
                    <div style="display:flex;align-items:center;gap:10px">
                      ${avatarHtml(r.name, 'sm', u?.avatar_url)}
                      <div style="font-weight:600">${esc(r.name)} ${r.id === me.id ? '<span class="badge badge-primary" style="margin-left:4px">Siz</span>' : ''}</div>
                    </div>
                  </td>
                  <td style="color:var(--text-2)">${esc(r.subject)}</td>
                  <td><span style="font-size:15.5px;font-weight:700;color:var(--primary)">${r.T}</span> <span style="font-size:11.5px;color:var(--text-muted)">/ 130</span></td>
                  <td>
                    <div class="progress-stack">
                      <i class="seg-a" style="width:${(r.A / 130) * 100}%"></i>
                      <i class="seg-b" style="width:${(r.B / 130) * 100}%"></i>
                      <i class="seg-c" style="width:${(r.C / 130) * 100}%"></i>
                    </div>
                  </td>
                  <td>${r.A}</td>
                  <td>${r.B}</td>
                  <td>${r.C}</td>
                  <td><span class="badge badge-neutral">${r.approvedCount}</span></td>
                  <td style="text-align:right">
                    <div style="display:inline-flex;gap:6px">
                      <button type="button" class="btn btn-secondary btn-sm" data-open-prof="${r.id}">Profil</button>
                      <button type="button" class="btn btn-ghost btn-icon btn-sm" data-open-port="${r.id}" title="A4 Portfolio" aria-label="A4 Portfolio">${icon('printer', 14)}</button>
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>

      <div class="mobile-card-list">
        ${pageRows.map(r => {
          const u = userMap.get(r.id);
          return `
            <div class="card card-compact" style="box-shadow:none;${r.id === me.id ? 'border-color:var(--primary)' : ''}">
              <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px">
                <div style="display:flex;align-items:center;gap:10px;min-width:0">
                  <span class="rank-badge ${r.globalRank <= 3 ? `r${r.globalRank}` : 'rn'}">#${r.globalRank}</span>
                  ${avatarHtml(r.name, 'sm', u?.avatar_url)}
                  <div style="min-width:0">
                    <div style="font-weight:600;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(r.name)}</div>
                    <div style="font-size:12px;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(r.subject)}</div>
                  </div>
                </div>
                <div style="text-align:right;flex-shrink:0">
                  <div style="font-size:17px;font-weight:700;color:var(--primary)">${r.T}</div>
                  <div style="font-size:11px;color:var(--text-muted)">/ 130</div>
                </div>
              </div>
              <div class="progress-stack" style="margin-bottom:8px">
                <i class="seg-a" style="width:${(r.A / 130) * 100}%"></i>
                <i class="seg-b" style="width:${(r.B / 130) * 100}%"></i>
                <i class="seg-c" style="width:${(r.C / 130) * 100}%"></i>
              </div>
              <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-muted);margin-bottom:10px">
                <span>A: <b>${r.A}</b>/50</span><span>B: <b>${r.B}</b>/30</span><span>C: <b>${r.C}</b>/50</span><span>Yutuq: <b>${r.approvedCount}</b></span>
              </div>
              <div style="display:flex;gap:8px">
                <button type="button" class="btn btn-secondary" style="flex:1" data-open-prof="${r.id}">Profilni ko‘rish</button>
                <button type="button" class="btn btn-secondary btn-icon" data-open-port="${r.id}" aria-label="A4 Portfolio">${icon('printer', 16)}</button>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-top:14px">
        <div style="display:flex;align-items:center;gap:8px;font-size:12.5px;color:var(--text-muted)">
          <span>${startIdx + 1}–${Math.min(startIdx + pageSize, totalItems)} / ${totalItems}</span>
          <select id="rk-pagesize" class="input" style="width:auto;min-height:32px;padding:4px 8px;font-size:12.5px">
            <option value="15" ${rankState.pageSize === 15 ? 'selected' : ''}>15 ta</option>
            <option value="25" ${rankState.pageSize === 25 ? 'selected' : ''}>25 ta</option>
            <option value="50" ${rankState.pageSize === 50 ? 'selected' : ''}>50 ta</option>
            <option value="all" ${rankState.pageSize === 'all' ? 'selected' : ''}>Barchasi</option>
          </select>
        </div>
        <div style="display:flex;align-items:center;gap:6px">
          <button type="button" class="btn btn-secondary btn-sm" id="rk-prev" ${rankState.page <= 1 ? 'disabled' : ''}>${icon('chevron-left', 14)} Oldingi</button>
          <span style="font-size:12.5px;font-weight:500;padding:0 6px">${rankState.page} / ${totalPages}</span>
          <button type="button" class="btn btn-secondary btn-sm" id="rk-next" ${rankState.page >= totalPages ? 'disabled' : ''}>Keyingi ${icon('chevron-right', 14)}</button>
        </div>
      </div>
    `;

    $$('[data-sort]', zone).forEach(btn => {
      btn.onclick = () => {
        const col = btn.dataset.sort;
        if (rankState.sortBy === col) rankState.sortDir = rankState.sortDir === 'asc' ? 'desc' : 'asc';
        else { rankState.sortBy = col; rankState.sortDir = col === 'name' || col === 'globalRank' ? 'asc' : 'desc'; }
        renderTableZone();
      };
    });
    $('#rk-pagesize').onchange = e => {
      rankState.pageSize = e.target.value === 'all' ? 'all' : Number(e.target.value);
      rankState.page = 1;
      renderTableZone();
    };
    $('#rk-prev').onclick = () => { if (rankState.page > 1) { rankState.page -= 1; renderTableZone(); } };
    $('#rk-next').onclick = () => { if (rankState.page < totalPages) { rankState.page += 1; renderTableZone(); } };
    $$('[data-open-prof]', zone).forEach(b => { b.onclick = () => ctx.openProfile(Number(b.dataset.openProf)); });
    $$('[data-open-port]', zone).forEach(b => { b.onclick = () => ctx.openPortfolioPrint(Number(b.dataset.openPort)); });
  }

  function resetFilters() {
    rankState = { search: '', subject: 'all', period: 'all', sortBy: 'globalRank', sortDir: 'asc', page: 1, pageSize: 15 };
    $('#rk-search').value = '';
    $('#rk-subject').value = 'all';
    $('#rk-period').value = 'all';
    renderTableZone();
  }

  $('#rk-search').oninput = e => { rankState.search = e.target.value; rankState.page = 1; renderTableZone(); };
  $('#rk-subject').onchange = e => { rankState.subject = e.target.value; rankState.page = 1; renderTableZone(); };
  $('#rk-period').onchange = e => { rankState.period = e.target.value; rankState.page = 1; renderTableZone(); };
  $('#rk-clear-btn').onclick = resetFilters;
  $('#rk-export-btn').onclick = () => exportRankingCSV(currentFilteredRows, PERIOD_LABELS[rankState.period]);
  $$('.podium-card[data-open-prof]').forEach(c => { c.onclick = () => ctx.openProfile(Number(c.dataset.openProf)); });

  renderTableZone();
}
