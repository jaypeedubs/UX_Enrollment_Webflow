-- ============================================================
-- ICIT Application System — Retire enrollment_confirmed status
-- enrollment_confirmed was an intermediate state between accepted
-- and enrolled. The canonical final status is enrolled only.
--
-- DEPLOY ORDER: run this migration before deploying the updated
-- create-checkout-session and stripe-webhook Edge Functions.
-- ============================================================

-- 1. Move any existing rows stuck in enrollment_confirmed → enrolled.
--    After this runs, zero rows have status = 'enrollment_confirmed'.
UPDATE applications
  SET status = 'enrolled'
  WHERE status = 'enrollment_confirmed';

-- 2. Drop and recreate the status constraint without enrollment_confirmed.
ALTER TABLE applications DROP CONSTRAINT applications_status_check;
ALTER TABLE applications ADD CONSTRAINT applications_status_check CHECK (
  status IN (
    'draft', 'submitted', 'in_review', 'accepted', 'rejected',
    'waitlisted', 'enrolled', 'withdrawn'
  )
);

-- 3. Remove the two notification templates that fired on enrollment_confirmed.
--    The trigger event no longer exists; these rows are dead code.
DELETE FROM notification_templates WHERE trigger_event = 'enrollment_confirmed';
