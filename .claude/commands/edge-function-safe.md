---
allowed-tools: Read,Grep,Glob,Bash,Edit,Write
description: Create or revise a Supabase Edge Function using safe auth and service-role patterns.
---

Create or revise a Supabase Edge Function using the project's safe auth rules.

Project context:
- backend uses Supabase Edge Functions under `supabase/functions/`
- privileged operations may be needed for admin workflows
- frontend must never use service-role keys
- service-role use is allowed only inside the function after authorization
- Supabase applies platform-level JWT validation before function code when enabled

Instructions:
1. Determine the exact function being created or revised.
2. Verify the function path and local folder structure first.
3. Use secure auth flow by default:
   - expect a valid user JWT in `Authorization: Bearer <token>`
   - verify the user in the function
   - enforce admin authorization if the function is admin-only
   - use a separate service-role client only for privileged DB operations after authorization
4. Never compare the bearer token directly to the service-role key.
5. Never put service-role keys in frontend code.
6. If auth mode is unclear, explicitly state whether default JWT verification or custom handling is expected.
7. Keep function code minimal and production-safe.
8. Do not deploy automatically unless explicitly asked.

Return only:

- Function:
- File path:
- Auth model:
- Required secrets/env vars:
- Exact code:
- Ready to deploy:
- Deploy command:

Rules:
- no deploy unless asked
- no secret values in output
- if folder/file is missing, stop at creation step
- prefer least-privilege design
