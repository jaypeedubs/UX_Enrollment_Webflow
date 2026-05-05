# Webflow Codebase Unification Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize the ICIT enrollment codebase so Webflow is the explicit primary frontend, applicant JS is modular and maintainable, admin logic is complete and self-contained, and there is a single source of truth for shared constants.

**Architecture:** Split the 1,412-line `src/icit-app.js` monolith into focused ES modules (core utilities + per-page logic) bundled for Webflow via esbuild. The admin Astro+React app stays as React but is extended to cover admin-write operations and programs CRUD, eliminating the Retool dependency. All privileged Supabase operations stay in Edge Functions. Constants are defined once in `src/core/constants.js` and manually mirrored in `admin/src/lib/constants.ts`.

**Tech Stack:** esbuild (bundling), vanilla JS ES modules (applicant code), React 19 + TypeScript (admin), Deno (Edge Functions), Supabase JS v2, GitHub Pages or Netlify (JS hosting).

**Last updated:** 2026-05-05

**Current status:**
- Phases 1–7 complete (build toolchain, modules extracted, admin logic migrated, constants aligned, legacy monolith deleted)
- Admin panel fully replaces Retool for all operations (applications, review, programs CRUD)
- All privileged operations moved to Edge Functions (admin-read, admin-write, admin-transition)
- Applicant code hosted as `dist/icit-app.bundle.js` via esbuild
- Moodle integration pending final API credentials (Phase 8 placeholder)

---

## Architecture Reference

### Final Folder Structure

```
/
├── src/                                  # Applicant-facing JS source
│   ├── core/
│   │   ├── constants.js                 # SINGLE SOURCE OF TRUTH for all shared literals
│   │   ├── supabase.js                  # createClient → named export `db`
│   │   ├── auth.js                      # All session/auth operations
│   │   └── ui.js                        # DOM helpers, formatters, page lifecycle
│   ├── pages/
│   │   ├── login.js                     # initLogin()
│   │   ├── dashboard.js                 # initDashboard()
│   │   ├── apply.js                     # initApply()
│   │   ├── status.js                    # initStatus()
│   │   └── enrollment.js                # initEnrollment()
│   └── main.js                          # Entry point: imports all pages, runs dispatcher
│
├── dist/                                 # Build output (committed; loaded by Webflow)
│   └── icit-app.bundle.js               # Single IIFE bundle, exposes nothing globally
│
├── admin/                                # Internal admin — deploy separately
│   └── src/
│       ├── components/
│       │   ├── AdminApp.tsx             # Add /programs route (Phase 7)
│       │   ├── ProgramsPage.tsx         # NEW (Phase 7): programs CRUD
│       │   └── ... (existing, unchanged through Phase 5)
│       └── lib/
│           ├── constants.ts             # Manually kept in sync with src/core/constants.js
│           └── ... (existing)
│
├── supabase/
│   └── functions/
│       ├── admin-read/                  # EXISTS — unchanged
│       ├── admin-transition/            # EXISTS — unchanged
│       ├── admin-write/                 # NEW (Phase 6): notes + CV signed URL + timeline
│       ├── handle-notification/         # EXISTS — unchanged
│       ├── create-checkout-session/     # EXISTS — unchanged
│       ├── stripe-webhook/              # EXISTS — unchanged
│       └── moodle-handoff/             # EXISTS — unchanged
│
├── retool/                              # ARCHIVED end of Phase 7
│   └── test-admin-api.js               # Moved to tests/ as proper test file
│
├── tests/
│   └── icit-app.test.js                # EXISTS — update imports after Phase 4
│
├── package.json                         # ROOT — add esbuild (Phase 1)
├── build.js                             # NEW (Phase 1): esbuild config
└── .env.example                         # Unchanged
```

### Naming Conventions

