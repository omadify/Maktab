// Teachers Directory (Grid/Table + Partial Updates), 4-Tab Profile (Overview, Stats, History, Portfolio) & A4 Print
import { IND, IMAP, ROLE, SEC, calcScores, getRanking, extractSubjectLabel } from '../config.js';
import { icon } from '../icons.js';
import { $, $$, esc, avatarHtml, badgeStatus, emptyStateHtml, formatDateUz } from '../ui.js';
import { renderAreaChart, renderBarChart, renderDonutChart } from '../charts.js';

let dirState = { search: '', subject: 'all', view: 'grid' };
let profileTab = 'overview';
let lastProfileUid = null;

export function renderTeachersDirectory(el, ctx) {
  const { users, entries } = ctx;
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
              ${filtered.map(r => `
                <tr>
                  <td><span class="rank-badge ${r.rank <= 3 ? `r${r.rank}` : 'rn'}">#${r.rank}</span></td>
                  <td><div style="display:flex;align-items:center;gap:10px">${avatarHtml(r.name, 'sm')}<b>${esc(r.name)}</b></div></td>
                  <td style="color:var(--text-2)">${esc(r.subject)}</td>
                  <td style="color:var(--text-muted)">${r.A} · ${r.B} · ${r.C}</td>
                  <td><b style="color:var(--primary)">${r.T} ball</b></td>
                  <td style="text-align:right"><button type="button" class="btn btn-secondary btn-sm" data-dir-prof="${r.id}">Profil</button></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } else {
      zone.innerHTML = `
        <div class="grid-3">
          ${filtered.map(r => `
            <div class="card card-compact card-interactive" data-dir-prof="${r.id}" style="box-shadow:none;cursor:pointer;display:flex;flex-direction:column;gap:12px">
              <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
                <span class="rank-badge ${r.rank <= 3 ? `r${r.rank}` : 'rn'}">#${r.rank}</span>
                <span style="font-size:15.5px;font-weight:700;color:var(--primary)">${r.T} ball</span>
              </div>
              <div style="display:flex;align-items:center;gap:12px">
                ${avatarHtml(r.name)}
                <div style="min-width:0">
                  <div style="font-weight:600;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(r.name)}</div>
                  <div style="font-size:12px;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(r.subject)}</div>
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
          `).join('')}
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
      renderZone();
    };
  });

  renderZone();
}

