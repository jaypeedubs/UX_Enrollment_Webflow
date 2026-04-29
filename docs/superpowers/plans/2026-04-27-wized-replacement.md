# ICIT Wized Replacement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Wized with `src/icit-app.js` — a single vanilla JS IIFE that connects all five Webflow pages to Supabase directly using the Supabase JS SDK.

**Architecture:** One IIFE file with four sections (Core, API, UI helpers, Page modules). Loaded via Webflow Custom Code site-wide head after the Supabase CDN script. Uses existing `wized="..."` DOM attributes as selectors. One Webflow Designer session adds the remaining 19 attributes + 1 textarea + 3 inline styles + auth-flash wrappers before deployment.

**Tech Stack:** Vanilla JS (ES2020), Supabase JS SDK v2 UMD (CDN), Webflow Custom Code.

**Spec:** `docs/superpowers/specs/2026-04-27-wized-replacement-design.md`
**Branch:** `feat/wized-replacement`
**Site:** `https://jareds-spectacular-site-818130.webflow.io`
**Supabase project:** `xvweanlqcbgbiyxqhwux`

---

## Scope note — two prerequisites not in spec table

The spec's DOM Loop Pattern section references `[wized="notif-drawer"]` (dashboard notification drawer container) and `[wized="question-item"]` (apply page question template row) but they were not included in the prerequisites table. Both are needed before testing. They are included in Task 0 below.

---

## File structure

| File | Role |
|---|---|
| `src/icit-app.js` | The entire application — IIFE with Core, API, UI, Pages sections |

No other files are created. All logic lives in this one file.

---

## Task 0 — Webflow Designer session (manual, no code)

This must be done before deployment (Task 12). It does not block writing `src/icit-app.js` (Tasks 1–11).

Open Webflow Designer for site `68dc2a0de878bb5efd6f45cb`. For each item below: select the element, open Element Settings panel, add the custom attribute `wized` with the value shown.

**Page: /login**
- [ ] Select the sign-in form section container → add `wized` = `signin-section`
- [ ] Select the sign-up form section container → add `wized` = `signup-section`

**Page: /dashboard**
- [ ] Select the `<span class="dash-user-name">` inside the `.dash-user` div → add `wized` = `dash-user-name`
- [ ] Select the `<a class="dash-signout">` inside the `.dash-user` div → add `wized` = `dash-signout`
- [ ] Select the notification drawer section container → add `wized` = `notif-drawer`
- [ ] Select the notification template row element (the row that contains notif-item-msg and notif-item-time) → in Element Settings → Style → set `display: none` as an **inline style** (not a class)

**Page: /application-status**
- [ ] Select the `<span data-w-id="...a359">` inside `<div class="status-hero-sub">` → add `wized` = `status-submitted-date`
- [ ] In the more-info section (near admin-notes-msg): add a new `<textarea>` element → add `wized` = `notes-response-input`; set placeholder = `Your response to the admissions team…`
- [ ] Select the Draft timeline step container → add `wized` = `timeline-step-draft`
- [ ] Select the Submitted timeline step container → add `wized` = `timeline-step-submitted`
- [ ] Select the In Review timeline step container → add `wized` = `timeline-step-in-review`
- [ ] Select the Decision timeline step container → add `wized` = `timeline-step-decision`
- [ ] Select the Enrolled timeline step container → add `wized` = `timeline-step-enrolled`
- [ ] Select the event-history template row → set `display: none` as inline style

**Page: /enrollment-confirmation**
- [ ] Select the program name value `<span class="enroll-summary-val">` (row 1) → add `wized` = `enroll-program-name`
- [ ] Select the tuition value `<span class="enroll-price">` (row 2) → add `wized` = `enroll-tuition`
- [ ] Select the status badge `<span class="enroll-status-badge">` (row 3) → add `wized` = `enroll-status-badge`

**Page: /apply**
- [ ] Select the Section 1 wrapper div → add `wized` = `apply-section-1`
- [ ] Select the Section 2 wrapper div → add `wized` = `apply-section-2`
- [ ] Select the Section 3 wrapper div → add `wized` = `apply-section-3`
- [ ] Select the question template row → add `wized` = `question-item`; set `display: none` as inline style

