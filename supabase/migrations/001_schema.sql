-- ============================================================
-- ICIT Application System — Core Schema
-- Run in Supabase SQL Editor (or via supabase db push)
-- ============================================================

-- ------------------------------------------------------------
-- programs
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS programs (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text        NOT NULL,
  deadline         timestamptz,
  status           text        NOT NULL DEFAULT 'active',
  price_cents      integer     NOT NULL,
  program_questions jsonb,
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT programs_status_check CHECK (status IN ('active', 'archived'))
);

-- ------------------------------------------------------------
-- applications
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS applications (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  program_id      uuid        NOT NULL REFERENCES programs(id)   ON DELETE RESTRICT,
  status          text        NOT NULL DEFAULT 'draft',
  cv_url          text,
  notes_response  text,
  admin_notes     text,
  locked_fields   jsonb,
  submitted_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT applications_status_check CHECK (
    status IN (
      'draft', 'submitted', 'in_review', 'accepted', 'rejected',
      'waitlisted', 'enrollment_confirmed', 'enrolled', 'withdrawn'
    )
  )
);

-- One active application per applicant per program cycle.
-- Withdrawn applications are excluded so a re-application is possible.
CREATE UNIQUE INDEX IF NOT EXISTS applications_active_unique
  ON applications (applicant_id, program_id)
  WHERE status != 'withdrawn';

-- Keep updated_at current on every row update.
-- search_path is pinned to prevent search_path hijacking (Supabase advisor 0011).
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS applications_updated_at ON applications;
CREATE TRIGGER applications_updated_at
  BEFORE UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ------------------------------------------------------------
-- application_events
-- Append-only log. DB webhook on INSERT fires handle-notification.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS application_events (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  uuid        NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  event_type      text        NOT NULL,
  triggered_by    uuid        REFERENCES auth.users(id),   -- null = system event
  metadata        jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- notifications
-- In-app notification inbox per applicant.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id    uuid        NOT NULL REFERENCES auth.users(id)    ON DELETE CASCADE,
  application_id  uuid        REFERENCES applications(id)           ON DELETE CASCADE,
  message         text        NOT NULL,
  read            boolean     NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- notification_templates
-- Seeded in Phase 2. Read by handle-notification Edge Function only.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notification_templates (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_event   text        NOT NULL,
  channel         text        NOT NULL,
  subject         text,                       -- email only
  body            text        NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notification_templates_channel_check CHECK (channel IN ('email', 'in_app')),
  UNIQUE (trigger_event, channel)
);
