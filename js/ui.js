// Reusable UI Utilities V6: Escaping, CSV Defense, Themes, Transparency, Toasts, Modals/Sheets, Drawers, Avatars, Tashkent TZ
import { icon } from './icons.js';

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[m]));

// RFC-4180 CSV escaping + Formula Injection defense (=, +, -, @, tab, CR)
export function csvCell(s) {
  let v = String(s ?? '');
  if (/^[=+\-@\t\r]/.test(v)) {
    v = "'" + v;
  }
  return `"${v.replace(/"/g, '""')}"`;
}

export async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

const UZ_MONTHS_SHORT = ['yan', 'fev', 'mar', 'apr', 'may', 'iyun', 'iyul', 'avg', 'sen', 'okt', 'noy', 'dek'];

export function getTodayTashkent() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tashkent' });
}

export function formatDateUz(dateStr) {
  if (!dateStr) return '—';
  const mMatch = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (mMatch) {
    const [, y, m, d] = mMatch;
    return `${Number(d)} ${UZ_MONTHS_SHORT[(Number(m) - 1) % 12]}, ${y}`;
  }
  const dt = new Date(dateStr);
  if (Number.isNaN(dt.getTime())) return esc(dateStr);
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Tashkent',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  }).formatToParts(dt);
  const map = Object.fromEntries(parts.map(p => [p.type, p.value]));
  return `${Number(map.day)} ${UZ_MONTHS_SHORT[(Number(map.month) - 1) % 12]}, ${map.year}`;
}

export function formatDateTimeTashkent(isoOrEpoch) {
  if (!isoOrEpoch) return '—';
  const dt = typeof isoOrEpoch === 'number'
    ? new Date(isoOrEpoch < 1e12 ? isoOrEpoch * 1000 : isoOrEpoch)
    : new Date(isoOrEpoch);
  if (Number.isNaN(dt.getTime())) return '—';
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Tashkent',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(dt);
  const map = Object.fromEntries(parts.map(p => [p.type, p.value]));
  return `${Number(map.day)} ${UZ_MONTHS_SHORT[(Number(map.month) - 1) % 12]}, ${map.year} · ${map.hour}:${map.minute}`;
}

/* ==========================================================================
   THEME & TRANSPARENCY ENGINE
   ========================================================================== */
export function getThemePref() {
  return localStorage.getItem('reyting_theme') || 'system';
}

export function resolveTheme(pref = getThemePref()) {
  if (pref === 'light' || pref === 'dark') return pref;
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(pref) {
  const valid = ['light', 'dark', 'system'].includes(pref) ? pref : 'system';
  localStorage.setItem('reyting_theme', valid);
  const resolved = resolveTheme(valid);
  document.documentElement.setAttribute('data-theme', resolved);
  document.documentElement.setAttribute('data-theme-pref', valid);
  document.documentElement.style.colorScheme = resolved;
  const meta = document.getElementById('meta-theme-color');
  if (meta) meta.setAttribute('content', resolved === 'dark' ? '#090D15' : '#F5F7FB');
  return resolved;
}

export function getTransparencyPref() {
  return localStorage.getItem('reyting_transparency') || 'glass';
}

export function applyTransparencyPref(pref) {
  const valid = pref === 'reduced' ? 'reduced' : 'glass';
  localStorage.setItem('reyting_transparency', valid);
  if (valid === 'reduced') {
    document.documentElement.setAttribute('data-transparency', 'reduced');
  } else {
    document.documentElement.removeAttribute('data-transparency');
  }
  return valid;
}

export function initThemeListener(onChange) {
  if (!window.matchMedia) return;
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener('change', () => {
    if (getThemePref() === 'system') {
      const r = applyTheme('system');
      if (onChange) onChange(r);
    }
  });
}

/* ==========================================================================
   TOASTS
   ========================================================================== */
export function toast(message, type = 'info', duration = 3800) {
  const root = document.getElementById('toast-root');
  if (!root) return;
  const iconMap = {
    success: 'check-circle',
    error: 'x-circle',
    warning: 'alert-circle',
    info: 'bell'
  };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.setAttribute('role', 'status');
  el.innerHTML = `
    ${icon(iconMap[type] || 'bell', 17)}
    <div style="flex:1;line-height:1.45">${esc(message)}</div>
    <button type="button" class="btn-ghost btn-icon btn-sm" aria-label="Yopish" style="width:24px;height:24px">${icon('x', 14)}</button>
  `;
  const close = () => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(8px)';
    el.style.transition = 'opacity 150ms ease, transform 150ms ease';
    setTimeout(() => el.remove(), 160);
  };
  el.querySelector('button').onclick = close;
  root.appendChild(el);
  if (duration > 0) setTimeout(close, duration);
}