**Auth-flash wrappers — page-level Custom Code (Before `</head>`):**

For each protected page (/dashboard, /apply, /application-status, /enrollment-confirmation):
- [ ] Open Page Settings → Custom Code → Before `</head>`
- [ ] Paste: `<style>#icit-page-wrapper{visibility:hidden}</style>`
- [ ] In the page's body, wrap all content in `<div id="icit-page-wrapper">...</div>`

- [ ] Publish the site after all changes are complete

---

## Task 1 — Create `src/icit-app.js`: IIFE shell + Core section

**Files:**
- Create: `src/icit-app.js`

Read `SUPABASE_ANON_KEY` from `.env` (the value after `SUPABASE_ANON_KEY=`). It is safe to embed in client-side code — RLS enforces data isolation.

- [ ] **Step 1: Create `src/icit-app.js` with the full IIFE shell and Core section**

```javascript
(function () {
  'use strict';

  // ─── CONSTANTS ──────────────────────────────────────────────────────────────
  const SUPABASE_URL = 'https://xvweanlqcbgbiyxqhwux.supabase.co';
  const SUPABASE_ANON_KEY = 'PASTE_ANON_KEY_FROM_ENV_HERE';
  const EDGE_FN_BASE = SUPABASE_URL + '/functions/v1';
  const WITHDRAW_ALLOWED = ['draft', 'submitted', 'in_review', 'waitlisted', 'accepted'];

  // ─── CORE ───────────────────────────────────────────────────────────────────
  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Redirect to /login whenever the Supabase session is explicitly ended.
  // INITIAL_SESSION events are ignored — only SIGNED_OUT fires the redirect.
  supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') window.location.href = '/login';
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

  // Redirects to /dashboard if a session exists. Resolves (void) for guests.
  async function requireGuest() {
    const session = await getSession();
    if (session) window.location.href = '/dashboard';
  }

  // ─── API placeholder — filled in Tasks 2–4 ──────────────────────────────────

  // ─── UI placeholder — filled in Task 5 ─────────────────────────────────────

  // ─── PAGES placeholder — filled in Tasks 6–10 ───────────────────────────────

  // ─── DISPATCHER ─────────────────────────────────────────────────────────────
  // (will be populated in Task 11 — leave blank for now)

})();
```

- [ ] **Step 2: Commit**

```bash
git add src/icit-app.js
git commit -m "feat: scaffold icit-app.js IIFE + Core auth helpers"
```

---

## Task 2 — API section: auth operations

**Files:**
- Modify: `src/icit-app.js` — replace `// ─── API placeholder` comment with the auth functions below

- [ ] **Step 1: Replace the API placeholder with auth functions**

```javascript
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
      options: { data: { first_name: firstName, last_name: lastName } },
    });
    if (error) throw error;
    return data.session;
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }
```

- [ ] **Step 2: Commit**

```bash
git add src/icit-app.js
git commit -m "feat: add API auth functions (signIn, signUp, signOut)"
```

---

## Task 3 — API section: data reads

**Files:**
- Modify: `src/icit-app.js` — append after `signOut()` inside the API section

- [ ] **Step 1: Add the five read functions after `signOut()`**

