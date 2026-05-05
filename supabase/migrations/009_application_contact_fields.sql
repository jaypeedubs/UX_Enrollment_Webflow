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
  ADD COLUMN IF NOT EXISTS "current_role" TEXT,
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
