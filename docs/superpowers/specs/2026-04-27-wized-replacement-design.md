# ICIT Wized Replacement — Design Spec

**Date:** 2026-04-27  
**Branch:** feat/wized-replacement  
**Status:** Approved for implementation

---

## What We're Replacing and Why

Wized was the planned no-code logic layer connecting Webflow to Supabase. It was abandoned because the Wized configurator has a fundamental blocking bug: loading any auth-guarded page in the configurator triggers a chrome-extension URL redirect that prevents all GUI interaction. 244 configuration steps were attempted across multiple sessions; none could be applied. Additionally, Wized adds a proprietary, unversioned third-party dependency for what amounts to ~800 lines of standard Supabase JS SDK calls.

The replacement is a single vanilla JS file (`src/icit-app.js`) that uses the Supabase JS SDK directly from the browser. All existing `wized="..."` DOM attributes on Webflow elements are retained as selectors — no structural Webflow changes beyond the prerequisite additions listed below.

---

## Delivery

- **File:** `src/icit-app.js` (this repo, version controlled)
- **How Webflow loads it:** Pasted into Webflow Custom Code → Site Settings → Head Code (site-wide), after a `<script>` tag loading the Supabase CDN bundle
- **Supabase SDK CDN:** `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js`
- **Deploy workflow:** Edit `src/icit-app.js` → paste updated file into Webflow Custom Code → publish site

---

## Prerequisites — Webflow Designer Session

All of the following must be completed in one Webflow Designer session before the JS is deployed. After changes, publish the site.

| Page | Change | Notes |
|---|---|---|
| /login | Add `wized="signin-section"` to the sign-in form section container | Element exists, no wized attribute |
| /login | Add `wized="signup-section"` to the sign-up form section container | Element exists, no wized attribute |
| /dashboard | Add `wized="dash-user-name"` to the name `<span>` inside `.dash-user` | Element exists, just missing attribute |
| /dashboard | Add `wized="dash-signout"` to the sign-out `<a>` inside `.dash-user` | Element exists, just missing attribute |
| /dashboard | Set notification template row `display: none` as **inline style** in element settings | Enables cloneRow() pattern |
| /application-status | Add `wized="status-submitted-date"` to existing date `<span>` in status-hero-sub | Element exists, just missing attribute |
| /application-status | Add a `<textarea>` element with `wized="notes-response-input"` in the more-info section | Element does not exist — must be created |
| /application-status | Add `wized="timeline-step-draft"` to Draft step container | |
| /application-status | Add `wized="timeline-step-submitted"` to Submitted step container | |
| /application-status | Add `wized="timeline-step-in-review"` to In Review step container | |
| /application-status | Add `wized="timeline-step-decision"` to Decision step container | |
| /application-status | Add `wized="timeline-step-enrolled"` to Enrolled step container | |
| /application-status | Set event-history template row `display: none` as **inline style** | Enables cloneRow() pattern |
| /enrollment-confirmation | Add `wized="enroll-program-name"` to program name value `<span>` | |
| /enrollment-confirmation | Add `wized="enroll-tuition"` to tuition value `<span>` | |
| /enrollment-confirmation | Add `wized="enroll-status-badge"` to status badge `<span>` | |
| /apply | Add `wized="apply-section-1"` to Section 1 wrapper div | |
| /apply | Add `wized="apply-section-2"` to Section 2 wrapper div | |
| /apply | Add `wized="apply-section-3"` to Section 3 wrapper div | |
| /apply | Set program-question template row `display: none` as **inline style** | Enables cloneRow() pattern |

**Total:** 17 attribute additions + 1 new element + 3 inline style settings.

---

## Auth Flash Prevention

All protected pages (`/dashboard`, `/apply`, `/application-status`, `/enrollment-confirmation`) must include this in their **page-level** Webflow Custom Code → Before `</head>`:

```html
<div id="icit-page-wrapper" style="visibility: hidden">
```

And wrap all page body content inside `#icit-page-wrapper`. The page module calls `revealPage()` only after auth resolves and initial data is rendered. This prevents the flash of protected content before a redirect fires.

---

## Architecture

`src/icit-app.js` is an IIFE (Immediately Invoked Function Expression) with four named sections:

```
(function () {
  // 1. CORE — client, auth helpers, session management
  // 2. API — all Supabase operations as named functions
  // 3. UI — DOM helpers
  // 4. PAGES — one init function per page + dispatcher
})();
```

The dispatcher at the bottom reads `window.location.pathname` and calls the matching `init` function. Each `init` function only selects elements that exist on its page — `q()` returning `null` on a wrong-page call is a harmless no-op.

---

## Section 1: Core

