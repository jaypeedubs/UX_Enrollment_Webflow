-- ============================================================
-- ICIT Application System — Moodle Integration
-- Adds moodle_course_id to programs for LMS handoff.
-- ============================================================

ALTER TABLE programs ADD COLUMN IF NOT EXISTS moodle_course_id TEXT;
