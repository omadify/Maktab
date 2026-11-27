// Role-Specific Executive Dashboards, My Results & Deep Analytics V6
import { IND, IMAP, ROLE, SEC, calcScores, filterEntriesByPeriod, getRanking, getDeadlines, extractSubjectLabel } from '../config.js';
import { api } from '../api.js';
import { icon } from '../icons.js';
import { $, $$, esc, toast, confirmDialog, avatarHtml, badgeStatus, emptyStateHtml, formatDateUz, formatDateTimeTashkent, getTodayTashkent } from '../ui.js';
import { scoreRingSvg, syncLiquidPills } from '../motion.js';
import { renderAreaChart, renderLineChart, renderBarChart, renderHorizontalBarChart, renderDonutChart } from '../charts.js';

let myResPeriod = 'all';

export function resetDashboardViewState() {
  myResPeriod = 'all';
}

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
    if (!map[mk]) map[mk] = { approvedPts: 0, total: 0, approved: 0, rejected: 0 };
    map[mk].total += 1;
    if (e.status === 'approved') {
      map[mk].approved += 1;
      map[mk].approvedPts += Number(e.pts || 0);
    } else if (e.status === 'rejected') {
      map[mk].rejected += 1;
    }
  }
  const keys = Object.keys(map).sort().slice(-8);
  return {
    labels: keys.map(formatMonthLabel),
    approvedPts: keys.map(k => Math.round(map[k].approvedPts * 10) / 10),
    totalCounts: keys.map(k => map[k].total),
    approvedCounts: keys.map(k => map[k].approved),
    rejectedCounts: keys.map(k => map[k].rejected)
  };
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
      label: s,
      value: Math.round((s.sum / s.count) * 10) / 10,
      sub: `${s.count} nafar pedagog`
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 7);
}

