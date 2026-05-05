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
      return listeners.click({ preventDefault() {} });
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
    '[wized="tab-signin"]',
    '[wized="tab-signup"]',
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
    '[wized="signup-first-name"]',
    '[wized="signup-last-name"]',
  ].forEach((selector) => {
    elements[selector] = createElement();
  });
  elements['[wized="signup-email"]'].value = 'applicant@example.test';
  elements['[wized="signup-password"]'].value = 'password123';
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
    '[wized="tab-signin"]',
    '[wized="tab-signup"]',
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
      throw new Error('Unexpected table: ' + table);
    },
    elements,
  });
  vm.runInNewContext(source, context);
  await tick();

  assert.strictEqual(wrapper.style.visibility, 'visible');
}

(async () => {
  await testLoginRevealsWhenMarkersAreMissing();
  await testSignUpSendsConfirmationBackToLogin();
  await testLoginAuthReturnShowsLoginInsteadOfDashboardRedirect();
  await testApplyRevealsWhenDataLoadFails();
  await testDashboardRendersWhenNotificationsFail();
  process.stdout.write('icit-app tests passed\n');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