### Constants
```javascript
const SUPABASE_URL = 'https://xvweanlqcbgbiyxqhwux.supabase.co';
const SUPABASE_ANON_KEY = '...'; // safe to inline — RLS enforces isolation
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

### Functions

**`getSession()`** — Returns current session or null. Thin wrapper over `supabase.auth.getSession()`.

**`requireAuth()`** — Async. Gets session; if null, redirects to `/login` and never resolves. If session exists, returns it.

**`requireGuest()`** — Async. Gets session; if session exists, redirects to `/dashboard`. Otherwise returns (guest confirmed).

### Session expiry handler
```javascript
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT') window.location.href = '/login';
});
```
Filters explicitly on `SIGNED_OUT`. `INITIAL_SESSION` events are ignored — no conditional needed.

---

## Section 2: API

### Contract
- Returns `null` for valid empty states (e.g., no application row for a new user)
- Returns plain data objects or arrays on success
- **Throws** on network, auth, or unexpected Supabase errors
- Page modules catch thrown errors and render the nearest error element

### Functions

| Function | Operation | Returns |
|---|---|---|
| `signIn(email, password)` | `supabase.auth.signInWithPassword()` | session |
| `signUp(email, password, firstName, lastName)` | `supabase.auth.signUp()` with metadata | session |
| `signOut()` | `supabase.auth.signOut()` | void |
| `loadApplication(session)` | SELECT from applications JOIN programs WHERE applicant_id = auth.uid() LIMIT 1 ORDER BY created_at DESC | application \| null |
| `loadNotifications(session)` | SELECT from notifications WHERE applicant_id = auth.uid() ORDER BY created_at DESC | notifications[] |
| `markNotificationsRead(session)` | UPDATE notifications SET read=true WHERE applicant_id = auth.uid() AND read=false | void |
| `withdrawApplication(session, applicationId, currentStatus)` | Validates `currentStatus` is in `['draft','submitted','in_review','waitlisted','accepted']` before writing. UPDATE applications SET status='withdrawn'; INSERT application_events {event_type: 'withdrawn'} | void |
| `saveDraft(session, fields)` | UPSERT applications (draft); INSERT application_events {event_type: 'draft_saved'} | application |
| `uploadCV(session, applicationId, file)` | storage.from('cvs').upload(`${userId}/${filename}`, file); UPDATE applications SET cv_url | storageUrl |
| `removeCV(session, applicationId)` | UPDATE applications SET cv_url=null | void |
| `submitApplication(session, applicationId)` | UPDATE applications SET status='submitted', submitted_at, locked_fields={all:true}; INSERT application_events {event_type: 'submitted'} | void |
| `loadPrograms()` | SELECT from programs WHERE status='active' | programs[] |
| `loadApplicationHistory(session, applicationId)` | SELECT from application_events WHERE application_id=? ORDER BY created_at DESC | events[] |
| `submitNotesResponse(session, applicationId, response)` | UPDATE applications SET notes_response=? | void |
| `createCheckout(session, applicationId)` | POST to create-checkout-session Edge Function with Bearer JWT | { url: string } |

---

## Section 3: UI Helpers

```javascript
function q(sel)          { return document.querySelector(sel); }
function show(el)        { if (el) el.style.display = ''; }
function hide(el)        { if (el) el.style.display = 'none'; }
function setText(el, val){ if (el) el.textContent = val; }
function setHref(el, val){ if (el) el.href = val; }
function revealPage()    { const w = document.getElementById('icit-page-wrapper');
                           if (w) w.style.visibility = 'visible'; }