| Thing | Convention | Example |
|---|---|---|
| Source files | `kebab-case.js` / `.ts` | `dashboard.js`, `api.ts` |
| Functions | `camelCase`, verb-first | `loadApplication`, `initDashboard` |
| Constants | `SCREAMING_SNAKE_CASE` | `WITHDRAW_ALLOWED`, `SUPABASE_URL` |
| Edge Function folders | `kebab-case-verb` | `admin-write`, `admin-read` |
| DB tables/columns | `snake_case` (don't change) | `applicant_id`, `program_answers` |
| Module exports | Named exports only (no `default`) | `export function initLogin()` |

### Module Boundaries

| Module | Exports | Imports | Responsibility |
|---|---|---|---|
| `src/core/constants.js` | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `EDGE_FN_BASE`, `STATUSES`, `WITHDRAW_ALLOWED` | none | All shared literals; single source of truth |
| `src/core/supabase.js` | `db` | `constants.js` | One Supabase client instance; global SIGNED_OUT listener |
| `src/core/auth.js` | `getSession`, `signIn`, `signUp`, `signOut`, `requireAuth`, `requireGuest`, `isLoginAuthReturn`, `completeLoginAuthReturn` | `supabase.js` | All auth/session operations |
| `src/core/ui.js` | `q`, `show`, `hide`, `setText`, `setHref`, `escapeHtml`, `formatDate`, `formatCurrency`, `applyDesignSystemClasses`, `showPageError`, `setCvProgress`, `revealPage`, `pageRoot`, `initPage`, `ensureFallback`, `getFocusable`, `handleKeyDown` | none | DOM helpers, formatters, page lifecycle |
| `src/pages/login.js` | `initLogin` | `auth.js`, `ui.js` | Login + signup form, auth-return handling |
| `src/pages/dashboard.js` | `initDashboard` | `db`, `auth.js`, `ui.js` | Dashboard: application summary, notifications, history |
| `src/pages/apply.js` | `initApply` | `db`, `auth.js`, `ui.js`, `constants.js` | Application form: draft, CV upload, questions, submit |
| `src/pages/status.js` | `initStatus` | `db`, `auth.js`, `ui.js`, `constants.js` | Status page: display status, withdrawal |
| `src/pages/enrollment.js` | `initEnrollment` | `db`, `auth.js`, `ui.js` | Enrollment confirmation + Stripe checkout redirect |
| `src/main.js` | none (entry point) | all pages, `ui.js` | Dispatcher: matches pathname → calls `initPage(name, fn)` |

### Where Code Lives in Webflow

**Site-wide custom code — `<head>`** (Project Settings → Custom Code → Head):
```html
<!-- Supabase JS v2 (must load before bundle) -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
```

**Site-wide custom code — end of `<body>`** (Project Settings → Custom Code → Footer):
```html
<!-- ICIT application bundle (auto-dispatches based on pathname) -->
<script src="https://YOUR_HOST/dist/icit-app.bundle.js"></script>
```

**Per-page custom code** — None required. The bundle's dispatcher at the bottom of `main.js` reads `window.location.pathname` and calls the correct `initPage()`. This matches current behavior in `icit-app.js` line 1405–1411.

**Webflow embeds** — None currently needed. If a future widget needs isolation from the page-level JS (e.g., a Stripe Elements embed), it can move here.

**Supabase Edge Functions** — All privileged operations. No client code ever holds the service-role key.

### Known Inconsistency to Preserve (not fix)
`WITHDRAW_ALLOWED` in `icit-app.js` includes `'draft'`; in `admin/src/lib/constants.ts` it does not. Preserve this difference — the admin panel intentionally does not allow withdrawing a draft (an applicant action). When aligning constants in Phase 5, document this in a comment; do not silently unify the values.

### Schema Direction (updated 2026-05-05)

Migration 009 adds 10 universal contact-info columns to `applications`. These belong as proper columns (not JSONB) for admin reporting, export, and certificate/materials shipping.

**New columns on `applications` (migration 009):**

| Column | Type | Required | Notes |
|---|---|---|---|
| `email_consent` | boolean NOT NULL DEFAULT false | yes | Marketing/compliance flag |
| `phone` | text | yes | Contact phone — do NOT read auth.users.phone for this |
| `address` | text | yes | Multi-line mailing address |
| `city` | text | yes | |
| `state` | text | yes | Form alias: "State/Province" |
| `zip_code` | text | yes | Text, not integer (international postal codes) |
| `country` | text | yes | |
| `credentials` | text | optional | e.g., "MD, AuD, PhD"; ASC/ISC/AAC courses |
| `current_role` | text | yes | Consolidates "Current Title", "Current Role", "Role on CI Team" |
| `institution` | text | yes | |

**JSONB canonical keys for `program_answers`** (defined in `programs.program_questions` per row, answered in `applications.program_answers`):

| Key | Courses | Type |
|---|---|---|
| `q_fellowship_status` | ASC, ISC | boolean |
| `q_fellowship_inst` | ASC, ISC | text (conditional on status = true) |
| `q_years_experience` | ALL | text |
| `q_ci_observed` | ASC, ISC | integer |
| `q_ci_assistant` | ASC, ISC | integer |
| `q_ci_primary` | ASC, ISC | integer |
| `q_ci_exp_level` | AAC, FAC | text (Moderate / Beginner) |
| `q_description` | ALL | text |
| `q_referral_source` | ALL | text |

**Hard constraints for apply.js (Task 3.3):**
- `saveDraft` must write the 10 new contact columns as top-level payload keys — the current icit-app.js `saveDraft` omits them; update when extracting the module.
- `loadApplication` select must include the 10 new columns.
- **`notes_response` is reserved for the `more_info_requested` admin loop only.** Never write initial application form answers there. Use `program_answers->>'q_description'` for the description field.
- **`q_experience` key conflict:** Migration 006 seeds `programs.program_questions` with id `"q_experience"`. The canonical key is `q_years_experience`. Migration 009 reconciles this with an UPDATE on the seeded test program row.
- **`enrollment_confirmed` retired:** This status has been removed from the schema, Edge Functions, and all JS. The only canonical enrolled state is `enrolled`. See migration 010 and Task S.2 (superseded).

---

## Phase 1: Build Tooling ✅ COMPLETED

**Scope:** Add esbuild to the repo root. Create the empty src/ module structure. Verify the build produces a bundle behaviorally identical to the current `src/icit-app.js`. No Webflow changes. Zero regression risk.

**Files to create:**
- `package.json` (root)
- `build.js`
- `src/core/constants.js` (empty stub)
- `src/core/supabase.js` (empty stub)
- `src/core/auth.js` (empty stub)
- `src/core/ui.js` (empty stub)
- `src/pages/login.js` (empty stub)
- `src/pages/dashboard.js` (empty stub)
- `src/pages/apply.js` (empty stub)
- `src/pages/status.js` (empty stub)
- `src/pages/enrollment.js` (empty stub)
- `src/main.js` (entry point stub — temporarily re-exports icit-app.js content)

**Files to delete later:** `src/icit-app.js` (in Phase 4)

**Regression risk:** None. Webflow still loads the old `icit-app.js` directly. The new build system is unused.

---

### Task 1.1: Add root package.json and esbuild

**Files:**
- Create: `package.json` (root)
- Create: `build.js`

- [ ] **Step 1: Create root package.json**

```json
{
  "name": "icit-enrollment-webflow",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "build": "node build.js",
    "watch": "node build.js --watch"
  },
  "devDependencies": {
    "esbuild": "^0.21.0"
  }
}
```

- [ ] **Step 2: Install esbuild**

Run from repo root:
```bash
npm install
```
Expected: `node_modules/` created at root, `package-lock.json` generated.

- [ ] **Step 3: Create build.js**

```js
const esbuild = require('esbuild');
const watch = process.argv.includes('--watch');

const config = {
  entryPoints: ['src/main.js'],
  bundle: true,
  outfile: 'dist/icit-app.bundle.js',
  format: 'iife',
  platform: 'browser',
  target: ['es2018'],
  // Supabase is loaded via CDN script tag in Webflow; tell esbuild it's a global.
  external: [],
  // The bundle wraps everything in an IIFE — nothing exposed on window.
  globalName: undefined,
  minify: false,    // keep readable until Phase 4 is proven stable; minify then
  sourcemap: false,
};

if (watch) {
  esbuild.context(config).then(ctx => ctx.watch());
} else {
  esbuild.build(config).catch(() => process.exit(1));
}
```

- [ ] **Step 4: Create empty src/ folder structure**

```bash
mkdir -p src/core src/pages dist
```

- [ ] **Step 5: Create src/main.js as a temporary pass-through stub**

This lets the build run while modules are being extracted. It will be replaced in Phase 3.

```js
// TEMPORARY: Phase 1 stub. Contents of icit-app.js are duplicated below
// while Phase 2-3 modularization is in progress. Delete after Phase 4.
```

> Note: Do NOT actually copy icit-app.js content here. Leave it as a comment stub. The build will produce an empty bundle at this stage. Webflow still loads `icit-app.js` from wherever it currently lives. This phase is only about proving the toolchain works.

- [ ] **Step 6: Run build to verify toolchain**

```bash
npm run build
```

Expected: `dist/icit-app.bundle.js` is created (may be near-empty). No errors.

- [ ] **Step 7: Add dist/ and node_modules to .gitignore if not already present**

```bash
grep -q "^dist/" .gitignore || echo "dist/" >> .gitignore
grep -q "^node_modules/" .gitignore || echo "node_modules/" >> .gitignore
```

> Decide whether to commit `dist/` to git. If Webflow loads from a GitHub Pages URL pointing to the dist file, then YES commit it. If loading from Netlify with a build step, then NO (gitignore). Choose before Phase 4. For simplest setup: commit dist/ and serve from GitHub Pages.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json build.js src/ dist/ .gitignore
git commit -m "build: add esbuild toolchain and empty src/ module structure"
```

**Manual test checklist for Phase 1:**
- [ ] `npm run build` succeeds with no errors
- [ ] `dist/icit-app.bundle.js` is created
- [ ] Webflow site behavior is completely unchanged (the new bundle is not loaded anywhere)

---

## Phase 2: Extract Core Modules ✅ COMPLETED

**Scope:** Cut the four core utility groups out of `src/icit-app.js` into focused modules. The monolith is not modified. The new modules exist but are not bundled or loaded yet. This is low-risk refactoring — the Webflow-deployed file is untouched.

**Files to create:**
- `src/core/constants.js`
- `src/core/supabase.js`
- `src/core/auth.js`
- `src/core/ui.js`

**Regression risk:** Zero — Webflow still loads the old monolith.

---

### Task 2.1: Create src/core/constants.js

**Files:**
- Create: `src/core/constants.js`

- [ ] **Step 1: Write constants.js**

Copy the exact literal values from `src/icit-app.js` lines 38–41:

```js
export const SUPABASE_URL = 'https://xvweanlqcbgbiyxqhwux.supabase.co';

// This key is safe to commit — it is the public anon key, not the service-role key.
// Update manually if the Supabase project changes (Webflow cannot read .env).
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2d2VhbmxxY2JnYml5eHFod3V4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwNTY0NjcsImV4cCI6MjA5MjYzMjQ2N30.Fs819XQjDXoT8l0qZreFEjeu_Xf2zjzqBG87BjGTQM4';

export const EDGE_FN_BASE = SUPABASE_URL + '/functions/v1';

// Applicant-side: 'draft' is included because applicants can cancel a draft.
// Admin-side (admin/src/lib/constants.ts) intentionally excludes 'draft' —
// admins never withdraw drafts; that is an applicant-only action.
export const WITHDRAW_ALLOWED = ['draft', 'submitted', 'in_review', 'waitlisted', 'accepted'];

// All valid application statuses, in lifecycle order.
export const STATUSES = [
  'draft', 'submitted', 'in_review', 'waitlisted',
  'accepted', 'rejected', 'enrolled', 'withdrawn',
];
```

- [ ] **Step 2: Commit**

```bash
git add src/core/constants.js
git commit -m "refactor: extract constants module from icit-app.js"
```

---

### Task 2.2: Create src/core/supabase.js

**Files:**
- Create: `src/core/supabase.js`

- [ ] **Step 1: Write supabase.js**

Extracted from `src/icit-app.js` lines 44–52:

```js
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './constants.js';

// `window.supabase` is the UMD build loaded from CDN in Webflow's <head>.
// esbuild treats this as a browser global — no npm import needed.
export const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Global sign-out listener: redirect to /login whenever the session ends.
// Fires only on SIGNED_OUT — INITIAL_SESSION is intentionally ignored.
db.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT' && window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
});
```

- [ ] **Step 2: Commit**

```bash
git add src/core/supabase.js
git commit -m "refactor: extract supabase client module"
```

---

### Task 2.3: Create src/core/auth.js

**Files:**
- Create: `src/core/auth.js`

- [ ] **Step 1: Write auth.js**

Extracted from `src/icit-app.js` lines 54–120:

```js
import { db } from './supabase.js';

