const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const source = fs.readFileSync('dist/icit-app.bundle.js', 'utf8');

function createElement() {
  const listeners = {};
  return {
    style: { visibility: 'hidden', display: '' },
    classList: {
      add() {},
      remove() {},
    },
    value: '',
    textContent: '',
    href: '',
    addEventListener(type, handler) {
      listeners[type] = handler;
    },
    click() {
      if (listeners.click) return listeners.click({ preventDefault() {} });
    },
  };
}

function createContext({
  pathname = '/login',
  search = '',
  hash = '',
  session = null,
  elements = {},
  from,
} = {}) {
  const wrapper = createElement();
  const signUpArgs = [];
  const redirects = [];
  const logs = [];
  const context = {
    console: {
      log: (...args) => logs.push(['log', ...args]),
      warn: (...args) => logs.push(['warn', ...args]),
      error: (...args) => logs.push(['error', ...args]),
    },
    setTimeout,
    URLSearchParams,
    window: {
      location: {
        pathname,
        search,
        hash,
        origin: 'https://example.test',
        get href() {
          return redirects[redirects.length - 1] || '';
        },
        set href(value) {
          redirects.push(value);
        },
      },
      history: { replaceState() {} },
      supabase: {
        createClient() {
          return {
            auth: {
              onAuthStateChange() {},
              async getSession() {
                return { data: { session } };
              },
              async signOut() {
                return { error: null };
              },
              async signUp(args) {
                signUpArgs.push(args);
                return { data: { session: null }, error: null };
              },
            },
            from,
          };
        },
      },
    },
    getComputedStyle(el) { return el.style || { display: '' }; },
    NodeFilter: { SHOW_TEXT: 4 },
    document: {
      head: { appendChild() {} },
      createElement() {
        const listeners = {};
        return {
          textContent: '',
          style: {},
          dataset: {},
          classList: { add() {}, remove() {} },
          appendChild() {},
          insertBefore() {},
          replaceChildren() {},
          replaceWith() {},
          firstChild: null,
          querySelector() { return null; },
          querySelectorAll() { return []; },
          addEventListener(type, handler) { listeners[type] = handler; },
          click() { if (listeners.click) listeners.click({ preventDefault() {} }); },
        };
      },
      createElementNS(_ns, _tag) {
        return {
          textContent: '',
          style: {},
          dataset: {},
          classList: { add() {}, remove() {} },
          appendChild() {},
          setAttribute() {},
          getAttribute() { return ''; },
          querySelector() { return null; },
          querySelectorAll() { return []; },
        };
      },
      querySelectorAll() { return []; },
      getElementById(id) {
        return id === 'icit-page-wrapper' ? wrapper : null;
      },
      querySelector(selector) {
        return elements[selector] || null;
      },
    },
  };

  context.sessionStorage = {
    _store: {},
    getItem(key) { return Object.prototype.hasOwnProperty.call(this._store, key) ? this._store[key] : null; },
    setItem(key, val) { this._store[key] = String(val); },
    removeItem(key) { delete this._store[key]; },
  };
  context.globalThis = context;
  context.location = context.window.location;

  return { context, wrapper, signUpArgs, redirects, logs };
}

async function tick() {
  for (let i = 0; i < 30; i += 1) {
    await Promise.resolve();
  }
}

async function testLoginRevealsWhenMarkersAreMissing() {
  const { context, wrapper } = createContext({ pathname: '/login' });
  vm.runInNewContext(source, context);
  await tick();

  assert.strictEqual(wrapper.style.visibility, 'visible');
}

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

async function testApplyRevealsWhenDataLoadFails() {
  const { context, wrapper } = createContext({
    pathname: '/apply',
    session: { user: { id: 'user-1' } },
    from() {
      throw new Error('Supabase unavailable');
    },
  });
  vm.runInNewContext(source, context);
  await tick();

  assert.strictEqual(wrapper.style.visibility, 'visible');
}

