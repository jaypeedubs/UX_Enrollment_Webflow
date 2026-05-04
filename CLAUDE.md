# UX_Enrollment_Webflow — Claude project rules

## Scope
This repo contains:
- `admin/` — Astro + React admin UI
- `supabase/` — migrations, Edge Functions, backend config
- Webflow enrollment app integration work

## Working rules
- Follow plan order strictly.
- Work on one task at a time.
- Do not skip ahead to later tasks.
- Do not inspect unrelated files unless explicitly asked.
- Prefer the smallest possible change that completes the current task.
- Return concise outputs unless the user explicitly asks for detail.

## Checkpoint rule
Before starting a new task, return a checkpoint with:
- files created/edited
- whether the current task is complete
- the next single task
- the first next file or command

## Database + schema rules
- Verify schema names from migrations/types before writing DB code.
- Use `applicant_id`, not `user_id`, unless checked files prove otherwise.
- Do not invent columns or table names.
- If schema is unclear, stop and ask or return the mismatch only.

## Supabase rules
- Frontend code must never use service-role keys.
- Privileged reads/writes belong in Edge Functions or server-side code.
- For admin Edge Functions: verify user JWT first, then use service-role client only for privileged DB operations.
- Do not compare bearer tokens directly to service-role keys.

## Frontend rules
- For UI work, confirm prerequisites before generating components, e.g. Tailwind, imported global CSS, required package installed.
- Implement one file at a time unless a second file is strictly required.
- Do not introduce new UI libraries unless asked.
- Keep components small, typed, and composable.

## Output rules
- Do not dump large files unless explicitly asked.
- Summarize first, then write code.
- If a command may fail because of cwd/path assumptions, state the correct working directory first.
- For risky operations, pause before deploy/delete/migration changes.

## Session rules
- When context gets large, checkpoint and stop.
- Prefer checkpoint summaries over long retrospectives.
- Resume from written checkpoints, not memory.
