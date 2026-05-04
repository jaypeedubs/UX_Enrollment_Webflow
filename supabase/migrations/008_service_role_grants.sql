-- ============================================================
-- ICIT Application System — Service Role Grants
-- Ensure service_role can access current and future objects
-- in public schema for server-side Edge Functions.
-- ============================================================

GRANT USAGE ON SCHEMA public TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON ALL TABLES IN SCHEMA public
  TO service_role;

GRANT USAGE, SELECT
  ON ALL SEQUENCES IN SCHEMA public
  TO service_role;

GRANT EXECUTE
  ON ALL FUNCTIONS IN SCHEMA public
  TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO service_role;
