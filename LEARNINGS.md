# Learnings — conscious-tabs

Durable, non-obvious learnings for this repo. Append-only: correct a stale record with a
new dated note beneath it rather than rewriting it. Architecture and run steps belong in
[README.md](README.md), not here.

## What Works

- 2026-09-22 — Verified first-hand on current Chrome with a throwaway probe extension: a
  **`chrome.windows.create({ type: "popup" })` extension window can open a Document PiP
  window**, exactly like a normal tab can. This is documented nowhere I could find, and it
  is the fact that makes a floating mode viable — it means the PiP opener (which the float
  cannot outlive) can be a window the user deliberately opened, instead of a stray tab
  parked in their tab strip where this very extension invites them to close it. The same
  probe re-confirmed the side panel is still blocked. Evidence: probe extension, three
  surfaces (side panel / tab / popup window) each calling `requestWindow()` from a click
  handler.
- 2026-09-22 (closes the throttling half of the open question below) — A backgrounded
  opener is **not** timer-throttled while it holds a Document PiP window. Measured with the
  opener tab reporting `document.visibilityState === "hidden"` for 102.1s: hidden-only drift
  −0.1s over 413 ticks. The float's own iframe realm separately reports `visible` and drifts
  0.0s — and that is the number that actually matters, because the shipped app's React and
  timers live inside that iframe, not in the opener. The opener therefore only has to stay
  _alive_, not stay _responsive_, which makes a tab anchor materially safer than it looks.
- 2026-09-22 — **There IS a way to close the side panel programmatically, and it is not
  `close()`.** `chrome.sidePanel.setOptions({ enabled: false })` called _globally_ (with no
  `tabId`) evicts an already-open side panel. This matters because w3c/webextensions#521 and
  every discussion around it say there is no `chrome.sidePanel.close()` — literally true,
  practically misleading. Unlike a panel page calling `window.close()` on itself, this works
  from **any** document in the extension. Measured with a probe extension, step 6.
  **It is a one-way door though** — see What Doesn't Work — so do not reach for it without a
  guaranteed re-enable path.
- 2026-09-22 — **A Document Picture-in-Picture window IS a window to `chrome.windows.getAll()`,
  and `type` will not tell you it apart — `alwaysOnTop` will.** Measured against a live
  float: the real browser window came back `{type: "normal", alwaysOnTop: false}` and the float
  came back `{type: "normal", alwaysOnTop: true, 414x681, tabs: ["about:blank"]}`. So a float
  appears in the mirrored tab list as a focused window holding one about:blank tab, complete with
  a close button that destroys it, and any "which window is the user in" logic resolves to it
  unless it is excluded. `alwaysOnTop` is **exact, not a heuristic**: `chrome.windows.create()`
  is forbidden from setting it (anti-phishing — the same restriction that makes a floating
  extension window impossible in the first place), so no window a user or extension opens can
  ever have it. Evidence: `src/lib/surfaces.ts` `isBrowsingWindow`.
- 2026-09-22 — **Chrome honoured the requested float size almost exactly**: `requestWindow({width:
400, height: 640})` gave an outer window of 414x681 and a content area of 401x641 at dpr 2. The
  clamping warned about in the Document PiP docs did not bite at this size, so a layout budgeted
  for 400x640 is budgeted correctly.
- 2026-09-22 (closes assumption A-8) — **Keyboard focus and text entry do reach a text field
  inside the Document PiP window.** Clicking the search box in the float and typing filters
  the list normally. This was the last unverified assumption in
  `specs/ui-shell/SPEC-01-2026-09-22-floating-tab-manager-window.md`, and the one that would
  have sunk the feature: a float you cannot search is a read-only poster of your tabs. The app
  runs in an extension-origin iframe inside the PiP window, so this also confirms that frame
  keeps working normally — it is not a degraded or inert context.
- 2026-09-23 — **Falsify every new test by reverting the fix it guards.** A test that
  passes against a deliberately broken build is not evidence, and finding out why it
  passes is worth more than the test. The `TabsView` empty-state test passed with the
  list's own filter disabled, which made no sense — and the reason was a real defect it
  had walked straight past: the view rendered "No other tabs are open." whenever the
  windows query had resolved and the tabs query had not, which is every open. Ten of the
  fixes in this branch were pinned this way; three of the tests written alongside them
  pass either way on purpose, and each says so, because they guard the half that must
  _not_ change. Evidence: `src/views/TabsView/TabsView.test.tsx`,
  `src/lib/float.test.ts`.

- 2026-09-29 — **Give a row a stable object and memoise it; otherwise one changed tab
  re-renders the whole list.** `getTabsTree` rebuilds the tree on every browser event, so each
  row arrived as a fresh object with identical contents and React, comparing by reference,
  re-rendered all of them. Measured in jsdom, one title changing cost 162 ms at 20 tabs, 500 ms
  at 80 and 681 ms at 200 — proportional to the list, not to the change. Returning the *same*
  `TabItem` while its contents are unchanged, plus `memo` on `TabListItem`, took it to 29 / 33 /
  64 ms and made it nearly flat. Compare by a signature taken from the object itself, never a
  hand-written field list: a field forgotten there is a row that silently stops updating. Bound
  the cache rather than pruning it — pruning what a build did not see makes `SelectionToolbar`'s
  filtered view evict the main list's rows every render. Evidence:
  `src/lib/Tabs/useTabsStructure.ts` (`stableTab`), `src/lib/Tabs/Tab/TabListItem.tsx`.

- 2026-09-30 — **Test an in-flight load with a hand-released promise, not timers; and gate a
  list wrapper on having rows, not on the empty state.** The tabs and windows stores both sit behind one `Promise.all`
  (`browsingWindowIds`), so holding `windows.getAll` stalls the tabs store too, and a 20 ms
  sleep against a 60 ms delay never proved which half had landed. Hold the read on a promise
  you release by hand, await the reads that did go through inside `act`, assert, then release.
  The bug it pinned: the empty-state early return waits for `loaded`, so until then
  `RowList` rendered as an empty `role="list"` — a wrapper needs its own "has rows" gate.
  Evidence: `src/lib/Tabs/elements/RowList.test.tsx` (`stall`), `src/views/TabsView/index.tsx`.

- 2026-09-30 — **A row's position (", n of N") costs nothing when `RowList` writes it into the DOM after
  commit, not when it is passed as a prop.** `TabDisplay` writes its base name to `aria-label` and
  `data-row-label`; `RowList` appends the position in a `MutationObserver` that watches `childList` +
  `subtree` + `attributeFilter: ["data-row-label"]` — never `aria-label`, which it writes itself.
  Measured at 80 rows in jsdom: one pass is 0.1–0.8 ms for a narrowing filter, 2.3 ms for a close
  and 3.5–4.3 ms for the worst case (69 rows re-added on Backspace), against 120–370 ms of React work
  for the same interactions, so on vs off is inside run-to-run noise. Two test traps: favicon and
  effect mutations fire the observer too, so assert synchronously right after `rerender` or a
  React-erased position looks healed; and only a class-only change (the tab becoming current)
  proves the attribute half of the observer — renames heal through `childList`. Evidence:
  `src/lib/Tabs/elements/RowList.tsx` (`numberRows`), `src/lib/Tabs/elements/RowList.test.tsx`.
