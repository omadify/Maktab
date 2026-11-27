// Ranking Leaderboard View: Top 3 Spotlight, Search, Subject & Period Filters, Sort, Pagination, Mobile Cards
import { getRanking, extractSubjectLabel } from '../config.js';
import { icon } from '../icons.js';
import { $, $$, esc, csvCell, toast, avatarHtml, emptyStateHtml } from '../ui.js';

let rankState = {
  search: '',
  subject: 'all',
  period: 'all',
  sortBy: 'rank',
  sortDir: 'asc',
  page: 1,
  pageSize: 15
};

export function exportRankingCSV(ranking) {
  const rows = ranking.map(r => [r.rank, r.name, r.subject, r.A, r.B, r.C, r.T].map(csvCell).join(';'));
  const blob = new Blob(['\ufeffO‘rin;F.I.Sh.;Fan;Salohiyat (50);Yutuqlar (30);Rag‘bat (50);Jami (130)\n' + rows.join('\n')], {
    type: 'text/csv;charset=utf-8'
  });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'pedagoglar_reytingi_hisobot.csv';
  a.click();
  toast('Reyting hisoboti CSV formatida yuklab olindi.', 'success');
}

export function renderRanking(el, ctx) {
  const { me, users, entries } = ctx;
  const fullRanking = getRanking(users, entries, rankState.period);

  if (fullRanking.length === 0 && rankState.period === 'all') {
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
            desc: 'Maktab ma’muriyati va mas’ul baholovchilar reytingda qatnashmaydi. O‘qituvchilar ro‘yxati Administrator panelida yuklangach, reyting jadvali avtomatik shakllanadi.',
            actionHtml: ['director', 'it_admin'].includes(me.role)
              ? `<button type="button" class="btn btn-primary" id="rk-goto-admin">${icon('user-plus', 15)} Pedagoglarni yuklash</button>`
              : ''
          })}
        </div>
      </div>
    `;
    const gotoAdmin = $('#rk-goto-admin');
    if (gotoAdmin) gotoAdmin.onclick = () => ctx.navigate('admin');
    return;
  }

  const subjects = Array.from(new Set(fullRanking.map(r => extractSubjectLabel(r.subject)))).sort();

  // Filter
  const q = rankState.search.trim().toLowerCase();
  let filtered = fullRanking.filter(r => {
    const matchSearch = !q || r.name.toLowerCase().includes(q) || r.subject.toLowerCase().includes(q);
    const matchSubject = rankState.subject === 'all' || extractSubjectLabel(r.subject) === rankState.subject;
    return matchSearch && matchSubject;
  });

  // Sort
  const dir = rankState.sortDir === 'asc' ? 1 : -1;
  filtered.sort((a, b) => {
    const k = rankState.sortBy;
    if (k === 'name') return a.name.localeCompare(b.name) * dir;
    if (k === 'rank') return (a.rank - b.rank) * dir;
    return ((a[k] ?? 0) - (b[k] ?? 0)) * dir || a.rank - b.rank;
  });

  // Pagination
  const totalItems = filtered.length;
  const pageSize = rankState.pageSize === 'all' ? Math.max(1, totalItems) : Number(rankState.pageSize);
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  if (rankState.page > totalPages) rankState.page = totalPages;
  const startIdx = (rankState.page - 1) * pageSize;
  const pageRows = filtered.slice(startIdx, startIdx + pageSize);

  const top3 = fullRanking.slice(0, 3);
  const sortIcon = col => {
    if (rankState.sortBy !== col) return icon('arrow-up-down', 13);
    return icon(rankState.sortDir === 'asc' ? 'arrow-up' : 'arrow-down', 13);
  };

  el.innerHTML = `
    <div class="stack-v">
      <div class="page-header">
        <div>
          <h1 class="page-title">Reyting jadvali</h1>
          <p class="page-desc">Jami ${fullRanking.length} nafar pedagog · 130 ballik baholash tizimi (A: 50, B: 30, C: 50)</p>
        </div>
        <div class="page-actions">
          <button type="button" class="btn btn-secondary" id="rk-export-btn">${icon('download', 15)} Excel (CSV) yuklab olish</button>
        </div>
      </div>

      <!-- Top 3 Spotlight Cards -->
      ${top3.length > 0 ? `
        <div class="podium-grid">
          ${top3.map(r => `
            <div class="podium-card ${r.rank === 1 ? 'rank-1' : ''}" data-open-prof="${r.id}">
              <div style="display:flex;align-items:center;justify-content:space-between;gap:10px">
                <span class="rank-badge r${r.rank}">#${r.rank}-o‘rin</span>
                <span class="badge ${r.rank === 1 ? 'badge-primary' : 'badge-neutral'}">${r.approvedCount} ta tasdiqlangan</span>
              </div>
              <div style="display:flex;align-items:center;gap:12px">
                ${avatarHtml(r.name, 'lg')}
                <div style="min-width:0">
                  <div style="font-size:15px;font-weight:700;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(r.name)}</div>
                  <div style="font-size:12.5px;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(r.subject)}</div>
                </div>
              </div>
              <div>
                <div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:6px">
                  <span style="font-size:24px;font-weight:700;color:var(--primary);font-variant-numeric:tabular-nums">${r.T} <small style="font-size:12.5px;font-weight:500;color:var(--text-muted)">/ 130</small></span>
                  <span style="font-size:12px;color:var(--text-muted)">A:${r.A} · B:${r.B} · C:${r.C}</span>
                </div>
                <div class="progress-stack">
                  <i class="seg-a" style="width:${(r.A / 130) * 100}%"></i>
                  <i class="seg-b" style="width:${(r.B / 130) * 100}%"></i>
                  <i class="seg-c" style="width:${(r.C / 130) * 100}%"></i>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      ` : ''}

      <div class="card">
        <!-- Filters & Search -->
        <div class="filter-bar">
          <div class="filter-controls">
            <div class="input-icon-wrap" style="min-width:220px;flex:1;max-width:320px">
              <span class="input-leading">${icon('search', 15)}</span>
              <input id="rk-search" class="input has-leading" type="search" value="${esc(rankState.search)}" placeholder="F.I.Sh., sinf yoki fan bo‘yicha qidirish…">
            </div>

            <select id="rk-subject" class="input" style="width:auto;min-width:170px" aria-label="Fan bo‘yicha saralash">
              <option value="all" ${rankState.subject === 'all' ? 'selected' : ''}>Barcha fanlar</option>
              ${subjects.map(s => `<option value="${esc(s)}" ${rankState.subject === s ? 'selected' : ''}>${esc(s)}</option>`).join('')}
            </select>

            <select id="rk-period" class="input" style="width:auto;min-width:160px" aria-label="Davr bo‘yicha filtrlash">
              <option value="all" ${rankState.period === 'all' ? 'selected' : ''}>Barcha davr (Umumiy)</option>
              <option value="this_month" ${rankState.period === 'this_month' ? 'selected' : ''}>Joriy oy</option>
              <option value="prev_month" ${rankState.period === 'prev_month' ? 'selected' : ''}>O‘tgan oy</option>
              <option value="quarter" ${rankState.period === 'quarter' ? 'selected' : ''}>Oxirgi 3 oy</option>
              <option value="this_year" ${rankState.period === 'this_year' ? 'selected' : ''}>Joriy yil</option>
            </select>
          </div>

          <div style="display:flex;align-items:center;gap:10px;font-size:12.5px;color:var(--text-muted)">
            <span style="display:inline-flex;align-items:center;gap:5px"><i style="width:9px;height:9px;border-radius:3px;background:var(--sec-a);display:inline-block"></i>A (50)</span>
            <span style="display:inline-flex;align-items:center;gap:5px"><i style="width:9px;height:9px;border-radius:3px;background:var(--sec-b);display:inline-block"></i>B (30)</span>
            <span style="display:inline-flex;align-items:center;gap:5px"><i style="width:9px;height:9px;border-radius:3px;background:var(--sec-c);display:inline-block"></i>C (50)</span>
          </div>
        </div>

        ${pageRows.length === 0
          ? emptyStateHtml({
              iconName: 'search',
              title: 'Mos keluvchi pedagog topilmadi',
              desc: 'Qidiruv so‘rovi yoki tanlangan filtrlarni o‘zgartirib ko‘ring.',
              actionHtml: `<button type="button" class="btn btn-secondary" id="rk-reset-filters">Filtrlarni tozalash</button>`
            })
          : `
            <!-- Desktop Sticky Table -->
            <div class="table-wrap desktop-table-only" style="max-height:620px;overflow-y:auto">
              <table class="data-table">
                <thead>
                  <tr>
                    <th><button type="button" class="sort-btn" data-sort="rank">O‘rin ${sortIcon('rank')}</button></th>
                    <th><button type="button" class="sort-btn" data-sort="name">Pedagog ${sortIcon('name')}</button></th>
                    <th>Fan / Sinf</th>
                    <th><button type="button" class="sort-btn" data-sort="T">Umumiy ball ${sortIcon('T')}</button></th>
                    <th style="min-width:140px">Taqsimot</th>
                    <th><button type="button" class="sort-btn" data-sort="A">A (50) ${sortIcon('A')}</button></th>
                    <th><button type="button" class="sort-btn" data-sort="B">B (30) ${sortIcon('B')}</button></th>
                    <th><button type="button" class="sort-btn" data-sort="C">C (50) ${sortIcon('C')}</button></th>
                    <th><button type="button" class="sort-btn" data-sort="approvedCount">Yutuqlar ${sortIcon('approvedCount')}</button></th>
                    <th style="text-align:right">Profil</th>
                  </tr>
                </thead>
                <tbody>
                  ${pageRows.map(r => `
                    <tr class="${r.id === me.id ? 'is-me' : ''}">
                      <td>
                        <span class="rank-badge ${r.rank <= 3 ? `r${r.rank}` : 'r2'}">#${r.rank}</span>
                      </td>
                      <td>
                        <div style="display:flex;align-items:center;gap:10px">
                          ${avatarHtml(r.name, 'sm')}
                          <div>
                            <div style="font-weight:600">${esc(r.name)} ${r.id === me.id ? '<span class="badge badge-primary" style="margin-left:4px">Siz</span>' : ''}</div>
                          </div>
                        </div>
                      </td>
                      <td style="color:var(--text-2)">${esc(r.subject)}</td>
                      <td><span style="font-size:16px;font-weight:700;color:var(--primary)">${r.T}</span> <span style="font-size:12px;color:var(--text-muted)">/ 130</span></td>
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
                      <td><span class="badge badge-neutral">${r.approvedCount} ta</span></td>
                      <td style="text-align:right">
                        <div style="display:inline-flex;gap:6px">
                          <button type="button" class="btn btn-secondary btn-sm" data-open-prof="${r.id}">Profil</button>
                          <button type="button" class="btn btn-ghost btn-icon btn-sm" data-open-port="${r.id}" title="A4 Portfolio chop etish" aria-label="A4 Portfolio">${icon('printer', 14)}</button>
                        </div>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>

            <!-- Mobile Card View -->
            <div class="mobile-card-list">
              ${pageRows.map(r => `
                <div class="card card-compact" style="box-shadow:none;${r.id === me.id ? 'border-color:var(--primary)' : ''}">
                  <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px">
                    <div style="display:flex;align-items:center;gap:10px;min-width:0">
                      <span class="rank-badge ${r.rank <= 3 ? `r${r.rank}` : 'r2'}">#${r.rank}</span>
                      ${avatarHtml(r.name, 'sm')}
                      <div style="min-width:0">
                        <div style="font-weight:600;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(r.name)}</div>
                        <div style="font-size:12px;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(r.subject)}</div>
                      </div>
                    </div>
                    <div style="text-align:right;flex-shrink:0">
                      <div style="font-size:18px;font-weight:700;color:var(--primary)">${r.T}</div>
                      <div style="font-size:11px;color:var(--text-muted)">/ 130 ball</div>
                    </div>
                  </div>
                  <div class="progress-stack" style="margin-bottom:10px">
                    <i class="seg-a" style="width:${(r.A / 130) * 100}%"></i>
                    <i class="seg-b" style="width:${(r.B / 130) * 100}%"></i>
                    <i class="seg-c" style="width:${(r.C / 130) * 100}%"></i>
                  </div>
                  <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-muted);margin-bottom:12px">
                    <span>A: <b>${r.A}</b>/50</span>
                    <span>B: <b>${r.B}</b>/30</span>
                    <span>C: <b>${r.C}</b>/50</span>
                    <span>Yutuq: <b>${r.approvedCount}</b></span>
                  </div>
                  <div style="display:flex;gap:8px">
                    <button type="button" class="btn btn-secondary" style="flex:1" data-open-prof="${r.id}">Batafsil profil</button>
                    <button type="button" class="btn btn-secondary btn-icon" data-open-port="${r.id}" aria-label="A4 Portfolio">${icon('printer', 16)}</button>
                  </div>
                </div>
              `).join('')}
            </div>

            <!-- Pagination Footer -->
            <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-top:16px">
              <div style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text-muted)">
                <span>Ko‘rsatilmoqda: ${startIdx + 1}–${Math.min(startIdx + pageSize, totalItems)} / ${totalItems}</span>
                <select id="rk-pagesize" class="input" style="width:auto;min-height:32px;padding:4px 8px;font-size:12.5px">
                  <option value="15" ${rankState.pageSize === 15 ? 'selected' : ''}>15 ta</option>
                  <option value="25" ${rankState.pageSize === 25 ? 'selected' : ''}>25 ta</option>
                  <option value="50" ${rankState.pageSize === 50 ? 'selected' : ''}>50 ta</option>
                  <option value="all" ${rankState.pageSize === 'all' ? 'selected' : ''}>Barchasi</option>
                </select>
              </div>
              <div style="display:flex;align-items:center;gap:6px">
                <button type="button" class="btn btn-secondary btn-sm" id="rk-prev" ${rankState.page <= 1 ? 'disabled' : ''}>${icon('chevron-left', 14)} Oldingi</button>
                <span style="font-size:13px;font-weight:500;padding:0 8px">${rankState.page} / ${totalPages}</span>
                <button type="button" class="btn btn-secondary btn-sm" id="rk-next" ${rankState.page >= totalPages ? 'disabled' : ''}>Keyingi ${icon('chevron-right', 14)}</button>
              </div>
            </div>
          `}
      </div>
    </div>
  `;

  $('#rk-export-btn').onclick = () => exportRankingCSV(filtered);

  const searchInp = $('#rk-search');
  searchInp.oninput = () => {
    const pos = searchInp.selectionStart;
    rankState.search = searchInp.value;
    rankState.page = 1;
    renderRanking(el, ctx);
    const nextInp = $('#rk-search');
    if (nextInp) {
      nextInp.focus();
      nextInp.setSelectionRange(pos, pos);
    }
  };

  $('#rk-subject').onchange = e => {
    rankState.subject = e.target.value;
    rankState.page = 1;
    renderRanking(el, ctx);
  };

  $('#rk-period').onchange = e => {
    rankState.period = e.target.value;
    rankState.page = 1;
    renderRanking(el, ctx);
  };

  const resetBtn = $('#rk-reset-filters');
  if (resetBtn) {
    resetBtn.onclick = () => {
      rankState = { search: '', subject: 'all', period: 'all', sortBy: 'rank', sortDir: 'asc', page: 1, pageSize: 15 };
      renderRanking(el, ctx);
    };
  }

  $$('[data-sort]').forEach(btn => {
    btn.onclick = () => {
      const col = btn.dataset.sort;
      if (rankState.sortBy === col) {
        rankState.sortDir = rankState.sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        rankState.sortBy = col;
        rankState.sortDir = col === 'name' || col === 'rank' ? 'asc' : 'desc';
      }
      renderRanking(el, ctx);
    };
  });

  const pageSizeSel = $('#rk-pagesize');
  if (pageSizeSel) {
    pageSizeSel.onchange = e => {
      rankState.pageSize = e.target.value === 'all' ? 'all' : Number(e.target.value);
      rankState.page = 1;
      renderRanking(el, ctx);
    };
  }

  const prevBtn = $('#rk-prev');
  if (prevBtn) prevBtn.onclick = () => { if (rankState.page > 1) { rankState.page -= 1; renderRanking(el, ctx); } };
  const nextBtn = $('#rk-next');
  if (nextBtn) nextBtn.onclick = () => { if (rankState.page < totalPages) { rankState.page += 1; renderRanking(el, ctx); } };

  $$('[data-open-prof]').forEach(elBtn => {
    elBtn.onclick = () => ctx.openProfile(Number(elBtn.dataset.openProf));
  });
  $$('[data-open-port]').forEach(elBtn => {
    elBtn.onclick = () => ctx.openPortfolioPrint(Number(elBtn.dataset.openPort));
  });
}
