# Application Submitted Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `/application-submitted` Webflow page — a post-submission confirmation card with a Lottie animation, program name, four-step "What to Expect" list, and a single CTA to `/application-status`.

**Architecture:** `submitted.js` is already complete and wired in `main.js`. This plan is entirely Webflow Designer work: add the Lottie web-component script to the page's custom code, then build the card structure with the correct `wized` attributes and design-system classes. No JS changes are needed.

**Tech Stack:** Webflow Designer, `@lottiefiles/dotlottie-wc` (CDN), ICIT design system classes, Node.js test runner.

---

## File Map

| File | Status | What changes |
|---|---|---|
| `src/pages/submitted.js` | Complete | No changes |
| `src/main.js` | Complete | No changes |
| Webflow page `/application-submitted` | To build | Page custom code + all Designer elements |

---

## Task 1: Confirm baseline tests pass

**Files:**
- Read: `tests/icit-app.test.js`
- Run: `dist/icit-app.bundle.js` (built from `src/`)

- [ ] **Step 1: Build the bundle**

```bash
npm run build
```

Expected: `dist/icit-app.bundle.js` written with no errors.

- [ ] **Step 2: Run tests**

```bash
node tests/icit-app.test.js
```

Expected: Script exits 0 with no assertion errors printed. If tests fail, stop — do not proceed until they pass.

---

## Task 2: Add Lottie script to Webflow page custom code

The `dotlottie-wc` web component must be loaded before the card renders. Add it to the `/application-submitted` page's **Before `</body>` tag** custom code field in the Webflow Designer (Pages → application-submitted → Custom Code → Before `</body>` tag).

- [ ] **Step 1: Open page custom code**

In Webflow Designer: Pages panel → right-click `/application-submitted` → Page Settings → Custom Code tab → "Before `</body>` tag" field.

- [ ] **Step 2: Add the script tag**

Paste exactly:

```html
<script src="https://unpkg.com/@lottiefiles/dotlottie-wc@0.9.14/dist/dotlottie-wc.js" type="module"></script>
```

- [ ] **Step 3: Save page settings**

Click Save. Confirm the script appears in the Before `</body>` field.

---

## Task 3: Build the page card structure in Webflow Designer

Build the following element tree on the `/application-submitted` page. All class names reference ICIT design-system classes already in `jareds-spectacular-site-818130.webflow.css` unless noted as inline styles.

The HTML blueprint below is the authoritative reference — build each element in the Designer to match it exactly. Set `wized` attributes via the Element Settings panel (Custom Attributes).

**Full HTML blueprint:**

