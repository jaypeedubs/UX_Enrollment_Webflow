# Enrollment Frontend Update Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update login, dashboard, apply (3 → 5 steps), and add a submission confirmation page to match the Enrollment Journey prototype, keeping all HTML/CSS in Webflow Designer and all behavior in `src/pages/*.js`.

**Architecture:** Webflow Designer owns every element — JS only queries `wized` attributes, attaches listeners, and calls `show()`/`hide()`/`setText()`. Course selection on the dashboard passes `{ programId, programName }` to the apply page via `sessionStorage` key `icit-selected-course`. No new dependencies, no changes to `src/core/*`.

**Tech Stack:** Vanilla ES modules, esbuild bundle (`npm run build` from project root), Node vm test runner (`node tests/icit-app.test.js`).

---

## File Map

| Action | Path | What changes |
|---|---|---|
| Modify | `tests/icit-app.test.js` | Add `sessionStorage` mock to `createContext`; update login tests; add new tests for all changed pages |
| Modify | `src/pages/login.js` | Replace tab toggle with screen-switch buttons; add confirm-password validation |
| Modify | `src/pages/dashboard.js` | Add `loadPrograms()`, `getCourseColor()`, course card rendering, sessionStorage write |
| Modify | `src/core/ui.js` | Update `applyDesignSystemClasses()` for 5 sections and new button `wized` names |
| Modify | `src/pages/apply.js` | 5-step nav; sessionStorage read; three-branch programId; CV in section 3; `populateReview()` |
| Modify | `src/main.js` | Add `/application-submitted` route |
| Create | `src/pages/submitted.js` | Auth gate; populate program name from sessionStorage |

---

## Webflow Designer Reference

These changes must be made in Webflow Designer **before** the corresponding JS tasks can be tested end-to-end. Each task below that depends on Designer changes calls them out explicitly as the first step.

**Login page:**
- Remove tab bar elements (`wized="tab-signin"`, `wized="tab-signup"`).
- Add `wized="goto-signup"` button to the sign-in header.
- Add `wized="goto-signin"` button to the sign-up header.
- Add `wized="signup-confirm-password"` password input to the sign-up form.
- Keep `wized="signin-section"` and `wized="signup-section"` names unchanged.

**Dashboard page** — inside the `wized="dash-no-application"` block:
- Add container `wized="course-card-list"`.
- Add one hidden template card `wized="course-card-item"` inside the list, containing `wized="course-card-name"` and `wized="course-card-desc"` text nodes.
- Add button `wized="start-application-btn"`.
- Add hidden error text `wized="course-select-error"`.

**Apply page** — replace 3 sections with 5 (all hidden by default):
- `wized="form-section-1"`: Confirm Course — contains `wized="confirm-course-name"`, `wized="confirm-course-desc"`, `wized="change-course-btn"` (Back), `wized="next-section-1-btn"` (Continue).
- `wized="form-section-2"`: Personal Info — contains all existing contact/professional `wized` fields (names unchanged: `applicant-phone`, `applicant-institution`, `applicant-current-role`, `applicant-credentials`, `applicant-address`, `applicant-city`, `applicant-state`, `applicant-zip-code`, `applicant-country`, `applicant-email-consent`). Back: `wized="back-section-2-btn"`. Continue: `wized="next-section-2-btn"`.
- `wized="form-section-3"`: CV Upload — move existing CV elements here (names unchanged: `cv-upload-zone`, `cv-upload-success`, `cv-file-input`, `cv-remove-btn`, `cv-filename`). Back: `wized="back-section-3-btn"`. Continue: `wized="next-section-3-btn"`.
- `wized="form-section-4"`: Program Questions — existing dynamic question elements (names unchanged: `dynamic-questions`, `question-item`, `questions-empty`, `questions-loading`). Back: `wized="back-section-4-btn"`. Continue: `wized="next-section-4-btn"`.
- `wized="form-section-5"`: Review & Submit — CV-style layout. Contains: `wized="review-name"`, `wized="review-contact"`, `wized="review-location"`, `wized="review-role"`, `wized="review-institution"`, `wized="review-credentials"`, `wized="review-program-name"`, `wized="review-questions-host"` (empty container for dynamic Q&A), `wized="form-error-msg"`, `wized="submit-application-btn"`, `wized="back-section-5-btn"`.
- Progress bar: 5 sibling elements `wized="progress-step-1"` through `wized="progress-step-5"`.
- Remove: `wized="program-select"` (course selection moves to dashboard), `wized="save-draft-btn"`, `wized="save-draft-2-btn"`, `wized="save-draft-3-btn"`.

**New Webflow page `/application-submitted`:**
- Logo header (no nav actions).
- `<h1>` "Application Submitted".
- Summary card rows: `wized="submitted-program-name"`, `wized="submitted-status"` (static "Under Review"), `wized="submitted-next-step"` (static "We'll notify you via email").
- `<a href="/dashboard">` Return to Dashboard link (no JS needed).

---

## Task 1: Test harness — add sessionStorage mock + update login tests

**Files:**
- Modify: `tests/icit-app.test.js`

- [ ] **Step 1: Add `sessionStorage` to `createContext`**

In `createContext`, add a `sessionStorage` field to `context` directly before `context.globalThis = context`:

```js
// inside createContext(), before context.globalThis = context
context.sessionStorage = {
  _store: {},
  getItem(key) { return Object.prototype.hasOwnProperty.call(this._store, key) ? this._store[key] : null; },
  setItem(key, val) { this._store[key] = String(val); },
  removeItem(key) { delete this._store[key]; },
};
```