```javascript
  // loadApplication returns null (not an error) when the user has no application yet.
  // Uses .maybeSingle() so Supabase returns null instead of an error on zero rows.
  async function loadApplication(session) {
    const { data, error } = await supabase
      .from('applications')
      .select(`
        id, status, submitted_at, updated_at,
        cv_url, admin_notes, notes_response, locked_fields,
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
      .eq('status', 'active');
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
```

- [ ] **Step 2: Commit**

```bash
git add src/icit-app.js
git commit -m "feat: add API read functions (loadApplication, notifications, programs, history)"
```

---

## Task 4 — API section: data writes

**Files:**
- Modify: `src/icit-app.js` — append after `loadApplicationHistory()` inside the API section

- [ ] **Step 1: Add the seven write functions**

```javascript
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
      .eq('id', applicationId);
    if (error) throw error;
  }

  // Guards against double-submission with .eq('status', 'draft').
  async function submitApplication(session, applicationId) {
    const { error: upErr } = await supabase
      .from('applications')
      .update({
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        locked_fields: { all: true },
      })
      .eq('id', applicationId)
      .eq('status', 'draft');
    if (upErr) throw upErr;

    const { error: evErr } = await supabase
      .from('application_events')
      .insert({ application_id: applicationId, event_type: 'submitted' });
    if (evErr) throw evErr;
  }

  async function submitNotesResponse(session, applicationId, response) {
    const { error } = await supabase
      .from('applications')
      .update({ notes_response: response })
      .eq('id', applicationId);
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
    const json = await resp.json();
    if (!resp.ok) throw new Error(json.error || 'Checkout failed');
    return json;
  }
```

- [ ] **Step 2: Commit**

```bash
git add src/icit-app.js
git commit -m "feat: add API write functions (withdraw, saveDraft, uploadCV, submit, checkout)"
```

---

## Task 5 — UI helpers

**Files:**
- Modify: `src/icit-app.js` — replace `// ─── UI placeholder` with the helpers below

- [ ] **Step 1: Replace the UI placeholder**

```javascript
  // ─── UI ─────────────────────────────────────────────────────────────────────

  function q(sel) { return document.querySelector(sel); }
  function show(el) { if (el) el.style.display = ''; }
  function hide(el) { if (el) el.style.display = 'none'; }
  function setText(el, val) { if (el) el.textContent = val; }
  function setHref(el, val) { if (el) el.href = val; }

  function revealPage() {
    const w = document.getElementById('icit-page-wrapper');
    if (w) w.style.visibility = 'visible';
  }

  // Clones a template row. Sets clone.style.display = '' so the CSS cascade
  // (not a hardcoded value) controls the display — works for flex, grid, block.
  // Caller must populate and append to template.parentElement.
  function cloneRow(template) {
    const clone = template.cloneNode(true);
    clone.style.display = '';
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
```

- [ ] **Step 2: Commit**

```bash
git add src/icit-app.js
git commit -m "feat: add UI helper functions (q, show, hide, setText, cloneRow, formatters)"
```

---

## Task 6 — Page module: `initLogin()`

**Files:**
- Modify: `src/icit-app.js` — replace `// ─── PAGES placeholder` with the PAGES section header and `initLogin()`

- [ ] **Step 1: Replace the PAGES placeholder**

```javascript
  // ─── PAGES ──────────────────────────────────────────────────────────────────

  async function initLogin() {
    await requireGuest(); // redirect to /dashboard if already signed in

    const signinSection = q('[wized="signin-section"]');
    const signupSection = q('[wized="signup-section"]');

    // Default state: show sign-in form, hide sign-up form
    show(signinSection);
    hide(signupSection);
    hide(q('[wized="signin-error-msg"]'));
    hide(q('[wized="signin-loading"]'));
    hide(q('[wized="signup-error-msg"]'));
    hide(q('[wized="signup-loading"]'));

    q('[wized="tab-signin"]').addEventListener('click', (e) => {
      e.preventDefault();
      show(signinSection);
      hide(signupSection);
    });

    q('[wized="tab-signup"]').addEventListener('click', (e) => {
      e.preventDefault();
      hide(signinSection);
      show(signupSection);
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
        await signUp(
          q('[wized="signup-email"]').value.trim(),
          q('[wized="signup-password"]').value,
          q('[wized="signup-first-name"]').value.trim(),
          q('[wized="signup-last-name"]').value.trim(),
        );
        window.location.href = '/dashboard';
      } catch (err) {
        hide(q('[wized="signup-loading"]'));
        setText(q('[wized="signup-error-msg"]'), err.message || 'Sign up failed. Please try again.');
        show(q('[wized="signup-error-msg"]'));
      }
    });
  }
```

- [ ] **Step 2: Commit**

```bash
git add src/icit-app.js
git commit -m "feat: add initLogin() — tab toggle, signIn, signUp"
```

