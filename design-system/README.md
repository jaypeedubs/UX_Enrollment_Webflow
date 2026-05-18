# ICIT Design System

The **Thomas Balkany Institute for Cochlear Implant Training** (ICIT) is an online training organization that delivers structured, certificate-bearing courses to cochlear-implant surgeons, audiologists, and their multidisciplinary clinical teams. Courses combine pre-recorded lectures, weekly live web classes, moderated discussion boards, knowledge assessments, and (for some tracks) hands-on temporal-bone or programming labs. ICIT is named for Thomas J. Balkany, MD — a memorial tribute is featured prominently on the homepage.

The Institute also publishes **MSTB-3** (Minimum Speech Test Battery, version 3) — a downloadable assessment toolkit (test files, scoresheets, report templates, manual) used in clinical CI evaluation.

## Surfaces represented in this design system

There is one product family with a few distinct surfaces:

1. **Marketing website** — public, brand-led. Hero, courses index, MSTB section, faculty grid, reviews, footer. Source: `jareds-spectacular-site-818130.webflow/`.
2. **Application & dashboard portal** — Supabase-backed application flow (apply, application-status, dashboard, login/register, enrollment-confirmation) embedded into the same Webflow shell. The portal reuses the marketing CSS and sits inside `#icit-page-wrapper`.
3. **Course / video lecture experience** — `detail_courses.html`, `detail_course-modules.html`, `video-library.html`, `detail_videos.html`, plus a `detail_sessions.html` live-class view. This is the most "app-like" surface and uses the linen background plus per-course color coding.
4. **MSTB-3 microsite** — `/mstb3/`, a focused download-and-reference area for the assessment battery.

The six core courses are each assigned a brand color used as a section/category accent (and as 9-step ramps in code):

| Code | Course | Color |
|------|--------|-------|
| ASC | Advanced Surgeons Course | `#c5543b` rust |
| ISC | International Surgeons Course | `#d9883d` amber |
| AAC | Advanced Audiology Course | `#5b6b82` slate |
| FAC | Foundational Audiology Course | `#3d7a7a` teal |
| IFAC | International Foundational Audiology | `#5d8591` blue-teal |
| TEC / CITEC | Team Efficiency Course | `#5d6b9e` periwinkle |

## Sources

- **Codebase (read-only mount):** `jareds-spectacular-site-818130.webflow/` — full Webflow export with HTML, CSS, fonts, images, CMS collections.
  - Tokens of record: `css/jareds-spectacular-site-818130.webflow.css` (lines ~1–230 contain every CSS var).
  - Real copy: `Collections/courses - collections.csv`, `index.html`, `style-guide.html`.
  - Application logic: inline IIFE at top of `index.html`, `dashboard.html`, etc. — Supabase + Stripe.
- **Uploaded assets:**
  - `uploads/Logo - ICIT.jpg` — full logo on cream
  - `uploads/ICIT Animated Logo (720p).mp4` — animated logo bumper
  - **Missing from the upload despite being mentioned:** `ICIT PowerPoint Template.ppt` and `icit_video_lecture_-_module_7.mp4` did not arrive. Slides have therefore been built from the website's visual language (typography, colors, photo treatment) rather than the actual deck template.

## Repository index

```
README.md                     ← you are here
SKILL.md                      ← Claude Code-compatible skill definition
colors_and_type.css           ← all CSS vars + element styles
fonts/
  BodoniModaSC-VariableFont_opszwght.ttf
assets/
  icit-logo.webp              ← stylized monogram (use everywhere)
  icit-logo.jpg / -full.jpg   ← lockup on cream
  icit-logo-animated.mp4      ← animated bumper
  icit-logo-mark.svg          ← simplified vector mark (re-derived)
  icon-*.svg                  ← Material Symbols (rounded, weight 700)
  arrow-*.svg                 ← in-house arrow assets (tan + white)
  img-*.{jpg,webp}            ← clinical / portrait / texture imagery
  miller-school-wordmark.svg  ← partner mark (UMiami Miller School)
  play-button.png             ← circular brand play affordance
preview/                      ← cards rendered into the Design System tab
ui_kits/
  marketing/                  ← website kit (hero, courses, footer, MSTB)
  course/                     ← lecture player + course detail kit
slides/                       ← sample slides matching brand
```

