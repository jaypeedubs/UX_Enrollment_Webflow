# RETOOL BUILD HANDOFF — ICIT Application Queue

You are building a Retool admin app from scratch. Follow each step in order. The Retool workspace already has two resources connected: `icit_supabase_db` (PostgreSQL) and `icit_admin_api` (REST API).

---

## STEP 1 — Create the app

In Retool, click **Create new → App**. Name it `ICIT Application Queue`. Start with a blank canvas.

---

## STEP 2 — Create all SQL queries first (before building UI)

All SQL queries use the `icit_supabase_db` resource.

### Query 1: `applications_list`
- Resource: `icit_supabase_db`
- Run on load: YES
- Run when inputs change: YES (wire to `status_filter`, `program_filter`, `search_input`)

```sql
SELECT
  a.id,
  a.status,
  a.status AS display_status,
  COALESCE(u.raw_user_meta_data->>'full_name', u.email) AS full_name,
  u.email AS applicant_email,
  p.name AS program_name,
  a.submitted_at,
  a.notes_response,
  a.admin_notes,
  a.cv_url,
  a.created_at
FROM applications a
JOIN auth.users u ON u.id = a.applicant_id
JOIN programs p ON p.id = a.program_id
WHERE
  ({{ status_filter.value }} = '' OR {{ status_filter.value }} IS NULL OR a.status = {{ status_filter.value }})
  AND ({{ program_filter.value }} IS NULL OR {{ program_filter.value }} = '' OR a.program_id::text = {{ program_filter.value }})
  AND (
    {{ search_input.value }} = '' OR {{ search_input.value }} IS NULL
    OR u.email ILIKE '%' || {{ search_input.value }} || '%'
    OR COALESCE(u.raw_user_meta_data->>'full_name', '') ILIKE '%' || {{ search_input.value }} || '%'
    OR p.name ILIKE '%' || {{ search_input.value }} || '%'
  )
ORDER BY a.submitted_at DESC NULLS LAST;
```

---

### Query 2: `program_options`
- Resource: `icit_supabase_db`
- Run on load: YES

```sql
SELECT id, name FROM programs WHERE status = 'active' ORDER BY name;
```

---

### Query 3: `application_events_list`
- Resource: `icit_supabase_db`
- Run when: `applications_table.selectedRow` changes

```sql
SELECT
  ae.id,
  ae.event_type,
  ae.created_at,
  ae.metadata,
  COALESCE(u.raw_user_meta_data->>'full_name', u.email, 'System') AS triggered_by_name
FROM application_events ae
LEFT JOIN auth.users u ON u.id = ae.triggered_by
WHERE ae.application_id = {{ applications_table.selectedRow.id }}
ORDER BY ae.created_at DESC;
```

---

### Query 4: `notifications_list` (optional)
- Resource: `icit_supabase_db`
- Run when: `applications_table.selectedRow` changes

```sql
SELECT id, message, read, created_at
FROM notifications
WHERE application_id = {{ applications_table.selectedRow.id }}
ORDER BY created_at DESC;
```

---

### Query 5: `run_transition`
- Resource: `icit_admin_api`
- Method: POST
- Path: `/admin-transition`
- Body type: JSON
- Body:
```json
{
  "application_id": "{{ applications_table.selectedRow.id }}",
  "event_type": "{{ transition_event_type.value }}",
  "admin_notes": "{{ admin_notes_input.value }}"
}
```

---

### Query 6: JS action queries (one per button)

Create a **Variable** named `transition_event_type` (default value: `''`).

Create 7 separate JS queries named as follows, using the template below with the correct event_type string per query:

- `js_move_to_in_review` → `'in_review'`
- `js_accept` → `'accepted'`
- `js_waitlist` → `'waitlisted'`
- `js_reject` → `'rejected'`
- `js_request_more_info` → `'more_info_requested'`
- `js_promote_from_waitlist` → `'accepted'`
- `js_withdraw` → `'withdrawn'`

**Template (swap the event_type string per query):**
```javascript
transition_event_type.setValue('in_review')   // ← change per query
await run_transition.trigger()
await applications_list.trigger()
await application_events_list.trigger()
```