/* ==========================================================================
   MODAL, SHEET & RIGHT DETAIL DRAWER (Focus Trap + Unsaved Guard)
   ========================================================================== */
let activeModalCleanup = null;
let previousFocusEl = null;
let modalCloseGuard = null;

export function setModalCloseGuard(fn) {
  modalCloseGuard = fn;
}

export async function closeModal(force = false) {
  if (!force && modalCloseGuard) {
    const allow = await modalCloseGuard();
    if (!allow) return false;
  }
  modalCloseGuard = null;
  const root = document.getElementById('modal-root');
  if (root) root.innerHTML = '';
  if (activeModalCleanup) {
    activeModalCleanup();
    activeModalCleanup = null;
  }
  if (previousFocusEl && typeof previousFocusEl.focus === 'function') {
    previousFocusEl.focus();
    previousFocusEl = null;
  }
  return true;
}

function attachFocusTrap(container, onClose) {
  const onKey = e => {
    if (e.key === 'Escape') {
      onClose();
      return;
    }
    if (e.key === 'Tab') {
      const focusable = Array.from(container.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };
  document.addEventListener('keydown', onKey);
  return () => document.removeEventListener('keydown', onKey);
}

export function openModal({ title, subtitle = '', bodyHtml, footerHtml = '', size = 'md', onMount = null }) {
  closeModal(true);
  previousFocusEl = document.activeElement;
  const root = document.getElementById('modal-root');
  if (!root) return;

  root.innerHTML = `
    <div class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-title-el">
      <div class="modal-panel ${size === 'lg' ? 'modal-lg' : ''}">
        <div class="sheet-handle" aria-hidden="true"></div>
        <div class="modal-head">
          <div>
            <h3 class="modal-title" id="modal-title-el">${esc(title)}</h3>
            ${subtitle ? `<div style="font-size:12px;color:var(--text-muted);margin-top:2px">${esc(subtitle)}</div>` : ''}
          </div>
          <button type="button" class="btn btn-ghost btn-icon btn-sm" id="modal-close-x" aria-label="Yopish">
            ${icon('x', 16)}
          </button>
        </div>
        <div class="modal-body">${bodyHtml}</div>
        ${footerHtml ? `<div class="modal-foot">${footerHtml}</div>` : ''}
      </div>
    </div>
  `;

  const backdrop = root.querySelector('.modal-backdrop');
  const panel = root.querySelector('.modal-panel');
  root.querySelector('#modal-close-x').onclick = () => closeModal();
  backdrop.onclick = e => { if (e.target === backdrop) closeModal(); };
  activeModalCleanup = attachFocusTrap(panel, () => closeModal());

  if (onMount) onMount(panel);
  const firstInput = panel.querySelector('input, textarea, select, button.btn-primary');
  if (firstInput) setTimeout(() => firstInput.focus(), 35);
}

export function openDetailDrawer({ title, subtitle = '', bodyHtml, footerHtml = '', onMount = null }) {
  closeModal(true);
  previousFocusEl = document.activeElement;
  const root = document.getElementById('modal-root');
  if (!root) return;

  root.innerHTML = `
    <div class="drawer-right-backdrop" role="dialog" aria-modal="true" aria-labelledby="drawer-title-el">
      <div class="drawer-right-panel">
        <div class="modal-head">
          <div>
            <h3 class="modal-title" id="drawer-title-el">${esc(title)}</h3>
            ${subtitle ? `<div style="font-size:12px;color:var(--text-muted);margin-top:2px">${esc(subtitle)}</div>` : ''}
          </div>
          <button type="button" class="btn btn-ghost btn-icon btn-sm" id="drawer-close-x" aria-label="Yopish">
            ${icon('x', 16)}
          </button>
        </div>
        <div class="modal-body" style="flex:1">${bodyHtml}</div>
        ${footerHtml ? `<div class="modal-foot">${footerHtml}</div>` : ''}
      </div>
    </div>
  `;

  const backdrop = root.querySelector('.drawer-right-backdrop');
  const panel = root.querySelector('.drawer-right-panel');
  root.querySelector('#drawer-close-x').onclick = () => closeModal();
  backdrop.onclick = e => { if (e.target === backdrop) closeModal(); };
  activeModalCleanup = attachFocusTrap(panel, () => closeModal());
  if (onMount) onMount(panel);
}

export function confirmDialog({ title, message, confirmText = 'Tasdiqlash', cancelText = 'Bekor qilish', danger = false }) {
  return new Promise(resolve => {
    openModal({
      title,
      bodyHtml: `<p style="margin:0;color:var(--text-2);line-height:1.6">${esc(message)}</p>`,
      footerHtml: `
        <button type="button" class="btn btn-secondary" id="cfm-cancel">${esc(cancelText)}</button>
        <button type="button" class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="cfm-ok">${esc(confirmText)}</button>
      `,
      onMount: panel => {
        panel.querySelector('#cfm-cancel').onclick = () => { closeModal(true); resolve(false); };
        panel.querySelector('#cfm-ok').onclick = () => { closeModal(true); resolve(true); };
      }
    });
  });
}

/* ==========================================================================
   AVATARS (PHOTO + INITIALS FALLBACK), BADGES, SWITCH, SKELETONS, COUNTERS
   ========================================================================== */
const AVATAR_TONES = [
  ['#EFF4FF', '#2453BB', 'rgba(50,103,219,0.24)'],
  ['#ECFDF5', '#0F766E', 'rgba(13,148,136,0.24)'],
  ['#F5F3FF', '#5B21B6', 'rgba(91,33,182,0.24)'],
  ['#FFFBEB', '#B45309', 'rgba(217,119,6,0.24)'],
  ['#EDF2F8', '#334155', 'rgba(51,65,85,0.24)']
];

export function avatarHtml(name, size = '', avatarUrl = null) {
  const parts = String(name || '?').trim().split(/\s+/);
  const initials = parts.length > 1
    ? `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase()
    : String(name || '?').slice(0, 2).toUpperCase();
  let hash = 0;
  for (let i = 0; i < String(name).length; i++) hash = (hash * 31 + String(name).charCodeAt(i)) | 0;
  const [bg, fg, bd] = AVATAR_TONES[Math.abs(hash) % AVATAR_TONES.length];
  const sizeCls = size ? ` avatar-${size}` : '';
  if (avatarUrl) {
    return `<span class="avatar${sizeCls}" style="background:${bg};color:${fg};border-color:${bd}" aria-hidden="true"><img class="avatar-img" src="${esc(avatarUrl)}" alt="${esc(name || '')}" onerror="this.remove()"><span>${esc(initials)}</span></span>`;
  }
  return `<span class="avatar${sizeCls}" style="background:${bg};color:${fg};border-color:${bd}" aria-hidden="true">${esc(initials)}</span>`;
}

export function renderSwitchHtml({ id, checked = false, label = '' }) {
  return `<button type="button" role="switch" class="liquid-switch" id="${esc(id)}" aria-checked="${checked ? 'true' : 'false'}" aria-label="${esc(label)}"><span class="liquid-switch-thumb"></span></button>`;
}

export function badgeStatus(status) {
  if (status === 'approved') return `<span class="badge badge-success">${icon('check-circle', 12)} Tasdiqlangan</span>`;
  if (status === 'rejected') return `<span class="badge badge-error">${icon('x-circle', 12)} Rad etilgan</span>`;
  return `<span class="badge badge-warning">${icon('clock', 12)} Tekshiruvda</span>`;
}

export function emptyStateHtml({ iconName = 'clipboard-list', title, desc, actionHtml = '' }) {
  return `
    <div class="empty-state">
      <div class="empty-icon">${icon(iconName, 22)}</div>
      <h4 class="empty-title">${esc(title)}</h4>
      <p class="empty-desc">${esc(desc)}</p>
      ${actionHtml ? `<div style="margin-top:6px">${actionHtml}</div>` : ''}
    </div>
  `;
}

export function skeletonDashboardHtml() {
  return `
    <div class="stack-v">
      <div class="skeleton" style="height:120px;width:100%;border-radius:22px"></div>
      <div class="kpi-grid">
        ${[1, 2, 3, 4].map(() => `
          <div class="kpi-card">
            <div class="skeleton" style="height:14px;width:55%"></div>
            <div class="skeleton" style="height:30px;width:45%"></div>
            <div class="skeleton" style="height:12px;width:75%"></div>
          </div>
        `).join('')}
      </div>
      <div class="grid-2">
        <div class="card"><div class="skeleton" style="height:220px;width:100%"></div></div>
        <div class="card"><div class="skeleton" style="height:220px;width:100%"></div></div>
      </div>
    </div>
  `;
}

export function animateCounters(container = document, skip = false) {
  const reduced = skip || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  container.querySelectorAll('[data-count]').forEach(el => {
    const target = Number(el.dataset.count);
    const decimals = Number(el.dataset.decimals || 0);
    if (Number.isNaN(target)) return;
    if (reduced || target === 0) {
      el.textContent = decimals > 0 ? target.toFixed(decimals) : String(Math.round(target));
      return;
    }
    const start = performance.now();
    const duration = 460;
    const step = now => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const val = target * eased;
      el.textContent = decimals > 0 ? val.toFixed(decimals) : String(Math.round(val));
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = decimals > 0 ? target.toFixed(decimals) : String(Math.round(target));
    };
    requestAnimationFrame(step);
  });
}
