---
name: webflow-migrate-assess
description: Classify whether code should stay local, move to shared JS, or be rebuilt for Webflow.
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
