# PLAN SPEC-01 — Floating tab manager window

|                     |                                                                             |
| ------------------- | --------------------------------------------------------------------------- |
| **Plan for**        | [SPEC-01](../specs/ui-shell/SPEC-01-2026-09-22-floating-tab-manager-window.md) (Status: approved · revised 2026-09-22, 42 ACs, zero open NC) |
| **Date**            | 2026-09-22                                                                    |
| **Module**          | `ui-shell`                                                                    |
| **Status**          | approved (2026-09-22)                                                         |
| **Execution mode**  | Single-agent, sequential (user decision, 2026-09-22)                          |
| **Test strategy**   | Introduce Vitest and cover every AC reachable without a real browser (user decision, 2026-09-22) |
| **Branch**          | `floating-tab-manager`                                                        |

---

## 0. Progress

| Unit | State | Note |
| --- | --- | --- |
| T-0 | **done — gate passed** | A-8 **confirmed**: search works inside the float. The spec's last unverified assumption, and the one that could have sunk the feature. Recorded in `LEARNINGS.md`. |
| T-1 | **done** | Vitest + jsdom + Testing Library, `chrome.*` stub. 18 tests. |
| T-2 | **done** | `host.ts` → `"panel" \| "anchor" \| "float"`, AC-28 covered. |
| T-3 | **done** | `anchor.ts` + `ControlBar`; D-5a and D-5b both covered by tests. |
| T-4 | **done** | Float state machine (`useSyncExternalStore`, not a context — `ControlBar` and the notice are the only consumers). Placard gone, E-12 guard, D-2a focus heuristic, AC-7 snackbar. |
| T-5 | partial | Matrix and copy built, including "Stop floating". **`ControlBar` render tests still to write.** |
| T-5a | **done** | "Back to panel" — new scope, see D-7. |
| T-6 | **done** | `FloatClosedNotice`, mounted in the sticky AppBar so it cannot be scrolled away. 13 tests over the state machine. |
| T-7 | **done** | `surfaces.ts` / `bringPanelAlong`, all six call sites. Fixed the live "tab can't be activated from the float" bug. |
| T-8 | **done — by filtering, not marking** | Both the PiP window and this extension's own pages are dropped from the mirrored list. **Contradicts AC-16**; user decision, see below. |
| T-9 | **done** | `resolveUserWindow()` + `useUserWindow()`. Fixed **three** call sites, not one: `useActiveTab`, `useAudioTabs` (same defect, not in the spec's table) and the export T-9a needs. |
| T-9a | **done** | `restore` extracted to `undo/restore.ts` and routed through `resolveUserWindow()`. |
| T-9b | **done** | `shouldPrompt()`: the anchor defers to its own float (exact), everything else gates on visibility (heuristic). A duplicate UNDO now reports instead of rejecting unhandled. |
| T-10 | **done** | `onDragCancel` (E-11) + AC-18 empty state. AC-29 / 36 / 38 **measured** at 400x640 in a layout harness — all pass. AC-37, clamping and AC-30/31 still need Chrome. |
| T-11 | **done, bar one manual check** | Brand canvas painted from the first frame in both schemes — measured exact in the harness. AC-27 (float window title) still wants eyes on a real float. |
| T-12 | **confirmed, no code needed** | Each surface has its own React root and therefore its own notistack provider, in its own JS realm — so an imperative `enqueueSnackbar` can only reach the surface it was called from. Correct by construction. |
| T-13 | **done** | `manifest.test.ts` guards AC-22 and the AC-23 posture; README and store-listing now describe both new surfaces. Neither policy file appears in the branch diff. |
| T-14 | **not started — needs a real float** | Freshness with the anchor backgrounded. |
| T-15 | **not started — needs a real float** | Keyboard walkthrough and screen-reader pass. |
| T-16 | **partly done** | AC-26 markup-safety tests written; PI-7 discharged by pointing `LEARNINGS.md` at SPEC-01 §1.2 rather than duplicating it. The E-1…E-16 sweep needs a real float. |

**A Document Picture-in-Picture window IS a window to `chrome.windows.getAll()`** — observed in
the running build, 2026-09-22, contradicting an assertion I had made confidently in the opposite
direction. It appears as a window holding a single `about:blank` tab, reports itself as
**focused** (so `WindowListItem` auto-expanded it), is what `useActiveTab` resolved to (the
float's current-tab card read `about:blank`), and carried a close control that would have
destroyed the float.

**The first fix for this was wrong, and shipped for two commits.** I filtered on
`windowType: "normal"`, reasoning that a floating widget would not be a normal window. Measured
against a live float, it is:

| | Real window | The float |
| --- | --- | --- |
| `type` | `normal` | `normal` |
| `alwaysOnTop` | `false` | **`true`** |
| size · tabs | 1622x1006 · 17 | 414x681 · 1 (`about:blank`) |

`alwaysOnTop` is **exact rather than heuristic**: `chrome.windows.create()` is forbidden from
setting it for anti-phishing reasons — NG-6, the very restriction that forces this feature's
two-step shape — so no window a user or extension opens can have it, and a float has it by
definition. The constraint that made the feature hard is what identifies it cleanly.

**No clamping either.** `requestWindow({width: 400, height: 640})` produced a 401x641 content
area, so the T-10 measurements taken at 400x640 stand as measured.

### Spec amendments — **applied 2026-09-22**

Seven items had accumulated where this plan had outrun SPEC-01. They are now folded into the spec
itself; see its §14 revision log. In summary: C-9 weakened, C-13/C-14/C-15 added, C-7 narrowed,
C-12's reasoning completed, AC-16 superseded by filtering, AC-39/AC-40 revised,
NG-11 re-reasoned as impossible rather than unwanted, AC-41 and AC-42 added, §9 extended by three
files, and A-7/A-8 both closed.

**The menu is gone (user feedback, 2026-09-22).** It was introduced to solve two problems and
solved only one of them worth solving. First it went on every host, which was plainly wrong for
the anchor tab — a whole browser window, two plainly-named actions, nothing gained by hiding
them. Then, kept only in the panel, it still cost a **third click on a two-click floor**: C-1 and
C-3 mean the panel can never reach a float directly, so two is the least this feature can ever
cost and a third is the worst thing to spend. Width had already stopped being the constraint once
New tab and New window became icons. See D-8.

**Bar layout, resolved from a real screenshot (R-5 landed).** Three labelled buttons plus the logo
wrapped onto two lines each in the side panel. Applied the fallback T-5 already named: **New tab**
and **New window** drop to icon buttons with tooltips and `aria-label`s. The surface control
itself then took three passes — labelled button, menu everywhere, menu in the panel only — before
landing back on a labelled button with honest copy. Settled state:

| Host | Logo | Surface controls |
| --- | --- | --- |
| Side panel | decorative | **Open full view** — names the destination, not a capability it lacks |
| Anchor tab | decorative | **Float on top** / **Stop floating**, **Back to panel** as buttons |
| Float | decorative | **Open full view** — same words, same destination; leaves the float up (AC-43) |

**Sequencing deviation, deliberate:** T-2 and T-3 were built **before** T-0 rather than after. The
plan assumed T-0 could be run against the spike, but the spike only reaches the float through a
`type: "popup"` window — a surface this spec supersedes — and the extension page in a plain tab
offered no float control at all, because it loads with no `?host=` and therefore reports `panel`.
Testing the gate on the real surface required T-2 and T-3 first. This also retires **R-8**: T-0 is
now a direct measurement rather than a proxy.

The placard deletion was pulled forward from T-4 for the same reason — left in, it would have
blanked the anchor tab behind the float and made the T-0 observation misleading about AC-9.

---

## 1. Summary

SPEC-01 adds two opt-in surfaces to an extension that today renders only in the Chrome side
panel: an **anchor tab** (the extension page in a normal browser tab, showing the full manager)
and a **float** (a Document Picture-in-Picture window opened from the anchor tab, always on top,
~400 px).

The plan's centre of gravity is **not** rendering. The float already renders — the spike proves
it. The real work is that a second and third surface invalidate assumptions baked into the
existing code in five places:

1. Six `chrome.sidePanel.open({ windowId })` call sites encode "focus that window, and bring the
   panel along" — meaningless from a surface that belongs to no window (AC-15).
2. `chrome.tabs.query({})` is unfiltered, so **the anchor tab appears in its own mirrored list as
   an ordinary closable row** — a self-destruct path (AC-16, E-4).
3. `useActiveTab` resolves its host window with `chrome.windows.getCurrent()`, which returns the
   extension's own window outside the panel (AC-17).
4. `SyncPrompt.restore()` makes the *same* mistake with `chrome.windows.getLastFocused()`, so
   pressing UNDO from the float can teleport the user onto the extension's own tab — and it
   subscribes per-document, so one closed tab raises an undo prompt in every open surface (T-9a,
   T-9b). Neither is in the spec's cross-module table; both were found by falsifying this plan.
5. The spike turns the opener into an imperative DOM "placard". SPEC-01 deletes that whole idea:
   the anchor tab keeps the full view, and float open/closed becomes React state (AC-9, §1.3).

Framing correction carried into T-10: the spec calls §5.7 a *width* problem, but the side panel
already ships at roughly 400 px wide. The genuinely new constraint is the float's **640 px of
height**, against ~162 px of fixed chrome.

## 2. Starting point: what the spike leaves us

Commit `fe82082` is on this branch and builds. SPEC-01 §1.3 supersedes part of it.

| Spike artefact | Disposition |
| --- | --- |
| `src/lib/host.ts` — `?host=` allow-list with panel fallback | **Keep the mechanism.** Rename the middle host `"window"` to `"anchor"` (T-2). |
| `src/lib/float.ts` — synchronous `requestWindow()` in the click handler | **Keep — load-bearing.** C-3: any `await` first burns the activation token. |
| `src/lib/float.ts` — extension-origin iframe fill (`fillFloat`) | **Keep.** A-3 / LEARNINGS: re-parenting breaks Emotion's `<style>` injection, 24 MUI portals and notistack at once. |
| `src/lib/float.ts` — `showPlacard` / `hidePlacard`, `#root` hiding | **Delete.** There is no placard (AC-9). |
| `float.ts` — `canFloat()` gated on the popup window | **Change.** True in the anchor tab. |
| `ControlBar` — `handlePopOut` calling `windows.create({type:"popup"})` | **Rewrite.** Find-or-create an anchor **tab** (AC-2, AC-13). |
| `ControlBar` — `handleCRXWindow` find-or-create over an extension tab | **Reuse as the basis** for the above; it already has the right semantics. |
| `ControlBar` — icon-only pop-out, tooltip "Open in a separate window" | **Rewrite.** Never names the floating payoff; a tooltip does not reach keyboard or touch (AC-39, AC-40). |

Dropping the `?host=window` value is safe: the popup surface was never shipped and exists only on
this unmerged branch.

## 3. Design decisions this plan makes

The spec deliberately left these to the plan. Each is a decision, not a discovery.

- **D-1 — Side-panel affordance is a visible labelled button.** `<Button startIcon={<PictureInPictureAlt/>}>Float on top</Button>`,
  alongside the existing labelled "New tab" / "New window". Adopts PI-8. AC-40 would technically
  accept an icon with a strong `aria-label`, but AC-39 requires a *sighted, non-hovering* user to
  learn the payoff, and an icon cannot do that. The float never renders this control, so §5.7's
  400 px budget does not constrain it — but the 320 px side panel does, which is why T-5 carries an
  explicit narrow-width check.
- **D-2 — "Evicted" is not distinguishable from "user closed the float", so we do not pretend to
  distinguish them.** Chrome fires `pagehide` on the float for eviction, for the float's own close
  button, and for our return control alike, and exposes no reason. The plan therefore tracks only
  *who initiated*: a close we called ourselves goes back to the anchor silently; a close we did not
  initiate raises the AC-34 named state. That is a superset of eviction, satisfies AC-34's wording
  ("explaining that the floating window was closed" — it does not claim to know why), and never
  mislabels a user's own close as an eviction.
- **D-2a — …but "we did not initiate it" is too broad on its own, so gate the notice on focus.**
  PI-2 deliberately keeps Chrome's built-in **"Back to tab"** button on the float. That button is a
  close we did not initiate, so naive D-2 would greet the blessed return path with "The floating
  window closed" — nagging the user about a thing they just chose. Discriminator: Chrome's
  back-to-tab **focuses the opener**; an eviction raised from another tab does not. So on an
  uninitiated `pagehide`, defer a tick and raise the notice only when `document.hasFocus()` is
  false. The heuristic's one blind spot is benign and self-correcting: an eviction that happens
  while the user is already looking at the anchor tab stays silent, which is fine, because they
  watched it disappear. This also lines up exactly with D-3's rationale — the persistent notice
  exists for the user who was somewhere else.
- **D-3 — The AC-34 named state is a persistent inline `Alert`, not a snackbar.** Eviction happens
  while the user is in another application by definition — that is the float's whole purpose — so a
  3-second notistack toast in a backgrounded tab is guaranteed to be missed. An `Alert` strip in the
  anchor tab, with a "Float again" action, is still there when they come back.
- **D-4 — Keep drag-and-drop at float width rather than removing it.** AC-37 accepts either, and
  the drag affordances already work at side-panel width. Removing them is strictly more work than
  keeping them. The cost this imports is E-11 (a drag released outside the float window), handled
  explicitly in T-10 via `onDragCancel`.
- **D-5 — One `openAnchorTab()` helper serves every entry point.** The logo button
  (`handleCRXWindow`) currently opens `index.html` with no query string, so a tab opened that way
  reports host `panel` and offers no float control. Both entry points converge on `?host=anchor`;
  this is what makes AC-13's "never a second anchor tab" hold regardless of route.
- **D-5a — `getHost() === "panel"` does NOT mean "I am the side panel", and AC-3 must not assume it
  does.** An extension tab opened by today's shipped logo button has no query string, so it reports
  host `panel` **while being an ordinary browser tab**. Under a naive reading of AC-3, clicking
  "Float on top" there would run `window.close()` and close a real tab out from under the user.
  Discriminator: `chrome.tabs.getCurrent()` resolves to a tab in a tab and to `undefined` in the
  side panel. It is async, but it runs *after* the hand-off, so C-3 does not apply. Such a tab
  should also upgrade itself to `?host=anchor` via `history.replaceState` — which changes the URL
  without a navigation, so it cannot trip C-6 — rather than sit in the wrong host forever.
  **The condition is a conjunction, not the `getCurrent()` check alone:** that call also returns
  `undefined` inside the float's iframe, in an offscreen document and in the service worker, so the
  guard is `getHost() === "panel" && (await chrome.tabs.getCurrent()) === undefined`. Written as the
  `undefined` check by itself, the logo button inside the float would close the float.
- **D-5b — Find-or-create must tolerate the duplicates that already exist.** Today's
  `handleCRXWindow` takes `crxTabs[0]` from an unordered query. A user can already have two
  extension tabs open, and after this feature both would offer a float control — the second float
  evicting the first through C-5's one-PiP-per-browser limit. `openAnchorTab()` therefore prefers
  an existing tab that is *already* `?host=anchor` over a bare one, and the extra tabs are left
  alone rather than closed: closing a user's tabs uninvited is worse than the duplication. AC-13
  binds what *we* create, which this satisfies.
- **D-8 — one labelled button, not a menu. Superseded its own first version.**
  *(User decision, 2026-09-22, revised the same day.)* First attempt: a labelled "Float on top"
  button, rejected because it promises something the click does not do — floating cannot start in
  the panel (C-1). Second: every surface action behind a menu on the logo, which fixed the honesty
  and the width but **cost a third click on a two-click floor**. C-1 plus C-3 make two clicks the
  minimum this feature can ever cost, so a third is the most expensive thing to spend.
  Settled: a single **"Float on top…"** button. The ellipsis is the long-standing convention for
  "this opens something rather than doing it", so the label stops over-promising without going
  quiet; the accessible name leads with the visible text (so voice control matches) and then names
  the second step. Width was never really the constraint once New tab and New window became icons
  — measured at 320px the button is 114px and the bar stays one row.
- **D-7 — a manual "Back to panel", because the spec left the return trip with no door.**
  *(User decision, 2026-09-22, in response to "closing PiP or navigating away should open side
  panel, or not?")* The answer to the literal question is **no**, twice over: reopening the panel
  when the float closes would leave two live copies of the manager, since the anchor tab is already
  showing the full view; and on the eviction path there is no user gesture to spend, so
  `chrome.sidePanel.open()` would simply throw (C-10). Navigating away cannot do it at all — the
  document is being destroyed. But the question exposed a real gap: from the anchor tab there was
  **no route back** except knowing the toolbar icon opens the panel. NG-11 forbids *automatic*
  restoration, so an explicit control does not contradict it.
  Shape: a **"Back to panel"** button in the anchor tab that opens the panel and closes the anchor
  tab — the exact mirror of the outbound hand-off, preserving "exactly one copy" (G-2). **Hidden
  while the float is open**, because closing the anchor tab would take the float with it (C-6);
  stop floating first. `windowId` is captured at mount via `useSelfTab()`, never awaited inside the
  handler — `sidePanel.open()` needs the gesture, exactly like `requestWindow()`.
- **D-6 — AC-16 covers selection, not just the close button.** Hiding the row's `Close` control
  while leaving its checkbox live would leave bulk-close as an unguarded second self-destruct path.
  The anchor row is excluded from selection entirely, and `closeTabs` filters it defensively.

## 4. Task units

Tracks: `ui` (React/MUI surface) · `backend` (chrome.* integration, module logic) · `verify`
(manual or tooling, no production code).

### Phase 0 — De-risk and tooling

#### T-0 · Confirm A-8: keyboard focus and text entry inside the float

- **Track:** verify · **Files:** none
- **Why first:** SPEC-01 §7 A-8 is the one unverified assumption left, and §13 says it gates the
  float's value proposition. The spike on this branch already opens a working float, so this costs
  one build and five minutes — before any of it is rewritten.
- **Steps:** `npm run build`, load `dist/` unpacked, side panel → pop out → float, then click the
  search field and type; Tab / Shift-Tab through the float's controls.
- **Check two more things while the float is open — both are free here and load-bearing:**
  1. **Does the tab list inside the float actually populate?** The whole architecture rests on an
     extension-origin iframe inside the PiP window retaining `chrome.*` access. It should — the PiP
     document inherits the opener's extension origin, so the frame is same-origin and needs no
     `web_accessible_resources` — but "should" is doing a lot of work for something every other AC
     depends on, and confirming it costs one glance.
  2. **Does the float survive the anchor being backgrounded, and does the list stay live?** This is
     AC-20 in miniature, five phases before T-14 would find out.
- **DoD:** A-8 recorded as confirmed or refuted in `LEARNINGS.md` under *What Works* / *What
  Doesn't Work*. **If refuted, stop and re-open SPEC-01** — the feature's value changes materially.
  Same for an empty list in the float, which would invalidate A-3's whole approach.
- **ACs:** A-8, AC-31 (early signal), AC-30 (early signal), AC-8 (early signal), AC-20 (early signal)

#### T-1 · Test harness

- **Track:** backend · **Files:** `package.json`, `vitest.config.ts` (new), `src/test/setup.ts` (new), `src/test/chromeStub.ts` (new), `tsconfig.json`, `.eslintrc.cjs`
- **Scope:** `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`,
  `@testing-library/user-event`. A `test` script. A `chrome.*` stub factory covering `tabs`,
  `tabGroups`, `windows`, `sidePanel` and `runtime.getURL`, installed on `globalThis` per test.
- **Pitfall:** use a **separate `vitest.config.ts`** — `vite.config.ts` loads `@crxjs/vite-plugin`,
  which expects an extension build context and has no business running under the test runner.
- **Pitfall:** `tsconfig.json` sets `noUnusedLocals` / `noUnusedParameters` and `include: ["src"]`,
  so test files land inside `src` and are type-checked by `npm run build`. Keep them clean or they
  break the build, not just the tests.
- **Pitfall — this is not the zero-config drop-in it looks like.** `.eslintrc.cjs` declares
  `env: { browser: true, es2020: true }` and nothing else, while `npm run lint` runs with
  `--max-warnings 0`. `describe` / `it` / `expect` as globals will therefore fail `no-undef` and
  break lint, not merely warn. Either add an `overrides` block for `src/**/*.test.{ts,tsx}` with
  `env: { "vitest/globals": true }`, or import the test API explicitly from `vitest` in every file
  and skip globals entirely. Budget this; it is the step most likely to eat an hour.
- **DoD:** `npm test` passes on a smoke test; `npm run build` and `npm run lint` still pass.
- **ACs:** **none — this is an enabler**, and it is the one unit in this plan that traces to no
  acceptance criterion. That is a property of the user's test-strategy decision, not a gap in the
  spec; recorded here rather than papered over with a spurious mapping.

### Phase 1 — Host model and entry

#### T-2 · Rename the middle surface to `anchor`

- **Track:** backend · **Files:** `src/lib/host.ts`, `src/lib/float.ts`, `src/lib/ControlBar/index.tsx`
- **Scope:** `Host = "panel" | "anchor" | "float"`; allow-list with panel fallback (already the
  shape — add the tests it never had).
- **DoD:** `?host=anchor` gives anchor; `?host=float` gives float; absent, `?host=window`, and
  `?host=<garbage>` all give panel. Unit tests cover all five.
- **ACs:** **AC-28** *(Verify: unit)*

#### T-3 · Anchor tab entry point

- **Track:** backend + ui · **Files:** `src/lib/anchor.ts` (new), `src/lib/ControlBar/index.tsx`
- **Scope:** `ANCHOR_URL`, `isAnchorUrl(url)`, `openAnchorTab()` — find-or-create over
  `chrome.tabs.query({ url: chrome.runtime.getURL("*") })`, preferring an existing `?host=anchor`
  tab over a bare one (D-5b), focusing it **and its window**, creating one only if none exists.
  Replaces `handlePopOut`'s `windows.create({type:"popup"})` and absorbs `handleCRXWindow` (D-5).
  A document that is genuinely the side panel — and only that — calls `window.close()` after the
  hand-off (AC-3, C-9, and the `chrome.tabs.getCurrent()` discriminator of D-5a).
- **Pitfall:** `await` the create/focus **before** `window.close()`; a panel document that closes
  first takes its pending promises with it.
- **Pitfall:** confirm early that the `chrome-extension://<id>/*` match pattern used by
  `tabs.query` matches a URL carrying `?host=anchor`. Chrome matches the pattern's path against
  path-plus-query, so it should — but the whole of AC-13 rests on it, and the currently shipped
  `handleCRXWindow` only ever proved it for a URL with no query string at all.
- **DoD:** from the panel, one normal tab appears in the tab strip (not a popup window) and the
  panel closes; invoking again from a second browser window focuses that same tab rather than
  making another; invoking from an extension page **in a tab** focuses/keeps that tab and closes
  nothing. Unit tests on the find-or-create branch and on the close discriminator, against the
  chrome stub.
- **ACs:** **AC-2** *(manual)*, **AC-3** *(manual + unit on the discriminator)*, **AC-13** *(manual + unit on the helper)*, E-16

### Phase 2 — Float lifecycle

#### T-4 · Float as React state; delete the placard

- **Track:** backend · **Files:** `src/lib/float.ts`, `src/lib/float/FloatContext.tsx` (new), `src/main.tsx`
- **Scope:** keep the module-local Document PiP typings, the synchronous `requestWindow()` call and
  `fillFloat`'s extension-origin iframe. **Delete `showPlacard` / `hidePlacard`** and every
  reference to `#root`. `canFloat()` becomes `getHost() === "anchor" && Boolean(pictureInPicture())`.
  Add a provider holding `"unavailable" | "closed" | "open" | "wasClosed"` with `open()` / `close()`.
- **Pitfall — C-3, the single most likely way to break this feature:** `open()` must call
  `requestWindow()` **synchronously**. No `await`, no state read that defers, no `useCallback` that
  awaits a check first. The spike's comment at `ControlBar/index.tsx:112` exists for this reason —
  carry it forward.
- **Pitfall — E-12:** guard rapid double activation by checking `pictureInPicture().window` before
  requesting (a synchronous read, so it does not burn activation), and no-op silently.
- **Pitfall — AC-11:** the search query lives in `App.tsx` `useState`. Float state changes must
  **re-render**, never remount, `App` — otherwise the user's search text dies with every float.
- **DoD:** opening and closing the float leaves the anchor tab's full manager untouched throughout;
  a typed search query survives open then close; nothing manipulates `#root`.
- **ACs:** **AC-6** *(manual)*, **AC-7** *(unit on the failure path + manual)*, **AC-8** *(unit/manual)*, **AC-9** *(manual)*, **AC-10** *(manual)*, **AC-11** *(manual)*, **AC-12** *(manual)*, **AC-35** *(manual)*, E-12

#### T-5 · ControlBar affordance matrix and discoverability copy

- **Track:** ui · **Files:** `src/lib/ControlBar/index.tsx`
- **Scope:** the full matrix, per D-1 —

  | host | float state | control |
  | --- | --- | --- |
  | `panel` | — | **"Float on top"** labelled button, calls `openAnchorTab()` |
  | `anchor` | API absent | *(none)* |
  | `anchor` | `closed` | **"Float on top"**, calls `open()` |
  | `anchor` | `open` | **"Stop floating"**, calls `close()` |
  | `float` | any | *(none)* |

- **Copy note:** the open-state control was "Return here" in the first draft. AC-33 requires any
  control that destroys the float to *say so*, and "Return here" describes where you end up, not
  what it costs — a user could easily read it as "focus the anchor tab, leave the float running".
  "Stop floating" names the destruction, which is the point.
- **Pitfall:** verify the third labelled button does not overflow the bottom bar at **320 px**
  side-panel width; if it does, demote "New window" to an icon rather than dropping the new label,
  which is the only discovery mechanism the product has (§5.8).
- **DoD:** unit tests assert the rendered control set for all five rows, by accessible name.
- **ACs:** **AC-1** *(unit)*, **AC-4** *(unit + manual)*, **AC-5** *(unit)*, **AC-14** *(unit)*, **AC-33** *(unit)*, **AC-39** *(unit + manual)*, **AC-40** *(unit + manual)*

#### T-6 · Float-closed notice

- **Track:** ui · **Files:** `src/lib/float/FloatClosedNotice.tsx` (new), `src/App.tsx`
- **Scope:** per D-2, D-2a and D-3, a persistent inline `Alert` shown in the anchor tab when the
  state is `wasClosed`, with a **"Float again"** action that reopens on one activation, and a
  dismiss.
- **Pitfall:** the "Float again" handler is a direct click handler — C-3 applies to it exactly as it
  does to the first open.
- **Pitfall — D-2a:** the notice must **not** appear when the user returns via Chrome's own "Back to
  tab" button. Gate it on `document.hasFocus()` being false a tick after `pagehide`.
- **DoD:** starting a video PiP while the float is up produces the notice; "Float again" restores
  the float in one click; **Chrome's "Back to tab" button produces no notice at all**.
- **ACs:** **AC-34** *(manual)*, E-1

### Phase 3 — What a second surface breaks

#### T-7 · Host-aware window focusing

- **Track:** backend · **Files:** `src/lib/surfaces.ts` (new), `src/lib/Tabs/actions.ts`, `src/lib/Tabs/Tab/TabDisplay.tsx`, `src/lib/Tabs/selection/SelectionToolbar.tsx`, `src/lib/Tabs/Window/WindowListItem.tsx`, `src/lib/ControlBar/index.tsx`
- **Scope:** one `focusBrowserWindow(windowId)` helper that calls `chrome.sidePanel.open` **only**
  when `getHost() === "panel"`, then focuses the window. Replace all six call sites. Fold
  `TabDisplay.handleActivate`'s inline duplicate onto `activateTab` from `actions.ts` while there.
- **Pitfall — LEARNINGS 2026-09-22:** these six sites are "the real cost of a second surface, not
  the rendering". Two are in `actions.ts`; four are inline in components, and those are the easy
  ones to miss.
- **DoD:** clicking a tab from the float focuses that browser window and opens no side panel. Unit
  tests on the helper for all three hosts.
- **ACs:** **AC-15** *(unit + manual)*

#### T-8 · Anchor row: marked and non-closable

- **Track:** ui · **Files:** `src/lib/Tabs/Tab/TabDisplay.tsx`, `src/lib/Tabs/selection/useSelected.ts`, `src/lib/Tabs/Window/WindowListItem.tsx`, `src/lib/Tabs/actions.ts`
- **Scope:** `isAnchorUrl(tab.url)` gives a visually distinct row with an accessible name
  identifying it as the tab holding the float, **no close control**, and **excluded from
  selection** — including the row checkbox and window-level select-all (D-6). `closeTabs` filters
  it defensively.
- **Why it matters:** `chrome.tabs.query({})` is unfiltered, so this row exists today by default.
  Left alone, the manager invites the user to close the tab that is holding their float.
- **The same self-destruct exists one level up, and neither the spec nor E-4 covers it.**
  `WindowListItem` renders a close-window control (`closeWindow(window.id)`) for every window,
  including the one holding the anchor tab. Guarding the row while leaving that button one click
  away is a half-fix: the float dies either way, and the user's intent ("tidy up this window") is
  just as innocent. AC-16 does not reach it — it says *row* — so this is a plan-level addition:
  mark the anchor's **window** row as the one holding the floating window, and require the same
  deliberateness as any other window close. Removing window-close outright is **not** proposed;
  closing a window full of tabs is a legitimate thing to want, and E-3/E-9 already accept that it
  takes the float with it. The requirement is that the user can see what they are about to lose.
- **DoD:** with the float up, the anchor row is findable, marked, has no close affordance, and
  cannot be caught by select-all then close; its window row is marked too. Unit tests on the row's
  control set and on the selection exclusion.
- **ACs:** **AC-16** *(unit + manual)*, E-4, E-9

#### T-9 · `useActiveTab` follows the last-focused normal window

- **Track:** backend · **Files:** `src/lib/Tabs/useActiveTab.ts`
- **Scope:** keep `chrome.windows.getCurrent()` for `panel`. For `anchor` and `float`, track the
  last-focused **normal** window whose active tab is **not** one of our own pages, via
  `chrome.windows.onFocusChanged` (ignoring `WINDOW_ID_NONE`), seeded from
  `chrome.windows.getLastFocused({ windowTypes: ["normal"] })`. **Export the resolver** — T-9a needs
  the same answer.
- **Export shape:** `resolveUserWindow(): Promise<number | undefined>` plus the reactive hook.
  `useActiveTab` consumes the hook; `SyncPrompt` (T-9a) consumes the plain function.
- **Pitfall:** the seed can itself be the anchor's window — `getAll()` has no recency order, so the
  fallback is the first normal window whose active tab is not an extension page. Name this in a
  comment; it is a deliberate approximation, not an oversight.
- **DoD:** with the float up, switching between two browser windows moves the current-tab card with
  the focus, and the extension's own anchor tab never appears there. Unit tests on the resolution
  function.
- **ACs:** **AC-17** *(unit + manual)*

#### T-9a · Undo restore must not yank the user to the extension's own tab

- **Track:** backend · **Files:** `src/lib/Tabs/undo/SyncPrompt.tsx`
- **This unit was missed by the spec and by the first draft of this plan.** SPEC-01 §9 enumerates
  six `sidePanel.open` call sites plus `useActiveTab` as everything the per-window host model
  touches. It is **seven**: `SyncPrompt.restore()` opens with
  `chrome.windows.getLastFocused()` and `chrome.tabs.query({ active: true, windowId })`, then — after
  restoring — re-focuses that window and re-activates that tab, under the comment *"Restoring steals
  focus/activation; put the user back where they were."* Run from the float, "where they were" can
  resolve to **the anchor tab**, so pressing UNDO teleports the user onto the extension's own page.
  Same root cause as AC-17, different file, and nothing in the spec would have caught it.
- **Scope:** route both calls through T-9's exported `resolveUserWindow()` so "where they were"
  means the user's last real browser window, never ours.
- **DoD:** close a tab from the float, press UNDO; the tab comes back and focus stays where the user
  left it. Unit test on the resolution, with the stub reporting the anchor's window as last-focused.
- **ACs:** **AC-17** *(the spirit of it — "never show/treat the extension's own anchor tab as the
  user's current tab")*, NFR-6

#### T-9b · One undo prompt per closure, not one per open surface

- **Track:** ui · **Files:** `src/lib/Tabs/undo/SyncPrompt.tsx`
- **Scope:** `SyncPrompt` subscribes to `chrome.tabs.onRemoved` in **every** live document. With the
  anchor tab and the float both mounted — and the side panel too, under E-5 — one closed tab raises
  two or three "Tab closed / UNDO" snackbars, and pressing UNDO in more than one runs
  `chrome.sessions.restore()` that many times. AC-19 requires convergence "with **no duplicated**
  and no lost operation", and a double restore is exactly a duplicated operation.
- **Honest scoping:** this is **pre-existing** — two browser windows with two side panels already
  reproduce it today. This feature does not create the bug, it makes it the common case, because the
  anchor and the float are mounted at the same time by design.
- **Options, cheapest first:** (a) prompt only where the user is looking — suppress when
  `document.hidden`; (b) a `chrome.storage.session` claim so one document wins the burst — **rejected
  outright**, it writes storage and breaks AC-23 and NG-9; (c) move undo to the service worker,
  correct and well out of scope here.
- **Recommendation:** (a). It is a two-line guard, it costs no storage, and "show the prompt in the
  surface the user is actually looking at" is what NFR-6 asks for anyway.
- **Built as (a) plus an exact rule in front of it.** Visibility alone only shrinks the problem: the
  float's own iframe always reports itself visible, and so does a side panel in an unfocused window.
  But the *by-design* duplicate is anchor + float, and the anchor **knows** whether its float is up —
  so it defers outright, no heuristic needed. Visibility then covers the rest. What survives is E-5:
  a user who deliberately reopens the side panel while floating can still get two prompts. That is
  rare, user-created, and closing it would need either `chrome.storage` (AC-23 forbids it) or
  cross-document runtime messaging — a lot of machinery for a duplicate toast. The *operation*
  duplication is defused separately: a spent session id makes the second UNDO reject, which is now
  reported rather than left as an unhandled rejection.
- **Rejected: `document.hasFocus()`.** Tempting, since exactly one document has focus — but when a
  tab is closed from Chrome's own tab strip, none of ours does, and the prompt would disappear in
  precisely the case it is most useful.
- **ACs:** **AC-19** *(manual)*, E-5

### Phase 4 — The float at 400 x 640

#### T-10 · Layout, multi-select, drag, grouping

- **Track:** ui · **Files:** `src/App.tsx`, `src/lib/ControlBar/index.tsx`, `src/lib/Tabs/selection/SelectionToolbar.tsx`, `src/lib/Tabs/selection/GroupForm.tsx`
- **Reframe — the spec says "float width", but the binding constraint is HEIGHT.** The side panel
  already ships at roughly this width, so AC-29's horizontal budget is close to proven before the
  first change. What is genuinely new is **640 px of vertical**, against a side panel that has always
  had a full browser window. The fixed chrome is: sticky top `Toolbar` (56) + `CurrentTab` (~50) +
  the `ControlBar`'s bottom `Toolbar` (56) ≈ **162 px**, leaving ~478 px of list, about ten dense
  rows. Select anything and `ControlBar` adds its 75 px `SelectionToolbar` spacer — so the list drops
  to ~400 px, roughly eight rows, **exactly when the user most needs to see what they picked**.
  Plan the work as a vertical-budget problem, not a horizontal one.
- **Scope:** at 400 x 640 and at Chrome's minimum clamp — search, switch and close usable and no
  horizontal scroll (AC-29); multi-select plus close / group / move-to-new-window usable, with
  enough list left visible alongside the selection toolbar to be worth using (AC-36); drag kept and
  working per D-4, with `onDragCancel` clearing state when a drag is released outside the float
  (E-11); `GroupForm`'s dialog and nine-colour row usable, or the documented step-up to a wider
  surface (AC-38). Empty state when the anchor's window holds no other tabs (AC-18).
- **Pitfall:** `SelectionToolbar` uses MUI `Grid` with `sm={6}` — at 400 px everything is `xs`, so
  the toolbar collapses to the full-width branch. Check it there, not at panel width.
- **Pitfall:** `CurrentTab` is the most obvious candidate to collapse at float height, but it is not
  free to drop — it is the surface AC-17 is *about*. If it has to go, that is a spec conversation,
  not a layout tweak.
- **DoD:** every listed action performed from a real float at 400 x 640, with a tab count large
  enough to scroll.
- **Measured, 2026-09-22, in `harness/` at exactly 400x640** — the arithmetic above was close but
  the real numbers are these:

  | | Idle | Selection active |
  | --- | --- | --- |
  | Top bar (search + current tab) | 100px | 100px |
  | Bottom bar | 57px | 125px |
  | **List** | **483px ≈ 9.7 rows** | **415px ≈ 8.3 rows** |

  `scrollWidth` stayed at 400 in every state — idle, selecting, dialog open, searching — so
  **AC-29 passes**. **AC-36 passes**: Deselect / Group / Window / Close all fit on one line, and
  eight rows remain visible beside them. **AC-38 passes outright** and its fallback is not needed:
  the group dialog is 287x185 with all nine colours on a single unwrapped row. Search filters
  correctly at this width.
- **Clamping (C-7) does not bite**: `requestWindow({400, 640})` gave a 401x641 content area.
- **Three float-only interaction bugs, all one cause.** Reported from the real float: the current
  tab card misaligned with the list, select/close needing a second click, and clicking a row's
  *text* doing nothing while its background worked. The harness reproduced only the misalignment
  (6px, now fixed). The other two were a volatile React list key — see `LEARNINGS.md` — and both
  went when it did.
- **AC-37 / E-11 confirmed in the real float:** dragging works *inside* the float and reorders;
  releasing outside the window cleanly does nothing, with no stranded overlay. **D-4 holds** —
  keeping drag was right, and the "omit the affordances" branch of AC-37 is not needed. Note the
  layout harness cannot test this: the browser pane only offers an instant A-to-B drag, with none
  of the intermediate mouse-moves dnd-kit needs to clear its 10px activation threshold, so no drag
  ever starts there regardless of whether the code works.
- **Still needs a real float:** AC-30 / AC-31 (keyboard focus) and AC-18's empty state, which the
  harness fixtures cannot reach.
- **ACs:** **AC-18** *(manual)*, **AC-29** *(manual)*, **AC-36** *(manual)*, **AC-37** *(manual)*, **AC-38** *(manual)*, E-6, E-7, E-11

#### T-11 · Theme delivery and no unstyled flash

- **Track:** ui · **Files:** `src/index.css`, `src/lib/float.ts`
- **Scope:** the iframe loads `index.html` fresh, so there is a gap before React mounts in which the
  document is default white — a visible flash in dark mode. Set the canvas background on `html` via
  a `prefers-color-scheme` rule, and set the float document's own background in `fillFloat` before
  the iframe is appended.
- **Found on building it: the plan named the wrong flash.** `:root` already sets
  `color-scheme: light dark`, so the iframe never flashed *white* in dark mode — it flashed the
  UA's own default until CssBaseline mounted, a smaller two-step. The bad one is the **float's own
  document**: created blank with no `color-scheme` at all, so the PiP window paints white in
  **both** themes until the iframe inside it loads. It is dressed before the frame is appended.
- **Measured in the harness at 401x641:** `html` and `body` both resolve to exactly
  `rgb(245, 241, 233)` under light and `rgb(26, 22, 19)` under dark — the brand canvas in each
  case, from the first frame.
- **The tests caught a robustness bug, not just a jsdom gap.** `canvas()` calls `matchMedia`,
  which jsdom lacks — and because it runs inside `fillFloat`, throwing there left the float an
  **empty window**. It is optional-called now: a cosmetic colour lookup must never be able to cost
  the user the content.
- **DoD:** open the float in both themes; no white flash, and the float matches the side panel.
- **ACs:** **AC-32** *(measured + manual)*, **AC-27** *(manual — inherited from C-11, guard against regression)*

#### T-12 · Snackbars land in the surface the user is looking at

- **Track:** verify · **Files:** none expected
- **Scope:** each document has its own React root and therefore its own notistack provider, so this
  should hold for free — confirm rather than build. AC-7's failure message must render in the
  anchor tab, where the failed request happened.
- **DoD:** an action taken from the float shows its snackbar in the float; a forced float-open
  rejection shows its message in the anchor.
- **ACs:** **AC-7** *(manual half)*, NFR-6

### Phase 5 — Guards, docs, and the sweep

#### T-13 · Privacy and permission guards, user-facing docs

- **Track:** backend + verify · **Files:** `src/test/manifest.test.ts` (new), `README.md`, `store-listing.md`
- **Scope:** a test asserting `manifest.json`'s `permissions` is **exactly**
  `["sidePanel","tabs","tabGroups","sessions"]` with no `host_permissions` and no `content_scripts`
  (AC-22); README feature list and store-listing description updated to name both the anchor tab
  and the float (AC-25).
- **AC-23 is not honestly a unit test.** A source scan for `chrome.storage` / `localStorage` /
  `IndexedDB` is a lint rule wearing a test's clothes: it proves only that *our* code does not
  write, and says nothing about MUI, notistack, dnd-kit or react-hook-form. Keep the scan as a
  cheap guard against our own regressions, but the criterion is met by the **manual** half —
  inspect Application → Storage after a full float session and assert it is empty.
- **Pitfall — LEARNINGS 2026-07-30:** a permission change must be mirrored in **five** files. AC-22
  says no permission is added, so this stays a guard — but if that ever changes, `PRIVACY.md` and
  `store-assets/privacy-policy.html` are the two that silently go stale.
- **DoD:** `PRIVACY.md` and `store-assets/privacy-policy.html` appear **nowhere** in this branch's
  final diff.
- **ACs:** **AC-22** *(unit)*, **AC-23** *(unit + manual)*, **AC-24** *(guard)*, **AC-25** *(manual)*

#### T-14 · Responsiveness and idle cost

- **Track:** verify · **Files:** none
- **Scope:** with the anchor tab backgrounded, confirm the float reflects tab open / close / move /
  group changes within 1 s (AC-20); idle the float 60 s and confirm no periodic `chrome.tabs.query`
  wake-ups (AC-21).
- **Note:** **A-7 is already closed.** The 2026-09-22 re-probe measured a *tab* opener at
  `visibilityState: "hidden"` for 102.1 s with -0.1 s hidden-only drift, and the float's own iframe
  realm — where the shipped React actually runs — reporting `visible` at 0.0 s drift. SPEC-01 §13
  still lists A-7 as pending because it was written before that run; this plan treats it as closed,
  and T-14 is confirmation in the real app rather than discovery.
- **Note:** AC-21 should pass by construction — `useUpdateEvents` is purely event-driven, with a
  10 ms debounce and no interval anywhere. Confirm, do not build.
- **ACs:** **AC-20** *(manual)*, **AC-21** *(manual with instrumentation)*

#### T-15 · Accessibility pass

- **Track:** verify + ui · **Files:** as needed
- **Scope:** keyboard focus lands inside the float on open and Tab / Shift-Tab cycles only the
  float's controls (AC-30); typing filters the list using the keyboard alone (AC-31); every control
  new to this feature has an accessible name stating its effect, and anything that destroys the
  float says so (AC-33); the AC-39 payoff copy reaches a screen reader with no hover (AC-40).
- **ACs:** **AC-30** *(manual)*, **AC-31** *(manual)*, **AC-33** *(unit + manual SR pass)*, **AC-40** *(unit + manual)*

#### T-16 · Edge-case sweep, markup safety, LEARNINGS

- **Track:** verify · **Files:** `src/test/`, `LEARNINGS.md`
- **Scope:** walk E-1 through E-16 against a real build. A unit test rendering a tab whose title
  contains markup and control characters (AC-26). Record what this build taught, and fold PI-7
  (C-1 through C-12 as one durable entry) into `LEARNINGS.md` so the next person does not re-derive
  them with another probe extension.
- **Note:** AC-26 should pass by construction — a scan found no `dangerouslySetInnerHTML`, no
  `href=`, and no `window.open` anywhere in `src/`. React escapes by default and every title goes
  through `ListItemText primary=`. This is a regression guard, not a fix.
- **ACs:** **AC-26** *(unit)*, **AC-12** *(manual, E-3 / E-8 / E-14 / E-15)*, **AC-19** *(manual, E-5)*

## 5. Sequencing

Single-agent and sequential, so this is a dependency order rather than a parallelism graph.
Phases are strictly ordered; within a phase, units are independent unless an arrow says otherwise.

```
T-0  (gate: if A-8 fails, stop and re-open SPEC-01)
  |
T-1  (harness — everything downstream writes tests)
  |
T-2 --> T-3 --> T-4 --> T-5 --> T-6
  |                      |
  +----------------------+--> T-7   T-8   T-9 --> T-9a
                                |     |            T-9b
                                |     |             |
                                +-----+-------------+--> T-10 --> T-11 --> T-12
                                                             |
                                                   T-13   T-14   T-15   T-16
```

T-7, T-8 and T-9 are independent of each other. **T-9a depends on T-9** — it consumes the
`resolveUserWindow()` export, and doing it first would mean writing that resolver twice. T-9b is
independent of both but shares `SyncPrompt.tsx` with T-9a, so they are sequenced.

**Shared-file contention** — the reason this resists parallelism even if the mode changed:
`src/lib/ControlBar/index.tsx` is touched by T-2, T-3, T-5, T-7 and T-10; `src/lib/float.ts` by
T-2, T-4 and T-11; `src/lib/Tabs/actions.ts` by T-7 and T-8; `src/lib/Tabs/undo/SyncPrompt.tsx` by
T-9a and T-9b. Only T-7 / T-8 / T-9 and the Phase-5 units have genuinely disjoint file sets.

## 6. Test plan

**Runner:** Vitest + jsdom + Testing Library, with a `chrome.*` stub. No CI exists, so the gate is
local: `npm test && npm run lint && npm run build` before each commit.

**Covered by unit tests** (16 ACs): AC-1, AC-4, AC-5, AC-7 (failure path), AC-13 (helper), AC-14,
AC-15, AC-16, AC-17, AC-22, AC-23, AC-26, AC-28, AC-33, AC-39, AC-40.

**Manual only — and honestly so.** Document Picture-in-Picture cannot be driven from jsdom: there
is no `documentPictureInPicture`, no second document, no always-on-top window, and no way to
simulate eviction by another PiP request. Every AC about the float *actually existing* — AC-2,
AC-3, AC-6, AC-8 through AC-12, AC-18 through AC-21, AC-25, AC-27, AC-29 through AC-32, and AC-34
through AC-38 — is verified against a loaded unpacked build. These become a numbered checklist in
the PR description, keyed to AC ids.

**The one that cannot be faked:** AC-6 (one trusted click opens the float). A synthetic click
reports `isTrusted: false` and `navigator.userActivation.isActive: false` (C-4), so no automated
test can ever cover it. It is a human click, every time.

## 7. Risks

| # | Risk | Mitigation |
| --- | --- | --- |
| R-1 | A refactor slips an `await` in front of `requestWindow()` and the float silently stops opening (C-3). | Comment at the call site (carried from the spike), T-4's DoD, and AC-6 as a standing manual check. |
| R-2 | A-8 fails and keyboard entry does not reach the float's search field. | T-0 runs **before** any rewrite, against code that already works. Failure re-opens the spec rather than wasting the build. |
| R-3 | The anchor tab is an ordinary tab with no lifetime protection (A-4); users will close or navigate it. | AC-16 removes the in-manager path; AC-33 names the consequence on the controls; E-14 is accepted, not solved. |
| R-4 | Adding a test runner to a repo with none is scope adjacent to the feature, not part of it. | Deliberate user decision. Kept to one config file, one stub and one setup file; `vitest.config.ts` stays separate from the CRXJS build config. |
| R-5 | The third labelled button overflows the 320 px side panel. | Checked explicitly in T-5, with a named fallback (demote "New window" to an icon) rather than sacrificing the discovery copy. |
| R-6 | Both privacy-policy copies drift if a permission sneaks in. | AC-22 is a test; the DoD is that neither policy file appears in the final diff. |
| R-7 | `useTabsStructure` is instantiated 2–3 times concurrently (a view, `SelectionToolbar`, `useActiveTab`), each with its own listeners, so **one** tab event fans out to 4–6 `chrome.tabs.query` / `tabGroups.query` calls. | Not an AC-21 breach — that criterion is scoped to *idle* — but it is the thing most likely to put AC-20's 1 s budget at risk on a large tab set, and it is pre-existing rather than introduced here. Measure in T-14 before optimising; do not refactor speculatively. |
| R-8 | T-0 verifies A-8 through the **spike's popup-window** opener, not the anchor tab the feature will actually ship. | Valid as a proxy for AC-31, since the float's content is the same extension iframe either way. Weaker for AC-30 ("focus lands inside the float on open"), which could plausibly differ by opener type — so AC-30 is re-checked against the real anchor in T-15 rather than being signed off at T-0. |

## 8. Traceability — all 40 acceptance criteria

| AC | Unit(s) | AC | Unit(s) | AC | Unit(s) | AC | Unit(s) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| AC-1 | T-5 | AC-11 | T-4 | AC-21 | T-14 | AC-31 | T-0, T-15 |
| AC-2 | T-3 | AC-12 | T-4, T-16 | AC-22 | T-13 | AC-32 | T-11 |
| AC-3 | T-3 | AC-13 | T-3 | AC-23 | T-13 | AC-33 | T-5, T-15 |
| AC-4 | T-5 | AC-14 | T-5 | AC-24 | T-13 | AC-34 | T-6 |
| AC-5 | T-5 | AC-15 | T-7 | AC-25 | T-13 | AC-35 | T-4 |
| AC-6 | T-4 | AC-16 | T-8 | AC-26 | T-16 | AC-36 | T-10 |
| AC-7 | T-4, T-12 | AC-17 | T-9 | AC-27 | T-11 | AC-37 | T-10 |
| AC-8 | T-0, T-4 | AC-18 | T-10 | AC-28 | T-2 | AC-38 | T-10 |
| AC-9 | T-4, T-5 | AC-19 | T-9b, T-16 | AC-29 | T-10 | AC-39 | T-5 |
| AC-10 | T-4 | AC-20 | T-0, T-14 | AC-30 | T-0, T-15 | AC-40 | T-5, T-15 |

AC-17 additionally covers **T-9a**, whose defect the spec's own cross-module table missed.

Every AC maps to at least one unit. Every unit traces back to at least one AC **except T-1**, the
test harness, which is an enabler with no behaviour of its own — see T-1.

**Two units exceed the spec.** T-8's window-row marking and T-9b's undo de-duplication have no AC
of their own: the first is E-4's hazard one level up, the second is a pre-existing AC-19 breach
this feature promotes from rare to routine. Both are recorded here rather than silently built or
silently dropped — if either is unwanted, cutting it is a scope decision, not a bug.

## 9. Open question for the user

**Q-1 — the float and the anchor tab do not share their search box, and the spec never says whether
they should.** They are two separate documents with two separate React roots, so `search` in
`App.tsx` exists twice. AC-11 says closing the float must leave the anchor "without losing the
user's current search text", which is satisfied for text typed *in the anchor* — but a user who
types a filter **in the float** and then closes it lands on an anchor showing an unfiltered list,
and will reasonably call that losing their search.

Three ways out, none free:

1. **Accept it** (cheapest, and what the plan currently assumes). Each surface keeps its own
   filter; document it as intended. AC-11 is met on its literal reading.
2. **Hand the query across on close.** The float's `pagehide` passes its current search back to the
   opener through the iframe's `window.parent`, same origin, in memory only — no storage, so NG-9
   is untouched. Roughly one small unit of work; also makes the float→anchor step-up in AC-37 and
   AC-38 much less jarring, since the user keeps their filter when they go somewhere wider.
3. **Share state both ways continuously.** Materially more work, and nothing in the spec asks for
   it.

Recommendation: **(2)**, folded into T-4. It is the option that makes AC-38's "finish this on a
wider surface" instruction actually pleasant to follow. Flagging rather than deciding, because
this is a product call the spec did not make.

## 10. Explicitly out of scope

Carried from SPEC-01 §3 so the build does not drift into them: floating arbitrary pages (NG-1),
native companions (NG-2), host permissions or content scripts (NG-3), multiple floats (NG-4),
positioning the float (NG-5), an always-on-top extension window (NG-6), removing the side panel
(NG-7), sync (NG-8), persisting float size or position (NG-9), a `chrome.commands` shortcut
(NG-10), auto-restoring the side panel (NG-11), any first-run hint or onboarding state (NG-12).

Also out of scope here, though adjacent: the planned switch from `tab.favIconUrl` to Chrome's
local favicon database (`LEARNINGS.md`, 2026-07-30). The float surfaces the existing network
behaviour in a new place but does not change it.