```

**`cloneRow(templateEl)`**
1. `const clone = templateEl.cloneNode(true)`
2. `clone.style.display = ''` — removes inherited inline `none`; CSS cascade restores flex/grid/block as set in Webflow's stylesheet
3. Returns clone (caller populates, then appends to `templateEl.parentElement`)

All helpers null-check before acting. A misspelled `wized=` attribute degrades to a silent no-op, not a crash.

---

## Section 4: Page Modules

### Dispatcher
```javascript
const path = window.location.pathname;
if (path === '/login')                  initLogin();
else if (path === '/dashboard')         initDashboard();
else if (path === '/apply')             initApply();
else if (path === '/application-status') initStatus();
else if (path === '/enrollment-confirmation') initEnrollment();
```

---

### `initLogin()`

1. `requireGuest()` → if session exists, redirect `/dashboard`
2. Reveal page (login has no wrapper — it's public)
3. Tab toggle: clicks on `[wized="tab-signin"]` / `[wized="tab-signup"]` call `show()`/`hide()` on `[wized="signin-section"]` / `[wized="signup-section"]`
4. Sign-in submit: show `[wized="signin-loading"]` → call `signIn()` → redirect `/dashboard` on success → show `[wized="signin-error-msg"]` on error
5. Sign-up submit: same pattern with `signUp()` and `[wized="signup-error-msg"]`

---

### `initDashboard()`

1. `session = await requireAuth()` → redirect `/login` if no session
2. `const [application, notifications] = await Promise.all([loadApplication(session), loadNotifications(session)])`
3. Hide `[wized="dash-loading"]`
4. If `application === null`: show `[wized="start-application-link"]`; hide app card; `revealPage()`
5. If `application` exists:
   - `setText(q('[wized="app-program-name"]'), application.programs.name)`
   - Look up `STATUS_MESSAGES[application.status]` → set text on `[wized="app-next-action-msg"]` and href on `[wized="app-next-action-link"]`
   - Show `[wized="withdraw-btn"]` if status is in `['draft','submitted','in_review','waitlisted','accepted']`
   - `revealPage()`
6. Notifications: compute unread count; `setText` on badge; bell click → show drawer, call `markNotificationsRead()`, clone notification rows
7. Drawer close: hide drawer on `[wized="notif-drawer-close"]` click
8. Withdraw: confirm dialog on `[wized="withdraw-btn"]` → `withdrawApplication()` → `location.reload()`
9. Sign out: `[wized="dash-signout"]` click → `signOut()` → redirect `/login`
10. User name: `setText(q('.dash-user-name'), session.user.user_metadata.first_name + ' ' + ...)`

**Payment success polling** (triggered when `?payment=success` in URL and `application.status === 'enrollment_confirmed'`):
- Show "Processing your enrollment..." banner
- Poll `loadApplication()` every 3s
- On status → `enrolled`: `location.reload()`
- After 30s: `clearInterval(poll)`, `history.replaceState({}, '', '/dashboard')`, replace banner text with "Payment received — your enrollment typically confirms within a few minutes."

**`STATUS_MESSAGES` map:**
```javascript
const STATUS_MESSAGES = {
  draft:                { msg: 'Complete and submit your application.', href: '/apply' },
  submitted:            { msg: 'Your application is under review.', href: '/application-status' },
  in_review:            { msg: 'Your application is being reviewed by admissions.', href: '/application-status' },
  accepted:             { msg: 'Congratulations! Please confirm your enrollment.', href: '/enrollment-confirmation' },
  waitlisted:           { msg: "You're on the waitlist. We'll notify you of any change.", href: '/application-status' },
  rejected:             { msg: 'We appreciate your interest in ICIT.', href: '/application-status' },
  enrollment_confirmed: { msg: 'Your enrollment is confirmed. Complete payment to finalize.', href: '/enrollment-confirmation' },
  enrolled:             { msg: 'Welcome to ICIT! Check your email for platform access.', href: '/application-status' },
};
```

---

### `initApply()`

1. `session = await requireAuth()`
2. `const [programs, draft] = await Promise.all([loadPrograms(), loadApplication(session)])`
3. If `draft` exists and `draft.status !== 'draft'`, redirect `/dashboard`
4. `revealPage()`
5. Populate `[wized="program-select"]` options from `programs`
6. If `draft`:
   - Pre-fill applicant name fields, email, program select
   - Lock program select and name fields (`disabled = true`) if `draft.locked_fields` contains those keys
   - Show lock message elements
   - Set `applicationId = draft.id`
7. Section stepper: `let currentSection = 1`. `goToSection(n)` hides `apply-section-1/2/3`, shows `apply-section-n`
8. Program change: find selected program in programs list, extract `program_questions` JSONB, clone question-item template per question (set label text, input name = question.id)
9. Save draft buttons: call `saveDraft()`, update `applicationId` from response, show `[wized="form-draft-status"]` for 3s
10. Section advance buttons: `saveDraft()` → on success → `goToSection(next)`
11. CV: file input change → `uploadCV()` → show filename; remove button → `removeCV()`
12. Submit: validate CV uploaded → `submitApplication()` → redirect `/dashboard`

---

### `initStatus()`

1. `session = await requireAuth()`
2. `application = await loadApplication(session)`
3. If `!application` → redirect `/dashboard`; return
4. `events = await loadApplicationHistory(session, application.id)`
5. `revealPage()`
6. Render program name, submitted date
7. Timeline: `STATUS_ORDER = ['draft','submitted','in_review','decision','enrolled']`. Map `application.status` to index in this order (accepted/rejected/waitlisted all map to 'decision'). Add class `timeline-step-done` to `[wized="timeline-step-*"]` elements for each step at or before the current index.
8. Event history: clone template row per event; `setText` event-type-label and event-time
9. More-info section: visible when `events[0]?.event_type === 'more_info_requested'`
   - Show `[wized="admin-notes-msg"]` with `application.admin_notes`
   - If `!application.notes_response`: show textarea + submit button
   - If `application.notes_response`: show `[wized="notes-submitted-confirm"]`, hide submit button
10. Submit notes: `submitNotesResponse()` → `location.reload()`
11. Withdraw: same confirm pattern as dashboard

---

### `initEnrollment()`

1. `session = await requireAuth()`
2. `application = await loadApplication(session)`
3. If `!application` or `application.status` not in `['accepted', 'enrollment_confirmed']` → redirect `/dashboard`
4. `revealPage()`
5. Render program name, tuition (`(price_cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })`), status badge text
6. Confirm button: show `[wized="enroll-processing"]` → `createCheckout()` → `window.location.href = result.url`
7. Error: parse `{error: "..."}` from response → show `[wized="enroll-error-msg"]`

---

## DOM Loop Pattern

Three lists use an identical clone-and-append pattern:

| Page | Template element | Container |
|---|---|---|
| /dashboard notifications | First `[wized="notif-item-msg"]` parent row | That row's `parentElement` |
| /application-status events | First `[wized="event-type-label"]` parent row | That row's `parentElement` |
| /apply questions | First `[wized="question-item"]` row | That row's `parentElement` |

**Pattern:**
1. `const template = /* select template row */`
2. For each data item: `const row = cloneRow(template)` → populate child nodes → `template.parentElement.appendChild(row)`
3. Template remains in DOM, hidden via inline `display: none`

**Constraint:** Template row `display: none` must be set as an **inline style** in Webflow's element settings panel (not via a CSS class). `cloneRow()` clears `clone.style.display = ''` — this removes the inherited inline none and lets the Webflow stylesheet's actual value (flex, grid, block) apply to the clone.

---

## Error Handling

| Scenario | Behavior |
|---|---|
| Sign-in / sign-up failure | Show `[wized="signin-error-msg"]` or `[wized="signup-error-msg"]` with error text |
| API throw (network / unexpected) | Show nearest `[wized="form-error-msg"]`; log error to console |
| CV upload failure | Show error in CV section |
| Edge Function error `{ error: "..." }` | Parse response, show `[wized="enroll-error-msg"]` |
| Session expired mid-session | `onAuthStateChange` SIGNED_OUT → redirect `/login` |
| `loadApplication()` null on protected page requiring data | Redirect `/dashboard` (enrollment page) or show empty-state CTA (dashboard) |

---

## Testing Checklist

### Auth
- [ ] Sign up → redirect dashboard → "Start your application" CTA visible
- [ ] Sign in → redirect dashboard → application card visible (if application exists)
- [ ] Auth flash: no visible page content before auth resolves on protected pages
- [ ] Sign out → redirect login → can't access dashboard without re-auth
- [ ] Session expiry: sign out in separate tab → current tab redirects to login

### Draft & Form (/apply)
- [ ] Load /apply as new user → blank form, no locks
- [ ] Save draft → reload /apply → form pre-filled, program and name locked
- [ ] Section advance saves draft before moving
- [ ] Program change → question list updates to match program's `program_questions`
- [ ] CV upload → filename shown; remove → cleared; upload again → works
- [ ] Submit without CV → blocked (guard fires)
- [ ] Submit with CV → redirect dashboard, status = submitted

### Dashboard
- [ ] New user: CTA shows, no application card
- [ ] Each application status shows correct next-action message and link
- [ ] Notification bell shows unread count; drawer opens; marks all read
- [ ] Withdraw confirm → status = withdrawn; page reloads to withdrawn state
- [ ] `?payment=success` with status `enrollment_confirmed` → polling banner shows
- [ ] Polling resolves to `enrolled` → page reloads, shows enrolled message
- [ ] Polling 30s timeout → static "check back soon" message, query param cleared

### Application Status
- [ ] Timeline highlights correct step for each status value
- [ ] Event history list renders in reverse chronological order
- [ ] More-info section appears only when latest event is `more_info_requested`
- [ ] Notes response textarea enabled, submit works, confirm message shows after
- [ ] Withdraw works same as dashboard

### Enrollment Confirmation
- [ ] Accessing with status != accepted/enrollment_confirmed → redirect dashboard
- [ ] Already enrolled → redirect dashboard
- [ ] Program name, tuition, status badge render correctly
- [ ] Confirm → redirect to Stripe checkout URL
- [ ] Stripe error → error message shown

### Security
- [ ] Anon user can't read another user's application (RLS blocks)
- [ ] Anon user can't read another user's notifications
- [ ] Can't access another user's CV files in storage
- [ ] Edge Function rejects request with no/invalid JWT