function getGreetingUz() {
  const hr = Number(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tashkent', hour: 'numeric', hour12: false }));
  if (hr < 12) return 'Xayrli tong';
  if (hr < 18) return 'Xayrli kun';
  return 'Xayrli kech';
}

/* ==========================================================================
   MAIN ROLE-ROUTER FOR DASHBOARD
   ========================================================================== */
export function renderDashboard(el, ctx) {
  const role = ctx.me.role;
  if (role === 'director') return renderDirectorDashboard(el, ctx);
  if (role === 'it_admin') return renderItAdminDashboard(el, ctx);
  if (role === 'reviewer') return renderReviewerDashboard(el, ctx);
  return renderTeacherDashboard(el, ctx);
}

/* ==========================================================================
   1. DIRECTOR EXECUTIVE COMMAND CENTER
   ========================================================================== */
function renderDirectorDashboard(el, ctx) {
  const { me, users, entries, monitoring, appeals, lastSync } = ctx;
  const userMap = new Map(users.map(u => [u.id, u]));
  const ranking = getRanking(users, entries);
  const avgScore = ranking.length ? Math.round((ranking.reduce((s, r) => s + r.T, 0) / ranking.length) * 10) / 10 : 0;
  const pendingEntries = entries.filter(e => e.status === 'pending');
  const approvedCount = entries.filter(e => e.status === 'approved').length;
  const rejectedCount = entries.filter(e => e.status === 'rejected').length;
  const activeAccounts = users.filter(u => u.active).length;
  const openAppeals = (appeals?.rows || []).filter(a => ['new', 'in_review', 'needs_info'].includes(a.status));

  const monAvail = monitoring?.available;
  const presence = monitoring?.presence || [];
  const logins = monitoring?.logins || [];
  const activities = monitoring?.activities || [];

  const nowMs = Date.now();
  const onlineNow = monAvail
    ? presence.filter(p => p.active_sessions > 0 && p.last_seen_at && (nowMs - new Date(p.last_seen_at).getTime()) <= 2 * 60 * 1000).length
    : null;
  const todayStr = getTodayTashkent();
  const todayLogins = monAvail
    ? logins.filter(l => l.success && l.created_at && new Date(l.created_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Tashkent' }) === todayStr).length
    : null;

  const monthly = buildMonthlySeries(entries);
  const subjectBars = buildSubjectStats(ranking);
  const deadlines = getDeadlines();
  const curYear = new Date().getFullYear();

  const loginDaysMap = {};
  if (monAvail) {
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toLocaleDateString('en-CA', { timeZone: 'Asia/Tashkent' });
      loginDaysMap[d] = { ok: 0, fail: 0 };
    }
    for (const l of logins) {
      if (!l.created_at) continue;
      const dk = new Date(l.created_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Tashkent' });
      if (loginDaysMap[dk]) {
        if (l.success) loginDaysMap[dk].ok += 1;
        else loginDaysMap[dk].fail += 1;
      }
    }
  }
  const loginDayKeys = Object.keys(loginDaysMap);

  el.innerHTML = `
    <div class="stack-v">
      <!-- Executive Hero Panel -->
      <section class="hero-panel stagger-item">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:24px;flex-wrap:wrap">
          <div style="max-width:660px">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px">
              <span class="badge badge-primary">${curYear - 1}–${curYear} o‘quv yili</span>
              <span class="badge badge-neutral">26-AF · 130 ballik tizim</span>
              <span style="font-size:12px;color:var(--text-muted)">Yangilangan: ${lastSync ? formatDateTimeTashkent(lastSync) : 'Hozirgina'}</span>
            </div>
            <h1 class="page-title" style="font-size:26px">${getGreetingUz()}, ${esc(me.name.split(' ')[0])}</h1>
            <p class="page-desc" style="font-size:14px;margin-top:6px">
              Norin tuman ixtisoslashtirilgan maktabi — pedagoglar samaradorligi, tasdiqlash navbati va murojaatlar boshqaruv markazi.
            </p>
            <div class="page-actions" style="margin-top:18px">
              <button type="button" class="btn btn-primary" id="dir-reviews">${icon('check-circle', 15)} Tasdiqlash (${pendingEntries.length})</button>
              <button type="button" class="btn btn-secondary" id="dir-appeals">${icon('message-square', 15)} Murojaatlar (${openAppeals.length})</button>
              <button type="button" class="btn btn-secondary" id="dir-reports">${icon('file-text', 15)} Hisobotlar</button>
              <button type="button" class="btn btn-ghost" id="dir-refresh">${icon('refresh-cw', 15)} Yangilash</button>
            </div>
          </div>

          <div style="display:flex;align-items:center;gap:18px;padding:14px 18px;border-radius:18px;background:var(--surface-soft);border:1px solid var(--border)">
            ${scoreRingSvg({ value: avgScore, max: 130, size: 112, stroke: 10, color: 'var(--primary)', sub: '/ 130 o‘rtacha' })}
            <div>
              <div style="font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.04em">Maktab indeksi</div>
              <div style="font-size:20px;font-weight:700;margin-top:2px;color:var(--text)">${Math.round((avgScore / 130) * 100)}% samaradorlik</div>
              <div style="font-size:12.5px;color:var(--text-2);margin-top:4px">${ranking.length} nafar reytingdagi pedagog</div>
              <div style="font-size:12px;color:var(--success);margin-top:2px">${approvedCount} ta tasdiqlangan yutuq</div>
            </div>
          </div>
        </div>
      </section>

      <!-- Priority KPIs -->
      <div class="kpi-grid">
        <div class="kpi-card stagger-item">
          <div class="kpi-top"><span class="kpi-label">Jami pedagoglar</span><span class="kpi-icon primary">${icon('users', 16)}</span></div>
          <div class="kpi-value-row"><span class="kpi-value" data-count="${ranking.length}">0</span><span class="kpi-unit">nafar</span></div>
          <div class="kpi-foot"><span>Reytingda faol</span><span class="badge badge-neutral">${activeAccounts} xodim</span></div>
        </div>

        <div class="kpi-card stagger-item">
          <div class="kpi-top"><span class="kpi-label">Tasdiqlash navbati</span><span class="kpi-icon warning">${icon('clock', 16)}</span></div>
          <div class="kpi-value-row"><span class="kpi-value" data-count="${pendingEntries.length}">0</span><span class="kpi-unit">ta ariza</span></div>
          <div class="kpi-foot"><span>Rad etilgan: ${rejectedCount}</span>${pendingEntries.length > 0 ? '<span class="badge badge-warning">Tekshiruv zarur</span>' : '<span class="badge badge-success">Navbat toza</span>'}</div>
        </div>

        <div class="kpi-card stagger-item">
          <div class="kpi-top"><span class="kpi-label">Tasdiqlangan yutuqlar</span><span class="kpi-icon success">${icon('check-circle', 16)}</span></div>
          <div class="kpi-value-row"><span class="kpi-value" data-count="${approvedCount}">0</span><span class="kpi-unit">ta yutuq</span></div>
          <div class="kpi-foot"><span>Ochiq murojaatlar: ${openAppeals.length}</span></div>
        </div>

        <div class="kpi-card stagger-item">
          <div class="kpi-top"><span class="kpi-label">Faol foydalanuvchilar</span><span class="kpi-icon success">${icon('radio', 16)}</span></div>
          <div class="kpi-value-row"><span class="kpi-value">${monAvail ? onlineNow : activeAccounts}</span><span class="kpi-unit">${monAvail ? 'hozir onlayn' : 'faol hisob'}</span></div>
          <div class="kpi-foot"><span>${monAvail ? `Bugungi kirishlar: ${todayLogins}` : 'Monitoring migratsiyasidan so‘ng'}</span></div>
        </div>
      </div>

      <!-- Main Charts -->
      <div class="grid-asymmetric">
        <div class="card">
          <div class="card-header">
            <div><h3 class="card-title">Yutuqlar dinamikasi</h3><p class="card-subtitle">Tasdiqlangan ballar o‘sishi (yutuq sanasi bo‘yicha)</p></div>
          </div>
          <div id="dir-area-chart"></div>
        </div>

        <div class="card">
          <div class="card-header">
            <div><h3 class="card-title">Yutuqlar holati taqsimoti</h3><p class="card-subtitle">Tasdiqlangan, tekshiruvdagi va rad etilgan arizalar</p></div>
          </div>
          <div id="dir-donut-chart"></div>
        </div>
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="card-header">
            <div><h3 class="card-title">Fan kafedralari kesimida o‘rtacha ball</h3><p class="card-subtitle">Fan yo‘nalishlari bo‘yicha samaradorlik</p></div>
          </div>
          <div id="dir-bar-chart"></div>
        </div>

        <div class="card">
          <div class="card-header">
            <div>
              <h3 class="card-title">${monAvail ? 'So‘nggi 7 kunlik kirishlar dinamikasi' : 'Arizalar faolligi dinamikasi'}</h3>
              <p class="card-subtitle">${monAvail ? 'Muvaffaqiyatli va rad etilgan login urinishlari' : 'Topshirilgan va tasdiqlangan arizalar'}</p>
            </div>
          </div>
          <div id="dir-line-chart"></div>
        </div>
      </div>

      <!-- Lower Command Sections -->
      <div class="grid-asymmetric">
        <div class="card">
          <div class="card-header">
            <div><h3 class="card-title">Top pedagoglar</h3><p class="card-subtitle">Umumiy reyting yetakchilari</p></div>
            <button type="button" class="btn btn-ghost btn-sm" id="dir-all-rank">Barchasi ${icon('chevron-right', 14)}</button>
          </div>
          ${ranking.length === 0
            ? emptyStateHtml({ iconName: 'trophy', title: 'Reyting bo‘sh', desc: 'Hali reytingdagi pedagoglar kiritilmagan.' })
            : `
              <div style="display:flex;flex-direction:column;gap:8px">
                ${ranking.slice(0, 5).map(r => {
                  const u = userMap.get(r.id);
                  return `
                    <div class="card-interactive" data-open-prof="${r.id}" style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 12px;border:1px solid var(--border);border-radius:12px">
                      <div style="display:flex;align-items:center;gap:10px;min-width:0">
                        <span class="rank-badge ${r.rank <= 3 ? `r${r.rank}` : 'rn'}">#${r.rank}</span>
                        ${avatarHtml(r.name, 'sm', u?.avatar_url)}
                        <div style="min-width:0">
                          <div style="font-size:13.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(r.name)}</div>
                          <div style="font-size:12px;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(r.subject)}</div>
                        </div>
                      </div>
                      <div style="text-align:right;flex-shrink:0">
                        <div style="font-size:14.5px;font-weight:700;color:var(--primary);font-variant-numeric:tabular-nums">${r.T} ball</div>
                        <div style="font-size:11px;color:var(--text-muted)">A:${r.A} · B:${r.B} · C:${r.C}</div>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            `}
        </div>

        <div class="stack-v">
          <div class="card card-compact">
            <div class="card-header" style="margin-bottom:10px">
              <div>
                <h3 class="card-title">${monAvail ? 'So‘nggi harakatlar' : 'Tasdiqlash kutayotgan yutuqlar'}</h3>
                <p class="card-subtitle">${monAvail ? 'Tizimdagi oxirgi qayd etilgan hodisalar' : 'Eng yangi kutilayotgan arizalar'}</p>
              </div>
              ${monAvail ? `<button type="button" class="btn btn-ghost btn-sm" id="dir-mon-btn">Monitoring ${icon('chevron-right', 14)}</button>` : ''}
            </div>
            ${monAvail && activities.length > 0
              ? `
                <div style="display:flex;flex-direction:column;gap:8px">
                  ${activities.slice(0, 6).map(a => `
                    <div style="display:flex;justify-content:space-between;gap:8px;font-size:12.5px;padding-bottom:8px;border-bottom:1px solid var(--border)">
                      <div style="min-width:0">
                        <b>${esc(a.actor_name || 'Tizim')}</b> · <span style="color:var(--text-2)">${esc(a.action)}</span>
                        <div style="font-size:11.5px;color:var(--text-muted)">${formatDateTimeTashkent(a.created_at)}</div>
                      </div>
                      <span class="badge ${a.outcome === 'failed' ? 'badge-error' : 'badge-neutral'}">${esc(a.outcome)}</span>
                    </div>
                  `).join('')}
                </div>
              `
              : (pendingEntries.length > 0
                ? `
                  <div style="display:flex;flex-direction:column;gap:8px">
                    ${pendingEntries.slice(0, 5).map(e => {
                      const u = userMap.get(e.uid);
                      return `
                        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:12.5px;padding-bottom:8px;border-bottom:1px solid var(--border)">
                          <div style="min-width:0">
                            <div style="font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(u?.name || 'Pedagog')}</div>
                            <div style="font-size:11.5px;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e.ind}. ${esc(IMAP[e.ind]?.name || '')}</div>
                          </div>
                          <span class="badge badge-warning">+${e.pts}</span>
                        </div>
                      `;
                    }).join('')}
                  </div>
                `
                : `<p style="margin:0;font-size:13px;color:var(--text-muted)">Hozircha kutayotgan yutuqlar yo‘q.</p>`)}
          </div>

          <div class="card card-compact">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
              <div class="kpi-icon primary">${icon('calendar', 16)}</div>
              <div style="font-weight:600;font-size:14px">Yaqinlashayotgan muddatlar</div>
            </div>
            <div style="font-size:12.5px;color:var(--text-2);line-height:1.6">
              <div>Mas’ullarga topshirish: <b>${esc(deadlines.d20Label)}</b> (${deadlines.n20} kun qoldi)</div>
              <div>Yakuniy hisobot (25-sana): <b>${esc(deadlines.d25Label)}</b> (${deadlines.n25} kun qoldi)</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  renderAreaChart($('#dir-area-chart'), { labels: monthly.labels, values: monthly.approvedPts, unit: 'ball' });
  renderBarChart($('#dir-bar-chart'), { items: subjectBars, unit: 'o‘rtacha ball' });
  renderDonutChart($('#dir-donut-chart'), {
    centerValue: approvedCount + pendingEntries.length + rejectedCount,
    centerLabel: 'Jami ariza',
    unit: 'ta',
    slices: [
      { label: 'Tasdiqlangan', value: approvedCount, color: 'var(--success)' },
      { label: 'Kutilmoqda', value: pendingEntries.length, color: 'var(--warning)' },
      { label: 'Rad etilgan', value: rejectedCount, color: 'var(--error)' }
    ]
  });

  if (monAvail) {
    renderLineChart($('#dir-line-chart'), {
      labels: loginDayKeys.map(k => k.slice(5)),
      series: [
        { name: 'Muvaffaqiyatli', values: loginDayKeys.map(k => loginDaysMap[k].ok), color: 'var(--success)' },
        { name: 'Muvaffaqiyatsiz', values: loginDayKeys.map(k => loginDaysMap[k].fail), color: 'var(--error)' }
      ]
    });
  } else {
    renderLineChart($('#dir-line-chart'), {
      labels: monthly.labels,
      series: [
        { name: 'Jami arizalar', values: monthly.totalCounts, color: 'var(--primary)' },
        { name: 'Tasdiqlangan', values: monthly.approvedCounts, color: 'var(--success)' },
        { name: 'Rad etilgan', values: monthly.rejectedCounts, color: 'var(--error)' }
      ]
    });
  }

  $('#dir-refresh').onclick = () => ctx.refresh();
  $('#dir-reports').onclick = () => ctx.navigate('reports');
  $('#dir-reviews').onclick = () => ctx.navigate('reviews');
  $('#dir-appeals').onclick = () => ctx.navigate('appeals');
  $('#dir-all-rank').onclick = () => ctx.navigate('ranking');
  const monBtn = $('#dir-mon-btn');
  if (monBtn) monBtn.onclick = () => ctx.navigate('monitoring');
  $$('[data-open-prof]').forEach(c => { c.onclick = () => ctx.openProfile(Number(c.dataset.openProf)); });
}

/* ==========================================================================
   2. IT ADMIN TECHNICAL DASHBOARD
   ========================================================================== */
function renderItAdminDashboard(el, ctx) {
  const { users, entries, monitoring, lastSync } = ctx;
  const activeCount = users.filter(u => u.active).length;
  const inactiveCount = users.length - activeCount;
  const teachersCount = users.filter(u => u.role === 'teacher').length;
  const mustChangeCount = users.filter(u => u.active && u.must_change).length;
  const ranking = getRanking(users, entries);
  const monAvail = monitoring?.available;
  const logins = monitoring?.logins || [];

  el.innerHTML = `
    <div class="stack-v">
      <div class="hero-panel stagger-item">
        <div class="page-header" style="margin-bottom:0">
          <div>
            <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px">Texnik boshqaruv · Oxirgi sinxronizatsiya: ${lastSync ? formatDateTimeTashkent(lastSync) : 'Hozirgina'}</div>
            <h1 class="page-title">IT mutaxassis boshqaruv paneli</h1>
            <p class="page-desc">Akkauntlar holati, ommaviy Excel/CSV import va tizimga kirish xavfsizligi monitoringi.</p>
          </div>
          <div class="page-actions">
            <button type="button" class="btn btn-secondary" id="it-refresh">${icon('refresh-cw', 15)} Yangilash</button>
            <button type="button" class="btn btn-primary" id="it-users-btn">${icon('user-plus', 15)} Pedagoglar boshqaruvi</button>
          </div>
        </div>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card stagger-item">
          <div class="kpi-top"><span class="kpi-label">Jami foydalanuvchilar</span><span class="kpi-icon primary">${icon('users', 16)}</span></div>
          <div class="kpi-value-row"><span class="kpi-value" data-count="${users.length}">0</span><span class="kpi-unit">nafar</span></div>
          <div class="kpi-foot"><span>${teachersCount} nafar pedagog</span></div>
        </div>
        <div class="kpi-card stagger-item">
          <div class="kpi-top"><span class="kpi-label">Faol akkauntlar</span><span class="kpi-icon success">${icon('user-check', 16)}</span></div>
          <div class="kpi-value-row"><span class="kpi-value" data-count="${activeCount}">0</span><span class="kpi-unit">ta</span></div>
          <div class="kpi-foot"><span>Faolsiz: ${inactiveCount} ta</span></div>
        </div>
        <div class="kpi-card stagger-item">
          <div class="kpi-top"><span class="kpi-label">Parol almashtirishi kerak</span><span class="kpi-icon warning">${icon('key', 16)}</span></div>
          <div class="kpi-value-row"><span class="kpi-value" data-count="${mustChangeCount}">0</span><span class="kpi-unit">ta hisob</span></div>
          <div class="kpi-foot"><span>Birinchi kirish kutilmoqda</span></div>
        </div>
        <div class="kpi-card stagger-item">
          <div class="kpi-top"><span class="kpi-label">Reytingda qatnashuvchilar</span><span class="kpi-icon">${icon('trophy', 16)}</span></div>
          <div class="kpi-value-row"><span class="kpi-value" data-count="${ranking.length}">0</span><span class="kpi-unit">nafar</span></div>
          <div class="kpi-foot"><span>Faol va reytingga ulangan</span></div>
        </div>
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="card-header"><div><h3 class="card-title">Rollar bo‘yicha taqsimot</h3><p class="card-subtitle">Tizimdagi barcha akkauntlar tarkibi</p></div></div>
          <div id="it-role-donut"></div>
        </div>

        <div class="card">
          <div class="card-header">
            <div>
              <h3 class="card-title">So‘nggi kirishlar</h3>
              <p class="card-subtitle">${monAvail ? 'Oxirgi autentifikatsiya hodisalari' : 'Monitoring jadvali migratsiyadan so‘ng ishlaydi'}</p>
            </div>
            ${monAvail ? `<button type="button" class="btn btn-ghost btn-sm" id="it-mon-btn">Batafsil ${icon('chevron-right', 14)}</button>` : ''}
          </div>
          ${monAvail && logins.length
            ? `<div style="display:flex;flex-direction:column;gap:8px">
                ${logins.slice(0, 6).map(l => `
                  <div style="display:flex;justify-content:space-between;font-size:12.5px;padding-bottom:8px;border-bottom:1px solid var(--border)">
                    <div><b>${esc(l.user_name || l.login)}</b> · <span style="color:var(--text-muted)">${esc(l.device_type)} / ${esc(l.browser)}</span></div>
                    <span class="badge ${l.success ? 'badge-success' : 'badge-error'}">${l.success ? 'Muvaffaqiyatli' : 'Xato'}</span>
                  </div>
                `).join('')}
              </div>`
            : emptyStateHtml({ iconName: 'history', title: 'Kirish tarixi mavjud emas', desc: 'Yangi loginlar qayd etilishi bilan shu yerda ko‘rinadi.' })}
        </div>
      </div>
    </div>
  `;

  renderDonutChart($('#it-role-donut'), {
    centerValue: users.length,
    centerLabel: 'Jami hisob',
    unit: 'ta',
    slices: [
      { label: ROLE.teacher, value: users.filter(u => u.role === 'teacher').length, color: 'var(--primary)' },
      { label: ROLE.reviewer, value: users.filter(u => u.role === 'reviewer').length, color: 'var(--sec-b)' },
      { label: ROLE.it_admin, value: users.filter(u => u.role === 'it_admin').length, color: 'var(--warning)' },
      { label: ROLE.director, value: users.filter(u => u.role === 'director').length, color: 'var(--success)' }
    ]
  });

  $('#it-refresh').onclick = () => ctx.refresh();
  $('#it-users-btn').onclick = () => ctx.navigate('admin');
  const mb = $('#it-mon-btn');
  if (mb) mb.onclick = () => ctx.navigate('monitoring');
}

/* ==========================================================================
   3. REVIEWER DASHBOARD (Strictly Evaluator — Never Teacher / Never Ranked)
   ========================================================================== */
function renderReviewerDashboard(el, ctx) {
  const { me, users, entries, appeals } = ctx;
  const userMap = new Map(users.map(u => [u.id, u]));
  const scopedEntries = entries.filter(e => IMAP[e.ind]?.resp.includes(me.name));
  const myQueue = scopedEntries.filter(e => e.status === 'pending');
  const approvedCnt = scopedEntries.filter(e => e.status === 'approved').length;
  const rejectedCnt = scopedEntries.filter(e => e.status === 'rejected').length;
  const assignedInds = IND.filter(i => i.resp.includes(me.name));
  const deadlines = getDeadlines();
  const openAppeals = (appeals?.rows || []).filter(a => ['new', 'in_review', 'needs_info'].includes(a.status));

  el.innerHTML = `
    <div class="stack-v">
      <section class="hero-panel stagger-item">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap">
          <div>
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px">
              <span class="badge badge-primary">${esc(ROLE[me.role])}</span>
              <span class="badge badge-neutral">Faqat tekshiruvchi · Reytingdan tashqari</span>
              <span class="badge badge-warning">${myQueue.length} ta navbat</span>
            </div>
            <h1 class="page-title">${getGreetingUz()}, ${esc(me.name)}</h1>
            <p class="page-desc">Sizga biriktirilgan ${assignedInds.length} ta 26-AF mezoni bo‘yicha tasdiqlash navbati va murojaatlar boshqaruvi.</p>
            <div class="page-actions" style="margin-top:16px">
              <button type="button" class="btn btn-primary" id="rv-queue">${icon('check-circle', 15)} Tasdiqlash navbati (${myQueue.length})</button>
              <button type="button" class="btn btn-secondary" id="rv-appeals">${icon('message-square', 15)} Murojaatlar (${openAppeals.length})</button>
              <button type="button" class="btn btn-secondary" id="rv-rank">${icon('trophy', 15)} Reyting jadvali</button>
            </div>
          </div>
          <div style="padding:14px 18px;border-radius:16px;background:var(--surface-soft);border:1px solid var(--border);min-width:210px">
            <div style="font-size:11.5px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.04em">Biriktirilgan mezonlar</div>
            <div style="font-size:26px;font-weight:800;color:var(--primary);margin-top:4px;font-variant-numeric:tabular-nums">${assignedInds.length} <small style="font-size:12.5px;font-weight:500;color:var(--text-muted)">ta indikator</small></div>
            <div style="font-size:12px;color:var(--text-2);margin-top:4px">${assignedInds.map(i => `${i.sec}-${i.id}`).join(', ')}</div>
          </div>
        </div>
      </section>

      <div class="kpi-grid">
        <div class="kpi-card stagger-item">
          <div class="kpi-top"><span class="kpi-label">Sizning navbatingiz</span><span class="kpi-icon warning">${icon('clock', 16)}</span></div>
          <div class="kpi-value-row"><span class="kpi-value" data-count="${myQueue.length}">0</span><span class="kpi-unit">ta ariza</span></div>
          <div class="kpi-foot"><span>Tekshirishni kutmoqda</span></div>
        </div>
        <div class="kpi-card stagger-item">
          <div class="kpi-top"><span class="kpi-label">Tasdiqlangan jami</span><span class="kpi-icon success">${icon('check-circle', 16)}</span></div>
          <div class="kpi-value-row"><span class="kpi-value" data-count="${approvedCnt}">0</span><span class="kpi-unit">ta yutuq</span></div>
          <div class="kpi-foot"><span>Rad etilgan: ${rejectedCnt} ta</span></div>
        </div>
        <div class="kpi-card stagger-item">
          <div class="kpi-top"><span class="kpi-label">Ochiq murojaatlar</span><span class="kpi-icon primary">${icon('message-square', 16)}</span></div>
          <div class="kpi-value-row"><span class="kpi-value" data-count="${openAppeals.length}">0</span><span class="kpi-unit">ta ish</span></div>
          <div class="kpi-foot"><span>Javob yoki ko‘rib chiqish</span></div>
        </div>
        <div class="kpi-card stagger-item">
          <div class="kpi-top"><span class="kpi-label">Topshirish muddati</span><span class="kpi-icon">${icon('calendar', 16)}</span></div>
          <div class="kpi-value-row"><span class="kpi-value">${deadlines.n20}</span><span class="kpi-unit">kun qoldi</span></div>
          <div class="kpi-foot"><span>${esc(deadlines.d20Label)}</span></div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div><h3 class="card-title">Navbatdagi arizalar</h3><p class="card-subtitle">Tezkor ko‘rib chiqish uchun oxirgi yuborilgan yutuqlar</p></div>
          <button type="button" class="btn btn-ghost btn-sm" id="rv-open-all">Barchasini ochish ${icon('chevron-right', 14)}</button>
        </div>
        ${myQueue.length === 0
          ? emptyStateHtml({ iconName: 'check-circle', title: 'Navbat bo‘sh', desc: 'Sizga biriktirilgan indikatorlarda kutayotgan arizalar yo‘q.' })
          : `<div style="display:flex;flex-direction:column;gap:8px">
              ${myQueue.slice(0, 6).map(e => {
                const owner = userMap.get(e.uid);
                return `
                  <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;padding:11px 13px;border:1px solid var(--border);border-radius:12px">
                    <div style="display:flex;align-items:center;gap:10px;min-width:0">
                      ${avatarHtml(owner?.name || '?', 'sm', owner?.avatar_url)}
                      <div style="min-width:0">
                        <div style="font-weight:600;font-size:13.5px">${esc(owner?.name || 'Pedagog')} · <span style="color:var(--primary)">+${e.pts} ball</span></div>
                        <div style="font-size:12px;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e.ind}. ${esc(IMAP[e.ind]?.name || '')} — ${esc(e.type)}</div>
                      </div>
                    </div>
                    <span class="badge badge-warning">${formatDateUz(e.date)}</span>
                  </div>
                `;
              }).join('')}
            </div>`}
      </div>
    </div>
  `;

  $('#rv-queue').onclick = () => ctx.navigate('reviews');
  $('#rv-appeals').onclick = () => ctx.navigate('appeals');
  $('#rv-rank').onclick = () => ctx.navigate('ranking');
  $('#rv-open-all').onclick = () => ctx.navigate('reviews');
}

/* ==========================================================================
   4. TEACHER PERSONAL WORKSPACE
   ========================================================================== */
function renderTeacherDashboard(el, ctx) {
  const { me, users, entries, devGoals } = ctx;
  const myEntries = entries.filter(e => e.uid === me.id);
  const k = calcScores(myEntries);
  const ranking = getRanking(users, entries);
  const myRank = ranking.find(r => r.id === me.id);
  const deadlines = getDeadlines();
  const activeGoals = (devGoals?.rows || []).filter(g => g.status === 'active');

  const waitSum = sec => IND.filter(i => i.sec === sec).reduce((s, i) => s + (k.by[i.id]?.wait || 0), 0);
  const waitA = Math.round(waitSum('A') * 10) / 10;
  const waitB = Math.round(waitSum('B') * 10) / 10;
  const waitC = Math.round(waitSum('C') * 10) / 10;
  const remA = Math.max(0, Math.round((50 - k.A) * 10) / 10);
  const remB = Math.max(0, Math.round((30 - k.B) * 10) / 10);
  const remC = Math.max(0, Math.round((50 - k.C) * 10) / 10);

  const opportunities = IND
    .map(i => {
      const st = k.by[i.id] || { ok: 0, wait: 0 };
      const remaining = Math.max(0, Math.round((i.max - st.ok - st.wait) * 10) / 10);
      return { ...i, ok: st.ok, wait: st.wait, remaining };
    })
    .filter(x => x.remaining > 0)
    .sort((a, b) => b.remaining - a.remaining)
    .slice(0, 4);

  const monthly = buildMonthlySeries(myEntries);

  el.innerHTML = `
    <div class="stack-v">
      <!-- Teacher Executive Hero -->
      <section class="hero-panel stagger-item">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:24px;flex-wrap:wrap">
          <div style="display:flex;align-items:center;gap:18px;flex-wrap:wrap">
            <div style="cursor:pointer" id="td-open-prof">${avatarHtml(me.name, 'xl', me.avatar_url)}</div>
            <div>
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px">
                <span class="badge badge-primary">${myRank ? `#${myRank.rank}-o‘rin (${ranking.length} tadan)` : 'Reytingdan tashqari'}</span>
                <span class="badge badge-neutral">${esc(me.subject || 'Pedagog')}</span>
              </div>
              <h1 class="page-title">${getGreetingUz()}, ${esc(me.name)}</h1>
              <p class="page-desc">Tasdiqlangan rasmiy ball: <b>${k.T} / 130 ball</b> (${Math.round((k.T / 130) * 100)}%) · ${myEntries.filter(e => e.status === 'pending').length} ta tekshiruvda</p>
              <div class="page-actions" style="margin-top:14px">
                <button type="button" class="btn btn-primary" id="td-add">${icon('plus', 15)} Yutuq qo‘shish</button>
                <button type="button" class="btn btn-secondary" id="td-port">${icon('printer', 15)} A4 Portfolio</button>
                <button type="button" class="btn btn-secondary" id="td-dev">${icon('target', 15)} Rivojlanish rejasi (${activeGoals.length})</button>
              </div>
            </div>
          </div>

          <div style="display:flex;align-items:center;gap:20px;flex-wrap:wrap">
            ${scoreRingSvg({ value: k.T, max: 130, size: 118, stroke: 10, color: 'var(--primary)', sub: '/ 130 ball' })}
            <div style="display:flex;flex-direction:column;gap:8px;font-size:13px">
              <div style="display:flex;align-items:center;gap:8px"><span class="presence-dot online"></span><span>Tasdiqlangan: <b>${myEntries.filter(e => e.status === 'approved').length}</b></span></div>
              <div style="display:flex;align-items:center;gap:8px"><span class="presence-dot recent"></span><span>Tekshiruvda: <b>${myEntries.filter(e => e.status === 'pending').length}</b></span></div>
              <div style="display:flex;align-items:center;gap:8px"><span class="presence-dot" style="background:var(--error)"></span><span>Rad etilgan: <b>${myEntries.filter(e => e.status === 'rejected').length}</b></span></div>
            </div>
          </div>
        </div>
      </section>

      <!-- A, B, C Detailed Breakdown -->
      <div class="grid-3">
        <div class="card card-compact stagger-item">
          <div style="display:flex;justify-content:space-between;align-items:center"><span style="font-size:12.5px;font-weight:600;color:var(--sec-a)">A bo‘lim · Salohiyat</span><span class="badge badge-neutral">Maks: 50</span></div>
          <div style="font-size:28px;font-weight:700;margin:6px 0;font-variant-numeric:tabular-nums">${k.A} <small style="font-size:13px;color:var(--text-muted)">ball</small></div>
          <div class="progress-single"><i style="width:${(k.A / 50) * 100}%;background:var(--sec-a)"></i></div>
          <div style="display:flex;justify-content:space-between;font-size:11.5px;color:var(--text-muted);margin-top:8px">
            <span>Kutilmoqda: <b>+${waitA}</b></span>
            <span>Imkoniyat: <b>${remA}</b></span>
          </div>
        </div>

        <div class="card card-compact stagger-item">
          <div style="display:flex;justify-content:space-between;align-items:center"><span style="font-size:12.5px;font-weight:600;color:var(--sec-b)">B bo‘lim · O‘quvchilar</span><span class="badge badge-neutral">Maks: 30</span></div>
          <div style="font-size:28px;font-weight:700;margin:6px 0;font-variant-numeric:tabular-nums">${k.B} <small style="font-size:13px;color:var(--text-muted)">ball</small></div>
          <div class="progress-single"><i style="width:${(k.B / 30) * 100}%;background:var(--sec-b)"></i></div>
          <div style="display:flex;justify-content:space-between;font-size:11.5px;color:var(--text-muted);margin-top:8px">
            <span>Kutilmoqda: <b>+${waitB}</b></span>
            <span>Imkoniyat: <b>${remB}</b></span>
          </div>
        </div>

        <div class="card card-compact stagger-item">
          <div style="display:flex;justify-content:space-between;align-items:center"><span style="font-size:12.5px;font-weight:600;color:var(--sec-c)">C bo‘lim · Faollik</span><span class="badge badge-neutral">Maks: 50</span></div>
          <div style="font-size:28px;font-weight:700;margin:6px 0;font-variant-numeric:tabular-nums">${k.C} <small style="font-size:13px;color:var(--text-muted)">ball</small></div>
          <div class="progress-single"><i style="width:${(k.C / 50) * 100}%;background:var(--sec-c)"></i></div>
          <div style="display:flex;justify-content:space-between;font-size:11.5px;color:var(--text-muted);margin-top:8px">
            <span>Kutilmoqda: <b>+${waitC}</b></span>
            <span>Imkoniyat: <b>${remC}</b></span>
          </div>
        </div>
      </div>

      <div class="grid-asymmetric">
        <div class="card">
          <div class="card-header">
            <div><h3 class="card-title">Shaxsiy natijalar dinamikasi</h3><p class="card-subtitle">Tasdiqlangan ballaringiz o‘sish grafigi</p></div>
            <button type="button" class="btn btn-ghost btn-sm" id="td-my-res">Barchasi ${icon('chevron-right', 14)}</button>
          </div>
          <div id="td-area-chart"></div>
        </div>

        <div class="stack-v">
          <div class="card card-compact">
            <div class="card-header" style="margin-bottom:10px">
              <div><h3 class="card-title">Rivojlanish imkoniyatlari</h3><p class="card-subtitle">Ball to‘plash mumkin bo‘lgan mezonlar</p></div>
            </div>
            ${opportunities.length === 0
              ? `<p style="margin:0;font-size:13px;color:var(--success)">Barcha mezonlar bo‘yicha maksimal ball to‘plangan!</p>`
              : `<div style="display:flex;flex-direction:column;gap:8px">
                  ${opportunities.map(o => `
                    <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:9px 11px;border-radius:10px;background:var(--surface-soft);font-size:12.5px">
                      <div style="min-width:0"><b style="color:var(--primary)">${o.sec}-${o.id}.</b> ${esc(o.name)}</div>
                      <span class="badge badge-neutral">+${o.remaining} ball</span>
                    </div>
                  `).join('')}
                </div>`}
          </div>

          <div class="card card-compact">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
              <div class="kpi-icon primary">${icon('calendar', 16)}</div>
              <div style="font-weight:600;font-size:13.5px">Topshirish muddatlari</div>
            </div>
            <div style="font-size:12.5px;color:var(--text-muted);line-height:1.55">
              Mas’ullarga: <b>${esc(deadlines.d20Label)}</b> (${deadlines.n20} kun)<br>
              Yakuniy hisobot: <b>${esc(deadlines.d25Label)}</b> (${deadlines.n25} kun)
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  renderAreaChart($('#td-area-chart'), { labels: monthly.labels, values: monthly.approvedPts, unit: 'ball' });
  $('#td-add').onclick = () => ctx.navigate('add_entry');
  $('#td-port').onclick = () => ctx.openPortfolioPrint(me.id);
  $('#td-dev').onclick = () => ctx.navigate('dev_plan');
  $('#td-my-res').onclick = () => ctx.navigate('my_results');
  $('#td-open-prof').onclick = () => ctx.openProfile(me.id);
}

/* ==========================================================================
   MENING NATIJAM (Personal Results with Period Filter & Appeal Shortcut)
   ========================================================================== */
export function renderMyResults(el, ctx) {
  const { me, users, entries } = ctx;
  const allMyEntries = entries.filter(e => e.uid === me.id);
  const filteredEntries = filterEntriesByPeriod(allMyEntries, myResPeriod);
  const k = calcScores(filteredEntries);
  const ranking = getRanking(users, entries);
  const myRank = ranking.find(r => r.id === me.id);
  const deadlines = getDeadlines();

  el.innerHTML = `
    <div class="stack-v">
      <div class="page-header">
        <div>
          <h1 class="page-title">Mening natijam</h1>
          <p class="page-desc">${esc(me.name)} · ${esc(me.subject || 'Pedagog')} · Rasmiy reyting: ${myRank ? `#${myRank.rank}` : '—'}</p>
        </div>
        <div class="page-actions">
          <select id="mr-period" class="input" style="width:auto;min-width:155px" aria-label="Davr filtri">
            <option value="all" ${myResPeriod === 'all' ? 'selected' : ''}>Barcha davr</option>
            <option value="this_month" ${myResPeriod === 'this_month' ? 'selected' : ''}>Joriy oy</option>
            <option value="prev_month" ${myResPeriod === 'prev_month' ? 'selected' : ''}>O‘tgan oy</option>
            <option value="quarter" ${myResPeriod === 'quarter' ? 'selected' : ''}>Oxirgi 3 oy</option>
            <option value="this_year" ${myResPeriod === 'this_year' ? 'selected' : ''}>Joriy yil</option>
          </select>
          <button type="button" class="btn btn-secondary" id="mr-port-btn">${icon('printer', 15)} A4 Portfolio</button>
          <button type="button" class="btn btn-primary" id="mr-add-btn">${icon('plus', 15)} Yutuq qo‘shish</button>
        </div>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-top"><span class="kpi-label">Tasdiqlangan ball</span><span class="kpi-icon primary">${icon('trophy', 16)}</span></div>
          <div class="kpi-value-row"><span class="kpi-value">${k.T}</span><span class="kpi-unit">/ 130</span></div>
          <div class="progress-stack">
            <i class="seg-a" style="width:${(k.A / 130) * 100}%"></i>
            <i class="seg-b" style="width:${(k.B / 130) * 100}%"></i>
            <i class="seg-c" style="width:${(k.C / 130) * 100}%"></i>
          </div>
          <div class="kpi-foot"><span>Kutilayotgan ball rasmiy reytingga kirmaydi</span></div>
        </div>
        <div class="kpi-card">
          <div class="kpi-top"><span class="kpi-label">A bo‘lim (Salohiyat)</span><span class="kpi-icon primary">${icon('award', 16)}</span></div>
          <div class="kpi-value-row"><span class="kpi-value">${k.A}</span><span class="kpi-unit">/ 50</span></div>
          <div class="progress-single"><i style="width:${(k.A / 50) * 100}%;background:var(--sec-a)"></i></div>
          <div class="kpi-foot"><span>${SEC.A[0]}</span></div>
        </div>
        <div class="kpi-card">
          <div class="kpi-top"><span class="kpi-label">B bo‘lim (O‘quvchilar)</span><span class="kpi-icon success">${icon('graduation-cap', 16)}</span></div>
          <div class="kpi-value-row"><span class="kpi-value">${k.B}</span><span class="kpi-unit">/ 30</span></div>
          <div class="progress-single"><i style="width:${(k.B / 30) * 100}%;background:var(--sec-b)"></i></div>
          <div class="kpi-foot"><span>${SEC.B[0]}</span></div>
        </div>
        <div class="kpi-card">
          <div class="kpi-top"><span class="kpi-label">C bo‘lim (Faollik)</span><span class="kpi-icon warning">${icon('trending-up', 16)}</span></div>
          <div class="kpi-value-row"><span class="kpi-value">${k.C}</span><span class="kpi-unit">/ 50</span></div>
          <div class="progress-single"><i style="width:${(k.C / 50) * 100}%;background:var(--sec-c)"></i></div>
          <div class="kpi-foot"><span>${SEC.C[0]}</span></div>
        </div>
      </div>

      <div class="card card-compact" style="display:flex;align-items:center;gap:12px">
        <div class="kpi-icon primary">${icon('calendar', 16)}</div>
        <div style="font-size:13px;color:var(--text-2)">
          Topshirish muddati: <b>${esc(deadlines.d20Label)}</b> (${deadlines.n20} kun qoldi) · Yakuniy hisobot: <b>${esc(deadlines.d25Label)}</b> (${deadlines.n25} kun qoldi)
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">Kiritilgan yutuqlar (${filteredEntries.length} ta)</h3>
            <p class="card-subtitle">Tasdiqlanmagan arizalarni o‘chirishingiz yoki rad etilgan qaror yuzasidan apellyatsiya yuborishingiz mumkin</p>
          </div>
        </div>

        ${filteredEntries.length === 0
          ? emptyStateHtml({
              iconName: 'award',
              title: 'Ushbu davrda yutuq topilmadi',
              desc: 'Yangi yutuq kiritish uchun yuqoridagi “Yutuq qo‘shish” tugmasidan foydalaning.',
              actionHtml: `<button type="button" class="btn btn-primary" id="mr-empty-add">${icon('plus', 15)} Yutuq qo‘shish</button>`
            })
          : `
            <div class="table-wrap desktop-table-only">
              <table class="data-table">
                <thead>
                  <tr><th>Sana</th><th>Mezon</th><th>Yutuq va tavsif</th><th>Ball</th><th>Holat</th><th style="text-align:right">Amal</th></tr>
                </thead>
                <tbody>
                  ${filteredEntries.map(e => `
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
                        <div style="display:inline-flex;gap:6px">
                          ${e.status === 'rejected' ? `<button type="button" class="btn btn-secondary btn-sm" data-appeal-entry="${e.id}" title="Apellyatsiya yuborish">${icon('message-square', 13)} Apellyatsiya</button>` : ''}
                          ${e.status !== 'approved'
                            ? `<button type="button" class="btn btn-danger btn-sm" data-del-entry="${e.id}">${icon('trash-2', 14)} O‘chirish</button>`
                            : '<span style="color:var(--text-subtle)">—</span>'}
                        </div>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>

            <div class="mobile-card-list">
              ${filteredEntries.map(e => `
                <div class="card card-compact" style="box-shadow:none">
                  <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px">
                    <span style="font-size:12px;color:var(--text-muted)">${formatDateUz(e.date)}</span>
                    ${badgeStatus(e.status)}
                  </div>
                  <div style="font-weight:600;font-size:14px">${e.ind}. ${esc(IMAP[e.ind]?.name || '')}</div>
                  <div style="font-size:13px;margin-top:4px">${esc(e.type)} × ${e.qty} · <b style="color:var(--primary)">+${e.pts} ball</b></div>
                  <div style="font-size:12.5px;color:var(--text-muted);margin-top:4px">${esc(e.descr)}</div>
                  ${e.note ? `<div style="font-size:12px;color:var(--error);margin-top:6px">Izoh: ${esc(e.note)}</div>` : ''}
                  <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
                    ${e.fpath ? `<a href="${esc(e.fpath)}" target="_blank" rel="noopener" class="btn btn-secondary btn-sm">${icon('external-link', 13)} Hujjat</a>` : ''}
                    ${e.status === 'rejected' ? `<button type="button" class="btn btn-secondary btn-sm" data-appeal-entry="${e.id}">${icon('message-square', 13)} Apellyatsiya</button>` : ''}
                    ${e.status !== 'approved' ? `<button type="button" class="btn btn-danger btn-sm" data-del-entry="${e.id}">${icon('trash-2', 14)} O‘chirish</button>` : ''}
                  </div>
                </div>
              `).join('')}
            </div>
          `}
      </div>
    </div>
  `;

  $('#mr-period').onchange = e => { myResPeriod = e.target.value; renderMyResults(el, ctx); };
  $('#mr-add-btn').onclick = () => ctx.navigate('add_entry');
  $('#mr-port-btn').onclick = () => ctx.openPortfolioPrint(me.id);
  const emptyAdd = $('#mr-empty-add');
  if (emptyAdd) emptyAdd.onclick = () => ctx.navigate('add_entry');

  $$('[data-appeal-entry]').forEach(btn => {
    btn.onclick = () => ctx.navigate('appeals', { createForEntryId: Number(btn.dataset.appealEntry) });
  });

  $$('[data-del-entry]').forEach(btn => {
    btn.onclick = async () => {
      const id = Number(btn.dataset.delEntry);
      const target = allMyEntries.find(x => x.id === id);
      if (!target) return;
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
   DEEP ANALYTICS (Director & Reviewer)
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

  const indHoriz = IND.map(i => ({
    label: `${i.id}. ${i.name}`,
    value: Math.round((indPts[i.id] || 0) * 10) / 10,
    sub: `${indCounts[i.id] || 0} ta tasdiqlangan ariza`
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
          <h1 class="page-title">Statistika va tahlil</h1>
          <p class="page-desc">26-AF bo‘limlar, indikatorlar va fan kafedralari kesimida chuqur tahlil.</p>
        </div>
        <div class="page-actions">
          <button type="button" class="btn btn-secondary" id="an-rep">${icon('file-text', 15)} Hisobotlar</button>
        </div>
      </div>

      <div class="grid-3">
        <div class="card card-compact">
          <div style="font-size:12px;color:var(--text-muted)">A bo‘lim o‘rtachasi (maks 50)</div>
          <div style="font-size:25px;font-weight:700;margin:5px 0">${avgA} ball</div>
          <div class="progress-single"><i style="width:${(avgA / 50) * 100}%;background:var(--sec-a)"></i></div>
          <div style="font-size:11.5px;color:var(--text-muted);margin-top:6px">${SEC.A[0]} (${Math.round((avgA / 50) * 100)}%)</div>
        </div>
        <div class="card card-compact">
          <div style="font-size:12px;color:var(--text-muted)">B bo‘lim o‘rtachasi (maks 30)</div>
          <div style="font-size:25px;font-weight:700;margin:5px 0">${avgB} ball</div>
          <div class="progress-single"><i style="width:${(avgB / 30) * 100}%;background:var(--sec-b)"></i></div>
          <div style="font-size:11.5px;color:var(--text-muted);margin-top:6px">${SEC.B[0]} (${Math.round((avgB / 30) * 100)}%)</div>
        </div>
        <div class="card card-compact">
          <div style="font-size:12px;color:var(--text-muted)">C bo‘lim o‘rtachasi (maks 50)</div>
          <div style="font-size:25px;font-weight:700;margin:5px 0">${avgC} ball</div>
          <div class="progress-single"><i style="width:${(avgC / 50) * 100}%;background:var(--sec-c)"></i></div>
          <div style="font-size:11.5px;color:var(--text-muted);margin-top:6px">${SEC.C[0]} (${Math.round((avgC / 50) * 100)}%)</div>
        </div>
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="card-header"><div><h3 class="card-title">Eng faol indikatorlar</h3><p class="card-subtitle">Tasdiqlangan jami ballar kesimida top 8 mezon</p></div></div>
          <div id="an-ind-horiz"></div>
        </div>
        <div class="card">
          <div class="card-header"><div><h3 class="card-title">Bo‘limlar ulushi</h3><p class="card-subtitle">O‘rtacha ballning A, B, C bo‘yicha tarkibi</p></div></div>
          <div id="an-sec-donut"></div>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><div><h3 class="card-title">Fanlar bo‘yicha natijalar</h3><p class="card-subtitle">Har bir fan yo‘nalishidagi pedagoglar soni va o‘rtacha ballari</p></div></div>
        ${subjRows.length === 0
          ? emptyStateHtml({ iconName: 'bar-chart-3', title: 'Ma’lumotlar mavjud emas', desc: 'Reytingda faol pedagoglar qo‘shilgach jadval shakllanadi.' })
          : `<div class="table-wrap">
              <table class="data-table">
                <thead><tr><th>Fan yo‘nalishi</th><th>Pedagoglar</th><th>O‘rtacha A</th><th>O‘rtacha B</th><th>O‘rtacha C</th><th>O‘rtacha Jami</th></tr></thead>
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
            </div>`}
      </div>
    </div>
  `;

  renderHorizontalBarChart($('#an-ind-horiz'), { items: indHoriz, unit: 'ball' });
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
  $('#an-rep').onclick = () => ctx.navigate('reports');
}
