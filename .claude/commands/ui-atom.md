---
allowed-tools: Read,Grep,Glob,Bash,Edit,Write
description: Create or revise a single small UI component only after verifying styling and package prerequisites.
---

Create or revise one UI atom only.

Project context:
- frontend is Astro + React inside `admin/`
- styling uses Tailwind
- global Tailwind stylesheet must be imported once in the app
- components should stay small, typed, and dependency-light

Instructions:
1. Determine the current UI atom task.
2. Before writing code, verify prerequisites:
   - Tailwind installed/configured
   - global stylesheet exists
   - global stylesheet is imported in the shared layout or top-level page
   - any required package already exists
3. If a prerequisite is missing, stop and return the prerequisite only.
4. If prerequisites are satisfied, create or revise exactly one component file.
5. Do not introduce a second file unless strictly required.
6. Do not add a new UI library unless explicitly requested.
7. Keep the component typed and minimal.
8. Do not inspect unrelated files.

Return only:

- Current component:
- Prerequisite status:
- File to create/edit:
- Exact code:
- Second file needed:
- Safe to approve:

Rules:
- one component file at a time
- no page-level work
- no broad refactors
- no extra explanation unless a prerequisite is missing
