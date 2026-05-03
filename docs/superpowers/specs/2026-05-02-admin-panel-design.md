# ICIT Admin Panel — Design Spec

**Date:** 2026-05-02  
**Status:** Approved  
**Scope:** Application review panel for ICIT enrollment administrators

---

## Overview

A separate Astro + React admin application for ICIT staff to review, triage, and action enrollment applications. The build output (JS bundle) is referenced via a `<script>` tag in Webflow's custom code panel, mounting a React app into a `<div>` on dedicated Webflow admin pages. Retool remains available as a raw-data fallback; this panel is the polished day-to-day review UI.

---

## Tech Stack

| Concern | Choice |
|---|---|
| Framework | Astro + React |
| Deployment | JS bundle hosted externally (CDN/Vercel/Netlify), referenced via `<script>` tag in Webflow custom code |
| Auth | Supabase email + password (or magic link), JWT `app_metadata.role === "admin"` claim |
| Admin writes | Existing `admin-transition` Edge Function — updated to accept a Supabase JWT instead of the raw service role key |
| Admin reads | New `admin-read` Edge Function — proxies application list queries; service role key stays server-side |
| Styles | ICIT Design System (`colors_and_type.css`), ICIT CSS tokens, Material Symbols Outlined (weight 700) |

---

## Pages (Astro Routes)

| Route | Purpose |
|---|---|
| `/admin/login` | Supabase auth entry point. Redirects to `/admin` on success. Built in Astro using ICIT design tokens — visually matches the existing applicant `/login` page but is a separate Astro component, not the Webflow page. |
| `/admin` | Dashboard — summary stats (total unreviewed, by course, awaiting action), quick-links to filtered list views. |
| `/admin/applications` | Main split-pane review UI. All list views are filter states of this single route. |
| `/admin/applications/:id` | Deep link — renders split-pane with the specified record pre-selected. Shareable between reviewers. |
| `/admin/programs` | Placeholder route — nav link exists, wires to Retool for now. Program management is out of scope. |

### Global Header (persistent)

Midnight blue bar. Left: Bodoni Moda SC "ICIT Admin" wordmark + nav links (Applications, Dashboard, Programs ↗). Right: unread count badge (tan), signed-in email, sign-out. "Programs" links out to Retool.

---

## Auth Flow

```
/admin/login
  → Supabase signInWithPassword
  → Check JWT: app_metadata.role === "admin"
  → Pass: redirect to /admin
  → Fail: sign out + "Access denied" error screen
```

Setting the admin role is a one-time Supabase dashboard operation per admin user (`UPDATE auth.users SET raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}'`). No self-serve admin registration.

---

## Main Panel — Split-Pane Layout (`/admin/applications`)

### Left Pane — Application List

**Filter controls (stacked):**

1. **Course tabs** (top of pane): All Courses · ASC · ISC · AAC · FAC · IFAC · CITEC
2. **Status pills** (below course tabs): New · In Review · Waitlisted · Accepted · Paid · Enrolled · All
   - "New" = `submitted` status
   - "Paid" = `enrollment_confirmed` status
   - Counts are live and reflect the active course filter
3. **Search box** (top-right of pane header): filters by name or email within the active filter

**URL state:** Filter combination is reflected in the URL as query params (e.g., `?course=ASC&status=submitted`) for bookmarking and sharing.

**List rows:**

| Element | Detail |
|---|---|
| Course circle | 34px filled circle, brand course color background, white course abbreviation. ASC = `#c5543b`, ISC = `#d9883d`, AAC = `#5b6b82`, FAC = `#3d7a7a`, IFAC = `#5d8591`, CITEC = `#5d6b9e` |
| Name | Full name, bold if unread (status = `submitted` and not yet viewed in this session). "Viewed" is tracked client-side in React state and `sessionStorage` — no new DB column needed. Resets on page reload; that is acceptable for a review tool. |
| Meta line | Email only (course is in the circle) |
| Status badge | Pill badge, color-coded by status |
| Date | Submitted date, right-aligned |
| Ellipsis button | Appears on row hover, right-aligned. Navy background (`#123161`), white `more_vert` icon |

**Ellipsis submenu (hover-revealed):**

```
Open application
────────────────
Accept
Waitlist
Request more info
────────────────
Reject              ← solid red fill #b91c1c, white text
```

Available items adjust by current status (e.g., a `waitlisted` row omits "Waitlist"; an `accepted` row shows only "Reject"). All items except "Open" trigger a confirmation dialog before any action fires.

**Selected row:** highlighted with `#e8edf5` background and a `3px #123161` left border. The list panel highlights the corresponding row as the user arrows through records in the detail panel.

---

## Right Pane — Application Detail Panel

### Header (always visible, regardless of active tab)

**Top row (left to right):**

1. **Navigation arrows** — `‹ N / total ›` control. Steps through the current filtered list in order. Count reflects position within the active filter (not all-time). Left arrow disabled on first record; right arrow disabled on last. Keyboard `←` / `→` also trigger navigation. Separated from identity by a thin vertical divider.
2. **Identity** — course circle (42px) + Bodoni Moda SC applicant name + email · phone · status badge
3. **Action buttons** — Accept (navy) · Waitlist (ghost border) · More Info (ghost border) · Reject (solid red `#b91c1c`)

