// ─── SELECTORS ──────────────────────────────────────────────────────────────

export function q(selector, root = document) {
  return root.querySelector(selector);
}

// ─── VISIBILITY ─────────────────────────────────────────────────────────────

export function show(el) {
  if (!el) return;
  el.style.display = '';
  // CSS classes (e.g. .dash-app-card, .dash-no-app) set display:none; removing the
  // inline style alone doesn't override them — force block when still hidden.
  if (getComputedStyle(el).display === 'none') el.style.display = 'block';
}

export function hide(el) {
  if (el) el.style.display = 'none';
}

// ─── CONTENT ────────────────────────────────────────────────────────────────

export function setText(el, text) {
  if (el) el.textContent = text;
}

export function setHref(el, href) {
  if (el) el.href = href;
}

export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ─── FORMATTERS ─────────────────────────────────────────────────────────────

export function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function formatCurrency(cents) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

// ─── DESIGN SYSTEM ──────────────────────────────────────────────────────────

// Walks the /apply page DOM and adds design-system CSS classes to the bare
// Webflow-generated elements (w-input, w-button, w-select, unlabelled divs).
// All classes used here exist in the site stylesheet — no new styles invented.
export function applyDesignSystemClasses() {
  // Section wrappers 1–5 → card style
  [1, 2, 3, 4, 5].forEach((n) => {
    const sec = q('[wized="form-section-' + n + '"]');
    if (!sec) return;
    sec.classList.add('form-section');
    const header = sec.firstElementChild;
    if (header && header.tagName === 'DIV') {
      header.classList.add('section-header-1');
      const spans = Array.from(header.querySelectorAll(':scope > span'));
      if (spans[0]) spans[0].classList.add('section-num');
      if (spans[1]) spans[1].classList.add('section-title');
    }
  });

  // Form inputs in sections 2 and 4 (personal info + program questions)
  document.querySelectorAll(
    '[wized="form-section-2"] .w-input:not([type="file"]),' +
    '[wized="form-section-4"] .w-input:not([type="file"]),' +
    '[wized="form-section-2"] select,' +
    '[wized="form-section-4"] select'
  ).forEach((el) => el.classList.add('form-input-1'));

  // Labels in sections 2 and 4
  document.querySelectorAll(
    '[wized="form-section-2"] label,' +
    '[wized="form-section-4"] label'
  ).forEach((el) => { if (!el.classList.contains('form-label')) el.classList.add('form-label'); });

  // Button → design-system class map
  const btnMap = {
    'change-course-btn':    'btn-ghost-1',
    'next-section-1-btn':   'btn-primary-1-2',
    'back-section-2-btn':   'btn-ghost-1',
    'next-section-2-btn':   'btn-primary-1-2',
    'back-section-3-btn':   'btn-ghost-1',
    'next-section-3-btn':   'btn-primary-1-2',
    'back-section-4-btn':   'btn-ghost-1',
    'next-section-4-btn':   'btn-primary-1-2',
    'back-section-5-btn':   'btn-ghost-1',
    'submit-application-btn': 'btn-submit',
  };
  Object.keys(btnMap).forEach((wid) => {
    const el = q('[wized="' + wid + '"]');
    if (el) el.classList.add(btnMap[wid]);
  });

  // CV upload zone — base class only; inner markup and state classes managed by buildUploadZone
  const zone = q('[wized="cv-upload-zone"]');
  if (zone) zone.classList.add('upload-zone');
  const uploadSuccess = q('[wized="cv-upload-success"]');
  if (uploadSuccess) uploadSuccess.classList.add('upload-success');
  const progressWrap = q('[wized="cv-upload-progress"]');
  if (progressWrap) {
    progressWrap.classList.add('upload-progress-wrap');
    const bar = progressWrap.querySelector('div');
    if (bar) {
      bar.classList.add('upload-progress-bar');
      const fill = bar.querySelector('[wized="cv-upload-progress-fill"]');
      if (fill) fill.classList.add('upload-progress-fill');
    }
    const pct = progressWrap.querySelector('[wized="cv-upload-pct"]');
    if (pct) pct.classList.add('upload-progress-pct');
  }
  const removeBtn = q('[wized="cv-remove-btn"]');
  if (removeBtn) removeBtn.classList.add('btn-danger-1');
}

export function setCvProgress(percent) {
  const value = String(percent) + '%';
  setText(q('[wized="cv-upload-pct"]'), value);
  q('[wized="cv-upload-progress-fill"]')?.style.setProperty('width', value, 'important');
}

// ─── PAGE LIFECYCLE ─────────────────────────────────────────────────────────

export function revealPage() {
  const w = document.getElementById('icit-page-wrapper');
  if (w) w.style.visibility = 'visible';
}

export function pageRoot() {
  return document.getElementById('icit-page-wrapper') || document.body;
}

export function showPageError(message) {
  const target =
    q('[wized="form-error-msg"]') ||
    q('[wized="signin-error-msg"]') ||
    q('[wized="signup-error-msg"]') ||
    q('[wized="enroll-error-msg"]');
  setText(target, message);
  show(target);
}

export function initPage(name, initFn) {
  Promise.resolve()
    .then(initFn)
    .catch((err) => {
      console.error('ICIT page init failed:', name, err);
      showPageError(err.message || 'This page could not finish loading. Please refresh and try again.');
      revealPage();
    });
}

export function ensureFallback(id, html) {
  if (document.getElementById(id)) return document.getElementById(id);
  const root = pageRoot();
  const el = document.createElement('div');
  el.id = id;
  el.innerHTML = html;
  root.appendChild(el);
  return el;
}

// ─── FOCUS / KEYBOARD ───────────────────────────────────────────────────────

// Not present in icit-app.js — reserved for future modal/dialog focus trapping.
export function getFocusable(container) {}

// Not present in icit-app.js — reserved for future modal/dialog keyboard handling.
export function handleKeyDown(e, focusable) {}
