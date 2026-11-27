// Motion Design System V6: Liquid Pill Morphing, Scroll-Aware Glass, Reduced-Motion-Safe Counters

let scrollCleanup = null;

export function isReducedMotion() {
  return Boolean(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
}

/**
 * Slides a `.liquid-pill-indicator` smoothly behind the active button inside `.liquid-control-group` or `.tabs-pill`.
 */
export function syncLiquidPills(root = document) {
  root.querySelectorAll('.tabs-pill, .liquid-control-group').forEach(group => {
    const active = group.querySelector('.tab-btn.active, .seg-btn.active');
    let pill = group.querySelector(':scope > .liquid-pill-indicator');
    if (!active) {
      if (pill) pill.style.opacity = '0';
      return;
    }
    if (!pill) {
      pill = document.createElement('span');
      pill.className = 'liquid-pill-indicator';
      pill.setAttribute('aria-hidden', 'true');
      group.insertBefore(pill, group.firstChild);
    }
    const updatePos = () => {
      const gRect = group.getBoundingClientRect();
      const aRect = active.getBoundingClientRect();
      if (!aRect.width) return;
      const left = aRect.left - gRect.left - 4;
      const top = aRect.top - gRect.top - 4;
      pill.style.opacity = '1';
      pill.style.width = `${aRect.width}px`;
      pill.style.height = `${aRect.height}px`;
      pill.style.transform = `translate3d(${left}px, ${top}px, 0)`;
    };
    requestAnimationFrame(updatePos);
  });
}

/**
 * Attaches scroll-aware glass elevation to the floating topbar without continuous layout thrashing.
 */
export function bindScrollAwareTopbar(topbarEl) {
  if (scrollCleanup) {
    scrollCleanup();
    scrollCleanup = null;
  }
  if (!topbarEl) return;
  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      topbarEl.classList.toggle('is-scrolled', window.scrollY > 12);
      ticking = false;
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  scrollCleanup = () => window.removeEventListener('scroll', onScroll);
}

/**
 * Renders a crisp SVG radial score ring (e.g. 130-point ring or section ring) with smooth arc animation.
 */
export function scoreRingSvg({ value = 0, max = 130, size = 124, stroke = 10, color = 'var(--primary)', label = '', sub = '' }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const ratio = Math.max(0, Math.min(1, max > 0 ? value / max : 0));
  const offset = circ * (1 - ratio);
  const cx = size / 2;
  return `
    <div class="score-ring-wrap" style="width:${size}px;height:${size}px">
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="${label || `${value} / ${max}`}">
        <circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="var(--bg-subtle)" stroke-width="${stroke}"/>
        <circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}"
          stroke-linecap="round"
          stroke-dasharray="${circ.toFixed(2)}"
          stroke-dashoffset="${offset.toFixed(2)}"
          transform="rotate(-90 ${cx} ${cx})"
          class="progress-ring-arc"
          style="--ring-circ:${circ.toFixed(2)};--ring-offset:${offset.toFixed(2)}"/>
      </svg>
      <div class="score-ring-center">
        <span class="score-ring-val">${value}</span>
        ${sub ? `<span class="score-ring-sub">${sub}</span>` : ''}
      </div>
    </div>
  `;
}
