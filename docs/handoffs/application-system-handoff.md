# ICIT Application System — Claude Code Build Handoff

## What You Are Building

A full-stack application intake, status tracking, notification, payment, and LMS enrollment system for ICIT (a nonprofit medical education organization). This is a **greenfield build**. No existing codebase. All services are new accounts unless otherwise noted.

Marketing pages are **out of scope**. This system covers:
- Applicant-facing auth, application form, dashboard, and status views
- Admin-facing application queue and workflow actions
- Automated notifications (email + in-app)
- Stripe payment collection post-acceptance
- Moodle LMS enrollment handoff post-payment

---

## Your First Task: Research and Sequence the Build

Before writing any code, **research and produce a recommended implementation order** for this system. Consider:
- Dependency chains (e.g., Supabase schema must exist before Wized can write to it)
- Which services require credentials before others can be configured
- What can be built and tested in isolation vs. what requires integration
- Risk surface of each layer (auth, payments, LMS handoff are highest risk)

Output your recommended sequence as a numbered phase plan before proceeding. Wait for confirmation before starting Phase 1.

---

## Tech Stack

| Tool | Purpose | Notes |
|------|---------|-------|
| Supabase | Auth, database, storage, Edge Functions | New project — spin up fresh |
| Webflow | Applicant-facing frontend (pages + CMS) | New pages — Webflow MCP is connected |
| Wized | Auth-aware logic layer bound to Webflow | New project — establish fresh connection |
| Retool | Admin UI | Self-hosted, new workspace |
| Resend | Transactional email | New account — Claude sets up |
| Stripe | Enrollment payments | New account — Claude sets up; per-program pricing |
| Moodle | LMS enrollment handoff | Self-hosted; API credentials TBD — flag when needed |

---

## Architecture Decision: Event-Driven via DB Webhooks

All backend logic runs in **Supabase Edge Functions (Deno)**. There is no separate Node server.

**The core pattern:**
1. Any status change (from any surface — Wized, Retool, or system) writes to Supabase
2. A Supabase Database Webhook fires on the `applications` table status column change
3. The webhook invokes the appropriate Edge Function
4. The Edge Function handles: email via Resend, in-app notification record creation, and any downstream integrations (Stripe session creation, Moodle handoff)

This keeps all notification logic decoupled from the triggering surface. Retool and Wized never call Resend or Moodle directly.

> **Deno flag:** Where Deno has known limitations for a given task (e.g., npm package compatibility, complex Moodle REST calls), flag the issue and suggest alternatives before proceeding.

---

## Supabase Schema

### Core Tables

#### `programs`
```sql
id uuid primary key default gen_random_uuid()
name text not null
deadline timestamptz
status text default 'active' -- active | archived
price_cents integer not null -- per-program pricing
program_questions jsonb -- array of conditional question configs
created_at timestamptz default now()
```

#### `applications`
```sql
id uuid primary key default gen_random_uuid()
applicant_id uuid references auth.users(id)
program_id uuid references programs(id)
status text default 'draft'
  -- draft | submitted | in_review | accepted | rejected | waitlisted
  -- | enrollment_confirmed | enrolled | withdrawn
cv_url text -- Supabase Storage path
notes_response text -- applicant response to Request More Info
admin_notes text -- admin-authored message for Request More Info
locked_fields jsonb -- tracks which fields are locked
submitted_at timestamptz
created_at timestamptz default now()
updated_at timestamptz default now()
```

**Constraint:** One active application per applicant per program cycle. Enforce via unique index on `(applicant_id, program_id)` where status != 'withdrawn'.

#### `application_events`
```sql
id uuid primary key default gen_random_uuid()
application_id uuid references applications(id)
event_type text not null -- matches notification trigger keys
triggered_by uuid references auth.users(id) -- null for system events
metadata jsonb
created_at timestamptz default now()
```

#### `notifications`
```sql
id uuid primary key default gen_random_uuid()
applicant_id uuid references auth.users(id)
application_id uuid references applications(id)
message text not null
read boolean default false
created_at timestamptz default now()
```

#### `notification_templates`
```sql
id uuid primary key default gen_random_uuid()
trigger_event text not null -- e.g. 'submitted', 'accepted'
channel text not null -- 'email' | 'in_app'
subject text -- email only
body text not null
created_at timestamptz default now()
unique(trigger_event, channel)
```

