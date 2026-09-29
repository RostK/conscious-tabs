# PLAN SPEC-05 (group A) — A keyboard way in, and focus that lands somewhere useful

|                    |                                                                                                                                |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| **Plan for**       | [SPEC-05](../specs/ui-shell/SPEC-05-2026-09-29-keyboard-access.md) (Status: approved 2026-09-29, 39 ACs, zero open NC) — **group A only**, per its §1.9 |
| **Date**           | 2026-09-29                                                                                                                     |
| **Module**         | `ui-shell`                                                                                                                     |
| **Status**         | approved (2026-09-29) — the three criteria §8 found unsatisfiable were amended in SPEC-05 first; see below |
| **Execution mode** | Single-agent, sequential (user decision, 2026-09-29 — precedent PLAN-SPEC-01)                                                  |
| **Test strategy**  | Vitest for everything reachable without a real browser, plus [MANUAL-SWEEP-SPEC-05.md](MANUAL-SWEEP-SPEC-05.md) for what is not (user decision, 2026-09-29) |
| **Branch**         | `keyboard-entry-and-focus`                                                                                                     |
| **Scope**          | Items 1 and 2. **AC-1…AC-16, AC-28 (as it applies to §5.2), AC-32, AC-34…AC-39** — 24 criteria                                 |
| **Not in scope**   | Group B (AC-17…AC-27, AC-29…AC-31, AC-33). Blocked on SPEC-04 being implemented; its criteria are written against a row structure that does not exist yet. |

---

## 0. Progress

| Unit  | State       | Note |
| ----- | ----------- | ---- |
| T-0   | not started | Baseline install warning, recorded **before** the manifest changes. Ordering matters — see the unit. |
| T-1   | not started | Enablers: `commands` on the chrome stub, and the worker's first test seam. Traces to no AC. |
| T-2   | not started | `manifest.json` gains one custom command. |
| T-3   | not started | A worker-safe way to reach the anchor tab. |
| T-4   | not started | The command listener. AC-36 lives or dies here. |
| T-5   | not started | **Gate** — a real Chrome, clean profile. Stop-and-rethink if the panel never opens. |
| T-6   | not started | One initial focus: the search field wins, `TabDisplay`'s claim is withdrawn. |
| T-7   | not started | `↓` from the field lands on the active tab's row. |
| T-8   | not started | Say so when the shortcut is unbound. |
| T-9   | not started | README and store listing. |
| T-10  | not started | The rest of the manual sweep. |

---

## 1. Summary

Group A is two behaviours: a key that opens the UI, and focus that lands in the search field when
it does. The code is small. What makes it a plan rather than a commit is that three of its
criteria are decided by things a code review cannot see — whether a `chrome.commands` event still
carries the activation `sidePanel.open()` needs by the time the call runs (AC-36), whether a
programmatically opened side panel takes document focus at all (AC-38), and whether declaring the
key changes the install warning (AC-5). Two of those three are only answerable in a real browser,
and the plan is shaped around getting to that answer early rather than at the end.

The centre of gravity is four findings from the working tree, each of which changes what the work
is:

1. **`chrome.commands.onCommand` hands the listener the active tab.**
   `node_modules/@types/chrome/index.d.ts:1264` types the callback
   `(command: string, tab: chrome.tabs.Tab) => void`. So `tab.windowId` and `tab.url` are both in
   hand **before the first statement executes**. That is the whole of A-4's "the `windowId` must be
   obtained without an await" — there is nothing to await. It also turns AC-39 from a refinement
   that probably cannot be afforded into one that costs a single synchronous `if`.
2. **The worker cannot import `src/lib/anchor.ts` as it stands.** That file imports `notistack`
   (line 1) and `react` (line 2) at module scope. The service worker has no `window` and no React
   tree, and by the bundle measurement in `vite.config.ts:28-30` those two imports drag
   `react-dom` (131 kB) and `notistack` (23 kB) into a context that can use neither. AC-8's
   fallback and AC-9's find-or-create therefore need the DOM-free half of that module extracted
   first (T-3).
3. **`GroupListItem` drops the `focus` prop.** `src/lib/Tabs/TabsGroup/GroupListItem.tsx:271`
   renders `<TabListItem group={group} tab={tab} key={tab.id} />` with no `focus`, so
   `TabDisplay`'s `focus = true` default applies to every tab inside a group — including in
   `SearchView`, which passes `focus={false}` only to the top-level `Tabs`
   (`src/views/SearchView/index.tsx:60`). §1.8's collision is therefore already leaking today, and
   any fix that merely passes `focus={false}` harder would leave AC-11 false for a grouped active
   tab. See D-3.
4. **Nothing mounts `App`, and the worker has no test coverage at all.** Seventeen test files under
   `src/`; none is `App.test.tsx`, and a grep for `worker` across `src/`, `vitest.config.ts`,
   `package.json` and `.github/` returns exactly one hit — a comment at `vitest.config.ts:8`. Eight
   of group A's criteria need an `App` render that has never been done, and nine need a way to load
   the worker module under test. That is enabler work which traces to no acceptance criterion, and
   it is recorded as such (T-1) rather than papered over — the same property PLAN-SPEC-01's T-1 has.

