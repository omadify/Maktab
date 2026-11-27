// Dashboard, Personal Results (My Results) & Deep School Analytics Views
import { IND, IMAP, SEC, calcScores, getRanking, getDeadlines, extractSubjectLabel } from '../config.js';
import { api } from '../api.js';
import { icon } from '../icons.js';
import { $, $$, esc, toast, confirmDialog, avatarHtml, badgeStatus, emptyStateHtml, formatDateUz } from '../ui.js';
import { renderAreaChart, renderLineChart, renderBarChart, renderDonutChart } from '../charts.js';

function monthKey(dateStr) {
  if (!dateStr || !/^\d{4}-\d{2}/.test(dateStr)) return null;
  return dateStr.slice(0, 7);
}

function formatMonthLabel(ym) {
  const [y, m] = ym.split('-').map(Number);
  const months = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyun', 'Iyul', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];
  return `${months[(m - 1) % 12]} ${String(y).slice(2)}`;
}

function buildMonthlySeries(entries) {
  const map = {};
  for (const e of entries) {
    const mk = monthKey(e.date);
    if (!mk) continue;
    if (!map[mk]) map[mk] = { approvedPts: 0, total: 0, approved: 0, rejected: 0, pending: 0 };
    map[mk].total += 1;
    if (e.status === 'approved') {
      map[mk].approved += 1;
      map[mk].approvedPts += Number(e.pts || 0);
    } else if (e.status === 'rejected') {
      map[mk].rejected += 1;
    } else {
      map[mk].pending += 1;
    }
  }
  const keys = Object.keys(map).sort().slice(-8);
  return {
    keys,
    labels: keys.map(formatMonthLabel),
    approvedPts: keys.map(k => Math.round(map[k].approvedPts * 10) / 10),
    totalCounts: keys.map(k => map[k].total),
    approvedCounts: keys.map(k => map[k].approved),
    rejectedCounts: keys.map(k => map[k].rejected)
  };
}

function calcPeriodDelta(entries) {
  const now = new Date();
  const curYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevYM = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

  let curApprovedPts = 0;
  let prevApprovedPts = 0;
  let curCount = 0;
  let prevCount = 0;

  for (const e of entries) {
    const mk = monthKey(e.date);
    if (mk === curYM) {
      curCount += 1;
      if (e.status === 'approved') curApprovedPts += Number(e.pts || 0);
    } else if (mk === prevYM) {
      prevCount += 1;
      if (e.status === 'approved') prevApprovedPts += Number(e.pts || 0);
    }
  }
  return { curApprovedPts: Math.round(curApprovedPts * 10) / 10, prevApprovedPts: Math.round(prevApprovedPts * 10) / 10, curCount, prevCount };
}

