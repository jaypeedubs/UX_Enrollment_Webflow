# Enrollment Frontend Update — Design Spec
**Date:** 2026-05-13  
**Source:** `/Users/m4macmini/Downloads/Enrollment Frontend/Enrollment Journey.html`  
**Approach:** Webflow-first (Approach A) — Webflow Designer owns all HTML/CSS; JS wires `wized` attributes

---

## Overview

Update the applicant-facing enrollment frontend to match the interactive prototype delivered in `Enrollment Journey.html`. Covers the login page, dashboard, apply flow (3 → 5 steps), and a new application-submitted confirmation page.

No new dependencies, packages, or changes to `src/core/*` or `supabase/`.

---

## Architecture

| Layer | What changes |
|---|---|
| Webflow Designer — login page | Remove tab UI; two separate form layouts toggled by header buttons |
| Webflow Designer — dashboard page | Add course card grid + Continue button inside the no-application state |
| Webflow Designer — apply page | 5 named sections (was 3), updated step progress bar, CV upload gets own section |
| Webflow Designer — new page `/application-submitted` | Submitted confirmation screen |
| `src/pages/login.js` | Remove tab toggle; add screen-switch listeners; add confirm-password validation |
| `src/pages/dashboard.js` | Render course cards from DB; track selection; write to sessionStorage; navigate to /apply |
| `src/pages/apply.js` | 5-step navigation; read course from sessionStorage; CV section; CV-style review; redirect to /application-submitted |
| `src/pages/submitted.js` (new) | Auth gate; populate program name from sessionStorage; clear sessionStorage |
| `src/main.js` | Register `initSubmitted` for `/application-submitted` route |

---

## Section 1: Login Page

### Webflow Designer
- Remove the tab bar (`wized="tab-signin"`, `wized="tab-signup"`).
- Two full-width form layouts on the same page — sign-in visible by default, sign-up hidden.
- Each layout has a minimal header with logo + a text button to switch screens:
  - Sign-in header: `wized="goto-signup"` button ("Sign Up")
  - Sign-up header: `wized="goto-signin"` button ("Sign In")
- Sign-up form gets a new **Confirm Password** input: `wized="signup-confirm-password"`
- Sign-up layout: `wized="signup-section"` | Sign-in layout: `wized="signin-section"` (names unchanged)

### `login.js`
- Remove tab click listeners (currently on `wized="tab-signin"` and `wized="tab-signup"`).
- Add click listeners on `goto-signup` / `goto-signin` to toggle visibility (same `show()`/`hide()` + `classList` pattern).
- Before calling `signUp()`: validate `signup-confirm-password` matches `signup-password`; show `signup-error-msg` if not, return early.
- Everything else unchanged: `signIn()`, `signUp()`, `requireGuest()`, `completeLoginAuthReturn()`, error/loading states, redirect to `/dashboard`.

---

## Section 2: Dashboard Page

### Webflow Designer
Inside the existing `wized="dash-no-application"` block:
- Add a course card grid container: `wized="course-card-list"`
- Add one hidden template card: `wized="course-card-item"` containing:
  - `wized="course-card-name"` — program name text node
  - `wized="course-card-desc"` — program description text node
- Add a **Continue** button: `wized="start-application-btn"` (visually muted until a course is selected)
- Add an inline error element: `wized="course-select-error"` (hidden by default)

Enrolled list, active application card, notification drawer — all unchanged.

### `dashboard.js`
- After loading programs, render course cards into `course-card-list` by cloning `course-card-item` — one card per active/upcoming program.
- Apply `--course-color` CSS variable per card using the course's color (stored in program data or mapped from program name/code).
- Track selected course ID in a local variable; on card click: add `selected` class to clicked card, remove from others, store selection.
- On **Continue** click:
  - If no course selected: show `course-select-error`, return.
  - Write `{ programId, programName }` to `sessionStorage` key `icit-selected-course`.
  - Navigate to `/apply`.
- All existing application status display, notification drawer, enrolled list logic — untouched.

---

## Section 3: Apply Flow (5 Steps)

### Webflow Designer
Replace 3 sections with 5, all hidden on load:

| Section | `wized` key | Contents |
|---|---|---|
| 1 | `form-section-1` | Confirm Course: `confirm-course-name`, `confirm-course-desc`, `change-course-btn`, `next-section-1-btn` |
| 2 | `form-section-2` | Personal Info: all existing contact/location/professional `wized` fields (names unchanged) |
| 3 | `form-section-3` | CV Upload: existing `cv-upload-zone`, `cv-upload-success`, `cv-file-input`, `cv-remove-btn`, `cv-filename` (moved from section 1, names unchanged) |
| 4 | `form-section-4` | Program Questions: existing `dynamic-questions` host, `question-item` template, `questions-empty`, `questions-loading` (names unchanged) |
| 5 | `form-section-5` | Review & Submit: CV-style layout with 4 sub-sections — each populated by JS |

**Review sub-sections (Section 5) and their `wized` targets:**

