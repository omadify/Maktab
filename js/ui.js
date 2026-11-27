// Reusable UI utilities: escaping, themes, toasts, modals, avatars, skeletons, counters
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

export const csvCell = s => `"${String(s ?? '').replace(/"/g, '""')}"`;

export function formatDateUz(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return esc(dateStr);
  return d.toLocaleDateString('uz-UZ', { year: 'numeric', month: 'short', day: 'numeric' });
}

/* ==========================================================================
   THEME ENGINE (Light / Dark / System with zero flash)
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
  if (meta) meta.setAttribute('content', resolved === 'dark' ? '#0B1120' : '#F8FAFC');
  return resolved;
}

export function initThemeListener(onChange) {
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener('change', () => {
    if (getThemePref() === 'system') {
      const r = applyTheme('system');
      if (onChange) onChange(r);
    }
  });
}

/* ==========================================================================
   TOAST NOTIFICATIONS
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
    ${icon(iconMap[type] || 'bell', 18)}
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
   MODAL / DIALOG SYSTEM (Escape + Backdrop + Focus)
   ========================================================================== */
let activeModalCleanup = null;

export function closeModal() {
  const root = document.getElementById('modal-root');
  if (root) root.innerHTML = '';
  if (activeModalCleanup) {
    activeModalCleanup();
    activeModalCleanup = null;
  }
}

export function openModal({ title, bodyHtml, footerHtml = '', size = 'md', onMount = null }) {
  closeModal();
  const root = document.getElementById('modal-root');
  if (!root) return;

  root.innerHTML = `
    <div class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-title-el">
      <div class="modal-panel ${size === 'lg' ? 'modal-lg' : ''}">
        <div class="modal-head">
          <h3 class="modal-title" id="modal-title-el">${esc(title)}</h3>
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
  const closeBtn = root.querySelector('#modal-close-x');
  closeBtn.onclick = closeModal;
  backdrop.onclick = e => {
    if (e.target === backdrop) closeModal();
  };

  const onKey = e => {
    if (e.key === 'Escape') closeModal();
  };
  document.addEventListener('keydown', onKey);
  activeModalCleanup = () => document.removeEventListener('keydown', onKey);

  if (onMount) onMount(root.querySelector('.modal-panel'));
  const firstInput = root.querySelector('input, textarea, select, button.btn-primary');
  if (firstInput) setTimeout(() => firstInput.focus(), 40);
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
        panel.querySelector('#cfm-cancel').onclick = () => { closeModal(); resolve(false); };
        panel.querySelector('#cfm-ok').onclick = () => { closeModal(); resolve(true); };
      }
    });
  });
}

/* ==========================================================================
   AVATARS, BADGES, EMPTY STATES, SKELETONS, ANIMATED COUNTERS
   ========================================================================== */
const AVATAR_TONES = [
  ['#EFF6FF', '#1D4ED8', 'rgba(37,99,235,0.2)'],
  ['#F0FDFA', '#0F766E', 'rgba(13,148,136,0.2)'],
  ['#EEF2FF', '#4338CA', 'rgba(67,56,202,0.2)'],
  ['#FFFBEB', '#B45309', 'rgba(217,119,6,0.2)'],
  ['#F1F5F9', '#334155', 'rgba(51,65,85,0.2)']
];

export function avatarHtml(name, size = '') {
  const parts = String(name || '?').trim().split(/\s+/);
  const initials = parts.length > 1
    ? `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase()
    : String(name || '?').slice(0, 2).toUpperCase();
  let hash = 0;
  for (let i = 0; i < String(name).length; i++) hash = (hash * 31 + String(name).charCodeAt(i)) | 0;
  const [bg, fg, bd] = AVATAR_TONES[Math.abs(hash) % AVATAR_TONES.length];
  const sizeCls = size ? ` avatar-${size}` : '';
  return `<span class="avatar${sizeCls}" style="background:${bg};color:${fg};border-color:${bd}" aria-hidden="true">${esc(initials)}</span>`;
}

export function badgeStatus(status) {
  if (status === 'approved') {
    return `<span class="badge badge-success">${icon('check-circle', 13)} Tasdiqlangan</span>`;
  }
  if (status === 'rejected') {
    return `<span class="badge badge-error">${icon('x-circle', 13)} Rad etilgan</span>`;
  }
  return `<span class="badge badge-warning">${icon('clock', 13)} Tekshiruvda</span>`;
}

export function emptyStateHtml({ iconName = 'clipboard-list', title, desc, actionHtml = '' }) {
  return `
    <div class="empty-state">
      <div class="empty-icon">${icon(iconName, 24)}</div>
      <h4 class="empty-title">${esc(title)}</h4>
      <p class="empty-desc">${esc(desc)}</p>
      ${actionHtml ? `<div style="margin-top:8px">${actionHtml}</div>` : ''}
    </div>
  `;
}

export function skeletonDashboardHtml() {
  return `
    <div class="stack-v">
      <div class="kpi-grid">
        ${[1, 2, 3, 4].map(() => `
          <div class="kpi-card">
            <div class="skeleton" style="height:14px;width:55%"></div>
            <div class="skeleton" style="height:34px;width:45%"></div>
            <div class="skeleton" style="height:12px;width:75%"></div>
          </div>
        `).join('')}
      </div>
      <div class="grid-2">
        <div class="card"><div class="skeleton" style="height:240px;width:100%"></div></div>
        <div class="card"><div class="skeleton" style="height:240px;width:100%"></div></div>
      </div>
    </div>
  `;
}

export function animateCounters(container = document) {
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  container.querySelectorAll('[data-count]').forEach(el => {
    const target = Number(el.dataset.count);
    const decimals = Number(el.dataset.decimals || 0);
    if (Number.isNaN(target)) return;
    if (reduced || target === 0) {
      el.textContent = decimals > 0 ? target.toFixed(decimals) : String(Math.round(target));
      return;
    }
    const start = performance.now();
    const duration = 520;
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
