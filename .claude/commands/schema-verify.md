---
allowed-tools: Read,Grep,Glob,Bash
description: Verify actual schema names and field mappings before Claude writes any DB-related code.
---

Verify the schema before proposing or writing any database-related code.

Project context:
- backend uses Supabase
- migrations and backend files live under `supabase/`
- frontend types may also exist under `admin/src/lib/`
- schema drift has happened before
- prefer actual migration truth over assumptions
- use `applicant_id`, not `user_id`, unless checked files prove otherwise

Instructions:
1. Check the relevant migration files first.
2. Check shared type files if they exist.
3. Confirm exact table names, column names, and any join keys relevant to the current task.
4. Identify any mismatch between requested code and the actual schema.
5. If the schema is unclear, stop and say so.
6. Do not write application code.
7. Do not inspect unrelated files.

Return only:

- Tables verified:
- Columns verified:
- Join keys:
- Mismatches found:
- Safe field names to use:
- Next recommended action:

Rules:
- max 6 bullets
- no code unless the next recommended action is a command
- prefer exact column names over guesses
- if a field is not found, say “not found” explicitly