---

## STEP 3 — Build the layout

Set the canvas to a two-column layout: **70% left / 30% right**. Use a Container or Frame for each column if needed.

---

## STEP 4 — Left column: Filters + Table

Add these components top to bottom:

**Row of filters:**

1. `status_filter` — Select component
   - Label: "Status"
   - Options (manual):
     - `{ label: 'All', value: '' }`
     - `{ label: 'Submitted', value: 'submitted' }`
     - `{ label: 'In Review', value: 'in_review' }`
     - `{ label: 'Waitlisted', value: 'waitlisted' }`
     - `{ label: 'Accepted', value: 'accepted' }`
     - `{ label: 'Rejected', value: 'rejected' }`
     - `{ label: 'Enrolled', value: 'enrolled' }`
     - `{ label: 'Withdrawn', value: 'withdrawn' }`
   - Default: blank (All)

2. `program_filter` — Select component
   - Label: "Program"
   - Data source: `{{ program_options.data }}`
   - Option value field: `id`
   - Option label field: `name`
   - Default: blank (All)

3. `search_input` — Text Input component
   - Label: "Search"
   - Placeholder: "Name, email, or program…"

**Table:**
- Name: `applications_table`
- Data source: `{{ applications_list.data }}`
- Columns to show (hide all others): `full_name`, `applicant_email`, `program_name`, `display_status`, `submitted_at`
- Column labels: Full Name, Email, Program, Status, Submitted
- Enable row selection: YES (single select)

---

## STEP 5 — Right column: Detail Panel

Show this panel only when a row is selected:
- Set container visibility to `{{ applications_table.selectedRow !== null }}`

Add these components top to bottom:

1. **Text** — Applicant name
   - Value: `{{ applications_table.selectedRow.full_name }}`
   - Style: heading

2. **Text** — Email
   - Value: `{{ applications_table.selectedRow.applicant_email }}`

3. **Text** — Program
   - Value: `{{ applications_table.selectedRow.program_name }}`

4. **Text** — Submitted
   - Value: `{{ applications_table.selectedRow.submitted_at }}`

5. **Text** — Status badge
   - Value: `{{ applications_table.selectedRow.display_status }}`
   - Style: badge/tag if available

6. **Text** — Applicant notes
   - Label: "Applicant Notes"
   - Value: `{{ applications_table.selectedRow.notes_response || '—' }}`

7. **Text** — Last admin notes
   - Label: "Last Admin Notes"
   - Value: `{{ applications_table.selectedRow.admin_notes || '—' }}`

8. **TextArea** — `admin_notes_input`
   - Label: "Admin message to applicant"
   - Placeholder: "Write a message to include in the notification…"
   - Visible only when status is `in_review` or `submitted`

9. **Action buttons** — visibility and onClick per table below:

| Button label | onClick query | Visible when status = |
|---|---|---|
| Move to In Review | `js_move_to_in_review` | `submitted` |
| Accept | `js_accept` | `in_review` |
| Waitlist | `js_waitlist` | `in_review` |
| Reject | `js_reject` | `submitted`, `in_review`, `waitlisted`, `accepted` |
| Request More Info | `js_request_more_info` | `in_review` |
| Promote from Waitlist | `js_promote_from_waitlist` | `waitlisted` |
| Withdraw | `js_withdraw` | `submitted`, `in_review`, `waitlisted`, `accepted` |

Visibility expression template (adjust array per button):
```javascript
{{ ['submitted', 'in_review'].includes(applications_table.selectedRow.status) }}
```

10. **Table** — Events timeline
    - Name: `events_timeline`
    - Data source: `{{ application_events_list.data }}`
    - Columns: `event_type`, `triggered_by_name`, `created_at`
    - Column labels: Event, Triggered By, Date

---

## STEP 6 — Final wiring check

Before finishing, verify:
- `applications_list` reruns when `status_filter`, `program_filter`, or `search_input` change
- `application_events_list` reruns when `applications_table.selectedRow` changes
- Each action button calls the correct JS query
- The detail panel is hidden when no row is selected
- `run_transition` is never called directly by buttons — only via JS queries

Save the app.
