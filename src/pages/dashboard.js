import { db } from '../core/supabase.js';
import { requireAuth, signOut } from '../core/auth.js';
import { WITHDRAW_ALLOWED } from '../core/constants.js';
import { q, show, hide, setText, setHref, escapeHtml, formatDate, revealPage, ensureFallback } from '../core/ui.js';

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

// Page-private: only used by initDashboard.
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

async function loadNotifications(session) {
  const { data, error } = await db
    .from('notifications')
    .select('id, message, read, created_at')
    .eq('applicant_id', session.user.id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

async function markNotificationsRead(session) {
  const { error } = await db
    .from('notifications')
    .update({ read: true })
    .eq('applicant_id', session.user.id)
    .eq('read', false);
  if (error) throw error;
}

// Validates currentStatus before writing — defense-in-depth.
// RLS also enforces ownership, but this prevents a throw with no visible error.
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

export async function initDashboard() {
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
