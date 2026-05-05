---
name: edge-function-safe
description: Create or revise a Supabase Edge Function safely
allowed-tools: Read,Grep,Glob,Bash
---

Your job is to create or revise a Supabase Edge Function safely.

Rules:
- Verify exact function path first.
- Verify auth pattern first.
- Keep privileged data access server-side only.
- Never move service-role behavior into frontend code.
- Separate:
  - caller JWT verification
  - admin authorization
  - service-role DB operations
- Read only the minimum directly related files:
  - target function
  - related migrations
  - directly related caller
  - shared helpers if used
- If a deploy command is needed, state the correct repo directory first.
- Be concise.

Return:
1. Target function path
2. Auth pattern in use
3. Required edits
4. Risk check
5. Exact next command, if any

If the function is unsafe, say:
"Do not deploy yet."