- 2026-10-02 — **`scroll-padding` on the scroller is what keeps a focused row out from under a
  sticky header or a fixed footer.** Chrome scrolls a newly focused element into view only when it
  is outside the viewport, and a row under one of those bars is inside it. Measured at 86 rows and
  400px: Shift+Tab left the focused row wholly under the header, Tab left it wholly under the
  action bar. Each bar now writes its own height to `scroll-padding-top`/`-bottom` on its
  document's root and follows it with a `ResizeObserver`; the same presses then bring the row to
  the middle of what is visible. On the bar's `ownerDocument`, because the float runs the app in
  an iframe. Evidence: `src/lib/useScrollPadding.ts`, `plans/MANUAL-SWEEP-SPEC-04.md`
  ("Chromium pass").
- 2026-10-02 — **A browser pass with real key presses found two defects that 430 passing tests did
  not.** Both needed layout or a real re-render: the focused row hidden under a bar, and focus
  lost after a drop into a group. The pass ran in the layout harness with `elementFromPoint` and
  `getBoundingClientRect` probes and a log of `focusin`/`focusout`, and took everything off the
  manual sweep that does not need a screen reader. Do it before asking a person to listen.
  Evidence: `plans/MANUAL-SWEEP-SPEC-04.md`, commits `d78826e`, `084f456`.
