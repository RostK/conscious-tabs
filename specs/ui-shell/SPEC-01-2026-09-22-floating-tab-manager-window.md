# SPEC-01 — Floating tab manager window

|                |                                                                                                 |
| -------------- | ----------------------------------------------------------------------------------------------- |
| **Spec ID**    | SPEC-01                                                                                           |
| **Date**       | 2026-09-22                                                                                        |
| **Module**     | `ui-shell` (app hosting surfaces: `src/lib/host.ts`, `src/lib/float.ts`, `src/lib/ControlBar/`)   |
| **Status**     | approved                                                                                          |
| **Supersedes** | —                                                                                                 |

---

## 1. Problem

Conscious Tabs today renders in exactly one place: the Chrome side panel
(`manifest.json` → `side_panel.default_path: index.html`). That has two costs the user has now
named explicitly:

1. **It takes browser width.** The side panel is docked inside the browser window and permanently
   narrows the page the user is actually reading. A tab manager is a glance-and-act tool; paying
   for it with page width all day is a bad trade.
2. **It is invisible outside the browser.** While the user is in Slack, an IDE, or a full-screen
   call, the panel — and therefore the tab list — is gone. Tab triage only happens once the user
   has already switched back to Chrome, which is exactly the moment the crowded tab strip is
   already in their face.

The user's stated wish: _"I wish to give user visible tabs manager to stick to page, while not
taking space in browser. Current idea is to add 'float this window' button and hide side panel
while it visible."_

The **Document Picture-in-Picture** window is the only surface Chrome offers an extension that is
(a) always on top of other applications, (b) outside the browser frame, and (c) reachable with no
new permission and no native companion app. This spec defines the product behaviour of adopting it
as an **opt-in second home** for the existing tab manager.

### 1.1 The three surfaces