## 2. Design decisions this plan makes

The spec left these to the plan. Each is a decision, not a discovery.

- **D-1 — The operative form of AC-36 is "no `await` before the open", not "the literal first
  statement".** AC-36's prose and AC-39's synchronous guard cannot both be honoured verbatim: a
  branch on `isOwnPage(tab.url)` is a statement, and it has to come first. What actually spends the
  transient activation is awaiting or a message round trip, not a comparison of two values already
  in hand. So the rule this plan enforces, and the rule the test asserts, is: **no `await`, no
  `.then()` continuation, no `chrome.runtime.sendMessage`, and no other `chrome.*` call may precede
  `chrome.sidePanel.open()` in the listener.** A synchronous guard over the `tab` argument is
  permitted. If that reading is rejected, AC-39 must be dropped — they are mutually exclusive. See
  §8, item 2.
- **D-2 — The listener is its own module, and the worker only registers it.** `src/worker/index.ts`
  keeps `setPanelBehavior` and gains one `chrome.commands.onCommand.addListener(handleCommand)`;
  `handleCommand` lives in `src/worker/openSurface.ts`. Reason: AC-36's verification wants to look
  at "the listener body", and a named export is a thing a test can both call and read. The repo
  already reads its own sources in a test — `src/test/manifest.test.ts:62-113` — so a static
  source assertion is an established shape here, not a novelty.
- **D-3 — `TabDisplay`'s initial-focus claim is deleted, not conditioned.** §1.8 says the search
  field wins "whenever it is present", and the field is present in every surface and every state:
  it is in the always-rendered `AppBar` (`src/App.tsx:249-272`), not gated on `host` and not gated
  on `search`. "Whenever present" is therefore "always", so the `focus` prop and the `autoFocus`
  are dead weight rather than a race to arbitrate. Deleting them satisfies AC-11's "never called
  `focus()` at all" by construction and closes finding 3 above, which a conditional fix would not.
  This is the mechanism PI-2 leaves to the planner.
- **D-4 — Initial focus is one effect in `App`, not `autoFocus` on the input.** Two reasons. The
  lint gate: `jsx-a11y/no-autofocus` is on (`.eslintrc.cjs:8`, `--max-warnings 0`), and the codebase
  already carries two suppressions for it. The behaviour: AC-38's fallback requires the caret to be
  in the field "the moment the document does receive focus", which `autoFocus` alone cannot do. One
  hook does both — focus on mount, and, if the document did not have focus at mount, arm a one-shot
  `window` `focus` listener that focuses the field only while `document.activeElement` is still
  `document.body`. It never calls `window.focus()`: AC-38 forbids forcing or faking focus, and
  that is the line.
- **D-5 — The row `↓` lands on is found by a data attribute, not by MUI's `Mui-selected`.**
  `TabDisplay` gains `data-tab-row` on every row and `data-active-tab` when `tab.active`. Querying
  a MUI state class would couple the keyboard model to a styling implementation detail.
- **D-6 — The unbound-shortcut notice is informational, and permanent.** A `severity="info"` strip
  in the `AppBar` beside `FloatClosedNotice`, rendered only while `chrome.commands.getAll()` reports
  `shortcut: ""`. Not a snackbar (the user may never see a three-second toast), not dismissible
  (remembering a dismissal needs storage — NG-4, SPEC-01 AC-23), and not an error (AC-7 forbids
  surfacing the unbound state as a failure; AC-35 requires saying it out loud. Both hold if it is
  information, not an error).

## 3. Task units

Tracks: `ui` (React/MUI surface) · `backend` (chrome.\* integration, module logic) · `verify`
(manual or tooling, no production code).

### T-0 · Record today's install warning, before anything changes

- **Track:** verify · **Files:** none (result recorded in `plans/MANUAL-SWEEP-SPEC-05.md` §A)
- **Why first, and why this is not optional:** AC-5 requires the install warning to be "unchanged
  from today's". After T-2 lands there is no "today's" left to compare against — the baseline has
  to be captured from a tree without the `commands` key. This is the cheapest possible unit and the
  most expensive one to skip.
- **Steps:** on `main`, `npm run build`, load `dist/` unpacked on a **clean profile**, and record
  the permission-warning dialog **verbatim** (screenshot plus transcription) in the sweep document.
- **DoD:** §A of the sweep document holds the baseline text and the Chrome version it was taken on.
- **ACs:** **AC-5** (the half that can only exist before the change)

### T-1 · Enablers: `commands` on the chrome stub, and a worker test seam

- **Track:** backend · **Files:** `src/test/chromeStub.ts`, `src/test/chromeStub.test.ts`
- **Scope:** add `commands: { getAll: vi.fn(async () => [] as chrome.commands.Command[]), onCommand: event() }`
  to `createChromeStub`. The existing `event()` helper (`chromeStub.ts:29-41`) already records
  listeners and can `fire()` them, which is exactly what a command test needs. Add a fixture knob
  so a test can declare the commands `getAll()` reports, defaulting to one bound command.
