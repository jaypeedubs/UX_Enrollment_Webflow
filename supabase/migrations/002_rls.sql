-- ============================================================
-- ICIT Application System — Row Level Security
-- Run after 001_schema.sql
-- ============================================================

-- Enable RLS on every table
ALTER TABLE programs               ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications           ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_events     ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications          ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- programs
-- Public read. Writes are admin-only (service role via Retool).
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "programs_public_read" ON programs;
CREATE POLICY "programs_public_read" ON programs
  FOR SELECT USING (true);

-- ------------------------------------------------------------
-- applications
-- Applicants see and modify only their own rows.
-- Status transition validation is enforced at the Edge Function
-- layer (not via RLS) to keep policy logic simple.
-- Retool uses the service role key which bypasses RLS entirely.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "applicant_own_applications" ON applications;
CREATE POLICY "applicant_own_applications" ON applications
  FOR ALL
  USING     (auth.uid() = applicant_id)
  WITH CHECK (auth.uid() = applicant_id);

-- ------------------------------------------------------------
-- application_events
-- Applicants can read events for their own applications.
-- Applicants can insert events for their own applications
-- (e.g. submit, withdraw). Admin/system writes go via service role.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "applicant_read_own_events" ON application_events;
CREATE POLICY "applicant_read_own_events" ON application_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM applications
      WHERE applications.id           = application_events.application_id
        AND applications.applicant_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "applicant_insert_own_events" ON application_events;
CREATE POLICY "applicant_insert_own_events" ON application_events
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM applications
      WHERE applications.id           = application_events.application_id
        AND applications.applicant_id = auth.uid()
    )
  );

-- ------------------------------------------------------------
-- notifications
-- Applicants see and update (mark read) only their own rows.
-- Inserts are performed by the handle-notification Edge Function
-- via service role — no client INSERT policy needed.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "applicant_own_notifications" ON notifications;
CREATE POLICY "applicant_own_notifications" ON notifications
  FOR ALL
  USING     (auth.uid() = applicant_id)
  WITH CHECK (auth.uid() = applicant_id);

-- ------------------------------------------------------------
-- notification_templates
-- No client access. Edge Functions read via service role (bypasses RLS).
-- RLS is enabled with no permissive policies = deny all client reads.
-- ------------------------------------------------------------
-- (intentionally no policies — deny by default)
