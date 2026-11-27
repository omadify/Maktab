// Precision responsive SVG Chart Engine (Area, Line, Bar, Donut) with Interactive Tooltips
import { esc } from './ui.js';

let tooltipEl = null;
function ensureTooltip() {
  if (!tooltipEl) {
    tooltipEl = document.createElement('div');
    tooltipEl.className = 'chart-tooltip';
    document.body.appendChild(tooltipEl);
  }
  return tooltipEl;
}

function showTooltip(evt, html) {
  const tip = ensureTooltip();
  tip.innerHTML = html;
  const x = Math.min(window.innerWidth - 110, Math.max(110, evt.clientX));
  const y = Math.max(70, evt.clientY - 10);
  tip.style.left = `${x}px`;
  tip.style.top = `${y}px`;
  tip.classList.add('visible');
}

function hideTooltip() {
  if (tooltipEl) tooltipEl.classList.remove('visible');
}

function niceMax(val, minTop = 10) {
  if (val <= 0) return minTop;
  const raw = Math.ceil(val * 1.15);
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = Math.max(1, Math.ceil(raw / pow)) * pow;
  return Math.max(minTop, step);
}

function smoothPath(points) {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const cx = (p0.x + p1.x) / 2;
    d += ` C ${cx.toFixed(1)} ${p0.y.toFixed(1)}, ${cx.toFixed(1)} ${p1.y.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
  }
  return d;
}

/* ==========================================================================
   AREA CHART (Single-series smooth curved area + interactive points)
   ========================================================================== */
export function renderAreaChart(container, { labels, values, unit = 'ball', color = 'var(--primary)', height = 220 }) {
  if (!container) return;
  if (!labels.length) {
    container.innerHTML = `<div class="empty-state" style="padding:36px 12px"><p class="empty-desc">Grafik uchun yetarli ma’lumot mavjud emas</p></div>`;
    return;
  }

  const w = 560;
  const h = height;
  const pad = { top: 18, right: 16, bottom: 30, left: 38 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;
  const maxVal = niceMax(Math.max(...values, 0), 10);
  const gradId = `area-grad-${Math.random().toString(36).slice(2, 8)}`;

  const pts = values.map((v, i) => ({
    x: pad.left + (values.length === 1 ? plotW / 2 : (i / (values.length - 1)) * plotW),
    y: pad.top + plotH - (v / maxVal) * plotH,
    v,
    label: labels[i]
  }));

  const lineD = smoothPath(pts);
  const areaD = `${lineD} L ${pts[pts.length - 1].x.toFixed(1)} ${(pad.top + plotH).toFixed(1)} L ${pts[0].x.toFixed(1)} ${(pad.top + plotH).toFixed(1)} Z`;

  const gridTicks = [0, 0.25, 0.5, 0.75, 1];
  container.innerHTML = `
    <div class="chart-box">
      <svg class="chart-svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="Oylik dinamika grafigi">
        <defs>
          <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${color}" stop-opacity="0.24"/>
            <stop offset="100%" stop-color="${color}" stop-opacity="0.01"/>
          </linearGradient>
        </defs>
        ${gridTicks.map(t => {
          const gy = pad.top + plotH * (1 - t);
          const gVal = Math.round(maxVal * t);
          return `
            <line x1="${pad.left}" y1="${gy}" x2="${w - pad.right}" y2="${gy}" stroke="var(--border)" stroke-dasharray="3 3"/>
            <text x="${pad.left - 8}" y="${gy + 4}" text-anchor="end" fill="var(--text-muted)" font-size="11">${gVal}</text>
          `;
        }).join('')}
        <path d="${areaD}" fill="url(#${gradId})"/>
        <path d="${lineD}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" class="chart-line-anim"/>
        ${pts.map((p, idx) => `
          <text x="${p.x}" y="${h - 8}" text-anchor="middle" fill="var(--text-muted)" font-size="11">${esc(p.label)}</text>
          <circle cx="${p.x}" cy="${p.y}" r="4.5" fill="var(--surface)" stroke="${color}" stroke-width="2.2" data-idx="${idx}" style="cursor:pointer"/>
          <rect x="${p.x - 18}" y="${pad.top}" width="36" height="${plotH}" fill="transparent" data-idx="${idx}" style="cursor:pointer"/>
        `).join('')}
      </svg>
    </div>
  `;

  container.querySelectorAll('[data-idx]').forEach(el => {
    const idx = Number(el.dataset.idx);
    const p = pts[idx];
    el.addEventListener('mouseenter', evt => {
      showTooltip(evt, `<div style="font-weight:600;margin-bottom:2px">${esc(p.label)}</div><div>${p.v} ${esc(unit)}</div>`);
    });
    el.addEventListener('mousemove', evt => {
      showTooltip(evt, `<div style="font-weight:600;margin-bottom:2px">${esc(p.label)}</div><div>${p.v} ${esc(unit)}</div>`);
    });
    el.addEventListener('mouseleave', hideTooltip);
  });
}

/* ==========================================================================
   MULTI-SERIES LINE CHART (e.g., Submitted vs Approved vs Rejected)
   ========================================================================== */
export function renderLineChart(container, { labels, series, height = 220 }) {
  if (!container) return;
  if (!labels.length) {
    container.innerHTML = `<div class="empty-state" style="padding:36px 12px"><p class="empty-desc">Chiziqli grafik uchun ma’lumot topilmadi</p></div>`;
    return;
  }

  const w = 560;
  const h = height;
  const pad = { top: 18, right: 16, bottom: 30, left: 36 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;
  const allVals = series.flatMap(s => s.values);
  const maxVal = niceMax(Math.max(...allVals, 0), 5);
  const gridTicks = [0, 0.25, 0.5, 0.75, 1];

  const seriesPts = series.map(s => ({
    ...s,
    pts: s.values.map((v, i) => ({
      x: pad.left + (labels.length === 1 ? plotW / 2 : (i / (labels.length - 1)) * plotW),
      y: pad.top + plotH - (v / maxVal) * plotH,
      v
    }))
  }));

  container.innerHTML = `
    <div style="display:flex;gap:14px;flex-wrap:wrap;margin-bottom:10px;font-size:12px;color:var(--text-muted)">
      ${series.map(s => `<span style="display:inline-flex;align-items:center;gap:6px"><i style="width:10px;height:3px;border-radius:2px;background:${s.color};display:inline-block"></i>${esc(s.name)}</span>`).join('')}
    </div>
    <div class="chart-box">
      <svg class="chart-svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="Arizalar holati dinamikasi">
        ${gridTicks.map(t => {
          const gy = pad.top + plotH * (1 - t);
          return `
            <line x1="${pad.left}" y1="${gy}" x2="${w - pad.right}" y2="${gy}" stroke="var(--border)" stroke-dasharray="3 3"/>
            <text x="${pad.left - 8}" y="${gy + 4}" text-anchor="end" fill="var(--text-muted)" font-size="11">${Math.round(maxVal * t)}</text>
          `;
        }).join('')}
        ${seriesPts.map(s => `
          <path d="${smoothPath(s.pts)}" fill="none" stroke="${s.color}" stroke-width="2.2" stroke-linecap="round" class="chart-line-anim"/>
          ${s.pts.map(p => `<circle cx="${p.x}" cy="${p.y}" r="3.5" fill="var(--surface)" stroke="${s.color}" stroke-width="2"/>`).join('')}
        `).join('')}
        ${labels.map((lbl, i) => {
          const x = pad.left + (labels.length === 1 ? plotW / 2 : (i / (labels.length - 1)) * plotW);
          return `
            <text x="${x}" y="${h - 8}" text-anchor="middle" fill="var(--text-muted)" font-size="11">${esc(lbl)}</text>
            <rect x="${x - 18}" y="${pad.top}" width="36" height="${plotH}" fill="transparent" data-col="${i}" style="cursor:pointer"/>
          `;
        }).join('')}
      </svg>
    </div>
  `;

  container.querySelectorAll('[data-col]').forEach(el => {
    const idx = Number(el.dataset.col);
    const html = `
      <div style="font-weight:600;margin-bottom:4px">${esc(labels[idx])}</div>
      ${series.map(s => `<div style="display:flex;align-items:center;gap:6px;justify-content:space-between">
        <span style="display:inline-flex;align-items:center;gap:5px"><i style="width:8px;height:8px;border-radius:50%;background:${s.color};display:inline-block"></i>${esc(s.name)}:</span>
        <b>${s.values[idx]}</b>
      </div>`).join('')}
    `;
    el.addEventListener('mouseenter', evt => showTooltip(evt, html));
    el.addEventListener('mousemove', evt => showTooltip(evt, html));
    el.addEventListener('mouseleave', hideTooltip);
  });
}

/* ==========================================================================
   BAR CHART (Vertical interactive bars for subjects or criteria)
   ========================================================================== */
export function renderBarChart(container, { items, unit = 'ball', color = 'var(--primary)', height = 230 }) {
  if (!container) return;
  if (!items.length) {
    container.innerHTML = `<div class="empty-state" style="padding:36px 12px"><p class="empty-desc">Taqqoslash uchun ma’lumot mavjud emas</p></div>`;
    return;
  }

  const w = 560;
  const h = height;
  const pad = { top: 18, right: 16, bottom: 42, left: 38 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;
  const maxVal = niceMax(Math.max(...items.map(x => x.value), 0), 10);
  const slotW = plotW / items.length;
  const barW = Math.min(36, Math.max(14, slotW * 0.56));
  const gridTicks = [0, 0.25, 0.5, 0.75, 1];

  container.innerHTML = `
    <div class="chart-box">
      <svg class="chart-svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="Ustunli statistika grafigi">
        ${gridTicks.map(t => {
          const gy = pad.top + plotH * (1 - t);
          return `
            <line x1="${pad.left}" y1="${gy}" x2="${w - pad.right}" y2="${gy}" stroke="var(--border)" stroke-dasharray="3 3"/>
            <text x="${pad.left - 8}" y="${gy + 4}" text-anchor="end" fill="var(--text-muted)" font-size="11">${Math.round(maxVal * t)}</text>
          `;
        }).join('')}
        ${items.map((item, i) => {
          const bh = Math.max(2, (item.value / maxVal) * plotH);
          const bx = pad.left + i * slotW + (slotW - barW) / 2;
          const by = pad.top + plotH - bh;
          const shortLbl = item.label.length > 11 ? `${item.label.slice(0, 10)}…` : item.label;
          return `
            <rect x="${bx}" y="${by}" width="${barW}" height="${bh}" rx="6" fill="${item.color || color}" class="chart-bar-anim" style="animation-delay:${i * 40}ms;cursor:pointer" data-bar="${i}"/>
            <text x="${bx + barW / 2}" y="${h - 14}" text-anchor="middle" fill="var(--text-muted)" font-size="10.5">${esc(shortLbl)}</text>
          `;
        }).join('')}
      </svg>
    </div>
  `;

  container.querySelectorAll('[data-bar]').forEach(el => {
    const item = items[Number(el.dataset.bar)];
    const html = `
      <div style="font-weight:600;margin-bottom:2px">${esc(item.label)}</div>
      <div>${item.value} ${esc(unit)}${item.sub ? ` <span style="color:var(--text-muted)">(${esc(item.sub)})</span>` : ''}</div>
    `;
    el.addEventListener('mouseenter', evt => {
      el.style.opacity = '0.84';
      showTooltip(evt, html);
    });
    el.addEventListener('mousemove', evt => showTooltip(evt, html));
    el.addEventListener('mouseleave', () => {
      el.style.opacity = '1';
      hideTooltip();
    });
  });
}

/* ==========================================================================
   DONUT CHART (Interactive slices + center summary + clean legend)
   ========================================================================== */
export function renderDonutChart(container, { slices, centerValue, centerLabel, unit = 'ta' }) {
  if (!container) return;
  const total = slices.reduce((s, x) => s + x.value, 0);
  if (total === 0) {
    container.innerHTML = `<div class="empty-state" style="padding:36px 12px"><p class="empty-desc">Taqsimot uchun ma’lumot topilmadi</p></div>`;
    return;
  }

  const size = 180;
  const cx = size / 2;
  const cy = size / 2;
  const r = 64;
  const strokeW = 20;
  const circ = 2 * Math.PI * r;

  let offset = 0;
  const arcs = slices.filter(s => s.value > 0).map((s, idx) => {
    const frac = s.value / total;
    const dash = frac * circ;
    const arc = { ...s, dash, offset, pct: Math.round(frac * 100), idx };
    offset += dash;
    return arc;
  });

  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap">
      <div style="position:relative;width:180px;height:180px;margin:0 auto">
        <svg viewBox="0 0 ${size} ${size}" width="180" height="180" role="img" aria-label="Taqsimot doiraviy grafigi">
          <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--bg-subtle)" stroke-width="${strokeW}"/>
          ${arcs.map(a => `
            <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${a.color}" stroke-width="${strokeW}"
              stroke-dasharray="${a.dash.toFixed(2)} ${circ.toFixed(2)}"
              stroke-dashoffset="${(-a.offset).toFixed(2)}"
              transform="rotate(-90 ${cx} ${cy})"
              data-slice="${a.idx}"
              style="cursor:pointer;transition:stroke-width 150ms ease, opacity 150ms ease"/>
          `).join('')}
        </svg>
        <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none;text-align:center">
          <div style="font-size:24px;font-weight:700;line-height:1.1;letter-spacing:-0.02em;font-variant-numeric:tabular-nums">${esc(centerValue ?? total)}</div>
          <div style="font-size:11.5px;color:var(--text-muted);margin-top:2px">${esc(centerLabel || 'Jami')}</div>
        </div>
      </div>
      <div style="flex:1;min-width:170px;display:flex;flex-direction:column;gap:10px">
        ${slices.map(s => {
          const pct = total > 0 ? Math.round((s.value / total) * 100) : 0;
          return `
            <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:13px">
              <span style="display:inline-flex;align-items:center;gap:8px;color:var(--text-2)">
                <i style="width:10px;height:10px;border-radius:3px;background:${s.color};display:inline-block;flex-shrink:0"></i>
                ${esc(s.label)}
              </span>
              <span style="font-weight:600;font-variant-numeric:tabular-nums">${s.value} <span style="color:var(--text-muted);font-weight:400">(${pct}%)</span></span>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  container.querySelectorAll('[data-slice]').forEach(el => {
    const arc = arcs.find(a => a.idx === Number(el.dataset.slice));
    if (!arc) return;
    const html = `<div style="font-weight:600">${esc(arc.label)}</div><div>${arc.value} ${esc(unit)} (${arc.pct}%)</div>`;
    el.addEventListener('mouseenter', evt => {
      el.setAttribute('stroke-width', String(strokeW + 4));
      showTooltip(evt, html);
    });
    el.addEventListener('mousemove', evt => showTooltip(evt, html));
    el.addEventListener('mouseleave', () => {
      el.setAttribute('stroke-width', String(strokeW));
      hideTooltip();
    });
  });
}
