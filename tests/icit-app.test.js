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
      createElement() { return { textContent: '', style: {}, classList: { add() {}, remove() {} } }; },
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

(async () => {
  await testLoginRevealsWhenMarkersAreMissing();
  await testSignUpSendsConfirmationBackToLogin();
  await testLoginAuthReturnShowsLoginInsteadOfDashboardRedirect();
  await testApplyRevealsWhenDataLoadFails();
  await testDashboardRendersWhenNotificationsFail();
  await testSignUpRejectsPasswordMismatch();
  await testDashboardCourseSelectionWritesSessionStorage();
  await testApplyRedirectsToDashboardWhenNoCourseSelected();
  process.stdout.write('icit-app tests passed\n');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