---

## Task 7 — Page module: `initDashboard()`

**Files:**
- Modify: `src/icit-app.js` — append after `initLogin()` inside the PAGES section

- [ ] **Step 1: Add `STATUS_MESSAGES` and `initDashboard()` after `initLogin()`**

```javascript
  const STATUS_MESSAGES = {
    draft:                { msg: 'Complete and submit your application.',               href: '/apply' },
    submitted:            { msg: 'Your application is under review.',                  href: '/application-status' },
    in_review:            { msg: 'Your application is being reviewed by admissions.',  href: '/application-status' },
    accepted:             { msg: 'Congratulations! Please confirm your enrollment.',   href: '/enrollment-confirmation' },
    waitlisted:           { msg: "You're on the waitlist. We'll notify you of any change.", href: '/application-status' },
    rejected:             { msg: 'We appreciate your interest in ICIT.',               href: '/application-status' },
    enrollment_confirmed: { msg: 'Your enrollment is confirmed. Complete payment to finalize.', href: '/enrollment-confirmation' },
    enrolled:             { msg: 'Welcome to ICIT! Check your email for platform access.', href: '/application-status' },
    withdrawn:            { msg: 'Your application has been withdrawn.',               href: '/application-status' },
  };

  async function initDashboard() {
    const session = await requireAuth();

    const [application, notifications] = await Promise.all([
      loadApplication(session),
      loadNotifications(session),
    ]);

    hide(q('[wized="dash-loading"]'));

    // User name
    const meta = session.user.user_metadata || {};
    setText(q('[wized="dash-user-name"]'), ((meta.first_name || '') + ' ' + (meta.last_name || '')).trim());

    // Sign out
    q('[wized="dash-signout"]').addEventListener('click', async (e) => {
      e.preventDefault();
      await signOut();
      window.location.href = '/login';
    });

    if (!application) {
      // New user — no application yet
      show(q('[wized="start-application-link"]'));
      hide(q('[wized="withdraw-btn"]'));
      revealPage();
    } else {
      // Existing application
      hide(q('[wized="start-application-link"]'));
      setText(q('[wized="app-program-name"]'), application.programs.name);

      const info = STATUS_MESSAGES[application.status] || { msg: '', href: '/application-status' };
      setText(q('[wized="app-next-action-msg"]'), info.msg);
      setHref(q('[wized="app-next-action-link"]'), info.href);
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

      // Payment success: poll for enrolled status after Stripe redirects back
      const params = new URLSearchParams(window.location.search);
      if (params.get('payment') === 'success' && application.status === 'enrollment_confirmed') {
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
    setText(q('[wized="notif-bell"]'), unread > 0 ? String(unread) : '');

    const drawer = q('[wized="notif-drawer"]');
    const notifTemplate = q('[wized="notif-item-msg"]')?.parentElement;

    q('[wized="notif-bell"]').addEventListener('click', async (e) => {
      e.preventDefault();
      show(drawer);
      await markNotificationsRead(session).catch(() => {});
      setText(q('[wized="notif-bell"]'), '');

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

    q('[wized="notif-drawer-close"]').addEventListener('click', (e) => {
      e.preventDefault();
      hide(drawer);
    });
  }
```

- [ ] **Step 2: Commit**

```bash
git add src/icit-app.js
git commit -m "feat: add STATUS_MESSAGES map and initDashboard()"
```

---

## Task 8 — Page module: `initApply()`

**Files:**
- Modify: `src/icit-app.js` — append after `initDashboard()` inside the PAGES section

- [ ] **Step 1: Add `initApply()` after `initDashboard()`**