```html
<!-- Page wrapper — Webflow Body -->
<!-- background: #faf7f5 set on Body in Designer -->

<div class="submitted-page-wrap">
  <!-- max-width: 560px; margin: 64px auto 0; padding: 0 24px 64px; -->

  <div class="submitted-card">
    <!-- background: white; border-radius: 20px;
         box-shadow: var(--shadow-sm); padding: 40px 48px; -->

    <!-- ── HEADER ── -->
    <div class="submitted-header">
      <!-- text-align: center; margin-bottom: 32px -->

      <dotlottie-wc
        src="https://lottie.host/d7237cc2-17bb-49a0-9e5a-c90752584c8a/4fsEplHUXK.lottie"
        style="width: 100px; height: 100px; display: block; margin: 0 auto 16px;"
        autoplay
        loop>
      </dotlottie-wc>

      <h1 class="submitted-title">
        <!-- font-family: "Bodoni Moda SC"; font-size: 28px; font-weight: 500;
             color: #123161; letter-spacing: -0.022em; line-height: 1.15;
             margin-bottom: 12px -->
        Application Submitted
      </h1>

      <div class="submitted-program-pill">
        <!-- display: inline-block; background: white; border: 1px solid #e5ddd6;
             border-radius: 20px; padding: 6px 16px;
             font-size: 13px; font-weight: 600; color: #382e27 -->
        <span wized="submitted-program-name"></span>
      </div>
    </div>

    <!-- ── DIVIDER ── -->
    <div class="submitted-divider">
      <!-- border-top: 1px solid #e5ddd6; margin: 0 0 28px -->
    </div>

    <!-- ── WHAT TO EXPECT ── -->
    <div class="submitted-eyebrow">
      <!-- font-size: 11px; font-weight: 700; text-transform: uppercase;
           letter-spacing: 0.22em; color: #8a7a70; margin-bottom: 20px -->
      What to Expect
    </div>

    <div class="submitted-steps">
      <!-- margin-bottom: 32px -->

      <!-- Step 1 (active) -->
      <div class="submitted-step">
        <!-- display: flex; gap: 16px; padding-bottom: 24px; position: relative -->
        <!-- ::before connector line: left:13px; top:28px; bottom:0; width:2px; background:#e5ddd6 -->
        <div class="submitted-step-dot submitted-step-dot--active">
          <!-- width:28px; height:28px; border-radius:50%;
               background:#123161; color:white;
               display:flex; align-items:center; justify-content:center;
               font-size:12px; font-weight:700; flex-shrink:0; z-index:1 -->
          1
        </div>
        <div class="submitted-step-body">
          <!-- padding-top: 3px -->
          <div class="submitted-step-title submitted-step-title--active">
            <!-- font-size:14px; font-weight:600; color:#123161; margin-bottom:2px -->
            Application Received
          </div>
          <div class="submitted-step-desc">
            <!-- font-size:13px; color:#6b5e54; line-height:1.55 -->
            Your application has been submitted and is confirmed in our system.
          </div>
        </div>
      </div>

      <!-- Step 2 -->
      <div class="submitted-step">
        <div class="submitted-step-dot">
          <!-- same as above but background:#e5ddd6 (inactive) -->
          2
        </div>
        <div class="submitted-step-body">
          <div class="submitted-step-title">Admissions Review</div>
          <div class="submitted-step-desc">Our admissions team will review your credentials and program fit.</div>
        </div>
      </div>

      <!-- Step 3 -->
      <div class="submitted-step">
        <div class="submitted-step-dot">3</div>
        <div class="submitted-step-body">
          <div class="submitted-step-title">Decision Issued</div>
          <div class="submitted-step-desc">You will be notified by email when a decision has been made.</div>
        </div>
      </div>

      <!-- Step 4 (last — no connector line) -->
      <div class="submitted-step submitted-step--last">
        <!-- no ::before pseudo-element -->
        <div class="submitted-step-dot">4</div>
        <div class="submitted-step-body">
          <div class="submitted-step-title">Enrollment &amp; Payment</div>
          <div class="submitted-step-desc">If accepted, you will receive a payment link by email. Enrollment is confirmed once payment is complete.</div>
        </div>
      </div>
    </div>

    <!-- ── CTA ── -->
    <a href="/application-status" class="btn-primary-1 w-button">
      View Application Status
    </a>

  </div>
</div>
```

**Designer steps:**

- [ ] **Step 1: Set page body background**

Select Body → Style panel → Background → Solid color → `#faf7f5`.

- [ ] **Step 2: Add page wrapper div**

Add a Div Block. Class: `submitted-page-wrap`. Style:
- Max width: 560px
- Margin: 64px auto 0 auto
- Padding: 0 24px 64px

- [ ] **Step 3: Add card div inside wrapper**

Add a Div Block inside `submitted-page-wrap`. Class: `submitted-card`. Style:
- Background: white (`#ffffff`)
- Border radius: 20px
- Box shadow: `0 2px 8px rgba(56,46,39,.08), 0 1px 2px rgba(56,46,39,.04)`
- Padding: 40px 48px

- [ ] **Step 4: Add header div**

Add a Div Block inside `submitted-card`. Class: `submitted-header`. Style:
- Text align: center
- Margin bottom: 32px

- [ ] **Step 5: Add Lottie embed**

Inside `submitted-header`, add an **Embed** element (HTML Embed). Paste:

```html
<dotlottie-wc
  src="https://lottie.host/d7237cc2-17bb-49a0-9e5a-c90752584c8a/4fsEplHUXK.lottie"
  style="width:100px;height:100px;display:block;margin:0 auto 16px;"
  autoplay
  loop>
</dotlottie-wc>
```

- [ ] **Step 6: Add heading**

Add a Heading (H1) inside `submitted-header` below the embed. Text: `Application Submitted`. Style:
- Font family: Bodoni Moda SC
- Font size: 28px
- Font weight: 500
- Color: `#123161`
- Letter spacing: -0.022em
- Line height: 1.15
- Margin bottom: 12px

- [ ] **Step 7: Add program name pill**

Add a Div Block inside `submitted-header`. Class: `submitted-program-pill`. Style:
- Display: inline-block
- Background: white
- Border: 1px solid `#e5ddd6`
- Border radius: 20px
- Padding: 6px 16px
- Font size: 13px, font weight: 600, color: `#382e27`