---

## Content fundamentals

ICIT's voice is **clinical, precise, and respectful** — written by doctors and educators for an audience of doctors, audiologists, and clinical staff. There is no marketing fluff, no exclamation points, no emoji. Tone tends formal but not stiff.

**Casing.** Title Case for course names, section headers, and big display lines. Sentence case for body. The brand frequently uses **all-caps small letterspaced labels** — "1 / Memorial Tribute", "2 / MSTB v3", "3 / Participant Reviews" — as numbered "sign-text" eyebrows above sections.

**Person.** The Institute is referred to in the third person ("ICIT will certify…", "The Institute provides…") in body copy. Direct calls-to-action use second person sparingly ("Register to attend", "Signup & Download Now"). "We" is rare.

**Punctuation & hyphenation.** Em-dashes for asides. "Hands-on" and "evidence-based" are always hyphenated. "Cochlear implant" → abbreviated "CI" after first use. Course codes (ASC, AAC, MSTB-3) appear in body copy in parentheses on first reference.

**Vocabulary signature.** *cochlear implant, candidacy, didactic, temporal bone, hearing preservation, signal processing, programming, scoresheet, MSTB, audiogram, hands-on practicum, web class, asynchronous, multidisciplinary, certificate of completion, evidence-based, electrode insertion.* Avoid: "amazing", "awesome", "level up", "AI-powered", "smart", "delight".