```javascript
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

    let applicationId = draft ? draft.id : null;
    let cvUploaded = !!(draft && draft.cv_url);
    let currentSection = 1;
    let programAnswers = {};

    // Section stepper
    function goToSection(n) {
      ['apply-section-1', 'apply-section-2', 'apply-section-3'].forEach((wid) => {
        hide(q('[wized="' + wid + '"]'));
      });
      show(q('[wized="apply-section-' + n + '"]'));
      currentSection = n;
    }
    goToSection(1);

    // Populate program select
    const programSelect = q('[wized="program-select"]');
    programs.forEach((prog) => {
      const opt = document.createElement('option');
      opt.value = prog.id;
      opt.textContent = prog.name;
      programSelect.appendChild(opt);
    });

    // Pre-fill from draft
    if (draft) {
      applicationId = draft.id;
      cvUploaded = !!draft.cv_url;

      if (draft.program_id) programSelect.value = draft.program_id;
      if (draft.locked_fields?.program) {
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

    // Render program questions for a given program
    function renderQuestions(programId) {
      const prog = programs.find((p) => p.id === programId);
      const questions = (prog && prog.program_questions) || [];
      const template = q('[wized="question-item"]');
      if (!template) return;

      template.parentElement.querySelectorAll('[data-icit-clone]').forEach((el) => el.remove());

      if (questions.length === 0) {
        show(q('[wized="questions-empty"]'));
        hide(q('[wized="questions-loading"]'));
        return;
      }

      hide(q('[wized="questions-empty"]'));
      hide(q('[wized="questions-loading"]'));
      questions.forEach((question) => {
        const row = cloneRow(template);
        row.dataset.icitClone = '1';
        const label = row.querySelector('label') || row.querySelector('[data-question-label]');
        if (label) label.textContent = question.label;
        const input = row.querySelector('input, select, textarea');
        if (input) {
          input.name = question.id;
          input.dataset.questionId = question.id;
          if (question.type === 'select' && question.options) {
            question.options.forEach((opt) => {
              const el = document.createElement('option');
              el.value = opt;
              el.textContent = opt;
              input.appendChild(el);
            });
          }
          input.addEventListener('change', (e) => {
            programAnswers[question.id] = e.target.value;
          });
          input.addEventListener('input', (e) => {
            programAnswers[question.id] = e.target.value;
          });
        }
        template.parentElement.appendChild(row);
      });
    }

    // Initial question render from draft's program
    if (draft && draft.program_id) renderQuestions(draft.program_id);

    programSelect.addEventListener('change', () => {
      renderQuestions(programSelect.value);
    });

    // Collect current form fields for saveDraft
    function collectFields() {
      return {
        id: applicationId,
        programId: programSelect.value,
        firstName: (q('[wized="applicant-first-name"]') || {}).value || '',
        lastName: (q('[wized="applicant-last-name"]') || {}).value || '',
        programAnswers: Object.keys(programAnswers).length ? programAnswers : undefined,
      };
    }

    async function doSaveDraft() {
      const fields = collectFields();
      if (!fields.programId) return; // nothing to save yet
      const saved = await saveDraft(session, fields);
      applicationId = saved.id;
      // Show saved indicator for 3 seconds
      const indicator = q('[wized="form-draft-status"]');
      show(indicator);
      setTimeout(() => hide(indicator), 3000);
      return saved;
    }

    // Section 1 buttons
    q('[wized="save-draft-btn"]').addEventListener('click', async (e) => {
      e.preventDefault();
      try { await doSaveDraft(); } catch (err) { console.error(err); }
    });

    q('[wized="next-section-1-btn"]').addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        await doSaveDraft();
        goToSection(2);
      } catch (err) { console.error(err); }
    });

    // Section 2 buttons
    q('[wized="save-draft-2-btn"]').addEventListener('click', async (e) => {
      e.preventDefault();
      try { await doSaveDraft(); } catch (err) { console.error(err); }
    });

    q('[wized="back-section-2-btn"]').addEventListener('click', (e) => {
      e.preventDefault();
      goToSection(1);
    });

    q('[wized="next-section-2-btn"]').addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        await doSaveDraft();
        goToSection(3);
      } catch (err) { console.error(err); }
    });

    // Section 3 — CV
    q('[wized="cv-file-input"]').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file || !applicationId) return;
      try {
        await uploadCV(session, applicationId, file);
        cvUploaded = true;
        show(q('[wized="cv-remove-btn"]'));
        const display = q('[wized="cv-file-name"]');
        if (display) setText(display, file.name);
      } catch (err) {
        console.error('CV upload failed:', err);
      }
    });

    q('[wized="cv-remove-btn"]').addEventListener('click', async (e) => {
      e.preventDefault();
      if (!applicationId) return;
      try {
        await removeCV(session, applicationId);
        cvUploaded = false;
        hide(q('[wized="cv-remove-btn"]'));
        if (q('[wized="cv-file-input"]')) q('[wized="cv-file-input"]').value = '';
        const display = q('[wized="cv-file-name"]');
        if (display) setText(display, '');
      } catch (err) { console.error(err); }
    });

    q('[wized="save-draft-3-btn"]').addEventListener('click', async (e) => {
      e.preventDefault();
      try { await doSaveDraft(); } catch (err) { console.error(err); }
    });

    q('[wized="back-section-3-btn"]').addEventListener('click', (e) => {
      e.preventDefault();
      goToSection(2);
    });

    q('[wized="submit-application-btn"]').addEventListener('click', async (e) => {
      e.preventDefault();
      if (!cvUploaded) {
        alert('Please upload your CV before submitting.');
        return;
      }
      try {
        await doSaveDraft(); // save any section 3 state before locking
        await submitApplication(session, applicationId);
        window.location.href = '/dashboard';
      } catch (err) {
        console.error('Submit failed:', err);
        setText(q('[wized="form-error-msg"]'), err.message || 'Submission failed. Please try again.');
        show(q('[wized="form-error-msg"]'));
      }
    });
  }
```

