# Graph Report - UX_Enrollment_Webflow  (2026-05-03)

## Corpus Check
- 38 files · ~762,885 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 161 nodes · 241 edges · 11 communities detected
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]

## God Nodes (most connected - your core abstractions)
1. `DeckStage` - 29 edges
2. `initDashboard()` - 13 edges
3. `q()` - 11 edges
4. `initApply()` - 10 edges
5. `initStatus()` - 10 edges
6. `setText()` - 8 edges
7. `initLogin()` - 8 edges
8. `initEnrollment()` - 8 edges
9. `createContext()` - 7 edges
10. `tick()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `initDashboard()` --calls--> `requireAuth()`  [EXTRACTED]
  src/icit-app.js → src/icit-app.js  _Bridges community 6 → community 10_
- `initApply()` --calls--> `requireAuth()`  [EXTRACTED]
  src/icit-app.js → src/icit-app.js  _Bridges community 6 → community 5_
- `initStatus()` --calls--> `requireAuth()`  [EXTRACTED]
  src/icit-app.js → src/icit-app.js  _Bridges community 6 → community 4_
- `initDashboard()` --calls--> `loadApplication()`  [EXTRACTED]
  src/icit-app.js → src/icit-app.js  _Bridges community 4 → community 10_
- `initApply()` --calls--> `loadApplication()`  [EXTRACTED]
  src/icit-app.js → src/icit-app.js  _Bridges community 4 → community 5_

## Communities

### Community 0 - "Community 0"
Cohesion: 0.11
Nodes (1): DeckStage

### Community 1 - "Community 1"
Cohesion: 0.16
Nodes (14): _(), a(), b(), E(), g(), h(), m(), o() (+6 more)

### Community 2 - "Community 2"
Cohesion: 0.11
Nodes (3): ensureFallback(), pageRoot(), questionHost()

### Community 3 - "Community 3"
Cohesion: 0.56
Nodes (8): createContext(), createElement(), testApplyRevealsWhenDataLoadFails(), testDashboardRendersWhenNotificationsFail(), testLoginAuthReturnShowsLoginInsteadOfDashboardRedirect(), testLoginRevealsWhenMarkersAreMissing(), testSignUpSendsConfirmationBackToLogin(), tick()

### Community 4 - "Community 4"
Cohesion: 0.31
Nodes (9): formatCurrency(), formatDate(), hide(), initEnrollment(), initLogin(), initStatus(), loadApplication(), loadApplicationHistory() (+1 more)

### Community 5 - "Community 5"
Cohesion: 0.33
Nodes (9): applyDesignSystemClasses(), initApply(), loadPrograms(), q(), setCvProgress(), setText(), show(), showPageError() (+1 more)

### Community 6 - "Community 6"
Cohesion: 0.33
Nodes (6): completeLoginAuthReturn(), getSession(), isLoginAuthReturn(), requireAuth(), requireGuest(), signOut()

### Community 7 - "Community 7"
Cohesion: 0.5
Nodes (2): applyFilters(), useApplications()

### Community 9 - "Community 9"
Cohesion: 0.67
Nodes (2): getRoute(), handlePopState()

### Community 10 - "Community 10"
Cohesion: 0.5
Nodes (4): escapeHtml(), initDashboard(), loadNotifications(), setHref()

### Community 11 - "Community 11"
Cohesion: 1.0
Nodes (2): getFocusable(), handleKeyDown()

## Knowledge Gaps
- **Thin community `Community 0`** (31 nodes): `deck-stage.js`, `DeckStage`, `._applyIndex()`, `.attributeChangedCallback()`, `._collectSlides()`, `.connectedCallback()`, `.constructor()`, `.designHeight()`, `.designWidth()`, `.disconnectedCallback()`, `._fit()`, `._flashOverlay()`, `._go()`, `.goTo()`, `.index()`, `.length()`, `._loadNotes()`, `.next()`, `.observedAttributes()`, `._onKey()`, `._onMouseMove()`, `._onResize()`, `._onSlotChange()`, `._onTapBack()`, `._onTapForward()`, `.prev()`, `._render()`, `.reset()`, `._restoreIndex()`, `._syncPrintPageRule()`, `pad2()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 7`** (5 nodes): `useApplications.ts`, `applyFilters()`, `readUrlFilters()`, `useApplications()`, `writeUrl()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 9`** (4 nodes): `AdminApp.tsx`, `getRoute()`, `handlePopState()`, `navigate()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 11`** (3 nodes): `ConfirmDialog.tsx`, `getFocusable()`, `handleKeyDown()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `initDashboard()` connect `Community 10` to `Community 2`, `Community 4`, `Community 5`, `Community 6`?**
  _High betweenness centrality (0.002) - this node is a cross-community bridge._
- **Why does `q()` connect `Community 5` to `Community 2`, `Community 10`, `Community 4`?**
  _High betweenness centrality (0.001) - this node is a cross-community bridge._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.11 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.11 - nodes in this community are weakly interconnected._