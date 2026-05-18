#!/usr/bin/env bash
set -euo pipefail

ROOT=".claude/skills"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="$ROOT/_backup/$STAMP"

created=0
updated=0
backed_up=0

write_skill() {
  local target="$1"
  local tmp

  mkdir -p "$(dirname "$target")"

  if [[ -f "$target" ]]; then
    local backup_target="$BACKUP_DIR/${target#"$ROOT"/}"
    mkdir -p "$(dirname "$backup_target")"
    cp -p "$target" "$backup_target"
    echo "Backed up: $target -> $backup_target"
    backed_up=$((backed_up + 1))
    updated=$((updated + 1))
  else
    echo "Creating: $target"
    created=$((created + 1))
  fi

  tmp="$(mktemp)"
  cat > "$tmp"
  mv "$tmp" "$target"
}

mkdir -p \
  "$ROOT/checkpoint" \
  "$ROOT/next-file" \
  "$ROOT/schema-verify" \
  "$ROOT/ui-atom" \
  "$ROOT/edge-function-safe" \
  "$ROOT/webflow-migrate-assess"

write_skill "$ROOT/checkpoint/SKILL.md" <<'SKILL'
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
SKILL

write_skill "$ROOT/next-file/SKILL.md" <<'SKILL'
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
SKILL

write_skill "$ROOT/schema-verify/SKILL.md" <<'SKILL'
---
name: schema-verify
description: Verify actual schema names and field mappings before DB-related edits
allowed-tools: Read,Grep,Glob,Bash
---

Your job is to verify exact schema and code mappings before any database-related change.

Rules:
- Evidence first.
- Read migrations, relevant function files, type files, and the minimum directly related frontend/backend callers.
- Do not guess field names.
- Do not invent tables, columns, or enum values.
- Prefer exact path + exact identifier.
- If the working directory matters for a command, state the correct directory first.
- Be concise.

Return:
1. Verified entities
2. Exact field/path mismatches, formatted as:
   expected -> actual -> file/path
3. Missing evidence
4. Safe next edit target
5. Unsafe assumptions to avoid

If evidence is insufficient, say:
"Do not edit yet."
SKILL

write_skill "$ROOT/ui-atom/SKILL.md" <<'SKILL'
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
SKILL

write_skill "$ROOT/edge-function-safe/SKILL.md" <<'SKILL'
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
SKILL

write_skill "$ROOT/webflow-migrate-assess/SKILL.md" <<'SKILL'
---
name: webflow-migrate-assess
description: Classify whether code should stay local, move to shared JS, or be rebuilt for Webflow
allowed-tools: Read,Grep,Glob
---

Your job is to assess migration suitability for Webflow.

Rules:
- Treat Webflow as a non-React runtime.
- Do not assume React/Astro code can move directly.
- Classify each target as one of:
  1. keep local for now
  2. convert to framework-agnostic JS
  3. rebuild for Webflow
  4. move to Supabase Edge Function
- Separate:
  - presentation/UI
  - DOM behavior
  - shared business logic
  - auth logic
  - privileged admin actions
- Do not rewrite code yet.
- Be concise.

Return:
1. File or feature assessed
2. Classification
3. Why
4. Dependencies/blockers
5. Safest next step
SKILL

echo
echo "Done."
echo "Created:   $created"
echo "Updated:   $updated"
echo "Backed up: $backed_up"
if [[ -d "$BACKUP_DIR" && $backed_up -gt 0 ]]; then
  echo "Backups:   $BACKUP_DIR"
fi
echo
find "$ROOT" -maxdepth 2 -name 'SKILL.md' | sort