**Structure.** Long-form course descriptions follow a strict pattern:
1. One-sentence positioning ("Subspecialty training in CI surgery for infants, children, and adults.")
2. A descriptive paragraph (audience, what's covered, why it matters).
3. **Course Format: N Week Online Didactic Training** as an `<h3>`, followed by a bulleted list of delivery features.
4. Numbered or bulleted curriculum modules (often 10–13 weeks).
5. Optional Hands-On lab section (when applicable).
6. Prerequisites as a bulleted list.

**Real example phrasing (from CMS):**
> "The ICIT Advanced Cochlear Implant Surgeons Course (ASC) is designed to add depth to the excellent training and experience provided in neurotology or pediatric otolaryngology fellowships and beyond."

> "Updated and streamlined test battery for pre-operative determination of candidacy and post-operative assessment of cochlear implant performance in adults."

> "Pre-recorded video lectures introduce module content (60-90 min each)."

**No emoji. No unicode chars used as bullets.** The numbering eyebrow is the closest thing to ornamentation. Where ornament is needed, the brand uses the Bodoni Moda SC display face itself, italics, and a serif quotation mark icon (`format_quote` from Material Symbols).

---

## Visual foundations

ICIT reads as a **serious clinical academy with editorial polish** — it splits the difference between an Ivy League institute brochure and a modern course platform.

### Color
- **Linen-cream** (`#faf7f5` → `#ebe3de`) is the dominant page background, not pure white. White is used only for cards on the cream surface.
- **Midnight blue** (`#123161`, ramping to near-black `#03192c` and `#0b0c23`) is the primary brand color: hero backgrounds, CTAs, headings, footer.
- **Tan / burlywood** (`#ecbd9c`, often at 40% transparency `#ecbd9c66`) is the singular accent — used behind buttons on dark surfaces, as photo overlays, and as the color of arrow icons on dark hero CTAs.
- **Brown-blacks** (`#382e27`, `#201a16`) are used for body text instead of pure black — keeps the cream palette warm.
- **Six course colors** (rust / amber / slate / teal / blue-teal / periwinkle) tag each course's category and propagate as 9-step ramps for that course's screens.
- **No gradients in the system.** Every fill is solid; depth comes from photography and shadow.

### Typography
- **Headings: Bodoni Moda SC** (variable font, `optical-size` + `weight`). High-contrast didone, small-caps, distinctly editorial.
- **Body: Open Sans** (300/400/500/600/700/800).
- **UI / nav accents: Faculty Glyphic** (used sparingly for some menu/UI bits).
- **Icons: Material Symbols Outlined** (weight 700, rounded). Used both as font and as exported SVG.
- **Scale is the "perfect fourth" 1.25 ratio**: 16 → 20 → 25 → 31.25 → 39 → 49 → 61, with a `display` step at 98px for hero only.
- **Heading line-height 1.15, body 1.6.** Heading tracking is slightly negative (`-0.022em`); body is generous (`0.15em`) on small caps and eyebrows only.

### Imagery
- **Always photographic, never illustrated.** Clinical environments, surgeons in the operating room, audiologists at programming stations, faculty headshots, patients in lifestyle settings.
- **Color vibe:** warm — slightly under-saturated, neutral whites, never bluish or "tech-y". Photos sit naturally on the linen palette.
- A handful of unsplash/pexels stock images appear (cropped tight, treated like editorial spreads). Most clinical photos look documentary, not staged.
- **Treatment:** edge-to-edge in `cover-image` blocks; subtle parallax on scroll; a tan/burlywood `animation-color-bg` peeks behind the image during the reveal animation.

### Layout & structure
- **Wide container, generous whitespace.** Section vertical padding is ~112px (`--space-10`). Sections never feel cramped.
- **Numbered eyebrow + serif headline + photo** is the canonical section opener.
- **Asymmetric photo grids** (`content-grid-7`, `content-grid-11`) — not bento-card grids. Often a small 2-column "label / image / label / image" rhythm where text blocks and photos alternate weight.
- **Hero is always tall, dark, and quiet.** Big serif headline left-aligned, single accent CTA, photo or muted blue background.
- **Cards are rare.** Where they appear (testimonials, course tiles), they are large, soft-cornered (`--radius-lg` = 20px), with a tan `animation-color-bg` instead of a shadow.

### Backgrounds
- Solid linen / white / midnight blue for sections.
- Edge-bleed photographs for "feature" sections (MSTB hero, course detail hero).
- Two named texture/photo backgrounds (`bg-slider02.jpg`, `blue_bg1.jpg`) used as full-bleed hero washes.
- **No repeating SVG patterns. No noise. No gradients.**

### Shape
- **Corner radii: 3px (inputs), 20px (cards / pills / large containers), 50% (avatars), 100% (round buttons).** Nothing in between.
- **Round circle buttons** (40–48px) carrying a Material Symbol arrow are the dominant CTA glyph on dark surfaces.
- **Pill buttons** (~20px radius, 14px height-padding) are the canonical text button — full-width container of label + arrow icon, with a colored `button-bg` fill that animates on hover.

### Shadows & elevation
- **Two soft shadows.** A small `shadow-sm` for resting cards and an `shadow-md` for elevated elements. No inner shadows. No color-tinted glow.
- Real elevation usually comes from imagery / linen background contrast, not a literal shadow.

### Borders
- Hairline `1px` borders in `--border-subtle` (lighter linen) on light, `rgba(201,180,167,.10)` on dark.
- Inputs use a darker tan border (`#ccb7aa`).

### Animation
- **Quiet.** Fades, slow parallax on hero photos, subtle 3D perspective on hover (`._3d-block`, `.image-animation-trigger`), arrow translate on link hover.
- Easing is gentle (`cubic-bezier(0.22, 0.61, 0.36, 1)`); duration ~220ms for UI, ~600–900ms for image reveal.
- **No bounces, no spring overshoot, no scale-up-on-hover for entire cards.** Only the small circular icon-button rotates/translates.

### Hover & press
- **Links:** color shift from royal blue → cornflower → midnight blue (active).
- **Pill buttons:** `button-bg` fill animates from 0% → 100% width left-to-right; arrow icon translates ~6px right.
- **Round circle buttons:** background fills from tan → tan-darker; arrow color stays white.
- **Cards / images:** ~1.02 inner-image scale + parallax — never the whole card.
- **Press:** color goes one step darker (`--link-active`); no shrink, no scale.

### Transparency, blur, layering
- Used **rarely**: a 40% tan overlay (`--tans-burlywood-trans` `#ecbd9c66`) sits behind buttons on dark photos to create legibility without a hard plate.
- Dark hero text uses a soft `linear-gradient` *protection gradient* (rgba(3,25,44,0.85) → 0) at the bottom of full-bleed photo heroes — implemented as a sibling div, not backdrop-filter.
- **No frosted glass / `backdrop-filter` blur.** This brand does not feel iOS-like.

### Layout rules (fixed elements)
- A circular **fixed menu button** floats bottom-right on most pages (the mobile-style hamburger).
- The main nav is a transparent overlay on the hero and gains an opaque linen plate on scroll.
- Footer is full-bleed midnight blue with the wordmark, navigation, and partner mark.

---

## Iconography

ICIT's iconography is **Google's Material Symbols (Outlined)** — used in two forms:

1. **As an SVG asset** (`assets/icon-*.svg`) — exported with `FILL=0`, `wght=700`, `GRAD=0`, `opsz=48`. These are the icons that appear inline on dark backgrounds, in arrow/CTA contexts, and as section iconography (handshake, medical_services, mood, perm_media, hive, dentistry, animation, format_quote, mail, sms, menu, close, expand_more, arrow_right_alt, arrow_outward, home, location_city, calendar_view_day, design_services, pan_tool_alt, tab, format_color_fill, emergency, call_to_action). Use these by default when you need a static icon.
2. **As a font glyph** (`font-family: "Material Symbols Outlined"`) — used in the Webflow site for places where the icon is bound to dynamic CMS data. The `.msym` helper class in `colors_and_type.css` configures the font with the same `wght 700` axis to match.

**Custom assets the brand also uses:**
- `arrow-tan.svg`, `arrow-tan-right.svg`, `arrow-white.svg` — three custom thin-stroke directional arrows for inline buttons. These are the **canonical** call-to-action arrows; prefer them over the Material `arrow_right_alt` for pill buttons.
- `play-button.png` — a circular tan/cream play affordance overlaid on video posters.

**No emoji. No unicode characters as decoration.** The Bodoni Moda SC italic "f" and "Q" are sometimes used as monograms on letterhead — but that is a typographic choice, not iconography.

**For new work, in priority order:**
1. Reuse an SVG already in `assets/icon-*.svg`.
2. Use the Material Symbols web font with `wght 700` rounded outlines (the same family).
3. If you need a glyph not represented in the assets folder and can't load the font, pick a Lucide/Heroicons match — and **flag the substitution** so we can swap it for the canonical Material Symbol later.

---

## Index of subdirectories

- `colors_and_type.css` — drop into any HTML, then write to `var(--…)`. Includes `@font-face` for Bodoni Moda SC and instructions for the Google-Fonts links to add.
- `assets/` — every brand asset, copied locally from the Webflow export and the user uploads.
- `preview/` — the small specimen HTML cards rendered into the Design System tab.
- `ui_kits/marketing/` — Hero, Courses index, Memorial Tribute, MSTB feature, Footer, plus core button/badge components. `index.html` shows them assembled into a homepage view.
- `ui_kits/course/` — Lecture Player, Module Sidebar, Module Detail Page, Discussion Thread. `index.html` simulates the on-demand video lecture experience for a Module 7 lecture.
- `slides/` — TitleSlide, AgendaSlide, ContentSlide, ModuleSlide, QuoteSlide, BigStatSlide. Built from brand assets — see caveat above re: missing `.ppt` template.

---

## Quick start

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Open+Sans:ital,wght@0,300..800;1,300..800&family=Faculty+Glyphic&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../colors_and_type.css">
```

Then write to the tokens — never hand-roll new colors.
