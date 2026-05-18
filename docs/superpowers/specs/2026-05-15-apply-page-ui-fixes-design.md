# Apply Page UI Fixes — Design Spec

**Date:** 2026-05-15  
**Scope:** JS-only changes to `src/pages/apply.js` and `src/core/ui.js`. No Webflow Designer changes.

---

## Background

The multi-step application wizard (`/apply`) has five internal sections driven by `initApply()`. Testing revealed five bugs and two UI deficiencies:

1. Stepper step indicator maps incorrectly to internal section numbers
2. Navigation order puts CV Upload before Program Questions (reversed from intended badge order)
3. Personal info fields are blank for first-time applicants (prefill only ran when a draft existed)
4. Review section shows data inline with no label structure — messy and unreadable
5. CV upload zone uses a plain HTML file input — needs drag-drop redesign

---

## Section 1: Stepper mapping fix

### Problem
`updateApplyStepper(n)` passes `n` (1–5) directly as the stepper step number. The Webflow stepper has three named steps (`progress-step-1/2/3`): "Program & Info", "Questions", "CV Upload". When the user is on section 2 (personal info), the stepper incorrectly highlights step 2 ("Questions").

### Fix
Replace the direct pass-through with a lookup map inside `updateApplyStepper`:

| Internal section | Stepper step | Label |
|---|---|---|
| 1 | 1 | Program & Info (course confirm) |
| 2 | 1 | Program & Info (personal info — still step 1) |
| 4 | 2 | Questions |
| 3 | 3 | CV Upload |
| 5 | 3 | CV Upload (review — keep step 3 current) |

The function already iterates `progress-step-1` through `progress-step-5` applying `completed`/`current` classes. Only the number passed to it changes.

---

## Section 2: Navigation order fix

### Problem
The code sends the user to CV Upload (section 3) before Program Questions (section 4). The badge numbers in Webflow HTML say Questions = 2 and CV = 3, so Questions must come first.

### Intended flow
```
Section 1 (course confirm)
  → Section 2 (personal info)
    → Section 4 (questions)
      → Section 3 (CV upload)
        → Section 5 (review)
```

### Button target changes

| Button wized | Current target | New target |
|---|---|---|
| `next-section-2-btn` | `goToSection(3)` | `goToSection(4)` |
| `back-section-4-btn` | `goToSection(3)` | `goToSection(2)` |
| `next-section-4-btn` | `goToSection(5)` | `goToSection(3)` |
| `back-section-3-btn` | `goToSection(2)` | `goToSection(4)` |
| `next-section-3-btn` | `goToSection(4)` | `goToSection(5)` |
| `back-section-5-btn` | `goToSection(4)` | `goToSection(3)` |

---

## Section 3: Personal info prefill

### Problem
The prefill block for first name, last name, and email is wrapped in `if (draft)`. First-time applicants see blank name fields even though signup captured `first_name` and `last_name` in `session.user.user_metadata`.

### Fix
Move name and email prefill outside the `if (draft)` block so it always runs:

```
Always:
  first-name input  ← session.user.user_metadata.first_name || ''
  last-name input   ← session.user.user_metadata.last_name  || ''
  email input       ← session.user.email (already unconditional, no change)

Only if draft:
  phone, address, city, state, zip, country,
  credentials, current-role, institution, email-consent,
  locked field indicators
```

The `locked_fields` check (disabling name fields after first save) stays inside `if (draft)`.

---

## Section 4: Review section rebuilt in JS

### Problem
`populateReview()` sets text into a handful of pre-existing wized elements that have no label structure. Name and email run together on one line with no labels. Professional Background, Application Statement, and other sections show headers but no data.

### Fix
`populateReview()` targets a single container (`wized="review-content"` — the section's inner content area) and replaces its `innerHTML` with JS-generated labeled rows. The function no longer depends on individual wized elements for each datum.

### Output structure

```
PERSONAL INFORMATION
  First name     Test
  Last name      Testy
  Email          southernswimmer@icloud.com
  Phone          (omitted if blank)

PROFESSIONAL BACKGROUND
  Current role   (value or omitted)
  Institution    (value or omitted)
  Credentials    (value or omitted)
  Location       city, state, zip, country joined with ", " (omitted if all blank)

PROGRAM SELECTION
  Program        Foundational Audiology Course 5

PROGRAM QUESTIONS   (section omitted entirely if no questions)
  Question label    Answer (or "—" if unanswered)
```

### Markup pattern
Each section is a `<div class="review-section">` containing:
- A `<div class="review-section-header">` with the section label
- One `<div class="review-row">` per field, containing:
  - `<span class="review-label">` — field name
  - `<span class="review-value">` — field value

Empty fields are omitted entirely. CSS classes `review-section`, `review-section-header`, `review-row`, `review-label`, `review-value` are added to `applyDesignSystemClasses()` in `ui.js`.

---

## Section 5: File upload zone rebuilt in JS

### Problem
The CV upload zone (`wized="cv-upload-zone"`) contains a plain file input — no drag-drop, no visual states, no icon.

### Fix
A new `buildUploadZone(zone, onFile, onError)` function in `apply.js` runs once at init. It:

1. Replaces `zone.innerHTML` with icon + label + hint markup
2. Appends a hidden `<input type="file" accept=".pdf,.doc,.docx">` into the zone
3. Returns the input element for use by the caller

The caller (`initApply`) wires:
- `change` on the hidden input → validate → upload or show error
- `dragover` on the zone → add `upload-zone--active` class
- `dragleave` / `drop` on the zone → remove `upload-zone--active`, validate dropped file

**Validation:** file must be `.pdf`, `.doc`, or `.docx` and ≤ 10 MB. Failures set `upload-zone--error` class and display an error message inside the zone. Valid files clear error state and call `uploadCV()`.

**States:**

| State | Class on zone | Icon | Hint text |
|---|---|---|---|
| Default | (none) | Upload arrow SVG | "PDF or DOC — max 10 MB" |
| Drag active | `upload-zone--active` | Download arrow SVG | "Drop to upload" |
| Error | `upload-zone--error` | Warning SVG | Error message (type or size) |
| Uploaded | zone hidden via `syncCvUi()` | — | — |

The existing `cvFileInput` listener and `syncCvUi()` logic are preserved. `buildUploadZone` replaces the zone's inner markup only; `syncCvUi` still controls zone visibility vs. success row.

CSS classes `upload-zone--active` and `upload-zone--error` are added to `applyDesignSystemClasses()` in `ui.js` alongside the existing `upload-zone` class wiring.

---

## Files changed

| File | Changes |
|---|---|
| `src/pages/apply.js` | `updateApplyStepper` lookup map; 6 nav button targets; prefill moved outside `if (draft)`; `populateReview` rebuilt; `buildUploadZone` added |
| `src/core/ui.js` | `applyDesignSystemClasses` extended with review row classes and upload state classes |

## Out of scope
- Webflow Designer HTML/CSS changes (submitted page layout, whitespace, mock program questions in DB)
- `submitted.js`, `status.js`, `dashboard.js` — no changes