- [ ] **Step 2: Commit**

```bash
git add src/icit-app.js
git commit -m "feat: add initApply() — section stepper, draft, CV upload, submit"
```

---

## Task 9 — Page module: `initStatus()`

**Files:**
- Modify: `src/icit-app.js` — append after `initApply()` inside the PAGES section

- [ ] **Step 1: Add `initStatus()` after `initApply()`**

```javascript
  // Maps status to a position in the timeline. Index -1 = nothing highlighted.
  const STATUS_TIMELINE = {
    draft: 0,
    submitted: 1,
    in_review: 2,
    more_info_requested: 2, // sits within the review phase
    accepted: 3,
    rejected: 3,
    waitlisted: 3,
    enrollment_confirmed: 3,
    enrolled: 4,
    withdrawn: -1, // no step highlighted
  };
  const TIMELINE_STEPS = [
    'timeline-step-draft',
    'timeline-step-submitted',
    'timeline-step-in-review',
    'timeline-step-decision',
    'timeline-step-enrolled',
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

    // Header
    setText(q('[wized="status-program-name"]'), application.programs.name);
    setText(q('[wized="status-submitted-date"]'), formatDate(application.submitted_at));

    // Timeline
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

    // Event history loop
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

    // More-info section
    const latestEventType = events[0]?.event_type;
    if (latestEventType === 'more_info_requested') {
      setText(q('[wized="admin-notes-msg"]'), application.admin_notes || '');
      show(q('[wized="admin-notes-msg"]'));

      if (!application.notes_response) {
        show(q('[wized="notes-response-input"]'));
        show(q('[wized="submit-notes-response-btn"]'));
        hide(q('[wized="notes-submitted-confirm"]'));

        q('[wized="submit-notes-response-btn"]').addEventListener('click', async (e) => {
          e.preventDefault();
          const response = q('[wized="notes-response-input"]').value.trim();
          if (!response) return;
          try {
            await submitNotesResponse(session, application.id, response);
            location.reload();
          } catch (err) { console.error(err); }
        });
      } else {
        hide(q('[wized="notes-response-input"]'));
        hide(q('[wized="submit-notes-response-btn"]'));
        show(q('[wized="notes-submitted-confirm"]'));
      }
    } else {
      hide(q('[wized="admin-notes-msg"]'));
      hide(q('[wized="notes-response-input"]'));
      hide(q('[wized="submit-notes-response-btn"]'));
      hide(q('[wized="notes-submitted-confirm"]'));
    }

    // Withdraw button
    if (WITHDRAW_ALLOWED.includes(application.status)) {
      show(q('[wized="status-withdraw-btn"]'));
      q('[wized="status-withdraw-btn"]').addEventListener('click', async (e) => {
        e.preventDefault();
        if (!confirm('Withdraw your application? This cannot be undone.')) return;
        try {
          await withdrawApplication(session, application.id, application.status);
          location.reload();
        } catch (err) { console.error('Withdraw error:', err); }
      });
    } else {
      hide(q('[wized="status-withdraw-btn"]'));
    }

    // Edit draft link
    if (application.status === 'draft') {
      show(q('[wized="edit-draft-link"]'));
    } else {
      hide(q('[wized="edit-draft-link"]'));
    }
  }
```

