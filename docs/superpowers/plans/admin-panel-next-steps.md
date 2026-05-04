# Admin Panel — Next Steps

## Fixes applied (this session)
- `supabase/migrations/007_programs_course_code.sql` — adds `programs.course_code`, backfills from name, updates email templates for accepted/waitlisted/rejected/more_info_requested to use `{{applicant_message_html}}`
- `supabase/functions/handle-notification/index.ts` — adds `applicant_message` + `applicant_message_html` to interpolation vars
- `supabase/functions/admin-transition/index.ts` — accepts admin JWT (role=admin) alongside service role key; passes `applicant_message` in event metadata

## Deploy these now
```bash
supabase db push --project-ref xvweanlqcbgbiyxqhwux   # runs migration 007
supabase functions deploy admin-transition --project-ref xvweanlqcbgbiyxqhwux
supabase functions deploy handle-notification --project-ref xvweanlqcbgbiyxqhwux
```

## What to build next (implementation plan order)

| # | Task | Key file(s) |
|---|---|---|
| 1 | Scaffold `admin/` (Astro + React) | `admin/package.json`, `astro.config.mjs`, `vitest.config.ts` |
| 2 | Types + constants | `admin/src/lib/types.ts`, `constants.ts` |
| 3 | Supabase client + API client | `admin/src/lib/supabase.ts`, `api.ts` |
| 4 | New `admin-read` Edge Function | `supabase/functions/admin-read/index.ts` |
| 5 | UI atoms | `CourseCircle.tsx`, `StatusBadge.tsx` |
| 6 | `useAuth` hook + `LoginPage` | `admin/src/hooks/useAuth.ts`, `LoginPage.tsx` |
| 7 | Admin layout + `Header` | `AdminLayout.astro`, `Header.tsx` |
| 8 | `ApplicationList` (left pane) | `ApplicationList.tsx` |
| 9 | `RowSubmenu` | `RowSubmenu.tsx` |
| 10 | `ApplicationDetail` (header + nav + tabs) | `ApplicationDetail.tsx` |
| 11 | `ConfirmDialog` (all 4 variants) | `ConfirmDialog.tsx` |
| 12 | `useApplications` hook + URL state | `useApplications.ts` |
| 13 | `ApplicationsPage` wiring | `ApplicationsPage.tsx` |
| 14 | `DashboardPage` | `DashboardPage.tsx` |
| 15 | `AdminApp` root + `index.astro` + build | `AdminApp.tsx`, `pages/index.astro` |

## Field name reference (use these, not the spec's `user_id`)
- Applications FK to auth: `applicant_id` (not `user_id`)
- Programs course filter: `course_code` (added by migration 007)
- Notification custom message: `applicant_message` in event metadata → `applicant_message_html` in email template vars