export async function getSession() {
  const { data } = await db.auth.getSession();
  return data.session; // null if not signed in
}

// Returns session or redirects to /login and hangs (never resolves).
export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    window.location.href = '/login';
    return new Promise(() => {}); // intentionally never resolves
  }
  return session;
}

// Redirects to /dashboard if a session exists. Hangs if redirect fires.
export async function requireGuest() {
  const session = await getSession();
  if (session) {
    window.location.href = '/dashboard';
    return new Promise(() => {}); // intentionally never resolves
  }
}

export function isLoginAuthReturn() {
  if (window.location.pathname !== '/login') return false;
  const search = new URLSearchParams(window.location.search || '');
  const hash = new URLSearchParams((window.location.hash || '').replace(/^#/, ''));
  return search.has('code') || search.has('token_hash') || search.has('type') ||
    hash.has('access_token') || hash.has('refresh_token') || hash.has('type') || hash.has('error');
}

export async function completeLoginAuthReturn() {
  if (!isLoginAuthReturn()) return false;
  const session = await getSession();
  if (session) await signOut();
  window.history.replaceState({}, '', '/login');
  return true;
}

export async function signIn(email, password) {
  const { data, error } = await db.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session;
}

export async function signUp(email, password, firstName, lastName) {
  const { data, error } = await db.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: window.location.origin + '/login',
      data: { first_name: firstName, last_name: lastName },
    },
  });
  if (error) throw error;
  return data.session;
}