| Surface         | What it is                                                                     | Role                                                                          |
| --------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| **Side panel**  | `index.html` in the Chrome side panel (today's only home)                      | Default home. Unchanged, fully featured.                                       |
| **Anchor tab**  | The extension's own page open in a **normal browser tab**                       | A legitimate surface in its own right, showing the full, normal tab-manager view. Also the only document allowed to open the float. |
| **Float**       | A Document Picture-in-Picture window opened from the anchor tab                 | Always on top, outside the browser frame, ~400 px wide.                        |

The anchor tab is **not** a placard, a stepping stone, or a dedicated pop-up window. It is the
normal tab view, and a user may legitimately prefer it (a big-screen triage surface) without ever
opening a float.

### 1.2 Why the literal one-click idea is not buildable

The user's idea — a single "float this window" button inside the side panel — is blocked by the
platform, not by design preference. This was established empirically on 2026-09-22 with a
throwaway probe extension on the user's current Chrome, plus primary sources. It is recorded here
as a **constraint with its evidence** rather than quietly designed around.

| #    | Constraint                                                                                                                                                                                                                                              | Evidence                                                                                          |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| C-1  | Document PiP **cannot** be opened from a side-panel document — the side panel is not a "top-level traversable" and the API object is absent there.                                                                                                       | Probe extension, 2026-09-22; WICG/document-picture-in-picture#88, still open, labelled `chrome-bug` |
| C-2  | It **can** be opened from a **normal browser tab** (the shape this spec adopts), and also from a `chrome.windows.create({ type: "popup" })` extension window.                                                                                            | Probe extension, 2026-09-22 (the popup-window case is documented nowhere else)                      |
| C-3  | `requestWindow()` requires transient user activation, must be called synchronously in the click handler (any `await` first burns the token), and activation belongs to the **document where the click landed** — it does not transfer across documents.   | Probe extension, 2026-09-22                                                                         |
| C-4  | Synthetic clicks cannot substitute: a handler fired by `.click()` or a dispatched `MouseEvent` sees `isTrusted: false` and `navigator.userActivation.isActive: false`.                                                                                   | Probe extension, 2026-09-22                                                                         |
| C-5  | Chrome allows **one** Document PiP window per browser, globally, across all tabs **and** all extensions. Opening ours evicts the user's video PiP and vice versa.                                                                                        | Probe extension + chromium-extensions thread, 2026-09-22                                            |
| C-6  | The float never outlives its opener. Closing **or navigating** the opener destroys the float.                                                                                                                                                           | Probe extension, 2026-09-22                                                                         |
| C-7  | The float cannot be positioned by the page; `width` / `height` are hints Chrome may clamp; resizing needs a user gesture. `disallowReturnToOpener` (Chrome 124+) and `preferInitialWindowPlacement` (130+) are available.                                 | Probe extension, 2026-09-22                                                                         |
| C-8  | The opener is **not** timer-throttled while it holds a float: 360 ticks measured over exactly 90.0 s with 0.0 s drift while the opener was backgrounded, versus Chrome's normal budget throttling starting ~10 s after hide. The opener is exempt.        | Probe extension, 2026-09-22 (measured with a popup-window opener — see A-7)                         |
| C-9  | There is no `chrome.sidePanel.close()`. A side-panel page **can** close itself via `window.close()`.                                                                                                                                                     | w3c/webextensions#521, still open                                                                   |
| C-10 | `chrome.sidePanel.open()` requires a user gesture.                                                                                                                                                                                                      | Chrome extensions API                                                                               |
| C-11 | The float's window title is taken from its **opener**, so an extension-origin opener labels the float with the extension name.                                                                                                                           | Probe extension, 2026-09-22, confirmed visually                                                     |
| C-12 | **Derived from C-9 + C-10.** "Hide the side panel while the float is visible" can only be built as "the panel closes itself on the click that opens the anchor tab". The panel therefore disappears **one step earlier** than the user's phrasing implies, and cannot be brought back without a fresh user gesture. | C-9, C-10                                                                                           |

C-1 + C-3 + C-4 together form a hard floor: **a click in the side panel can never open a float
anywhere, by any indirection.** The minimum viable shape is therefore a two-step hand-off — side
panel → anchor tab → float — where the second click lands in a document that is allowed to ask.
C-12 is the second floor: the side panel cannot be hidden at the moment the float appears, only at
the moment the anchor tab is opened.

```mermaid
stateDiagram-v2
    [*] --> Panel: toolbar icon (C-10, user gesture)
    Panel --> Anchor: "pop out" click — find-or-create the extension tab;<br/>panel closes itself (C-9, C-12)
    Anchor --> Float: "float" click — requestWindow() (C-2, C-3)
    Float --> Anchor: return control, or user closes the float
    Float --> Anchor: evicted by another PiP (C-5) — named state + reopen (AC-34)
    Float --> [*]: anchor tab closed or navigated (C-6)
    note right of Anchor
        Full, normal tab-manager view.
        The side panel is NOT restored automatically.
    end note
```

### 1.3 Current state in the working tree, and the delta

An uncommitted partial implementation exists; it builds, lints clean, and works. Part of it is
**superseded by this spec** — the planner must expect code to *change*, not only to be added.

| File                                       | Current state                                                                                                                                                                                                  | Delta required                                                                                                                                                                                                       |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/lib/ControlBar/index.tsx`             | `handlePopOut` creates a `chrome.windows.create({ type: "popup", url: "index.html?host=window" })` window, then closes the panel. `handleCRXWindow` already implements find-or-create over an extension **tab**. | **Change.** The pop-out affordance must produce an **anchor tab**, reusing `handleCRXWindow`'s find-or-create semantics (focus an existing extension tab and its window; otherwise create one). Panel still closes itself. |
| `src/lib/float.ts`                         | Opens the float, then turns the opener into a **placard** (`showPlacard` / `hidePlacard`) that hides `#root` and shows "Bring it back here".                                                                     | **Change / remove.** There is no placard. The anchor tab keeps showing the full tab-manager view while the float is up (AC-9). The float-open / float-closed transitions become app state, not DOM surgery on `#root`.    |
| `src/lib/float.ts` — `canFloat()`          | True only when the host is the popup window.                                                                                                                                                                   | **Change.** True in the anchor tab.                                                                                                                                                                                  |
| `src/lib/host.ts`                          | `getHost(): "panel" \| "window" \| "float"` from a `?host=` query parameter.                                                                                                                                    | **Keep the mechanism.** The middle surface is now the anchor tab; whatever it is named in code, the three-host model and the panel fallback (AC-28) stand.                                                             |
| Synchronous `requestWindow()` in the click handler; extension-origin document boundary for the float's content | Correct and load-bearing (C-3, A-3).                                                                                                                                                                            | **Keep.**                                                                                                                                                                                                            |

---

## 2. Goals

- **G-1** Give the user a tab manager that is visible over other applications and costs zero
  browser width while it is up.
- **G-2** Keep exactly one copy of the tab manager visible at a time — the side panel gets out of
  the way when the user moves out to the anchor tab.
- **G-3** Preserve the extension's zero-host-permission, zero-content-script, nothing-persisted
  privacy posture, which is an explicit product promise in `PRIVACY.md` and `store-listing.md`.
- **G-4** Keep the side panel the default, fully-featured home. The anchor tab and float are
  opt-in and additive; a user who never discovers them loses nothing.
- **G-5** Degrade honestly: when the platform refuses (no PiP available, eviction, anchor gone),
  the user ends up in a working surface with an explanation, never in a dead or blank window.

## 3. Non-goals

Stated explicitly so the scope stays plannable:

- **NG-1** Floating arbitrary web pages (TabFloater-style). This feature floats _our own UI_ only.
- **NG-2** Any native companion application or native-messaging host.
- **NG-3** Any new host permission or content script. A content script on the active tab would be
  a viable one-click opener and is rejected on privacy-posture grounds (G-3) as well as on C-6: the
  float would die whenever that page navigates — fatal for an extension whose job is closing and
  switching tabs.
- **NG-4** Multiple simultaneous floats, or a float per browser window. Platform-forbidden (C-5).
- **NG-5** Programmatically positioning or repositioning the float, or forcing a size Chrome
  declines to honour. Platform-forbidden (C-7).
- **NG-6** A dedicated always-on-top extension **window** as the middle surface. `alwaysOnTop` is
  deliberately not settable from `windows.create` (anti-phishing), and the middle surface is a
  normal tab by decision — see §1.3.
- **NG-7** Replacing or removing the side panel as the primary surface.
- **NG-8** Syncing any of this across devices or browser profiles.
- **NG-9** Persisting the float's size or position across sessions. The float opens at a fixed
  default size every time; the manifest stays at exactly four permissions and `PRIVACY.md`'s
  "stores no data of its own" line stays true and unedited.
- **NG-10** A keyboard shortcut / `chrome.commands` entry point to the anchor tab or float.
  Considered and declined.
- **NG-11** Automatically restoring the side panel after the float closes. Not possible without a
  fresh user gesture (C-10, C-12), and not wanted: the anchor tab is the landing surface.
- **NG-12** A dismissible first-run hint, coach mark, or onboarding overlay. Considered and
  dropped: remembering a dismissal means persisting state, which would contradict NG-9 and make
  `PRIVACY.md`'s "stores no data of its own" line false. Discoverability is carried by the
  affordance's own copy instead (§5.8).

---

## 4. User stories

- **US-1** As someone working outside the browser, I want the tab list visible on top of my other
  applications, so that I can triage tabs without switching back to Chrome first.
- **US-2** As someone reading a page, I want the tab manager to stop consuming browser width, so
  that the page gets the whole window.
- **US-3** As a user who has moved the manager out of the panel, I want the side panel to
  disappear, so that I am not looking at two copies of the same list.
- **US-4** As a user finished with floating, I want to land on a full, working tab manager, so that
  I never have to hunt for it.
- **US-5** As a privacy-conscious user, I want this feature to request no new permissions and store
  nothing, so that the "runs entirely on your device, no host access" promise stays literally true.
- **US-6** As a keyboard user, I want to search and act on tabs inside the float without a mouse,
  so that the float is not a mouse-only downgrade of the panel.
- **US-7** As someone who also uses video Picture-in-Picture, I want to understand what happened
  when one window replaces the other and to get mine back in one click, so that the disappearance
  does not read as a crash.
- **US-8** As a first-time user, I want to find out that the floating mode exists, so that a
  feature two clicks deep is not effectively invisible.

---

## 5. Acceptance criteria

Each is one testable statement. IDs are stable — never renumber; append `AC-N+1` for new ones.
Priority uses MoSCoW.

### 5.1 Host model and entry

- **AC-1** _(Must)_ WHILE the app is running in the side panel, the system SHALL present exactly
  one pop-out affordance and SHALL NOT present a float affordance.
  **Verify:** unit — render the control bar with host `panel`; assert the control set.
- **AC-2** _(Must)_ WHEN the user activates the pop-out affordance from the side panel, the system
  SHALL open the extension's tab-manager page in a **normal browser tab** (the anchor tab), showing
  the same full tab-manager view as the side panel.
  **Verify:** manual — click; assert a normal tab in the tab strip, not a pop-up window, and that
  the view is the complete manager.
- **AC-3** _(Must)_ WHEN the anchor tab is opened from the side panel, the system SHALL close the
  side-panel document that opened it, leaving no second copy of the UI in that browser window.
  Per C-12 this is the moment the panel disappears — one step before the float exists.
  **Verify:** manual — after the click, the side panel is gone from the source window.
- **AC-4** _(Must)_ WHILE the app is running in the anchor tab AND the Document Picture-in-Picture
  API is present, the system SHALL present a float affordance.
  **Verify:** unit (anchor host plus API stub) and manual.
- **AC-5** _(Must)_ WHERE the Document Picture-in-Picture API is absent in the anchor tab, the
  system SHALL omit the float affordance rather than show a control that fails on activation.
  **Verify:** unit — anchor host, API absent; assert no float control is rendered.
- **AC-6** _(Must)_ WHEN the user activates the float affordance with a real (trusted) click, the
  system SHALL open the floating window on that single click, with no second click and no retry.
  **Verify:** manual — one click opens the float; this is the regression guard for C-3.
- **AC-7** _(Must)_ IF the float request fails for any reason (API rejects, user declines,
  activation lost), THEN the system SHALL leave the anchor tab showing the full tab manager AND
  SHALL surface a non-blocking, human-readable message naming the failure — not only a console
  error.
  **Verify:** unit on the failure path, plus manual with a forced rejection.
- **AC-8** _(Must)_ The float SHALL render the tab manager from a document served by this
  extension's own origin, and SHALL NOT load any non-extension URL.
  **Verify:** unit/manual — assert the float's content origin is `chrome-extension://<this id>`.

### 5.2 While the float is up, and getting back

- **AC-9** _(Must)_ WHILE the float is open, the anchor tab SHALL continue to present the full,
  normal tab-manager view — not a placard or a reduced holding screen — AND SHALL present a control
  that closes the float and returns the manager to the anchor tab.
  **Verify:** manual — open the float; assert the anchor tab still shows the complete manager plus
  the return control.
- **AC-10** _(Must)_ WHEN the user activates that return control, the system SHALL close the float,
  leaving the anchor tab showing the full tab-manager view.
  **Verify:** manual.
- **AC-11** _(Must)_ WHEN the float closes for any reason — user close, return control, or eviction
  by another Picture-in-Picture request — the anchor tab SHALL show the full tab manager without a
  page reload and without losing the user's current search text.
  **Verify:** manual — type a search, float, close the float, assert the query survives.
- **AC-12** _(Must)_ IF the anchor tab is closed or navigated away from while the float is open,
  THEN the float SHALL close (platform-enforced, C-6) and the system SHALL leave no orphaned window
  and no stale state in any surviving surface.
  **Verify:** manual — close the anchor tab, and separately navigate it to another URL.
- **AC-13** _(Must)_ WHEN the user activates the pop-out affordance from any surface, the system
  SHALL focus an existing anchor tab and its window if one is already open, and SHALL create one
  only if none exists — never producing a second anchor tab.
  **Verify:** manual — two invocations from different windows yield exactly one anchor tab.
- **AC-14** _(Must)_ The system SHALL NOT present a float affordance while the app is running
  inside the float itself.
  **Verify:** unit — render with host `float`.
- **AC-34** _(Must)_ WHEN the float is evicted by another Picture-in-Picture request (C-5), the
  anchor tab SHALL present a named state explaining that the floating window was closed, together
  with a control that reopens the float in one activation.
  **Verify:** manual — start a video PiP while the float is up; assert the named state and that the
  reopen control restores the float.
- **AC-35** _(Must)_ WHEN the user activates the float while another Picture-in-Picture window is
  already open, the system SHALL open the float without warning or confirming first.
  **Verify:** manual — with a video PiP running, click float; assert no dialog and no prompt.

### 5.3 Interaction with the existing per-window side-panel model

The codebase encodes a per-window host model — six `chrome.sidePanel.open({ windowId })` call sites
meaning "focus that window, and bring the panel along". The anchor tab and the float belong to no
particular browser window, so those flows change meaning.

- **AC-15** _(Must)_ WHILE the app is running in the anchor tab or in the float, WHEN the user
  activates a tab, activates a window, or runs a bulk action that targets a browser window, the
  system SHALL focus that window and SHALL NOT open the side panel in it.
  **Verify:** unit on the action helpers (host-aware branch), plus manual — click a tab from the
  float and assert no side panel appears.
- **AC-16** _(Must)_ The system SHALL present the anchor tab in the mirrored tab list as a
  distinct, visually marked row that cannot be closed from within the tab manager, so that the user
  can find and focus the tab that is holding the float but cannot destroy it by using the manager
  normally.
  **Verify:** unit on the window/tab structure and the row's controls, plus manual — open the
  float, locate the marked row, assert no close affordance.
- **AC-17** _(Must)_ WHILE the app is running in the anchor tab or the float, the current-tab panel
  SHALL show the active tab of the **last-focused normal browser window**, SHALL update as the user
  focuses a different browser window, and SHALL never show the extension's own anchor tab as the
  user's current tab.
  **Verify:** unit on the active-tab resolution, plus manual — switch between two browser windows
  with the float up and assert the current-tab row follows.
- **AC-18** _(Should)_ IF the browser window containing the anchor tab holds no other tabs, THEN
  the float SHALL continue to render and SHALL show an empty state, not an error and not a blank
  window.
  **Verify:** manual — close every other tab with the float up.
- **AC-19** _(Should)_ WHILE both the side panel and the float are open simultaneously (the user
  reopened the panel from the toolbar icon), both copies SHALL converge on the same browser state
  after any action taken in either, with no duplicated and no lost operation.
  **Verify:** manual — act in one surface, observe the other.

### 5.4 Responsiveness and resource use

- **AC-20** _(Must)_ WHILE the anchor tab is backgrounded (not the active tab, or in a window that
  is not focused and is fully occluded), the float SHALL reflect a tab open, close, move, or group
  change within 1 second of the corresponding browser event.
  **Verify:** manual — reproduce the 2026-09-22 probe method (360 ticks over 90.0 s, 0.0 s drift
  measured) with the anchor tab backgrounded; C-8 and A-7 are the basis for expecting this to hold.
- **AC-21** _(Should)_ WHILE the float is open and no tab, tab-group, or window event occurs, the
  system SHALL issue no repeated queries of browser tab state.
  **Verify:** manual with instrumentation — idle the float for 60 s; assert no periodic wake-ups.

### 5.5 Permissions, privacy, documentation

- **AC-22** _(Must)_ On completion of this feature the manifest's `permissions` array SHALL be
  exactly `["sidePanel", "tabs", "tabGroups", "sessions"]`, and the manifest SHALL declare no
  `host_permissions` and no `content_scripts`.
  **Verify:** unit — assert on `manifest.json`.
- **AC-23** _(Must)_ The feature SHALL write no data to `chrome.storage`, `localStorage`,
  `IndexedDB`, or cookies, and `PRIVACY.md` and `store-assets/privacy-policy.html` SHALL remain
  literally true and unedited — including the "Conscious Tabs stores no data of its own" statement.
  **Verify:** unit/manual — storage inspection after a full float session; assert both policy files
  are untouched in the diff.
- **AC-24** _(Must)_ IF any manifest permission is added to satisfy this feature, THEN the same
  change SHALL update all five of `manifest.json`, `PRIVACY.md`,
  `store-assets/privacy-policy.html`, `README.md` ("Requested permissions"), and `store-listing.md`
  ("Permission justifications"). Per AC-22 no permission is expected to be added; this is the guard
  if that changes.
  **Verify:** manual checklist, or a CI grep asserting the five files agree.
- **AC-25** _(Should)_ WHEN this feature ships, the user-facing documentation (`README.md` feature
  list and `store-listing.md` detailed description) SHALL describe both the anchor tab and the
  floating window, so that the listing does not undersell a shipped, visible capability.
  **Verify:** manual review.

### 5.6 Safety of a surface that floats over other applications

An always-on-top window rendering strings supplied by arbitrary web pages is a spoofing surface —
which is precisely why Chrome forbids `alwaysOnTop` on `windows.create`.

- **AC-26** _(Must)_ The system SHALL render tab titles and URLs as text only; no page-supplied
  string SHALL be interpreted as markup, and no control in the float SHALL navigate any surface to
  a page-supplied URL.
  **Verify:** unit — render a tab whose title contains markup and control characters.
- **AC-27** _(Must)_ The float's window SHALL be identified with this extension's name, not with
  any page-supplied title. C-11 gives this for free from an extension-origin opener; it must not be
  regressed.
  **Verify:** manual — inspect the float's title bar.
- **AC-28** _(Must)_ WHERE an unrecognised host value is supplied to the app document, the system
  SHALL fall back to the side-panel host behaviour rather than enabling any other surface's
  affordances.
  **Verify:** unit — load with `?host=<garbage>`; assert panel behaviour.

### 5.7 Layout, theme, accessibility at float width

- **AC-29** _(Must)_ WHILE the float is at its opened size (nominally 400 x 640 CSS px, possibly
  clamped smaller by Chrome per C-7), the tab manager SHALL lay out without horizontal scrolling,
  and search, switching to a tab, and closing a tab SHALL be fully usable.
  **Verify:** manual at 400 px and at Chrome's minimum clamp.
- **AC-36** _(Must)_ WHILE the float is at its opened size, multi-select and its bulk actions —
  close selection, group selection, move selection to a new window — SHALL be fully usable.
  **Verify:** manual at 400 px — select several tabs and run each bulk action from the float.
- **AC-37** _(Must)_ WHERE drag-and-drop reordering (within a window or across windows) is not
  offered at float width, the system SHALL omit the drag affordances entirely rather than present
  drag handles that do nothing, and SHALL keep the equivalent outcome reachable from the anchor tab
  or the side panel.
  **Verify:** manual at 400 px — attempt a drag; assert either it works or no drag affordance is
  presented and nothing is left half-applied.
- **AC-38** _(Should)_ WHERE the group-creation form with its colour picker is not offered at float
  width, the float SHALL still allow grouping a selection, and SHALL indicate at the point of need
  that naming and recolouring the group is done from the anchor tab or the side panel.
  **Verify:** manual at 400 px — group a selection from the float and follow the indicated route.
- **AC-30** _(Must)_ WHEN the float opens, keyboard focus SHALL land inside the float's document,
  and Tab / Shift-Tab SHALL cycle only through the float's own controls.
  **Verify:** manual keyboard walkthrough.
- **AC-31** _(Must)_ WHILE the float has focus, the user SHALL be able to type into the search
  field and filter the tab list using the keyboard alone.
  **Verify:** manual keyboard walkthrough (see A-8 — confirm early, it gates the value of the
  float).
- **AC-32** _(Should)_ The float SHALL follow the system light / dark theme, matching the side
  panel, with no unstyled flash on open.
  **Verify:** manual in both themes.
- **AC-33** _(Should)_ Every control unique to this feature SHALL have an accessible name that
  states its effect, and any control whose activation destroys the float SHALL say so in that name
  or its tooltip.
  **Verify:** unit (accessible-name queries) plus a manual screen-reader pass.

### 5.8 Discoverability

Discovery is carried by the **copy on the affordance itself**, not by onboarding state (NG-12).
The affordance must advertise the *payoff*, not the mechanism: today's working-tree copy
("Open in a separate window") never mentions floating, and the word only appears on the
second-step control — which the user cannot see until after step one. That leaves the feature
effectively invisible.

- **AC-39** _(Must)_ WHILE the app is running in the side panel, the pop-out affordance SHALL
  convey — without the user activating any control — that the tab manager can be floated on top of
  other applications.
  **Verify:** unit on the affordance's user-visible and accessible text (assert it names the
  floating payoff, not only "separate window"), plus manual — a first-time user reading the panel
  can state what the control leads to.