- 2026-10-02 — **Three implementer agents in parallel worked because their file lists were
  disjoint and each was told which files the others held.** T-6, T-7 and T-8 ran at once from one
  base commit; each staged its work, and three `git diff --cached --binary` patches applied
  cleanly on top of each other. A defect one agent found in a file it did not own (the window
  row's `div` in a `button`) came back as an `it.fails` test and a note, not as an edit.
  Evidence: commits `39b3e40`, `66faf4a`, `da0c186`.

## What Doesn't Work

- 2026-07-30 — `.gitignore` patterns `*.local` and `.env*.local` do **not** match a bare
  `.env`, so a `.env` written at the repo root by a CLI tool would be committed silently.
  The root ignore file now lists `.env`, `.env.*`, `*.pem`, `*.p12` explicitly — leave
  them in place, they are not redundant with `*.local`. Evidence: `.gitignore:17`.
- 2026-09-22 — The Document Picture-in-Picture API **cannot be opened from the side
  panel**, the action popup, or an offscreen document: `documentPictureInPicture` stays
  null / `requestWindow()` rejects, because those contexts are not a "top-level
  traversable". It works only from an extension page loaded in a real browser tab. So the
  panel can never pop _itself_ out — a float needs a separate opener surface. Chrome also
  allows **one PiP window per browser, globally across all tabs and extensions**, so ours
  would evict the user's video PiP and vice versa. Evidence: WICG
  document-picture-in-picture issue #88 (still open, labelled `chrome-bug`) and the
  chromium-extensions thread "Try using Document Picture-in-Picture API".
- 2026-09-22 — Do **not** measure background throttling using a `type: "popup"` window as
  the opener. An unfocused popup window still reports `visibilityState === "visible"`, so it
  is never throttled and the result says nothing about a backgrounded _tab_, which genuinely
  is `hidden`. A first probe run reported a clean 0.0s drift from a popup opener and was
  wrongly read as a general green light; the tab case had to be re-measured from scratch.
  Two rules for any future run: require the opener to report `hidden` before trusting the
  number, and measure drift across the hidden stretch only — total drift is diluted by the
  time the opener spent visible.
- 2026-09-22 — **`chrome.sidePanel.setOptions({ tabId, enabled: false })` does NOT hide a side
  panel that is already open on that tab.** The `enabled` flag controls _availability_ — whether
  the panel can be opened there, whether the entry appears — not eviction. Chrome's docs and every
  blog post describing "per-tab side panels" are talking about availability, and reading them as
  "the panel follows the active tab" is wrong. Measured with a probe extension, step 2. The
  consequence is that **no tab activation can hide or restore the panel**: a `tabs.onActivated`
  listener carries no user activation, and `sidePanel.open()` requires one, so the return trip
  needs a real click somewhere in the UI.
- 2026-09-22 — **Re-enabling a globally disabled side panel does not bring it back.**
  `setOptions({ enabled: true })` after a global disable restores availability only; the panel
  stays shut until something calls `open()` with a live user gesture. Measured with a probe
  extension, step 7. So the global disable above is a _close_, not a _hide_, and while it is in
  effect the toolbar icon cannot reopen the panel either — meaning a page that disables the panel
  and then dies leaves the user with no way back. If it is ever used, re-enable from the service
  worker on startup as a backstop.

- 2026-09-22 — **Before probing anything about Chrome's side panel or Document
  Picture-in-Picture, read `specs/ui-shell/SPEC-01-…-floating-tab-manager-window.md` §1.2.** It
  holds fifteen constraints (C-1…C-15), each with the evidence that established it, and §14 logs
  which of them were originally wrong and why. Between them they already answer: whether the side
  panel can open a float (no), whether a `type: "popup"` window can (yes), how many floats Chrome
  allows (one, per browser, across all extensions), whether the float survives its opener (no),
  whether a backgrounded opener throttles it (no), whether the panel can be closed
  programmatically (yes, one-way), whether it can be hidden per tab (no), and how to tell a
  floating window apart from a real one (`alwaysOnTop`). Several of those cost a throwaway probe
  extension each. Deliberately not duplicated here — one copy, with its evidence attached.
- 2026-09-23 — **The float's own window holds an `about:blank` tab, and it has now caused
  three separate bugs.** It appeared in the tab list as an ordinary row with a close
  button that would have killed the float; its _window_ appeared as a window row with a
  close control of its own; and closing the float fired `chrome.tabs.onRemoved`, so the
  undo prompt announced a tab closure the user never made and offered to restore it.
  Each was found in the running extension, by a person, weeks apart. The rule that would
  have caught all three at once: **anything that enumerates tabs or reacts to a tab event
  must first ask whether the subject is one the manager actually mirrors** — not whether
  it looks like a tab, because it is one. Evidence: `src/lib/surfaces.ts`
  (`browsingWindowIds`, `isBrowsingWindow`), `src/lib/Tabs/useTabsStructure.ts`
  (`wasListedTab`), `src/lib/Tabs/undo/SyncPrompt.tsx`.
- 2026-09-23 — **Two positioned elements at `z-index: auto` paint in DOM order, and
  nothing in this stack's test tooling can see it.** The row checkbox is
  `position: absolute`; the favicon sits inside the MUI `Badge` that `AudioBadge` wraps
  it in, which is `position: relative` — so the badge, coming later in the tree, took the
  overlap and the checkbox painted underneath. jsdom models no painting order at all, and
  the layout harness could not show it either, because its fake tabs carry
  `favIconUrl: ""` and the fallback globe is mostly transparent: an opaque fill showing
  _through_ a favicon looks identical to one sitting _on_ it. Two probes that do work:
  `document.elementFromPoint(x, y)` at the disputed pixel returns whichever element is
  really on top, and for a hidden-by-opacity ancestor you must read the ancestor —
  `opacity` is not inherited as a computed value, so a child of a faded-out wrapper still
  reports `1`. Evidence: `src/lib/Tabs/Tab/TabDisplay.tsx` (`zIndex: 1`),
  `src/lib/Tabs/elements/AudioBadge.tsx`.

- 2026-09-24 — **`tabIndex: -1` keeps a control out of the tab order; it does **not** hide
  it from a screen reader.** This repo's row model was built on the opposite belief: row
  controls sit at `tabIndex: -1` and are reached with Left/Right, so a list of twenty tabs
  costs twenty tab stops rather than eighty. That part is true and measured — 22 stops
  across 15 rows, none inside them. But axe reports 15 `nested-interactive` violations
  anyway, because each row is `role="button"` (MUI `ListItemButton`) containing four more
  buttons, and assistive technology still reaches them. The honest fix is a
  `grid`/`row`/`gridcell` composite, which changes what the arrow keys mean and touches 11
  files — so know before starting that "we made them `-1`" is not an answer to this.
  Evidence: `src/lib/Tabs/elements/rowControls.ts`, axe-core 4.10.2.
  - 2026-10-02 — **Correction: the count, the engine and the fix above are all out of date.**
    "15" was the number of rows in the list that was audited that day. The rule reports one
    node per rendered row, so the figure is whatever the list holds: 5, 20, 8 and 2 on the
    four fixtures. The engine installed here is axe-core 4.13.0, not 4.10.2. And the fix that
    shipped is not a `grid`: each row is a `toolbar` inside a `listitem`, which kept the
    arrow keys' meaning and brought all four fixtures to 0 (SPEC-04). Evidence:
    `src/lib/Tabs/rows.a11y.test.tsx`, `plans/MANUAL-SWEEP-SPEC-04.md` §A.

- 2026-09-24 — **`manualChunks` buys nothing in a packaged extension.** The 500 kB Vite
  warning invites splitting, and splitting is cosmetic here: every chunk loads from local
  disk at startup and the browser parses all of them regardless — there is no network and
  no caching benefit to win. Measured per package first, which is the part worth copying:
  `@mui/material` 161 kB, `react-dom` 131, our own code 43, `@dnd-kit/core` 38,
  `react-hook-form` 24, icons **6** (so the `@mui/icons-material` barrel imports everyone
  suspects tree-shake fine). The only real lever is deferring code that genuinely is not
  needed at first paint. Evidence: `vite.config.ts` (`chunkSizeWarningLimit` and the
  measurement).
- 2026-09-28 — **Do not reserve layout space for a control that is `opacity: 0`.** Tab
  rows padded the `ListItemText` 64px on the right (96px with mute) so the title would
  clear the absolutely-positioned `ListItemSecondaryAction` — but those controls only
  appear on hover or focus, so at rest every title in the list ellipsised against ~58px of
  empty row. It presents as "titles truncate early for no reason", not as a spacing bug.
  Both obvious repairs lose: reserving on hover reflows the text under the pointer the
  moment it arrives, and letting the title run underneath needs an opaque fill on each
  button, which is exactly what used to make them read as white patches stamped over a
  hovered row (see the comment in `ItemButton`). What works is a `maskImage` gradient
  applied only while the controls are showing — a mask takes no part in layout, so nothing
  can reflow, and it fades the tail rather than covering it. Accepted cost: a long title on
  a hovered row fades where it used to end in an ellipsis. Evidence:
  `src/lib/Tabs/elements/rowControls.ts:96`, `src/lib/Tabs/Tab/TabDisplay.tsx:108`.
- 2026-09-28 (the limit of the note above) — **`rowTailMaskSx` is for plain text, not for
  a filled element.** The group row has the mirror defect — nothing reserved at all, so a
  long name's `Chip` ran 88.3px under the drag handle, the menu and the close button —
  but the mask cannot fix it. It fades the whole `.MuiListItemText-root`, and there that
  box holds a tinted pill: the gradient takes the background and the rounded right edge
  with it, so the chip appears to dissolve wherever the controls are. Plain text has
  nothing to dissolve, which is the entire reason it works on a tab row. So the group row
  reserves after all — `max-width: calc(100% - 96px)` on the chip, and only when there
  are controls, since the drag overlay renders the same row without any. Accepted cost,
  and it is the one the note above rejects for tab rows: a long group name ellipsises
  early even at rest. The general rule is that the choice follows what is being truncated,
  not which row it is. Evidence: `src/lib/Tabs/TabsGroup/GroupDisplay.tsx:58`.

- 2026-09-28 — **A debounce is not burst detection: `chrome.tabs.onRemoved` gaps are
  unbounded.** Closing nine tabs with one click raised two notices, "3 tabs closed" and
  then "6 tabs closed", because the per-tab events straddled the 200ms window. Chrome
  does not pace those events — a page with a `beforeunload` handler, or a renderer that is
  simply busy, lands hundreds of milliseconds after its neighbour — so no wait value
  separates "still arriving" from "finished"; widening it only moves the split and delays
  the ordinary one-tab prompt to pay for it. What works is absorbing the split afterwards:
  while the notice is still on screen, the next burst rewrites it with the running total
  instead of queueing behind it. Evidence: `src/lib/Tabs/undo/SyncPrompt.tsx` (`liveCount`,
  `forget`).

- 2026-09-29 — **A side panel opened programmatically does not take document focus, and no API
  will give it one.** Measured on a real Chrome: after the keyboard command opens the panel,
  typing goes to the page behind it. The API surface is `open` / `setOptions` / `getOptions` /
  `setPanelBehavior` / `getPanelBehavior` — there is no way to ask whether the panel is open, no
  way to focus it, and no `close()`. So "focus the search box on open" cannot be built as
  stated. What works instead is claiming the caret twice: on mount, and again on the window's
  first `focus` event, guarded to fire only while `document.activeElement` is still
  `document.body` so a user who clicked a row is never yanked back. Evidence:
  `src/lib/useInitialFocus.ts`, `plans/MANUAL-SWEEP-SPEC-05.md`.
- 2026-09-29 — **`chrome://extensions/_favicon/` is keyed by page URL, which stops changing the
  moment a navigation settles — so a miss caches forever.** A tab that has just navigated asks
  for an icon Chrome has not catalogued yet, gets the default globe, and the browser caches that
  answer against a request that will never differ again. The row then shows a globe for as long
  as it is open. SPEC-03 E-8 foresaw this and *accepted* it, having reasoned about the rare case
  (a site changing its icon) rather than the one that happens on every navigation. The fix is a
  change token in the query string — a hash of the tab's own `favIconUrl`, which is never
  fetched, only compared. Evidence: `src/lib/Tabs/elements/favicon.ts`.

- 2026-09-30 — **A test that hands a component its own child can pass for the wrong reason,
  and a moved `data-*` hook breaks selectors that use it as an ancestor.** `TabDisplay`'s test
  built its own drag handle with `edge="end"`, so it stayed green with `edge="end"` deleted from
  `TabListItem`, which is what builds the real one; only a test rendered through
  `TabListItem` fails. And moving `data-tab-row` onto the new primary button broke
  `App.test.tsx`'s `main [data-tab-row] [data-row-control]`, which no plan had listed: grep the
  tests, not just `App.tsx`, for every selector a moved hook appears in. Evidence:
  `src/lib/Tabs/Tab/TabDisplay.test.tsx`, `src/App.test.tsx`.
- 2026-10-02 — **A fake that accepts a write and changes nothing hides everything that happens
  after the write.** The harness's `chrome.tabs.move` returned a resolved promise and moved no
  tab, so a keyboard drop never re-rendered the list, and "focus returns to the handle" passed in
  the browser as it had in jsdom. Making `move`, `group` and `ungroup` really mutate and fire
  their events showed focus falling to the body the first time a tab was dropped into a group.
  Evidence: `harness/fakeChrome.ts`.
- 2026-10-02 — **"Was not called", asserted straight after the event, passes whether or not
  anything fired.** `activateTab` is several awaits long, so the call has not happened yet either
  way. Use a positive control: do something afterwards that *does* activate a tab, wait for it,
  and compare the whole call list. Likewise an "arrow leaves focus alone" test must start on a
  control that has a neighbour in that direction, or it passes with the guard deleted. Both were
  caught by falsifying. Evidence: `src/App.test.tsx` (`activatedAfterAControl`),
  `src/lib/Tabs/elements/rowControls.test.tsx`.

## Codebase Patterns

- 2026-09-22 — **Never put a volatile flag in a React list key here.** The window rows were keyed
  `"w" + window.id + window.focused`, so every focus change discarded and rebuilt that whole
  subtree. The tab list reveals its close and select controls on `:hover`, so rows being recreated
  under a stationary pointer makes those controls vanish mid-interaction — it presents as "buttons
  need two clicks" and "clicking the title does nothing", not as a rendering bug. Rare enough to
  ignore in the side panel; constant in the floating window, where activating a tab focuses its
  window and so triggers the remount on _every_ click. `WindowListItem` already syncs its open
  state from `window.focused` in a `useEffect`, so the key was pure cost. Evidence:
  `src/views/TabsView/index.tsx`, `src/lib/Tabs/Window/WindowListItem.tsx:42`.

- 2026-07-30 — The privacy policy exists in **two copies that must be edited together**:
  [PRIVACY.md](PRIVACY.md) (repo-facing) and
  [store-assets/privacy-policy.html](store-assets/privacy-policy.html), which is the
  hosted copy the Chrome Web Store listing links to. Changing one and not the other
  leaves the live, user-visible policy stale — and the store listing depends on it being
  accurate. Evidence: `store-assets/privacy-policy.html:66`.
- 2026-07-30 — A manifest permission change must be mirrored in **five** places or the
  docs and store listing drift from what is actually requested: `manifest.json:6` (source
  of truth), `PRIVACY.md` "Permissions and why they are needed",
  `store-assets/privacy-policy.html` (same section), `README.md:48` ("Requested
  permissions" line), and `store-listing.md:61` ("Permission justifications").
- 2026-09-22 — Six `chrome.sidePanel.open({ windowId })` call sites encode a **per-window
  host model**: "focus that window, and bring the panel along." Any alternative surface
  (Document PiP, a `windows.create` popup) is a **global singleton** that follows no
  window, so each of these flows needs a host-aware branch — they are the real cost of a
  second surface, not the rendering. Evidence: `src/lib/Tabs/Tab/TabDisplay.tsx:32`,
  `src/lib/Tabs/actions.ts:37`, `src/lib/Tabs/actions.ts:55`,
  `src/lib/Tabs/selection/SelectionToolbar.tsx:95`,
  `src/lib/Tabs/Window/WindowListItem.tsx:51`, `src/lib/ControlBar/index.tsx:18`.
- 2026-09-23 — **Browser state is read once, by a module-level store, and components
  subscribe.** `useTabsStructure` was per-component state, so five callers each ran their
  own chrome listeners, their own debounce and their own three-call query: a single
  `chrome.tabs.onUpdated` cost 12 extension round trips, measured. It is now one store
  behind `useSyncExternalStore`, and that is 3 — for any number of subscribers, and for a
  burst of events as well as one. Three rules the store encodes, each of which was a bug
  first: a **generation counter**, because three awaited round trips can land out of
  order and the older answer used to win; **`undefined` until the first query resolves**,
  because an initial `[]` is a claim that the browser is empty and two views printed it;
  and **listeners that live exactly as long as a subscriber**, dropping the snapshot at
  zero so the next subscriber starts cold. Evidence:
  `src/lib/Tabs/useTabsStructure.ts`.
- 2026-09-23 — **One reveal model for every row control, keyed on a class.**
  `rowControlsSx` hides `.itemAction` with `opacity` and reveals it on hover, focus and
  `[data-selected]`; `useRowKeys` walks the `[data-row-control]` elements with Left and
  Right so a row is one Tab stop rather than four. Hide with **opacity, never
  `visibility`** — `visibility: hidden` removes an element from `focus()` entirely, so
  arrowing onto it fails silently. Anything that wants to pin controls open must set the
  same property the model hides with: an override left saying `visibility: visible` after
  the migration did nothing for weeks, and left a group's menu anchored to a control that
  had faded out. Evidence: `src/lib/Tabs/elements/rowControls.ts`.
- 2026-09-28 — **"Are this row's controls showing?" has two spellings, and they must not
  be merged.** `rowControlsSx` asks it per control; `revealedRow` — the list
  `rowTailMaskSx` builds its selectors from — asks it of the row as a whole. They differ
  deliberately: the row-level list drops `[data-selected]`, because the checkbox that
  attribute keeps open sits in the row's **left** padding, so a selected row with the
  pointer elsewhere has nothing on its right to mask. The trap when writing the row-level
  version is that **`&:has(:focus-visible)` does not match the row itself** — `:has()`
  only inspects descendants — so a row focused by Tab needs its own `&:focus-visible`, and
  leaving it out breaks the keyboard path alone, which no pointer test will show. Evidence:
  `src/lib/Tabs/elements/rowControls.ts:38`.

- 2026-09-30 — **`useRowKeys` serves rows in different states, so "is the row itself a stop" is
  read off the element (`row.tabIndex >= 0`), not passed in.** SPEC-04 T-2 made the tab row a
  `role="toolbar"` at `tabIndex -1` whose one stop is a primary button, and dropped the row
  from `stops` for everyone — which silently took Left/Right away from the group and window
  rows, still focusable `ListItemButton`s until T-4/T-5, with no failing test. Converting a row
  to `tabIndex -1` now drops it from the walk by construction. This also updates the
  2026-09-28 Codebase Patterns note on `&:focus-visible`: the tab row is never focused now, so
  its reveal comes only from `&:has(:focus-visible)`; the group and window rows still need
  both. Evidence: `src/lib/Tabs/elements/rowControls.ts` (`useRowKeys`).
- 2026-10-02 — **The Tab-stop budget is one stop per row, before and after the toolbar
  rework; do not re-derive it.** Measured on the 20-plain-tab fixture with a
  `userEvent.tab()` loop: 20 stops before SPEC-04 and 20 after. What changed is what the stop
  is. Before, it was the row itself, with 60 controls behind it at `tabIndex -1`. After, the
  row is never focused and the stop is its primary button, so there are 80 `[data-row-control]`
  elements and exactly 20 of them are at `tabIndex 0`. The other fixtures cost 5, 8 and 2
  stops. The stop does not rove: nothing reassigns `tabIndex`, so coming back to a row always
  lands on its first control. Evidence: `src/lib/Tabs/rows.a11y.test.tsx` (the AC-9 block),
  `src/lib/Tabs/elements/rowControls.ts` (`rowPrimaryProps`).
- 2026-10-02 — **dnd-kit restores focus after a keyboard drag once; a drop that rebuilds the row
  needs a second answer.** A drop that moves a tab into or out of a group re-renders the row under
  a different parent, so the handle dnd-kit just focused is removed. `App` records the dropped
  row with `oweFocusTo`, and that row's `DragHandle` takes focus as it mounts when nobody else
  holds it. The record lapses after 3 s and is not consumed by the first claim, because the row
  mounts twice: once when the drag ends, again when Chrome reports the move. Keyboard drops only.
  It is a module flag beside `dragActive`, for the same reason: a context would re-render every
  row. Evidence: `src/lib/Tabs/elements/rowControls.ts`, `src/lib/Tabs/elements/DragHandle.tsx`.
- 2026-10-02 — **Drag announcements are worded from what each drop zone's handler does, in one
  file, and never say an id.** `"tab"` is "before ‹tab›" (plus "in its group" when the target is
  grouped), `"group"` is "before group", `"group-inner"` is "into group", `"window-end"` and
  `"in-window"` are the end and the start of a window. The zone types are bare strings, so a
  renamed zone compiles and falls back to "Dropped ‹subject›"; `announcements.test.ts` is the
  only guard. Evidence: `src/lib/Tabs/DnD/announcements.ts`.

## Decisions

- 2026-07-30 — Favicons render by pointing `<img src>` at `tab.favIconUrl`, which is
  normally the **site's own** icon URL, so opening the panel can issue image requests to
  the origins of every mirrored tab — including collapsed groups and windows the user is
  not looking at. No user data is transmitted, but it contradicts a literal reading of
  "your tabs never leave your browser" in the privacy policy. Decision for shipped
  v0.0.4: document the behaviour in both policy copies rather than change shipped code.
  Planned for v0.0.5: switch to
  `chrome.runtime.getURL('/_favicon/?pageUrl=…&size=…')` plus the `favicon` permission,
  which reads Chrome's local favicon database (zero network) and also fixes the broken
  icon for `chrome://` pages — then delete the clarifying paragraph from both copies.
  Evidence: `src/lib/Tabs/elements/TabFavicon.tsx:19`, and three further call sites in
  `src/lib/Tabs/Tab/TabDisplay.tsx`, `src/lib/Tabs/AudioTabs/index.tsx`,
  `src/lib/Tabs/elements/TabAvatarsDisplay.tsx`.
- 2026-09-22 — Researched replacing the side panel with a floating Document PiP window.
  Decision: **keep the side panel as the primary home and treat a float as an opt-in
  second surface**, opened from the extension page that `ControlBar` already puts in a tab
  — that opener needs zero new permissions. Rejected the one-click alternative (content
  script on the active tab as the opener, extension page iframed into the PiP window):
  it needs host permissions, which breaks the zero-host-permission claim in `PRIVACY.md`,
  labels the float with the _host page's_ origin in the PiP title bar, and kills the float
  whenever that page navigates or closes — fatal for an extension whose job is closing and
  switching tabs. Also rejected `chrome.windows.create({ type: "popup" })`: it survives
  everything but is not always-on-top, and `alwaysOnTop` is deliberately not settable from
  `windows.create` (anti-phishing) — which is why TabFloater ships a native companion app.
  Evidence: `src/lib/ControlBar/index.tsx:23` (existing open-in-tab surface, reuses the
  tab if present).

## Tool & Library Notes

- 2026-07-30 — `chrome.windows.*` and `chrome.runtime.*` require **no** manifest
  permission entry, which is why `manifest.json` declares only
  `sidePanel, tabs, tabGroups, sessions` despite heavy `chrome.windows` use. The `tabs`
  permission is what unlocks `url` / `title` / `favIconUrl` on tab objects returned inside
  Window objects. Do not "fix" the apparent gap by adding a `windows` permission — no such
  permission exists and it would fail store review. Evidence: `manifest.json:6`.
- 2026-09-22 — If a second window surface is ever built, **iframe the extension page into
  it rather than re-parenting React DOM across documents**. Moving nodes into another
  document breaks this stack in three places at once: Emotion injects `<style>` into the
  _opener's_ `<head>`, every MUI `Tooltip` (12), `Menu` (9) and `Dialog` (3) portals into
  the opener's `document.body`, and notistack's `SnackbarProvider` does the same — so they
  render invisibly in the wrong window. Fixable with an Emotion `CacheProvider` container
  plus `container=` on every portal, but that is a tax on every future component; an
  extension-origin iframe keeps full `chrome.*` access and costs none of it. Document PiP
  additionally copies **no** stylesheets and requires `requestWindow()` to be called
  synchronously in the click handler — any `await` before it burns the transient-activation
  token. Evidence: `src/lib/Theme/index.tsx` (Emotion/MUI provider setup).
- 2026-09-23 — **dnd-kit publishes `aria-pressed="true"` on the drag activator for the
  life of a drag**, which is the signal to use when other handlers must yield to it —
  no plumbing of `isDragging` through three row components. Needed because the row's
  own Left/Right handler was stopping the arrow keys before dnd-kit's `KeyboardSensor`
  saw them. Note the asymmetry that hid this: a dragged **tab** row unmounts
  (`{!isDragging && …}`), so nothing of it survives to interfere, while a dragged
  **group** row stays mounted until something is hovered
  (`{(!isDragging || !over) && …}`). Evidence: `src/lib/Tabs/elements/rowControls.ts`,
  `@dnd-kit/core` 6.1.0.

  - 2026-09-24 — **Superseded: do not use `aria-pressed` for this.** The attribute means
    "this toggle is on", so the first row control to become a genuine toggle would have
    switched the arrow keys off. `useDndContext` says exactly the right thing but
    subscribes every row to a context memoised on `collisions`/`over`, which is
    recomputed continuously while a drag moves — every row re-rendered on every pointer
    move. What shipped instead is a module-level flag that `App`'s `DndContext` handlers
    set on drag start/end/cancel, read at event time rather than subscribed to. Evidence:
    `src/lib/Tabs/elements/rowControls.ts` (`setRowDragActive`), `src/App.tsx`.

- 2026-09-24 — **MUI's `sx` does not read a bare number as pixels.** Sizing treats a value
  of 1 or less as a _percentage_ and spacing multiplies by _8_, so the textbook
  visually-hidden recipe — `width: 1, height: 1, margin: -1` — produced a **99px-tall**
  absolutely positioned element over the whole top bar, hidden only because the clip
  happened to cover for it. Measured 99.23px before, 1px after. Write every length in
  `sx` as a string with units unless you actually want the percentage or the ×8. Evidence:
  `src/lib/srOnly.ts`.

- 2026-09-24 — **A live region has to be in the DOM before its text is.** Rendering the
  region and its first message in the same commit is not reliably announced, so the search
  result count lives in `App` — mounted for the life of the page — rather than in
  `SearchView`, which unmounts whenever the box is empty. Debounce it too: `polite` queues
  rather than interrupts, so announcing each keystroke means hearing five stale counts
  before the one that matters. notistack already carries its own region, so snackbars need
  nothing. Evidence: `src/App.tsx`.
- 2026-09-28 — **Every MUI icon in this app is 12/14 of its documented size.**
  `typography.fontSize: 12` feeds MUI's `pxToRem`, which is where `MuiSvgIcon` sizes come
  from. An `IconButton`'s 8px padding does not scale with it, so it is not even a clean
  ratio: an `IconButton` is **33.1px** wide around a `fontSize="small"` icon and
  **36.6px** around a default-size one — not the 36 and 40 the MUI docs imply. Both
  reserved widths in `TabDisplay` were derived from the documented numbers and were 6.3px
  and 1.7px too wide because of it; worse, a hand-checked diagnosis of those widths read a
  1.7px **gap** as an 8px **overlap** and prescribed widening what was already too wide.
  Measure control widths with `getBoundingClientRect()` in the harness, never derive them
  — including when the arithmetic arrives already "verified". Pairs with the `sx`
  bare-number note above: MUI's sizing here is twice not what it says on the tin.
  Evidence: `src/lib/Theme/index.tsx:40`, `src/lib/Tabs/Tab/TabDisplay.tsx:100`.

  - 2026-09-28 (the trap left after you start measuring) — **measure the container, not
    the buttons.** `edge="end"` is a `-12px` right margin, so a
    `ListItemSecondaryAction`'s own width is 12px _less_ than its children add up to: a
    group row's three controls span 100.3px but the container reports **88.3px**, and
    88.3 is the number to reserve against, because it is where the leftmost control
    actually starts. Summing `getBoundingClientRect()` over the buttons is still
    measuring, and still wrong by 12px. Evidence:
    `src/lib/Tabs/TabsGroup/GroupListItem.tsx:147`, `src/lib/Tabs/Tab/TabDisplay.tsx:104`.

- 2026-09-28 — **jsdom _does_ resolve a static `sx` rule, so "is this style applied at
  all" is unit-testable.** Emotion injects its `<style>` into the test document and
  `getComputedStyle(el).maxWidth` comes back as the literal `calc(100% - 96px)`. Worth
  writing down because `TabDisplay.test.tsx` says jsdom "would not resolve that cascade",
  which is true of the thing it was said about — a _state-dependent_ rule where
  `.itemAction { opacity: 0 }` has to be arbitrated against `[data-selected]` — and not
  true of a plain unconditional rule. So: a rule's **presence and any prop-level
  condition on it** can be guarded in jsdom; whether the value is _big enough_ cannot,
  since nothing is laid out and the same test passes at 10px. Say which of the two a
  style test is doing. Evidence: `src/lib/Tabs/TabsGroup/GroupDisplay.test.tsx:48`.

- 2026-09-28 — **A layout harness already answering on :5200 may belong to a different
  worktree.** The harness is pinned with `strictPort: true`, and this repo is worked on
  in several `.claude/worktrees/*` at once, so a sibling session's server answers and
  looks entirely normal — a whole row was measured against another branch's code before
  anything gave it away. Since measuring is the method here (see the note above), this
  produces confident numbers for code that is not under change, which is worse than not
  measuring. Check which tree is being served before trusting anything:
  `performance.getEntriesByType('resource').map(e => e.name)` — vite serves
  out-of-root files as `/@fs/<absolute path>`, so the worktree is in the URL. If it is
  the wrong one, add a second entry on a free port to the worktree's own
  `.claude/launch.json`, which is untracked and per-worktree, so it never reaches a PR.
  Evidence: `vite.harness.config.ts:12`.

- 2026-09-29 — **A service worker written as pure side effects is not a TypeScript module, and
  `await import()` of it fails the build while the suite stays green.** `src/worker/index.ts`
  had no import and no export, so `tsc` treated it as a global script: `TS2306: File … is not a
  module`. Vitest does not type-check, so 167 tests passed over a red build — the same trap
  already recorded under Recurring Errors, reached by a new route. `export {}` is the seam, and
  it becomes redundant the moment the file imports anything. The import itself is the only test
  seam a worker has: `vi.resetModules()`, then `installChrome()`, then `await import()`, in that
  order — a cached module does not re-run its side effects, and a stub installed after the
  import is not the object the worker captured. Evidence: `src/worker/index.ts`,
  `src/worker/index.test.ts`.
- 2026-09-29 — **A `chrome.commands` event does carry the user activation `sidePanel.open()`
  needs, and the listener is handed the active tab.** Confirmed on a real Chrome: the shortcut
  opens the panel. `CommandEvent` is `(command: string, tab: chrome.tabs.Tab) => void`
  (`@types/chrome/index.d.ts:1264`), so `tab.windowId` is in hand before the first statement runs
  and there is nothing to await — which is what makes the call safe, since it is awaiting, not
  calling, that spends the activation. Keep `open()` ahead of any `await`, `.then`,
  `sendMessage` or other `chrome.*` call; a synchronous comparison is fine. The failure has no
  symptom beyond "the key did nothing". Evidence: `src/worker/openSurface.ts`.

- 2026-09-30 — **A `ButtonBase` nested inside `ListItemButton` shares its events with the row.**
  Focus bubbles, so the row picks up `Mui-focusVisible` when the inner button takes keyboard
  focus — today that is the tab row's only visible focus indicator, pinned in
  `TabDisplay.test.tsx`, so do not give the button its own ring on top. `mousedown` bubbles
  too, so both ripples play unless the inner one has `disableRipple`; `stopPropagation` in the
  inner `onClick` stops only the click (which still has to pass the event on — Ctrl-click
  selection reads its modifiers). And the row can be `role="toolbar"` at all only because
  `ButtonBase` spreads props after its `role: "button"` default; that is asserted, not trusted.
  Evidence: `src/lib/Tabs/Tab/TabDisplay.tsx` (primary `ButtonBase`).
- 2026-09-30 — **axe in Vitest: enforce "never disable a rule" in the runner, and print node
  HTML.** A source scan for `rules: { "nested-interactive" … }` missed multi-key, computed-key
  and array forms; `runAxe` now throws on `rules` or `disableOtherRules`, and the scan remains
  only for `axe.configure`, which bypasses the runner. `nested-interactive` targets are
  class-based and identical across rows, so the failure message carries each node's HTML. Under
  the jsdom environment `import.meta.url` is an `http:` URL and `fileURLToPath` throws — use
  `process.cwd()` to reach `src/`. Evidence: `src/test/axe.ts`, `src/lib/Tabs/rows.a11y.test.tsx`.
- 2026-10-02 — **axe looks straight through a wrapper that has no role, no `aria-*` and no
  focusability, and one `aria-*` attribute ends that.** `aria-required-children` collects a
  list's owned elements by descending through every such element, and
  `aria-required-parent` climbs past the same ones. That is why one `role="list"` can own
  `listitem`s that sit three layers down, under a MUI `Grid` container, a `Grid` item and the
  `Dropzone` div. Put any global `aria-*` attribute or a `tabIndex` on one of those wrappers
  and it becomes an owned child that is not a `listitem`, and the rule fires. Nothing shows
  this until axe runs. Evidence: `node_modules/axe-core/axe.js:27783-27786` (4.13.0,
  `getOwnedRoles`), `src/lib/Tabs/elements/RowList.tsx`.
- 2026-10-02 — **An explicit `role` on a MUI `ButtonBase` wins, because of the order props are
  spread in.** For any component that is not a `<button>`, `ButtonBase` sets
  `buttonProps.role = 'button'`, then renders with `buttonProps` first and the caller's
  remaining props after it. So `<ListItemButton component="div" role="toolbar"
  tabIndex={-1}>` really is a toolbar, and keeps `dense`, `selected`, the ripple and the hover
  fill. This is what made SPEC-04 a role change and not a rewrite of three row components.
  It is an implementation detail of MUI 5.15.14, so each row's test asserts the rendered
  `role` and `tabindex`; that test is the alarm if an upgrade reverses the order. Evidence:
  `node_modules/@mui/material/ButtonBase/ButtonBase.js:263` and `:309`,
  `src/lib/Tabs/Tab/TabDisplay.test.tsx`.
- 2026-10-02 — **MUI `ButtonBase component="div"` is a real button to assistive technology and
  moves no pixel.** It sets `role="button"`, fires `onClick` on Enter at keydown and on Space at
  keyup (only when the event's target is the element itself), and prevents Space from scrolling.
  That is how a control whose children are `div`s and a `p` stops being invalid HTML inside a
  `<button>`. Measured at 400px: every control kept its position. `user-event` does not
  synthesise a click for a `div`, so an Enter or Space test on it exercises MUI's handling, not
  the browser's. Evidence: `node_modules/@mui/material/ButtonBase/ButtonBase.js:203-268`,
  `src/lib/Tabs/Tab/TabDisplay.tsx`, `src/lib/Tabs/Window/WindowDisplay.tsx`.
- 2026-10-02 — **In jsdom, axe's `color-contrast` is inapplicable on this list, not undecided, so a
  green run says nothing about contrast.** A plain coloured element comes back `incomplete`,
  because jsdom has no painted colours. Text that is `overflow: hidden` (every `noWrap` line here)
  has no size, is treated as clipped, and drops out as `inapplicable`. A violations-only run shows
  neither. Ask for `incomplete` and `passes` too, and assert both exactly. Evidence:
  `src/lib/Tabs/rows.a11y.test.tsx` (the two contrast cases).
- 2026-10-02 — **dnd-kit details that cost time.** Its `KeyboardSensor` adds its document
  `keydown` listener in a `setTimeout`, so an Escape sent in the same instant as the pick-up is
  not seen; only automation is that fast. Its live region is `[id^="DndLiveRegion"]`, separate
  from the app's own `role="status"`. Outside a `DndContext`, `attributes` carry
  `aria-describedby=""`. Focus restore runs in `requestAnimationFrame`. Evidence:
  `src/App.test.tsx` ("reordering from the keyboard"), `src/lib/Tabs/elements/DragHandle.test.tsx`.
- 2026-10-02 — **`it.fails` records a known defect in a file its finder may not edit.** The test
  stays green while the defect stands and goes red the moment someone fixes it, which is the
  prompt to turn it into a plain `it`. Used once, for the window row's `div` inside a `button`,
  and converted in the same session. Evidence: commit `39b3e40`.

## Recurring Errors & Fixes

- 2026-09-23 — **`npm test` passing does not mean the branch builds.** Test files live
  under `src/`, and `tsconfig.json` includes `src`, so `npm run build` type-checks them —
  twice in one session a fixture with a wrong type left 115 and then 124 vitest tests
  green while `tsc` failed. Run `npm run build` before every commit, and check its exit
  code rather than grepping its output: an earlier non-building commit got through
  because a `grep` in an `&&` chain masked the real status. Evidence: `tsconfig.json`
  (`include: ["src"]`), `package.json` (`build: tsc && vite build`).

- 2026-09-24 — **A test fake must clone what it hands out, because `chrome.*` does.** Both
  fakes returned live references to their fixture arrays, so mutating a fixture made the
  change look as though it had always been there. That silently defeated a new
  equality check under test — the harness said `liveUpdate: false` while the unit test for
  the same behaviour passed for the wrong reason. Neither would have caught it alone.
  `structuredClone` on the way out of every `query`. Evidence: `src/test/chromeStub.ts`,
  `harness/fakeChrome.ts`.

- 2026-09-24 — **A test that asserts the _absence_ of something stops testing the day that
  thing becomes legitimate.** `TabDisplay.test.tsx` proved a hostile tab title could not
  become markup by asserting the row contained no `<img>` at all — which held only while
  rows had no images. Moving favicons to `_favicon` gave every row one, and the choice was
  between deleting the guard and rewriting it. It asserts the _origin_ of every image now,
  which asks the same question and survives rows legitimately having some. When a test's
  assertion is "there is no X", write down what makes that true, because it is a
  precondition, not a property. Evidence: `src/lib/Tabs/Tab/TabDisplay.test.tsx`.
- 2026-10-02 — **A hidden preview pane paints about two frames a second, and everything that
  waits for a frame looks broken.** `requestAnimationFrame`, `ResizeObserver` and screenshots all
  lagged: dnd-kit's focus restore read as "focus lost", and `scroll-padding` read as stale for
  seconds. Count frames first (`requestAnimationFrame` in a one-second loop), and give each step
  1.5–3 s when the count is low. Evidence: `plans/MANUAL-SWEEP-SPEC-04.md` ("A trap in the tool").
- 2026-10-02 — **The harness page went blank with "Element type is invalid … got: undefined"
  after files were rewritten under a running Vite.** Vite had read `App.tsx` at the instant
  `git apply` was writing it and cached an empty module, so the default export was undefined.
  Tests and the build were green throughout. Fix: `touch` the file, or restart the server, and
  check what is served with `curl …/@fs/…/App.tsx` before suspecting the code.

## Session Notes

- 2026-07-30 — Prepared the repo for going public (still private at time of writing;
  visibility flip is a manual step). Full-history secret scan came back clean: all 88
  paths ever added and all 405 blobs across every ref content-scanned for connection
  URIs, cloud keys, OAuth secrets, extension signing keys and private keys — zero hits,
  and no `key`/`oauth2`/`host_permissions` in any of the 13 historic `manifest.json`
  versions. Added MIT `LICENSE`, fixed the stale "not on the Web Store" install section,
  and set repo description/topics/homepage. Default branch renamed `master` → `main`.
  README feature claims were re-verified against source and all hold.
- 2026-09-22 — Research-only session (no code changed): can the tab UI live in a Document
  PiP window instead of the side panel? Answer is "not as a swap" — see What Doesn't Work.
  Surveyed three architectures (extension tab as opener / content script as opener /
  non-PiP popup window) and weighed them for users: a float wins by surviving outside the
  browser entirely (visible over Slack, an IDE, a full-screen call), and loses on size
  clamping, no positioning, the global one-PiP limit, and dying with its anchor.
- 2026-09-23 — Built SPEC-01 (the floating window) to completion and SPEC-02 (tab audio
  controls) alongside it, then reviewed the branch and fixed eleven findings. The pattern
  worth carrying forward: everything the harness and jsdom could answer, they answered
  cheaply and precisely — geometry, idle cost (zero queries across 79s), event-to-DOM
  latency, API call counts — and every bug that actually reached a user was found by a
  person looking at the running extension. Three of them came from the same fact about
  the float's `about:blank` tab, one from paint order, one from a `visibility` rule left
  behind by a migration. The harness is worth keeping and worth distrusting: it renders
  the real components, but its fake favicons are transparent and its fake chrome has no
  PiP window, so an empty result there means "not reproducible here", never "not a bug".
- 2026-09-28 — Post-0.1.0 polish: tab titles truncating early in the list. Measuring
  first was the whole job — the diagnosis handed in had the right direction and the wrong
  arithmetic in both branches, and one browser probe settled it. Checked the other three
  row types and left all three alone, each differing for a reason (a `Chip` that sizes to
  its content, favicon avatars that already stop short, and a card whose controls are
  in-flow and always visible) — but `GroupDisplay` has the mirror defect: nothing reserves
  or masks there, so a long group name's chip runs ~88px under its controls. Left for its
  own change. https://github.com/RostK/conscious-tabs/pull/8
- 2026-09-28 (closes the note above) — Fixed the group row, and the interesting part was
  that the obvious move — reuse `rowTailMaskSx`, which had just landed for tab rows — is
  wrong here, for a reason visible only by looking: the mask fades a filled pill's tint
  and rounded edge along with its text. Measuring first paid again. The controls span
  88.3px, not the 100.3px the three buttons actually occupy, because `edge="end"` takes
  12px back off the container; the number that matters is the one the row's own boxes
  report, not any arithmetic over icon sizes. The harness had no group name long enough
  to reach the controls — "Reading" stops 148px short — so the bug could not be seen
  there at all until the fixture gained one, which is the same gap the long tab title was
  added to close. Also found and left alone: the drag overlay renders `GroupDisplay` with
  no controls, so the reservation is conditional; `TabDisplay` had the same shape and the
  mask made it moot.

- 2026-09-29 — Shipped the keyboard way in (SPEC-05 group A: a command, focus in the search
  field, one Down into the list), fixed a favicon that went stale after navigation, and cut the
  per-event re-render cost of the list by roughly 5–15×. Two measurement lessons worth keeping.
  First, a benchmark is only a comparison if both sides were taken the same way — a first
  "after" run used a 5 ms `waitFor` interval against a 50 ms baseline and flattered the result
  by about half; it was thrown away and both re-measured. Second, jsdom answers scaling
  questions and not absolute ones: it says whether cost grows with list size, and nothing
  trustworthy about milliseconds, paint or GC.

- 2026-09-30 — SPEC-04 T-0…T-2 built (the list, the tab row as a toolbar), reviewed by three
  gates and `pr-self-review` with two fix rounds, and checked in a real Chromium on the layout
  harness. The review caught what the suite could not: a shared key handler regressing rows
  the unit did not touch, and a row name that read a whole `data:` URL aloud. Held for T-3,
  the NVDA gate. `src/lib/Tabs/Tab/TabDisplay.test.tsx` contains NUL, BEL and RLO on purpose,
  so git calls it binary: use `git diff --text`, edit it with narrow replacements, and count the
  bytes with node afterwards.

## Open Questions

- 2026-07-30 — Where is `store-assets/privacy-policy.html` actually deployed? The Chrome
  Web Store listing links to a hosted copy, but the deploy target is not recorded
  anywhere in this repo, so a policy edit here does not obviously propagate. Worth writing
  the URL and deploy step into the README once known.
- 2026-09-22 — Two things to settle with a throwaway unpacked extension before writing any
  float feature code: (a) does a backgrounded opener tab throttle timers/rAF for the PiP
  window's content — probably not via an iframe, since the PiP window is its own visible
  widget, but unverified and it is the one failure that would make the float feel broken;
  (b) is WICG #88 still unfixed in current Chrome, i.e. does side-panel → PiP now work?
  Also unverified: keyboard focus into the search field while the float has focus.
- 2026-09-22 (resolves part of the note above) — Answered by the probe: WICG #88 is **not**
  fixed, the side panel still cannot open PiP, and a `type: "popup"` window **can**. Still
  open from that note: whether a backgrounded opener throttles the float's timers, and
  whether keyboard focus reaches a text field inside the float.
- 2026-09-22 (closes both 2026-09-22 notes above) — Throttling is answered: see What Works.
  Still unverified is whether keyboard focus and text entry reach a text field _inside_ the
  float. Chrome's own Document PiP documentation names text editing and note-taking among the
  target use cases, so it is assumed to work and is tracked as assumption A-8 in
  `specs/ui-shell/SPEC-01-2026-09-22-floating-tab-manager-window.md`. Verify during
  implementation before relying on the float's search field.
- 2026-09-22 (closes the note above) — Verified by hand: search works inside the float. Nothing
  from the 2026-09-22 research session is open any more. See What Works.
