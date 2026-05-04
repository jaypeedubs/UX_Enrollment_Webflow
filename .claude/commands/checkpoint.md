---
allowed-tools: Read,Grep,Glob,Bash
description: Summarize current progress and identify the next single task/file for the Astro + Supabase workflow.
---

Create a concise project checkpoint for this repo.

Project context:
- `admin/` is Astro + React + Tailwind
- `supabase/` contains migrations and Edge Functions
- backend uses Supabase
- schema accuracy matters
- use `applicant_id`, not `user_id`, unless checked files prove otherwise
- frontend must never use service-role keys

Instructions:
1. Identify the current task and whether it is complete.
2. List only files actually created or edited in the current task.
3. Identify the next single task in plan order.
4. Identify the first next file OR first next command.
5. List blockers or prerequisites only if they are real.
6. Keep the response short.
7. Do not write code.
8. Do not inspect unrelated files.
9. Do not propose multiple next tasks.

Return only:

- Current task:
- Status:
- Files changed:
- Next task:
- First next file/command:
- Blockers:

Formatting rules:
- max 6 bullets
- no prose intro
- no conclusion
- no code blocks unless the first next step is a command