- **AC-40** _(Must)_ The information required by AC-39 SHALL be reachable without hovering — it
  SHALL be present in the control's accessible name, or in a visible label, so that keyboard,
  screen-reader, and touch users receive it too.
  **Verify:** unit (accessible-name query) plus a manual keyboard and screen-reader pass with no
  pointer hover.

**Accepted trade-off.** A tooltip is confirmatory, not discovery: it rewards a user who is already
pointing at the control, and it never reaches keyboard or touch users at all. The user chose this
over a persisted first-run hint, accepting weaker discovery in exchange for storing nothing
(NG-9, NG-12). AC-40 is what keeps the trade-off from excluding anyone outright, and it matters
more than usual because this is now the *only* discovery mechanism in the product.

**Adopted option, left to the plan.** The side-panel affordance MAY be a visible labelled button
rather than an icon-only control. The bottom bar already renders "New tab" and "New window" as
labelled buttons, so a third label reads naturally, and the float does not render this control at
all — so the ~400 px width constraint of §5.7 does not apply to it. A visible label outperforms a
tooltip for discovery at no cost. This is an option, not a mandate: the requirement is AC-39 plus
AC-40, that discovery does not depend solely on hover.

---

## 6. Edge cases

- **E-1** The user opens video Picture-in-Picture while our float is up → our float is evicted
  (C-5) → AC-34 (named state plus one-click reopen).