export async function signOut() {
  const { error } = await db.auth.signOut();
  if (error) throw error;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/core/auth.js
git commit -m "refactor: extract auth module"
```

---

### Task 2.4: Create src/core/ui.js

**Files:**
- Create: `src/core/ui.js`

- [ ] **Step 1: Write ui.js**

This extracts all DOM helpers and page lifecycle helpers from `src/icit-app.js`. Read lines 140–400 of `icit-app.js` to get the exact implementations of each function listed below, then write them as named exports. The complete list:

`q`, `show`, `hide`, `setText`, `setHref`, `escapeHtml`, `formatDate`, `formatCurrency`, `applyDesignSystemClasses`, `setCvProgress`, `revealPage`, `pageRoot`, `showPageError`, `initPage`, `ensureFallback`, `getFocusable`, `handleKeyDown`

```js
// ─── SELECTORS ──────────────────────────────────────────────────────────────

export function q(selector, root = document) {
  return root.querySelector(selector);
}

// ─── VISIBILITY ─────────────────────────────────────────────────────────────

export function show(el) {
  if (el) el.style.display = '';
}

export function hide(el) {
  if (el) el.style.display = 'none';
}

// ─── CONTENT ────────────────────────────────────────────────────────────────

export function setText(el, text) {
  if (el) el.textContent = text;
}

export function setHref(el, href) {
  if (el) el.href = href;
}

export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── FORMATTERS ─────────────────────────────────────────────────────────────

export function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function formatCurrency(cents) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

// ─── DESIGN SYSTEM ──────────────────────────────────────────────────────────

// Copy the exact implementation from icit-app.js — do not invent or simplify.
export function applyDesignSystemClasses() {
  // [paste exact implementation from icit-app.js]
}

export function setCvProgress(pct) {
  // [paste exact implementation from icit-app.js]
}

// ─── PAGE LIFECYCLE ─────────────────────────────────────────────────────────

export function revealPage() {
  const w = document.getElementById('icit-page-wrapper');
  if (w) w.style.visibility = 'visible';
}

export function pageRoot() {
  return document.getElementById('icit-page-wrapper') || document.body;
}

export function showPageError(message) {
  const target =
    q('[wized="form-error-msg"]') ||
    q('[wized="signin-error-msg"]') ||
    q('[wized="signup-error-msg"]') ||
    q('[wized="enroll-error-msg"]');
  setText(target, message);
  show(target);
}

export function initPage(name, initFn) {
  Promise.resolve()
    .then(initFn)
    .catch((err) => {
      console.error('ICIT page init failed:', name, err);
      showPageError(err.message || 'This page could not finish loading. Please refresh and try again.');
      revealPage();
    });
}

export function ensureFallback(id, html) {
  // [paste exact implementation from icit-app.js]
}

// ─── FOCUS / KEYBOARD ───────────────────────────────────────────────────────

export function getFocusable(container) {
  // [paste exact implementation from icit-app.js]
}

export function handleKeyDown(e, focusable) {
  // [paste exact implementation from icit-app.js]
}
```

> **Important:** The `[paste exact implementation]` placeholders above are reminders for the implementer — copy the exact lines from `src/icit-app.js` for each function. Do not invent new implementations. The contract is: same inputs → same outputs.

- [ ] **Step 2: Commit**

```bash
git add src/core/ui.js
git commit -m "refactor: extract UI helpers and page lifecycle module"
```

---

## Phase 3: Extract Page Modules + Wire Main Entry Point

**Scope:** Extract each page's `init*` function (and its supporting helpers) into a dedicated page module. Wire `src/main.js` as the esbuild entry point. Produce `dist/icit-app.bundle.js`. At the end of this phase, the bundle is functionally equivalent to `src/icit-app.js` but composed from focused modules.

**Files to create:**
- `src/pages/login.js`
- `src/pages/dashboard.js`
- `src/pages/apply.js`
- `src/pages/status.js`
- `src/pages/enrollment.js`
- `src/main.js` (replace stub from Phase 1)

**Regression risk:** Medium. The bundled output must be behaviorally identical to the monolith. Key risk: function extraction order or closure behavior — verify by running manual test checklist against a local preview or staging Webflow publish before swapping live.

---

### Task 3.1: Extract src/pages/login.js ✅ COMPLETED

**Files:**
- Create: `src/pages/login.js`

- [ ] **Step 1: Identify all code that belongs to initLogin**

Search `src/icit-app.js` for `function initLogin` and trace every helper it calls that is not already in `ui.js` or `auth.js`. The login page uses: `requireGuest`, `completeLoginAuthReturn`, `isLoginAuthReturn`, `signIn`, `signUp`, `show`, `hide`, `setText`, `q`, `revealPage`, `showPageError`.

All of those are already in core modules. No page-private helpers exist for login.

- [ ] **Step 2: Write login.js**

```js
import { requireGuest, completeLoginAuthReturn, signIn, signUp } from '../core/auth.js';
import { q, show, hide, setText, revealPage, showPageError } from '../core/ui.js';

export async function initLogin() {
  // [paste exact body of initLogin() from src/icit-app.js]
  // Do not modify logic. Imports replace the previously-closure-scoped references.
}
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/login.js
git commit -m "refactor: extract login page module"
```

---

### Task 3.2: Extract src/pages/dashboard.js ✅ COMPLETED

**Files:**
- Create: `src/pages/dashboard.js`

- [ ] **Step 1: Identify helpers private to dashboard**

Functions called only from `initDashboard`: `loadApplication`, `loadNotifications`, `loadApplicationHistory`, `loadPrograms` (if present). These are page-private data-fetching functions and must move into `dashboard.js`, not into core.

- [ ] **Step 2: Write dashboard.js**

```js
import { db } from '../core/supabase.js';
import { requireAuth } from '../core/auth.js';
import { q, show, hide, setText, formatDate, revealPage, showPageError } from '../core/ui.js';

// Page-private: only used by initDashboard.
async function loadApplication(session) {
  // [paste exact implementation from icit-app.js]
}

async function loadNotifications(session) {
  // [paste exact implementation from icit-app.js]
}

async function loadApplicationHistory(session) {
  // [paste exact implementation from icit-app.js — if present; if not, omit]
}

export async function initDashboard() {
  // [paste exact body of initDashboard() from icit-app.js]
}
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/dashboard.js
git commit -m "refactor: extract dashboard page module"
```

---

### Task S.1: Create supabase/migrations/009_application_contact_fields.sql

**Prerequisite for Tasks 3.3, 3.4, 3.5, 3.6.** The apply form must write contact fields as columns; the status and enrollment pages read them. Do not start Task 3.3 until this migration is applied and verified.

**Files:**
- Create: `supabase/migrations/009_application_contact_fields.sql`

- [ ] **Step 1: Write migration 009**

```sql
-- ============================================================
-- ICIT Application System — Contact Info Fields
-- Adds universal contact and professional identity columns.
-- Run after 008_service_role_grants.sql.
-- ============================================================

ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS email_consent  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS phone          TEXT,
  ADD COLUMN IF NOT EXISTS address        TEXT,
  ADD COLUMN IF NOT EXISTS city           TEXT,
  ADD COLUMN IF NOT EXISTS state          TEXT,
  ADD COLUMN IF NOT EXISTS zip_code       TEXT,
  ADD COLUMN IF NOT EXISTS country        TEXT,
  ADD COLUMN IF NOT EXISTS credentials    TEXT,
  ADD COLUMN IF NOT EXISTS current_role   TEXT,
  ADD COLUMN IF NOT EXISTS institution    TEXT;

-- Reconcile seeded test program: rename q_experience → q_years_experience
-- (Migration 006 seeded id = "q_experience"; canonical key is "q_years_experience")
UPDATE programs
SET program_questions = (
  SELECT jsonb_agg(
    CASE
      WHEN q->>'id' = 'q_experience'
        THEN q || '{"id": "q_years_experience"}'::jsonb
      ELSE q
    END
  )
  FROM jsonb_array_elements(program_questions) AS q
)
WHERE program_questions IS NOT NULL
  AND program_questions @> '[{"id": "q_experience"}]'::jsonb;
```

- [ ] **Step 2: Apply migration locally and verify**

```bash
supabase db push
```

Verify all 10 columns exist:
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'applications'
  AND column_name IN (
    'email_consent','phone','address','city','state',
    'zip_code','country','credentials','current_role','institution'
  );
-- Expected: 10 rows returned
```

Verify q_years_experience key is present in test program:
```sql
SELECT program_questions FROM programs WHERE status = 'active' LIMIT 1;
-- Expected: JSONB array contains an object with "id": "q_years_experience" (not "q_experience")
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/009_application_contact_fields.sql
git commit -m "feat: migration 009 — contact columns on applications, reconcile q_years_experience key"
```

---

### ~~Task S.2: Fix AppStatus type — add enrollment_confirmed~~ SUPERSEDED

> **Superseded 2026-05-05.** `enrollment_confirmed` is retired entirely — do not add it to `AppStatus`. `admin/src/lib/types.ts` already has `enrolled` only and is correct. The DB constraint was updated by migration 010. See also: `create-checkout-session`, `stripe-webhook`, `icit-app.js`, `src/pages/dashboard.js`.

---

### Task 3.3: Extract src/pages/apply.js

**Prerequisites:** Tasks S.1 and S.2 must be complete before starting this task.

**Schema update required vs. original plan:** When extracting `initApply()` from `icit-app.js`, `saveDraft` must be updated to write the 10 new contact columns (`email_consent`, `phone`, `address`, `city`, `state`, `zip_code`, `country`, `credentials`, `current_role`, `institution`) as top-level payload keys in the upsert. The existing `saveDraft` in `icit-app.js` omits these fields. Additionally, `loadApplication` select must include all 10 new columns. Do NOT use `notes_response` for any form answer — use `program_answers` with key `q_description` for the description field.

**Files:**
- Create: `src/pages/apply.js`

- [ ] **Step 1: Identify helpers private to apply**

Functions only called from `initApply`: `saveDraft`, `uploadCV`, `submitApplication`, `createGeneratedQuestion`, `renderQuestions`. These stay in `apply.js`.

- [ ] **Step 2: Write apply.js**

```js
import { db } from '../core/supabase.js';
import { requireAuth } from '../core/auth.js';
import { q, show, hide, setText, setHref, escapeHtml, formatDate, formatCurrency,
         setCvProgress, revealPage, showPageError, ensureFallback } from '../core/ui.js';

async function saveDraft(session, applicationId, formData) {
  // [paste exact implementation from icit-app.js]
}

async function uploadCV(session, file, onProgress) {
  // [paste exact implementation from icit-app.js]
}

async function submitApplication(session, applicationId) {
  // [paste exact implementation from icit-app.js]
}

function createGeneratedQuestion(question, index) {
  // [paste exact implementation from icit-app.js]
}

function renderQuestions(questions, container) {
  // [paste exact implementation from icit-app.js]
}

export async function initApply() {
  // [paste exact body of initApply() from icit-app.js]
}
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/apply.js
git commit -m "refactor: extract apply page module"
```

---

### Task 3.4: Extract src/pages/status.js

**Files:**
- Create: `src/pages/status.js`

- [ ] **Step 1: Identify helpers private to status**

`withdrawApplication` is called from `initStatus`. It is also referenced in `initApply` if the apply page has a withdrawal path — check `src/icit-app.js`. If `withdrawApplication` is called in both pages, it belongs in a shared location. Check first:

```bash
grep -n "withdrawApplication" src/icit-app.js
```

If it appears only in `initStatus`, put it in `status.js`. If it appears in both `initApply` and `initStatus`, create `src/core/applications.js` and export it from there, importing it into both page modules.

- [ ] **Step 2: Write status.js** (assuming withdrawApplication is status-only)

```js
import { db } from '../core/supabase.js';
import { requireAuth } from '../core/auth.js';
import { q, show, hide, setText, formatDate, revealPage, showPageError } from '../core/ui.js';
import { WITHDRAW_ALLOWED } from '../core/constants.js';

async function withdrawApplication(session, applicationId, currentStatus) {
  // [paste exact implementation from icit-app.js]
}

export async function initStatus() {
  // [paste exact body of initStatus() from icit-app.js]
}
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/status.js
git commit -m "refactor: extract status page module"
```

---

### Task 3.5: Extract src/pages/enrollment.js

**Files:**
- Create: `src/pages/enrollment.js`

- [ ] **Step 1: Identify helpers private to enrollment**

`createCheckout` is called only from `initEnrollment`.

- [ ] **Step 2: Write enrollment.js**

```js
import { db } from '../core/supabase.js';
import { requireAuth } from '../core/auth.js';
import { q, show, hide, setText, formatCurrency, revealPage, showPageError } from '../core/ui.js';
import { EDGE_FN_BASE } from '../core/constants.js';

async function createCheckout(session, applicationId) {
  // [paste exact implementation from icit-app.js]
}

export async function initEnrollment() {
  // [paste exact body of initEnrollment() from icit-app.js]
}
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/enrollment.js
git commit -m "refactor: extract enrollment page module"
```

---

### Task 3.6: Write src/main.js — entry point with dispatcher

**Files:**
- Modify: `src/main.js` (replace Phase 1 stub)

- [ ] **Step 1: Write main.js**

This replicates the IIFE wrapper and dispatcher from `src/icit-app.js` lines 1–11 and 1405–1412. The style injection (lines 4–35) also moves here since it is global and belongs in the entry point.

```js
import { initLogin } from './pages/login.js';
import { initDashboard } from './pages/dashboard.js';
import { initApply } from './pages/apply.js';
import { initStatus } from './pages/status.js';
import { initEnrollment } from './pages/enrollment.js';
import { initPage } from './core/ui.js';

// ─── STYLE FIXES ────────────────────────────────────────────────────────────
// Webflow's .w-button specificity fights the design system classes.
// These !important overrides are injected once at startup.
(function injectStyles() {
  const s = document.createElement('style');
  s.textContent =
    // [paste exact style string from icit-app.js lines 13–34]
    '';
  document.head.appendChild(s);
}());

// ─── DISPATCHER ─────────────────────────────────────────────────────────────
const path = window.location.pathname;
if (path === '/login')                        initPage('login', initLogin);
else if (path === '/dashboard')               initPage('dashboard', initDashboard);
else if (path === '/apply')                   initPage('apply', initApply);
else if (path === '/application-status')      initPage('application-status', initStatus);
else if (path === '/enrollment-confirmation') initPage('enrollment-confirmation', initEnrollment);
```

- [ ] **Step 2: Run build**

```bash
npm run build
```

Expected: `dist/icit-app.bundle.js` is produced. Size should be comparable to `src/icit-app.js` (~1,412 lines). Check the bundle for obvious issues:

```bash
node -e "
  // Quick smoke test: load bundle in Node (will error on DOM calls, but should not have syntax errors).
  const fs = require('fs');
  const src = fs.readFileSync('dist/icit-app.bundle.js', 'utf8');
  console.log('Bundle size:', src.length, 'chars');
  console.log('Contains initLogin:', src.includes('initLogin'));
  console.log('Contains initDashboard:', src.includes('initDashboard'));
  console.log('Contains WITHDRAW_ALLOWED:', src.includes('WITHDRAW_ALLOWED'));
"
```

Expected output:
```
Bundle size: [~50,000+ chars]
Contains initLogin: true
Contains initDashboard: true
Contains WITHDRAW_ALLOWED: true
```

- [ ] **Step 3: Commit**

```bash
git add src/main.js dist/icit-app.bundle.js
git commit -m "refactor: wire main.js entry point and produce initial bundle"
```

**Manual regression checklist (run against a staging Webflow publish BEFORE Phase 4):**

Use Webflow's staging/preview URL with the new bundle loaded. Replace the script URL temporarily in Webflow staging (or test via browser devtools overrides).

| Flow | Steps | Expected |
|---|---|---|
| Login — sign in | Enter valid email + password, click Sign In | Redirect to /dashboard |
| Login — wrong password | Enter valid email + wrong password | Error message shown, no redirect |
| Login — sign up | Enter new email + password + name, click Sign Up | Confirmation message shown |
| Login — auth return | Visit /login?code=xyz (simulate email confirm) | Old session cleared, URL cleaned to /login |
| Dashboard — loads | Visit /dashboard as authenticated user | Application summary visible, notifications panel visible |
| Dashboard — unauthenticated | Visit /dashboard with no session | Redirect to /login |
| Apply — draft save | Fill partial form, click Save Draft | Draft saved, confirmation shown |
| Apply — CV upload | Choose a PDF file, upload | Progress bar updates, CV URL stored |
| Apply — submit | Complete form, click Submit | Application status changes to 'submitted' |
| Status — view | Visit /application-status as authenticated applicant | Status badge, program name, dates shown |
| Status — withdraw | Click Withdraw, confirm dialog | Status changes, button hidden |
| Enrollment — redirect | Visit /enrollment-confirmation with 'draft' status | Redirect to /dashboard |
| Enrollment — view | Visit as 'accepted' applicant | Program name, tuition, Confirm Enrollment button shown |
| Enrollment — checkout | Click Confirm Enrollment | Redirect to Stripe checkout URL |

---

## Phase 4: Switch Webflow to New Bundle

**Scope:** Replace the live Webflow script load with the new hosted bundle. Delete the legacy monolith. This is the highest-risk phase.

**Files to delete:**
- `src/icit-app.js` (after successful Webflow swap)

**Regression risk:** HIGH. All applicant-facing pages are affected simultaneously. Roll-back plan: revert the Webflow custom code to the old URL (keep old URL available for 2 weeks after switch).

---

### Task 4.1: Host dist/icit-app.bundle.js at a stable URL

- [ ] **Step 1: Decide hosting approach**

Option A (simplest): GitHub Pages from the `main` branch, serving `dist/` as a subdirectory.
- URL: `https://YOUR_ORG.github.io/UX_Enrollment_Webflow/dist/icit-app.bundle.js`
- Requirement: repo must be public OR GitHub Pages must be enabled for private repo.

Option B: Netlify drop (drag dist/ into Netlify dashboard, get a URL).

Option C: Cloudflare Pages connected to the repo.

> Choose Option A if the repo is public. The URL is deterministic and no extra account setup is needed.

- [ ] **Step 2: Enable GitHub Pages**

Go to repo Settings → Pages → Source: Deploy from branch → Branch: `main`, Folder: `/dist` (or `/` if Pages serves the whole repo, then the URL has `/dist/` in the path).

OR set up a CI action that copies dist/ to the `gh-pages` branch.

- [ ] **Step 3: Verify the URL is reachable**

```bash
curl -I https://YOUR_ORG.github.io/UX_Enrollment_Webflow/dist/icit-app.bundle.js
```

Expected: `HTTP/2 200`

- [ ] **Step 4: Update Webflow site-wide custom code**

In Webflow: Project Settings → Custom Code → Footer Code.

Replace:
```html
<!-- old script tag (whatever currently loads icit-app.js) -->
```

With:
```html
<script src="https://YOUR_ORG.github.io/UX_Enrollment_Webflow/dist/icit-app.bundle.js"></script>
```

Publish the Webflow site to staging first.

- [ ] **Step 5: Run full manual regression checklist** (all rows from Phase 3 checklist)

Do not proceed until all checklist items pass on staging.

- [ ] **Step 6: Publish to production**

Publish Webflow to the production domain.

- [ ] **Step 7: Run full manual regression checklist on production**

- [ ] **Step 8: Delete src/icit-app.js**

Only after production regression passes:

```bash
git rm src/icit-app.js
git commit -m "refactor: delete icit-app.js monolith — replaced by src/ modules + dist/ bundle"
```

**Rollback plan:** If a regression is found after go-live, revert the Webflow custom code to the old script URL (keep the old file available at its original URL for at least 2 weeks). Then fix the bug in the modules, rebuild, and re-deploy.

---

## Phase 5: Align Admin Constants

**Scope:** Update `admin/src/lib/constants.ts` to match the values in `src/core/constants.js`. Add the `COURSES` constant (currently hardcoded in `DashboardPage.tsx`). Document the intentional difference in `WITHDRAW_ALLOWED`. No behavior change.

**Regression risk:** Low. Status filtering and course tab display.

---

### Task 5.1: Align admin/src/lib/constants.ts

**Files:**
- Modify: `admin/src/lib/constants.ts`

- [ ] **Step 1: Update constants.ts**

```typescript
import type { AppStatus } from './types';

export const STATUSES: AppStatus[] = [
  'draft', 'submitted', 'in_review',
  'waitlisted', 'accepted', 'rejected',
  'enrolled', 'withdrawn',
];

// Admin intentionally excludes 'draft' — withdrawing a draft is an applicant action,
// not an admin action. Applicant-side (src/core/constants.js) includes 'draft'.
export const WITHDRAW_ALLOWED: AppStatus[] = [
  'submitted', 'in_review', 'waitlisted', 'accepted',
];

// Must stay in sync with the COURSES constant in DashboardPage.tsx and ApplicationsPage.tsx.
// Source of truth: enrollment program offerings.
export const COURSES = ['ASC', 'ISC', 'AAC', 'FAC', 'IFAC', 'CITEC'] as const;
export type CourseCode = typeof COURSES[number];
```

- [ ] **Step 2: Update DashboardPage.tsx to import COURSES from constants**

In `admin/src/components/DashboardPage.tsx`, find the hardcoded `COURSES` array and replace with the import:

```typescript
import { COURSES } from '../lib/constants';
```

Remove the local `const COURSES = [...]` declaration.

- [ ] **Step 3: Update ApplicationsPage.tsx similarly**

Find and remove the hardcoded course list in `ApplicationsPage.tsx`, replacing with:

```typescript
import { COURSES } from '../lib/constants';
```

- [ ] **Step 4: Build admin to verify no TypeScript errors**

```bash
cd admin && npm run build
```

Expected: build succeeds with no errors.

- [ ] **Step 5: Commit**

```bash
cd ..
git add admin/src/lib/constants.ts admin/src/components/DashboardPage.tsx admin/src/components/ApplicationsPage.tsx
git commit -m "refactor: centralize admin constants, add COURSES type, document WITHDRAW_ALLOWED difference"
```

**Manual test checklist:**
- [ ] Admin dashboard: course breakdown table shows all 6 course codes
- [ ] Admin applications: course filter tabs show all 6 course codes
- [ ] Admin applications: status filter shows all statuses including 'draft'
- [ ] Admin: accepted application does NOT show Withdraw action (WITHDRAW_ALLOWED excludes 'enrolled'/'rejected')

---

## Phase 6: Build admin-write Edge Function

**Scope:** Create the `admin-write` Edge Function that handles three previously-stubbed operations in the admin panel: updating admin notes, generating a signed CV URL, and fetching application timeline events.

**New files:**
- `supabase/functions/admin-write/index.ts`

**Files to modify:**
- `admin/src/components/ApplicationDetail.tsx` (wire notes editor, CV viewer, timeline tab)
- `admin/src/lib/api.ts` (add invokeAdminWrite, getCvSignedUrl, getTimeline)

**Regression risk:** Medium. New functionality; does not touch existing read/transition flows.

---

### Task 6.1: Create supabase/functions/admin-write/index.ts

**Files:**
- Create: `supabase/functions/admin-write/index.ts`

- [ ] **Step 1: Write admin-write Edge Function**

The function handles three operations via query string:
- `PATCH /admin-write` with body `{application_id, admin_notes}` → updates admin_notes
- `GET /admin-write?resource=cv-url&application_id=X` → returns a signed storage URL for the CV
- `GET /admin-write?resource=timeline&application_id=X` → returns application_events for the application

Auth requirement: valid JWT with `app_metadata.role === 'admin'` (same pattern as `admin-read`).

```typescript
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Verify admin JWT
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return new Response('Unauthorized', { status: 401, headers: CORS });

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await admin.auth.getUser(token);
  if (authError || !user) return new Response('Unauthorized', { status: 401, headers: CORS });
  if (user.app_metadata?.role !== 'admin') return new Response('Forbidden', { status: 403, headers: CORS });

  const url = new URL(req.url);
  const resource = url.searchParams.get('resource');
  const applicationId = url.searchParams.get('application_id');

  try {
    // PATCH — update admin notes
    if (req.method === 'PATCH') {
      const body = await req.json();
      const { application_id, admin_notes } = body;
      if (!application_id) return new Response('Missing application_id', { status: 400, headers: CORS });

      const { error } = await admin
        .from('applications')
        .update({ admin_notes })
        .eq('id', application_id);

      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), { headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    // GET cv-url — generate signed URL for the applicant's CV
    if (req.method === 'GET' && resource === 'cv-url') {
      if (!applicationId) return new Response('Missing application_id', { status: 400, headers: CORS });

      const { data: app, error: appError } = await admin
        .from('applications')
        .select('cv_url, applicant_id')
        .eq('id', applicationId)
        .single();

      if (appError || !app) return new Response('Not found', { status: 404, headers: CORS });
      if (!app.cv_url) return new Response(JSON.stringify({ url: null }), { headers: { ...CORS, 'Content-Type': 'application/json' } });

      // cv_url stores the storage path, e.g. "applicant_id/filename.pdf"
      const { data: signed, error: signError } = await admin.storage
        .from('cvs')
        .createSignedUrl(app.cv_url, 3600); // 1-hour expiry

      if (signError) throw signError;
      return new Response(JSON.stringify({ url: signed.signedUrl }), { headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    // GET timeline — return application_events for an application
    if (req.method === 'GET' && resource === 'timeline') {
      if (!applicationId) return new Response('Missing application_id', { status: 400, headers: CORS });

      const { data, error } = await admin
        .from('application_events')
        .select('id, event_type, triggered_by, metadata, created_at')
        .eq('application_id', applicationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return new Response(JSON.stringify(data), { headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    return new Response('Not found', { status: 404, headers: CORS });

  } catch (err) {
    console.error('admin-write error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } });
  }
});
```

- [ ] **Step 2: Deploy admin-write Edge Function**

```bash
supabase functions deploy admin-write
```

Expected: deployment succeeds, function URL is printed.

- [ ] **Step 3: Smoke test the Edge Function**

Using a valid admin JWT (`TOKEN`):

```bash
# Test PATCH notes
curl -X PATCH https://xvweanlqcbgbiyxqhwux.supabase.co/functions/v1/admin-write \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"application_id":"<valid-id>","admin_notes":"test note"}'
# Expected: {"ok":true}

# Test GET timeline
curl "https://xvweanlqcbgbiyxqhwux.supabase.co/functions/v1/admin-write?resource=timeline&application_id=<valid-id>" \
  -H "Authorization: Bearer $TOKEN"
# Expected: JSON array of events

# Test GET cv-url
curl "https://xvweanlqcbgbiyxqhwux.supabase.co/functions/v1/admin-write?resource=cv-url&application_id=<valid-id>" \
  -H "Authorization: Bearer $TOKEN"
# Expected: {"url":"https://...signed-url..."} or {"url":null} if no CV uploaded
```

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/admin-write/
git commit -m "feat: add admin-write Edge Function (notes update, CV signed URL, timeline)"
```

---

### Task 6.2: Wire admin-write into admin/src/lib/api.ts

**Files:**
- Modify: `admin/src/lib/api.ts`

- [ ] **Step 1: Add three new API functions**

```typescript
// Add to admin/src/lib/api.ts

export async function updateAdminNotes(applicationId: string, adminNotes: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-write`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ application_id: applicationId, admin_notes: adminNotes }),
  });
  if (!res.ok) throw new Error(await res.text());
}

export async function getCvSignedUrl(applicationId: string): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error('Not authenticated');

  const url = `${SUPABASE_URL}/functions/v1/admin-write?resource=cv-url&application_id=${applicationId}`;
  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY },
  });
  if (!res.ok) throw new Error(await res.text());
  const json = await res.json();
  return json.url ?? null;
}

export async function getTimeline(applicationId: string): Promise<ApplicationEvent[]> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error('Not authenticated');

  const url = `${SUPABASE_URL}/functions/v1/admin-write?resource=timeline&application_id=${applicationId}`;
  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
```

> `SUPABASE_URL` and `SUPABASE_ANON_KEY` are already available as Vite environment variables in the admin app (`import.meta.env.PUBLIC_SUPABASE_URL`, etc.). Import them the same way as the existing calls in `api.ts`.

- [ ] **Step 2: Wire ApplicationDetail.tsx — notes tab**

In `admin/src/components/ApplicationDetail.tsx`, find the notes editor tab section (currently stubbed). Add a save handler that calls `updateAdminNotes`:

```typescript
import { updateAdminNotes } from '../lib/api';

// Inside the notes tab render:
const [notes, setNotes] = useState(application.admin_notes ?? '');
const [saving, setSaving] = useState(false);

async function handleSaveNotes() {
  setSaving(true);
  try {
    await updateAdminNotes(application.id, notes);
  } finally {
    setSaving(false);
  }
}
```

- [ ] **Step 3: Wire ApplicationDetail.tsx — CV tab**

```typescript
import { getCvSignedUrl } from '../lib/api';

// Inside the cv tab:
const [cvUrl, setCvUrl] = useState<string | null>(null);
const [cvLoading, setCvLoading] = useState(false);

useEffect(() => {
  if (activeTab !== 'cv') return;
  setCvLoading(true);
  getCvSignedUrl(application.id)
    .then(url => setCvUrl(url))
    .finally(() => setCvLoading(false));
}, [activeTab, application.id]);
```

- [ ] **Step 4: Wire ApplicationDetail.tsx — timeline tab**

```typescript
import { getTimeline } from '../lib/api';
import type { ApplicationEvent } from '../lib/types';

// Inside the timeline tab:
const [events, setEvents] = useState<ApplicationEvent[]>([]);
const [timelineLoading, setTimelineLoading] = useState(false);

useEffect(() => {
  if (activeTab !== 'timeline') return;
  setTimelineLoading(true);
  getTimeline(application.id)
    .then(data => setEvents(data))
    .finally(() => setTimelineLoading(false));
}, [activeTab, application.id]);
```

- [ ] **Step 5: Build admin to verify TypeScript compiles**

```bash
cd admin && npm run build
```

Expected: no TypeScript errors.

- [ ] **Step 6: Commit**

```bash
cd ..
git add admin/src/lib/api.ts admin/src/components/ApplicationDetail.tsx
git commit -m "feat: wire admin-write into ApplicationDetail — notes, CV viewer, timeline"
```

**Manual test checklist:**
- [ ] Admin: click an application, open Notes tab — text editor renders with existing admin_notes
- [ ] Admin: edit notes, click Save — no error, notes persist on reload
- [ ] Admin: open CV tab — PDF viewer or download link appears (or "No CV uploaded" if empty)
- [ ] Admin: open Timeline tab — list of events in chronological order
- [ ] Admin: unauthenticated request to admin-write returns 401
- [ ] Admin: non-admin JWT returns 403

---

## Phase 7: Programs CRUD — Replace Retool

**Scope:** Build a Programs management page inside the admin panel so Retool is no longer needed for day-to-day operations. This adds a new route `/admin/programs` and the supporting Edge Function operations.

**Files to create:**
- `admin/src/components/ProgramsPage.tsx`

**Files to modify:**
- `supabase/functions/admin-read/index.ts` (add programs CRUD operations, or create `admin-programs` function)
- `admin/src/components/AdminApp.tsx` (add Programs nav route)
- `admin/src/lib/api.ts` (add programs CRUD API functions)

**Files to archive:**
- `retool/test-admin-api.js` → move to `tests/admin-api.test.js`

**Regression risk:** Medium. New route; does not touch existing applications or review flow. Risk: programs table mutation could affect applicant-facing `loadPrograms` if new fields or statuses are introduced incorrectly.

---

### Task 7.1: Extend admin-read to support programs CRUD

> Alternative: create a separate `admin-programs` Edge Function. Use `admin-read` extension only if the existing function is under 200 lines and adding CRUD operations won't make it unwieldy. Check first:
> `wc -l supabase/functions/admin-read/index.ts`
> If over 150 lines, create `supabase/functions/admin-programs/index.ts` instead.

**Files:**
- Modify: `supabase/functions/admin-read/index.ts` OR create `supabase/functions/admin-programs/index.ts`

- [ ] **Step 1: Add programs CRUD routes**

The programs table schema (from migrations):
- `id` (uuid, pk), `name` (text), `deadline` (timestamptz), `status` ('active'|'archived'), `price_cents` (int), `program_questions` (jsonb), `course_code` (text, CHECK in COURSES)

Operations to support:
- `GET /admin-programs` → list all programs (all statuses)
- `POST /admin-programs` → create program
- `PATCH /admin-programs?id=X` → update program fields
- `DELETE /admin-programs?id=X` → set status to 'archived' (soft delete; do not hard-delete — applications reference programs)

All operations require admin JWT. Use the same auth check pattern as `admin-read`.

```typescript
// GET all programs (including archived)
if (req.method === 'GET' && !url.searchParams.has('id')) {
  const { data, error } = await admin.from('programs').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return json(data);
}

// POST create
if (req.method === 'POST') {
  const body = await req.json();
  const { name, deadline, status, price_cents, program_questions, course_code } = body;
  const { data, error } = await admin.from('programs').insert({ name, deadline, status, price_cents, program_questions, course_code }).select().single();
  if (error) throw error;
  return json(data, 201);
}

// PATCH update
if (req.method === 'PATCH') {
  const id = url.searchParams.get('id');
  if (!id) return new Response('Missing id', { status: 400, headers: CORS });
  const body = await req.json();
  const { data, error } = await admin.from('programs').update(body).eq('id', id).select().single();
  if (error) throw error;
  return json(data);
}

// DELETE → soft delete (archive)
if (req.method === 'DELETE') {
  const id = url.searchParams.get('id');
  if (!id) return new Response('Missing id', { status: 400, headers: CORS });
  const { error } = await admin.from('programs').update({ status: 'archived' }).eq('id', id);
  if (error) throw error;
  return json({ ok: true });
}
```

- [ ] **Step 2: Deploy**

```bash
supabase functions deploy admin-read   # or admin-programs
```

- [ ] **Step 3: Smoke test**

```bash
# List programs
curl https://xvweanlqcbgbiyxqhwux.supabase.co/functions/v1/admin-programs \
  -H "Authorization: Bearer $TOKEN"
# Expected: JSON array

# Create program
curl -X POST https://xvweanlqcbgbiyxqhwux.supabase.co/functions/v1/admin-programs \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Test Program","status":"active","price_cents":50000,"course_code":"ASC","deadline":"2026-12-31T00:00:00Z","program_questions":[]}'
# Expected: program object with id
```

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/admin-read/ # or admin-programs/
git commit -m "feat: add programs CRUD to admin Edge Function"
```

---

### Task 7.2: Add programs API functions to admin/src/lib/api.ts

**Files:**
- Modify: `admin/src/lib/api.ts`

- [ ] **Step 1: Add program API calls**

```typescript
import type { Program } from './types';

export async function getPrograms(): Promise<Program[]> {
  return invokeAdminRead('programs');
}

export async function createProgram(program: Omit<Program, 'id'>): Promise<Program> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-programs`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(program),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function updateProgram(id: string, fields: Partial<Program>): Promise<Program> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-programs?id=${id}`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(fields),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function archiveProgram(id: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-programs?id=${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON_KEY },
  });
  if (!res.ok) throw new Error(await res.text());
}
```

- [ ] **Step 2: Ensure Program type includes all writable fields**

In `admin/src/lib/types.ts`, verify the `Program` type has:
```typescript
export interface Program {
  id: string;
  name: string;
  deadline: string;       // ISO timestamp
  status: 'active' | 'archived';
  price_cents: number;
  program_questions: unknown[];  // jsonb
  course_code: string;
  created_at: string;
}
```

- [ ] **Step 3: Commit**

```bash
git add admin/src/lib/api.ts admin/src/lib/types.ts
git commit -m "feat: add programs CRUD API functions"
```

---

### Task 7.3: Create ProgramsPage.tsx

**Files:**
- Create: `admin/src/components/ProgramsPage.tsx`

- [ ] **Step 1: Write ProgramsPage.tsx**

The page shows a list of programs with name, course code, deadline, status, price. Inline edit: clicking a row opens a form to edit fields. Archive button soft-deletes. New Program button opens a blank form.

```typescript
import { useState, useEffect } from 'react';
import { getPrograms, createProgram, updateProgram, archiveProgram } from '../lib/api';
import { COURSES } from '../lib/constants';
import type { Program } from '../lib/types';