async function testDashboardRendersWhenNotificationsFail() {
  const elements = {
    '[wized="dash-loading"]': createElement(),
    '[wized="dash-no-application"]': createElement(),
    '[wized="dash-application"]': createElement(),
    '[wized="start-application-link"]': createElement(),
    '[wized="withdraw-btn"]': createElement(),
  };
  const { context, wrapper } = createContext({
    pathname: '/dashboard',
    session: { user: { id: 'user-1', user_metadata: {} } },
    from(table) {
      if (table === 'applications') {
        return {
          select() { return this; },
          eq() { return this; },
          order() { return this; },
          limit() { return this; },
          async maybeSingle() {
            return { data: null, error: null };
          },
        };
      }
      if (table === 'notifications') {
        return {
          select() { return this; },
          eq() { return this; },
          async order() {
            return { data: null, error: new Error('permission denied') };
          },
        };
      }
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
      throw new Error('Unexpected table: ' + table);
    },
    elements,
  });
  vm.runInNewContext(source, context);
  await tick();

  assert.strictEqual(wrapper.style.visibility, 'visible');
}

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
  elements['[wized="signup-email"]'].value = 'test@example.test';
  elements['[wized="signup-password"]'].value = 'password123';
  elements['[wized="signup-confirm-password"]'].value = 'different456';

  const { context, signUpArgs } = createContext({ pathname: '/login', elements });
  vm.runInNewContext(source, context);
  await tick();
  await elements['[wized="signup-submit"]'].click();

  assert.strictEqual(signUpArgs.length, 0, 'signUp must not be called when passwords do not match');
}

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
          then(resolve, reject) {
            return Promise.resolve({ data: [], error: null }).then(resolve, reject);
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

  // Verify the guard fires when no card selected
  await startBtn.click();
  assert.strictEqual(context.sessionStorage.getItem('icit-selected-course'), null,
    'sessionStorage must remain empty when no course selected');
}

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

