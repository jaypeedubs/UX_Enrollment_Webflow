---
name: icit-design-system
description: Design pages, dashboards, slide decks, and microsites in the visual and content language of ICIT. Use when designing any artifact that must adhere to ICIT brand standards, including typography, colors, and UI patterns.
---

# ICIT Design System — SKILL

This skill teaches you to design pages, dashboards, slide decks, and microsites in the visual and content language of the **Thomas Balkany Institute for Cochlear Implant Training (ICIT)**.

## When to use this skill
Use it whenever you are designing for ICIT — marketing pages, the application/dashboard portal, the on-demand video lecture experience, the MSTB-3 microsite, lecture slide decks, or any internal-facing artifact that must look like ICIT made it.

## How to use it

1. **Read `README.md` first.** It is the source of truth: company context, content fundamentals (voice, vocabulary, structure), and visual foundations (color, type, imagery, layout, motion). Don't design from instinct — design from that document.
2. **Always link `colors_and_type.css`** at the top of every HTML file you produce. It exposes the entire token set as CSS variables. Then write to those vars — never hand-roll new colors or font families.
3. **Add the Google Fonts `<link>`** the README's "Quick start" block specifies. Without it, headings won't render in Bodoni Moda SC and icons will be missing.
4. **Reuse, don't reinvent.** Before drawing a new component, look in `ui_kits/marketing/` and `ui_kits/course/` for a pattern that fits — hero, course card, numbered section opener, video player, module sidebar, footer. Lift the markup; don't rebuild from scratch.
5. **For decks, copy `slides/index.html`'s pattern.** It uses `<deck-stage>` with 1920×1080 sections. The eyebrow + Bodoni headline + lede + footer-line system is the deck template. Don't invent new slide chrome.
6. **For new icons, default to Material Symbols Outlined (`wght 700`).** Either reuse an SVG already in `assets/icon-*.svg` or render the font glyph with the `.msym` helper class. No emoji, no Lucide unless explicitly substituting.
7. **Course-color theming.** When designing a screen tied to a specific course, scope the page with one of `--course-asc / --course-isc / --course-aac / --course-fac / --course-ifac / --course-citec` (or its 1–9 ramp variables). The course UI kit shows the pattern: a `.theme-asc` class on the body sets `--c-1`, `--c-5`, `--c-7` aliases consumed by all internal selectors.

## Critical rules — do not violate

- **No gradients.** Every fill is solid. Depth comes from photography, contrast, and shadow — never from a CSS gradient. (Two exceptions: the dark protection-shade behind hero text, and the soft fade at the bottom of the video player. Both are functional, not decorative.)
- **No emoji. No unicode bullets.** Numbered eyebrows are the only ornament.
- **Linen-cream is the default page background, not pure white.** White is reserved for cards on cream. Default to `var(--bg-secondary)` (`#faf7f5`).
- **Text on light is brown-black** (`#382e27`), not pure black. This is non-negotiable.
- **Headings are Bodoni Moda SC, weight 500, with `letter-spacing: -0.022em` and `line-height: 1.15`.** Italics use the regular Bodoni cut (weight 400). The variable font axis is wired up — use weights 400–600 only.
- **Body is Open Sans, 1.6 line-height.** Eyebrows and small caps get `letter-spacing: 0.22em` and uppercase.
- **Radii are fixed: 3px (inputs), 8px (md surfaces), 20px (cards / pills), 50% (avatars / circular buttons).** No 4px, 12px, 16px. Pick from the four.
- **Two shadows only:** `--shadow-sm` for resting and `--shadow-md` for elevated. Never tinted.
- **Pill button + circular icon button are the only two CTA shapes.** Pill carries label + arrow icon; circular is a 48px round with a Material Symbol arrow. Both are in `ui_kits/marketing/index.html` with hover behavior.
- **Imagery is photographic, warm, slightly under-saturated.** Never illustrated, never tech-stocky, never blue-tinted. Faces are documentary, not corporate-staged.
- **Animation is quiet.** Fades, slow parallax, arrow-translate on hover. No bouncing, no spring overshoot, no whole-card scale-up.
- **Voice is clinical and respectful.** No "amazing", "awesome", "level up", "delight", "AI-powered". When in doubt, read the README's content section and the real CSV course copy in the Webflow source for tone.

## Project layout

```
README.md                       Source of truth — read first
SKILL.md                        This file
colors_and_type.css             Tokens (CSS vars) + element styles + @font-face
fonts/                          Bodoni Moda SC variable font
assets/                         Logos, icons, imagery, partner marks
preview/                        Specimen cards rendered into the Design System tab
ui_kits/
  marketing/index.html          Hero, courses, MSTB, faculty, footer
  course/index.html             Lecture player + module sidebar
slides/
  index.html                    6 sample slides
  deck-stage.js                 Deck shell component
```

## Quick start in a new file

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Open+Sans:ital,wght@0,300..800;1,300..800&family=Bodoni+Moda+SC:opsz,wght@6..96,400..900&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,700,0,0&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="colors_and_type.css">
</head>
<body>
  <!-- write to var(--…) tokens — never hand-roll color or type -->
</body>
</html>
```