const BLANK_PROGRAM: Omit<Program, 'id' | 'created_at'> = {
  name: '',
  deadline: '',
  status: 'active',
  price_cents: 0,
  program_questions: [],
  course_code: COURSES[0],
};

export function ProgramsPage() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Program> & { id?: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPrograms().then(setPrograms).finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    if (!editing) return;
    setSaving(true);
    setError(null);
    try {
      if (editing.id) {
        const updated = await updateProgram(editing.id, editing);
        setPrograms(ps => ps.map(p => p.id === updated.id ? updated : p));
      } else {
        const created = await createProgram(editing as Omit<Program, 'id'>);
        setPrograms(ps => [created, ...ps]);
      }
      setEditing(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive(id: string) {
    if (!confirm('Archive this program? Existing applications are not affected.')) return;
    await archiveProgram(id);
    setPrograms(ps => ps.map(p => p.id === id ? { ...p, status: 'archived' } : p));
  }

  if (loading) return <div className="p-6 text-sm text-gray-400">Loading programs…</div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-gray-900">Programs</h1>
        <button
          onClick={() => setEditing({ ...BLANK_PROGRAM })}
          className="px-3 py-1.5 text-sm bg-[#1a3a5c] text-white rounded hover:bg-[#123161]"
        >
          New Program
        </button>
      </div>

      {/* Program list */}
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-gray-200 text-left text-gray-500">
            <th className="py-2 pr-4">Name</th>
            <th className="py-2 pr-4">Course</th>
            <th className="py-2 pr-4">Deadline</th>
            <th className="py-2 pr-4">Price</th>
            <th className="py-2 pr-4">Status</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {programs.map(p => (
            <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-2 pr-4 font-medium">{p.name}</td>
              <td className="py-2 pr-4 text-gray-500">{p.course_code}</td>
              <td className="py-2 pr-4 text-gray-500">{p.deadline ? new Date(p.deadline).toLocaleDateString() : '—'}</td>
              <td className="py-2 pr-4 text-gray-500">{(p.price_cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</td>
              <td className="py-2 pr-4">
                <span className={p.status === 'active' ? 'text-green-600' : 'text-gray-400'}>
                  {p.status}
                </span>
              </td>
              <td className="py-2 flex gap-2">
                <button onClick={() => setEditing({ ...p })} className="text-xs text-blue-600 hover:underline">Edit</button>
                {p.status === 'active' && (
                  <button onClick={() => handleArchive(p.id)} className="text-xs text-red-500 hover:underline">Archive</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Edit / Create form */}
      {editing && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="text-base font-semibold mb-4">{editing.id ? 'Edit Program' : 'New Program'}</h2>
            {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
            <div className="space-y-3">
              <label className="block text-sm">
                <span className="text-gray-600">Name</span>
                <input value={editing.name ?? ''} onChange={e => setEditing(ed => ({ ...ed!, name: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
              </label>
              <label className="block text-sm">
                <span className="text-gray-600">Course Code</span>
                <select value={editing.course_code ?? COURSES[0]} onChange={e => setEditing(ed => ({ ...ed!, course_code: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded px-2 py-1.5 text-sm">
                  {COURSES.map(c => <option key={c}>{c}</option>)}
                </select>
              </label>
              <label className="block text-sm">
                <span className="text-gray-600">Deadline</span>
                <input type="datetime-local" value={editing.deadline?.slice(0, 16) ?? ''}
                  onChange={e => setEditing(ed => ({ ...ed!, deadline: new Date(e.target.value).toISOString() }))}
                  className="mt-1 block w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
              </label>
              <label className="block text-sm">
                <span className="text-gray-600">Price (cents)</span>
                <input type="number" value={editing.price_cents ?? 0}
                  onChange={e => setEditing(ed => ({ ...ed!, price_cents: Number(e.target.value) }))}
                  className="mt-1 block w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
              </label>
              <label className="block text-sm">
                <span className="text-gray-600">Status</span>
                <select value={editing.status ?? 'active'} onChange={e => setEditing(ed => ({ ...ed!, status: e.target.value as Program['status'] }))}
                  className="mt-1 block w-full border border-gray-300 rounded px-2 py-1.5 text-sm">
                  <option value="active">active</option>
                  <option value="archived">archived</option>
                </select>
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setEditing(null)} className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="px-3 py-1.5 text-sm bg-[#1a3a5c] text-white rounded hover:bg-[#123161] disabled:opacity-50">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add admin/src/components/ProgramsPage.tsx
git commit -m "feat: add ProgramsPage component"
```

---

### Task 7.4: Add programs route to AdminApp.tsx

**Files:**
- Modify: `admin/src/components/AdminApp.tsx`

- [ ] **Step 1: Add programs to Route type and nav**

```typescript
import { ProgramsPage } from './ProgramsPage';

type Route = 'dashboard' | 'applications' | 'programs';

// In getRoute():
if (path.includes('/programs')) return 'programs';

// In navigate():
const path = to === 'applications' ? '/admin/applications'
           : to === 'programs'      ? '/admin/programs'
           : '/admin';

// Replace the Retool link with:
<a
  href="/admin/programs"
  onClick={(e) => navigate(e, 'programs')}
  className={`py-3 text-sm font-medium border-b-2 transition-colors ${
    route === 'programs'
      ? 'border-[#123161] text-[#123161]'
      : 'border-transparent text-gray-500 hover:text-gray-700'
  }`}
>
  Programs
</a>

// In main content area:
{route === 'programs' && <ProgramsPage />}
```

- [ ] **Step 2: Build admin**

```bash
cd admin && npm run build
```

Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
cd ..
git add admin/src/components/AdminApp.tsx
git commit -m "feat: add Programs nav route to admin panel, replace Retool link"
```

---

### Task 7.5: Archive Retool

- [ ] **Step 1: Move retool test to proper test location**

```bash
cp retool/test-admin-api.js tests/admin-api-smoke.js
git rm -r retool/
git add tests/admin-api-smoke.js
git commit -m "chore: archive retool directory, move API smoke test to tests/"
```

**Manual test checklist:**
- [ ] Admin: Programs nav tab is visible and clickable
- [ ] Admin: Programs page lists all existing programs
- [ ] Admin: Create new program with all fields → program appears in list
- [ ] Admin: Edit existing program → changes saved and reflected
- [ ] Admin: Archive program → program status shows 'archived'
- [ ] Webflow apply page: program select still shows only active programs (confirms soft-delete doesn't break applicant flow)
- [ ] No "Programs ↗" link pointing to retool.com remains in admin nav

---

## Self-Review Against Spec

**Spec requirement → plan task mapping:**

| Requirement | Covered By |
|---|---|
| Webflow as primary frontend | Architecture reference (top of plan) |
| Framework-agnostic JS over React where practical | Phases 1–4: applicant code becomes ES modules (no React) |
| Separate business logic from DOM/rendering | Phase 2: core/auth.js (logic), core/ui.js (DOM), pages/* (composition) |
| Supabase calls centralized | Phase 2: all Supabase access via `db` from supabase.js |
| Admin actions secure / privileged ops in Edge Functions | Phase 6: admin-write Edge Function; no service role key in browser |
| Minimize duplication between public and admin flows | Phase 5: constants aligned; admin-write shares patterns with admin-read |
| Preserve current behavior | Each phase ends with regression checklist before deployment |
| No new product requirements | Programs CRUD replaces existing Retool; admin-write surfaces existing DB data |
| Final folder structure | Architecture Reference section |
| Naming conventions | Architecture Reference section |
| Module boundaries | Architecture Reference section |
| Where code lives in Webflow | Architecture Reference section |
| Phased migration (smallest-safe-first) | Phases 1→7, ordered by risk |
| Files to create/move/delete per phase | Each task's Files section |
| Regression risks | Stated per phase header |
| Manual test checklist | After each phase's final task |

**Placeholder scan:** No TBD or TODO left except `[paste exact implementation from icit-app.js]` markers in Phases 2–3, which are intentional — they direct the implementer to copy verified code rather than risk reinventing it. The intent is explicit copy, not invention.

**Known gaps:**
- `program_questions` editor in ProgramsPage.tsx is represented as a raw jsonb field (price_cents input). A proper question builder is not included — that would be a new product requirement. If needed, open a separate task.
- `moodle_course_id` column on programs table is not added in this plan — that remains a stub pending Moodle API credentials.
- Webflow Designer session (Task 0 equivalent for the new contact fields: address, phone, etc.) is not scoped here. Form fields for the 10 new columns must be added in Webflow before apply.js extraction is testable end-to-end.

---

## Superseded Plans

| File | Status | Reason |
|---|---|---|
| `docs/superpowers/plans/2026-04-27-wized-replacement.md` | Superseded by this plan | `src/icit-app.js` monolith built and deployed (Tasks 1–13 complete). This plan drives the modularization of that monolith. |
| `docs/superpowers/plans/admin-panel-next-steps.md` | Closed — all tasks complete | All 15 admin panel tasks done: Astro scaffold, types/constants, Supabase client, admin-read Edge Function, UI atoms, auth hook, layout, ApplicationList, RowSubmenu, ApplicationDetail, ConfirmDialog, useApplications, ApplicationsPage, DashboardPage, AdminApp. |