| Sub-section | Fields |
|---|---|
| Personal Information | `review-name`, `review-contact`, `review-location` |
| Professional Background | `review-role`, `review-institution`, `review-credentials` |
| Application Statement | Dynamic — `populateReview()` iterates `programAnswers` and renders each Q&A pair into a container (`wized="review-questions-host"`); no hardcoded question IDs |
| Program Selection | `review-program-name` |

**Progress bar:** 5 horizontal segments — `wized="progress-step-1"` through `wized="progress-step-5"`. Each gets `completed` class for past steps, `current` for active, default for future.

**Back/Continue buttons per section:**

| Section | Back | Continue |
|---|---|---|
| 1 | `change-course-btn` → sessionStorage clear + `/dashboard` | `next-section-1-btn` → section 2 |
| 2 | `back-section-2-btn` → section 1 | `next-section-2-btn` → save draft + section 3 |
| 3 | `back-section-3-btn` → section 2 | `next-section-3-btn` → section 4 |
| 4 | `back-section-4-btn` → section 3 | `next-section-4-btn` → save draft + populate review + section 5 |
| 5 | `back-section-5-btn` → section 4 | `submit-application-btn` → submit + `/application-submitted` |

### `apply.js`
- On init — three-branch logic for `programId`:
  1. sessionStorage has `icit-selected-course` → use it (new application flow from dashboard)
  2. sessionStorage missing AND existing draft has `program_id` → use draft's `program_id` and program name (user returned to apply via active application card)
  3. sessionStorage missing AND no draft → redirect to `/dashboard`
- Pre-fill `confirm-course-name` and `confirm-course-desc` from sessionStorage value.
- Remove program select dropdown logic (program is locked at dashboard; `programId` comes from sessionStorage).
- Update `goToSection(n)` to handle 5 sections.
- Update `updateApplyStepper(n)` to handle 5 segments (adds/removes `completed` and `current` classes on `progress-step-N` elements).
- CV upload logic (currently in section 1) moves to section 3 — same event listeners, no logic change.
- Before showing section 5: call `populateReview()` — queries form fields and calls `setText()` on all `review-*` targets.
- On submit success: navigate to `/application-submitted` (not `/dashboard`).
- Retain: `saveDraft()`, `uploadCV()`, `removeCV()`, `submitApplication()`, `renderQuestions()`, all Supabase calls, all error/loading states.

---

## Section 4: Application Submitted Page (new)

### Webflow Designer — new page `/application-submitted`
- Header: logo + ICIT wordmark only (no nav actions)
- Centered content column:
  - Checkmark icon (Material Symbols `check_circle`)
  - `<h1>` "Application Submitted"
  - Subtext paragraph
  - Summary card with 3 rows:
    - Program: `wized="submitted-program-name"`
    - Status: `wized="submitted-status"` (static "Under Review")
    - Next Step: `wized="submitted-next-step"` (static "We'll notify you via email")
  - Review timeline paragraph (static copy)
  - "Return to Dashboard" `<a>` link to `/dashboard` — no JS needed

### `src/pages/submitted.js` (new file)
```js
import { requireAuth } from '../core/auth.js';
import { db } from '../core/supabase.js';
import { q, setText, revealPage } from '../core/ui.js';

export async function initSubmitted() {
  await requireAuth();

  const cached = sessionStorage.getItem('icit-selected-course');
  let programName = '';

  if (cached) {
    try { programName = JSON.parse(cached).programName || ''; } catch (_) {}
    sessionStorage.removeItem('icit-selected-course');
  }

  if (!programName) {
    // Fallback: fetch most recent submitted application
    // (omitted from this skeleton — implement if sessionStorage miss is a real risk)
  }

  setText(q('[wized="submitted-program-name"]'), programName);
  revealPage();
}
```

### `main.js`
- Import `initSubmitted` from `./pages/submitted.js`
- Add route entry for `/application-submitted`

---

## Edge Cases & Error Handling

| Scenario | Handling |
|---|---|
| User navigates to `/apply` without selecting a course | Redirect to `/dashboard` on init |
| User navigates to `/application-submitted` without a session | `requireAuth()` redirects to `/login` |
| sessionStorage missing program name on submitted page | Fetch most recent application from Supabase as fallback |
| User submits without uploading CV | Alert (existing behavior) — consider replacing `alert()` with inline error on `form-section-3` |
| Existing draft with locked program | Handled by branch 2 of init logic: draft's `program_id` and name used directly; sessionStorage not required |

---

## Out of Scope
- Course color data source — the prototype hardcodes 6 course colors. If the DB `programs` table doesn't have a `color` column, colors should be mapped from program name/code in JS (not added to the DB schema).
- Dark mode — prototype includes a toggle; not implemented in this update.
- Mobile breakpoint CSS — Webflow Designer handles responsive; not part of this JS-focused update.
- WCAG audit — noted in prototype README as a future step; not in this scope.
- Notifications redesign — notification drawer is unchanged.