function buildSubjectStats(ranking) {
  const subjMap = {};
  for (const r of ranking) {
    const s = extractSubjectLabel(r.subject);
    if (!subjMap[s]) subjMap[s] = { label: s, sum: 0, count: 0 };
    subjMap[s].sum += r.T;
    subjMap[s].count += 1;
  }
  return Object.values(subjMap)
    .map(s => ({
      label: s.label,
      value: Math.round((s.sum / s.count) * 10) / 10,
      sub: `${s.count} nafar pedagog`
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 7);
}

export function renderDashboard(el, ctx) {
  const { me, users, entries } = ctx;
  const ranking = getRanking(users, entries);
  const isStaff = ['director', 'reviewer', 'it_admin'].includes(me.role);
  const myEntries = entries.filter(e => e.uid === me.id);
  const myScore = calcScores(myEntries);
  const myRank = ranking.find(r => r.id === me.id);

  const avgScore = ranking.length
    ? Math.round((ranking.reduce((acc, r) => acc + r.T, 0) / ranking.length) * 10) / 10
    : 0;
  const topTeacher = ranking[0] || null;

  // Active teachers: ranked teachers with at least 1 entry
  const uidsWithEntries = new Set(entries.map(e => e.uid));
  const activeTeachersCount = ranking.filter(r => uidsWithEntries.has(r.id)).length;

  const approvedCount = entries.filter(e => e.status === 'approved').length;
  const pendingCount = entries.filter(e => e.status === 'pending').length;
  const rejectedCount = entries.filter(e => e.status === 'rejected').length;

  const visibleEntriesForCharts = isStaff ? entries : myEntries;
  const monthly = buildMonthlySeries(visibleEntriesForCharts);
  const delta = calcPeriodDelta(visibleEntriesForCharts);
  const subjectBars = buildSubjectStats(ranking);

  const ptsDiff = Math.round((delta.curApprovedPts - delta.prevApprovedPts) * 10) / 10;
  const cntDiff = delta.curCount - delta.prevCount;

  const deltaPill = (diff, unit = '') => {
    if (diff > 0) return `<span class="delta-pill up">${icon('trending-up', 12)} +${diff}${unit}</span>`;
    if (diff < 0) return `<span class="delta-pill down">${icon('trending-down', 12)} ${diff}${unit}</span>`;
    return `<span class="delta-pill flat">O‘zgarishsiz</span>`;
  };

  const recentFeed = (isStaff ? entries : myEntries).slice(0, 6);

  el.innerHTML = `
    <div class="stack-v">
      <div class="page-header">
        <div>
          <h1 class="page-title">${isStaff ? 'Boshqaruv paneli' : `Xush kelibsiz, ${esc(me.name.split(' ')[0])}`}</h1>
          <p class="page-desc">
            ${isStaff
              ? 'Norin tuman ixtisoslashtirilgan maktabi pedagoglari samaradorligi va 26-AF reyting tahlili.'
              : 'Shaxsiy reyting ko‘rsatkichlaringiz va maktab bo‘yicha umumiy dinamika.'}
          </p>
        </div>
        <div class="page-actions">
          <button type="button" class="btn btn-secondary" id="dash-refresh-btn">${icon('refresh-cw', 15)} Yangilash</button>
          ${['teacher', 'reviewer'].includes(me.role)
            ? `<button type="button" class="btn btn-primary" id="dash-add-btn">${icon('plus', 15)} Yutuq qo‘shish</button>`
            : `<button type="button" class="btn btn-primary" id="dash-rank-btn">${icon('trophy', 15)} Reyting jadvali</button>`}
        </div>
      </div>

      ${me.role === 'teacher' ? `
        <div class="card" style="display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap;border-color:var(--primary-border)">
          <div style="display:flex;align-items:center;gap:16px">
            ${avatarHtml(me.name, 'lg')}
            <div>
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                <span style="font-size:17px;font-weight:700">${esc(me.name)}</span>
                <span class="badge badge-primary">${myRank ? `#${myRank.rank}-o‘rin` : 'Reytingdan tashqari'}</span>
              </div>
              <div style="font-size:13px;color:var(--text-muted);margin-top:3px">${esc(me.subject || 'Pedagog')} · Tasdiqlangan: <b>${myScore.T} / 130 ball</b></div>
              <div class="progress-stack" style="width:240px;max-width:100%;margin-top:8px">
                <i class="seg-a" style="width:${(myScore.A / 130) * 100}%"></i>
                <i class="seg-b" style="width:${(myScore.B / 130) * 100}%"></i>
                <i class="seg-c" style="width:${(myScore.C / 130) * 100}%"></i>
              </div>
            </div>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button type="button" class="btn btn-secondary" id="dash-my-results">${icon('award', 15)} Batafsil natijalar</button>
            <button type="button" class="btn btn-secondary" id="dash-my-port">${icon('printer', 15)} A4 Portfolio</button>
          </div>
        </div>
      ` : ''}

      <!-- 4 Real KPI Cards -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-top">
            <span class="kpi-label">Jami pedagoglar</span>
            <span class="kpi-icon primary">${icon('users', 17)}</span>
          </div>
          <div class="kpi-value-row">
            <span class="kpi-value" data-count="${ranking.length}">0</span>
            <span class="kpi-unit">nafar</span>
          </div>
          <div class="kpi-foot">
            <span>Reytingda ishtirok etmoqda</span>
            <span class="badge badge-neutral">${users.filter(u => u.active).length} faol xodim</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-top">
            <span class="kpi-label">O‘rtacha reyting</span>
            <span class="kpi-icon">${icon('bar-chart-3', 17)}</span>
          </div>
          <div class="kpi-value-row">
            <span class="kpi-value" data-count="${avgScore}" data-decimals="1">0</span>
            <span class="kpi-unit">/ 130 ball</span>
          </div>
          <div class="kpi-foot">
            <span>Maktab ko‘rsatkichi: ${Math.round((avgScore / 130) * 100)}%</span>
            ${deltaPill(ptsDiff, ' ball')}
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-top">
            <span class="kpi-label">Eng yuqori natija</span>
            <span class="kpi-icon success">${icon('trophy', 17)}</span>
          </div>
          <div class="kpi-value-row">
            <span class="kpi-value" data-count="${topTeacher ? topTeacher.T : 0}" data-decimals="1">0</span>
            <span class="kpi-unit">ball</span>
          </div>
          <div class="kpi-foot">
            <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${topTeacher ? esc(topTeacher.name) : 'Hozircha natija yo‘q'}</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-top">
            <span class="kpi-label">Faol pedagoglar</span>
            <span class="kpi-icon warning">${icon('user-check', 17)}</span>
          </div>
          <div class="kpi-value-row">
            <span class="kpi-value" data-count="${activeTeachersCount}">0</span>
            <span class="kpi-unit">/ ${ranking.length}</span>
          </div>
          <div class="kpi-foot">
            <span>Yutuq kiritgan pedagoglar</span>
            ${deltaPill(cntDiff, ' ariza')}
          </div>
        </div>
      </div>

      <!-- Charts Row 1: Area & Line -->
      <div class="grid-2">
        <div class="card">
          <div class="card-header">
            <div>
              <h3 class="card-title">Oylik reyting dinamikasi</h3>
              <p class="card-subtitle">${isStaff ? 'Tasdiqlangan ballar o‘sishi (oylar kesimida)' : 'Sizning tasdiqlangan ballaringiz dinamikasi'}</p>
            </div>
            <span class="badge badge-primary">${delta.curApprovedPts} ball (joriy oy)</span>
          </div>
          <div id="chart-area"></div>
        </div>

        <div class="card">
          <div class="card-header">
            <div>
              <h3 class="card-title">Baholash faolligi dinamikasi</h3>
              <p class="card-subtitle">Topshirilgan, tasdiqlangan va rad etilgan arizalar</p>
            </div>
          </div>
          <div id="chart-line"></div>
        </div>
      </div>

      <!-- Charts Row 2: Bar & Donut -->
      <div class="grid-asymmetric">
        <div class="card">
          <div class="card-header">
            <div>
              <h3 class="card-title">Fanlar bo‘yicha o‘rtacha reyting</h3>
              <p class="card-subtitle">Har bir fan yo‘nalishidagi o‘rtacha to‘plangan ball</p>
            </div>
          </div>
          <div id="chart-bar"></div>
        </div>

        <div class="card">
          <div class="card-header">
            <div>
              <h3 class="card-title">Baholash natijalari</h3>
              <p class="card-subtitle">${isStaff ? 'Maktab bo‘yicha barcha arizalar holati' : 'Shaxsiy arizalaringiz holati'}</p>
            </div>
          </div>
          <div id="chart-donut"></div>
        </div>
      </div>

      <!-- Bottom Row: Top Teachers & Recent Activity -->
      <div class="grid-asymmetric">
        <div class="card">
          <div class="card-header">
            <div>
              <h3 class="card-title">Eng yaxshi pedagoglar</h3>
              <p class="card-subtitle">26-AF reyting jadvalidagi yetakchi beshlik</p>
            </div>
            <button type="button" class="btn btn-ghost btn-sm" id="dash-view-all-rank">Barchasi ${icon('chevron-right', 14)}</button>
          </div>
          ${ranking.length === 0
            ? emptyStateHtml({ iconName: 'trophy', title: 'Reyting jadvali bo‘sh', desc: 'Hozircha reytingga kiritilgan pedagoglar mavjud emas.' })
            : `
              <div style="display:flex;flex-direction:column;gap:10px">
                ${ranking.slice(0, 5).map(r => `
                  <div class="card-interactive" data-open-profile="${r.id}" style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 12px;border:1px solid var(--border);border-radius:12px;cursor:pointer">
                    <div style="display:flex;align-items:center;gap:12px;min-width:0">
                      <span class="rank-badge ${r.rank === 1 ? 'r1' : (r.rank === 2 ? 'r2' : 'r3')}">#${r.rank}</span>
                      ${avatarHtml(r.name, 'sm')}
                      <div style="min-width:0">
                        <div style="font-size:13.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(r.name)}</div>
                        <div style="font-size:12px;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(r.subject)}</div>
                      </div>
                    </div>
                    <div style="text-align:right;flex-shrink:0">
                      <div style="font-size:15px;font-weight:700;color:var(--primary);font-variant-numeric:tabular-nums">${r.T} ball</div>
                      <div style="font-size:11px;color:var(--text-muted)">A:${r.A} · B:${r.B} · C:${r.C}</div>
                    </div>
                  </div>
                `).join('')}
              </div>
            `}
        </div>

        <div class="card">
          <div class="card-header">
            <div>
              <h3 class="card-title">So‘nggi faoliyatlar</h3>
              <p class="card-subtitle">${isStaff ? 'Oxirgi kiritilgan va tekshirilgan yutuqlar' : 'Oxirgi yutuq va qarorlaringiz'}</p>
            </div>
          </div>
          ${recentFeed.length === 0
            ? emptyStateHtml({ iconName: 'clock', title: 'Faoliyatlar mavjud emas', desc: 'Hali birorta yutuq kiritilmagan.' })
            : `
              <div style="display:flex;flex-direction:column;gap:12px">
                ${recentFeed.map(e => {
                  const owner = users.find(u => u.id === e.uid);
                  const ind = IMAP[e.ind];
                  return `
                    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;padding-bottom:10px;border-bottom:1px solid var(--border)">
                      <div style="min-width:0">
                        <div style="font-size:13px;font-weight:600;color:var(--text)">${esc(owner ? owner.name : 'Pedagog')} · <span style="color:var(--primary)">+${e.pts} ball</span></div>
                        <div style="font-size:12px;color:var(--text-muted);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(ind ? ind.name : '')} — ${esc(e.type)}</div>
                        <div style="font-size:11.5px;color:var(--text-subtle);margin-top:2px">${formatDateUz(e.date)}</div>
                      </div>
                      ${badgeStatus(e.status)}
                    </div>
                  `;
                }).join('')}
              </div>
            `}
        </div>
      </div>
    </div>
  `;

  // Render interactive SVG charts
  renderAreaChart($('#chart-area'), {
    labels: monthly.labels,
    values: monthly.approvedPts,
    unit: 'ball'
  });

  renderLineChart($('#chart-line'), {
    labels: monthly.labels,
    series: [
      { name: 'Jami arizalar', values: monthly.totalCounts, color: 'var(--primary)' },
      { name: 'Tasdiqlangan', values: monthly.approvedCounts, color: 'var(--success)' },
      { name: 'Rad etilgan', values: monthly.rejectedCounts, color: 'var(--error)' }
    ]
  });

  renderBarChart($('#chart-bar'), {
    items: subjectBars,
    unit: 'o‘rtacha ball'
  });

  const statusData = isStaff
    ? { a: approvedCount, p: pendingCount, r: rejectedCount }
    : {
        a: myEntries.filter(e => e.status === 'approved').length,
        p: myEntries.filter(e => e.status === 'pending').length,
        r: myEntries.filter(e => e.status === 'rejected').length
      };

  renderDonutChart($('#chart-donut'), {
    centerValue: statusData.a + statusData.p + statusData.r,
    centerLabel: 'Jami ariza',
    unit: 'ta ariza',
    slices: [
      { label: 'Tasdiqlangan', value: statusData.a, color: 'var(--success)' },
      { label: 'Tekshiruvda', value: statusData.p, color: 'var(--warning)' },
      { label: 'Rad etilgan', value: statusData.r, color: 'var(--error)' }
    ]
  });

  // Bind buttons
  $('#dash-refresh-btn').onclick = () => ctx.refresh();
  const addBtn = $('#dash-add-btn');
  if (addBtn) addBtn.onclick = () => ctx.navigate('add_entry');
  const rankBtn = $('#dash-rank-btn');
  if (rankBtn) rankBtn.onclick = () => ctx.navigate('ranking');
  $('#dash-view-all-rank').onclick = () => ctx.navigate('ranking');

  const myResBtn = $('#dash-my-results');
  if (myResBtn) myResBtn.onclick = () => ctx.navigate('my_results');
  const myPortBtn = $('#dash-my-port');
  if (myPortBtn) myPortBtn.onclick = () => ctx.openPortfolioPrint(me.id);

  $$('[data-open-profile]').forEach(card => {
    card.onclick = () => ctx.openProfile(Number(card.dataset.openProfile));
  });
}

/* ==========================================================================
   MENING NATIJAM (Personal Results & Entries)
   ========================================================================== */
export function renderMyResults(el, ctx) {
  const { me, users, entries } = ctx;
  const myEntries = entries.filter(e => e.uid === me.id);
  const k = calcScores(myEntries);
  const ranking = getRanking(users, entries);
  const myRank = ranking.find(r => r.id === me.id);
  const deadlines = getDeadlines();

  el.innerHTML = `
    <div class="stack-v">
      <div class="page-header">
        <div>
          <h1 class="page-title">Mening natijam</h1>
          <p class="page-desc">${esc(me.name)} · ${esc(me.subject || 'Pedagog')}</p>
        </div>
        <div class="page-actions">
          <button type="button" class="btn btn-secondary" id="mr-port-btn">${icon('printer', 15)} A4 Portfolio</button>
          <button type="button" class="btn btn-primary" id="mr-add-btn">${icon('plus', 15)} Yangi natija qo‘shish</button>
        </div>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-top">
            <span class="kpi-label">Umumiy reyting bali</span>
            <span class="kpi-icon primary">${icon('trophy', 17)}</span>
          </div>
          <div class="kpi-value-row">
            <span class="kpi-value" data-count="${k.T}" data-decimals="1">0</span>
            <span class="kpi-unit">/ 130 ball</span>
          </div>
          <div class="progress-stack">
            <i class="seg-a" style="width:${(k.A / 130) * 100}%"></i>
            <i class="seg-b" style="width:${(k.B / 130) * 100}%"></i>
            <i class="seg-c" style="width:${(k.C / 130) * 100}%"></i>
          </div>
          <div class="kpi-foot">
            <span>${myRank ? `Maktab reytingi: #${myRank.rank} (${ranking.length} tadan)` : 'Reytingda qatnashmaydi'}</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-top">
            <span class="kpi-label">A bo‘lim — Salohiyat</span>
            <span class="kpi-icon primary">${icon('award', 17)}</span>
          </div>
          <div class="kpi-value-row">
            <span class="kpi-value" data-count="${k.A}" data-decimals="1">0</span>
            <span class="kpi-unit">/ 50</span>
          </div>
          <div class="progress-single"><i style="width:${(k.A / 50) * 100}%;background:var(--sec-a)"></i></div>
          <div class="kpi-foot"><span>Ilmiy daraja, toifa, sertifikat, metodika</span></div>
        </div>

        <div class="kpi-card">
          <div class="kpi-top">
            <span class="kpi-label">B bo‘lim — O‘quvchi yutuqlari</span>
            <span class="kpi-icon success">${icon('graduation-cap', 17)}</span>
          </div>
          <div class="kpi-value-row">
            <span class="kpi-value" data-count="${k.B}" data-decimals="1">0</span>
            <span class="kpi-unit">/ 30</span>
          </div>
          <div class="progress-single"><i style="width:${(k.B / 30) * 100}%;background:var(--sec-b)"></i></div>
          <div class="kpi-foot"><span>Olimpiada, STEAM, sport va ma’naviyat</span></div>
        </div>

        <div class="kpi-card">
          <div class="kpi-top">
            <span class="kpi-label">C bo‘lim — Faollik va rag‘bat</span>
            <span class="kpi-icon warning">${icon('trending-up', 17)}</span>
          </div>
          <div class="kpi-value-row">
            <span class="kpi-value" data-count="${k.C}" data-decimals="1">0</span>
            <span class="kpi-unit">/ 50</span>
          </div>
          <div class="progress-single"><i style="width:${(k.C / 50) * 100}%;background:var(--sec-c)"></i></div>
          <div class="kpi-foot"><span>CHSB o‘zlashtirish, tanlovlar, sertifikatlar</span></div>
        </div>
      </div>

      <div class="card card-compact" style="display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap">
        <div style="display:flex;align-items:center;gap:12px">
          <div class="kpi-icon primary">${icon('calendar', 18)}</div>
          <div>
            <div style="font-size:14px;font-weight:600">26-AF buyruq bo‘yicha topshirish muddatlari</div>
            <div style="font-size:13px;color:var(--text-muted);margin-top:2px">
              Mas’ullarga topshirish: <b>${esc(deadlines.d20Label)}</b> (${deadlines.n20} kun qoldi) ·
              O‘IBDO‘ yakuniy hisoboti: <b>${esc(deadlines.d25Label)}</b> (${deadlines.n25} kun qoldi)
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">Kiritilgan yutuqlarim (${myEntries.length} ta)</h3>
            <p class="card-subtitle">Tasdiqlanmagan yoki rad etilgan arizalarni o‘chirishingiz mumkin</p>
          </div>
        </div>

        ${myEntries.length === 0
          ? emptyStateHtml({
              iconName: 'award',
              title: 'Hali natija kiritilmagan',
              desc: 'Ilk yutug‘ingizni kiritish va tasdiqlashga yuborish uchun “Yangi natija qo‘shish” tugmasini bosing.',
              actionHtml: `<button type="button" class="btn btn-primary" id="mr-empty-add">${icon('plus', 15)} Yangi natija qo‘shish</button>`
            })
          : `
            <div class="table-wrap desktop-table-only">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Sana</th>
                    <th>Mezon</th>
                    <th>Yutuq va tavsif</th>
                    <th>Ball</th>
                    <th>Holat</th>
                    <th style="text-align:right">Amal</th>
                  </tr>
                </thead>
                <tbody>
                  ${myEntries.map(e => `
                    <tr>
                      <td style="white-space:nowrap">${formatDateUz(e.date)}</td>
                      <td>
                        <div style="font-weight:600">${e.ind}. ${esc(IMAP[e.ind]?.name || '')}</div>
                        <div style="font-size:12px;color:var(--text-muted)">Mas’ul: ${esc(IMAP[e.ind]?.respStr || '')}</div>
                      </td>
                      <td>
                        <div style="font-weight:500">${esc(e.type)} × ${e.qty} ta</div>
                        <div style="font-size:12.5px;color:var(--text-muted);margin-top:2px">${esc(e.descr)}</div>
                        ${e.fpath ? `<a href="${esc(e.fpath)}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:4px;font-size:12px;margin-top:4px">${icon('paperclip', 12)} Tasdiqlovchi hujjat</a>` : ''}
                        ${e.note ? `<div style="font-size:12px;color:var(--error);margin-top:4px">Mas’ul izohi: ${esc(e.note)}</div>` : ''}
                      </td>
                      <td><b>+${e.pts}</b></td>
                      <td>${badgeStatus(e.status)}</td>
                      <td style="text-align:right">
                        ${e.status !== 'approved'
                          ? `<button type="button" class="btn btn-danger btn-sm" data-del-entry="${e.id}">${icon('trash-2', 14)} O‘chirish</button>`
                          : '<span style="color:var(--text-subtle)">—</span>'}
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>

            <div class="mobile-card-list">
              ${myEntries.map(e => `
                <div class="card card-compact" style="box-shadow:none">
                  <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:8px">
                    <span style="font-size:12px;color:var(--text-muted)">${formatDateUz(e.date)}</span>
                    ${badgeStatus(e.status)}
                  </div>
                  <div style="font-weight:600;font-size:14px">${e.ind}. ${esc(IMAP[e.ind]?.name || '')}</div>
                  <div style="font-size:13px;margin-top:4px">${esc(e.type)} × ${e.qty} · <b style="color:var(--primary)">+${e.pts} ball</b></div>
                  <div style="font-size:12.5px;color:var(--text-muted);margin-top:4px">${esc(e.descr)}</div>
                  ${e.note ? `<div style="font-size:12px;color:var(--error);margin-top:6px">Izoh: ${esc(e.note)}</div>` : ''}
                  <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
                    ${e.fpath ? `<a href="${esc(e.fpath)}" target="_blank" rel="noopener" class="btn btn-secondary btn-sm">${icon('external-link', 13)} Hujjat</a>` : ''}
                    ${e.status !== 'approved' ? `<button type="button" class="btn btn-danger btn-sm" data-del-entry="${e.id}">${icon('trash-2', 14)} O‘chirish</button>` : ''}
                  </div>
                </div>
              `).join('')}
            </div>
          `}
      </div>
    </div>
  `;

  $('#mr-add-btn').onclick = () => ctx.navigate('add_entry');
  $('#mr-port-btn').onclick = () => ctx.openPortfolioPrint(me.id);
  const emptyAdd = $('#mr-empty-add');
  if (emptyAdd) emptyAdd.onclick = () => ctx.navigate('add_entry');

  $$('[data-del-entry]').forEach(btn => {
    btn.onclick = async () => {
      const id = Number(btn.dataset.delEntry);
      const target = entries.find(x => x.id === id);
      if (!target) return;
      if (target.status === 'approved' && me.role !== 'director') {
        return toast('Tasdiqlangan yutuqni o‘chirib bo‘lmaydi.', 'warning');
      }
      if (target.uid !== me.id && me.role !== 'director') {
        return toast('Faqat o‘z arizangizni o‘chirishingiz mumkin.', 'error');
      }
      const ok = await confirmDialog({
        title: 'Arizani o‘chirish',
        message: `“${target.type}” yutug‘i bo‘yicha arizani o‘chirishni tasdiqlaysizmi?`,
        confirmText: 'Ha, o‘chirish',
        danger: true
      });
      if (!ok) return;
      try {
        await api.deleteEntry(id);
        toast('Ariza muvaffaqiyatli o‘chirildi.', 'success');
        await ctx.refresh();
      } catch (err) {
        toast('O‘chirishda xatolik: ' + err.message, 'error');
      }
    };
  });
}

/* ==========================================================================
   DEEP SCHOOL ANALYTICS (Director & Reviewer)
   ========================================================================== */
export function renderAnalytics(el, ctx) {
  const { users, entries } = ctx;
  const ranking = getRanking(users, entries);
  const n = ranking.length || 1;
  const avgA = Math.round((ranking.reduce((s, r) => s + r.A, 0) / n) * 10) / 10;
  const avgB = Math.round((ranking.reduce((s, r) => s + r.B, 0) / n) * 10) / 10;
  const avgC = Math.round((ranking.reduce((s, r) => s + r.C, 0) / n) * 10) / 10;

  const indCounts = {};
  const indPts = {};
  for (const e of entries) {
    if (e.status === 'approved') {
      indCounts[e.ind] = (indCounts[e.ind] || 0) + 1;
      indPts[e.ind] = (indPts[e.ind] || 0) + Number(e.pts || 0);
    }
  }

  const indBars = IND.map(i => ({
    label: `${i.id}. ${i.name.split(' ')[0]}`,
    value: Math.round((indPts[i.id] || 0) * 10) / 10,
    sub: `${indCounts[i.id] || 0} ta tasdiqlangan`
  })).sort((a, b) => b.value - a.value).slice(0, 8);

  const subjectStats = {};
  for (const r of ranking) {
    const s = extractSubjectLabel(r.subject);
    if (!subjectStats[s]) subjectStats[s] = { subject: s, count: 0, sumT: 0, sumA: 0, sumB: 0, sumC: 0 };
    subjectStats[s].count += 1;
    subjectStats[s].sumT += r.T;
    subjectStats[s].sumA += r.A;
    subjectStats[s].sumB += r.B;
    subjectStats[s].sumC += r.C;
  }
  const subjRows = Object.values(subjectStats).sort((a, b) => (b.sumT / b.count) - (a.sumT / a.count));

  el.innerHTML = `
    <div class="stack-v">
      <div class="page-header">
        <div>
          <h1 class="page-title">Statistika va chuqur tahlil</h1>
          <p class="page-desc">26-AF bo‘limlar, mezonlar va fan kafedralari kesimida real ko‘rsatkichlar.</p>
        </div>
        <div class="page-actions">
          <button type="button" class="btn btn-secondary" id="an-reports-btn">${icon('file-text', 15)} Hisobotlarga o‘tish</button>
        </div>
      </div>

      <div class="grid-3">
        <div class="card card-compact">
          <div style="font-size:12.5px;color:var(--text-muted);font-weight:500">A bo‘lim o‘rtachasi (max 50)</div>
          <div style="font-size:26px;font-weight:700;margin:6px 0;font-variant-numeric:tabular-nums">${avgA} ball</div>
          <div class="progress-single"><i style="width:${(avgA / 50) * 100}%;background:var(--sec-a)"></i></div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:6px">${SEC.A[0]} (${Math.round((avgA / 50) * 100)}%)</div>
        </div>
        <div class="card card-compact">
          <div style="font-size:12.5px;color:var(--text-muted);font-weight:500">B bo‘lim o‘rtachasi (max 30)</div>
          <div style="font-size:26px;font-weight:700;margin:6px 0;font-variant-numeric:tabular-nums">${avgB} ball</div>
          <div class="progress-single"><i style="width:${(avgB / 30) * 100}%;background:var(--sec-b)"></i></div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:6px">${SEC.B[0]} (${Math.round((avgB / 30) * 100)}%)</div>
        </div>
        <div class="card card-compact">
          <div style="font-size:12.5px;color:var(--text-muted);font-weight:500">C bo‘lim o‘rtachasi (max 50)</div>
          <div style="font-size:26px;font-weight:700;margin:6px 0;font-variant-numeric:tabular-nums">${avgC} ball</div>
          <div class="progress-single"><i style="width:${(avgC / 50) * 100}%;background:var(--sec-c)"></i></div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:6px">${SEC.C[0]} (${Math.round((avgC / 50) * 100)}%)</div>
        </div>
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="card-header">
            <div>
              <h3 class="card-title">Eng faol indikatorlar (jami ballar)</h3>
              <p class="card-subtitle">Tasdiqlangan yutuqlar bo‘yicha yetakchi mezonlar</p>
            </div>
          </div>
          <div id="an-ind-bar"></div>
        </div>

        <div class="card">
          <div class="card-header">
            <div>
              <h3 class="card-title">Bo‘limlar ulushi (o‘rtacha ball)</h3>
              <p class="card-subtitle">Pedagoglar o‘rtacha ballarining A, B, C bo‘yicha taqsimoti</p>
            </div>
          </div>
          <div id="an-sec-donut"></div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">Fanlar bo‘yicha batafsil ko‘rsatkichlar</h3>
            <p class="card-subtitle">Har bir fan yo‘nalishidagi pedagoglar soni va o‘rtacha ballari</p>
          </div>
        </div>
        ${subjRows.length === 0
          ? emptyStateHtml({ iconName: 'bar-chart-3', title: 'Fanlar kesimida ma’lumot yo‘q', desc: 'Reytingda faol pedagoglar qo‘shilgach jadval shakllanadi.' })
          : `
            <div class="table-wrap">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Fan yo‘nalishi</th>
                    <th>Pedagoglar</th>
                    <th>O‘rtacha A (50)</th>
                    <th>O‘rtacha B (30)</th>
                    <th>O‘rtacha C (50)</th>
                    <th>O‘rtacha Jami (130)</th>
                  </tr>
                </thead>
                <tbody>
                  ${subjRows.map(s => `
                    <tr>
                      <td><b>${esc(s.subject)}</b></td>
                      <td>${s.count} nafar</td>
                      <td>${(s.sumA / s.count).toFixed(1)}</td>
                      <td>${(s.sumB / s.count).toFixed(1)}</td>
                      <td>${(s.sumC / s.count).toFixed(1)}</td>
                      <td><b style="color:var(--primary)">${(s.sumT / s.count).toFixed(1)} ball</b></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `}
      </div>
    </div>
  `;

  renderBarChart($('#an-ind-bar'), { items: indBars, unit: 'ball' });
  renderDonutChart($('#an-sec-donut'), {
    centerValue: Math.round((avgA + avgB + avgC) * 10) / 10,
    centerLabel: 'O‘rtacha ball',
    unit: 'ball',
    slices: [
      { label: 'A — Salohiyat', value: avgA, color: 'var(--sec-a)' },
      { label: 'B — O‘quvchilar', value: avgB, color: 'var(--sec-b)' },
      { label: 'C — Faollik', value: avgC, color: 'var(--sec-c)' }
    ]
  });

  $('#an-reports-btn').onclick = () => ctx.navigate('reports');
}