async function testSubmittedPagePopulatesProgramName() {
  const programNameEl = createElement();
  const elements = {
    '[wized="submitted-program-name"]': programNameEl,
  };

  const { context } = createContext({
    pathname: '/application-submitted',
    session: { user: { id: 'user-1' } },
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
      throw new Error('Unexpected table: ' + table);
    },
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

// ─── GROUP 1: enrollment.js ───────────────────────────────────────────────────

function makeEnrollmentElements() {
  const elements = {};
  [
    '[wized="enroll-loading"]',
    '[wized="enroll-program-name"]',
    '[wized="enroll-tuition"]',
    '[wized="enroll-status-badge"]',
    '[wized="enroll-error-msg"]',
    '[wized="enroll-processing"]',
    '[wized="confirm-enrollment-btn"]',
  ].forEach((sel) => { elements[sel] = createElement(); });
  return elements;
}

function makeApplicationsFrom(appData) {
  return function from(table) {
    if (table === 'applications') {
      return {
        select() { return this; },
        eq() { return this; },
        order() { return this; },
        limit() { return this; },
        async maybeSingle() { return { data: appData, error: null }; },
      };
    }
    throw new Error('Unexpected table: ' + table);
  };
}

async function testEnrollmentRedirectsWhenNoApplication() {
  const { context, redirects } = createContext({
    pathname: '/enrollment-confirmation',
    session: { user: { id: 'user-1' } },
    from: makeApplicationsFrom(null),
    elements: makeEnrollmentElements(),
  });
  vm.runInNewContext(source, context);
  await tick();

  assert.ok(
    redirects.includes('/dashboard'),
    'must redirect to /dashboard when no application exists',
  );
}

async function testEnrollmentRedirectsWhenNotAccepted() {
  const app = { id: 'app-1', status: 'submitted', programs: { name: 'Course A', price_cents: 5000 } };
  const { context, redirects } = createContext({
    pathname: '/enrollment-confirmation',
    session: { user: { id: 'user-1' } },
    from: makeApplicationsFrom(app),
    elements: makeEnrollmentElements(),
  });
  vm.runInNewContext(source, context);
  await tick();

  assert.ok(
    redirects.includes('/dashboard'),
    'must redirect to /dashboard when application status is not accepted',
  );
}

async function testEnrollmentRendersAcceptedApplication() {
  const app = {
    id: 'app-1',
    status: 'accepted',
    programs: { name: 'Advanced Surgeons Course', price_cents: 150000 },
  };
  const elements = makeEnrollmentElements();
  const { context, wrapper, redirects } = createContext({
    pathname: '/enrollment-confirmation',
    session: { user: { id: 'user-1' } },
    from: makeApplicationsFrom(app),
    elements,
  });
  vm.runInNewContext(source, context);
  await tick();

  assert.strictEqual(redirects.length, 0, 'must not redirect for accepted application');
  assert.strictEqual(wrapper.style.visibility, 'visible');
  assert.strictEqual(elements['[wized="enroll-program-name"]'].textContent, 'Advanced Surgeons Course');
  assert.strictEqual(elements['[wized="enroll-tuition"]'].textContent, '$1,500.00');
}

// ─── GROUP 2: status.js ───────────────────────────────────────────────────────

function makeStatusElements() {
  const elements = {};
  [
    '[wized="status-loading"]',
    '[wized="status-content"]',
    '[wized="status-program-name"]',
    '[wized="status-submitted-date"]',
    '[wized="status-badge"]',
    '[wized="tl-draft"]',
    '[wized="tl-submitted"]',
    '[wized="tl-review"]',
    '[wized="tl-decision"]',
    '[wized="tl-enrolled"]',
    '[wized="events-empty"]',
    '[wized="admin-notes-panel"]',
    '[wized="admin-notes-msg"]',
    '[wized="notes-response-input"]',
    '[wized="submit-notes-response-btn"]',
    '[wized="notes-submitted-confirm"]',
    '[wized="status-withdraw-btn"]',
    '[wized="edit-draft-link"]',
  ].forEach((sel) => {
    const el = createElement();
    // status-content needs querySelector for the back-link injection guard
    if (sel === '[wized="status-content"]') {
      el.querySelector = () => null;
      el.insertBefore = () => {};
      el.firstChild = null;
    }
    elements[sel] = el;
  });
  return elements;
}

function makeStatusFrom(appData, eventsData = []) {
  return function from(table) {
    if (table === 'applications') {
      return {
        select() { return this; },
        eq() { return this; },
        order() { return this; },
        limit() { return this; },
        async maybeSingle() { return { data: appData, error: null }; },
        update() { return this; },
        async single() { return { data: appData, error: null }; },
      };
    }
    if (table === 'application_events') {
      return {
        select() { return this; },
        eq() { return this; },
        order() { return this; },
        async then(resolve) { return resolve({ data: eventsData, error: null }); },
        // order returns a promise-like for the events fetch
        async _resolve() { return { data: eventsData, error: null }; },
      };
    }
    throw new Error('Unexpected table: ' + table);
  };
}

// application_events uses .select().eq().order() — order() must return the result
function makeStatusFromWithEvents(appData, eventsData) {
  return function from(table) {
    if (table === 'applications') {
      return {
        select() { return this; },
        eq() { return this; },
        order() { return this; },
        limit() { return this; },
        async maybeSingle() { return { data: appData, error: null }; },
        update() { return this; },
      };
    }
    if (table === 'application_events') {
      return {
        select() { return this; },
        eq() { return this; },
        async order() { return { data: eventsData, error: null }; },
        insert() { return this; },
        async then(resolve) { return resolve({ data: null, error: null }); },
      };
    }
    throw new Error('Unexpected table: ' + table);
  };
}

async function testStatusRedirectsWhenNoApplication() {
  const { context, redirects } = createContext({
    pathname: '/application-status',
    session: { user: { id: 'user-1' } },
    from: makeStatusFromWithEvents(null, []),
    elements: makeStatusElements(),
  });
  vm.runInNewContext(source, context);
  await tick();

  assert.ok(
    redirects.includes('/dashboard'),
    'must redirect to /dashboard when no application exists',
  );
}

function createTrackingElement() {
  const listeners = {};
  const added = [];
  const removed = [];
  return {
    style: { display: '', visibility: 'hidden' },
    classList: {
      _added: added,
      _removed: removed,
      add(cls) { added.push(cls); },
      remove(cls) { removed.push(cls); },
    },
    value: '',
    textContent: '',
    href: '',
    querySelector: () => null,
    insertBefore: () => {},
    firstChild: null,
    addEventListener(type, handler) { listeners[type] = handler; },
    click() { if (listeners.click) return listeners.click({ preventDefault() {} }); },
  };
}

async function testStatusRendersTimeline() {
  const app = {
    id: 'app-1',
    status: 'in_review',
    submitted_at: '2025-01-01T00:00:00Z',
    programs: { name: 'Surgical Leadership' },
    admin_notes: null,
    notes_response: null,
  };

  // Build elements with tracking classList for timeline steps
  const elements = makeStatusElements();
  const tlSteps = ['tl-draft', 'tl-submitted', 'tl-review', 'tl-decision', 'tl-enrolled'];
  const trackingEls = {};
  tlSteps.forEach((wid) => {
    const el = createTrackingElement();
    trackingEls[wid] = el;
    elements['[wized="' + wid + '"]'] = el;
  });

  const { context, wrapper } = createContext({
    pathname: '/application-status',
    session: { user: { id: 'user-1' } },
    from: makeStatusFromWithEvents(app, []),
    elements,
  });
  vm.runInNewContext(source, context);
  await tick();

  // STATUS_TIMELINE['in_review'] === 2, so steps 0,1,2 (draft, submitted, review) → done
  assert.ok(
    trackingEls['tl-draft'].classList._added.includes('timeline-step-done'),
    'tl-draft must be marked done for in_review status',
  );
  assert.ok(
    trackingEls['tl-submitted'].classList._added.includes('timeline-step-done'),
    'tl-submitted must be marked done for in_review status',
  );
  assert.ok(
    trackingEls['tl-review'].classList._added.includes('timeline-step-done'),
    'tl-review must be marked done for in_review status',
  );
  // decision (index 3) and enrolled (index 4) must NOT be done
  assert.ok(
    !trackingEls['tl-decision'].classList._added.includes('timeline-step-done'),
    'tl-decision must not be done for in_review status',
  );
  assert.strictEqual(wrapper.style.visibility, 'visible');
}

async function testStatusShowsWithdrawForAllowedStatuses() {
  // WITHDRAW_ALLOWED = ['draft', 'submitted', 'in_review', 'waitlisted', 'accepted']
  const withdrawShown = [];
  for (const status of ['submitted', 'in_review', 'accepted']) {
    const app = {
      id: 'app-1',
      status,
      submitted_at: null,
      programs: { name: 'Course' },
      admin_notes: null,
      notes_response: null,
    };
    const elements = makeStatusElements();
    const withdrawEl = elements['[wized="status-withdraw-btn"]'];
    // track show/hide calls via display
    withdrawEl.style = { display: 'none' };

    const { context } = createContext({
      pathname: '/application-status',
      session: { user: { id: 'user-1' } },
      from: makeStatusFromWithEvents(app, []),
      elements,
    });
    vm.runInNewContext(source, context);
    await tick();

    // show() sets display to '' (then possibly 'block'); hide() sets display to 'none'
    withdrawShown.push({ status, display: withdrawEl.style.display });
  }

  withdrawShown.forEach(({ status, display }) => {
    assert.notStrictEqual(
      display,
      'none',
      'withdraw button must be shown for status: ' + status,
    );
  });
}

// ─── GROUP 3: apply.js advanced ──────────────────────────────────────────────

async function testApplySubmitBlockedWithoutCV() {
  const draft = {
    id: 'app-draft-1',
    status: 'draft',
    program_id: 'prog-1',
    cv_url: null,
    locked_fields: {},
    program_answers: {},
    programs: { id: 'prog-1', name: 'Test Course', price_cents: 0, program_questions: [] },
  };

  const formErrorMsg = createElement();
  const formError = createElement();
  const submitBtn = createElement();
  const formSection3 = createElement();
  formSection3.querySelector = () => null;
  formSection3.insertBefore = () => {};
  formSection3.firstChild = null;

  const elements = {
    '[wized="form-section-1"]': (() => { const el = createElement(); el.querySelector = () => null; el.insertBefore = () => {}; el.firstChild = null; return el; })(),
    '[wized="form-section-2"]': createElement(),
    '[wized="form-section-3"]': formSection3,
    '[wized="form-section-4"]': createElement(),
    '[wized="form-section-5"]': createElement(),
    '[wized="form-error-msg"]': formErrorMsg,
    '[wized="form-error"]': formError,
    '[wized="submit-application-btn"]': submitBtn,
    '[wized="cv-upload-zone"]': (() => {
      const z = createElement();
      z.replaceChildren = () => {};
      z.contains = () => false;
      return z;
    })(),
    '[wized="cv-upload-success"]': createElement(),
    '[wized="cv-remove-btn"]': createElement(),
    '[wized="cv-filename"]': createElement(),
    '[wized="confirm-course-name"]': createElement(),
    '[wized="confirm-course-desc"]': createElement(),
    '[wized="review-content"]': (() => {
      const el = createElement();
      el.replaceChildren = () => {};
      return el;
    })(),
  };

  const { context } = createContext({
    pathname: '/apply',
    session: {
      user: {
        id: 'user-1',
        email: 'test@example.test',
        user_metadata: { first_name: 'Ada', last_name: 'Lovelace' },
      },
    },
    from(table) {
      if (table === 'applications') {
        return {
          select() { return this; },
          eq() { return this; },
          order() { return this; },
          limit() { return this; },
          async maybeSingle() { return { data: draft, error: null }; },
        };
      }
      if (table === 'programs') {
        const result = { data: [{ id: 'prog-1', name: 'Test Course', price_cents: 0, program_questions: [] }], error: null };
        return {
          select() { return this; },
          in() { return this; },
          then(resolve, reject) { return Promise.resolve(result).then(resolve, reject); },
        };
      }
      throw new Error('Unexpected table: ' + table);
    },
    elements,
  });
  context.sessionStorage.setItem(
    'icit-selected-course',
    JSON.stringify({ programId: 'prog-1', programName: 'Test Course' }),
  );

  vm.runInNewContext(source, context);
  await tick();

  // Click submit — CV is not uploaded (cv_url: null)
  await submitBtn.click();
  await tick();

  // Must show section 3 (CV upload) and display an error
  assert.strictEqual(
    formErrorMsg.textContent,
    'Please upload your CV before submitting.',
    'error message must indicate CV is required',
  );
  assert.notStrictEqual(
    formError.style.display,
    'none',
    'form-error must be shown when submit is clicked without CV',
  );
}

(async () => {
  await testLoginRevealsWhenMarkersAreMissing();
  await testSignUpSendsConfirmationBackToLogin();
  await testLoginAuthReturnShowsLoginInsteadOfDashboardRedirect();
  await testApplyRevealsWhenDataLoadFails();
  await testDashboardRendersWhenNotificationsFail();
  await testSignUpRejectsPasswordMismatch();
  await testDashboardCourseSelectionWritesSessionStorage();
  await testApplyRedirectsToDashboardWhenNoCourseSelected();
  await testSubmittedPagePopulatesProgramName();
  // Group 1: enrollment.js
  await testEnrollmentRedirectsWhenNoApplication();
  await testEnrollmentRedirectsWhenNotAccepted();
  await testEnrollmentRendersAcceptedApplication();
  // Group 2: status.js
  await testStatusRedirectsWhenNoApplication();
  await testStatusRendersTimeline();
  await testStatusShowsWithdrawForAllowedStatuses();
  // Group 3: apply.js advanced
  await testApplySubmitBlockedWithoutCV();
  process.stdout.write('icit-app tests passed\n');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
