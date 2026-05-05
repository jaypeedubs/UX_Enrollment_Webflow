(function () {
  'use strict';

  // ─── STYLE FIXES ────────────────────────────────────────────────────────────
  // Webflow's .w-button forces bright-blue on all <a> and <button> elements.
  // The design system classes (btn-ghost-1, btn-primary-1-2, btn-submit, etc.)
  // exist in the site CSS but their background rules are equal-specificity to
  // .w-button — inject !important overrides so the palette wins.
  (function () {
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

  // ─── CONSTANTS ──────────────────────────────────────────────────────────────
  const SUPABASE_URL = 'https://xvweanlqcbgbiyxqhwux.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2d2VhbmxxY2JnYml5eHFod3V4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwNTY0NjcsImV4cCI6MjA5MjYzMjQ2N30.Fs819XQjDXoT8l0qZreFEjeu_Xf2zjzqBG87BjGTQM4';
  const EDGE_FN_BASE = SUPABASE_URL + '/functions/v1';
  const WITHDRAW_ALLOWED = ['draft', 'submitted', 'in_review', 'waitlisted', 'accepted'];

  // ─── CORE ───────────────────────────────────────────────────────────────────
  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Redirect to /login whenever the Supabase session is explicitly ended.
  // INITIAL_SESSION events are ignored — only SIGNED_OUT fires the redirect.
  supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT' && window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  });

  async function getSession() {
    const { data } = await supabase.auth.getSession();
    return data.session; // null if not signed in
  }

  // Returns session or redirects to /login and hangs (never resolves).
  // Call with: const session = await requireAuth();
  async function requireAuth() {
    const session = await getSession();
    if (!session) {
      window.location.href = '/login';
      return new Promise(() => {}); // intentionally never resolves
    }
    return session;
  }

  // Redirects to /dashboard if a session exists. Hangs (never resolves) if redirect fires.
  async function requireGuest() {
    const session = await getSession();
    if (session) {
      window.location.href = '/dashboard';
      return new Promise(() => {}); // intentionally never resolves
    }
  }

  function isLoginAuthReturn() {
    if (window.location.pathname !== '/login') return false;
    const search = new URLSearchParams(window.location.search || '');
    const hash = new URLSearchParams((window.location.hash || '').replace(/^#/, ''));
    return search.has('code') || search.has('token_hash') || search.has('type') ||
      hash.has('access_token') || hash.has('refresh_token') || hash.has('type') || hash.has('error');
  }

  async function completeLoginAuthReturn() {
    if (!isLoginAuthReturn()) return false;

    const session = await getSession();
    if (session) await signOut();
    window.history.replaceState({}, '', '/login');
    return true;
  }

  // ─── API ────────────────────────────────────────────────────────────────────

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data.session;
  }

  async function signUp(email, password, firstName, lastName) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin + '/login',
        data: { first_name: firstName, last_name: lastName },
      },
    });
    if (error) throw error;
    return data.session;
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  // loadApplication returns null (not an error) when the user has no application yet.
  // Uses .maybeSingle() so Supabase returns null instead of an error on zero rows.
  async function loadApplication(session) {
    const { data, error } = await supabase
      .from('applications')
      .select(`
        id, program_id, status, submitted_at, updated_at,
        cv_url, admin_notes, notes_response, locked_fields, program_answers,
        programs ( id, name, price_cents, program_questions )
      `)
      .eq('applicant_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async function loadNotifications(session) {
    const { data, error } = await supabase
      .from('notifications')
      .select('id, message, read, created_at')
      .eq('applicant_id', session.user.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  }

  async function markNotificationsRead(session) {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('applicant_id', session.user.id)
      .eq('read', false);
    if (error) throw error;
  }

  async function loadPrograms() {
    const { data, error } = await supabase
      .from('programs')
      .select('id, name, deadline, price_cents, program_questions')
      .in('status', ['active', 'upcoming']);
    if (error) throw error;
    return data;
  }

  async function loadApplicationHistory(session, applicationId) {
    const { data, error } = await supabase
      .from('application_events')
      .select('id, event_type, created_at, metadata')
      .eq('application_id', applicationId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  }

  // Validates currentStatus before writing — defense-in-depth.
  // RLS also enforces ownership, but this prevents a throw with no visible error.
  async function withdrawApplication(session, applicationId, currentStatus) {
    if (!WITHDRAW_ALLOWED.includes(currentStatus)) {
      throw new Error('Cannot withdraw from status: ' + currentStatus);
    }
    const { error: upErr } = await supabase
      .from('applications')
      .update({ status: 'withdrawn' })
      .eq('id', applicationId)
      .eq('applicant_id', session.user.id);
    if (upErr) throw upErr;

    const { error: evErr } = await supabase
      .from('application_events')
      .insert({ application_id: applicationId, event_type: 'withdrawn' });
    if (evErr) throw evErr;
  }

  // fields: { id?, programId, firstName, lastName, programAnswers? }
  // Returns the saved application row.
  async function saveDraft(session, fields) {
    // Keep user display name in sync with auth metadata.
    await supabase.auth.updateUser({
      data: { first_name: fields.firstName, last_name: fields.lastName },
    });

    const payload = {
      applicant_id: session.user.id,
      program_id: fields.programId,
      status: 'draft',
      locked_fields: { program: true, first_name: true, last_name: true },
    };
    if (fields.id) payload.id = fields.id;
    if (fields.programAnswers) payload.program_answers = fields.programAnswers;

    const { data, error } = await supabase
      .from('applications')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .single();
    if (error) throw error;

    // Triggers handle-notification via DB webhook.
    await supabase
      .from('application_events')
      .insert({ application_id: data.id, event_type: 'draft_saved' });

    return data;
  }

  // Returns the storage path string on success.
  async function uploadCV(session, applicationId, file) {
    const ext = file.name.split('.').pop();
    const path = session.user.id + '/' + applicationId + '.' + ext;
    const { error: upErr } = await supabase.storage
      .from('cvs')
      .upload(path, file, { upsert: true });
    if (upErr) throw upErr;

    const { error: dbErr } = await supabase
      .from('applications')
      .update({ cv_url: path })
      .eq('id', applicationId);
    if (dbErr) throw dbErr;

    return path;
  }

  async function removeCV(session, applicationId) {
    const { error } = await supabase
      .from('applications')
      .update({ cv_url: null })
      .eq('id', applicationId)
      .eq('applicant_id', session.user.id);
    if (error) throw error;
  }

  // Guards against double-submission with .eq('status', 'draft').
  async function submitApplication(session, applicationId) {
    const { data: updated, error: upErr } = await supabase
      .from('applications')
      .update({
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        locked_fields: { all: true },
      })
      .eq('id', applicationId)
      .eq('status', 'draft')
      .select('id');
    if (upErr) throw upErr;
    if (!updated || updated.length === 0) {
      throw new Error('Application is no longer a draft and cannot be submitted.');
    }

    const { error: evErr } = await supabase
      .from('application_events')
      .insert({ application_id: applicationId, event_type: 'submitted' });
    if (evErr) throw evErr;
  }

  async function submitNotesResponse(session, applicationId, response) {
    const { error } = await supabase
      .from('applications')
      .update({ notes_response: response })
      .eq('id', applicationId)
      .eq('applicant_id', session.user.id);
    if (error) throw error;
  }

  // Returns { url: "https://checkout.stripe.com/..." } on success.
  async function createCheckout(session, applicationId) {
    const resp = await fetch(EDGE_FN_BASE + '/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + session.access_token,
      },
      body: JSON.stringify({ application_id: applicationId }),
    });
    if (!resp.ok) {
      let msg = 'Checkout failed';
      try {
        const body = await resp.json();
        if (body.error) msg = body.error;
      } catch (_) { /* non-JSON error body */ }
      throw new Error(msg);
    }
    return resp.json();
  }

  // ─── UI ─────────────────────────────────────────────────────────────────────

  function q(sel) { return document.querySelector(sel); }
  function show(el) {
    if (!el) return;
    el.style.display = '';
    // CSS classes (e.g. .dash-app-card, .dash-no-app) set display:none; removing the
    // inline style alone doesn't override them — force block when still hidden.
    if (getComputedStyle(el).display === 'none') el.style.display = 'block';
  }
  function hide(el) { if (el) el.style.display = 'none'; }
  function setText(el, val) { if (el) el.textContent = val; }
  function setHref(el, val) { if (el) el.href = val; }

  function revealPage() {
    const w = document.getElementById('icit-page-wrapper');
    if (w) w.style.visibility = 'visible';
  }

  function pageRoot() {
    return document.getElementById('icit-page-wrapper') || document.body;
  }

  function showPageError(message) {
    const target =
      q('[wized="form-error-msg"]') ||
      q('[wized="signin-error-msg"]') ||
      q('[wized="signup-error-msg"]') ||
      q('[wized="enroll-error-msg"]');
    setText(target, message);
    show(target);
  }

  function initPage(name, initFn) {
    Promise.resolve()
      .then(initFn)
      .catch((err) => {
        console.error('ICIT page init failed:', name, err);
        showPageError(err.message || 'This page could not finish loading. Please refresh and try again.');
        revealPage();
      });
  }

  function ensureFallback(id, html) {
    if (document.getElementById(id)) return document.getElementById(id);
    const root = pageRoot();
    const el = document.createElement('div');
    el.id = id;
    el.innerHTML = html;
    root.appendChild(el);
    return el;
  }

  function normalizeQuestions(value) {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
      } catch (_) {
        return [];
      }
    }
    return [];
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function updateApplyStepper(sectionNumber) {
    const percent = String(Math.round(sectionNumber * 33.3333)) + '%';
    q('[wized="form-progress-fill"]')?.style.setProperty('width', percent, 'important');
    for (let n = 1; n <= 3; n++) {
      const label = q('[wized="step-label-' + n + '"]');
      if (!label) continue;
      if (n === sectionNumber) {
        label.classList.add('progress-step-active');
      } else {
        label.classList.remove('progress-step-active');
      }
    }
  }

  function clearGeneratedQuestions() {
    document.querySelectorAll('[data-icit-generated-question]').forEach((el) => el.remove());
  }

  function questionHost(template) {
    if (template?.parentElement) return template.parentElement;
    // Use the Webflow-designated questions container if present.
    const dynamicQ = q('[wized="dynamic-questions"]');
    if (dynamicQ) return dynamicQ;
    // Fallback: create a host inside section 2.
    const section = q('[wized="form-section-2"]') || pageRoot();
    let host = document.getElementById('icit-generated-questions');
    if (!host) {
      host = document.createElement('div');
      host.id = 'icit-generated-questions';
      host.style.margin = '16px 0';
      const before = q('[wized="questions-empty"]') || q('[wized="save-draft-2-btn"]')?.parentElement;
      if (before?.parentElement === section) {
        section.insertBefore(host, before);
      } else {
        section.appendChild(host);
      }
    }
    return host;
  }

  function createGeneratedQuestion(question, currentValue) {
    const row = document.createElement('div');
    row.dataset.icitGeneratedQuestion = '1';
    row.className = 'form-group-1';

    const label = document.createElement('label');
    label.textContent = question.label || question.id;
    label.htmlFor = 'icit-' + question.id;
    label.className = 'form-label';
    row.appendChild(label);

    let control;
    if (question.type === 'select') {
      control = document.createElement('select');
      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = 'Select an option';
      control.appendChild(placeholder);
      (question.options || []).forEach((opt) => {
        const el = document.createElement('option');
        el.value = opt;
        el.textContent = opt;
        control.appendChild(el);
      });
    } else {
      control = document.createElement(question.type === 'textarea' ? 'textarea' : 'input');
      if (control.tagName === 'INPUT') control.type = question.type === 'email' ? 'email' : 'text';
    }

    control.id = 'icit-' + question.id;
    control.name = question.id;
    control.dataset.questionId = question.id;
    control.value = currentValue || '';
    control.className = 'form-input-1';
    row.appendChild(control);

    return { row, control };
  }

  function setCvProgress(percent) {
    const value = String(percent) + '%';
    setText(q('[wized="cv-upload-pct"]'), value);
    q('[wized="cv-upload-progress-fill"]')?.style.setProperty('width', value, 'important');
  }

  function filenameFromPath(path) {
    if (!path) return '';
    return String(path).split('/').pop() || '';
  }

  // Walks the /apply page DOM and adds design-system CSS classes to the bare
  // Webflow-generated elements (w-input, w-button, w-select, unlabelled divs).
  // All classes used here exist in the site stylesheet — no new styles invented.
  function applyDesignSystemClasses() {
    // Form section wrappers → card
    [1, 2, 3].forEach((n) => {
      const sec = q('[wized="form-section-' + n + '"]');
      if (!sec) return;
      sec.classList.add('form-section');

      // Section header: first child div → section-header-1
      const header = sec.firstElementChild;
      if (header && header.tagName === 'DIV') {
        header.classList.add('section-header-1');
        const spans = Array.from(header.querySelectorAll(':scope > span'));
        if (spans[0]) spans[0].classList.add('section-num');
        if (spans[1]) spans[1].classList.add('section-title');
      }
    });

    // Lock badge
    const lb = q('[wized="section-1-lock"]');
    if (lb) lb.classList.add('lock-badge');

    // Form inputs / selects → form-input-1
    document.querySelectorAll(
      '[wized="form-section-1"] .w-input:not([type="file"]),' +
      '[wized="form-section-2"] .w-input:not([type="file"]),' +
      '[wized="form-section-3"] .w-input:not([type="file"]),' +
      '[wized="form-section-1"] select,' +
      '[wized="form-section-2"] select'
    ).forEach((el) => el.classList.add('form-input-1'));

    // Labels → form-label
    document.querySelectorAll(
      '[wized="form-section-1"] label,' +
      '[wized="form-section-2"] label,' +
      '[wized="form-section-3"] label'
    ).forEach((el) => { if (!el.classList.contains('form-label')) el.classList.add('form-label'); });

    // Action rows → section-actions (identify by the save-draft button's parent)
    [
      q('[wized="save-draft-btn"]'),
      q('[wized="save-draft-2-btn"]'),
      q('[wized="back-section-3-btn"]'),
    ].forEach((btn) => {
      const parent = btn && btn.parentElement;
      if (parent && !parent.classList.contains('section-actions')) parent.classList.add('section-actions');
    });

    // Buttons → design-system classes
    const btnMap = {
      'save-draft-btn': 'btn-ghost-1',
      'save-draft-2-btn': 'btn-ghost-1',
      'save-draft-3-btn': 'btn-ghost-1',
      'next-section-1-btn': 'btn-primary-1-2',
      'next-section-2-btn': 'btn-primary-1-2',
      'back-section-2-btn': 'btn-ghost-1',
      'back-section-3-btn': 'btn-ghost-1',
      'submit-application-btn': 'btn-submit',
    };
    Object.keys(btnMap).forEach((wid) => {
      const el = q('[wized="' + wid + '"]');
      if (el) el.classList.add(btnMap[wid]);
    });

    // CV upload zone → design-system classes
    const zone = q('[wized="cv-upload-zone"]');
    if (zone) {
      zone.classList.add('upload-zone');
      const children = Array.from(zone.children);
      if (children[0]) children[0].classList.add('upload-icon');
      if (children[1]) children[1].classList.add('upload-label');
      if (children[2]) children[2].classList.add('upload-hint');
    }
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
    // Remove CV uses the same outlined danger style as the Withdraw button
    const removeBtn = q('[wized="cv-remove-btn"]');
    if (removeBtn) removeBtn.classList.add('btn-danger-1');
  }

  // Clones a template row. Sets clone.style.display = '' so the CSS cascade
  // (not a hardcoded value) controls the display — works for flex, grid, block.
  // Caller must populate and append to template.parentElement.
  function cloneRow(template) {
    const clone = template.cloneNode(true);
    clone.style.display = '';
    // Webflow marks template rows with a *-tpl CSS class (e.g. notif-item-tpl) that
    // carries display:none. Remove it from clones so they're visible.
    [...clone.classList].filter(c => c.endsWith('-tpl')).forEach(c => clone.classList.remove(c));
    return clone;
  }

  function formatDate(isoString) {
    if (!isoString) return '';
    return new Date(isoString).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  }

  function formatCurrency(cents) {
    return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  }

  // ─── PAGES ──────────────────────────────────────────────────────────────────

  async function initLogin() {
    const completedAuthReturn = await completeLoginAuthReturn();
    if (!completedAuthReturn) await requireGuest(); // redirect to /dashboard if already signed in

    if (!q('[wized="tab-signin"]') || !q('[wized="signin-submit"]') || !q('[wized="signup-submit"]')) {
      console.warn('ICIT login page is missing one or more required wized attributes.');
      revealPage();
      return;
    }

    const signinSection = q('[wized="signin-section"]');
    const signupSection = q('[wized="signup-section"]');
    if (!signinSection || !signupSection) {
      console.warn('ICIT login page is missing signin/signup section wized attributes.');
      revealPage();
      return;
    }

    // Default state: show sign-in form, hide sign-up form.
    // Must also toggle the Webflow CSS class since show/hide only manage inline styles.
    signinSection.classList.remove('auth-form-hidden');
    show(signinSection);
    signupSection.classList.add('auth-form-hidden');
    hide(signupSection);
    hide(q('[wized="signin-error-msg"]'));
    hide(q('[wized="signin-loading"]'));
    hide(q('[wized="signup-error-msg"]'));
    hide(q('[wized="signup-loading"]'));

    if (completedAuthReturn) {
      setText(q('[wized="signin-error-msg"]'), 'Email confirmed. Please sign in.');
      show(q('[wized="signin-error-msg"]'));
    }

    revealPage();

    q('[wized="tab-signin"]').addEventListener('click', (e) => {
      e.preventDefault();
      signinSection.classList.remove('auth-form-hidden');
      show(signinSection);
      signupSection.classList.add('auth-form-hidden');
      hide(signupSection);
      q('[wized="tab-signin"]').classList.add('auth-tab-active');
      q('[wized="tab-signup"]').classList.remove('auth-tab-active');
    });

    q('[wized="tab-signup"]').addEventListener('click', (e) => {
      e.preventDefault();
      signinSection.classList.add('auth-form-hidden');
      hide(signinSection);
      signupSection.classList.remove('auth-form-hidden');
      show(signupSection);
      q('[wized="tab-signin"]').classList.remove('auth-tab-active');
      q('[wized="tab-signup"]').classList.add('auth-tab-active');
    });

    q('[wized="signin-submit"]').addEventListener('click', async (e) => {
      e.preventDefault();
      hide(q('[wized="signin-error-msg"]'));
      show(q('[wized="signin-loading"]'));
      try {
        await signIn(
          q('[wized="signin-email"]').value.trim(),
          q('[wized="signin-password"]').value,
        );
        window.location.href = '/dashboard';
      } catch (err) {
        hide(q('[wized="signin-loading"]'));
        setText(q('[wized="signin-error-msg"]'), err.message || 'Invalid email or password.');
        show(q('[wized="signin-error-msg"]'));
      }
    });

    q('[wized="signup-submit"]').addEventListener('click', async (e) => {
      e.preventDefault();
      hide(q('[wized="signup-error-msg"]'));
      show(q('[wized="signup-loading"]'));
      try {
        const session = await signUp(
          q('[wized="signup-email"]').value.trim(),
          q('[wized="signup-password"]').value,
          q('[wized="signup-first-name"]').value.trim(),
          q('[wized="signup-last-name"]').value.trim(),
        );
        if (session) {
          window.location.href = '/dashboard';
        } else {
          // Supabase requires email confirmation before issuing a session
          hide(q('[wized="signup-loading"]'));
          setText(q('[wized="signup-error-msg"]'), 'Account created! Check your email to confirm your account, then sign in.');
          show(q('[wized="signup-error-msg"]'));
        }
      } catch (err) {
        hide(q('[wized="signup-loading"]'));
        setText(q('[wized="signup-error-msg"]'), err.message || 'Sign up failed. Please try again.');
        show(q('[wized="signup-error-msg"]'));
      }
    });
  }

  const STATUS_MESSAGES = {
    draft:                { msg: 'Complete and submit your application.',               href: '/apply' },
    submitted:            { msg: 'Your application is under review.',                  href: '/application-status' },
    in_review:            { msg: 'Your application is being reviewed by admissions.',  href: '/application-status' },
    accepted:             { msg: 'Congratulations! Please confirm your enrollment.',   href: '/enrollment-confirmation' },
    waitlisted:           { msg: "You're on the waitlist. We'll notify you of any change.", href: '/application-status' },
    rejected:             { msg: 'We appreciate your interest in ICIT.',               href: '/application-status' },
    enrolled:             { msg: 'Welcome to ICIT! Check your email for platform access.', href: '/application-status' },
    withdrawn:            { msg: 'Your application has been withdrawn.',               href: '/application-status' },
  };

  async function initDashboard() {
    const session = await requireAuth();

    const application = await loadApplication(session);
    const notifications = await loadNotifications(session).catch((err) => {
      console.warn('ICIT notifications failed to load:', err);
      return [];
    });

    hide(q('[wized="dash-loading"]'));

    // User name
    const meta = session.user.user_metadata || {};
    setText(q('[wized="dash-user-name"]'), ((meta.first_name || '') + ' ' + (meta.last_name || '')).trim());

    // Sign out
    const signoutEl = q('[wized="dash-signout"]');
    if (signoutEl) signoutEl.addEventListener('click', async (e) => {
      e.preventDefault();
      await signOut();
      window.location.href = '/login';
    });

    if (!application) {
      // New user — no application yet
      show(q('[wized="dash-no-application"]'));
      hide(q('[wized="dash-application"]'));
      show(q('[wized="start-application-link"]'));
      hide(q('[wized="withdraw-btn"]'));
      if (!q('[wized="dash-no-application"]') && !q('[wized="start-application-link"]')) {
        ensureFallback('icit-dashboard-fallback', `
          <main style="max-width: 860px; margin: 48px auto; padding: 0 24px; font-family: inherit;">
            <h1 style="margin: 0 0 12px; color: #111827;">Application Dashboard</h1>
            <p style="margin: 0 0 24px; color: #374151;">No application is saved yet.</p>
            <a href="/apply" style="display: inline-block; background: #2563eb; color: white; padding: 12px 16px; border-radius: 6px; text-decoration: none;">Start application</a>
          </main>
        `);
      }
      revealPage();
    } else {
      // Existing application
      hide(q('[wized="dash-no-application"]'));
      show(q('[wized="dash-application"]'));
      hide(q('[wized="start-application-link"]'));
      const programName = application.programs?.name || 'Selected program';
      setText(q('[wized="app-program-name"]'), programName);

      const info = STATUS_MESSAGES[application.status] || { msg: '', href: '/application-status' };
      setText(q('[wized="app-next-action-msg"]'), info.msg);
      setHref(q('[wized="app-next-action-link"]'), info.href);
      setText(q('[wized="app-submitted-date"]'), application.submitted_at ? formatDate(application.submitted_at) : '—');
      setText(q('[wized="app-updated-date"]'), application.updated_at ? formatDate(application.updated_at) : '—');
      show(q('[wized="view-status-link"]'));

      if (WITHDRAW_ALLOWED.includes(application.status)) {
        show(q('[wized="withdraw-btn"]'));
        q('[wized="withdraw-btn"]').addEventListener('click', async (e) => {
          e.preventDefault();
          if (!confirm('Withdraw your application? This cannot be undone.')) return;
          try {
            await withdrawApplication(session, application.id, application.status);
            location.reload();
          } catch (err) {
            console.error('Withdraw error:', err);
          }
        });
      } else {
        hide(q('[wized="withdraw-btn"]'));
      }

      if (!q('[wized="dash-application"]') && !q('[wized="app-program-name"]')) {
        ensureFallback('icit-dashboard-fallback', `
          <main style="max-width: 860px; margin: 48px auto; padding: 0 24px; font-family: inherit;">
            <h1 style="margin: 0 0 12px; color: #111827;">Application Dashboard</h1>
            <p style="margin: 0 0 8px; color: #374151;"><strong>Program:</strong> ${escapeHtml(programName)}</p>
            <p style="margin: 0 0 24px; color: #374151;"><strong>Status:</strong> ${escapeHtml(application.status.replace(/_/g, ' '))}</p>
            <a href="${escapeHtml(info.href)}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 16px; border-radius: 6px; text-decoration: none;">Continue</a>
          </main>
        `);
      }

      // Payment success: poll for enrolled status after Stripe redirects back
      const params = new URLSearchParams(window.location.search);
      if (params.get('payment') === 'success' && application.status === 'accepted') {
        const banner = document.createElement('p');
        banner.id = 'payment-banner';
        banner.textContent = 'Processing your enrollment…';
        document.body.prepend(banner);
        let elapsed = 0;
        const poll = setInterval(async () => {
          elapsed += 3;
          try {
            const fresh = await loadApplication(session);
            if (fresh && fresh.status === 'enrolled') {
              clearInterval(poll);
              location.reload();
            } else if (elapsed >= 30) {
              clearInterval(poll);
              history.replaceState({}, '', '/dashboard');
              banner.textContent = 'Payment received — your enrollment typically confirms within a few minutes.';
            }
          } catch (err) {
            clearInterval(poll);
          }
        }, 3000);
      }

      revealPage();
    }

    // Notification drawer
    const unread = notifications.filter((n) => !n.read).length;
    setText(q('[wized="notif-unread-count"]'), unread > 0 ? String(unread) : '');

    const drawer = q('[wized="notif-drawer"]');
    const notifTemplate = q('[wized="notif-item-msg"]')?.parentElement;

    const notifBellEl = q('[wized="notif-bell"]');
    if (notifBellEl) notifBellEl.addEventListener('click', async (e) => {
      e.preventDefault();
      if (!drawer) {
        const fallback = ensureFallback('icit-notification-fallback', `
          <aside style="position: fixed; top: 72px; right: 24px; width: min(360px, calc(100vw - 48px)); background: white; border: 1px solid #e5e7eb; border-radius: 8px; box-shadow: 0 16px 40px rgba(15,23,42,.18); padding: 16px; z-index: 9999;">
            <button type="button" data-icit-close style="float: right; border: 0; background: transparent; font-size: 20px; cursor: pointer;">x</button>
            <h2 style="margin: 0 0 12px; font-size: 18px; color: #111827;">Notifications</h2>
            <div data-icit-notifications></div>
          </aside>
        `);
        const list = fallback.querySelector('[data-icit-notifications]');
        list.innerHTML = notifications.length
          ? notifications.map((notif) => `<p style="margin: 0 0 12px; color: #374151;">${escapeHtml(notif.message)}</p>`).join('')
          : '<p style="margin: 0; color: #6b7280;">No notifications yet.</p>';
        fallback.querySelector('[data-icit-close]').onclick = () => fallback.remove();
      } else {
        show(drawer);
      }
      await markNotificationsRead(session).catch(() => {});
      setText(q('[wized="notif-unread-count"]'), '');

      if (!notifTemplate) return;
      // Remove previously cloned rows to avoid duplicates on re-open
      notifTemplate.parentElement.querySelectorAll('[data-icit-clone]').forEach((el) => el.remove());
      hide(notifTemplate);

      if (notifications.length === 0) {
        show(q('[wized="notif-empty"]'));
      } else {
        hide(q('[wized="notif-empty"]'));
        notifications.forEach((notif) => {
          const row = cloneRow(notifTemplate);
          row.dataset.icitClone = '1';
          setText(row.querySelector('[wized="notif-item-msg"]'), notif.message);
          setText(row.querySelector('[wized="notif-item-time"]'), formatDate(notif.created_at));
          notifTemplate.parentElement.appendChild(row);
        });
      }
    });

    const notifCloseEl = q('[wized="notif-drawer-close"]');
    if (notifCloseEl) notifCloseEl.addEventListener('click', (e) => {
      e.preventDefault();
      hide(drawer);
    });
  }

  async function initApply() {
    const session = await requireAuth();

    const [programs, draft] = await Promise.all([
      loadPrograms(),
      loadApplication(session),
    ]);

    // If a non-draft application exists, redirect to dashboard
    if (draft && draft.status !== 'draft') {
      window.location.href = '/dashboard';
      return;
    }

    revealPage();
    applyDesignSystemClasses();

    let applicationId = draft ? draft.id : null;
    let cvUploaded = !!(draft && draft.cv_url);
    let currentSection = 1;
    let programAnswers = {};

    // Section stepper
    function goToSection(n) {
      ['form-section-1', 'form-section-2', 'form-section-3'].forEach((wid) => {
        hide(q('[wized="' + wid + '"]'));
      });
      show(q('[wized="form-section-' + n + '"]'));
      currentSection = n;
      updateApplyStepper(n);
    }
    goToSection(1);

    // Inject a back-to-dashboard link at the top of section 1
    const sec1 = q('[wized="form-section-1"]');
    if (sec1 && !sec1.querySelector('[data-icit-back]')) {
      const back = document.createElement('a');
      back.href = '/dashboard';
      back.dataset.icitBack = '1';
      back.textContent = '← Back to Dashboard';
      back.className = 'btn-secondary-1-2';
      back.style.cssText = 'display:inline-block;margin-bottom:20px;';
      sec1.insertBefore(back, sec1.firstChild);
    }

    // Populate program select
    const programSelect = q('[wized="program-select"]');
    if (programSelect) {
      if (programSelect.options && programSelect.options.length === 0) {
        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = 'Select a program';
        programSelect.appendChild(placeholder);
      }
      programs.forEach((prog) => {
        const opt = document.createElement('option');
        opt.value = prog.id;
        opt.textContent = prog.name;
        programSelect.appendChild(opt);
      });
    }

    if (programs.length === 0) {
      hide(q('[wized="questions-loading"]'));
      show(q('[wized="questions-empty"]'));
      setText(q('[wized="form-error-msg"]'), 'No active programs are available yet. Add a program in Supabase to continue testing.');
      show(q('[wized="form-error-msg"]'));
    }

    // Pre-fill from draft
    if (draft) {
      applicationId = draft.id;
      cvUploaded = !!draft.cv_url;

      if (programSelect && draft.program_id) programSelect.value = draft.program_id;
      if (programSelect && draft.locked_fields?.program) {
        programSelect.disabled = true;
        show(q('[wized="program-locked"]'));
      }

      const meta = session.user.user_metadata || {};
      if (q('[wized="applicant-first-name"]')) q('[wized="applicant-first-name"]').value = meta.first_name || '';
      if (q('[wized="applicant-last-name"]')) q('[wized="applicant-last-name"]').value = meta.last_name || '';
      if (q('[wized="applicant-email"]')) q('[wized="applicant-email"]').value = session.user.email || '';

      if (draft.locked_fields?.first_name) {
        if (q('[wized="applicant-first-name"]')) q('[wized="applicant-first-name"]').disabled = true;
        if (q('[wized="applicant-last-name"]')) q('[wized="applicant-last-name"]').disabled = true;
        show(q('[wized="first-name-locked"]'));
        show(q('[wized="last-name-locked"]'));
      }
    }
    // Email is always read-only
    if (q('[wized="applicant-email"]')) {
      q('[wized="applicant-email"]').value = session.user.email || '';
      q('[wized="applicant-email"]').disabled = true;
    }

    function syncCvUi() {
      if (cvUploaded) {
        hide(q('[wized="cv-upload-zone"]'));
        show(q('[wized="cv-upload-success"]'));
        show(q('[wized="cv-remove-btn"]'));
        setText(q('[wized="cv-filename"]'), filenameFromPath(draft?.cv_url) || 'CV uploaded');
        setCvProgress(100);
      } else {
        show(q('[wized="cv-upload-zone"]'));
        hide(q('[wized="cv-upload-success"]'));
        hide(q('[wized="cv-remove-btn"]'));
        setText(q('[wized="cv-filename"]'), '');
        setCvProgress(0);
      }
    }
    syncCvUi();

    // Render program questions for a given program
    function renderQuestions(programId, existingAnswers) {
      programAnswers = Object.assign({}, existingAnswers || {});  // clear stale answers from previous program selection
      const prog = programs.find((p) => p.id === programId);
      const questions = normalizeQuestions(prog && prog.program_questions);
      const template = q('[wized="question-item"]');

      clearGeneratedQuestions();
      if (template) {
        template.parentElement.querySelectorAll('[data-icit-clone]').forEach((el) => el.remove());
        hide(template);
      }

      if (questions.length === 0) {
        show(q('[wized="questions-empty"]'));
        hide(q('[wized="questions-loading"]'));
        return;
      }

      hide(q('[wized="questions-empty"]'));
      hide(q('[wized="questions-loading"]'));
      const host = questionHost(template);
      questions.forEach((question) => {
        let row;
        let control;
        if (template) {
          row = cloneRow(template);
          row.dataset.icitClone = '1';
          const label = row.querySelector('label') || row.querySelector('[data-question-label]');
          if (label) label.textContent = question.label;
          const input = row.querySelector('input, select, textarea');
          if (input) {
            control = input;
            if (question.type === 'select' && input.tagName !== 'SELECT') {
              control = document.createElement('select');
              control.className = input.className;
              input.replaceWith(control);
            } else if (question.type === 'textarea' && input.tagName !== 'TEXTAREA') {
              control = document.createElement('textarea');
              control.className = input.className;
              control.placeholder = input.placeholder || '';
              input.replaceWith(control);
            } else if (question.type && question.type !== 'select' && input.tagName === 'INPUT') {
              input.type = question.type === 'email' ? 'email' : 'text';
            }
          }
        } else {
          const generated = createGeneratedQuestion(question, programAnswers[question.id]);
          row = generated.row;
          control = generated.control;
        }

        if (control) {
          control.name = question.id;
          control.dataset.questionId = question.id;
          if (question.type === 'select' && question.options && template) {
            control.innerHTML = '';
            const placeholder = document.createElement('option');
            placeholder.value = '';
            placeholder.textContent = 'Select an option';
            control.appendChild(placeholder);
            question.options.forEach((opt) => {
              const el = document.createElement('option');
              el.value = opt;
              el.textContent = opt;
              control.appendChild(el);
            });
          }
          control.value = programAnswers[question.id] || '';
          control.addEventListener('change', (e) => { programAnswers[question.id] = e.target.value; });
          control.addEventListener('input', (e) => { programAnswers[question.id] = e.target.value; });
        }
        host.appendChild(row);
      });
    }

    // Initial question render from draft's program
    if (draft && draft.program_id) {
      renderQuestions(draft.program_id, draft.program_answers);
      // Pre-populate saved answers into cloned inputs
      if (draft.program_answers && typeof draft.program_answers === 'object') {
        programAnswers = Object.assign({}, draft.program_answers);
        Object.entries(draft.program_answers).forEach(([id, val]) => {
          const input = q('[data-question-id="' + id + '"]');
          if (input) input.value = val;
        });
      }
    }

    if (programSelect) {
      programSelect.addEventListener('change', () => { renderQuestions(programSelect.value); });
      if (!draft && programSelect.value) renderQuestions(programSelect.value);
    }

    // Collect current form fields for saveDraft
    function collectFields() {
      return {
        id: applicationId,
        programId: programSelect ? programSelect.value : '',
        firstName: (q('[wized="applicant-first-name"]') || {}).value || '',
        lastName: (q('[wized="applicant-last-name"]') || {}).value || '',
        programAnswers: Object.keys(programAnswers).length ? programAnswers : undefined,
      };
    }

    async function doSaveDraft() {
      const fields = collectFields();
      if (!fields.programId) {
        throw new Error('Please select a program before saving your draft.');
      }
      const saved = await saveDraft(session, fields);
      applicationId = saved.id;
      const indicator = q('[wized="form-draft-status"]');
      show(indicator);
      setTimeout(() => hide(indicator), 3000);
      return saved;
    }

    // Section 1 buttons
    const saveDraftBtn = q('[wized="save-draft-btn"]');
    if (saveDraftBtn) saveDraftBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      try { await doSaveDraft(); } catch (err) {
        console.error(err);
        setText(q('[wized="form-error-msg"]'), err.message || 'Failed to save draft. Please try again.');
        show(q('[wized="form-error-msg"]'));
      }
    });

    const nextSection1Btn = q('[wized="next-section-1-btn"]');
    if (nextSection1Btn) nextSection1Btn.addEventListener('click', async (e) => {
      e.preventDefault();
      try { await doSaveDraft(); goToSection(2); } catch (err) {
        console.error(err);
        setText(q('[wized="form-error-msg"]'), err.message || 'Please complete this section before continuing.');
        show(q('[wized="form-error-msg"]'));
      }
    });

    // Section 2 buttons
    const saveDraft2Btn = q('[wized="save-draft-2-btn"]');
    if (saveDraft2Btn) saveDraft2Btn.addEventListener('click', async (e) => {
      e.preventDefault();
      try { await doSaveDraft(); } catch (err) {
        console.error(err);
        setText(q('[wized="form-error-msg"]'), err.message || 'Failed to save draft. Please try again.');
        show(q('[wized="form-error-msg"]'));
      }
    });

    const backSection2Btn = q('[wized="back-section-2-btn"]');
    if (backSection2Btn) backSection2Btn.addEventListener('click', (e) => {
      e.preventDefault();
      goToSection(1);
    });

    const nextSection2Btn = q('[wized="next-section-2-btn"]');
    if (nextSection2Btn) nextSection2Btn.addEventListener('click', async (e) => {
      e.preventDefault();
      try { await doSaveDraft(); goToSection(3); } catch (err) {
        console.error(err);
        setText(q('[wized="form-error-msg"]'), err.message || 'Please complete this section before continuing.');
        show(q('[wized="form-error-msg"]'));
      }
    });

    // Section 3 — CV
    const cvFileInput = q('[wized="cv-file-input"]');
    if (cvFileInput) cvFileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (!applicationId) {
        setText(q('[wized="form-error-msg"]'), 'Please save your draft before uploading a CV.');
        show(q('[wized="form-error-msg"]'));
        return;
      }
      try {
        setCvProgress(0);
        await uploadCV(session, applicationId, file);
        cvUploaded = true;
        hide(q('[wized="cv-upload-zone"]'));
        show(q('[wized="cv-upload-success"]'));
        show(q('[wized="cv-remove-btn"]'));
        const display = q('[wized="cv-filename"]');
        if (display) setText(display, file.name);
        setCvProgress(100);
      } catch (err) { console.error('CV upload failed:', err); }
    });

    const cvRemoveBtn = q('[wized="cv-remove-btn"]');
    if (cvRemoveBtn) cvRemoveBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      if (!applicationId) return;
      try {
        await removeCV(session, applicationId);
        cvUploaded = false;
        show(q('[wized="cv-upload-zone"]'));
        hide(q('[wized="cv-upload-success"]'));
        hide(q('[wized="cv-remove-btn"]'));
        if (q('[wized="cv-file-input"]')) q('[wized="cv-file-input"]').value = '';
        const display = q('[wized="cv-filename"]');
        if (display) setText(display, '');
        setCvProgress(0);
      } catch (err) { console.error(err); }
    });

    const saveDraft3Btn = q('[wized="save-draft-3-btn"]');
    if (saveDraft3Btn) saveDraft3Btn.addEventListener('click', async (e) => {
      e.preventDefault();
      try { await doSaveDraft(); } catch (err) {
        console.error(err);
        setText(q('[wized="form-error-msg"]'), err.message || 'Failed to save draft. Please try again.');
        show(q('[wized="form-error-msg"]'));
      }
    });

    const backSection3Btn = q('[wized="back-section-3-btn"]');
    if (backSection3Btn) backSection3Btn.addEventListener('click', (e) => {
      e.preventDefault();
      goToSection(2);
    });

    const submitAppBtn = q('[wized="submit-application-btn"]');
    if (submitAppBtn) submitAppBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      if (!cvUploaded) {
        alert('Please upload your CV before submitting.');
        return;
      }
      try {
        await doSaveDraft();
        await submitApplication(session, applicationId);
        window.location.href = '/dashboard';
      } catch (err) {
        console.error('Submit failed:', err);
        setText(q('[wized="form-error-msg"]'), err.message || 'Submission failed. Please try again.');
        show(q('[wized="form-error-msg"]'));
      }
    });
  }

  const STATUS_TIMELINE = {
    draft: 0,
    submitted: 1,
    in_review: 2,
    more_info_requested: 2, // sits within the review phase
    accepted: 3,
    rejected: 3,
    waitlisted: 3,
    enrolled: 4,
    withdrawn: -1,
  };
  const TIMELINE_STEPS = [
    'tl-draft',
    'tl-submitted',
    'tl-review',
    'tl-decision',
    'tl-enrolled',
  ];

  async function initStatus() {
    const session = await requireAuth();

    const application = await loadApplication(session);
    if (!application) {
      window.location.href = '/dashboard';
      return;
    }

    const events = await loadApplicationHistory(session, application.id);
    revealPage();
    hide(q('[wized="status-loading"]'));
    show(q('[wized="status-content"]'));

    // Inject a back link at the top of the content if one isn't already there
    const statusContent = q('[wized="status-content"]');
    if (statusContent && !statusContent.querySelector('[data-icit-back]')) {
      const back = document.createElement('a');
      back.href = '/dashboard';
      back.dataset.icitBack = '1';
      back.textContent = '← Back to Dashboard';
      back.className = 'btn-secondary-1-2';
      back.style.cssText = 'display:inline-block;margin-bottom:20px;';
      statusContent.insertBefore(back, statusContent.firstChild);
    }

    setText(q('[wized="status-program-name"]'), application.programs?.name || '');
    setText(q('[wized="status-submitted-date"]'), formatDate(application.submitted_at));
    setText(q('[wized="status-badge"]'), application.status.replace(/_/g, ' '));

    const stepIndex = STATUS_TIMELINE[application.status] ?? -1;
    TIMELINE_STEPS.forEach((wid, i) => {
      const el = q('[wized="' + wid + '"]');
      if (!el) return;
      if (i <= stepIndex) {
        el.classList.add('timeline-step-done');
      } else {
        el.classList.remove('timeline-step-done');
      }
    });

    const eventTemplate = q('[wized="event-type-label"]')?.parentElement;
    if (eventTemplate) {
      eventTemplate.parentElement.querySelectorAll('[data-icit-clone]').forEach((el) => el.remove());
      hide(eventTemplate);
      if (events.length === 0) {
        show(q('[wized="events-empty"]'));
      } else {
        hide(q('[wized="events-empty"]'));
        events.forEach((ev) => {
          const row = cloneRow(eventTemplate);
          row.dataset.icitClone = '1';
          setText(row.querySelector('[wized="event-type-label"]'), ev.event_type.replace(/_/g, ' '));
          setText(row.querySelector('[wized="event-time"]'), formatDate(ev.created_at));
          eventTemplate.parentElement.appendChild(row);
        });
      }
    }

    const latestEventType = events[0]?.event_type;
    if (latestEventType === 'more_info_requested') {
      setText(q('[wized="admin-notes-msg"]'), application.admin_notes || '');
      show(q('[wized="admin-notes-panel"]') || q('[wized="admin-notes-msg"]'));

      if (!application.notes_response) {
        const notesInput = q('[wized="notes-response-input"]');
        const notesBtn = q('[wized="submit-notes-response-btn"]');
        show(notesInput);
        show(notesBtn);
        hide(q('[wized="notes-submitted-confirm"]'));
        if (notesBtn && notesInput) {
          notesBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const response = notesInput.value.trim();
            if (!response) return;
            try {
              await submitNotesResponse(session, application.id, response);
              location.reload();
            } catch (err) { console.error(err); }
          });
        }
      } else {
        hide(q('[wized="notes-response-input"]'));
        hide(q('[wized="submit-notes-response-btn"]'));
        show(q('[wized="notes-submitted-confirm"]'));
      }
    } else {
      hide(q('[wized="admin-notes-panel"]') || q('[wized="admin-notes-msg"]'));
      hide(q('[wized="notes-response-input"]'));
      hide(q('[wized="submit-notes-response-btn"]'));
      hide(q('[wized="notes-submitted-confirm"]'));
    }

    const withdrawBtn = q('[wized="status-withdraw-btn"]');
    if (WITHDRAW_ALLOWED.includes(application.status)) {
      show(withdrawBtn);
      if (withdrawBtn) {
        withdrawBtn.addEventListener('click', async (e) => {
          e.preventDefault();
          if (!confirm('Withdraw your application? This cannot be undone.')) return;
          try {
            await withdrawApplication(session, application.id, application.status);
            location.reload();
          } catch (err) { console.error('Withdraw error:', err); }
        });
      }
    } else {
      hide(withdrawBtn);
    }

    if (application.status === 'draft') {
      show(q('[wized="edit-draft-link"]'));
    } else {
      hide(q('[wized="edit-draft-link"]'));
    }
  }

  async function initEnrollment() {
    const session = await requireAuth();

    const application = await loadApplication(session);

    // Redirect if no application or wrong status
    if (!application || application.status !== 'accepted') {
      window.location.href = '/dashboard';
      return;
    }

    revealPage();
    hide(q('[wized="enroll-loading"]'));

    setText(q('[wized="enroll-program-name"]'), application.programs?.name || '');
    setText(q('[wized="enroll-tuition"]'), formatCurrency(application.programs?.price_cents ?? 0));
    setText(
      q('[wized="enroll-status-badge"]'),
      'Accepted',
    );

    hide(q('[wized="enroll-error-msg"]'));
    hide(q('[wized="enroll-processing"]'));

    const confirmBtn = q('[wized="confirm-enrollment-btn"]');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        show(q('[wized="enroll-processing"]'));
        hide(q('[wized="enroll-error-msg"]'));
        try {
          const result = await createCheckout(session, application.id);
          window.location.href = result.url;
        } catch (err) {
          hide(q('[wized="enroll-processing"]'));
          setText(q('[wized="enroll-error-msg"]'), err.message || 'Could not start checkout. Please try again.');
          show(q('[wized="enroll-error-msg"]'));
        }
      });
    }
  }

  // ─── DISPATCHER ─────────────────────────────────────────────────────────────
  const path = window.location.pathname;
  if (path === '/login')                       initPage('login', initLogin);
  else if (path === '/dashboard')              initPage('dashboard', initDashboard);
  else if (path === '/apply')                  initPage('apply', initApply);
  else if (path === '/application-status')     initPage('application-status', initStatus);
  else if (path === '/enrollment-confirmation') initPage('enrollment-confirmation', initEnrollment);
})();
