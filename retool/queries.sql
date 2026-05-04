-- ============================================================
-- ICIT Admin — Retool SQL Queries
-- Resource: Supabase direct PostgreSQL connection (postgres user)
-- ============================================================


-- ============================================================
-- Query: applications_list
-- Main table — paste into a "Query" resource of type PostgreSQL.
-- Wire status_filter, program_filter, and search_input to
-- Retool Select/TextInput components of those names.
-- Run on load + on filter change.
-- ============================================================
SELECT
  a.id,
  a.status,
  -- Flag in_review rows that have a pending info request
  CASE
    WHEN a.status = 'in_review' AND (
      SELECT event_type
      FROM application_events
      WHERE application_id = a.id
      ORDER BY created_at DESC
      LIMIT 1
    ) = 'more_info_requested'
    THEN 'in_review (info requested)'
    ELSE a.status
  END AS display_status,
  a.submitted_at,
  a.updated_at,
  a.admin_notes,
  a.notes_response,
  a.cv_url,
  p.id   AS program_id,
  p.name AS program_name,
  p.deadline AS program_deadline,
  a.applicant_id,
  u.email AS applicant_email,
  u.raw_user_meta_data->>'first_name' AS first_name,
  u.raw_user_meta_data->>'last_name'  AS last_name,
  (
    TRIM(
      COALESCE(u.raw_user_meta_data->>'first_name', '') || ' ' ||
      COALESCE(u.raw_user_meta_data->>'last_name', '')
    )
  ) AS full_name,
  u.raw_user_meta_data->>'phone' AS phone
FROM applications a
JOIN programs p ON p.id = a.program_id
JOIN auth.users u ON u.id = a.applicant_id
WHERE
  ({{ status_filter.value || '' }}::text = '' OR a.status = {{ status_filter.value || '' }}::text)
  AND ({{ program_filter.value || '' }}::text = '' OR p.id = {{ program_filter.value || null }}::uuid)
  AND (
    {{ search_input.value || '' }}::text = ''
    OR u.email ILIKE '%' || {{ search_input.value || '' }}::text || '%'
    OR u.raw_user_meta_data->>'first_name' ILIKE '%' || {{ search_input.value || '' }}::text || '%'
    OR u.raw_user_meta_data->>'last_name'  ILIKE '%' || {{ search_input.value || '' }}::text || '%'
  )
ORDER BY
  CASE a.status
    WHEN 'submitted'   THEN 1
    WHEN 'in_review'   THEN 2
    WHEN 'waitlisted'  THEN 3
    WHEN 'accepted'    THEN 4
    WHEN 'enrollment_confirmed' THEN 5
    WHEN 'enrolled'    THEN 6
    WHEN 'rejected'    THEN 7
    WHEN 'withdrawn'   THEN 8
    ELSE 9
  END,
  a.submitted_at DESC NULLS LAST;


-- ============================================================
-- Query: program_options
-- For the program filter dropdown.
-- Map value to id, label to name.
-- ============================================================
SELECT id, name
FROM programs
ORDER BY name;


-- ============================================================
-- Query: application_events_list
-- Event timeline for the selected application detail panel.
-- Wire to: applications_table.selectedRow.id
-- ============================================================
SELECT
  ae.id,
  ae.event_type,
  ae.created_at,
  ae.metadata,
  COALESCE(u.email, 'system') AS triggered_by
FROM application_events ae
LEFT JOIN auth.users u ON u.id = ae.triggered_by
WHERE ae.application_id = {{ applications_table.selectedRow?.id ?? null }}::uuid
ORDER BY ae.created_at DESC;


-- ============================================================
-- Query: notifications_list
-- In-app notifications for the selected applicant.
-- Wire to: applications_table.selectedRow.id
-- ============================================================
SELECT id, message, read, created_at
FROM notifications
WHERE application_id = {{ applications_table.selectedRow?.id ?? null }}::uuid
ORDER BY created_at DESC;