### Row Level Security

Enable RLS on all tables. Key policies:

```sql
-- applications: applicants see only their own
create policy "applicant_own_applications" on applications
  for all using (auth.uid() = applicant_id);

-- notifications: applicants see only their own
create policy "applicant_own_notifications" on notifications
  for all using (auth.uid() = applicant_id);

-- programs: public read
create policy "programs_public_read" on programs
  for select using (true);
```

Admin access is handled through a separate privileged Supabase role used by Retool — not through the applicant auth flow.

### Storage

Create a `cvs` bucket in Supabase Storage. Policy: authenticated users can upload to their own folder (`{user_id}/`), read their own files only.

---

## Application Lifecycle

```
Draft
  └─ Applicant submits → Submitted
       └─ Admin moves → In Review
            ├─ Admin decides → Accepted
            │    └─ Applicant confirms → Enrollment Confirmed
            │         └─ Payment completes (Stripe webhook) → Enrolled
            │              └─ Moodle enrollment triggered
            ├─ Admin decides → Rejected
            ├─ Admin decides → Waitlisted
            │    └─ Admin may promote later → Accepted
            └─ Admin requests more info → Notes field reopened
                 └─ Applicant submits response → Submitted

Submitted
  └─ Applicant withdraws → Withdrawn (terminal for this program cycle)
```

**Locking rules:**
- `applicant_id` and `program_id` lock on initial save
- All other fields lock on submission
- Only `notes_response` unlocks when admin triggers Request More Info
- Full application relocks on re-submission

---

## Application Form

Built in Webflow with Wized handling all logic and Supabase writes.

**Behavior:**
- Save-and-resume drafts (autosave or explicit save)
- CV upload to Supabase Storage
- Program-specific conditional questions sourced from `programs.program_questions` (JSONB array of question configs)
- Single shared form framework that adapts by selected program
- Applicant name and program choice locked after first save

**Conditional questions schema (example):**
```json
[
  {
    "id": "q_experience",
    "label": "Years of CI experience",
    "type": "select",
    "options": ["0-2", "3-5", "5+"],
    "required": true
  }
]
```

---

## Applicant Dashboard

Webflow page, Wized-powered, auth-gated.

**Shows:**
- Current application status
- Next required action (contextual)
- In-app notification bell with drawer (unread count badge)
- Key status messages surfaced inline when relevant (e.g., "Your application has been accepted — please confirm below")

**Notification bell:** On click, opens a drawer listing all notifications for the user. Mark as read on open. Pull from `notifications` table via Wized + Supabase.

---

## Admin Interface (Retool)

Self-hosted Retool workspace. Connects to Supabase via privileged service role key.

**Application queue view:**
- Table of all applications with filters: status, program, date range
- Columns: applicant name, program, status, submitted date, last updated

**Actions per application:**
- Move to In Review
- Accept
- Reject
- Waitlist
- Request More Info (opens modal → admin authors message → saves to `admin_notes` → triggers notification)
- Promote Waitlisted → Accepted

All actions write status changes to the `applications` table and insert a record into `application_events`. The DB webhook handles everything downstream.

---

## Notifications

### Trigger Map

| Trigger Event | Email | In-App |
|--------------|-------|--------|
| `draft_saved` | ✓ | ✓ |
| `submitted` | ✓ | ✓ |
| `in_review` | ✓ | ✓ |
| `accepted` | ✓ | ✓ |
| `rejected` | ✓ | ✓ |
| `waitlisted` | ✓ | ✓ |
| `more_info_requested` | ✓ | ✓ |
| `withdrawn` | ✓ | ✓ |
| `draft_deadline_reminder` | ✓ | ✓ |
| `enrollment_confirmed` | ✓ | ✓ |
| `payment_received` | ✓ | ✓ |

### Edge Function: `handle-notification`

Triggered by DB webhook on `application_events` insert.

**Logic:**
1. Read `event_type` from new event record
2. Look up `notification_templates` for `(event_type, 'email')` and `(event_type, 'in_app')`
3. Send email via Resend using email template
4. Insert record into `notifications` table using in-app template
5. Log result back to `application_events.metadata`

