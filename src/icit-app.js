(function () {
  'use strict';

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

  // Redirects to /dashboard if a session exists. Hangs (never resolves) if redirect fires.
  async function requireGuest() {
    const session = await getSession();
    if (session) {
      window.location.href = '/dashboard';
      return new Promise(() => {}); // intentionally never resolves
    }
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
      options: { data: { first_name: firstName, last_name: lastName } },
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

  // ─── PAGES ──────────────────────────────────────────────────────────────────

  async function initLogin() {
    await requireGuest(); // redirect to /dashboard if already signed in

    if (!q('[wized="tab-signin"]') || !q('[wized="signin-submit"]') || !q('[wized="signup-submit"]')) return;

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
    const signoutEl = q('[wized="dash-signout"]');
    if (signoutEl) signoutEl.addEventListener('click', async (e) => {
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

    const notifBellEl = q('[wized="notif-bell"]');
    if (notifBellEl) notifBellEl.addEventListener('click', async (e) => {
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
    }
    goToSection(1);

    // Populate program select
    const programSelect = q('[wized="program-select"]');
    if (programSelect) {
      programs.forEach((prog) => {
        const opt = document.createElement('option');
        opt.value = prog.id;
        opt.textContent = prog.name;
        programSelect.appendChild(opt);
      });
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

    // Render program questions for a given program
    function renderQuestions(programId) {
      programAnswers = {};  // clear stale answers from previous program selection
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
          input.addEventListener('change', (e) => { programAnswers[question.id] = e.target.value; });
          input.addEventListener('input', (e) => { programAnswers[question.id] = e.target.value; });
        }
        template.parentElement.appendChild(row);
      });
    }

    // Initial question render from draft's program
    if (draft && draft.program_id) {
      renderQuestions(draft.program_id);
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
      if (!fields.programId) return;
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
      try { await doSaveDraft(); goToSection(2); } catch (err) { console.error(err); }
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
      try { await doSaveDraft(); goToSection(3); } catch (err) { console.error(err); }
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
        await uploadCV(session, applicationId, file);
        cvUploaded = true;
        show(q('[wized="cv-remove-btn"]'));
        const display = q('[wized="cv-file-name"]');
        if (display) setText(display, file.name);
      } catch (err) { console.error('CV upload failed:', err); }
    });

    const cvRemoveBtn = q('[wized="cv-remove-btn"]');
    if (cvRemoveBtn) cvRemoveBtn.addEventListener('click', async (e) => {
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
    enrollment_confirmed: 3,
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

    setText(q('[wized="status-program-name"]'), application.programs.name);
    setText(q('[wized="status-submitted-date"]'), formatDate(application.submitted_at));

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
      show(q('[wized="admin-notes-msg"]'));

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
      hide(q('[wized="admin-notes-msg"]'));
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
  if (path === '/login')                       initLogin();
  else if (path === '/dashboard')              initDashboard();
  else if (path === '/apply')                  initApply();
  else if (path === '/application-status')     initStatus();
  else if (path === '/enrollment-confirmation') initEnrollment();
})();
