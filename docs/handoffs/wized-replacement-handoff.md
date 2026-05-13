# Handoff: Wized Replacement Implementation

**Date:** 2026-04-28  
**Project:** ICIT Enrollment Portal  
**Status:** Implementation Complete, Pending Manual Deploy & Test

---

## 1. Summary of Actions Taken
During this session, we replaced the Wized no-code logic layer with a custom vanilla JavaScript implementation (`src/icit-app.js`). This avoids the blocking issues encountered with the Wized configurator and provides a more maintainable, version-controlled codebase.

### Key Milestones:
- **Scaffolded IIFE Shell:** Created the core application structure with Supabase JS SDK integration.
- **API Layer:** Implemented all required Supabase operations (Auth, CRUD for applications/notifications/programs, Storage for CVs).
- **UI Helpers:** Created DOM manipulation and formatting utilities.
- **Page Modules:** Built initialization logic for five key pages:
    - `/login`: Sign-in/Sign-up toggles and auth operations.
    - `/dashboard`: Application status card and notification drawer.
    - `/apply`: Multi-section form with dynamic questions and file uploads.
    - `/application-status`: Timeline tracking and administrative follow-ups.
    - `/enrollment-confirmation`: Stripe checkout initiation.
- **Dispatcher:** Implemented path-based routing to trigger the correct module on load.

---

## 2. Current State

### Files Modified:
- `src/icit-app.js`: Contains the full application logic (Complete).

### Git Status:
- **Branch:** `feat/wized-replacement`
- **Last Commit:** `feat: add dispatcher — icit-app.js complete`

### Verified:
- `SUPABASE_ANON_KEY` in `src/icit-app.js` matches `.env`.
- `SUPABASE_URL` is set to `https://xvweanlqcbgbiyxqhwux.supabase.co`.
- Code structure follows the `docs/superpowers/specs/2026-04-27-wized-replacement-design.md`.

---

## 3. Deployment Instructions (Task 12)

1. **Verify Task 0:** Ensure a manual Webflow Designer session has added the required `wized` attributes and custom code wrappers as specified in the [Implementation Plan](docs/superpowers/plans/2026-04-27-wized-replacement.md).
2. **Open Webflow:** Go to Site Settings → Custom Code → Head Code.
3. **Add Script Tags:** 
    ```html
    <!-- Supabase JS SDK v2 -->
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>

    <!-- ICIT application logic -->
    <script>
    [PASTE CONTENTS OF src/icit-app.js HERE]
    </script>
    ```
4. **Publish:** Publish the site to the staging domain.

---

## 4. Testing (Task 13)
Follow the comprehensive testing checklist in `docs/superpowers/plans/2026-04-27-wized-replacement.md`. Key areas to verify:
- Auth redirects (Home -> Login, Protected -> Login).
- Form autosave and field locking on `/apply`.
- Stripe checkout redirection on `/enrollment-confirmation`.
- Notification read status on `/dashboard`.

---

## 5. Known Constraints
- **Environment Variables:** The `SUPABASE_ANON_KEY` is hardcoded in the JS file as it is a client-side requirement. RLS is enabled in the database to ensure security.
- **Moodle Handoff:** The backend Edge Function for Moodle is scaffolded but requires final API credentials once provided by the user.
