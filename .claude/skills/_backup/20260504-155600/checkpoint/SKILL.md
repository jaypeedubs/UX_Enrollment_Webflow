---
name: checkpoint
description: Create a compact checkpoint and stop before context gets wasteful
allowed-tools: Read,Grep,Glob
---

You are creating a token-efficient checkpoint for the current work.

Rules:
- Be concise.
- Max 6 bullets.
- Do not re-explain background.
- Do not inspect unrelated files.
- Prefer evidence from the current task only.

Return exactly:
1. Current task
2. Status: complete / partial / blocked
3. Files changed
4. Next single file or command
5. Prerequisite missing: yes/no
6. Blocker, if any

If the task appears complete enough to pause, explicitly say:
"Recommended next action: /clear"