export function renderProfile(el, ctx) {
  const { me, users, entries } = ctx;
  const targetUid = ctx.params?.uid || me.id;
  if (lastProfileUid !== targetUid) {
    profileTab = 'overview';
    lastProfileUid = targetUid;
  }

  const user = users.find(u => u.id === targetUid) || me;
  const isOwn = user.id === me.id;
  const isStaff = ['director', 'reviewer', 'it_admin'].includes(me.role);
  const canViewPrivate = isOwn || me.role === 'director' || me.role === 'reviewer';

  const allUserEntries = entries.filter(e => e.uid === user.id);
  const visibleEntries = canViewPrivate ? allUserEntries : allUserEntries.filter(e => e.status === 'approved');
  const approvedEntries = allUserEntries.filter(e => e.status === 'approved');
  const k = calcScores(allUserEntries);
  const ranking = getRanking(users, entries);
  const rank = ranking.find(r => r.id === user.id);

  el.innerHTML = `
    <div class="stack-v">
      <div class="page-header noprint">
        <button type="button" class="btn btn-secondary btn-sm" id="prof-back-btn">${icon('chevron-left', 15)} Orqaga</button>
        <div class="page-actions">
          <button type="button" class="btn btn-primary" id="prof-print-btn">${icon('printer', 15)} A4 Chop etish</button>
        </div>
      </div>

      <div class="card noprint">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:24px;flex-wrap:wrap">
          <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
            ${avatarHtml(user.name, 'xl')}
            <div>
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                <h1 style="font-size:21px;font-weight:700">${esc(user.name)}</h1>
                <span class="badge badge-neutral">${esc(ROLE[user.role] || user.role)}</span>
                <span class="badge ${user.active ? 'badge-success' : 'badge-neutral'}">${user.active ? 'Faol' : 'Nofaol'}</span>
                ${rank ? `<span class="badge badge-primary">#${rank.rank}-o‘rin (${ranking.length} tadan)</span>` : ''}
              </div>
              <div style="font-size:13.5px;color:var(--text-muted);margin-top:4px">${esc(user.subject || 'Mutaxassislik belgilanmagan')}</div>
              ${!canViewPrivate ? `
                <div style="font-size:12px;color:var(--text-subtle);margin-top:4px;display:inline-flex;align-items:center;gap:4px">
                  ${icon('shield', 12)} Maxfiylik himoyasi: faqat tasdiqlangan ommaviy natijalar ko‘rsatilmoqda
                </div>
              ` : ''}
            </div>
          </div>

          <div style="min-width:210px;text-align:right">
            <div style="font-size:12px;color:var(--text-muted);font-weight:500">Umumiy reyting bali</div>
            <div style="font-size:32px;font-weight:700;color:var(--primary);line-height:1.1;font-variant-numeric:tabular-nums">
              ${k.T} <span style="font-size:13.5px;font-weight:500;color:var(--text-muted)">/ 130</span>
            </div>
            <div class="progress-stack" style="margin-top:8px">
              <i class="seg-a" style="width:${(k.A / 130) * 100}%"></i>
              <i class="seg-b" style="width:${(k.B / 130) * 100}%"></i>
              <i class="seg-c" style="width:${(k.C / 130) * 100}%"></i>
            </div>
          </div>
        </div>

        <div style="margin-top:20px;padding-top:14px;border-top:1px solid var(--border)">
          <div class="tabs-pill" role="tablist">
            <button type="button" class="tab-btn ${profileTab === 'overview' ? 'active' : ''}" data-ptab="overview" role="tab">${icon('layers', 14)} Umumiy ma’lumot</button>
            <button type="button" class="tab-btn ${profileTab === 'stats' ? 'active' : ''}" data-ptab="stats" role="tab">${icon('bar-chart-3', 14)} Statistika</button>
            <button type="button" class="tab-btn ${profileTab === 'history' ? 'active' : ''}" data-ptab="history" role="tab">${icon('file-text', 14)} Yutuqlar tarixi <span class="tab-count">${visibleEntries.length}</span></button>
            <button type="button" class="tab-btn ${profileTab === 'portfolio' ? 'active' : ''}" data-ptab="portfolio" role="tab">${icon('printer', 14)} Portfolio</button>
          </div>
        </div>
      </div>

      <div id="prof-tab-body"></div>
    </div>
  `;

  $('#prof-back-btn').onclick = () => ctx.navigate(isStaff ? 'teachers' : 'ranking');
  $('#prof-print-btn').onclick = () => ctx.openPortfolioPrint(user.id);
  $$('[data-ptab]').forEach(btn => {
    btn.onclick = () => { profileTab = btn.dataset.ptab; renderProfile(el, ctx); };
  });

  const body = $('#prof-tab-body');
  if (profileTab === 'overview') renderProfileOverview(body, k, approvedEntries);
  else if (profileTab === 'stats') renderProfileStats(body, k, approvedEntries);
  else if (profileTab === 'history') renderProfileHistory(body, visibleEntries, canViewPrivate);
  else body.innerHTML = buildPortfolioSheetHtml(user, approvedEntries, k, rank);
}

function renderProfileOverview(body, k, approvedEntries) {
  body.innerHTML = `
    <div class="stack-v">
      <div class="grid-3">
        <div class="card card-compact">
          <div style="font-size:12px;color:var(--text-muted)">A bo‘lim — ${SEC.A[0]}</div>
          <div style="font-size:25px;font-weight:700;margin:5px 0">${k.A} <small style="font-size:13px;color:var(--text-muted)">/ 50</small></div>
          <div class="progress-single"><i style="width:${(k.A / 50) * 100}%;background:var(--sec-a)"></i></div>
        </div>
        <div class="card card-compact">
          <div style="font-size:12px;color:var(--text-muted)">B bo‘lim — ${SEC.B[0]}</div>
          <div style="font-size:25px;font-weight:700;margin:5px 0">${k.B} <small style="font-size:13px;color:var(--text-muted)">/ 30</small></div>
          <div class="progress-single"><i style="width:${(k.B / 30) * 100}%;background:var(--sec-b)"></i></div>
        </div>
        <div class="card card-compact">
          <div style="font-size:12px;color:var(--text-muted)">C bo‘lim — ${SEC.C[0]}</div>
          <div style="font-size:25px;font-weight:700;margin:5px 0">${k.C} <small style="font-size:13px;color:var(--text-muted)">/ 50</small></div>
          <div class="progress-single"><i style="width:${(k.C / 50) * 100}%;background:var(--sec-c)"></i></div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div><h3 class="card-title">15 ta indikator bo‘yicha natijalar</h3><p class="card-subtitle">Tasdiqlangan (${approvedEntries.length} ta yutuq) va kutilayotgan ballar</p></div>
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
                    <td><b style="color:${sc.ok > 0 ? 'var(--primary)' : 'var(--text-muted)'}">${sc.ok}</b>${sc.wait > 0 ? ` <span style="font-size:11.5px;color:var(--warning)">(+${sc.wait})</span>` : ''}</td>
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
    <div class="grid-2">
      <div class="card"><div class="card-header"><div><h3 class="card-title">Yutuqlar sanasi bo‘yicha dinamika</h3><p class="card-subtitle">Tasdiqlangan ballar</p></div></div><div id="prof-area-chart"></div></div>
      <div class="card"><div class="card-header"><div><h3 class="card-title">Bo‘limlar bo‘yicha taqsimot</h3><p class="card-subtitle">Jami ${k.T} ball</p></div></div><div id="prof-donut-chart"></div></div>
      <div class="card" style="grid-column:1/-1"><div class="card-header"><div><h3 class="card-title">Asosiy mezonlar</h3><p class="card-subtitle">Eng ko‘p ball keltirgan indikatorlar</p></div></div><div id="prof-bar-chart"></div></div>
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

function renderProfileHistory(body, entries, canViewPrivate) {
  body.innerHTML = `
    <div class="card">
      <div class="card-header">
        <div>
          <h3 class="card-title">Yutuqlar tarixi va hujjatlar (${entries.length} ta)</h3>
          <p class="card-subtitle">${canViewPrivate ? 'Barcha arizalar va biriktirilgan hujjatlar' : 'Faqat tasdiqlangan ommaviy natijalar'}</p>
        </div>
      </div>
      ${entries.length === 0
        ? emptyStateHtml({ iconName: 'file-text', title: 'Yutuqlar tarixi bo‘sh', desc: 'Ko‘rsatish uchun yutuqlar mavjud emas.' })
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
                    ${canViewPrivate ? `<td>${e.fpath ? `<a href="${esc(e.fpath)}" target="_blank" rel="noopener" class="btn btn-secondary btn-sm">${icon('external-link', 13)} Hujjat</a>` : '—'}</td>` : ''}
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>`}
    </div>
  `;
}

function buildPortfolioSheetHtml(user, approvedEntries, k, rank) {
  return `
    <div class="portfolio-sheet">
      <div style="text-align:center;border-bottom:2px solid #111827;padding-bottom:14px;margin-bottom:20px">
        <h1 style="font-size:20px;margin-bottom:4px">Norin tuman ixtisoslashtirilgan maktabi</h1>
        <p style="margin:0;font-size:13px;color:#475467">Pedagogik faoliyat natijalari va reyting portfoliosi (26-AF buyruq asosida)</p>
      </div>

      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:20px;padding-bottom:14px;border-bottom:1px solid #D0D5DD">
        <div>
          <div style="font-size:17.5px;font-weight:700">${esc(user.name)}</div>
          <div style="font-size:13px;color:#475467;margin-top:3px">Fani / Lavozimi: <b>${esc(user.subject || 'Pedagog')}</b></div>
          <div style="font-size:13px;color:#475467;margin-top:2px">Reytingdagi o‘rni: <b>#${rank ? rank.rank : '—'}</b></div>
        </div>
        <div style="text-align:right">
          <div style="font-size:25px;font-weight:800;color:#2448C7">${k.T} ball</div>
          <div style="font-size:12px;color:#667085">Maksimal ball: 130</div>
          <div style="font-size:11.5px;color:#667085;margin-top:2px">Sana: ${new Date().toLocaleDateString('uz-UZ')}</div>
        </div>
      </div>

      <table style="margin-bottom:22px">
        <thead><tr><th>Bo‘lim</th><th>Maksimal</th><th>To‘plangan ball</th><th>Ko‘rsatkich (%)</th></tr></thead>
        <tbody>
          <tr><td><b>A bo‘lim:</b> ${SEC.A[0]}</td><td>50</td><td><b>${k.A}</b></td><td>${Math.round((k.A / 50) * 100)}%</td></tr>
          <tr><td><b>B bo‘lim:</b> ${SEC.B[0]}</td><td>30</td><td><b>${k.B}</b></td><td>${Math.round((k.B / 30) * 100)}%</td></tr>
          <tr><td><b>C bo‘lim:</b> ${SEC.C[0]}</td><td>50</td><td><b>${k.C}</b></td><td>${Math.round((k.C / 50) * 100)}%</td></tr>
          <tr style="background:#F5F6F8;font-weight:700"><td>JAMI REYTING BALI</td><td>130</td><td style="color:#2448C7">${k.T}</td><td>${Math.round((k.T / 130) * 100)}%</td></tr>
        </tbody>
      </table>

      <h3 style="font-size:14.5px;margin-bottom:10px">Tasdiqlangan yutuqlar ro‘yxati</h3>
      ${approvedEntries.length === 0
        ? '<p style="color:#667085;font-size:13px">Tasdiqlangan yutuqlar mavjud emas.</p>'
        : `<table>
            <thead><tr><th>Sana</th><th>Mezon</th><th>Yutuq tavsifi</th><th>Ball</th></tr></thead>
            <tbody>
              ${approvedEntries.map(e => `
                <tr>
                  <td style="white-space:nowrap">${esc(e.date)}</td>
                  <td>${e.ind}. ${esc(IMAP[e.ind]?.name || '')}</td>
                  <td>${esc(e.type)} × ${e.qty} ta<br><small style="color:#475467">${esc(e.descr)}</small></td>
                  <td><b>+${e.pts}</b></td>
                </tr>
              `).join('')}
            </tbody>
          </table>`}

      <div style="margin-top:36px;display:flex;justify-content:space-between;gap:20px;border-top:1px dashed #98A2B3;padding-top:14px;font-size:13px">
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