- **E-2** The user activates our float while a video PiP is up → the video PiP is evicted, silently
  and without a prompt → AC-35.
- **E-3** The user closes the anchor tab, or the browser window containing it, while the float is
  up → the float dies (C-6, AC-12).
- **E-4** The user tries to close the anchor tab _from inside the float_ by treating it as an
  ordinary row in the list → prevented by AC-16. Note that `chrome.tabs.query({})` is called
  unfiltered today, so the anchor tab appears in the mirrored list by default: this self-destruct
  path exists unless it is handled, and the tab framing does not dissolve it.
- **E-5** The user reopens the side panel from the toolbar icon while the float is up → two live
  copies of the UI (AC-19). The side panel is not restored automatically (NG-11); this is the
  user's own deliberate action.
- **E-6** Chrome clamps the requested float size smaller than asked (C-7) → AC-29, AC-36, AC-37.
- **E-7** The float is dragged to a smaller monitor, or the display configuration changes → the
  layout must still satisfy AC-29 and AC-36; we cannot reposition the float (NG-5).
- **E-8** The extension is updated or reloaded while the float is open → the anchor tab's document
  is invalidated. Expected: the float closes and nothing is orphaned (AC-12 family).
- **E-9** The user closes every other tab in the anchor tab's window → AC-18. If the anchor tab's
  own window is closed, the anchor goes with it → E-3.