- [ ] **Step 2: Commit**

```bash
git add src/icit-app.js
git commit -m "feat: add STATUS_TIMELINE map and initStatus() — timeline, events, more-info, withdraw"
```

---

## Task 10 — Page module: `initEnrollment()`

**Files:**
- Modify: `src/icit-app.js` — append after `initStatus()` inside the PAGES section

- [ ] **Step 1: Add `initEnrollment()` after `initStatus()`**

```javascript
  async function initEnrollment() {
    const session = await requireAuth();

    const application = await loadApplication(session);

    // Redirect if no application or wrong status
    if (!application || !['accepted', 'enrollment_confirmed'].includes(application.status)) {
      window.location.href = '/dashboard';
      return;
    }

    revealPage();
    hide(q('[wized="enroll-loading"]'));

    setText(q('[wized="enroll-program-name"]'), application.programs.name);
    setText(q('[wized="enroll-tuition"]'), formatCurrency(application.programs.price_cents));
    setText(
      q('[wized="enroll-status-badge"]'),
      application.status === 'enrollment_confirmed' ? 'Enrollment Confirmed' : 'Accepted',
    );

    hide(q('[wized="enroll-error-msg"]'));
    hide(q('[wized="enroll-processing"]'));

    q('[wized="confirm-enrollment-btn"]').addEventListener('click', async (e) => {
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
```

- [ ] **Step 2: Commit**

```bash
git add src/icit-app.js
git commit -m "feat: add initEnrollment() — guard, render, Stripe checkout trigger"
```

---

## Task 11 — Dispatcher

**Files:**
- Modify: `src/icit-app.js` — replace the `// ─── DISPATCHER` placeholder with the real dispatcher

- [ ] **Step 1: Replace the dispatcher placeholder**

```javascript
  // ─── DISPATCHER ─────────────────────────────────────────────────────────────
  const path = window.location.pathname;
  if (path === '/login')                       initLogin();
  else if (path === '/dashboard')              initDashboard();
  else if (path === '/apply')                  initApply();
  else if (path === '/application-status')     initStatus();
  else if (path === '/enrollment-confirmation') initEnrollment();
```

- [ ] **Step 2: Verify the file is a valid complete IIFE**

Open `src/icit-app.js` and confirm:
- Starts with `(function () {`
- Ends with `})();`
- Every function from Tasks 1–10 is present
- The dispatcher is the last thing before `})();`

- [ ] **Step 3: Commit**

```bash
git add src/icit-app.js
git commit -m "feat: add dispatcher — icit-app.js complete"
```

---

## Task 12 — Deploy to Webflow

Requires Task 0 (prerequisites) to be complete and the site published.

- [ ] **Step 1: Copy your Supabase anon key**

```bash
grep SUPABASE_ANON_KEY "/Users/m4macmini/Projects/UX Enrollment Webflow/.env"
```

Open `src/icit-app.js` and replace `PASTE_ANON_KEY_FROM_ENV_HERE` with the real value.

```bash
git add src/icit-app.js
git commit -m "chore: set Supabase anon key in icit-app.js"
```

- [ ] **Step 2: Open Webflow → Site Settings → Custom Code → Head Code**

Paste the following (replace the existing Wized script tag if present):

```html
<!-- Supabase JS SDK v2 -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>

<!-- ICIT application logic -->
<script>
PASTE THE ENTIRE CONTENTS OF src/icit-app.js HERE
</script>
```

- [ ] **Step 3: Publish the site**

