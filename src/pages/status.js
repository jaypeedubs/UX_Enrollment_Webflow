import { db } from '../core/supabase.js';
import { requireAuth } from '../core/auth.js';
import { WITHDRAW_ALLOWED } from '../core/constants.js';
import { q, show, hide, setText, formatDate, revealPage } from '../core/ui.js';

// ─── PAGE-PRIVATE CONSTANTS ──────────────────────────────────────────────────

const STATUS_TIMELINE = {
  draft: 0,
  submitted: 1,
  in_review: 2,
  more_info_requested: 2,
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

async function loadApplicationHistory(session, applicationId) {
  const { data, error } = await db
    .from('application_events')
    .select('id, event_type, created_at, metadata')
    .eq('application_id', applicationId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

async function submitNotesResponse(session, applicationId, response) {
  const { error } = await db
    .from('applications')
    .update({ notes_response: response })
    .eq('id', applicationId)
    .eq('applicant_id', session.user.id);
  if (error) throw error;
}

async function withdrawApplication(session, applicationId, currentStatus) {
  if (!WITHDRAW_ALLOWED.includes(currentStatus)) {
    throw new Error('Cannot withdraw from status: ' + currentStatus);
  }
  const { error: upErr } = await db
    .from('applications')
    .update({ status: 'withdrawn' })
    .eq('id', applicationId)
    .eq('applicant_id', session.user.id);
  if (upErr) throw upErr;

  const { error: evErr } = await db
    .from('application_events')
    .insert({ application_id: applicationId, event_type: 'withdrawn' });
  if (evErr) throw evErr;
}

// ─── PAGE-PRIVATE HELPERS ────────────────────────────────────────────────────

function cloneRow(template) {
  const clone = template.cloneNode(true);
  clone.style.display = '';
  [...clone.classList].filter(c => c.endsWith('-tpl')).forEach(c => clone.classList.remove(c));
  return clone;
}

// ─── PAGE ENTRY POINT ────────────────────────────────────────────────────────

export async function initStatus() {
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