- **E-10** A tab whose title is empty, extremely long, right-to-left, or full of control characters
  renders inside a narrow float → AC-26 plus AC-29.
- **E-11** A drag started in the float is released outside it → the list must not be left in a
  half-applied state → AC-37.
- **E-12** Rapid double activation of the float affordance → exactly one float, and the second
  activation must not surface a visible error.
- **E-13** A second Chrome profile is running with its own PiP window → C-5's "one per browser"
  scope is outside our control; the float must degrade per AC-7 if the request is refused.
- **E-14** The user navigates the anchor tab by typing a URL into it, or follows a link from it →
  the float dies (C-6). This became a realistic, everyday action the moment the anchor became a
  normal tab rather than a dedicated window; AC-12 and AC-33 are what make it non-mysterious.
- **E-15** The user drags the anchor tab into another browser window, or detaches it into a new
  one → whatever preserves the document preserves the float; whatever destroys the document
  destroys it (C-6, AC-12). The float must not be left visible with a dead opener.
- **E-16** The user activates the pop-out affordance from a window that is not the one holding the
  anchor tab → AC-13 focuses the existing anchor tab and its window rather than creating a second.

---

## 7. Assumptions and dependencies

- **A-1** The constraints in §1.2 were verified on the user's current Chrome on 2026-09-22 and are
  treated as established fact. If Chrome ships a fix for WICG/document-picture-in-picture#88 (C-1),
  the two-step hand-off becomes optional and this spec should be revisited — it does not become
  wrong, only heavier than necessary.