Inside the pill div, add a **Text Block** (span). Custom Attribute: `wized` = `submitted-program-name`. Leave text content empty — JS will populate it.

- [ ] **Step 8: Add divider**

Add a Div Block after `submitted-header` inside the card. Class: `submitted-divider`. Style:
- Border top: 1px solid `#e5ddd6`
- Margin: 0 0 28px 0
- Height: 1px

- [ ] **Step 9: Add eyebrow label**

Add a Text Block after the divider. Class: `submitted-eyebrow`. Text: `What to Expect`. Style:
- Font size: 11px
- Font weight: 700
- Text transform: uppercase
- Letter spacing: 0.22em
- Color: `#8a7a70`
- Margin bottom: 20px

- [ ] **Step 10: Add steps container**

Add a Div Block after the eyebrow. Class: `submitted-steps`. Style: Margin bottom: 32px.

- [ ] **Step 11: Add four step rows**

For each of the four steps, add a Div Block inside `submitted-steps`. Class: `submitted-step`. Style:
- Display: flex
- Gap: 16px
- Padding bottom: 24px
- Position: relative

For steps 1–3, add a left border connector via a pseudo-element (or a thin Div Block absolutely positioned): left 13px, top 28px, bottom 0, width 2px, background `#e5ddd6`. Step 4 (`submitted-step--last`) has no connector.

Inside each step div, add:

**A. Step dot** — Div Block, class `submitted-step-dot`. Style:
- Width/height: 28px, border-radius: 50%
- Background: `#e5ddd6` (inactive) or `#123161` (step 1 active)
- Color: white, font-size: 12px, font-weight: 700
- Display: flex, align-items: center, justify-content: center
- Flex-shrink: 0

Text content: the step number (1, 2, 3, or 4).

**B. Step body** — Div Block, class `submitted-step-body`. Style: padding-top: 3px.

Inside step body, add:
- **Title** — Text Block, class `submitted-step-title`. Font-size: 14px, font-weight: 600, color: `#382e27` (inactive) or `#123161` (step 1 active). Margin-bottom: 2px.
- **Description** — Text Block, class `submitted-step-desc`. Font-size: 13px, color: `#6b5e54`, line-height: 1.55.

Step content:

| Step | Dot bg | Title color | Title text | Description |
|---|---|---|---|---|
| 1 | `#123161` | `#123161` | Application Received | Your application has been submitted and is confirmed in our system. |
| 2 | `#e5ddd6` | `#382e27` | Admissions Review | Our admissions team will review your credentials and program fit. |
| 3 | `#e5ddd6` | `#382e27` | Decision Issued | You will be notified by email when a decision has been made. |
| 4 | `#e5ddd6` | `#382e27` | Enrollment & Payment | If accepted, you will receive a payment link by email. Enrollment is confirmed once payment is complete. |

- [ ] **Step 12: Add CTA button**

Add a Link Block after `submitted-steps`. Class: `btn-primary-1 w-button`. Href: `/application-status`. Text: `View Application Status`. Style:
- Display: block
- Text align: center
- Padding: 14px 24px
- Border radius: 8px

The `btn-primary-1` class applies navy background and white text via the design system. The `!important` overrides in `main.js`'s injected `<style>` block ensure `w-button`'s bright-blue default is overridden at runtime.

---

## Task 4: Publish and verify end-to-end

- [ ] **Step 1: Publish the Webflow site**

In Webflow Designer: Publish → Publish to webflow.io (or custom domain).

- [ ] **Step 2: Open the page while logged in**

Navigate to `/apply`, complete a test submission to reach `/application-submitted`, or navigate directly if already authenticated with a `submitted` application in the DB.

- [ ] **Step 3: Verify program name**

Confirm the program name pill shows the correct program name (not empty). If it shows empty, open DevTools Console and check for JS errors from `initSubmitted`.

- [ ] **Step 4: Verify Lottie plays**

Confirm the animation renders and loops above the heading. If it shows nothing, check that the script tag was saved in page custom code (Task 2) and that the Embed element HTML was saved correctly (Task 3, Step 5).

- [ ] **Step 5: Verify CTA navigates correctly**

Click "View Application Status" and confirm it routes to `/application-status`.

- [ ] **Step 6: Verify auth guard**

Open the page in an incognito window (not logged in). Confirm it redirects to `/login` rather than rendering the page.

- [ ] **Step 7: Run tests one final time**

```bash
npm run build && node tests/icit-app.test.js
```

Expected: exits 0 with no assertion errors.