- [ ] **Step 2: Update `testSignUpSendsConfirmationBackToLogin` to remove tab `wized` attrs and add confirm-password**

Replace the elements list in `testSignUpSendsConfirmationBackToLogin`:

```js
async function testSignUpSendsConfirmationBackToLogin() {
  const elements = {};
  [
    '[wized="goto-signin"]',
    '[wized="goto-signup"]',
    '[wized="signin-submit"]',
    '[wized="signup-submit"]',
    '[wized="signin-section"]',
    '[wized="signup-section"]',
    '[wized="signin-error-msg"]',
    '[wized="signin-loading"]',
    '[wized="signup-error-msg"]',
    '[wized="signup-loading"]',
    '[wized="signup-email"]',
    '[wized="signup-password"]',
    '[wized="signup-confirm-password"]',
    '[wized="signup-first-name"]',
    '[wized="signup-last-name"]',
  ].forEach((selector) => {
    elements[selector] = createElement();
  });
  elements['[wized="signup-email"]'].value = 'applicant@example.test';
  elements['[wized="signup-password"]'].value = 'password123';
  elements['[wized="signup-confirm-password"]'].value = 'password123';
  elements['[wized="signup-first-name"]'].value = 'Ada';
  elements['[wized="signup-last-name"]'].value = 'Lovelace';

  const { context, signUpArgs } = createContext({ pathname: '/login', elements });
  vm.runInNewContext(source, context);
  await tick();
  await elements['[wized="signup-submit"]'].click();

  assert.strictEqual(signUpArgs.length, 1);
  assert.strictEqual(signUpArgs[0].options.emailRedirectTo, 'https://example.test/login');
}
```

- [ ] **Step 3: Update `testLoginAuthReturnShowsLoginInsteadOfDashboardRedirect` to remove tab attrs**

Replace the elements list:

```js
async function testLoginAuthReturnShowsLoginInsteadOfDashboardRedirect() {
  const elements = {};
  [
    '[wized="goto-signin"]',
    '[wized="goto-signup"]',
    '[wized="signin-submit"]',
    '[wized="signup-submit"]',
    '[wized="signin-section"]',
    '[wized="signup-section"]',
    '[wized="signin-error-msg"]',
    '[wized="signin-loading"]',
    '[wized="signup-error-msg"]',
    '[wized="signup-loading"]',
  ].forEach((selector) => {
    elements[selector] = createElement();
  });

  const { context, redirects, wrapper } = createContext({
    pathname: '/login',
    hash: '#access_token=token&type=signup',
    session: { user: { id: 'user-1' } },
    elements,
  });
  vm.runInNewContext(source, context);
  await tick();

  assert.deepStrictEqual(redirects, []);
  assert.strictEqual(wrapper.style.visibility, 'visible');
}
```

- [ ] **Step 4: Add `testSignUpRejectsPasswordMismatch`**

Add this new test function before the `(async () => {` runner:

```js
async function testSignUpRejectsPasswordMismatch() {
  const elements = {};
  [
    '[wized="goto-signin"]',
    '[wized="goto-signup"]',
    '[wized="signin-submit"]',
    '[wized="signup-submit"]',
    '[wized="signin-section"]',
    '[wized="signup-section"]',
    '[wized="signin-error-msg"]',
    '[wized="signin-loading"]',
    '[wized="signup-error-msg"]',
    '[wized="signup-loading"]',
    '[wized="signup-email"]',
    '[wized="signup-password"]',
    '[wized="signup-confirm-password"]',
    '[wized="signup-first-name"]',
    '[wized="signup-last-name"]',
  ].forEach((selector) => {
    elements[selector] = createElement();
  });
  elements['[wized="signup-password"]'].value = 'password123';
  elements['[wized="signup-confirm-password"]'].value = 'different456';

  const { context, signUpArgs } = createContext({ pathname: '/login', elements });
  vm.runInNewContext(source, context);
  await tick();
  await elements['[wized="signup-submit"]'].click();

  assert.strictEqual(signUpArgs.length, 0, 'signUp must not be called when passwords do not match');
}
```

- [ ] **Step 5: Register the new test in the runner**

Add `await testSignUpRejectsPasswordMismatch();` to the `(async () => {` block, before `process.stdout.write`.

- [ ] **Step 6: Build and run — expect failures**

```bash
npm run build && node tests/icit-app.test.js
```

Expected: failures on `testSignUpSendsConfirmationBackToLogin` and `testLoginAuthReturnShowsLoginInsteadOfDashboardRedirect` because login.js still has tab logic. `testSignUpRejectsPasswordMismatch` also fails. Note the exact error messages.

---

## Task 2: `login.js` — screen-switch + confirm password

**Files:**
- Modify: `src/pages/login.js`

**Webflow Designer prerequisite:** Complete the login page Designer changes listed in the Webflow Designer Reference section above before testing end-to-end in the browser.

- [ ] **Step 1: Replace `login.js` with the screen-switch version**

Replace the entire file contents:

```js
import { requireGuest, completeLoginAuthReturn, signIn, signUp } from '../core/auth.js';
import { q, show, hide, setText, revealPage } from '../core/ui.js';

export async function initLogin() {
  const completedAuthReturn = await completeLoginAuthReturn();
  if (!completedAuthReturn) await requireGuest();

  const signinSection = q('[wized="signin-section"]');
  const signupSection = q('[wized="signup-section"]');

  if (!signinSection || !signupSection) {
    console.warn('ICIT login page is missing signin/signup section wized attributes.');
    revealPage();
    return;
  }

  // Default: show sign-in, hide sign-up
  show(signinSection);
  signinSection.classList.remove('auth-form-hidden');
  hide(signupSection);
  signupSection.classList.add('auth-form-hidden');

  hide(q('[wized="signin-error-msg"]'));
  hide(q('[wized="signin-loading"]'));
  hide(q('[wized="signup-error-msg"]'));
  hide(q('[wized="signup-loading"]'));

  if (completedAuthReturn) {
    setText(q('[wized="signin-error-msg"]'), 'Email confirmed. Please sign in.');
    show(q('[wized="signin-error-msg"]'));
  }

  revealPage();

  const gotoSignup = q('[wized="goto-signup"]');
  if (gotoSignup) gotoSignup.addEventListener('click', (e) => {
    e.preventDefault();
    hide(signinSection);
    signinSection.classList.add('auth-form-hidden');
    show(signupSection);
    signupSection.classList.remove('auth-form-hidden');
  });

  const gotoSignin = q('[wized="goto-signin"]');
  if (gotoSignin) gotoSignin.addEventListener('click', (e) => {
    e.preventDefault();
    hide(signupSection);
    signupSection.classList.add('auth-form-hidden');
    show(signinSection);
    signinSection.classList.remove('auth-form-hidden');
  });

  const signinSubmitEl = q('[wized="signin-submit"]');
  if (signinSubmitEl) signinSubmitEl.addEventListener('click', async (e) => {
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

  const signupSubmitEl = q('[wized="signup-submit"]');
  if (signupSubmitEl) signupSubmitEl.addEventListener('click', async (e) => {
    e.preventDefault();
    hide(q('[wized="signup-error-msg"]'));
    const password = q('[wized="signup-password"]').value;
    const confirmEl = q('[wized="signup-confirm-password"]');
    if (confirmEl && confirmEl.value !== password) {
      setText(q('[wized="signup-error-msg"]'), 'Passwords do not match. Please try again.');
      show(q('[wized="signup-error-msg"]'));
      return;
    }
    show(q('[wized="signup-loading"]'));
    try {
      const session = await signUp(
        q('[wized="signup-email"]').value.trim(),
        password,
        q('[wized="signup-first-name"]').value.trim(),
        q('[wized="signup-last-name"]').value.trim(),
      );
      if (session) {
        window.location.href = '/dashboard';
      } else {
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
```

- [ ] **Step 2: Build and run tests — expect pass**

```bash
npm run build && node tests/icit-app.test.js
```

Expected: `icit-app tests passed`

- [ ] **Step 3: Commit**

