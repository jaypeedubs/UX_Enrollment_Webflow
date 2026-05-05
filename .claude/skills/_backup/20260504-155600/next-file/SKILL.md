---
name: next-file
description: Determine the next single file to create or edit for the current task, without drifting into unrelated files or future tasks.
---

# Next File

## Purpose
Use this skill when the user wants to continue implementation in a controlled, one-file-at-a-time workflow.

This skill is especially useful when:
- there is an existing project plan
- task order matters
- the repo spans multiple systems (frontend, backend, infra)
- the user wants minimal output and reduced token usage

## When to use
Use this skill when the user asks things like:
- "what's next"
- "continue from this checkpoint"
- "next file"
- "what should Claude do next"
- "what should I approve next"

## Rules
- Respect the current plan order.
- Identify the current task before suggesting any file.
- Return one file only unless a second file is strictly required.
- Do not inspect unrelated files.
- Do not propose future tasks beyond the immediate next step.
- If a prerequisite is missing, return the prerequisite instead of the next implementation file.
- If schema-dependent, verify schema/types first.

## Workflow
1. Read the checkpoint or current task description.
2. Identify the exact current task.
3. Determine whether any prerequisite blocks implementation:
   - package not installed
   - stylesheet not imported
   - schema not verified
   - env var missing
   - file/folder missing
4. If blocked, return the prerequisite file or command only.
5. If not blocked, return the next single file to create or edit.
6. Keep output extremely short.

## Output format
Return only:
1. current task
2. next file
3. whether any prerequisite is missing
4. the first command, if a command must happen before the file

## Good examples

### Example 1
User: Continue from this checkpoint. Task 5 is UI atoms. StatusBadge.tsx is approved.

Return:
1. Current task: Task 5 — UI atoms
2. Next file: admin/src/components/CourseCircle.tsx
3. Prerequisite missing: no
4. First command: none

### Example 2
User: Continue from this checkpoint. Build the next UI atom.

If Tailwind is not installed:
1. Current task: Task 5 — UI atoms
2. Next file: none
3. Prerequisite missing: yes — Tailwind setup not complete
4. First command: cd admin && npx astro add tailwind

## Notes
- Favor correctness over speed.
- When in doubt, stop at the prerequisite.
- The goal is to prevent task drift and oversized responses.
