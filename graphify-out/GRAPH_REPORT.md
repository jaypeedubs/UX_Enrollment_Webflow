# Graph Report - UX_Enrollment_Webflow  (2026-05-05)

## Corpus Check
- 52 files · ~779,877 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 228 nodes · 357 edges · 10 communities detected
- Extraction: 89% EXTRACTED · 11% INFERRED · 0% AMBIGUOUS · INFERRED: 39 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]

## God Nodes (most connected - your core abstractions)
1. `DeckStage` - 29 edges
2. `initDashboard()` - 13 edges
3. `initDashboard()` - 13 edges
4. `q()` - 11 edges
5. `q()` - 11 edges
6. `initApply()` - 10 edges
7. `initStatus()` - 10 edges
8. `initStatus()` - 10 edges
9. `initApply()` - 10 edges
10. `setText()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `q()` --calls--> `updateApplyStepper()`  [INFERRED]
  src/core/ui.js → src/pages/apply.js
- `q()` --calls--> `questionHost()`  [INFERRED]
  src/core/ui.js → src/pages/apply.js
- `setHref()` --calls--> `initDashboard()`  [INFERRED]
  src/core/ui.js → src/pages/dashboard.js
- `escapeHtml()` --calls--> `initDashboard()`  [INFERRED]
  src/core/ui.js → src/pages/dashboard.js
- `formatCurrency()` --calls--> `initEnrollment()`  [INFERRED]
  src/core/ui.js → src/pages/enrollment.js

## Communities

### Community 0 - "Community 0"
Cohesion: 0.09
Nodes (31): applyDesignSystemClasses(), completeLoginAuthReturn(), ensureFallback(), escapeHtml(), formatCurrency(), formatDate(), getSession(), hide() (+23 more)

### Community 1 - "Community 1"
Cohesion: 0.09
Nodes (28): applyDesignSystemClasses(), ensureFallback(), escapeHtml(), formatCurrency(), formatDate(), hide(), pageRoot(), q() (+20 more)

### Community 2 - "Community 2"
Cohesion: 0.11
Nodes (1): DeckStage

### Community 3 - "Community 3"
Cohesion: 0.16
Nodes (14): _(), a(), b(), E(), g(), h(), m(), o() (+6 more)

### Community 5 - "Community 5"
Cohesion: 0.56
Nodes (8): createContext(), createElement(), testApplyRevealsWhenDataLoadFails(), testDashboardRendersWhenNotificationsFail(), testLoginAuthReturnShowsLoginInsteadOfDashboardRedirect(), testLoginRevealsWhenMarkersAreMissing(), testSignUpSendsConfirmationBackToLogin(), tick()

### Community 6 - "Community 6"
Cohesion: 0.36
Nodes (6): completeLoginAuthReturn(), getSession(), isLoginAuthReturn(), requireAuth(), requireGuest(), signOut()

### Community 7 - "Community 7"
Cohesion: 0.5
Nodes (2): applyFilters(), useApplications()

### Community 9 - "Community 9"
Cohesion: 0.67
Nodes (2): getRoute(), handlePopState()

### Community 10 - "Community 10"
Cohesion: 0.83
Nodes (3): getApplications(), getPrograms(), invokeAdminRead()

### Community 11 - "Community 11"
Cohesion: 1.0
Nodes (2): getFocusable(), handleKeyDown()

## Knowledge Gaps
- **Thin community `Community 2`** (31 nodes): `deck-stage.js`, `DeckStage`, `._applyIndex()`, `.attributeChangedCallback()`, `._collectSlides()`, `.connectedCallback()`, `.constructor()`, `.designHeight()`, `.designWidth()`, `.disconnectedCallback()`, `._fit()`, `._flashOverlay()`, `._go()`, `.goTo()`, `.index()`, `.length()`, `._loadNotes()`, `.next()`, `.observedAttributes()`, `._onKey()`, `._onMouseMove()`, `._onResize()`, `._onSlotChange()`, `._onTapBack()`, `._onTapForward()`, `.prev()`, `._render()`, `.reset()`, `._restoreIndex()`, `._syncPrintPageRule()`, `pad2()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 7`** (5 nodes): `useApplications.ts`, `applyFilters()`, `readUrlFilters()`, `useApplications()`, `writeUrl()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 9`** (4 nodes): `AdminApp.tsx`, `getRoute()`, `handlePopState()`, `navigate()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 11`** (3 nodes): `ConfirmDialog.tsx`, `getFocusable()`, `handleKeyDown()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `initApply()` connect `Community 1` to `Community 4`, `Community 6`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Why does `initDashboard()` connect `Community 1` to `Community 6`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **Are the 10 inferred relationships involving `initDashboard()` (e.g. with `requireAuth()` and `hide()`) actually correct?**
  _`initDashboard()` has 10 INFERRED edges - model-reasoned connections that need verification._
- **Are the 7 inferred relationships involving `q()` (e.g. with `initLogin()` and `initStatus()`) actually correct?**
  _`q()` has 7 INFERRED edges - model-reasoned connections that need verification._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.11 - nodes in this community are weakly interconnected._