```bash
git add src/pages/login.js tests/icit-app.test.js
git commit -m "$(cat <<'EOF'
feat: update login page to screen-switch pattern with confirm password

Replaces tab toggle (tab-signin/tab-signup) with separate screen layouts
toggled by header buttons (goto-signin/goto-signup). Adds confirm-password
validation before calling signUp.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: `dashboard.js` — program loading + course card rendering

**Files:**
- Modify: `src/pages/dashboard.js`
- Modify: `tests/icit-app.test.js`

**Webflow Designer prerequisite:** Complete the dashboard Designer changes (course-card-list, course-card-item template, start-application-btn, course-select-error) inside `dash-no-application`.

- [ ] **Step 1: Add programs mock to `testDashboardRendersWhenNotificationsFail`**

The test's `from()` will now receive `'programs'` as well. Update it to return an empty programs list:

```js
// In testDashboardRendersWhenNotificationsFail, replace the from() function:
from(table) {
  if (table === 'applications') {
    return {
      select() { return this; },
      eq() { return this; },
      order() { return this; },
      async maybeSingle() { return { data: null, error: null }; },
    };
  }
  if (table === 'notifications') {
    return {
      select() { return this; },
      eq() { return this; },
      async order() { return { data: null, error: new Error('permission denied') }; },
    };
  }
  if (table === 'programs') {
    return {
      select() { return this; },
      in() { return this; },
      order() { return this; },
      async then(resolve) { resolve({ data: [], error: null }); },
    };
  }
  throw new Error('Unexpected table: ' + table);
},
```

Wait — the Supabase client uses promise chaining. The query builder returns a thenable. Update the programs mock to be thenable:

```js
if (table === 'programs') {
  const result = { data: [], error: null };
  const chain = {
    select() { return this; },
    in() { return this; },
    order() { return this; },
    then(resolve, reject) { return Promise.resolve(result).then(resolve, reject); },
  };
  return chain;
}
```

- [ ] **Step 2: Add `testDashboardCourseSelectionWritesSessionStorage`**

Add before the `(async () => {` runner:

```js
async function testDashboardCourseSelectionWritesSessionStorage() {
  const progId = 'prog-uuid-1';
  const progName = 'Advanced Surgeons Course';

  const elements = {
    '[wized="dash-loading"]': createElement(),
    '[wized="dash-no-application"]': createElement(),
    '[wized="dash-application"]': createElement(),
    '[wized="start-application-link"]': createElement(),
    '[wized="withdraw-btn"]': createElement(),
  };

  // course-card-list and template
  const cardList = createElement();
  cardList.querySelectorAll = () => [];
  const cardTemplate = createElement();
  cardTemplate.parentElement = cardList;
  const cardNameEl = createElement();
  const cardDescEl = createElement();
  cardTemplate.querySelector = (sel) => {
    if (sel === '[wized="course-card-name"]') return cardNameEl;
    if (sel === '[wized="course-card-desc"]') return cardDescEl;
    return null;
  };
  elements['[wized="course-card-list"]'] = cardList;
  elements['[wized="course-card-item"]'] = cardTemplate;

  const startBtn = createElement();
  elements['[wized="start-application-btn"]'] = startBtn;

  const makePrograms = () => {
    const result = { data: [{ id: progId, name: progName, price_cents: 0 }], error: null };
    return {
      select() { return this; },
      in() { return this; },
      order() { return this; },
      then(resolve, reject) { return Promise.resolve(result).then(resolve, reject); },
    };
  };

  const { context, redirects } = createContext({
    pathname: '/dashboard',
    session: { user: { id: 'user-1', user_metadata: {} } },
    from(table) {
      if (table === 'applications') {
        return {
          select() { return this; },
          eq() { return this; },
          order() { return this; },
          async maybySingle() { return { data: null, error: null }; },
          // dashboard now calls loadApplications which returns array
          async then(resolve) {
            resolve({ data: [], error: null });
          },
        };
      }
      if (table === 'notifications') {
        return {
          select() { return this; },
          eq() { return this; },
          async order() { return { data: [], error: null }; },
        };
      }
      if (table === 'programs') return makePrograms();
      throw new Error('Unexpected table: ' + table);
    },
    elements,
  });
  vm.runInNewContext(source, context);
  await tick();

  // Simulate selecting a course card then clicking Continue
  // (card click listener is attached inside initDashboard after clone;
  //  we verify the startBtn listener writes to sessionStorage on click)
  // Directly invoke startBtn click to verify the guard fires when no card selected
  await startBtn.click();
  assert.strictEqual(context.sessionStorage.getItem('icit-selected-course'), null,
    'sessionStorage must remain empty when no course selected');
}
```

Note: Full integration of card selection requires real DOM clone manipulation beyond what the vm mock supports. The test above verifies the guard. Full course-selection → sessionStorage flow is verified manually in the browser after Designer changes.

- [ ] **Step 3: Register the new test**

Add `await testDashboardCourseSelectionWritesSessionStorage();` to the runner block before `process.stdout.write`.

- [ ] **Step 4: Build and run — expect failure**

```bash
npm run build && node tests/icit-app.test.js
```

Expected: failure on `testDashboardCourseSelectionWritesSessionStorage` because `dashboard.js` doesn't load programs yet. Note the error.

- [ ] **Step 5: Update `dashboard.js` — add `loadPrograms`, `getCourseColor`, course card block**

Add `loadPrograms` and `getCourseColor` after the existing `withdrawApplication` function (around line 67):

```js
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
```

- [ ] **Step 6: Update `initDashboard` to load programs in parallel**

Change the top of `initDashboard` from:

```js
export async function initDashboard() {
  const session = await requireAuth();

  const applications = await loadApplications(session);
  ...
  const notifications = await loadNotifications(session).catch((err) => {
    console.warn('ICIT notifications failed to load:', err);
    return [];
  });
```

To:

```js
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
```

- [ ] **Step 7: Add course card block inside the `!active` branch**

At the end of the `if (!active) {` block, after `revealPage()`, add:

```js
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
```

- [ ] **Step 8: Build and run tests — expect pass**

```bash
npm run build && node tests/icit-app.test.js
```

Expected: `icit-app tests passed`

- [ ] **Step 9: Commit**

```bash
git add src/pages/dashboard.js tests/icit-app.test.js
git commit -m "$(cat <<'EOF'
feat: add course selection to dashboard with sessionStorage handoff

Renders active programs as clickable course cards; selected course ID and
name are written to sessionStorage before navigating to /apply.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: `ui.js` + `apply.js` — navigation scaffolding for 5 steps

**Files:**
- Modify: `src/core/ui.js`
- Modify: `src/pages/apply.js`

**Webflow Designer prerequisite:** Complete the apply page Designer changes (5 sections, 5 progress-step elements, new button names) before browser testing. The JS changes here don't require Designer changes to pass unit tests.

- [ ] **Step 1: Update `applyDesignSystemClasses()` in `ui.js`**

Replace the entire `applyDesignSystemClasses` function body:

```js
export function applyDesignSystemClasses() {
  // Section wrappers 1–5 → card style
  [1, 2, 3, 4, 5].forEach((n) => {
    const sec = q('[wized="form-section-' + n + '"]');
    if (!sec) return;
    sec.classList.add('form-section');
    const header = sec.firstElementChild;
    if (header && header.tagName === 'DIV') {
      header.classList.add('section-header-1');
      const spans = Array.from(header.querySelectorAll(':scope > span'));
      if (spans[0]) spans[0].classList.add('section-num');
      if (spans[1]) spans[1].classList.add('section-title');
    }
  });

  // Form inputs in sections 2 and 4 (personal info + program questions)
  document.querySelectorAll(
    '[wized="form-section-2"] .w-input:not([type="file"]),' +
    '[wized="form-section-4"] .w-input:not([type="file"]),' +
    '[wized="form-section-2"] select,' +
    '[wized="form-section-4"] select'
  ).forEach((el) => el.classList.add('form-input-1'));

  // Labels in sections 2 and 4
  document.querySelectorAll(
    '[wized="form-section-2"] label,' +
    '[wized="form-section-4"] label'
  ).forEach((el) => { if (!el.classList.contains('form-label')) el.classList.add('form-label'); });

  // Button → design-system class map
  const btnMap = {
    'change-course-btn':    'btn-ghost-1',
    'next-section-1-btn':   'btn-primary-1-2',
    'back-section-2-btn':   'btn-ghost-1',
    'next-section-2-btn':   'btn-primary-1-2',
    'back-section-3-btn':   'btn-ghost-1',
    'next-section-3-btn':   'btn-primary-1-2',
    'back-section-4-btn':   'btn-ghost-1',
    'next-section-4-btn':   'btn-primary-1-2',
    'back-section-5-btn':   'btn-ghost-1',
    'submit-application-btn': 'btn-submit',
  };
  Object.keys(btnMap).forEach((wid) => {
    const el = q('[wized="' + wid + '"]');
    if (el) el.classList.add(btnMap[wid]);
  });

  // CV upload zone (section 3)
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
  const removeBtn = q('[wized="cv-remove-btn"]');
  if (removeBtn) removeBtn.classList.add('btn-danger-1');
}
```

- [ ] **Step 2: Update `goToSection` and `updateApplyStepper` in `apply.js`**

Replace `goToSection` (currently lines ~251–258):

```js
function goToSection(n) {
  for (let i = 1; i <= 5; i++) {
    hide(q('[wized="form-section-' + i + '"]'));
  }
  show(q('[wized="form-section-' + n + '"]'));
  currentSection = n;
  updateApplyStepper(n);
}
```

Replace `updateApplyStepper` (currently lines ~139–151):

```js
function updateApplyStepper(sectionNumber) {
  for (let i = 1; i <= 5; i++) {
    const step = q('[wized="progress-step-' + i + '"]');
    if (!step) continue;
    step.classList.remove('completed', 'current');
    if (i < sectionNumber) step.classList.add('completed');
    else if (i === sectionNumber) step.classList.add('current');
  }
}
```

- [ ] **Step 3: Build and run tests**

```bash
npm run build && node tests/icit-app.test.js
```

Expected: `icit-app tests passed` (existing apply test still passes — Supabase throws → `initPage` catches → `revealPage()`)

- [ ] **Step 4: Commit**

```bash
git add src/core/ui.js src/pages/apply.js
git commit -m "$(cat <<'EOF'
refactor: update apply stepper and design-system wiring for 5 sections

goToSection and updateApplyStepper now handle 5 steps. applyDesignSystemClasses
updated for new section structure and button wized names.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: `apply.js` — sessionStorage init + section 1 (confirm course)

**Files:**
- Modify: `src/pages/apply.js`
- Modify: `tests/icit-app.test.js`

- [ ] **Step 1: Add `testApplyRedirectsToDashboardWhenNoCourseSelected`**

Add before the runner:

```js
async function testApplyRedirectsToDashboardWhenNoCourseSelected() {
  const { context, redirects } = createContext({
    pathname: '/apply',
    session: { user: { id: 'user-1', user_metadata: {} } },
    from(table) {
      if (table === 'applications') {
        return {
          select() { return this; },
          eq() { return this; },
          order() { return this; },
          limit() { return this; },
          async maybeSingle() { return { data: null, error: null }; },
        };
      }
      if (table === 'programs') {
        const chain = {
          select() { return this; },
          in() { return this; },
          then(resolve, reject) { return Promise.resolve({ data: [], error: null }).then(resolve, reject); },
        };
        return chain;
      }
      throw new Error('Unexpected table: ' + table);
    },
  });
  // sessionStorage is empty (no icit-selected-course) and no draft
  vm.runInNewContext(source, context);
  await tick();

  assert.ok(redirects.includes('/dashboard'), 'must redirect to /dashboard when no course in sessionStorage and no draft');
}
```

Register: `await testApplyRedirectsToDashboardWhenNoCourseSelected();`

- [ ] **Step 2: Build and run — expect failure on the new test**

```bash
npm run build && node tests/icit-app.test.js
```

Expected: `testApplyRedirectsToDashboardWhenNoCourseSelected` fails because apply.js currently doesn't read sessionStorage.

- [ ] **Step 3: Replace the program-loading and init logic in `apply.js`**

At the top of `initApply`, replace from the start of the function through `revealPage()` and `applyDesignSystemClasses()`:

```js
export async function initApply() {
  const session = await requireAuth();

  const [programs, draft] = await Promise.all([
    loadPrograms(),
    loadApplication(session),
  ]);

  if (draft && draft.status !== 'draft') {
    window.location.href = '/dashboard';
    return;
  }

  // ── Determine programId (three-branch) ──────────────────────────────────────
  // Branch 1: sessionStorage present (new application from dashboard course select)
  // Branch 2: sessionStorage absent but draft has program_id (returning to existing draft)
  // Branch 3: neither → redirect to dashboard
  let programId = null;
  let programName = '';

  const cachedCourse = sessionStorage.getItem('icit-selected-course');
  if (cachedCourse) {
    try {
      const parsed = JSON.parse(cachedCourse);
      programId = parsed.programId || null;
      programName = parsed.programName || '';
    } catch (_) {}
  }

  if (!programId && draft && draft.program_id) {
    programId = draft.program_id;
    programName = draft.programs?.name || '';
  }

  if (!programId) {
    window.location.href = '/dashboard';
    return;
  }

  revealPage();
  applyDesignSystemClasses();

  let applicationId = draft ? draft.id : null;
  let cvUploaded = !!(draft && draft.cv_url);
  let currentSection = 1;
  let programAnswers = {};
```

- [ ] **Step 4: Wire section 1 (confirm course) elements**

After the variable declarations above, add the section 1 pre-fill logic before the existing `goToSection(1)` call:

```js
  // Section 1: pre-fill course name and description
  setText(q('[wized="confirm-course-name"]'), programName);
  const prog = programs.find((p) => p.id === programId);
  // (description field is optional — show if present)
  setText(q('[wized="confirm-course-desc"]'), prog ? (prog.description || '') : '');

  const changeCourseBtn = q('[wized="change-course-btn"]');
  if (changeCourseBtn) changeCourseBtn.addEventListener('click', (e) => {
    e.preventDefault();
    sessionStorage.removeItem('icit-selected-course');
    window.location.href = '/dashboard';
  });

  goToSection(1);
```

Remove the existing `goToSection(1)` call that was already in the file (it's now above).

- [ ] **Step 5: Remove program select dropdown logic and update `collectFields()`**

Delete the block that populated `programSelect` (the `const programSelect = q('[wized="program-select"]')` block and its associated `programSelect.addEventListener('change', ...)` call near the bottom of `initApply`).

Then update `collectFields()` to read `programId` from the closure variable instead of from the removed select element:

```js
function collectFields() {
  return {
    id: applicationId,
    programId: programId,   // closure variable set during init, replaces programSelect.value
    firstName: (q('[wized="applicant-first-name"]') || {}).value || '',
    lastName: (q('[wized="applicant-last-name"]') || {}).value || '',
    programAnswers: Object.keys(programAnswers).length ? programAnswers : undefined,
    emailConsent: !!(q('[wized="applicant-email-consent"]') || {}).checked,
    phone: (q('[wized="applicant-phone"]') || {}).value || '',
    address: (q('[wized="applicant-address"]') || {}).value || '',
    city: (q('[wized="applicant-city"]') || {}).value || '',
    state: (q('[wized="applicant-state"]') || {}).value || '',
    zipCode: (q('[wized="applicant-zip-code"]') || {}).value || '',
    country: (q('[wized="applicant-country"]') || {}).value || '',
    credentials: (q('[wized="applicant-credentials"]') || {}).value || '',
    currentRole: (q('[wized="applicant-current-role"]') || {}).value || '',
    institution: (q('[wized="applicant-institution"]') || {}).value || '',
  };
}
```

- [ ] **Step 6: Build and run tests — expect pass**

```bash
npm run build && node tests/icit-app.test.js
```

Expected: `icit-app tests passed`

- [ ] **Step 7: Commit**

```bash
git add src/pages/apply.js tests/icit-app.test.js
git commit -m "$(cat <<'EOF'
feat: apply page reads course from sessionStorage with three-branch init

Redirects to /dashboard if no course selected and no draft. Pre-fills
section 1 confirm-course-name/desc. Change Course clears sessionStorage.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: `apply.js` — section navigation + CV in section 3

**Files:**
- Modify: `src/pages/apply.js`

- [ ] **Step 1: Replace all section button listeners**

Remove the old section button listeners (the blocks starting with `const saveDraftBtn`, `const nextSection1Btn`, `const saveDraft2Btn`, `const backSection2Btn`, `const nextSection2Btn`, `const saveDraft3Btn`, `const backSection3Btn`, and the submit listener).

Replace with the new 5-section listeners:

```js
  // ── Section 2: Personal Info ────────────────────────────────────────────────
  const nextSection1Btn = q('[wized="next-section-1-btn"]');
  if (nextSection1Btn) nextSection1Btn.addEventListener('click', (e) => {
    e.preventDefault();
    goToSection(2);
  });

  // Pre-fill personal info from draft
  if (draft) {
    const meta = session.user.user_metadata || {};
    if (q('[wized="applicant-first-name"]')) q('[wized="applicant-first-name"]').value = meta.first_name || '';
    if (q('[wized="applicant-last-name"]')) q('[wized="applicant-last-name"]').value = meta.last_name || '';
    if (q('[wized="applicant-email"]')) q('[wized="applicant-email"]').value = session.user.email || '';
    if (q('[wized="applicant-email-consent"]')) q('[wized="applicant-email-consent"]').checked = !!draft.email_consent;
    if (q('[wized="applicant-phone"]')) q('[wized="applicant-phone"]').value = draft.phone || '';
    if (q('[wized="applicant-address"]')) q('[wized="applicant-address"]').value = draft.address || '';
    if (q('[wized="applicant-city"]')) q('[wized="applicant-city"]').value = draft.city || '';
    if (q('[wized="applicant-state"]')) q('[wized="applicant-state"]').value = draft.state || '';
    if (q('[wized="applicant-zip-code"]')) q('[wized="applicant-zip-code"]').value = draft.zip_code || '';
    if (q('[wized="applicant-country"]')) q('[wized="applicant-country"]').value = draft.country || '';
    if (q('[wized="applicant-credentials"]')) q('[wized="applicant-credentials"]').value = draft.credentials || '';
    if (q('[wized="applicant-current-role"]')) q('[wized="applicant-current-role"]').value = draft.current_role || '';
    if (q('[wized="applicant-institution"]')) q('[wized="applicant-institution"]').value = draft.institution || '';
  }
  if (q('[wized="applicant-email"]')) {
    q('[wized="applicant-email"]').value = session.user.email || '';
    q('[wized="applicant-email"]').disabled = true;
  }

  const backSection2Btn = q('[wized="back-section-2-btn"]');
  if (backSection2Btn) backSection2Btn.addEventListener('click', (e) => {
    e.preventDefault();
    goToSection(1);
  });

  const nextSection2Btn = q('[wized="next-section-2-btn"]');
  if (nextSection2Btn) nextSection2Btn.addEventListener('click', async (e) => {
    e.preventDefault();
    hide(q('[wized="form-error-msg"]'));
    try { await doSaveDraft(); goToSection(3); } catch (err) {
      setText(q('[wized="form-error-msg"]'), err.message || 'Please complete this section before continuing.');
      show(q('[wized="form-error-msg"]'));
    }
  });

  // ── Section 3: CV Upload ─────────────────────────────────────────────────────
  syncCvUi();

  const backSection3Btn = q('[wized="back-section-3-btn"]');
  if (backSection3Btn) backSection3Btn.addEventListener('click', (e) => {
    e.preventDefault();
    goToSection(2);
  });

  const nextSection3Btn = q('[wized="next-section-3-btn"]');
  if (nextSection3Btn) nextSection3Btn.addEventListener('click', (e) => {
    e.preventDefault();
    goToSection(4);
  });

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
      setText(q('[wized="cv-filename"]'), file.name);
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
      setText(q('[wized="cv-filename"]'), '');
      setCvProgress(0);
    } catch (err) { console.error(err); }
  });

  // ── Section 4: Program Questions ─────────────────────────────────────────────
  if (draft && draft.program_id) {
    renderQuestions(draft.program_id, draft.program_answers);
    if (draft.program_answers && typeof draft.program_answers === 'object') {
      programAnswers = Object.assign({}, draft.program_answers);
      Object.entries(draft.program_answers).forEach(([id, val]) => {
        const input = q('[data-question-id="' + id + '"]');
        if (input) input.value = val;
      });
    }
  } else {
    renderQuestions(programId, {});
  }

  const backSection4Btn = q('[wized="back-section-4-btn"]');
  if (backSection4Btn) backSection4Btn.addEventListener('click', (e) => {
    e.preventDefault();
    goToSection(3);
  });

  const nextSection4Btn = q('[wized="next-section-4-btn"]');
  if (nextSection4Btn) nextSection4Btn.addEventListener('click', async (e) => {
    e.preventDefault();
    hide(q('[wized="form-error-msg"]'));
    try {
      await doSaveDraft();
      populateReview(session, programId, programName, programAnswers, programs);
      goToSection(5);
    } catch (err) {
      setText(q('[wized="form-error-msg"]'), err.message || 'Please complete this section before continuing.');
      show(q('[wized="form-error-msg"]'));
    }
  });
```

- [ ] **Step 2: Build and run tests**

```bash
npm run build && node tests/icit-app.test.js
```

Expected: `icit-app tests passed`

- [ ] **Step 3: Commit**

```bash
git add src/pages/apply.js
git commit -m "$(cat <<'EOF'
feat: wire 5-section navigation and move CV upload to section 3

Sections 1-4 back/continue buttons wired. CV upload is now in section 3.
Draft pre-fill updated for new section structure.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: `apply.js` — section 5 review + submit

**Files:**
- Modify: `src/pages/apply.js`

- [ ] **Step 1: Add `populateReview` function**

Add before `initApply`:

```js
function populateReview(session, programId, programName, programAnswers, programs) {
  const meta = session.user.user_metadata || {};
  const firstName = meta.first_name || '';
  const lastName  = meta.last_name  || '';

  setText(q('[wized="review-name"]'),        [firstName, lastName].filter(Boolean).join(' '));
  setText(q('[wized="review-contact"]'),      [
    q('[wized="applicant-phone"]')?.value,
    session.user.email,
  ].filter(Boolean).join(' • '));
  setText(q('[wized="review-location"]'),     [
    q('[wized="applicant-city"]')?.value,
    q('[wized="applicant-state"]')?.value,
    q('[wized="applicant-zip-code"]')?.value,
    q('[wized="applicant-country"]')?.value,
  ].filter(Boolean).join(', '));
  setText(q('[wized="review-role"]'),         q('[wized="applicant-current-role"]')?.value || '');
  setText(q('[wized="review-institution"]'),  q('[wized="applicant-institution"]')?.value || '');
  setText(q('[wized="review-credentials"]'),  q('[wized="applicant-credentials"]')?.value || '');
  setText(q('[wized="review-program-name"]'), programName);

  // Dynamic program Q&A
  const host = q('[wized="review-questions-host"]');
  if (host) {
    host.innerHTML = '';
    const prog = programs.find((p) => p.id === programId);
    const questions = normalizeQuestions(prog && prog.program_questions);
    questions.forEach((question) => {
      const answer = programAnswers[question.id] || '—';
      const entry = document.createElement('div');
      entry.className = 'cv-entry';
      entry.innerHTML =
        '<p class="cv-question">' + escapeHtml(question.label || question.id) + '</p>' +
        '<p class="cv-answer">' + escapeHtml(answer) + '</p>';
      host.appendChild(entry);
    });
  }
}
```

Note: `escapeHtml` is imported from `../core/ui.js` — add it to the import line at the top of `apply.js`.

- [ ] **Step 2: Update the import line in `apply.js`**

Change:

```js
import { q, show, hide, setText, setCvProgress, revealPage, applyDesignSystemClasses } from '../core/ui.js';
```

To:

```js
import { q, show, hide, setText, setCvProgress, revealPage, applyDesignSystemClasses, escapeHtml } from '../core/ui.js';
```

- [ ] **Step 3: Add section 5 button listeners + submit**

After the section 4 listeners block, add:

```js
  // ── Section 5: Review & Submit ───────────────────────────────────────────────
  const backSection5Btn = q('[wized="back-section-5-btn"]');
  if (backSection5Btn) backSection5Btn.addEventListener('click', (e) => {
    e.preventDefault();
    goToSection(4);
  });

  const submitAppBtn = q('[wized="submit-application-btn"]');
  if (submitAppBtn) submitAppBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    hide(q('[wized="form-error-msg"]'));
    if (!cvUploaded) {
      goToSection(3);
      setText(q('[wized="form-error-msg"]'), 'Please upload your CV before submitting.');
      show(q('[wized="form-error-msg"]'));
      return;
    }
    try {
      await doSaveDraft();
      await submitApplication(session, applicationId);
      sessionStorage.removeItem('icit-selected-course');
      window.location.href = '/application-submitted';
    } catch (err) {
      console.error('Submit failed:', err);
      setText(q('[wized="form-error-msg"]'), err.message || 'Submission failed. Please try again.');
      show(q('[wized="form-error-msg"]'));
    }
  });
```

- [ ] **Step 4: Build and run tests**

```bash
npm run build && node tests/icit-app.test.js
```

Expected: `icit-app tests passed`

- [ ] **Step 5: Commit**

```bash
git add src/pages/apply.js
git commit -m "$(cat <<'EOF'
feat: add review population and submit redirect to /application-submitted

populateReview() populates CV-style review section from form state. Submit
clears sessionStorage and navigates to /application-submitted on success.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: `submitted.js` + `main.js` — application submitted page

**Files:**
- Create: `src/pages/submitted.js`
- Modify: `src/main.js`
- Modify: `tests/icit-app.test.js`

**Webflow Designer prerequisite:** Create the `/application-submitted` Webflow page with elements listed in the Webflow Designer Reference section.

- [ ] **Step 1: Add `testSubmittedPagePopulatesProgramName` test**

Add before the runner:

```js
async function testSubmittedPagePopulatesProgramName() {
  const programNameEl = createElement();
  const elements = {
    '[wized="submitted-program-name"]': programNameEl,
  };

  const { context } = createContext({
    pathname: '/application-submitted',
    session: { user: { id: 'user-1' } },
    elements,
  });
  context.sessionStorage.setItem(
    'icit-selected-course',
    JSON.stringify({ programId: 'prog-1', programName: 'Advanced Surgeons Course' }),
  );

  vm.runInNewContext(source, context);
  await tick();

  assert.strictEqual(programNameEl.textContent, 'Advanced Surgeons Course');
  assert.strictEqual(
    context.sessionStorage.getItem('icit-selected-course'),
    null,
    'sessionStorage must be cleared after reading program name',
  );
}
```

Register: `await testSubmittedPagePopulatesProgramName();`

- [ ] **Step 2: Build and run — expect failure**

```bash
npm run build && node tests/icit-app.test.js
```

Expected: failure on `testSubmittedPagePopulatesProgramName` — route not registered.

- [ ] **Step 3: Create `src/pages/submitted.js`**

```js
import { requireAuth } from '../core/auth.js';
import { db } from '../core/supabase.js';
import { q, setText, revealPage } from '../core/ui.js';

export async function initSubmitted() {
  const session = await requireAuth();

  let programName = '';
  const cached = sessionStorage.getItem('icit-selected-course');
  if (cached) {
    try { programName = JSON.parse(cached).programName || ''; } catch (_) {}
    sessionStorage.removeItem('icit-selected-course');
  }

  if (!programName) {
    // Fallback: read program name from most recent submitted application
    const { data } = await db
      .from('applications')
      .select('programs ( name )')
      .eq('applicant_id', session.user.id)
      .eq('status', 'submitted')
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    programName = data?.programs?.name || '';
  }

  setText(q('[wized="submitted-program-name"]'), programName);
  revealPage();
}
```

- [ ] **Step 4: Update `main.js` — import and register route**

Add import after the existing imports:

```js
import { initSubmitted } from './pages/submitted.js';
```

Add route at the end of the dispatcher:

```js
else if (path === '/application-submitted') initPage('application-submitted', initSubmitted);
```

- [ ] **Step 5: Build and run tests — expect pass**

```bash
npm run build && node tests/icit-app.test.js
```

Expected: `icit-app tests passed`

- [ ] **Step 6: Commit**

```bash
git add src/pages/submitted.js src/main.js tests/icit-app.test.js
git commit -m "$(cat <<'EOF'
feat: add application-submitted page with program name from sessionStorage

New initSubmitted() reads programName from sessionStorage and clears it.
Falls back to Supabase query if sessionStorage is empty.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Manual Test Checklist

After all 8 tasks are complete and Webflow Designer changes are published:

**Login:**
- [ ] Sign-in screen shows by default; "Sign Up" header button switches to sign-up screen
- [ ] Sign-up screen's "Sign In" button switches back to sign-in screen
- [ ] Sign-up with mismatched passwords shows error and does not create account
- [ ] Sign-up with matching passwords creates account (or sends confirmation email)
- [ ] Sign-in with valid credentials redirects to dashboard

**Dashboard:**
- [ ] Course cards render from Supabase programs table
- [ ] Clicking a card highlights it
- [ ] Continue without selecting a card shows inline error
- [ ] Continue with a selected card navigates to /apply and passes course name to section 1

**Apply:**
- [ ] Section 1 shows selected course name and description
- [ ] Change Course returns to dashboard and clears sessionStorage
- [ ] Continue to section 2 → personal info fields visible
- [ ] Continue from section 2 saves draft; section 3 shows CV upload
- [ ] CV upload/remove works in section 3
- [ ] Continue from section 3 → program questions
- [ ] Continue from section 4 saves draft; section 5 shows populated review
- [ ] Submit without CV sends user back to section 3 with error
- [ ] Submit with CV → navigates to /application-submitted
- [ ] Navigating to /apply without sessionStorage (and no draft) → redirects to dashboard

**Submitted page:**
- [ ] Program name displays correctly
- [ ] Refreshing the page (sessionStorage cleared) → program name comes from Supabase fallback or is empty
- [ ] "Return to Dashboard" link works
