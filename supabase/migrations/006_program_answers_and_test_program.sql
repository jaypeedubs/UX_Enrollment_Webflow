-- ============================================================
-- ICIT Application System - Program Answers + Test Program
-- Run after 005_client_api_grants.sql
-- ============================================================

ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS program_answers jsonb;

-- Seed a single active program so applicant flow can be tested end-to-end.
-- Update this row in Supabase/Retool when the real program catalog is ready.
INSERT INTO programs (name, status, price_cents, program_questions)
SELECT
  'ICIT Enrollment Test Program',
  'active',
  50000,
  '[
    {
      "id": "q_experience",
      "label": "Years of clinical informatics experience",
      "type": "select",
      "options": ["0-2", "3-5", "5+"],
      "required": true
    },
    {
      "id": "q_goals",
      "label": "What do you hope to gain from this program?",
      "type": "textarea",
      "required": true
    }
  ]'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM programs WHERE status = 'active'
);