- **Establish and write down the worker-loading recipe**, because every later worker test depends on
  it: `vi.resetModules()`, then `installChrome(...)`, then `await import("../worker/index.ts")`,
  then take the handler out of `chrome.commands.onCommand.addListener.mock.calls[0][0]`. The module
  has side effects at import (`setPanelBehavior` at `src/worker/index.ts:2-4`), so the order is not
  negotiable and `restoreMocks: true` (`vitest.config.ts:23`) does not undo a module already in the
  cache.
- **Pitfall:** tests import the Vitest API explicitly — no globals. `vitest.config.ts:12-15` says
  why: `.eslintrc.cjs` declares only `env: { browser: true, es2020: true }` and `npm run lint` runs
  `--max-warnings 0`, so a bare `describe` fails `no-undef` and breaks the gate rather than warning.
- **Pitfall:** the stub clones what it hands out, deliberately (`chromeStub.ts:84-92`, and the
  LEARNINGS entry of 2026-09-24). Anything added keeps that property.
- **DoD:** a stub self-test fires `commands.onCommand` and reaches a listener; `npm test`,
  `npm run lint` and `npm run build` all pass.
- **ACs:** **none — this is an enabler.** Recorded as a property of the test-strategy decision, not
  as a gap in the spec. Same shape as PLAN-SPEC-01's T-1.

### T-2 · `manifest.json` declares one custom command

- **Track:** backend · **Files:** `manifest.json`, `src/test/manifest.test.ts`
- **Scope:**

  ```json
  "commands": {
    "open-conscious-tabs": {
      "suggested_key": { "default": "Ctrl+Shift+K", "mac": "Command+Shift+K" },
      "description": "Open Conscious Tabs"
    }
  }
  ```

  Nothing else in the manifest moves: `permissions`, `side_panel`, `action`, `background` and
  `icons` are untouched.
