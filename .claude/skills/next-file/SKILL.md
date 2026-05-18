---
name: next-file
description: Determine the next single file or command in strict plan order
allowed-tools: Read,Grep,Glob
---

Your job is to identify the next single file or command only.

Rules:
- Follow documented plan order strictly.
- Read only the minimum plan/spec/checkpoint files needed.
- Do not inspect unrelated implementation files unless required to resolve the next step.
- Do not propose multiple branches unless blocked.
- If blocked, say exactly what is missing.
- Be concise.

Return exactly:
1. Current task
2. Next single file or command
3. Why this is next
4. Prerequisite missing: yes/no
5. If yes, the one prerequisite to resolve first