**Resend boilerplate:**
```typescript
import { Resend } from 'npm:resend';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

await resend.emails.send({
  from: 'ICIT <noreply@yourdomain.com>',
  to: applicantEmail,
  subject: template.subject,
  html: template.body, // interpolate applicant name, program name, etc.
});
```

---

## Stripe Integration

### Flow
1. Admin accepts applicant → status → `accepted`
2. Applicant confirms enrollment on dashboard → status → `enrollment_confirmed`
3. Wized calls Edge Function `create-checkout-session`
4. Edge Function creates Stripe Checkout session with `price` from `programs.price_cents`
5. Applicant completes payment on Stripe-hosted checkout
6. Stripe fires `checkout.session.completed` webhook to Edge Function `stripe-webhook`
7. Edge Function verifies signature, updates status → `enrolled`, triggers Moodle handoff

### Edge Function: `create-checkout-session`
```typescript
import Stripe from 'npm:stripe';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);

const session = await stripe.checkout.sessions.create({
  payment_method_types: ['card'],
  line_items: [{
    price_data: {
      currency: 'usd',
      unit_amount: program.price_cents,
      product_data: { name: program.name },
    },
    quantity: 1,
  }],
  mode: 'payment',
  success_url: `${Deno.env.get('SITE_URL')}/dashboard?payment=success`,
  cancel_url: `${Deno.env.get('SITE_URL')}/dashboard?payment=cancelled`,
  metadata: { application_id: applicationId },
});
```

### Edge Function: `stripe-webhook`
```typescript
const sig = req.headers.get('stripe-signature')!;
const body = await req.text();

let event;
try {
  event = stripe.webhooks.constructEvent(
    body,
    sig,
    Deno.env.get('STRIPE_WEBHOOK_SECRET')!
  );
} catch (err) {
  return new Response(`Webhook Error: ${err.message}`, { status: 400 });
}

if (event.type === 'checkout.session.completed') {
  const session = event.data.object;
  const applicationId = session.metadata.application_id;
  // update application status → enrolled
  // insert application_event → triggers notification Edge Function
  // trigger moodle-handoff Edge Function
}
```

---

## Moodle Handoff

**Triggered:** After Stripe `checkout.session.completed` is verified.

**Payload:**
```json
{
  "email": "applicant@example.com",
  "name": "First Last",
  "program_id": "uuid-of-program"
}
```

**Edge Function: `moodle-handoff`**
- Calls Moodle REST API (`/webservice/rest/server.php`)
- Function: `core_user_create_users` or `enrol_manual_enrol_users` depending on whether user already exists
- **Flag:** Moodle API credentials and endpoint URL are TBD. When you reach this phase, output the exact credentials and configuration needed and pause for input before proceeding.

---

## Webflow Pages (via Webflow MCP)

Create the following pages. Use the Webflow MCP to scaffold them:

| Page | Type | Access |
|------|------|--------|
| Login / Sign Up | Static | Public |
| Applicant Dashboard | Dynamic (Wized) | Auth-gated |
| Application Form | Webflow Form + Wized | Auth-gated |
| Application Status | Dynamic (Wized) | Auth-gated |
| Enrollment Confirmation | Static/Dynamic | Auth-gated |

**Note:** Programs are not seeded at build time. The programs table will be populated manually after the build is complete.

---

## Environment Variables

Claude Code should scaffold a `.env.example` with all required keys:

```
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PUBLISHABLE_KEY=
MOODLE_API_TOKEN=
MOODLE_BASE_URL=
SITE_URL=
```

---

## Security Notes

- Supabase RLS enforces per-applicant data isolation on the frontend
- Stripe webhook signature must be verified using raw request body — do not parse body before verification
- Retool connects via service role key — keep this out of any client-side context
- Moodle API token must only be used server-side (Edge Function)
- All sensitive keys must live in Supabase Edge Function secrets, never in client-side Wized config

---

## Reporting

No analytics layer required at launch. Operational reporting handled via:
- Supabase table queries / SQL editor
- Retool dashboard views built on top of live Supabase data

---

## Flags and Open Items

| Item | Status |
|------|--------|
| Moodle API credentials | TBD — pause and request when reached |
| Resend sending domain | Set up during build |
| Stripe account creation | Set up during build |
| Program data seeding | Manual post-build |
| Retool self-hosted instance URL | Needed before Retool config — request when reached |
| Deno compatibility issues | Flag before workaround, don't silently substitute |
