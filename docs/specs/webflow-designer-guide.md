# Webflow Designer Session — Task 0 Guide

**Site:** https://jareds-spectacular-site-818130.webflow.io  
**Site ID:** 68dc2a0de878bb5efd6f45cb  
**Purpose:** Add `wized` custom attributes, one new Textarea element, inline display styles, and auth-flash page wrappers so `src/icit-app.js` can find its DOM targets.

Complete every item before publishing. Do not publish until all pages are done.

---

## How to add a `wized` custom attribute in Webflow Designer

1. Click the element in the canvas or Navigator panel to select it.
2. Open the **Element Settings** panel (the gear icon, or press **D**).
3. Scroll to **Custom Attributes** → click **+**.
4. Set **Name** = `wized`, **Value** = the value shown below.
5. Press **Enter** or click away to save.

---

## How to set an inline `display: none` style

1. Select the element.
2. Open the **Style** panel.
3. Find **Display** → set it to `None`.
4. Confirm the change appears as an **inline style** (not a class), shown in the style panel with a blue dot or "inline" label.

> This hides template rows from the rendered page while still letting the JS clone them at runtime.

---

## Page 1 — /login

**Goal:** Tag the sign-in and sign-up form sections.

| Step | What to select | Attribute value |
|------|---------------|-----------------|
| 1 | The container `div` wrapping the entire **sign-in form** (email + password + submit button) | `wized` = `signin-section` |
| 2 | The container `div` wrapping the entire **sign-up form** (first name, last name, email, password, submit button) | `wized` = `signup-section` |

> The tab buttons, input fields, error messages, and loading spinners should already have `wized` attributes from the original Wized setup. If any are missing, add them now using the values in the table below.

**Verify these already exist (add if missing):**

| Element | Required `wized` value |
|---------|------------------------|
| "Sign In" tab button | `tab-signin` |
| "Sign Up" tab button | `tab-signup` |
| Sign-in email input | `signin-email` |
| Sign-in password input | `signin-password` |
| Sign-in submit button | `signin-submit` |
| Sign-in error message element | `signin-error-msg` |
| Sign-in loading spinner | `signin-loading` |
| Sign-up first name input | `signup-first-name` |
| Sign-up last name input | `signup-last-name` |
| Sign-up email input | `signup-email` |
| Sign-up password input | `signup-password` |
| Sign-up submit button | `signup-submit` |
| Sign-up error message element | `signup-error-msg` |
| Sign-up loading spinner | `signup-loading` |

---

## Page 2 — /dashboard

**Goal:** Tag the user name span, sign-out link, and notification drawer. Hide the notification template row.

| Step | What to select | Action |
|------|---------------|--------|
| 1 | The `<span>` that displays the user's name (inside the `.dash-user` div, look for a `data-w-id` ending in `dd7`) | Add `wized` = `dash-user-name` |
| 2 | The sign-out `<a>` link (inside `.dash-user`, `data-w-id` ending in `dd9`) | Add `wized` = `dash-signout` |
| 3 | The notification drawer section container (the panel that slides in or appears with the notification list) | Add `wized` = `notif-drawer` |
| 4 | The **notification template row** — the repeating item inside the drawer that contains the notification message and timestamp (this row should contain elements with `wized="notif-item-msg"` and `wized="notif-item-time"`) | Set **display: none** as an inline style |

**Verify these already exist (add if missing):**

| Element | Required `wized` value |
|---------|------------------------|
| Notification bell / badge element | `notif-bell` |
| Notification message text element (inside template row) | `notif-item-msg` |
| Notification timestamp text element (inside template row) | `notif-item-time` |
| Notification drawer close button | `notif-drawer-close` |
| "No notifications" empty state element | `notif-empty` |
| Application program name element | `app-program-name` |
| Next-action message text element | `app-next-action-msg` |
| Next-action CTA link | `app-next-action-link` |
| "View status" link | `view-status-link` |
| Withdraw button | `withdraw-btn` |
| "Start your application" link | `start-application-link` |
| Dashboard loading spinner | `dash-loading` |

