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

  // Redirects to /dashboard if a session exists. Resolves (void) for guests.
  async function requireGuest() {
    const session = await getSession();
    if (session) window.location.href = '/dashboard';
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

  // ─── UI placeholder — filled in Task 5 ─────────────────────────────────────

  // ─── PAGES placeholder — filled in Tasks 6–10 ───────────────────────────────

  // ─── DISPATCHER ─────────────────────────────────────────────────────────────
  // (will be populated in Task 11 — leave blank for now)

})();
