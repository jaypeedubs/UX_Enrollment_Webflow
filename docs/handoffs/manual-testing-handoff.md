# ICIT Enrollment Webflow/Supabase Debugging Handoff

We worked on the applicant-facing Webflow replacement script at:

- `src/icit-app.js`

And added/applied Supabase migrations:

- `supabase/migrations/005_client_api_grants.sql`
- `supabase/migrations/006_program_answers_and_test_program.sql`

## Main Issues Reported

Manual testing initially showed:

- Signup worked, but email confirmation redirected to the main site instead of `/login`.
- `/login` and `/apply` could render blank.
- Dashboard showed navbar only, no application content.
- Supabase REST calls to `applications` and `notifications` returned `403`.
- Program questions did not populate.
- Apply step indicator stayed stuck on step 1.
- CV upload UI showed `file.pdf uploaded` even when no file was uploaded.
- Upload progress stayed at `0%`.

Additional latest manual-testing notes:

- Questions still never populated on the second step during manual testing, even after the seeded test program was populated.
- Check the Retool setup with Supabase. Nothing appears to be “shooting over” or appearing in Retool from the applicant flow, so the Retool data source, queries, permissions, or expected refresh flow may not be wired up correctly.
- Email confirmation link now correctly goes to the sign-in page, but after signing in the user is directed to a blank page with only the navbar. The tester must manually type the `/apply` URL to find the program application.

## Root Causes Found

- Supabase Auth signup did not pass `emailRedirectTo`.
- Supabase tables had RLS policies but lacked `anon`/`authenticated` table grants.
- Production had no active `programs` rows.
- `applications.program_answers` column was missing.
- Current Webflow DOM did not fully match script assumptions:
  - missing or mismatched question template
  - fragile stepper/progress DOM selectors
  - missing dashboard/notification drawer elements
- Old custom Webflow scripts were still running at first; user removed them.

## Changes Made

### Auth/Login

- `signUp()` now passes:
  - `emailRedirectTo: window.location.origin + '/login'`
- `/login` detects Supabase auth callback params/hash, signs out confirmed session, cleans URL, and shows `Email confirmed. Please sign in.`
- `SIGNED_OUT` redirect skips redirecting when already on `/login`.

### Blank Screen Hardening

- Added `initPage(name, initFn)` wrapper around page initializers.
- If page init throws, it logs `ICIT page init failed` and reveals the page instead of leaving `#icit-page-wrapper` hidden.
- Login reveals page even when required Webflow `wized` attributes are missing.

### Supabase

Applied migration `client_api_grants` to production:

- Grants `USAGE` on `public` to `anon`, `authenticated`
- Grants:
  - `SELECT` on `programs`
  - `SELECT, INSERT, UPDATE` on `applications`
  - `SELECT, INSERT` on `application_events`
  - `SELECT, UPDATE` on `notifications`

Applied migration `program_answers_and_test_program` to production:

- Adds `applications.program_answers jsonb`
- Seeds one active test program with two questions if no active program exists.

### Dashboard

- Dashboard loads application first.
- Notifications failure no longer blocks dashboard render.
- Added fallback dashboard content if expected Webflow dashboard elements are missing.
- Added fallback notification drawer if `wized="notif-drawer"` is missing.
- Dashboard now handles missing joined `programs` defensively.

### Apply Page

- `loadApplication()` now selects:
  - `program_id`
  - `program_answers`
  - joined program data
- Program question rendering now normalizes JSON/string question data.
- If `wized="question-item"` template exists, it clones it.
- If no question template exists, it generates question fields directly in section 2.
- Supports `select`, `textarea`, and text-ish input question types.
- Saves answers into `program_answers`.
- Stepper logic attempts to update label styling and progress bar width when changing sections.
- Continue buttons now show visible errors if draft save cannot proceed.
- CV UI initializes from saved `cv_url`:
  - saved CV -> uploaded state, progress `100%`
  - no saved CV -> upload state, progress `0%`
- Upload success sets progress to `100%`.
- Remove CV resets progress to `0%`.

Important unresolved apply-page note:

- Despite the generated-question fallback added to `src/icit-app.js`, manual testing still reported that questions never populated on step 2. Next investigation should inspect the live Webflow DOM and browser console after publishing the latest script to confirm:
  - the updated script is actually live
  - `initApply()` is running the latest `renderQuestions()` logic
  - section 2 has `wized="form-section-2"`
  - `programSelect.value` matches the seeded program id
  - no Webflow styling or hidden parent is concealing generated question fields

## Tests Added

Added Node VM regression tests in:

- `tests/icit-app.test.js`

Covered:

- Login reveals if markers are missing.
- Signup sends `emailRedirectTo` to `/login`.
- Login auth callback does not redirect to dashboard.
- `/apply` reveals on data-load failure.
- Dashboard renders when notifications fail.

Verification commands run successfully:

```bash
node --check src/icit-app.js
node tests/icit-app.test.js
```

## Current Production Data Observed

- One auth user exists.
- One active seeded program exists:
  - `ICIT Enrollment Test Program`
  - two program questions
- One draft application exists for the test user.
- That draft has a saved `cv_url`, so the green CV uploaded state is valid for that existing draft until removed.

## Retool Follow-Up

Check Retool setup with Supabase because nothing appears to be arriving in Retool from the applicant flow.

Likely areas to inspect:

- Retool resource is connected to the correct Supabase project: `xvweanlqcbgbiyxqhwux`.
- Retool uses a service-role or otherwise privileged backend credential, not the public anon key.
- Retool queries in `retool/queries.sql` or `supabase/retool/retool-build-prompt.md` are installed in the Retool app.
- Retool query filters are not hiding draft applications.
- Retool table refresh is triggered manually or after applicant changes.
- Retool is querying `public.applications` joined to `programs` and auth user data as expected.

## Current Auth/Dashboard Follow-Up

The email confirmation link correctly lands on sign-in now. However, after signing in, the user is taken to a blank page with only the navbar instead of seeing dashboard content or a clear CTA to continue/start the application.

Next things to inspect:

- Confirm whether sign-in redirects to `/dashboard` and whether `initDashboard()` is running on the live page.
- Check browser console for `ICIT page init failed: dashboard` or missing `wized` dashboard attributes.
- Verify the dashboard page contains either the expected Webflow elements:
  - `wized="dash-no-application"`
  - `wized="dash-application"`
  - `wized="start-application-link"`
  - `wized="app-program-name"`
- If dashboard elements are intentionally absent, confirm the fallback dashboard block is being appended under `#icit-page-wrapper`.
- Verify the published Webflow custom code is the latest `src/icit-app.js`; older versions can still produce navbar-only blank pages.
- Expected behavior: after sign-in, dashboard should show either the saved draft status or a CTA/link to `/apply`; user should not have to manually type `/apply`.

## Important Next Step

The updated `src/icit-app.js` must be pasted/published into Webflow Custom Code each time. Local changes alone do not affect the live Webflow site.

If step indicators still do not visually change after publishing, inspect the actual Webflow stepper DOM and either:

- add stable attributes such as `wized="apply-step-1"`, `wized="apply-step-2"`, `wized="apply-step-3"`, `wized="apply-progress-bar"`, or
- adapt `updateApplyStepper()` to the exact Webflow structure.
