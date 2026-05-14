import { db } from '../core/supabase.js';
import { requireAuth, signOut } from '../core/auth.js';
import { WITHDRAW_ALLOWED } from '../core/constants.js';
import { q, show, hide, setText, setHref, escapeHtml, formatDate, revealPage, ensureFallback } from '../core/ui.js';

const STATUS_MESSAGES = {
  draft:      { msg: 'Complete and submit your application.',                    href: '/apply' },
  submitted:  { msg: 'Your application is under review.',                       href: '/application-status' },
  in_review:  { msg: 'Your application is being reviewed by admissions.',       href: '/application-status' },
  accepted:   { msg: 'Congratulations! Please confirm your enrollment.',        href: '/enrollment-confirmation' },
  waitlisted: { msg: "You're on the waitlist. We'll notify you of any change.", href: '/application-status' },
  rejected:   { msg: 'We appreciate your interest in ICIT.',                    href: '/application-status' },
  enrolled:   { msg: 'Welcome to ICIT! Check your email for platform access.',  href: '/application-status' },
  withdrawn:  { msg: 'Your application has been withdrawn.',                    href: '/application-status' },
};

// Returns ALL applications for the user, newest first — no limit, no status filter.
// initDashboard splits the result: enrolled → courses list, everything else → active card.
async function loadApplications(session) {
  const { data, error } = await db
    .from('applications')
    .select(`
      id, program_id, status, submitted_at, updated_at,
      cv_url, admin_notes, notes_response, locked_fields, program_answers,
      programs ( id, name, price_cents, program_questions )
    `)
    .eq('applicant_id', session.user.id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
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

async function loadPrograms() {
  const { data, error } = await db
    .from('programs')
    .select('id, name, price_cents')
    .in('status', ['active', 'upcoming'])
    .order('name');
  if (error) throw error;
  return data ?? [];
}

function getCourseColor(name) {
  const n = (name || '').toLowerCase();
  if (n.includes('international') && n.includes('surgeon')) return '#d9883d';
  if (n.includes('surgeon')) return '#c5543b';
  if (n.includes('international')) return '#5d8591';
  if (n.includes('foundational')) return '#3d7a7a';
  if (n.includes('efficiency') || n.includes('team')) return '#5d6b9e';
  return '#5b6b82';
}

function cloneRow(template) {
  const clone = template.cloneNode(true);
  clone.style.display = '';
  // Remove -tpl marker classes and Webflow's built-in visibility classes
  [...clone.classList]
    .filter(c => c.endsWith('-tpl') || /^inline-(div|p)-\d/.test(c))
    .forEach(c => clone.classList.remove(c));
  return clone;
}

// Renders all enrolled applications as a list.
// Prefers Webflow-native elements (wized="enrolled-list" + wized="enrolled-item") when
// present in the Designer; falls back to an injected section so the page never fails silently.
// To wire this natively: add a container with wized="enrolled-list" and one hidden child
// row with wized="enrolled-item" containing wized="enrolled-program-name" and wized="enrolled-date".
function renderEnrolledList(enrolled) {
  const listEl  = q('[wized="enrolled-list"]');
  const itemTpl = q('[wized="enrolled-item"]');

  if (listEl && itemTpl) {
    listEl.querySelectorAll('[data-icit-clone]').forEach(el => el.remove());
    hide(itemTpl);
    if (enrolled.length === 0) { hide(listEl); return; }
    show(listEl);
    enrolled.forEach(app => {
      const row = cloneRow(itemTpl);
      row.dataset.icitClone = '1';
      setText(row.querySelector('[wized="enrolled-program-name"]'), app.programs?.name || '');
      setText(row.querySelector('[wized="enrolled-date"]'), app.updated_at ? formatDate(app.updated_at) : '—');
      itemTpl.parentElement.appendChild(row);
    });
    return;
  }

  if (enrolled.length === 0) return;

  const section = ensureFallback('icit-enrolled-courses', `
    <section style="max-width:860px;margin:32px auto;padding:0 24px;font-family:inherit;">
      <h2 style="margin:0 0 16px;font-size:18px;font-weight:600;color:#111827;">Enrolled Courses</h2>
      <div id="icit-enrolled-items"></div>
    </section>
  `);
  const items = section.querySelector('#icit-enrolled-items') || section;
  items.innerHTML = enrolled.map(app => `
    <div style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:12px;background:#fff;">
      <div style="font-weight:600;color:#111827;">${escapeHtml(app.programs?.name || 'Unknown Program')}</div>
      <div style="font-size:14px;color:#6b7280;margin-top:4px;">Enrolled ${app.updated_at ? formatDate(app.updated_at) : '—'}</div>
    </div>
  `).join('');
}

export async function initDashboard() {
  const session = await requireAuth();

  const [applications, notifications, programs] = await Promise.all([
    loadApplications(session),
    loadNotifications(session).catch((err) => {
      console.warn('ICIT notifications failed to load:', err);
      return [];
    }),
    loadPrograms().catch((err) => {
      console.warn('ICIT programs failed to load:', err);
      return [];
    }),
  ]);

  // enrolled: completed courses — rendered as a list via renderEnrolledList()
  // active:   most recent non-enrolled application — drives the existing card UI
  const enrolled = applications.filter(a => a.status === 'enrolled');
  const active   = applications.find(a => a.status !== 'enrolled') ?? null;

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

  if (!active) {
    show(q('[wized="dash-no-application"]'));
    hide(q('[wized="dash-application"]'));
    show(q('[wized="start-application-link"]'));
    hide(q('[wized="withdraw-btn"]'));
    if (!q('[wized="dash-no-application"]') && !q('[wized="start-application-link"]')) {
      ensureFallback('icit-dashboard-fallback', `
        <main style="max-width:860px;margin:48px auto;padding:0 24px;font-family:inherit;">
          <h1 style="margin:0 0 12px;color:#111827;">Application Dashboard</h1>
          <p style="margin:0 0 24px;color:#374151;">No application is saved yet.</p>
          <a href="/apply" style="display:inline-block;background:#2563eb;color:white;padding:12px 16px;border-radius:6px;text-decoration:none;">Start application</a>
        </main>
      `);
    }
    revealPage();

    // Course selection cards — rendered when no active application
    const cardList  = q('[wized="course-card-list"]');
    const cardTpl   = q('[wized="course-card-item"]');
    if (cardList && cardTpl && programs.length > 0) {
      hide(cardTpl);
      let selectedProgramId = null;

      programs.forEach((prog) => {
        const card = cloneRow(cardTpl);
        card.dataset.icitClone = '1';
        card.style.setProperty('--course-color', getCourseColor(prog.name));
        setText(card.querySelector('[wized="course-card-name"]'), prog.name);
        const descEl = card.querySelector('[wized="course-card-desc"]');
        if (descEl) setText(descEl, '');
        cardList.appendChild(card);

        card.addEventListener('click', () => {
          selectedProgramId = prog.id;
          cardList.querySelectorAll('[data-icit-clone]').forEach((c) => c.classList.remove('selected'));
          card.classList.add('selected');
          hide(q('[wized="course-select-error"]'));
        });
      });

      const startBtn = q('[wized="start-application-btn"]');
      if (startBtn) startBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (!selectedProgramId) {
          show(q('[wized="course-select-error"]'));
          return;
        }
        const prog = programs.find((p) => p.id === selectedProgramId);
        sessionStorage.setItem('icit-selected-course', JSON.stringify({
          programId: selectedProgramId,
          programName: prog ? prog.name : '',
        }));
        window.location.href = '/apply';
      });
    }
  } else {
    hide(q('[wized="dash-no-application"]'));
    show(q('[wized="dash-application"]'));
    hide(q('[wized="start-application-link"]'));
    const programName = active.programs?.name || 'Selected program';
    setText(q('[wized="app-program-name"]'), programName);

    const info = STATUS_MESSAGES[active.status] || { msg: '', href: '/application-status' };
    setText(q('[wized="app-next-action-msg"]'), info.msg);
    setHref(q('[wized="app-next-action-link"]'), info.href);
    setText(q('[wized="app-submitted-date"]'), active.submitted_at ? formatDate(active.submitted_at) : '—');
    setText(q('[wized="app-updated-date"]'), active.updated_at ? formatDate(active.updated_at) : '—');
    show(q('[wized="view-status-link"]'));

    if (WITHDRAW_ALLOWED.includes(active.status)) {
      show(q('[wized="withdraw-btn"]'));
      q('[wized="withdraw-btn"]').addEventListener('click', async (e) => {
        e.preventDefault();
        if (!confirm('Withdraw your application? This cannot be undone.')) return;
        try {
          await withdrawApplication(session, active.id, active.status);
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
        <main style="max-width:860px;margin:48px auto;padding:0 24px;font-family:inherit;">
          <h1 style="margin:0 0 12px;color:#111827;">Application Dashboard</h1>
          <p style="margin:0 0 8px;color:#374151;"><strong>Program:</strong> ${escapeHtml(programName)}</p>
          <p style="margin:0 0 24px;color:#374151;"><strong>Status:</strong> ${escapeHtml(active.status.replace(/_/g, ' '))}</p>
          <a href="${escapeHtml(info.href)}" style="display:inline-block;background:#2563eb;color:white;padding:12px 16px;border-radius:6px;text-decoration:none;">Continue</a>
        </main>
      `);
    }

    // Payment success: poll for enrolled status after Stripe redirects back.
    // Matches by application ID so concurrent enrolled records don't confuse it.
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'success' && active.status === 'accepted') {
      const banner = document.createElement('p');
      banner.id = 'payment-banner';
      banner.textContent = 'Processing your enrollment…';
      document.body.prepend(banner);
      let elapsed = 0;
      const poll = setInterval(async () => {
        elapsed += 3;
        try {
          const fresh = (await loadApplications(session)).find(a => a.id === active.id);
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

  // Enrolled courses list — always rendered, independent of active application state.
  renderEnrolledList(enrolled);

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
        <aside style="position:fixed;top:72px;right:24px;width:min(360px,calc(100vw - 48px));background:white;border:1px solid #e5e7eb;border-radius:8px;box-shadow:0 16px 40px rgba(15,23,42,.18);padding:16px;z-index:9999;">
          <button type="button" data-icit-close style="float:right;border:0;background:transparent;font-size:20px;cursor:pointer;">x</button>
          <h2 style="margin:0 0 12px;font-size:18px;color:#111827;">Notifications</h2>
          <div data-icit-notifications></div>
        </aside>
      `);
      const list = fallback.querySelector('[data-icit-notifications]');
      list.innerHTML = notifications.length
        ? notifications.map((notif) => `<p style="margin:0 0 12px;color:#374151;">${escapeHtml(notif.message)}</p>`).join('')
        : '<p style="margin:0;color:#6b7280;">No notifications yet.</p>';
      fallback.querySelector('[data-icit-close]').onclick = () => fallback.remove();
    } else {
      show(drawer);
    }
    await markNotificationsRead(session).catch(() => {});
    setText(q('[wized="notif-unread-count"]'), '');

    if (!notifTemplate) return;
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
