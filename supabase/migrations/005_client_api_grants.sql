-- ============================================================
-- ICIT Application System - Client API Grants
-- Run after 002_rls.sql
-- ============================================================

-- PostgREST requires table privileges in addition to RLS policies.
-- RLS still limits applicants to their own applications/notifications.
GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT ON programs TO anon, authenticated;

GRANT SELECT, INSERT, UPDATE ON applications TO authenticated;
GRANT SELECT, INSERT ON application_events TO authenticated;
GRANT SELECT, UPDATE ON notifications TO authenticated;

-- Keep notification_templates private to Edge Functions/service role.