Action buttons available adjust by current status (mirrors submenu logic).

### Tabs

| Tab | Content |
|---|---|
| **Application** | Applicant info grid (first name, last name, email, phone, program, submitted date) with lock icons on locked fields. Program Q&A answers below in answer blocks. |
| **CV** | Signed Supabase storage URL rendered in `<iframe>`. Download link above the frame. Falls back to "No CV uploaded" empty state. |
| **Admin Notes** | Amber privacy banner ("visible to ICIT reviewers only — applicants never see this"). Free-text `<textarea>` saving to `applications.admin_notes`. Last-saved timestamp + reviewer email shown below. Save button. |
| **Timeline** | Append-only audit log from `application_events`. Each entry: event type (bold) + timestamp + triggered-by (reviewer email or "applicant" or "system"). Dot-and-line visual timeline. |

**Locked fields** display a `lock` Material Symbol icon and muted/italic text. Fields locked on first submit: first name, last name, program. After acceptance: all fields locked (`locked_fields: { all: true }`).

---

## Confirmation Dialogs

All four action dialogs follow the same structure: applicant identity strip → consequence description → optional/required message field → cancel + confirm buttons.

### Accept
- Icon: blue `check_circle`
- Status transition: → `accepted`
- Optional personal note field: appended to standard acceptance notification template. Default template sent if blank.
- Confirm button: navy "Confirm acceptance"

### Waitlist
- Icon: purple `schedule`
- Status transition: → `waitlisted`
- Optional personal note field: appended to standard waitlist notification.
- Confirm button: purple "Add to waitlist"

### Request More Info
- Icon: amber `help`
- Status transition: none (stays `in_review`); fires `more_info_requested` event
- Message field: **required** (marked in red). Sent as notification to applicant. Applicant's response stored in `applications.notes_response`, visible in their dashboard.
- Confirm button: navy "Send request"

### Reject
- Visual treatment: red card border (`#fca5a5`), red-tinted header/footer (`#fff5f5`), red title
- Icon: red `cancel`
- Status transition: → `rejected`
- Amber warning banner: "Rejection cannot be undone from this panel. Contact a Supabase admin to reverse."
- Optional reason field: appended to standard rejection notification. A specific reason is recommended.
- Confirm button: solid red `#b91c1c` "Confirm rejection"

---

## Dashboard (`/admin`)

Summary view. Shown on first load before entering the list.

| Card | Data |
|---|---|
| Unreviewed | Count of `submitted` applications across all courses |
| Awaiting response | Count of `in_review` applications where last event = `more_info_requested` |
| Per-course breakdown | Row per active course: submitted / in_review / waitlisted / accepted counts |
| Quick links | "Review new ASC applications" → `/admin/applications?course=ASC&status=submitted` etc. |

---

## Backend Requirements

### New: `admin-read` Edge Function

Proxies application list reads. Accepts a Supabase JWT, validates `role === "admin"` claim, then queries with the service role client. Returns paginated application rows joined with `auth.users` (name, email, phone) and `programs` (name).

Supports query params: `course`, `status`, `search`, `page`, `per_page`.

### Updated: `admin-transition` Edge Function

Accept a Supabase JWT (Bearer token) in addition to (or instead of) the raw service role key. Validate `role === "admin"` claim before processing. Existing `EVENT_STATUS_MAP` and `ALLOWED_EVENTS` logic unchanged.

Accepts a new optional `applicant_message` field in the request body — passed as `metadata.applicant_message` on the inserted `application_events` row. The `handle-notification` Edge Function must be updated to read this field and append it to the outgoing notification body when present. Currently `handle-notification` renders the template verbatim; this is a new capability.

### No schema changes required

All needed columns already exist: `admin_notes`, `notes_response`, `program_answers`, `cv_url`, `locked_fields`. No new migration needed.

### CV signed URLs

Admin panel calls `supabase.storage.from('cvs').createSignedUrl(path, 3600)` via the `admin-read` Edge Function. 1-hour expiry is sufficient for a review session.

---

## Design Tokens in Use

All styles reference ICIT Design System tokens except one intentional addition: `#b91c1c` for the Reject button fill. This is a stronger red than `--error-text` (`#792a1a`) and is used specifically because the high-warning Reject action requires more visual weight than the design system's danger text color provides.

| Token | Value | Use |
|---|---|---|
| `--blues-midnight-1` | `#123161` | Header bg, Accept button, primary actions |
| `--linens-lightest-linen` | `#faf7f5` | Right pane background |
| `--blacks-black` | `#382e27` | Body text |
| `--error-text` | `#792a1a` | Reject warning text |
| `--error-border` | `#ea9e89` | Reject warning border |
| `--error-bg` | `#fae8e3` | Reject warning background |
| `#b91c1c` | — | Reject button fill (stronger red for UI warning weight) |
| Course colors | per course | Circle backgrounds per course abbreviation |

Button classes follow `design.md` rules: `btn-primary-1` for Accept/Send, `btn-ghost-1` for Cancel/ghost actions, `btn-danger-1` base for Reject (overridden to filled red per user direction for high-warning context).

---

## Screens Not in Scope (deferred)

- Program management (create/edit programs, set deadlines, prices, questions) — Retool handles this
- Bulk accept/reject — can be added in a later phase
- Email template management — managed via Supabase `notification_templates` table directly