- **A-2** `chrome.windows.*`, `chrome.tabs.create` and `chrome.runtime.*` require no manifest
  permission entry beyond the four already declared, so the anchor tab and the float cost nothing
  in the permission array.
- **A-3** The app is rendered into the float across a document boundary rather than by re-parenting
  React DOM. This is an assumption about feasibility, not a design instruction: Emotion injects its
  styles into the opener's `<head>`, and every MUI Menu / Dialog / Tooltip plus notistack's
  snackbars portal into the opener's `<body>`, so any re-parenting approach has to solve those
  separately. The plan may choose differently if it does.
- **A-4** The anchor tab is an ordinary tab in an ordinary window and enjoys no special lifetime
  protection. Every guarantee in this spec about the float surviving is conditional on the user
  leaving that tab alone; AC-16, AC-33 and E-14 exist to make that condition visible rather than
  to remove it.
- **A-5** The extension has no i18n framework and ships English strings only; this feature adds no
  new localisation requirement.
- **A-6** There is no automated test suite in this repository today (`package.json` defines only
  `dev`, `build`, `lint`, `preview`, `prettier`). Criteria marked `Verify: unit` therefore imply
  either introducing a test runner or, as a fallback, a documented manual check — that choice
  belongs to the plan, not to this spec.
- **A-7** C-8's throttling exemption (360 ticks / 90.0 s / 0.0 s drift) was measured with a
  **popup-window** opener. The exemption is understood to attach to the document that holds the
  float, so it is assumed to hold equally for a backgrounded **anchor tab**. This is the one
  measurement the surface change invalidates, and AC-20 is the requirement it underwrites —
  **verify it first**, before building on the assumption. A re-run of the probe against a tab
  opener is in flight; until a result comes back this stays an assumption, not a constraint.
- **A-8** Keyboard focus and text entry reach a text field inside the float. Chrome's own Document
  Picture-in-Picture documentation names text editing and note-taking among the API's target
  productivity use cases, so this is treated as given rather than as an open question. Confirm it
  at implementation time (AC-31); if it does not hold, the float's value proposition changes
  materially and this spec needs revisiting.

