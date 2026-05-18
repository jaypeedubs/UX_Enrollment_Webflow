import { db } from '../core/supabase.js';
import { requireAuth } from '../core/auth.js';
import { q, show, hide, setText, formatCurrency, revealPage } from '../core/ui.js';
import { EDGE_FN_BASE } from '../core/constants.js';

// ─── PAGE-PRIVATE DATA ───────────────────────────────────────────────────────

async function loadApplication(session) {
  const { data, error } = await db
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

// ─── PAGE ENTRY POINT ────────────────────────────────────────────────────────

export async function initEnrollment() {
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
