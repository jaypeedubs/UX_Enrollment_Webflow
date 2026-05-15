# Design Spec: /application-submitted Page

**Date:** 2026-05-15
**Status:** Approved

---

## Overview

The `/application-submitted` page is the post-submission confirmation screen. It confirms the application was received, displays the program the applicant applied to, and guides them through the four-stage admissions pipeline. Tone is professional and formal, consistent with the rest of the ICIT applicant portal.

---

## Layout

A single centered card on the linen-cream page background (`#faf7f5`), max-width 560px, with `border-radius: 20px` and `--shadow-sm`. Card background is white.

Three vertical sections inside the card:
1. **Header** — Lottie animation + heading + program name pill
2. **What to Expect** — eyebrow label + four-step vertical list
3. **CTA** — single primary button

---

## Header Section

### Lottie Animation
- Embed via `dotlottie-wc` web component (requires the script tag on the page).
- Source: `https://lottie.host/d7237cc2-17bb-49a0-9e5a-c90752584c8a/4fsEplHUXK.lottie`
- Size: 100×100px, centered.
- `autoplay` and `loop` attributes set.
- No CSS filter — render in original animation colors.

**Script tag (add to Webflow page `<head>` or before `</body>`):**
```html
<script src="https://unpkg.com/@lottiefiles/dotlottie-wc@0.9.14/dist/dotlottie-wc.js" type="module"></script>
```

**Element:**
```html
<dotlottie-wc
  src="https://lottie.host/d7237cc2-17bb-49a0-9e5a-c90752584c8a/4fsEplHUXK.lottie"
  style="width: 100px; height: 100px;"
  autoplay
  loop>
</dotlottie-wc>
```

### Heading
- Text: `Application Submitted`
- Font: Bodoni Moda SC, 28px, weight 500
- Color: `--blues-midnight-1` (`#123161`)
- Centered, below the animation.

### Program Name Pill
- A rounded pill element (`border-radius: 20px`) with a white background and `#e5ddd6` border.
- Populated by JS via `wized="submitted-program-name"`.
- Font: Open Sans, 13px, weight 600, color `--blacks-black`.

---

## What to Expect Section

**Eyebrow label:** `WHAT TO EXPECT` — 11px, uppercase, letter-spacing 0.22em, color muted brown (`#8a7a70`).

A horizontal rule (`border-top: 1px solid #e5ddd6`) separates the header from this section.

### Step List

Four steps rendered as a vertical list. Each step has:
- A numbered circle dot (28px, `border-radius: 50%`)
- A vertical connector line between dots (2px, `#e5ddd6`)
- A bold step title and a muted description

**Active step** (step 1) uses navy dot (`#123161`) and navy title color. All other dots are muted (`#e5ddd6`).

| # | Title | Description |
|---|---|---|
| 1 | Application Received *(active)* | Your application has been submitted and is confirmed in our system. |
| 2 | Admissions Review | Our admissions team will review your credentials and program fit. |
| 3 | Decision Issued | You will be notified by email when a decision has been made. |
| 4 | Enrollment & Payment | If accepted, you will receive a payment link by email. Enrollment is confirmed once payment is complete. |

Step 1 is always shown active — the page is only reached immediately after submission, so the applicant is always at this stage.

---

## CTA

- Single button: **View Application Status**
- Href: `/application-status`
- Class: `btn-primary-1` (navy fill, white text)
- Full-width within the card

No secondary button or back link — the nav bar provides dashboard access.

---

## JS Behavior (`src/pages/submitted.js`)

`initSubmitted()` is already implemented and requires no changes. For reference:

1. Calls `requireAuth()` — redirects to `/login` if unauthenticated.
2. Reads `programName` from `sessionStorage('icit-selected-course')` and clears it.
3. Falls back to a Supabase query for the most recent `submitted` application if sessionStorage is empty.
4. Sets `wized="submitted-program-name"` with `setText()`.
5. Calls `revealPage()`.

No additional JS is needed for this page.

---

## Webflow Implementation Notes

- The Lottie script tag must be added to the page's custom code (head or before `</body>`).
- The `dotlottie-wc` element should be placed inside the card header in the Webflow Designer.
- All other elements are standard Webflow divs/text elements with `wized` attributes where noted.
- Page must include the standard Google Fonts link for Bodoni Moda SC and Open Sans.
- Apply design system classes per `docs/specs/design-system.md`: `btn-primary-1` for the CTA button.

---

## Wized Attribute Reference

| Attribute | Element | Set by |
|---|---|---|
| `wized="submitted-program-name"` | Program name pill (text node) | `initSubmitted()` in `submitted.js` |

---

## Out of Scope

- No secondary CTA or "Back to Dashboard" link (nav bar handles this).
- No estimated timeline or specific review dates.
- No animation color override — original Lottie colors used as-is.
- Step active state is always step 1 (static — no dynamic step highlighting based on application status; the `/application-status` page handles live status display).
