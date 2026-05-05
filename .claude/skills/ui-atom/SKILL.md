---
name: ui-atom
description: Build or revise one small UI component only
allowed-tools: Read,Grep,Glob
---

Your job is to create or revise exactly one small UI component.

Rules:
- One file only.
- Read only the minimum related files for imports, types, and styling patterns.
- Do not create providers, pages, hooks, or second files unless explicitly requested.
- Reuse existing patterns if they already exist.
- Preserve current project styling conventions.
- Prefer accessibility and simplicity over polish extras.
- No unrelated refactors.
- Return only the complete file contents unless I ask for explanation.

Before writing, verify only:
- component props/types
- direct imports
- styling prerequisite if necessary

If a prerequisite is missing, stop and return only:
1. missing prerequisite
2. exact file or command needed first
