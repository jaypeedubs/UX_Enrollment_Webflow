import { initLogin } from './pages/login.js';
import { initDashboard } from './pages/dashboard.js';
import { initApply } from './pages/apply.js';
import { initStatus } from './pages/status.js';
import { initEnrollment } from './pages/enrollment.js';
import { initPage } from './core/ui.js';

// ─── STYLE FIXES ────────────────────────────────────────────────────────────
// Webflow's .w-button forces bright-blue on all <a> and <button> elements.
// The design system classes (btn-ghost-1, btn-primary-1-2, btn-submit, etc.)
// exist in the site CSS but their background rules are equal-specificity to
// .w-button — inject !important overrides so the palette wins.
(function injectStyles() {
  const s = document.createElement('style');
  s.textContent =
    // Danger buttons
    '.btn-danger.w-button,.btn-danger-1.w-button{background-color:transparent!important;background-image:none!important;}' +
    '.btn-danger.w-button:hover,.btn-danger-1.w-button:hover{background-color:#fef2f2!important;}' +
    // Notification close
    '.notif-drawer-close.w-button{background:#f1f5f9!important;background-image:none!important;color:#64748b!important;border:1px solid #e2e8f0!important;border-radius:6px!important;padding:4px 12px!important;font-size:17px!important;line-height:1.4!important;min-width:auto!important;}' +
    '.notif-drawer-close.w-button:hover{background:#e2e8f0!important;}' +
    // Ghost buttons (save draft, back) — transparent bg
    '.btn-ghost-1.w-button{background-color:transparent!important;background-image:none!important;color:#6b7280!important;}' +
    '.btn-ghost-1.w-button:hover{background-color:#f3f4f6!important;color:#374151!important;}' +
    // Primary buttons (next/continue)
    '.btn-primary-1-2.w-button,.btn-primary-1.w-button{background-color:#1a3a5c!important;background-image:none!important;color:#fff!important;}' +
    '.btn-primary-1-2.w-button:hover,.btn-primary-1.w-button:hover{background-color:#123161!important;}' +
    // Submit button (green)
    '.btn-submit.w-button{background-color:#16a34a!important;background-image:none!important;color:#fff!important;}' +
    '.btn-submit.w-button:hover{background-color:#15803d!important;}' +
    // Spinner — keyframe `spin` is in webflow.css; apply it to all ring variants
    '.loading-spinner,.spinner,.spinner-1,.spinner-1-2{animation:.7s linear infinite spin!important;}' +
    // Input focus ring using the design system cornflower-blue accent
    '.form-input-1:focus,.form-input-1:focus-visible{border-color:#63a3da!important;box-shadow:0 0 0 3px rgba(99,163,218,.15)!important;}' +
    '.form-input-1[disabled]{background:#f3f4f6!important;color:#9ca3af!important;cursor:not-allowed!important;}' +
    // Generated question textarea
    '[data-icit-generated-question] textarea{resize:vertical;min-height:96px;}';
  document.head.appendChild(s);
}());

// ─── DISPATCHER ─────────────────────────────────────────────────────────────
const path = window.location.pathname;
if (path === '/login')                        initPage('login', initLogin);
else if (path === '/dashboard')               initPage('dashboard', initDashboard);
else if (path === '/apply')                   initPage('apply', initApply);
else if (path === '/application-status')      initPage('application-status', initStatus);
else if (path === '/enrollment-confirmation') initPage('enrollment-confirmation', initEnrollment);