---

## Page 3 — /application-status

**Goal:** Tag the submitted date span, five timeline steps, and event history template row. Add a new Textarea. Hide two template rows.

### 3a — Submitted date span

Select the `<span>` inside `<div class="status-hero-sub">` that shows the submitted date (look for `data-w-id` ending in `a359`).

Add `wized` = `status-submitted-date`

### 3b — Timeline step containers

Select each timeline step container `div` (the outer wrapper for each step row or node) and add the corresponding attribute:

| Timeline step | `wized` value |
|---------------|---------------|
| Draft step container | `timeline-step-draft` |
| Submitted step container | `timeline-step-submitted` |
| In Review step container | `timeline-step-in-review` |
| Decision step container | `timeline-step-decision` |
| Enrolled step container | `timeline-step-enrolled` |

### 3c — Event history template row

Find the repeating row inside the event history list (the row that contains the event type label and timestamp). This is the **template row** that JS will clone for each event.

1. Add `wized` = `event-type-label` to the event type text element inside the row (if not already set).
2. Add `wized` = `event-time` to the timestamp text element inside the row (if not already set).
3. Select the **outer row wrapper** and set **display: none** as an inline style.

### 3d — Add a new Textarea element

This element does not exist yet and must be created:

1. In the **Navigator** or canvas, find the "more info" panel — the section near `[wized="admin-notes-msg"]`.
2. Add a **Textarea** element inside that panel, below the admin notes text.
3. Set these on the Textarea:
   - Custom Attribute: `wized` = `notes-response-input`
   - Placeholder text: `Your response to the admissions team…`
4. Style it appropriately (full width, visible border, a few rows tall).

**Verify these already exist (add if missing):**

| Element | Required `wized` value |
|---------|------------------------|
| Status loading spinner | `status-loading` |
| Program name text element | `status-program-name` |
| Event history empty state | `events-empty` |
| Edit draft link | `edit-draft-link` |
| Withdraw button on this page | `status-withdraw-btn` |
| Admin notes message text | `admin-notes-msg` |
| Submit response button | `submit-notes-response-btn` |
| "Response submitted" confirmation element | `notes-submitted-confirm` |

---

## Page 4 — /enrollment-confirmation

**Goal:** Tag three value spans.

| Step | What to select | Attribute value |
|------|---------------|-----------------|
| 1 | The `<span class="enroll-summary-val">` in row 1 (program name value) — look for `data-w-id` ending in `d465` | `wized` = `enroll-program-name` |
| 2 | The `<span class="enroll-price">` in row 2 (tuition value) — look for `data-w-id` ending in `d46a` | `wized` = `enroll-tuition` |
| 3 | The `<span class="enroll-status-badge">` in row 3 (status badge) — look for `data-w-id` ending in `d46f` | `wized` = `enroll-status-badge` |

**Verify these already exist (add if missing):**

| Element | Required `wized` value |
|---------|------------------------|
| Loading spinner | `enroll-loading` |
| Error message | `enroll-error-msg` |
| Processing indicator | `enroll-processing` |
| Confirm enrollment button | `confirm-enrollment-btn` |

---

## Page 5 — /apply

**Goal:** Tag the three section wrapper divs and the question template row. Hide the question template row.

| Step | What to select | Action |
|------|---------------|--------|
| 1 | The `div` wrapping all of **Section 1** content (personal info: name, email, program select) | Add `wized` = `apply-section-1` |
| 2 | The `div` wrapping all of **Section 2** content (program questions) | Add `wized` = `apply-section-2` |
| 3 | The `div` wrapping all of **Section 3** content (CV upload, submit) | Add `wized` = `apply-section-3` |
| 4 | The **question template row** inside Section 2 — the repeating item that contains a label and an input (this is the row JS clones for each program question) | Add `wized` = `question-item`, then set **display: none** as an inline style |

**Verify these already exist (add if missing):**