---

## 8. Non-functional requirements

- **NFR-1 Responsiveness.** Freshness of the float's list while the anchor tab is backgrounded is
  the single failure that would make the feature feel broken. Budget: AC-20 (1 s). C-8 plus A-7 are
  the basis for expecting this without a keep-alive hack.
- **NFR-2 Privacy posture.** Permission-neutral and storage-free (AC-22, AC-23, NG-9). The
  zero-host-permission promise appears verbatim in `PRIVACY.md` and `store-listing.md`; breaking it
  is a product-level cost, not a technical detail, and triggers the five-file mirror (AC-24).
- **NFR-3 Accessibility.** AC-30 to AC-33, plus AC-40. A ~400 px always-on-top window is exactly
  where keyboard-only operation matters most, because the user is working in another application
  and reaching for the mouse is the whole cost the float exists to remove. AC-40 additionally
  guards the entry point: with discovery carried entirely by affordance copy (§5.8), a
  hover-only tooltip would put the whole feature out of reach of keyboard and touch users.
- **NFR-4 Security.** AC-26, AC-27. Every tab title and URL is untrusted page-supplied data:
  rendered as text, never as markup, and never as a navigation target chosen by the page.
- **NFR-5 Resource use.** AC-21 — an always-open floating window must not become a background
  battery drain.
- **NFR-6 Observability.** Failure paths (AC-7, AC-34, E-1) must be visible to the _user_, not only
  in the console. The extension already has a snackbar channel used for action failures.
- **NFR-7 Tenancy / multi-profile.** Not applicable beyond E-13: single user, per profile, no
  accounts, no server.

---

## 9. Cross-module impact