Click Publish → Publish to webflow.io domain.

- [ ] **Step 4: Verify the script loads**

Open `https://jareds-spectacular-site-818130.webflow.io/login` in a browser.
Open DevTools → Console. Should see no errors. Run:

```javascript
typeof window.supabase  // → "object"
```

If you see `ReferenceError: supabase is not defined`, the CDN script tag is missing or came after the inline script.

---

## Task 13 — Manual testing

Work through the spec's testing checklist in order. Open DevTools Console to catch any errors.
Site URL: `https://jareds-spectacular-site-818130.webflow.io`

### Auth
- [ ] Go to `/login` → sign up with a new email → verify redirect to `/dashboard` → CTA "Start your application" is visible
- [ ] Sign out → redirected to `/login` → sign back in → redirected to `/dashboard`
- [ ] Auth flash: load `/dashboard` in a fresh browser window (no session) → verify page content is NOT visible before redirect fires (should redirect to `/login` immediately)
- [ ] Session expiry: sign in → open a second tab → sign out from the second tab → the first tab redirects to `/login` within seconds

### /apply — form
- [ ] Go to `/apply` → blank form, program select has options, no locks
- [ ] Select a program → question list renders in Section 2
- [ ] Fill name + select program → click "Save Draft" → banner shows briefly
- [ ] Reload `/apply` → form is pre-filled; program and name fields are disabled (locked)
- [ ] Click Next (1→2) → draft saves; Section 2 shows
- [ ] Click Next (2→3) → draft saves; Section 3 shows
- [ ] Upload a `.pdf` CV file → filename shown; Remove button appears
- [ ] Click Remove → file cleared
- [ ] Click Submit without uploading a CV → alert fires, submit blocked
- [ ] Upload CV → click Submit → redirect to `/dashboard`, status shows "under review"

### /dashboard — application card & notifications
- [ ] Status is `submitted` → next-action message is "Your application is under review."
- [ ] Notification bell shows unread count → click it → drawer opens; mark-as-read fires (count clears)
- [ ] Close drawer → reopen → count stays at 0
- [ ] Status is in `['draft','submitted','in_review','waitlisted','accepted']` → Withdraw button visible
- [ ] Click Withdraw → confirm dialog → status flips to `withdrawn`; page reloads; Withdraw button hidden

### /dashboard — payment polling
- [ ] In Supabase SQL Editor run: `UPDATE applications SET status = 'enrollment_confirmed' WHERE id = '<your-app-id>'`
- [ ] Navigate to `/dashboard?payment=success` → "Processing your enrollment…" banner appears
- [ ] In Supabase SQL Editor run: `UPDATE applications SET status = 'enrolled' WHERE id = '<your-app-id>'`
- [ ] Within 3s the page reloads and shows the enrolled message

### /application-status
- [ ] Load page → timeline step highlighted matches current status
- [ ] Event history shows all events in reverse chronological order
- [ ] In Supabase: insert an `application_events` row with `event_type = 'more_info_requested'` for your application
- [ ] Reload `/application-status` → more-info section appears with the admin note and response textarea
- [ ] Type a response and click Submit → page reloads; confirm message shows; textarea hidden
- [ ] Withdraw button visible when status allows; hidden when not

### /enrollment-confirmation
- [ ] Navigate to `/enrollment-confirmation` with status `submitted` → redirected to `/dashboard`
- [ ] In Supabase set status = `accepted` → navigate to `/enrollment-confirmation`
- [ ] Program name, tuition, and status badge all render correctly
- [ ] Click Confirm → page shows "Processing…" then redirects to Stripe checkout URL
- [ ] (If Stripe test mode) complete payment → verify Stripe webhook fires, status → `enrolled`

### Security
- [ ] Sign in as User A → open DevTools → Console → run `await supabase.from('applications').select().eq('applicant_id', '<user-b-id>')` → result is empty (RLS blocks)
- [ ] Attempt to fetch another user's CV: `await supabase.storage.from('cvs').download('<other-user-id>/file.pdf')` → expect 400 or empty

---

*End of plan.*
