# ICIT Design System — Developer Reference

Full brand documentation lives in `ICIT Design System/README.md`.
Token CSS file: `ICIT Design System/colors_and_type.css`.
Claude Code design skill: `ICIT Design System/SKILL.md`.

---

## Core principles

- **No gradients.** Every fill is solid.
- **No emoji, no unicode bullets.**
- Page background is linen-cream (`#faf7f5`), not white. White is for cards on cream.
- Body text is brown-black (`#382e27`), not pure black.
- Heading font: Bodoni Moda SC. Body font: Open Sans. Icons: Material Symbols Outlined (weight 700).
- Radii: `3px` inputs · `8px` mid-surfaces · `20px` cards/pills · `50%` avatars/circles.
- Shadows: `--shadow-sm` (resting) and `--shadow-md` (elevated) only.

---

## Color tokens (key values)

| Token | Hex | Use |
|---|---|---|
| `--blues-midnight-1` | `#123161` | Primary brand / headings / primary buttons |
| `--linens-lightest-linen` | `#faf7f5` | Default page background |
| `--tans-burlywood` | `#ecbd9c` | Tan accent on dark surfaces |
| `--blacks-black` | `#382e27` | Default body text |
| `--blues-cornflower` | `#63a3da` | Focus rings / links |
| `--error-text` / `--asc-7` | `#792a1a` | Danger text |
| `--error-border` / `--asc-3` | `#ea9e89` | Danger borders |
| `--error-bg` / `--asc-1` | `#fae8e3` | Danger backgrounds |

Always write to CSS vars from `colors_and_type.css`, never hand-roll new hex values.

---

## Portal Webflow CSS classes

These classes exist in `jareds-spectacular-site-818130.webflow.css`. Apply them via JS — do not reinvent styles.

### Buttons

Webflow's `.w-button` forces a bright-blue background on all `<a>` and `<button>` elements at equal specificity to the design system classes. The CSS injection block at the top of `src/icit-app.js` uses `!important` overrides to make the design system palette win.

| Webflow class | Appearance | When to use |
|---|---|---|
| `btn-primary-1` / `btn-primary-1-2` | Navy (`#123161`) filled | Next, Continue, primary progression |
| `btn-ghost-1` | Transparent, grey text | Back, Save Draft, secondary actions |
| `btn-submit` | Green (`#16a34a`) filled | Final submit / enrollment confirmation |
| `btn-danger` / `btn-danger-1` | Red outline, transparent bg | **Destructive only** — Withdraw, Remove CV |

**Destructive action rule:** any action that permanently removes or cancels uses `btn-danger-1` — red-outlined, never red-filled. Always pair with a confirmation step or reversibility note.

### Form elements

| Webflow class | Element | Notes |
|---|---|---|
| `form-input-1` | `<input>`, `<select>`, `<textarea>` | 3px radius, tan border, focus ring via CSS injection |
| `form-label` | `<label>` | Small-caps, spaced, muted brown |
| `form-group-1` | Field wrapper div | Bottom margin spacing |

### Apply page layout classes

These are applied dynamically by `applyDesignSystemClasses()` in `src/icit-app.js` after the page loads:

| Class | Applied to | Visual result |
|---|---|---|
| `form-section` | Each step container | White card, 12px radius, shadow |
| `section-header-1` | Section header div | Header row layout |
| `section-num` | Numbered step badge | Circle badge |
| `section-title` | Section heading text | Styled heading |
| `section-actions` | Button row wrapper | Aligned action row |
| `lock-badge` | Lock icon container | Locked-step indicator |
| `upload-zone` | CV drop-zone wrapper | Dashed upload area |
| `upload-icon` | Icon inside zone | Upload icon sizing |
| `upload-label` | Primary zone text | Bold label |
| `upload-hint` | Secondary zone text | Muted hint |
| `upload-success` | Post-upload filename row | Success state |
| `upload-progress-wrap` | Progress bar track | Track container |
| `upload-progress-fill` | Progress bar fill | Animated fill |
| `upload-progress-pct` | Progress percentage text | Label |

### Spinners

`@keyframes spin` exists in `webflow.css`. Spinner elements only need the `animation` property. The CSS injection block applies:
```
.loading-spinner, .spinner, .spinner-1, .spinner-1-2 { animation: .7s linear infinite spin !important; }
```

---

## The !important override pattern

Webflow's `.w-button` class has equal CSS specificity to design system classes, so design system button colors are overridden by `.w-button`'s bright-blue default. The fix is the CSS injection block at lines 9–35 of `src/icit-app.js` — `!important` rules injected via `<style>` at runtime. When adding new button variants, add overrides to that block, not inline styles.

---

## Typography quick reference

```
Headings: font-family: "Bodoni Moda SC"; font-weight: 500; letter-spacing: -0.022em; line-height: 1.15
Body:     font-family: "Open Sans"; line-height: 1.6
Eyebrows: text-transform: uppercase; letter-spacing: 0.22em; font-size: 11px; font-weight: 600
Icons:    font-family: "Material Symbols Outlined"; font-variation-settings: 'wght' 700
```

Google Fonts link required on every page:
```html
<link href="https://fonts.googleapis.com/css2?family=Open+Sans:ital,wght@0,300..800;1,300..800&family=Faculty+Glyphic&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap" rel="stylesheet">
```

---

## Design System folder map

```
ICIT Design System/
  README.md                  Brand overview, voice, visual foundations (read first)
  SKILL.md                   Claude Code skill — design in ICIT's language
  colors_and_type.css        All CSS tokens as custom properties + @font-face
  fonts/                     Bodoni Moda SC variable font
  assets/                    Logos, icons (Material Symbols SVGs), imagery
  preview/
    components-buttons.html  Marketing pill/circle CTAs + portal button variants
    components-form.html     Form input/label specimens
    components-section-header.html
    components-course-card.html
    colors-*.html            Color ramp specimens
    type-*.html              Typography specimens
    spacing-*.html           Spacing + shape + elevation tokens
  ui_kits/
    marketing/index.html     Assembled homepage view
    course/index.html        Lecture player + module sidebar
```

---

## What lives where in the codebase

| Concern | Location |
|---|---|
| All portal JS + UI logic | `src/icit-app.js` (minified → `src/icit-app.min.js`) |
| CSS token variables | `ICIT Design System/colors_and_type.css` |
| Webflow site CSS (all classes) | `jareds-spectacular-site-818130.webflow/css/jareds-spectacular-site-818130.webflow.css` |
| DB schema / migrations | `supabase/migrations/` |
| Edge functions | `supabase/functions/` |
| Tests | `tests/icit-app.test.js` |