| Area                                                                                                                                                                                                                                            | Impact                                                                                                                                                                                                                                                             |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/host.ts`                                                                                                                                                                                                                                 | Source of truth for which surface a document is; every host-conditional behaviour keys off it (AC-1, AC-4, AC-14, AC-28).                                                                                                                                             |
| `src/lib/float.ts`                                                                                                                                                                                                                                | Owns float lifecycle (AC-6 to AC-12, AC-34, AC-35). **The placard path is superseded** — see §1.3.                                                                                                                                                                     |
| `src/lib/ControlBar/index.tsx`                                                                                                                                                                                                                    | Hosts both affordances and the anchor-tab hand-off (AC-1 to AC-3, AC-13, AC-39). `handlePopOut` must change from popup-window to find-or-create tab; `handleCRXWindow` already has the semantics to reuse. Its "New window" flow also calls `chrome.sidePanel.open` (AC-15). |
| Six `chrome.sidePanel.open({ windowId })` call sites — `src/lib/Tabs/actions.ts` (x2), `src/lib/Tabs/Tab/TabDisplay.tsx`, `src/lib/Tabs/selection/SelectionToolbar.tsx`, `src/lib/Tabs/Window/WindowListItem.tsx`, `src/lib/ControlBar/index.tsx` | These encode "focus that window and bring the panel along". From the float or the anchor tab that would reopen the very panel the user just dismissed. Each needs a host-aware branch (AC-15). This is the real cost of a second surface — not the rendering.            |
| `src/lib/Tabs/useActiveTab.ts`                                                                                                                                                                                                                    | Resolves the host window via `chrome.windows.getCurrent()`, which returns the extension's own tab/window in the anchor and float cases. Must instead follow the last-focused normal browser window (AC-17).                                                             |
| `src/lib/Tabs/useWindowsStructure.ts`, `src/lib/Tabs/useTabsStructure.ts`                                                                                                                                                                         | `chrome.tabs.query({})` is unfiltered, so the anchor tab appears in the mirrored list as an ordinary closable row. Must become a marked, non-closable row (AC-16, E-4).                                                                                                 |
| `src/lib/Theme/index.tsx`                                                                                                                                                                                                                         | The float is a separate document; theme and style delivery must reach it (AC-32).                                                                                                                                                                                      |
| `src/lib/Tabs/undo/`, notistack                                                                                                                                                                                                                   | Snackbars (undo, action failures per AC-7) must appear in the surface the user is looking at, never in a hidden opener.                                                                                                                                                |
| `src/lib/Tabs/DnD/`                                                                                                                                                                                                                               | Drag affordances must be present-and-working or absent at float width, never present-and-dead (AC-37).                                                                                                                                                                 |
| `src/lib/Tabs/selection/`                                                                                                                                                                                                                         | Multi-select and bulk actions are must-keep at float width (AC-36); the group-creation form may step up to a wider surface (AC-38).                                                                                                                                    |
| `README.md`, `store-listing.md`                                                                                                                                                                                                                   | AC-25. `manifest.json`, `PRIVACY.md`, `store-assets/privacy-policy.html` stay unchanged (AC-22, AC-23); AC-24 is the guard if that ever stops being true.                                                                                                              |

---

## 10. Inputs

- User feature request, verbatim, 2026-09-22 (quoted in §1), plus the user's correction of the
  middle surface: _"it's not popup window, it's tab in browser that opens PIP - probably present
  tab view"_.
- Clarification answers, 2026-09-22, resolving NC-1 through NC-8 (§13).
- Uncommitted working-tree implementation: `src/lib/host.ts`, `src/lib/float.ts`,
  `src/lib/ControlBar/index.tsx` (§1.3, with the delta each requires).
- Empirical probe findings, 2026-09-22 — a throwaway unpacked extension on the user's current
  Chrome, three surfaces tested (side panel / tab / `type: "popup"` window), plus a
  90.0 s / 360-tick throttling measurement. Source of C-1 to C-8 and C-11.
- `LEARNINGS.md` (present on branches `publish-prep` and `claude/sad-diffie-5a3599`) — the five-file
  permission mirror, the six per-window `sidePanel.open` call sites, the Emotion / MUI / notistack
  cross-document portal hazard, and the favicon network-request decision.
- `manifest.json`, `PRIVACY.md`, `store-listing.md`, `README.md` — the zero-host-permission,
  stores-nothing product promise.
- Chrome Document Picture-in-Picture documentation — target use cases including text editing and
  note-taking (basis for A-8).
- WICG/document-picture-in-picture#88 (open, `chrome-bug`); w3c/webextensions#521 (open).

## 11. Untrusted inputs

- **Tab titles, URLs, and favicon URLs** are supplied by arbitrary web pages. Treated as data,
  never as instructions or markup (AC-26). Note that the existing favicon behaviour — an `<img src>`
  pointed at the site's own `favIconUrl` — already issues network requests to mirrored origins;
  this feature does not change that, but the float surfaces it in a new place. The planned switch
  to Chrome's local favicon database is out of scope here.
- **The `host` query parameter** on the app document: an allow-list of known surfaces with a panel
  fallback (AC-28).
- **Nothing else.** No network input, no user-authored content, no third-party messages.

---

## 12. Proposed improvements

Dispositions recorded for traceability.

- **PI-1** Compact float layout — **adopted into requirements** as AC-29, AC-36, AC-37, AC-38.
- **PI-2** `disallowReturnToOpener: true` — **rejected.** With a tab anchor that presents the full
  view, Chrome's built-in "back to tab" button leads somewhere genuinely useful and should stay.
- **PI-3** A useful placard in the opener — **moot.** There is no placard; the anchor tab shows the
  full view (AC-9).
- **PI-4** Named eviction state with one-click reopen — **promoted to requirement** as AC-34.
- **PI-5** A `chrome.commands` keyboard shortcut — **declined by the user.** Recorded as NG-10.
- **PI-6** Show the anchor as a distinct, non-closable row — **promoted to requirement** as AC-16.
- **PI-8** Make the side-panel pop-out affordance a visible labelled button rather than icon-only —
  **adopted as an option**, the choice left to the plan (§5.8). The bottom bar already labels
  "New tab" and "New window"; a third label reads naturally and beats a tooltip for discovery at
  no cost. The binding requirements are AC-39 and AC-40.
- **PI-7** Consolidate C-1 to C-12 into `LEARNINGS.md` as one entry — **still proposed.** Partly
  done already; finishing it would stop the next person re-deriving them with another probe
  extension.

---

## 13. Resolved decisions

No open clarifications remain. Kept for traceability — each decision and where it landed.

| Decision | Resolution | Lands in |
| --- | --- | --- |
| Landing surface after the float closes | The anchor tab, showing the normal full tab view. No placard. The side panel is not restored automatically. | AC-9, AC-11, NG-11, C-12 |
| What the middle surface is | A **normal browser tab** running the extension page, showing the full view — a legitimate surface in its own right, not a stepping stone. Find-or-create, never a second one. **Superseded the working tree's popup-window approach.** | §1.1, §1.3, AC-2, AC-13 |
| Picture-in-Picture eviction | Offer to reopen: a named "float was closed" state with one-click reopen. Taking the slot from an existing video PiP is silent — no warning. | AC-34, AC-35 |
| Persisting float size / position | No persistence. Manifest stays at exactly four permissions; both privacy-policy copies stay true and unedited. | AC-22, AC-23, NG-9 |
| Feature parity at ~400 px | Must keep: search, switch, close, multi-select and bulk actions. May degrade: drag-and-drop (within and across windows) and the group-creation form — both step up to the anchor tab or side panel, as specified behaviour rather than accident. | AC-29, AC-36, AC-37, AC-38 |
| Discoverability | Carried by copy on the affordance itself, advertising the floating payoff. **Superseded the earlier first-run-hint answer**, which would have required persisting a dismissal flag. Trade-off and the non-hover requirement recorded explicitly. | §5.8, AC-39, AC-40, NG-12, PI-8 |
| "The current tab" outside the side panel | The active tab of the last-focused **normal** browser window, ignoring the extension's own anchor tab. | AC-17 |
| Keyboard focus / typing inside the float | Not a user decision. Resolved as a grounded assumption from Chrome's own Document PiP use cases, with an implementation-time verification step. | A-8, AC-31 |

**Still pending verification (not a blocker):** **A-7** — C-8's throttling measurement was taken
with a popup-window opener, and the surface change to a tab has not been re-measured. A probe is
in flight. AC-20 is the requirement that rests on it; verify before building on it. If the
exemption does not extend to a backgrounded tab, this spec needs revisiting.