- **New assertions in `manifest.test.ts`** — added alongside the existing ones, which stay
  unmodified (D-4 of the spec):
  - exactly one command is declared, and its name does **not** start with `_execute` (AC-1;
    `_execute_action` dispatches no `onCommand` event, and `_execute_side_panel` does not exist —
    §10 records it as fabricated);
  - `description` is non-empty and is not equal to the command's own key (AC-4). Compare against
    the key, **not** against `action.default_title` — the two are allowed to read the same;
  - `suggested_key`: every value contains `Ctrl`, `Command`, `MacCtrl` or `Alt`; none matches
    `Ctrl+Alt`; none is in the deny-set `Ctrl+Shift+{A,T,B,C,D,I,J,M,N,O,W}` (AC-37 — the
    executable form of §1.7a's table, so the reasoning survives a later edit).
- **Pitfall — do not widen the five-file mirror test.** `manifest.test.ts:37-48` iterates
  `manifest.permissions`. It must keep iterating exactly that. A `commands` key is a manifest key,
  not a permission (C-9 / DEC-11), so `PRIVACY.md`, `store-assets/privacy-policy.html` and the
  permission lines of `README.md` and `store-listing.md` are not edited. Neither policy file may
  appear in the branch diff — the T-13 precedent in PLAN-SPEC-01.
- **Pitfall — confirm the key survives the build.** `vite.config.ts:9` hands `manifest.json` to
  `crx()`, which rewrites the manifest. Standard MV3 keys pass through, but "should" is doing work
  here: after `npm run build`, check `dist/manifest.json` actually contains `commands`. A key
  silently dropped at packaging presents as "the shortcut does nothing", which is
  indistinguishable from six other failures.
- **DoD:** `npm test` / `npm run lint` / `npm run build` pass; `dist/manifest.json` contains the
  `commands` key; `git diff --name-only` names neither policy file.
- **ACs:** **AC-1** _(unit)_, **AC-4** _(unit)_, **AC-6** _(unit, existing test unmodified)_, **AC-37** _(unit)_

### T-3 · A worker-safe way to reach the anchor tab

- **Track:** backend · **Files:** `src/lib/anchorTab.ts` (new), `src/lib/anchor.ts`,
  `src/lib/ControlBar/index.tsx`, `src/lib/anchor.test.ts`, `src/lib/anchorTab.test.ts` (new)
- **Scope:** move `ANCHOR_URL`, `isAnchorTab` and `openAnchorTab` (`anchor.ts:14-63`) into
  `src/lib/anchorTab.ts`, which imports nothing but `chrome.*`. `anchor.ts` keeps
  `closeIfSidePanel`, `backToSidePanel` and `useSelfTab` — the three that genuinely need React,
  notistack and `getHost()`. Update the two importers (`ControlBar/index.tsx:21-25` and
  `anchor.test.ts:4`); move the eight `openAnchorTab` cases to `anchorTab.test.ts` unchanged.
- **Why not a re-export:** it would leave `openAnchorTab` reachable from `anchor.ts`, which is
  precisely the import a future change would make from the worker, reintroducing the problem this
  unit exists to remove.
- **Behaviour is not changed.** AC-9 is the find-or-create contract exactly as it stands, including
  its preference for a real `?host=anchor` tab over a bare extension page (`anchor.ts:47-49`, and
  the comment at 35-42 explaining that two float-capable documents evict each other's float). The
  eight existing tests must pass **unmodified apart from the import path** — if one needs editing,
  the move changed behaviour and is wrong.
- **Recommended, cheap:** a guard test asserting that every file under `src/worker/` imports only
  from an allow-list of DOM-free modules. Source-scanning is already a pattern here
  (`manifest.test.ts:62-67`), and this is the only thing that will catch the regression later —
  nothing else fails until the extension is loaded.
- **DoD:** `src/lib/anchorTab.ts` imports no React, no notistack and touches no `window`; the eight
  find-or-create tests pass; `npm run build` passes (it type-checks the test files —
  `tsconfig.json` `include: ["src"]`).
- **ACs:** **AC-9** _(unit, existing coverage preserved)_

### T-4 · The command listener

- **Track:** backend · **Files:** `src/worker/openSurface.ts` (new), `src/worker/index.ts`,
  `src/worker/openSurface.test.ts` (new)
- **Scope:** `src/worker/index.ts` keeps its `setPanelBehavior` call verbatim — the icon path and
  the command path stay distinct (DEC-4) — and adds
  `chrome.commands.onCommand.addListener(handleCommand)`. The handler, in order:

  | # | Condition (all synchronous, all from the `tab` argument)          | Action                                                                 | AC |
  | - | ------------------------------------------------------------------ | ----------------------------------------------------------------------- | -- |
  | 1 | `command !== "open-conscious-tabs"`                                | return, reaching no branch                                              | AC-34 |
  | 2 | `isOwnPage(tab.url)`                                               | no panel; `chrome.windows.update(tab.windowId, { focused: true })`      | AC-39, E-1 |
  | 3 | no `tab`, or no `tab.windowId`                                     | `openAnchorTab()`                                                        | E-3 |
  | 4 | otherwise                                                          | `chrome.sidePanel.open({ windowId: tab.windowId })`, `.catch(openAnchorTab)` | AC-2, AC-8 |

  `isOwnPage` is imported from `src/lib/surfaces.ts:14` — the spec names it, and it is worth having
  one definition. It calls `getHost()` nowhere, so importing `surfaces.ts` costs the worker nothing
  at module scope; the T-3 guard test is what keeps that true.
- **Pitfall — AC-36, and it is the reason this unit exists separately.** The activation is spent by
  whatever runs first, and the failed open has no symptom beyond "the key did nothing". It has
  killed this exact design twice in public (issues.chromium.org/issues/355266358,
  chrome-extensions-samples#1001). Two tests, because one is brittle and the other is indirect:
  - **behavioural** — fire the command with the stub and assert `chrome.sidePanel.open`'s
    `mock.invocationCallOrder[0]` is lower than that of **every other** `chrome.*` mock the stub
    exposes. This is the assertion that actually means what AC-36 means;
  - **static** — read `src/worker/openSurface.ts` and assert no `await` and no `sendMessage`
    appears before the first `chrome.sidePanel.open`. Crude, and it is what fails loudly the day
    someone adds a lookup.
- **Pitfall — AC-10's assertion is about absence, so write down what makes it true.** The test
  asserts `chrome.tabs.remove`, `chrome.tabs.update` and every `chrome.tabGroups.*` mock have zero
  calls after the command fires, in all four branches. Its precondition — that the handler's whole
  call graph is `sidePanel.open`, `windows.update`, and `openAnchorTab`'s `tabs.query` /
  `tabs.update` / `tabs.create` / `windows.update` — belongs in a comment beside it. (LEARNINGS,
  2026-09-24: a test asserting absence stops testing the day the thing becomes legitimate.)
- **Pitfall — the AC-8 fallback is also a hazard, and the gate must look at it.** A repeat press
  whose `sidePanel.open()` rejects for any reason would open an anchor tab the user did not ask
  for, turning a double-press into a change of surface. `openAnchorTab` is find-or-create, so the
  worst case is one extra tab rather than many — but E-5 is why T-5 presses the key three times.
- **Risk recorded, not assumed:** `@types/chrome` types the `tab` argument as non-optional, and no
  primary source in this repository establishes it is always delivered. Branch 3 exists for that
  reason and costs one line; whether it is ever taken is a T-5 observation.
- **DoD:** unit tests cover all four branches; the open is provably first; AC-3's structural half
  — a repeat press issues exactly one `sidePanel.open` and no close, no second open — is asserted;
  `npm test` / `npm run lint` / `npm run build` pass.
- **ACs:** **AC-2** _(unit)_, **AC-3** _(unit — structural half only; see §8)_, **AC-8** _(unit)_,
  **AC-10** _(unit)_, **AC-34** _(unit)_, **AC-36** _(unit + static)_, **AC-39** _(unit)_, E-3, E-5

### T-5 · Gate — a real Chrome, a clean profile

- **Track:** verify · **Files:** none (results into `plans/MANUAL-SWEEP-SPEC-05.md` §B)
- **Why here:** everything before this is unfalsifiable in jsdom. If the command never opens the
  panel, C-8 is wrong for this build of Chrome, and AC-8's anchor-tab fallback becomes the primary
  path (A-4 says so in advance) — which changes T-4 and is far cheaper to learn now than after
  T-6…T-9.
- **Steps:** `npm run build`, load `dist/` unpacked on a **clean profile**. Then, in order:
  1. record the permission-warning dialog verbatim and diff it against T-0's baseline (**AC-5**);
  2. press `Ctrl+Shift+K` on an ordinary page — does the side panel open? (**AC-2**);
  3. press it three times in a row from each of: an ordinary page, the anchor tab, a window with
     the panel already open. Record the state after each (**AC-3**, E-5);
  4. record, for the panel, whether the document had focus when it opened and where the caret was
     (**AC-38**, the panel third — the one the whole of item 2's shape depends on);
  5. clear the shortcut at `chrome://extensions/shortcuts`, then exercise the toolbar icon, "Open
     full view", "Float on top" and "Back to panel" (**AC-7**);
  6. confirm the description appears verbatim on the shortcuts page (**AC-4**, manual half).
- **DoD:** §B of the sweep document is filled in, including the Chrome version. **If step 2 fails,
  stop and re-plan T-4** against AC-8 as the primary path.
- **ACs:** **AC-5**, **AC-2** _(manual)_, **AC-3** _(manual)_, **AC-4** _(manual)_, **AC-7** _(manual)_, **AC-38** _(panel)_

### T-6 · One initial focus: the search field wins

- **Track:** ui · **Files:** `src/App.tsx`, `src/lib/Tabs/Tab/TabDisplay.tsx`,
  `src/lib/Tabs/Tabs.tsx`, `src/lib/Tabs/Window/WindowListItem.tsx`,
  `src/views/SearchView/index.tsx`, `src/lib/Tabs/Tab/TabDisplay.test.tsx`,
  `src/App.test.tsx` (new)
- **Scope, withdrawal half (D-3):** delete `autoFocus={tab.active && focus}`
  (`TabDisplay.tsx:99`), the `focus?: boolean` prop and its default (`TabDisplay.tsx:31,34`), the
  pass-through in `Tabs.tsx:11,14,23`, the prop in `WindowListItem.tsx:34,35,146`, and
  `focus={false}` in `SearchView/index.tsx:60`. Keep `selected={tab.active}` — the row still says
  which tab is active, it just stops claiming focus. `TabListItem` needs no edit; it spreads
  `...props`.
- **Scope, claim half (D-4):** a `useInitialFocus` hook in `App` holding an `inputRef` on the
  `StyledInputBase`. On mount it focuses the input. If `document.hasFocus()` is false at mount, it
  arms a one-shot `window` `focus` listener that focuses the input **only while
  `document.activeElement` is `document.body`** — so a user who has already clicked or tabbed
  somewhere is never yanked back. It never calls `window.focus()`.
- **Pitfall — `--report-unused-disable-directives`.** `TabDisplay.tsx:98` carries
  `// eslint-disable-next-line jsx-a11y/no-autofocus`. Deleting the `autoFocus` and leaving the
  comment **fails lint**, it does not merely warn (`package.json` lint script). Delete the comment
  and the three-sentence block above it together; that comment is §1.8's original intent, and it
  has a new home in T-7's code, not here.
- **Pitfall — this is why the withdrawal has to reach `GroupListItem`'s path.** The prop deletion
  removes the leak at `GroupListItem.tsx:271` by construction. A fix that only passed `focus={false}`
  from `App` would leave a grouped active tab autofocusing and AC-11 false.
- **Pitfall — `npm run build` type-checks tests.** `TabDisplay.test.tsx:26` passes `focus={false}`;
  removing the prop makes that a compile error, and `npm test` would stay green while `tsc` fails.
  (LEARNINGS, 2026-09-23: this has happened twice.)
- **Pitfall — StrictMode.** `main.tsx:10` wraps the app in `React.StrictMode`, so effects run
  mount → unmount → mount. The one-shot guard is a `useRef`, which survives that pairing — the same
  shape as `reported.current` at `App.tsx:131-140`, and for the same reason.
- **Pitfall — no test has ever mounted `App`.** It renders `ControlBar`, `CurrentTab`, `AudioTabs`,
  `FloatClosedNotice` and `TabsView`, each of which touches `chrome.*` and `useSyncExternalStore`.
  Budget for the render harness being the expensive part of this unit, not the focus logic.
- **How AC-11's "never called `focus()` at all" is proven:** `vi.spyOn(HTMLElement.prototype, "focus")`
  before render (Vitest's `spyOn` calls through by default, so focus still works), then assert that
  no recorded call's `this` matches `[data-tab-row]`. Asserting only the end state would pass while
  both still fired — which is the bug the criterion exists to prevent.
- **AC-28 (§5.2) is a loop, not a fourth test:** run the same mount assertions under
  `?host=anchor`, `?host=float` and the bare panel URL. `setup.ts:34` resets the URL per test and
  `host.test.ts` is the precedent for setting it.
- **AC-15's guard is already there and must not be disturbed:** mounting as `host="float"` must not
  call `reportFloatSearch`. `App.tsx:131-140`'s `reported.current` is what prevents it, and the
  comment explains that reporting on mount "would hand the anchor an empty search the user never
  typed". Focusing a field changes no value, so the test is a regression guard.
- **DoD:** after mount, `document.activeElement` is the search input and its accessible name is
  `"search"`; `userEvent.keyboard("doc")` immediately after mount leaves the input reading `doc`;
  no `[data-tab-row]` element was ever focused; the `h1` (`App.tsx:244`) and the `main` landmark
  (`App.tsx:282`) are still present; `reportFloatSearch` uncalled on a float mount;
  `takeFloatSearch` remains the only source of a non-empty initial search; all three hosts pass;
  `npm test` / `npm run lint` / `npm run build` pass.
- **ACs:** **AC-11** _(unit)_, **AC-12** _(unit; the "document first receives focus" half is
  T-10's)_, **AC-13** _(unit + SR pass in T-10)_, **AC-15** _(unit)_, **AC-16** _(unit)_,
  **AC-28 as it applies to §5.2** _(unit)_, E-8

### T-7 · One `↓` from the field lands on the active tab's row

- **Track:** ui · **Files:** `src/App.tsx`, `src/lib/Tabs/Tab/TabDisplay.tsx`, `src/App.test.tsx`
- **Scope:** `TabDisplay`'s `ListItemButton` gains `data-tab-row` always and `data-active-tab` when
  `tab.active` (D-5). The search input gains an `onKeyDown` that, on `ArrowDown` with no modifier,
  prevents default and focuses `main [data-active-tab]` if present, else the first
  `main [data-tab-row]`.
- **Pitfall — scope the query to `<main>`.** `App.tsx:293-312` renders a `DragOverlay` that renders
  a `TabDisplay` of its own; unscoped, "the first row" could be the drag overlay's copy. `main` is
  at `App.tsx:282` and the overlay is outside it.
- **Pitfall — this is bound in the field, not in the list.** NG-6 and SPEC-04 keep plain arrows
  unbound between rows, and `useRowKeys` (`rowControls.ts:171-187`) handles only Left and Right.
  Nothing in `src/lib/Tabs/elements/rowControls.ts` changes; widening that walk is explicitly not
  the mechanism (§9).
- **Carry `TabDisplay.tsx:93-97`'s reasoning forward as a comment here.** "It puts focus on the row
  for the tab the user is already looking at" is the intent §1.8 preserves one key press later, and
  this is now the only place in the code that honours it.
- **DoD:** from the focused field, `↓` puts `document.activeElement` on the active tab's row in a
  fixture that has one, and on row 1 in a fixture that does not; a fixture whose active tab is
  inside a group also lands on that row; `npm test` / `npm run lint` / `npm run build` pass.
- **ACs:** **AC-14** _(unit)_

### T-8 · Say so when the shortcut is unbound

- **Track:** ui · **Files:** `src/lib/ShortcutNotice.tsx` (new),
  `src/lib/ShortcutNotice.test.tsx` (new), `src/App.tsx`
- **Scope:** a component that reads `chrome.commands.getAll()` once on mount and, if the entry for
  `open-conscious-tabs` reports `shortcut: ""`, renders a persistent `severity="info"` strip naming
  `chrome://extensions/shortcuts` as where to fix it. Mounted in the `AppBar` beside
  `FloatClosedNotice` (`App.tsx:277`) — `src/lib/FloatClosedNotice.tsx` is the shape and the
  placement precedent, including its reasoning for a strip over a snackbar.
- **Both failure modes present identically** and one notice covers both: a chord another extension
  already holds fails **silently** (C-10) and a cleared one looks the same. Nothing is remembered,
  so NG-4 and SPEC-01 NG-12 are not implicated — the notice is derived from live state.
- **Pitfall — AC-7 says an unbound command is not a failure state.** No console error, no snackbar,
  no thrown promise. Guard `chrome.commands` being absent so the app cannot throw in a context that
  lacks it.
- **DoD:** with `getAll()` stubbed to `shortcut: ""` the notice renders and names the shortcuts
  page; with a bound shortcut it renders nothing; nothing is written to any storage (the source
  scan in `manifest.test.ts:101-112` passes unmodified); `npm test` / `npm run lint` /
  `npm run build` pass.
- **ACs:** **AC-35** _(unit)_, **AC-7** _(unit half — no path treats unbound as failure)_

### T-9 · README and store listing

- **Track:** verify · **Files:** `README.md`, `store-listing.md`
- **Scope:** `README.md:25` ("Built for the keyboard") and `store-listing.md:50` describe only the
  `Tab` / `←` / `→` walk today. Both gain the shortcut, and both say it is rebindable at
  `chrome://extensions/shortcuts`. Neither describes the selection keys — those are group B.
- **Pitfall — do not quote a key-press count.** AC-31 requires §1.5's "twenty-seven" to be
  **measured** before it is quoted anywhere user-facing, and it is not measured (it belongs to group
  B and is not in this plan's scope). Confirmed by inspection: no unit here produces or needs that
  figure, so the constraint is met by writing copy that does not reach for it. If a draft of this
  copy quotes any per-row cost, stop and measure first.
- **Pitfall:** the permission lines are not touched. `manifest.test.ts:37-48` scans both files for
  permission names, and `PRIVACY.md` / `store-assets/privacy-policy.html` stay out of the diff.
- **DoD:** both files describe the shortcut and the rebinding route; the five-file mirror test
  passes unmodified; no key-press figure appears in either.
- **ACs:** **AC-32** _(manual review)_

### T-10 · The rest of the manual sweep

- **Track:** verify · **Files:** none (results into `plans/MANUAL-SWEEP-SPEC-05.md` §C–§D)
- **Scope:** everything left that a real browser has to answer — AC-38 on the anchor tab and the
  float (the panel was T-5), AC-12 confirmed by typing in each surface, AC-13's screen-reader pass,
  AC-28's manual half at the float's ~400 px width, and E-4's privileged-page case.
- **E-9 is the one to watch in the float:** `float.ts:330-334` appends the app's iframe after
  dressing the window, so the app may not be mounted when the float is first painted, and focus has
  to cross into the iframe's document (C-7).
- **DoD:** §C and §D of the sweep document are filled in. If the side panel does not take document
  focus, that is recorded as a **platform limitation** with the caret's behaviour on first focus
  noted, per AC-38's stated fallback — it is not a defect to fix, and nothing may be added to force
  or fake focus.
- **ACs:** **AC-38** _(anchor, float)_, **AC-12** _(manual)_, **AC-13** _(SR pass)_,
  **AC-28 as it applies to §5.2** _(manual)_, E-4, E-9

## 4. Sequencing

T-0 → T-1 → T-2 → T-3 → T-4 → **T-5 (gate)** → T-6 → T-7 → T-8 → T-9 → T-10.

Single-agent and sequential, so each unit leaves the tree building and every step of the CI gate —
`npm run lint`, `npm run test`, then `npm run build` (`.github/workflows/ci.yml:41-52`) — green.
Two orderings are load-bearing rather than tidy: **T-0 before T-2**, because AC-5's baseline stops
existing once the key is declared; and **T-5 before T-6**, because if the command cannot open the
panel at all then item 2 is being built for a surface the key never reaches, and T-4 changes shape.

## 5. Test plan

- **Existing suites must pass unmodified**, except for the three edits this plan names explicitly:
  `manifest.test.ts` gains AC-1/AC-4/AC-37 assertions, `anchor.test.ts`'s `openAnchorTab` block
  moves to `anchorTab.test.ts`, and `TabDisplay.test.tsx` drops a `focus={false}` prop that no
  longer exists. Run `npm run test` (Vitest, `src/**/*.test.{ts,tsx}`).
- **New tests:** `src/worker/openSurface.test.ts` (branches, call order, static AC-36 check),
  `src/App.test.tsx` (initial focus, three hosts, `↓`), `src/lib/ShortcutNotice.test.tsx`,
  `src/lib/anchorTab.test.ts` (moved).
- **`npm run build` is not optional and its exit code is what to read.** Test files live under
  `src/` and `tsconfig.json` includes `src`, so `tsc` type-checks them; twice in this repository a
  green suite sat on top of a build that failed, and once a `grep` in an `&&` chain masked the real
  status.
- **What no test here can reach**, and why the sweep document exists: whether a side panel takes
  document focus when opened programmatically, whether declaring a `commands` key changes the
  install warning, whether the suggested chord actually binds, and what the float does when focus
  has to cross an iframe boundary.

## 6. Risks

| # | Risk | Where it shows up |
| - | ---- | ----------------- |
| R-1 | C-8 is wrong for the shipped Chrome and `sidePanel.open()` rejects from the command. Presents only as "the key did nothing". | T-5 step 2 — the gate exists for this. AC-8's fallback is the pre-written answer. |
| R-2 | A repeat press whose open rejects opens an anchor tab the user did not ask for. | T-5 step 3, three presses from three states. |
| R-3 | The side panel does not take document focus, so AC-12 is true in jsdom and false in Chrome. | T-5 step 4 and T-10. The fallback is specified in advance (AC-38); do not invent one under pressure. |
| R-4 | `crx()` drops the `commands` key at packaging. | T-2's `dist/manifest.json` check. |
| R-5 | The `App` render harness turns out to be the expensive part of T-6 — nothing has ever mounted it. | Budgeted in T-6; it is enabler cost, not focus cost. |
| R-6 | The `tab` argument is not always delivered to the listener. Untested by any source in this repo. | Branch 3 in T-4 costs one line; T-5 observes whether it is ever taken. |

## 7. Traceability — all 24 group-A criteria

| AC    | Unit(s)    | AC    | Unit(s)     | AC    | Unit(s)     |
| ----- | ---------- | ----- | ----------- | ----- | ----------- |
| AC-1  | T-2        | AC-11 | T-6         | AC-32 | T-9         |
| AC-2  | T-4, T-5   | AC-12 | T-6, T-10   | AC-34 | T-4         |
| AC-3  | T-4, T-5   | AC-13 | T-6, T-10   | AC-35 | T-8         |
| AC-4  | T-2, T-5   | AC-14 | T-7         | AC-36 | T-4         |
| AC-5  | T-0, T-5   | AC-15 | T-6         | AC-37 | T-2         |
| AC-6  | T-2        | AC-16 | T-6         | AC-38 | T-5, T-10   |
| AC-7  | T-5, T-8   | AC-28 | T-6, T-10   | AC-39 | T-4         |
| AC-8  | T-4        |       | _(§5.2 only)_ |       |             |
| AC-9  | T-3        |       |             |       |             |
| AC-10 | T-4        |       |             |       |             |

Every group-A criterion maps to at least one unit, and every unit except T-1 traces back to at
least one criterion. T-1 is an enabler and says so.

## 8. Criteria that cannot be met as written

Recorded here rather than discovered mid-implementation.

**Resolved 2026-09-29, before approval.** Items 1 and 2 were put to the user and the spec was
amended: AC-3 now requires the already-open surface to be *left intact* rather than focused, and
AC-36 now forbids what actually spends the activation — no `await`, no `.then()`, no
`sendMessage`, no other `chrome.*` call before the open — so AC-39 survives. Item 3's risk was
accepted rather than weakening AC-8, and is recorded in the spec as R-1 with the sweep as its
observation point. The original findings are kept below as written, because the reasoning is what
makes the amendments reviewable.

1. **AC-3, the focus half — not satisfiable.** "The system SHALL focus that surface" has no API
   behind it when the surface is an already-open side panel: Chrome exposes no way to ask whether
   the panel is open and no way to move focus into it. What *is* satisfiable and is tested is the
   rest of the criterion — no second copy, no close, no reopen, identical on every repeat — which
   holds because `sidePanel.open()` on an open panel leaves it open. That last clause is the
   expected behaviour, not a documented one; T-5 step 3 observes it rather than asserting it.
   **Recommendation:** amend AC-3 to require the already-open state to be *preserved* rather than
   *focused*, and record the missing focus API as a platform limitation.
2. **AC-36 and AC-39 are mutually exclusive as written.** AC-36's Verify asks for "a test that
   fails if the call is not the first statement"; AC-39 requires a synchronous branch on the active
   tab, which is a statement, before it. Only one can hold. D-1 takes AC-36's first clause — no
   `await`, no message round trip, no other `chrome.*` call before the open — which is what actually
   protects the activation, and keeps AC-39. **If the literal reading is preferred, AC-39 must be
   dropped**; it cannot be had both ways.
3. **AC-5, AC-38 and AC-7's manual half are not automatable at all, and AC-5 is not automatable
   *retrospectively*.** A test that reads `manifest.json` cannot see an install warning, and the
   comparison needs a "before" that stops existing the moment T-2 lands. Hence T-0. If T-0 is
   skipped, AC-5 cannot be met on this branch — only by rebuilding from `main`.
4. **AC-12's trigger is only half reachable in jsdom.** It is keyed to "the document first receives
   focus", and jsdom reports `document.hasFocus()` true, so the mount path is testable and the
   first-focus path is exercised only by a synthesised event. The real answer is AC-38's
   measurement. Stated so the unit test is not mistaken for proof.
5. **AC-7 and AC-35 read as contradictory and are not.** AC-7 forbids surfacing an error when the
   key is unbound; AC-35 requires the product to say the key is unbound. D-6 settles it: an
   informational, state-derived, non-dismissible strip is not an error path. Flagged so an
   implementer and a reviewer do not each pick a different side of it.
6. **AC-31 does not arise in group A — confirmed, not assumed.** No unit here produces or quotes a
   per-row key-press cost; T-9's pitfall keeps the derived "twenty-seven" out of the user-facing
   copy. It remains open against group B.

## 9. Explicitly out of scope

Group B in its entirety: AC-17…AC-27, AC-29…AC-31, AC-33, and everything under
`src/lib/Tabs/selection/`. It is blocked on SPEC-04 being implemented and its criteria are written
against SPEC-04's post-rework row structure (§1.9). Also out: `src/lib/float.ts` (NG-9, C-11 — no
command can open the float), `src/lib/Tabs/elements/rowControls.ts` (NG-6 — the walk does not
change), `PRIVACY.md` and `store-assets/privacy-policy.html` (C-9 — the `commands` key is not a
permission), and any second command (PI-6, deferred; C-10 caps the extension at four suggested
shortcuts).