| Element | Required `wized` value |
|---------|------------------------|
| Program select dropdown | `program-select` |
| "Program locked" indicator | `program-locked` |
| First name input | `applicant-first-name` |
| "First name locked" indicator | `first-name-locked` |
| Last name input | `applicant-last-name` |
| "Last name locked" indicator | `last-name-locked` |
| Email input | `applicant-email` |
| Save draft button (Section 1) | `save-draft-btn` |
| Next button (Section 1 → 2) | `next-section-1-btn` |
| Draft saved indicator | `form-draft-status` |
| Questions loading spinner | `questions-loading` |
| Questions empty state | `questions-empty` |
| Save draft button (Section 2) | `save-draft-2-btn` |
| Back button (Section 2 → 1) | `back-section-2-btn` |
| Next button (Section 2 → 3) | `next-section-2-btn` |
| CV file input | `cv-file-input` |
| CV file name display | `cv-file-name` |
| CV remove button | `cv-remove-btn` |
| Save draft button (Section 3) | `save-draft-3-btn` |
| Back button (Section 3 → 2) | `back-section-3-btn` |
| Submit application button | `submit-application-btn` |
| Form error message | `form-error-msg` |

---

## Auth-flash wrappers — all four protected pages

This prevents a flash of protected content before the JS auth check redirects unauthenticated users.

Repeat this for each of these four pages: **/dashboard**, **/apply**, **/application-status**, **/enrollment-confirmation**

### Step 1 — Add the visibility style to Page Settings

1. Open the page in Webflow Designer.
2. Go to **Page Settings** (click the page name in the Pages panel → gear icon).
3. Find **Custom Code → Before `</head>`**.
4. Paste:
   ```html
   <style>#icit-page-wrapper{visibility:hidden}</style>
   ```
5. Save.

### Step 2 — Wrap the page body content

> **Note:** This step may already be done if the Webflow pages were scaffolded with Wized wrappers. Check in the Navigator panel — if there is already a `<div id="icit-page-wrapper">` at the top of the body content, skip this step.

If the wrapper does not exist:

1. In the **Navigator** panel, select all body-level elements below the navbar (or select all content you want protected).
2. Wrap them in a **Div Block**.
3. Give the div an **ID** of `icit-page-wrapper` (in Element Settings, the ID field at the top).

---

## Site-wide Custom Code (Script deployment)

Once all pages are done, deploy the application script site-wide:

1. Go to **Site Settings** → **Custom Code** → **Head Code**.
2. Remove any existing Wized `<script>` tags.
3. Paste the following:

```html
<!-- Supabase JS SDK v2 -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>

<!-- ICIT application logic -->
<script>
PASTE THE ENTIRE CONTENTS OF src/icit-app.js HERE
</script>
```

4. Save.

---

## Publish

1. Click **Publish** in the top-right corner of Webflow Designer.
2. Select the **webflow.io** staging domain.
3. Click **Publish to Selected Domains**.

### Verify the script loaded

Open `https://jareds-spectacular-site-818130.webflow.io/login` in a browser.

Open **DevTools → Console** and run:

```javascript
typeof window.supabase
// Expected: "object"
```

If you see `ReferenceError: supabase is not defined`, the CDN script tag is missing or was placed after the inline script. Fix the order in Site Settings and republish.

---

## Completion checklist

- [ ] /login — `signin-section` and `signup-section` attributes added
- [ ] /dashboard — `dash-user-name`, `dash-signout`, `notif-drawer` added; notification template row hidden
- [ ] /application-status — `status-submitted-date` added; 5 timeline steps tagged; event history template row hidden; Textarea added with `notes-response-input`
- [ ] /enrollment-confirmation — `enroll-program-name`, `enroll-tuition`, `enroll-status-badge` added
- [ ] /apply — `apply-section-1/2/3` added; `question-item` added and hidden
- [ ] Auth-flash `<style>` tag added to Page Settings for all 4 protected pages
- [ ] `#icit-page-wrapper` div exists on all 4 protected pages
- [ ] Supabase CDN + `src/icit-app.js` pasted into Site Settings → Head Code
- [ ] Site published to webflow.io domain
- [ ] `typeof window.supabase` returns `"object"` in DevTools
