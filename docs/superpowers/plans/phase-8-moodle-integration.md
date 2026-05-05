# Phase 8: Moodle Integration Plan

**Goal:** Automatically enroll applicants in the corresponding Moodle course upon successful payment (status → `enrolled`).

## Architecture Reference

- **Trigger:** `stripe-webhook` Edge Function calls `moodle-handoff` asynchronously after updating status to `enrolled`.
- **Moodle API:** Uses REST API via `/webservice/rest/server.php`.
- **Mapping:** `programs.moodle_course_id` maps ICIT programs to Moodle courses.

---

## Task 8.1: Schema Update — Add `moodle_course_id`

**Prerequisites:** None.

**Files:**
- Create: `supabase/migrations/011_program_moodle_id.sql`
- Modify: `admin/src/lib/types.ts`

- [ ] **Step 1: Create migration 011**
  ```sql
  ALTER TABLE programs ADD COLUMN IF NOT EXISTS moodle_course_id TEXT;
  ```
- [ ] **Step 2: Update Program type in admin/src/lib/types.ts**
  ```typescript
  export interface Program {
    // ... existing
    moodle_course_id: string | null;
  }
  ```
- [ ] **Step 3: Apply migration locally**
  ```bash
  supabase db push
  ```

**Verification:**
- [ ] `SELECT column_name FROM information_schema.columns WHERE table_name = 'programs' AND column_name = 'moodle_course_id';` returns 1 row.
- [ ] `cd admin && npx tsc --noEmit` passes.

---

## Task 8.2: Admin UI Update — Manage Moodle Course IDs

**Prerequisites:** Task 8.1 complete.

**Files:**
- Modify: `admin/src/components/ProgramsPage.tsx`

- [ ] **Step 1: Add moodle_course_id field to BLANK_PROGRAM and form**
- [ ] **Step 2: Update table to show Moodle ID column**

**Verification:**
- [ ] Open Programs page in admin panel.
- [ ] Edit a program, set Moodle Course ID to "123", save.
- [ ] Refresh page, verify "123" is displayed and persists.

---

## Task 8.3: Edge Function Implementation — `moodle-handoff`

**Prerequisites:** Task 8.1 complete. `MOODLE_BASE_URL` and `MOODLE_API_TOKEN` set in Supabase secrets.

**Files:**
- Modify: `supabase/functions/moodle-handoff/index.ts`

- [ ] **Step 1: Implement user lookup/creation logic**
- [ ] **Step 2: Implement enrollment logic**
- [ ] **Step 3: Implement event logging (`moodle_enrolled` or `moodle_error`)**

**Verification:**
- [ ] Deploy function: `supabase functions deploy moodle-handoff`.
- [ ] Invoke with test `application_id` via `curl`.
- [ ] Check Moodle admin for new user and enrollment.
- [ ] Check `application_events` table for success/error record.

---

## Task 8.4: E2E Verification — Payment to Enrollment

**Prerequisites:** Tasks 8.1–8.3 complete. Active Stripe test session.

**Verification:**
- [ ] Complete a test payment on Stripe.
- [ ] Verify `applications` status is `enrolled`.
- [ ] Verify `application_events` contains `moodle_enrolled`.
- [ ] Confirm user exists and is enrolled in Moodle course.
