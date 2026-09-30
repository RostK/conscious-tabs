# SPEC-04 — Accessible rows (clearing `nested-interactive`)

|                |                                                                                                                                                                                                                                                                        |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Spec ID**    | SPEC-04                                                                                                                                                                                                                                                                |
| **Date**       | 2026-09-28                                                                                                                                                                                                                                                             |
| **Module**     | `tab-list` (`src/lib/Tabs/Tab/`, `src/lib/Tabs/TabsGroup/`, `src/lib/Tabs/Window/`, `src/lib/Tabs/elements/rowControls.ts`, `src/lib/Tabs/elements/DragHandle.tsx`, `src/lib/Tabs/elements/TabGrid.tsx`, `src/lib/Tabs/Tabs.tsx`) — with edges into `ui-shell` (`src/App.tsx`) |
| **Status**     | **approved 2026-09-29**, **amended 2026-09-29** (AM-1 on AC-29, AM-2 on AC-32/AC-33 — §13.2). All eight clarifications closed; see §13.                                                                                                                                  |
| **Supersedes** | —                                                                                                                                                                                                                                                                      |

---

## 1. Problem

Every row in the tab list is an interactive element that contains further interactive elements.
A tab row is a `<div role="button" tabindex="0">` holding three or four real `<button>`s — select,
mute, reorder, close. axe-core's `nested-interactive` rule fires on each one. The rule is correct:
a control whose role says "my contents are presentational" cannot also be a container of controls,
and assistive technology reaches the inner buttons regardless of what the tab order says.

This was deliberately deferred during the 0.1.0 accessibility round, because the honest repairs
looked like they all changed what the keyboard does, and that is a design decision rather than a
lint fix.

### 1.0 The central claim: this names a contract the app already implements

That deferral was based on a premise that turns out to be false, and the evidence is in this
repository rather than in the literature. **Read `src/lib/Tabs/elements/rowControls.ts` in full
before planning any of this.** It already implements the APG **toolbar** keyboard contract by hand:

- `useRowKeys` is a roving walk. Left/Right move along `[row, ...row.querySelectorAll("[data-row-control]")]`,
  with the row itself as stop 0, and Tab moves between rows.
- `rowControlProps` puts every row control at `tabIndex: -1`, so the row is one Tab stop — measured
  at exactly one per row, at 2, 5, 8 and 20 rows (§1.3).
- `dragActive` / `setRowDragActive` hand the arrow keys to @dnd-kit for the duration of a drag and
  take them back afterwards, with a comment recording the two alternatives that were tried and why
  each was worse.

That is one Tab stop in, arrows among the controls, Tab out — the toolbar pattern — plus a working
resolution of the arrow-key collision that **no published source reconciles** (§1.6). The app has
had the behaviour since 0.1.0. What it has never had is the *roles and names* that tell assistive
technology the behaviour is there.

**So this spec is naming an existing contract, not inventing one.** That changes the risk profile of
the whole change: the work is roles, names and DOM order, not keyboard semantics. The keyboard walk
a sighted keyboard user performs today is the walk they perform afterwards. Every §5.2 criterion
below is therefore a *pin* on current behaviour rather than a request for new behaviour — with two
exceptions, stated plainly so nobody mistakes them for free:

1. **Stop 0 stops being the row and becomes a button.** Today the Tab stop is the row container
   (`<div role="button">`) and Enter on it activates the tab. Under a toolbar the container is not
   focusable, so the row's primary action becomes a real, named button that occupies position 0 of
   the walk. Stop *count* is unchanged; what is focused at that stop is not.
2. **The two `aria-hidden` expand indicators become real controls.** On group and window rows the
   chevron is decorative today because the row's own click expands (E-12). A non-interactive row
   container has nowhere to put that click, so the chevron becomes the primary-action button in
   point 1.

### 1.1 The audit numbers, re-measured

A 2026-09-27 audit is recorded as "15 violating nodes across ~11 files", and `LEARNINGS.md`
(2026-09-24) carries "15 `nested-interactive` violations … axe-core 4.10.2 … touches 11 files".
Both were re-measured on **2026-09-28** by running axe-core against the real rendered tree
(`TabsView` under `SelectionProvider`, jsdom, the repo's own `chromeStub`). What was found:

| Fixture rendered                                 | Rows | `nested-interactive` nodes | Native Tab stops |
| ------------------------------------------------ | ---- | -------------------------- | ---------------- |
| 1 window (implicit), 5 plain tabs                | 5    | **5**                      | 5                |
| 1 window (implicit), 20 plain tabs               | 20   | **20**                     | 20               |
| 2 windows, 1 group, 6 tabs (1 audible, 1 muted)  | 8    | **8**                      | 8                |
| 1 window, 1 collapsed group, 2 tabs              | 2    | **2**                      | 2                |

**The count is not 15. It is exactly one per rendered row, and it scales linearly with the list.**
"15" was the number of rows on screen when someone ran the audit; quoting it as a defect size is
misleading, because a user with eighty tabs open has eighty violations. The rule's node count is a
census of rows, not a backlog.

Two further corrections to the received numbers:

- The installed axe-core is **4.13.0**, not 4.10.2 — and it is present only as a transitive
  dependency of `eslint-plugin-jsx-a11y`. **No test in this repository imports or runs axe.**
  `grep -rn "axe"` across `src/` returns nothing. The claim that "axe-core is already wired into the
  suite" is false; the audit must have been run ad hoc. DEC-7 wires one in for real.
- "~11 files" is close but understates it. §1.4 lists the real set.

### 1.2 Why the rule fires, and what actually clears it

axe's `nested-interactive` is only **applicable** to an element whose own role is one that ARIA
declares `childrenPresentational: true`. Read out of the installed bundle
(`node_modules/axe-core/axe.js`, 4.13.0), those roles are:

> button, checkbox, img, math, menuitemcheckbox, menuitemradio, meter, option, progressbar, radio,
> scrollbar, separator, slider, switch, tab

matching ARIA 1.2 §7.1 (<https://www.w3.org/TR/wai-aria-1.2/#childrenArePresentational>) and
ACT rule `307n5z` (<https://act-rules.github.io/rules/307n5z>). **`list`, `listitem`, `row`,
`gridcell`, `grid`, `treegrid` and `link` are not on that list.** A row that is not itself a
`button` is outside the rule entirely.

The failure message axe returns here is worth quoting verbatim, because it forecloses the cheap fix
this codebase already tried:

> Using a negative tabindex on an element inside an interactive control does not prevent assistive
> technologies from focusing the element (even with `aria-hidden="true"`).

`rowControls.ts` puts every row control at `tabIndex: -1` and reaches it with Left/Right. That
genuinely buys what it claims — measured, 20 tab rows cost 20 Tab stops rather than 80 (§1.3) — but
it is not, and was never, an answer to this rule.

### 1.3 The tab-stop budget, measured

The comment in `rowControls.ts` says "four stops, which is eighty in a list of twenty tabs". That is
exactly right, confirmed by counting the rendered DOM:

| Fixture                | Rows | `[data-row-control]` | Stops today | Stops if every control were focusable |
| ---------------------- | ---- | -------------------- | ----------- | ------------------------------------- |
| 5 plain tabs           | 5    | 15                   | **5**       | 20                                    |
| 20 plain tabs          | 20   | 60                   | **20**      | 80                                    |
| 2 windows, group, 6 tabs | 8  | 27                   | **8**       | 35                                    |

This is the number any proposal has to argue against. It is also the number that makes the "just use
plain buttons" option expensive, and the number that made someone reach for `tabIndex: -1` in the
first place.

### 1.4 What carries the row role today

There is **no list semantics anywhere in this app**. `grep` for `<ul>`, `<li>`, `role="list"` and
MUI `<List>` across `src/` returns nothing. Rows are MUI `Grid` items inside a `Grid container`, and
each row's `ListItemButton` renders as `<div role="button" tabindex="0">`. The `*ListItem*` in the
component names describes a visual idiom, not an accessible structure. So "give the rows `listitem`
semantics" is not a demotion of an existing structure — it is adding one that was never there.

The hierarchy is likewise visual only: `GroupListItem` renders its group header and then its tabs as
**siblings** in the same flat `Grid`. Windows contain groups contain tabs in `types.ts` /
`useTabsStructure.ts`, but nothing in the DOM says so.

### 1.4a Where the drag handle actually sits

APG's toolbar pattern says: *"avoid including controls whose operation requires the pair of arrow
keys used for toolbar navigation. If unavoidable, include only one such control and make it the last
element in the toolbar."* The drag handle is exactly that control — @dnd-kit's keyboard sensor
consumes all four arrows once a drag is live.

There is exactly one such control per row, which satisfies the first half. The DOM order was
measured on 2026-09-29, reading `[data-row-control]` in document order:

| Row kind                 | Walk order (stop 0 is the row today, the primary button after this change) | Drag handle |
| ------------------------ | -------------------------------------------------------------------------- | ----------- |
| Tab, silent              | select → **reorder** → close                                               | 2 of 3, **Close follows it** |
| Tab, audible or muted    | select → mute → **reorder** → close                                        | 3 of 4, **Close follows it** |
| Group                    | select → **reorder** → actions menu → close                                | 2 of 4, **two controls follow it** |
| Window                   | select → close → switch-to-window                                          | none — window rows are not draggable |

**So the guidance is violated today in both row kinds that have a drag handle.** This is the one
place the chosen pattern demands a change the app does not already make, and it is a reordering of
DOM siblings, not a behaviour change. AC-30.

Control counts per row, for APG's "3 or more controls" threshold — all row kinds clear it:
4 on a silent tab row, a window row and a collapsed-group row; 5 on an audible tab row and a group
row. Rows are **not** uniform (E-11).

| File                                          | What it carries                                                    |
| --------------------------------------------- | ------------------------------------------------------------------ |
| `src/lib/Tabs/Tab/TabDisplay.tsx`             | tab row (`ListItemButton`), select, mute, close, `autoFocus`       |
| `src/lib/Tabs/Tab/TabListItem.tsx`            | draggable wrapper, pointer-drag listener, drop placeholder         |
| `src/lib/Tabs/TabsGroup/GroupDisplay.tsx`     | group row (`ListItemButton`), collapse-on-click, chip reservation  |
| `src/lib/Tabs/TabsGroup/GroupListItem.tsx`    | group select-all, drag handle, actions menu, close-all, indicator  |
| `src/lib/Tabs/Window/WindowDisplay.tsx`       | window row (`ListItemButton`), indicator, "switch to this window"  |
| `src/lib/Tabs/Window/WindowListItem.tsx`      | window select-all, close-window                                    |
| `src/lib/Tabs/elements/rowControls.ts`        | **the keyboard model itself** — Left/Right walk, reveal, drag flag |
| `src/lib/Tabs/elements/DragHandle.tsx`        | the keyboard drag activator and dnd-kit's ARIA attributes          |
| `src/lib/Tabs/elements/ItemButton.tsx`        | the control primitive every row control is built from              |
| `src/lib/Tabs/elements/TabGrid.tsx`           | the per-row container element                                      |
| `src/lib/Tabs/Tabs.tsx`                       | the `Grid container` that would have to become the list/grid       |
| `src/views/TabsView/index.tsx`                | mounts window rows                                                 |
| `src/views/SearchView/index.tsx`              | the **second** consumer of `Tabs`, with `expandedGroups`           |
| `src/App.tsx`                                 | `DndContext` sensors, `setRowDragActive`, the `DragOverlay` row    |
| `src/lib/Tabs/CurrentTab/index.tsx`           | not a row, but the third consumer of `DragHandle`                  |

Eleven of those carry the role or its controls; fifteen are in the blast radius. Three existing test
files pin the current behaviour: `Tab/TabDisplay.test.tsx`, `TabsGroup/GroupDisplay.test.tsx`,
`views/TabsView/TabsView.test.tsx`.

### 1.5 A second defect found in the same files — fixed, and not this spec's work

Running the full ruleset rather than just `nested-interactive` turned up **6 `image-alt` violations,
impact `critical`** — every `<img>` inside `TabAvatarsDisplay`'s `AvatarGroup` on a window row.
`TabAvatarsDisplay.tsx` passed `src={faviconUrl(...)}` to MUI `Avatar` without an `alt`, so MUI
emitted a bare `<img src>`. `TabFavicon.tsx` carried `alt=""`; the avatar stack did not.

**Already repaired and shipped, separately from this spec** (PR #11, branch
`fix/avatar-favicon-alt`): `alt=""` added in `TabAvatarsDisplay.tsx`, guarded by a new
`src/lib/Tabs/elements/TabAvatarsDisplay.test.tsx`, and **SPEC-03 NFR-4 corrected in place** with a
dated note — it had asserted "favicons … already carry `alt=''`" as a property of code that spec had
not looked at. Recorded here only because the axe run that drafted this spec is what found it. It is
not in this spec's scope and must not be re-proposed.

### 1.6 The collision nobody has written down

Keyboard reordering is @dnd-kit. `src/App.tsx` builds `useSensor(KeyboardSensor)` with **default
options**, which means Space and Enter start and end a drag, Escape cancels, and all four arrows
move the dragged item (<https://dndkit.com/guides/accessibility>).

`rowControls.ts` already collides with that and already works around it, with a module-level
`dragActive` flag that `App`'s `DndContext` sets, so the row's Left/Right walk yields to dnd-kit's
arrows while a drag is live. The comment there documents both alternatives that were tried and
rejected. **Any model that gives arrows a navigation meaning inherits this collision and makes it
larger** — a `grid` wants Up/Down/Left/Right/Home/End, and dnd-kit wants all four arrows.

There is an unanswered first-party report of exactly this collision
(<https://github.com/clauderic/dnd-kit/discussions/1447>). dnd-kit's own documented mitigation is
architectural — scope the listeners to a dedicated handle rather than the row — which is what
`DragHandle` already does. **No source reconciles grid arrow navigation with a drag sensor's
arrows.** React Aria and Dragon Drop both use an explicit pick-up toggle after which arrows are
reassigned, which is structurally the same idiom as APG's Enter/F2 mode switch — but that
connection is inference, not documented guidance, and this spec records it as such. ARIA's older
answer, `aria-grabbed` / `aria-dropeffect`, was deprecated for being ignored by screen readers
(<https://github.com/w3c/aria/issues/1447>).

### 1.7 The decision: each row is a `toolbar` inside a `listitem`

**Chosen.** The list container carries `list` semantics, each row is a `listitem`, and the row's
controls live in a `toolbar` inside it. The toolbar holds the primary-action button *and* the
secondary controls — select, mute where present, reorder, close, the group actions menu — so the row
costs **one Tab stop, which is exactly what it costs today**.

Why this clears the rule, verified against the installed axe-core 4.13.0 as well as the spec:
`toolbar` and `listitem` are both absent from the `childrenPresentational` list in §1.2, so
`nested-interactive` is not even *applicable* to them. `toolbar` has **no Required Context Role** and
**no Required Owned Elements**, so it is legal inside a `listitem`
(<https://www.w3.org/TR/wai-aria-1.2/#toolbar>, <https://www.w3.org/TR/wai-aria-1.2/#listitem>).
The rule is cleared by construction, not by suppression.

What APG asks of a toolbar, and what this list already does
(<https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/>):

| APG requirement                                                     | Status here                                                                                      |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| One Tab stop into the widget; Tab/Shift+Tab move out                | **Already true** — `rowControlProps` holds controls at `tabIndex: -1`; measured 1 stop per row.   |
| Arrows move among the controls                                      | **Already true** — `useRowKeys` walks `[data-row-control]` on Left/Right.                         |
| Roving tabindex (used in APG's own worked example)                  | **Already true** in shape; the roving element becomes a button rather than the row (§1.0).        |
| Use `toolbar` only for a group of **3 or more** controls            | **Satisfied by every row kind** — measured 4 on a plain tab, window and collapsed-group row, 5 on an audible tab row and a group row (§1.4a); 4 on a search-result group row, which has no primary action (AC-32). |
| Each toolbar needs its own label when there is more than one        | **New obligation.** Nothing names a row today. A label on *each* — ARIA says nothing about uniqueness, which is why AC-29 was amended on 2026-09-29. AC-29. |
| "Avoid controls whose operation requires the arrow-key pair. If unavoidable, include only one and **make it the last element in the toolbar**." | **Violated today, in both row kinds that have one.** AC-30. |

That last row is the one the repo had to be measured for, and it is the only place the chosen
pattern demands a change to DOM order — see §1.4a.

### 1.7a The options considered, and why toolbar beat them

Kept because the comparison is the justification, and a future session should not have to redo it.



| Option                                                 | Clears the rule? | Keyboard contract it takes on                                                                                                                 | Tab stops (20 tabs) | Known risk                                                                                                                              |
| ------------------------------------------------------ | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **A. Non-interactive `listitem` rows, primary action becomes a real button** | Yes — `listitem` is not `childrenPresentational` | None. Plain Tab order, native buttons, nothing to invent.                                                                                     | **80** (measured)   | Quadruples the walk. Loses the "one stop per row" property the current model was built to get, and the row itself stops being clickable by keyboard. |
| **B. Single-column `grid` / `row` / `gridcell`**        | Yes              | APG grid in full: arrows, Home/End, Ctrl+Home/End, one Tab stop for the whole widget — **and**, because a cell holds more than one widget, an explicit Enter/F2 mode toggle with in-cell arrow movement. <https://www.w3.org/WAI/ARIA/apg/patterns/grid/> | **1** for the list  | APG permits a single-column layout grid, but Adrian Roselli's moderated JAWS testing found real users confused by it and names "reducing tab stops" as insufficient justification (<https://adrianroselli.com/2020/07/aria-grid-as-an-anti-pattern.html>). NVDA <https://github.com/nvaccess/nvda/issues/13392> shows arrow navigation in a grid whose cells contain focusable controls dropping into character mode and not moving real focus — against APG's own example. |
| **C. `treegrid`**                                       | Yes              | Everything in B, plus Left/Right for collapse/expand and `aria-level` / `aria-posinset` / `aria-setsize` / `aria-expanded` per row.  <https://www.w3.org/WAI/ARIA/apg/patterns/treegrid/> | **1** for the list  | The only option that expresses the real window > group > tab hierarchy, and the heaviest. Inherits every B risk plus a second arrow meaning, on top of dnd-kit's four. |

`listbox` is ruled out by APG itself: it "does not provide an accessible way to present a list of
interactive elements … see the Grid Pattern" (<https://www.w3.org/WAI/ARIA/apg/patterns/listbox/>).
It is named here only so nobody proposes it again.

All three were rejected against the chosen toolbar shape. **A** is the same structure minus the
toolbar, and its cost is the measured 80 Tab stops at 20 tabs — it throws away a property this app
already has. **B** and **C** buy a stop count the app already achieves, and pay for it with the full
APG grid contract (including the Enter/F2 mode toggle, because our cells hold more than one widget),
a documented AT support gap, and a second arrow-key meaning stacked on top of dnd-kit's four. The
**VS Code two-stop shape** — `listitem` row, primary action a plain button, secondary controls in a
toolbar — was also rejected *for now*, because it doubles the stop count; it is retained as the
named fallback in §13.1, with a trigger.

On the focus-management mechanic: **roving `tabindex`**, which is what the app already does.
`aria-activedescendant` is unreliable in NVDA/Narrator/VoiceOver and ignored by mobile screen
readers (<https://sarahmhigley.com/writing/activedescendant/>, 2024-10-16), and roving tabindex
moves real focus, so the browser scrolls it into view for free — which matters in an eighty-row list.

---

## 2. Goals

- **G-1** Rows stop being interactive containers, so `nested-interactive` reports zero nodes at any
  list size — cleared by structure, not by suppression.
- **G-2** Every action a pointer can take on a row stays reachable by keyboard alone, with a name
  that says which tab it acts on.
- **G-3** The list finally tells assistive technology how many rows there are and where in them the
  user is. It says neither today.
- **G-4** Keyboard reordering keeps working *unchanged*, with the arrow-key collision (§1.6) written
  down and pinned by a test rather than surviving on a comment.
- **G-5** One keyboard model across the side panel, the anchor tab and the float, down to ~400px.
- **G-6** The suite gains an automated check that fails if a row becomes an interactive container
  again — the defect is prevented from returning, not just removed once.

## 3. Non-goals

- **NG-1** Disabling or excluding the `nested-interactive` rule, or clearing it with `aria-hidden`
  or `tabindex="-1"` on row controls. axe's own message (§1.2) says those do not work; adopting one
  would be a false pass.
- **NG-2** Any change to what the rows *do*. Activate, close, mute, select, reorder, collapse and
  "switch to this window" keep their present effects and their present pointer behaviour.
- **NG-3** Remembering a focused row, an expansion state or a keyboard position across a session.
  SPEC-01 **AC-23** forbids `chrome.storage`, `localStorage`, `sessionStorage`, IndexedDB and
  cookies outright, and `src/test/manifest.test.ts` enforces it by scanning the source.
- **NG-4** Any new manifest permission. The array stays exactly the five of SPEC-03 AC-6, with no
  `host_permissions` and no `content_scripts` (SPEC-01 NG-3).
- **NG-5** Visual redesign. Colours, spacing, the hover/focus reveal, the tail mask and the group
  chip reservation are out of scope except where a structural change forces a control to become
  permanently visible.
- **NG-6** The `CurrentTab` card, `AudioTabs` and the `SelectionToolbar` as *rows*. None of them is
  a `ListItemButton` and none produces a `nested-interactive` node — measured. They are in scope
  only where they consume something this spec changes (`DragHandle`, selection semantics).
- **NG-7** Drag-and-drop by *pointer*. Unchanged.
- **NG-8** A settings toggle between keyboard models. One model, chosen here.
- **NG-9** Changing the keyboard walk itself. Tab between rows, Left/Right within a row, no wrapping
  at the ends — all exactly as `useRowKeys` behaves today (§1.0). **Home/End within a row are out of
  scope**: APG lists them as optional, a row has only 4–5 controls so they save at most three
  presses, and binding them per row would shadow the page-level meaning a user in a scrollable list
  of eighty rows expects. **Left/Right do not wrap**, because they do not wrap today
  (`if (next < 0 || next >= stops.length) return;`) and stopping at the ends is how a
  non-sighted user feels where a row begins and ends.
- **NG-10** The `image-alt` defect in `TabAvatarsDisplay`. Fixed and shipped separately (§1.5).
- **NG-11** Announcing an aggregate selection count. Proposed as PI-7, not required here.
- **NG-12** Expressing the window > group > tab hierarchy to assistive technology. The list stays
  flat, as it is today (AC-4). `treegrid` was the only candidate that carried it, and it lost.

## 4. User stories

- **US-1** As a screen-reader user, I want the tab list to announce itself as a list of a known
  length and to tell me which item I am on, so that I can judge how far through eighty tabs I am
  instead of walking blind.
- **US-2** As a keyboard-only user, I want to close, mute, select and reorder a tab without a mouse
  and without being told by the interface that those controls are not really there.
- **US-3** As a keyboard-only user with eighty tabs open, I want to get *past* the list to the
  control bar in a sane number of key presses.
- **US-4** As a screen-reader user reordering tabs, I want picking a tab up and putting it down to
  be unambiguous, and I do not want the key that moves the list to also move the tab.
- **US-5** As a maintainer, I want the build to fail the next time a row becomes a button wrapped
  around buttons, because this defect has already survived one accessibility round.

---

## 5. Acceptance criteria

Every criterion is one testable statement. AC-1…AC-27 were written while the structure was open;
their ids and `Verify:` hints are unchanged, and the ones that were blocked now name the chosen
structure. AC-28…AC-37 are the criteria the toolbar decision added.

### 5.1 The defect is gone, and gone by construction

- **AC-1** _(Must)_ WHEN axe-core is run against the rendered tab list, it SHALL report **zero**
  `nested-interactive` nodes, for every list size.
  **Verify:** automated — run axe over a rendered tree containing at least one window row, one group
  row and three tab rows (one plain, one audible, one muted), and over a 20-plain-tab tree; assert
  `violations` for that rule is empty in both. Today those same two fixtures measure 8 and 20.
- **AC-2** _(Must)_ The rule SHALL be cleared by changing the rows' roles or their contents, and
  SHALL NOT be cleared by an axe rule exclusion, by `aria-hidden` on a row control, or by relying on
  `tabindex="-1"`.
  **Verify:** unit — assert no axe configuration in the repo disables the rule; assert no element
  carrying `data-row-control` (or its successor) also carries `aria-hidden`.
- **AC-3** _(Must)_ The list SHALL expose to assistive technology both the total number of rows and
  the position of the focused row within them, by giving the list container `list` semantics and
  each row `listitem` semantics. _(Today it exposes neither — §1.4.)_
  **Verify:** unit — `getByRole("list")` resolves, and `getAllByRole("listitem")` returns one per
  rendered row for the 2-, 5-, 8- and 20-row fixtures; manual screen-reader pass per AC-27.
- **AC-4** _(Must)_ The window > group > tab hierarchy SHALL NOT be expressed structurally; a
  window's and a group's descendants remain siblings in one flat list, as they are today (§1.4).
  **Verify:** Non-goal NG-12 records this, and a unit test asserts the list is flat — no nested
  `list` inside a `listitem`. _(`treegrid` was the only candidate that expressed it, and it was
  rejected in §1.7a. Expressing depth via `aria-level` on non-tree roles is not valid ARIA.)_

### 5.2 Everything stays reachable, and says what it is

- **AC-5** _(Must)_ WHILE focus is inside the list, every control of the focused row — activate,
  select, mute where present, reorder, close, the group actions menu, "switch to this window", and
  collapse/expand — SHALL be reachable using the keyboard alone.
  **Verify:** unit — a `userEvent` key walk over one row of each kind, asserting
  `document.activeElement` visits each control; measured against the census in §1.3 so no control is
  silently dropped.
- **AC-6** _(Must)_ Every keyboard-reachable control SHALL have a non-empty accessible name that
  identifies its subject.
  **Verify:** automated — axe `button-name` and `aria-command-name` report zero nodes; plus a unit
  assertion that each tab-row control's accessible name contains that tab's title.
- **AC-7** _(Must)_ WHEN the keyboard model moves focus, the newly focused element SHALL be scrolled
  into view.
  **Verify:** unit — assert focus lands on a real element (not only an `aria-activedescendant`
  pointer); manual in a list of eighty rows.
- **AC-8** _(Must)_ The keyboard model SHALL behave identically in the side panel, the anchor tab
  and the floating window.
  **Verify:** unit — the same key walk run under each host; manual at the float's ~400px width.
- **AC-9** _(Must)_ The number of Tab stops the list costs SHALL be asserted by a test, for a fixed
  fixture, so that the figure is a pinned fact rather than a claim.
  **Verify:** unit — count focusable stops for the 20-plain-tab fixture. Today: **20**. The
  all-controls-focusable alternative measures **80** (§1.3).
- **AC-10** _(Must)_ IF the chosen model makes any row control a permanent Tab stop that is hidden
  at rest, THEN that control SHALL become visible when it receives focus.
  **Verify:** unit — the existing `rowControlsSx` reveal-on-focus behaviour still fires; a control
  hidden by `opacity: 0` must not be a silent stop. _(`rowControls.ts` documents why
  `visibility: hidden` is never used here: it removes an element from `focus()` entirely, and fails
  intermittently.)_

### 5.3 Reordering survives the new model

- **AC-11** _(Must)_ WHEN the user presses the pick-up key on a row's drag activator, the app SHALL
  start a drag and SHALL NOT also perform the row's navigation or activation action.
  **Verify:** unit — the key raises dnd-kit's `onDragStart`, and the row navigation handler does not
  fire for the same event.
- **AC-12** _(Must)_ WHILE a keyboard drag is live, the arrow keys SHALL move the dragged item and
  SHALL NOT move row or control focus.
  **Verify:** unit — with a drag active, arrow presses change dnd-kit's translation and leave
  `document.activeElement` unchanged. _(The existing `dragActive` guard in `rowControls.ts` is the
  current form of this; it must survive, and must cover the new arrow meanings.)_
- **AC-13** _(Must)_ WHEN a keyboard drag ends or is cancelled, focus SHALL return to the control it
  started from.
  **Verify:** unit — assert `document.activeElement` after `onDragEnd` and after `onDragCancel`.
  _(This is why `ItemButton` forwards its ref to `setActivatorNodeRef`; that must not regress.)_
- **AC-14** _(Must)_ Reordering by pointer SHALL remain available from anywhere on the row.
  **Verify:** unit — the row's `onMouseDown` drag listener is still attached; existing DnD tests
  pass unmodified.
- **AC-15** _(Must)_ The keys that pick up, move, drop and cancel a drag SHALL be documented in this
  spec and SHALL be announced to the user by the application, not left to dnd-kit's defaults being
  guessed at.
  **Verify:** unit — a live region or announcement fires on pick-up and on drop; manual per AC-22.

### 5.4 Multi-select

- **AC-16** _(Must)_ The selected state of a row SHALL be conveyed to assistive technology by that
  row's select control reporting its own pressed/checked state, without relying on colour, on hover,
  or on the pointer. `aria-selected` SHALL NOT be used, and `aria-multiselectable` SHALL NOT be set.
  **Verify:** unit — assert the select control's accessible state and name on a selected row; assert
  no `aria-selected` or `aria-multiselectable` appears in the rendered list. _(Forced by AC-28:
  `aria-selected` is not supported on `toolbar` or on `listitem`, so setting it would be invalid
  ARIA. The per-row checkbox is already correct and already named.)_
- **AC-17** _(Must)_ WHEN a row's selection state changes, the change SHALL be perceivable without
  the user moving focus to discover it.
  **Verify:** unit — the control's accessible state or the row's state updates in place; manual.
- **AC-18** _(Must)_ Pointer selection semantics SHALL be unchanged: a plain click performs the
  row's primary action, a Ctrl/Cmd-click toggles selection and does nothing else.
  **Verify:** existing `TabDisplay.test.tsx` and `GroupDisplay.test.tsx` assertions pass unmodified.
  _(`GroupDisplay`'s early `return` after `onCtrlClick` is the fix for the two rows having disagreed
  about this once already.)_
- **AC-19** _(Must)_ Selecting every tab in a group or window SHALL remain a single control on that
  row, with a name that says which set it acts on.
  **Verify:** unit — accessible names on the group and window select-all controls are unchanged.

### 5.5 Nothing else regresses

- **AC-20** _(Must)_ The feature SHALL write nothing to `chrome.storage`, `localStorage`,
  `sessionStorage`, IndexedDB or cookies, preserving SPEC-01 **AC-23**.
  **Verify:** unit — `src/test/manifest.test.ts`'s source scan continues to pass unmodified.
- **AC-21** _(Must)_ The manifest's `permissions` array SHALL remain exactly
  `["sidePanel", "tabs", "tabGroups", "sessions", "favicon"]`, with no `host_permissions` and no
  `content_scripts` (SPEC-03 **AC-6**, SPEC-01 **NG-3**).
  **Verify:** unit — `src/test/manifest.test.ts`.
- **AC-22** _(Must)_ WHEN the list renders at ~400px, no row control SHALL be clipped, and no
  control SHALL overlap the row's text.
  **Verify:** manual at the float's width, plus the layout harness (`harness/`). _(The measured
  widths in `TabDisplay.tsx` — 60px and 96px of controls — and `GroupDisplay.tsx`'s 88.3px
  reservation are calibrated to today's control set; any change to that set invalidates them.)_
- **AC-23** _(Must)_ The hover/focus reveal of row controls, the tab-row tail mask and the group-row
  chip reservation SHALL keep their present behaviour.
  **Verify:** existing tests pass; `rowControlsSx`, `rowTailMaskSx` and `rowTailReserveSx` keep one
  definition each — the duplication that this file has already had to remove twice must not return.
- **AC-24** _(Must)_ A row's accessible name SHALL be composed from the tab's title and URL as text
  only, and neither SHALL be interpreted as markup or as an attribute-value boundary.
  **Verify:** unit — render a tab whose title contains `"><img src=x onerror=alert(1)>` and a URL
  containing `&`, `#` and a quote; assert the name is the literal text and that no element is
  created from it.

### 5.6 How this is verified at all

- **AC-25** _(Must)_ The test suite SHALL contain an automated accessibility check that fails when a
  row becomes an interactive container again.
  **Verify:** the check exists, runs under `npm test`, and fails when a row is reverted to
  `role="button"`. It SHALL be wired in through a **`devDependency`** (`vitest-axe` or equivalent),
  not by vendoring axe or by reaching into `eslint-plugin-jsx-a11y`'s transitive copy.
  _(Today there is no such check: axe-core 4.13.0 is present only transitively via
  `eslint-plugin-jsx-a11y`, and nothing in `src/` imports it — §1.1. NFR-6: test-only dependency,
  never in the shipped bundle.)_
- **AC-26** _(Must)_ This spec SHALL record what the automated check **cannot** prove, and SHALL
  require a manual screen-reader pass covering exactly those things.
  **Verify:** §11 names them; the manual result is recorded against AC-27.
- **AC-27** _(Must)_ A manual **NVDA + Chrome** pass SHALL be recorded on **all three surfaces** —
  side panel, anchor tab, and the ~400px float — before this spec may reach `implemented`, naming
  the NVDA version, the Chrome version, the surface, the date, the tester, and the result per
  scenario.
  **Verify:** a result block in this spec, in the style of SPEC-03 AC-4. NVDA + Chrome is the
  pairing the arrow-navigation defect in <https://github.com/nvaccess/nvda/issues/13392> was filed
  against, and the float is the surface no automated check can stand in for.

### 5.7 The toolbar structure

- **AC-28** _(Must)_ Each row's controls SHALL be contained in a single element with
  `role="toolbar"`, which SHALL sit inside that row's `listitem` and SHALL hold the row's
  primary-action button together with its secondary controls.
  **Verify:** unit — `getAllByRole("toolbar")` returns one per rendered row; each toolbar's
  `listitem` ancestor exists; each toolbar contains the row's full control census from §1.4a.
- **AC-29** _(Must)_ Every row toolbar SHALL have a **non-empty** accessible name derived from its
  row's subject, and two toolbars SHALL have distinct names **wherever their subjects are distinct**.
  Two rows with the same subject SHALL be permitted the same name.
  **Verify:** unit — collect every toolbar's accessible name for the mixed fixture; assert all are
  non-empty, that rows with distinct subjects have distinct names, and that AC-24's hostile-title
  case yields a literal-text name. Include two tabs open on the same URL with the same title and
  assert this does **not** fail.
  _(**Amended 2026-09-29.** The original demanded names be both subject-derived *and* distinct from
  every other toolbar. Those two halves conflict: two tabs open on the same page have the same title
  and the same URL, so they have the same subject and cannot be told apart by any subject-derived
  name. That is not an exotic case — it happens whenever someone duplicates a tab. The requirement
  was unsatisfiable for a case that occurs constantly, and the distinctness half was **stricter than
  the standard it exists to satisfy**: ARIA says only "Authors MUST supply a label on each toolbar
  when the application contains more than one toolbar"
  (<https://www.w3.org/TR/wai-aria-1.2/#toolbar>) — a label on each, with nothing said about
  uniqueness. So this is a correction, not a concession.)_
  _(Still binding: the name SHALL NOT be the literal string `"Actions for {title}"` on a group row.
  `GroupListItem` already gives its `MoreVert` button the name `Actions for group {title}`, measured
  in §1.4a, and two controls in one row answering to the same phrase is worse than no name.)_
  - **Note, not a requirement.** A **window** row's name may take an ordinal ("Window 2 of 3"), which
    is how two windows holding five tabs each are told apart — `WindowDisplay` names its switch
    button `Switch to this window, ${tabs.length} tab(s)` today, so two five-tab windows are
    currently indistinguishable by name. That is a genuine improvement and the plan may take it.
  - **Tab rows do not take a position in their name**, deliberately. `index` is part of a tab's
    identity (`TabItem.index`) and changes whenever anything before it closes or moves, so a
    positional name would make a row rename itself for reasons that have nothing to do with that
    row — a screen-reader user would hear churn caused by a tab they never touched. Two tabs on the
    same page are allowed to share a name instead; AC-29 permits it.
- **AC-30** _(Must)_ WHERE a row has a drag handle, that handle SHALL be the **last** control in its
  toolbar's DOM order.
  **Verify:** unit — for a tab row and a group row, assert the drag handle is the final
  `[data-row-control]` in document order. _(Today it is 2nd of 3, 3rd of 4 and 2nd of 4 — §1.4a.
  APG: the one control whose operation needs the arrow-key pair must be last.)_
- **AC-31** _(Must)_ The list container SHALL own only `listitem` children; anything inserted
  between rows during a drag SHALL either be a `listitem` or be removed from the accessibility tree.
  **Verify:** automated — axe `aria-required-children` and `aria-required-parent` report zero nodes
  **while a drag is in progress**, with a `DropPlaceholder` mounted between two rows.
- **AC-32** _(Must)_ WHERE a row has a primary action, invoking it from the keyboard SHALL perform
  exactly what clicking that row's body performs today — activate the tab, collapse/expand the
  group, expand/collapse the window. **A group row rendered in search results has no primary
  action**, and its toolbar SHALL begin at the select-all control.
  **Verify:** unit — Enter and Space on the primary-action button of each row kind in the tab list
  call the same handler the row's `onClick` calls today; and a group row rendered under
  `SearchView`'s conditions exposes a toolbar whose first control is select-all, with no
  primary-action button. Existing behavioural assertions pass unmodified.
  _(**Amended 2026-09-29.** Grounded in the code: `GroupListItem.tsx:183` gates the chevron on
  `expanded === undefined`, and `SearchView/index.tsx:58` passes `expandedGroups`, so a
  search-result group row renders **no chevron at all** — and `GroupListItem.tsx:271`
  (`!group.collapsed || expanded`) renders its tabs regardless of collapsed state. There is nothing
  for a primary action to mirror, and a row that has no primary action is not a gap in this
  criterion. See E-17 for what the body click does do there.)_
  _(Rejected alternative: render the chevron unconditionally so every group row has a primary
  action. It loses twice — it makes a control permanently visible that is not visible today, and it
  lets people collapse groups from inside search results, a behaviour change nobody asked for.
  Inventing an affordance to satisfy a criterion is the criterion's problem, not the product's.)_
- **AC-33** _(Must)_ WHERE a row renders an expand/collapse chevron, that chevron SHALL become a
  named control and SHALL NOT be `aria-hidden`. This criterion SHALL NOT be read as requiring a
  chevron on a row that does not have one.
  **Verify:** unit — assert an accessible name on each rendered chevron and that its expanded state
  is exposed; assert no `aria-hidden` remains on them; assert a search-result group row still
  renders none. _(Measured: 3 such decorations in the mixed fixture — E-12. Scoped 2026-09-29
  alongside AC-32: group rows in search results render no chevron, so "on group and window rows"
  would have demanded one be invented.)_

### 5.8 The walk is pinned, not changed

- **AC-34** _(Must)_ Tab SHALL move between rows and SHALL NOT move between controls within a row;
  Left and Right SHALL move between the controls of the focused row.
  **Verify:** unit — a `userEvent` walk asserting Tab visits exactly one element per row, and
  Left/Right visit each control of one row. This pins `useRowKeys`' present behaviour (§1.0).
- **AC-35** _(Must)_ Left and Right SHALL NOT wrap at the ends of a row, and Home and End SHALL NOT
  be bound within a row.
  **Verify:** unit — Right on the last control and Left on the first leave focus unchanged; Home and
  End do not move focus within a row. _(NG-9. This is today's behaviour —
  `if (next < 0 || next >= stops.length) return;`.)_
- **AC-36** _(Must)_ WHEN focus enters a row that was previously visited, it SHALL land on that row's
  **first** control, not on the control last focused there.
  **Verify:** unit — focus a row's close button, Tab away to the next row, Shift+Tab back, assert the
  first control has focus. _(APG makes restoring optional. Per-row memory across eighty rows is
  state for no clear gain. It is in-memory either way, so SPEC-01 AC-23 is not implicated —
  AC-23 forbids *storage*, and nothing here persists beyond the page.)_
- **AC-37** _(Must)_ WHILE a drag is live, the row keyboard handler SHALL NOT claim any arrow key,
  and WHEN the drag ends or is cancelled it SHALL claim them again.
  **Verify:** unit — with `setRowDragActive(true)`, arrow presses leave `document.activeElement`
  unchanged and reach dnd-kit; after `onDragEnd` and after `onDragCancel`, Left/Right move within the
  row again. _(This is the hand-off with no external guidance behind it — §1.6 — and the part most
  likely to be silently broken by a later refactor. It currently survives on a module-level flag and
  a comment; this criterion is what turns it into a pinned fact.)_

---

## 6. Edge cases

| #        | Case                                                                 | Expected                                                                                                                                                                       |
| -------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **E-1**  | A collapsed group                                                    | The group row is present, its tabs are not rendered at all (measured: 2 rows, 2 violations). Row counts and any set-size figure must reflect what is rendered, not what exists. |
| **E-2**  | A single window                                                      | `WindowListItem` renders **no** window row when `single` is true. The list must not claim a container that is not there.                                                        |
| **E-3**  | Search view                                                          | `SearchView` renders `Tabs` with `expandedGroups` and `focus={false}`, with **no** window rows. A second container shape for the same components — and the one where a group row has no primary action (AC-32, E-17). |
| **E-4**  | The list is empty                                                    | "No other tabs are open." — a `Box`, not a list. An empty container must not announce itself as a list of zero.                                                                 |
| **E-5**  | A tab with no title                                                  | Controls already fall back to `"tab"` in their names (`Close ${tab.title \|\| "tab"}`). The row's own name must not become empty.                                               |
| **E-6**  | A row that unmounts mid-drag                                         | A tab row unmounts as soon as it is picked up (`!isDragging &&`); a group row does not. `rowControls.ts` documents this asymmetry as the reason the drag flag exists.           |
| **E-7**  | The drag overlay                                                     | `App.tsx` renders a bare `ListItemButton` in the `DragOverlay` for a multi-select drag, and `TabDisplay` / `GroupDisplay` with no `itemAction`. These are not list rows.        |
| **E-8**  | The active tab's row                                                 | `TabDisplay` sets `autoFocus` when `tab.active && focus`. That stays the entry point (DEC-3); under the toolbar it focuses the row's first control rather than the row.            |
| **E-9**  | A group whose actions menu is open                                   | `GroupListItem` holds the controls visible while its `Menu` is open. Focus is inside a portal, outside the row's DOM subtree.                                                   |
| **E-10** | A list of eighty rows                                                | Focus must be scrolled into view (AC-7). This is the case `aria-activedescendant` handles worst.                                                                                |
| **E-11** | A tab that is neither audible nor muted                              | No mute control. Rows are **not** uniform in control count — 3, 4 or 5 (§1.3). Any model that assumes a fixed cell or stop count per row is wrong.                              |
| **E-12** | The `aria-hidden` expand indicators on group and window rows         | Three in the mixed fixture. Decorative today because the row's own click expands. The row stops being clickable, so where a chevron is rendered it becomes that row's primary-action button (AC-33, §1.0). Search-result group rows render none — E-17.                                       |
| **E-13** | A row control that is `opacity: 0` and receives focus programmatically | Must reveal (AC-10). `visibility: hidden` must never be used: it takes the element out of `focus()` entirely and fails intermittently.                                          |
| **E-14** | A `DropPlaceholder` mounted between two rows mid-drag                | `list` may own only `listitem`. The placeholder must be a `listitem` or be out of the accessibility tree, or `aria-required-children` fires — a new violation traded for the old one (AC-31).      |
| **E-15** | A group row whose actions `Menu` is open                             | The menu is a portal, so focus leaves the toolbar's DOM subtree. The roving state must survive that and restore on close; and the menu button's name (`Actions for group …`) must stay distinct from the toolbar's own (AC-29). |
| **E-16** | Eighty rows, each an announced toolbar                               | The one unmeasured risk. Nothing documents what NVDA, JAWS or VoiceOver say on entering 20–80 toolbars in one scrollable list. Gated by AC-27, with a named retreat in §13.1.                    |
| **E-17** | A group row in search results                                        | Renders **no chevron** (`GroupListItem.tsx:183` gates it on `expanded === undefined`; `SearchView` passes `expandedGroups`), and its tabs show regardless of collapsed state (`:271`). Its body click nevertheless still calls `chrome.tabGroups.update({collapsed: !collapsed})` — a real change to the browser with **no visible effect in the search list and no chevron to show it**. Dropping the primary action here (AC-32) removes that invisible side effect rather than merely declining to add a control. |
| **E-18** | Two tabs open on the same page                                       | Same title, same URL, same subject — so the same toolbar name. Permitted by AC-29, and the reason its original distinctness half was unsatisfiable. |

---

## 7. Assumptions and dependencies

- **A-1** axe-core's `nested-interactive` applicability is governed by ARIA's
  `childrenArePresentational` list, verified against the installed bundle (§1.2). If a future
  axe-core or ARIA revision adds `listitem`, `row` or `gridcell` to that list, option A in §1.7
  stops working. Unlikely, and recorded so the reasoning is auditable.
- **A-2** @dnd-kit's `KeyboardSensor` keeps its default key bindings unless this project changes
  them. `App.tsx` passes no options today.
- **A-6** `toolbar` and `listitem` remain absent from ARIA's children-presentational list, and
  `toolbar` keeps having no Required Context Role and no Required Owned Elements. Verified against
  the installed axe-core 4.13.0 as well as ARIA 1.2 (§1.2, §1.7). If either changes, the chosen
  structure stops clearing the rule and §13.1's fallback is not the retreat — a re-spec is.
- **A-7** No screen reader's behaviour when entering 20–80 toolbars in one scrollable list is
  documented anywhere the research reached. This is the only assumption in this spec that is not
  measured or cited, it is load-bearing, and AC-27 is the measurement that discharges it (§13.1).
- **A-3** A zero-violation axe run in jsdom is necessary and not sufficient. jsdom has no layout, no
  real focus ring, no virtual cursor and no accessibility API bridge; it cannot show announcement
  order, browse-vs-focus mode, or the NVDA character-mode failure in
  <https://github.com/nvaccess/nvda/issues/13392>. AC-26 and AC-27 exist because of this.
- **A-4** The three surfaces are all extension pages running the same `App` (SPEC-01), so one
  keyboard model genuinely can serve all three; the float is the narrow one at ~400px.
- **A-5** MUI 5 is the component library. `ListItemButton` renders `<div role="button" tabindex="0">`
  — verified in the rendered output — so the row role is MUI's, not hand-written, and changing it
  means changing the component or its `component`/`role` props.
- **D-1** Depends on SPEC-01 (surfaces, AC-23, NG-3) and SPEC-03 (the five permissions, AC-6).
- **D-2** No external research is outstanding for the ARIA patterns themselves; the sources in §1.7
  are cited and were supplied with the brief. What is *not* answerable from any source is §1.6's
  reconciliation of arrow-key navigation with a drag sensor's arrows. The app's own `dragActive`
  hand-off is the answer this project ships; DEC-4 keeps it and AC-37 pins it.

---

## 8. Non-functional requirements

- **NFR-1 Accessibility.** The purpose of the spec. WCAG 2.1 **2.1.1 Keyboard** (every control
  reachable), **2.4.3 Focus Order**, **2.4.7 Focus Visible**, **4.1.2 Name, Role, Value** and
  **1.3.1 Info and Relationships** (the list structure that does not exist today, §1.4).
- **NFR-2 Performance.** No per-row subscription that recomputes on pointer movement.
  `rowControls.ts` records that `useDndContext` was rejected for exactly this: it subscribes every
  row to a context memoised on `collisions` and `over`, so every row re-rendered on every pointer
  move. A roving-tabindex implementation must not reintroduce it.
- **NFR-3 Privacy / storage-free.** Unchanged (AC-20, AC-21). Nothing about a keyboard model needs
  persistence, and AC-23 forbids it regardless.
- **NFR-4 Narrow layout.** ~400px in the float; the measured control widths in §5.5 AC-22.
- **NFR-5 Internationalisation.** Accessible names are English string templates today. Not changed
  here, but any name this spec adds must be built the same way — as text, never by concatenating a
  tab title into markup (AC-24).
- **NFR-6 Bundle.** Any accessibility dependency added for testing must be a `devDependency`. The
  shipped bundle is already at the point where `vite.config.ts` had to raise
  `chunkSizeWarningLimit`.

---

## 9. Cross-module impact

| Area                                                       | Impact                                                                                                                                                                                                                                       |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ui-shell` — `src/App.tsx`                                 | Owns the `DndContext`, both sensors and `setRowDragActive`. Any change to what arrows mean is a change here, not only in `tab-list`. It also renders a `ListItemButton` inside `DragOverlay` (E-7).                                            |
| `ui-shell` — `src/lib/ControlBar/`                         | Sits after the list in the Tab order. The stop count the list costs (AC-9) is the number of presses between a row and the control bar — unchanged at one per row, and the reason the fallback in §13.1 is a retreat rather than a free option. |
| `tab-list` — `src/lib/Tabs/elements/rowControls.ts`        | **The evidence for this whole spec** (§1.0) and the file it changes least: the roving walk and the `dragActive` hand-off are kept and pinned by AC-34…AC-37, not rewritten. Its three documented rejected alternatives must not be re-tried. |
| `tab-list` — `src/lib/Tabs/elements/DragHandle.tsx`        | Carries dnd-kit's `role="button"` / `tabIndex={0}` attributes and re-forces `tabIndex={-1}` after them. Consumed by tab rows, group rows **and** `CurrentTab`, which is not a row at all.                                                       |
| `tab-list` — `src/lib/Tabs/selection/`                     | `SelectionContext` / `useSelected` drive per-row state; `SelectionToolbar` acts on it. Selection stays on the per-row checkbox (DEC-5), so this remains the source of truth and is unchanged.                                      |
| `tab-list` — `src/lib/Tabs/DnD/`                           | `useDropzone` and `DropPlaceholder` insert and remove elements between rows during a drag. `list` owns only `listitem`, so the placeholder must be a `listitem` or leave the accessibility tree — AC-31, E-14. The one place this change can *create* a violation. |
| `views` — `SearchView` and `TabsView`                      | Two different container shapes over the same row components (E-2, E-3). Any container role has to be correct in both.                                                                                                                         |
| SPEC-01 (`ui-shell`)                                       | **AC-23** (no storage) and **NG-3** (no host permissions / content scripts) constrain this spec; carried forward as AC-20 and AC-21. Nothing in SPEC-01 is superseded.                                                                        |
| SPEC-02 (`tab-list`)                                       | The mute control is a row control and is present only on audible or muted rows (E-11). Its accessible name and behaviour are preserved by AC-5, AC-6 and AC-18.                                                                               |
| SPEC-03 (`tab-list`)                                       | **NFR-4 was inaccurate and is now corrected in place**, dated, by PR #11 — see §1.5. The 6 critical `image-alt` nodes in `TabAvatarsDisplay` are **fixed and shipped**, guarded by `TabAvatarsDisplay.test.tsx`. Done, not pending (DEC-8, NG-10). |
| Test suite                                                 | `TabDisplay.test.tsx`, `GroupDisplay.test.tsx` and `TabsView.test.tsx` pin current behaviour and will need updating. `manifest.test.ts` must keep passing untouched (AC-20, AC-21).                                                            |
| Store listing / privacy docs                               | No impact. No permission changes (AC-21), no new data of any kind.                                                                                                                                                                           |

---

## 10. Inputs

| Input                                                     | Provenance                                                                                                     |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `chrome.tabs.Tab.title`, `.url`, `.audible`, `.mutedInfo`, `.active` | [reused] — already rendered into every row and into every control's accessible name.                           |
| `chrome.tabGroups.TabGroup.title`, `.color`, `.collapsed` | [reused] — already drives the group row's chip, tint and expansion state.                                       |
| `chrome.windows.Window.id`, `.focused`                    | [reused] — already drives the window row and its default expansion.                                             |
| `TabsStructure` (`src/lib/Tabs/types.ts`)                 | [reused] — the window > group > tab hierarchy already exists in data; only the DOM does not express it (§1.4).  |
| dnd-kit `attributes` / `listeners` / `setActivatorNodeRef` | [reused] — the existing drag contract, split by input type in `DragHandle`.                                    |
| Row position and set size                                 | [new, derived] — computed from `TabsStructure` at render. No new browser API, no new permission.                |

---

## 11. Untrusted inputs

- **A tab's `title` is attacker-influenced.** A page sets its own `document.title`; it can be any
  string, including markup, quote characters, right-to-left overrides and arbitrary length. It is
  already interpolated into five accessible names per row (`Close ${tab.title}`,
  `Reorder ${tab.title}`, `Mute ${tab.title}`, …), and this spec adds one more per row — the
  toolbar's own name (AC-29), which is a *string*, never markup. It **MUST** be handled as text
  throughout — React's JSX escaping and the `aria-label`
  *prop* both do this correctly; string-building into `dangerouslySetInnerHTML`, into an
  `aria-labelledby` id, or into a CSS selector would not (AC-24).
- **A tab's `url` is attacker-influenced.** Rendered as the row's secondary text and used as the
  favicon key. SPEC-03 E-6 already covers percent-encoding it for the `_favicon` endpoint. This
  spec adds no new sink for it, and must not: a URL must never become part of an element id or a
  query selector.
- **A tab group's `title` is user-controlled but arbitrary.** Same treatment.
- **Length is itself an input.** A multi-kilobyte title must degrade to an ellipsised row and a long
  accessible name, not to a broken layout or a hung announcement. `noWrap` handles the pixels; the
  accessible name is not truncated today and this spec does not require it to be.
- **Nothing here is a trust boundary for privilege.** No title or URL is executed, evaluated, or
  used to choose a code path with side effects. The exposure is presentational and is confined to
  text nodes and `aria-label` attribute values.

---

## 12. Proposed improvements (not required)

- **PI-2** Expose the expanded/collapsed state of a group or window row on the row's own summary as
  well as on its chevron button, so the state is heard without stepping onto the control. AC-33
  already makes the chevron a named control; this is the extra courtesy, not the fix.
- **PI-3** Announce reorder outcomes ("Moved to position 4 of 20") through the polite live region
  that already exists in `App.tsx` for search results. dnd-kit supplies default announcements; the
  existing region means they can be made specific to this list at low cost.
- **PI-4** Pin the tab-stop budget as a regression test in its own right (AC-9), and record the
  measured numbers in `LEARNINGS.md` so the next person does not re-derive them. The current
  entry's "15 violations" and "axe-core 4.10.2" are both stale (§1.1).
- **PI-5** Add a skip link over the list. Even at one Tab stop per row, a user arriving from the
  search box traverses every row to reach the control bar.
- **PI-6** Consider whether `TabGrid`'s `Grid xs={12} sm={6} md={4}` is doing anything. Every caller
  forces `width: 100%`, so the responsive columns appear to be inert — and if they are not, a
  multi-column layout changes what "one row, one listitem" means.
- **PI-7** Announce the aggregate selection count ("3 of 20 selected") through the same polite live
  region. AC-16 deliberately keeps selection on the per-row checkbox, which is correct but says
  nothing about the whole; this is the cheap way to add the whole without inventing invalid ARIA.
  Explicitly **not** an AC — NG-11.
- **PI-8** Look at the group row's body click in search results. It toggles the real tab group's
  `collapsed` state with no visible effect in the search list and no chevron to show it (E-17,
  AM-2). This spec removes it from the keyboard surface; the pointer behaviour is untouched and
  is probably a latent defect of its own.

---

## 13. Resolved decisions

All eight clarifications are closed. Recorded with their reasoning, because the reasoning is what a
future session needs and the answers alone would look arbitrary.

| #        | Decision                                                                                                                                                                                                                                                                  |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **DEC-1** (was NC-1) | **Each row is a `toolbar` inside a `listitem`.** Not `grid`, not `treegrid`, not the VS Code two-stop shape. One Tab stop per row — exactly today's count. The decisive evidence was `rowControls.ts`, not the literature: the app already implements the toolbar contract by hand (§1.0). §1.7 has the ARIA and APG citations; §1.7a has why the others lost. |
| **DEC-2** (was NC-2) | **The keyboard model is today's, written down.** Tab between rows, Left/Right within a row, roving tabindex, one stop per row — AC-34. Home/End within a row and Left/Right wrapping are **out of scope**, with reasons, in NG-9. The genuinely new obligations are the roles (AC-28) and the per-row accessible name (AC-29). |
| **DEC-3** (was NC-3) | **Entry point stays the active tab's row**, as `TabDisplay` already does with `autoFocus`. Re-entering a row lands on its **first** control, not the last one focused there (AC-36) — APG makes restoring optional, and per-row memory across eighty rows is state for no gain. **SPEC-01 AC-23 is not implicated either way**: AC-23 forbids *storage*, and roving state is in-memory and dies with the page. Stated so nobody has to re-derive it. |
| **DEC-4** (was NC-4) | **Reordering is unchanged.** The drag handle stays the **only** keyboard activator; Space/Enter picks up, arrows move while a drag is live, Escape cancels, and `dragActive` keeps `useRowKeys` off the arrows for that stretch. Pick-up does **not** move onto the row. AC-37 pins the hand-off, because it is the one part with no external guidance behind it (§1.6) and the part a later refactor is most likely to break silently. |
| **DEC-5** (was NC-5) | **Selection stays on the per-row checkbox.** Forced by DEC-1: `aria-selected` is not supported on `toolbar` or `listitem`, so using it would be invalid ARIA. AC-16 also forbids `aria-multiselectable`. An aggregate count is PI-7 via the existing live region, not an AC. |
| **DEC-6** (was NC-6) | **All three row kinds at once.** They share `rowControls.ts`, `ItemButton` and `DragHandle`; splitting would put two keyboard models in one list. |
| **DEC-7** (was NC-7) | **axe wired in through a `devDependency`** (`vitest-axe` or equivalent) — AC-25 — plus a manual **NVDA + Chrome** pass on **all three surfaces** — AC-27. |
| **DEC-8** (was NC-8) | **Out of scope — already fixed and shipped.** PR #11 added `alt=""` to `TabAvatarsDisplay` with a guarding test and corrected SPEC-03 NFR-4 in place (§1.5). NG-10. Not to be re-proposed. |

### 13.1 The one unmeasured risk, and the retreat from it

**Verbosity at scale is not measured anywhere.** Nothing in the literature documents what NVDA, JAWS
or VoiceOver announce when a user enters 20–80 toolbars in a single scrollable list — this was
searched for and not found. Every other risk in this spec is either measured here or cited; this one
is not. AC-27 exists to measure it before the spec can reach `implemented`, and E-16 names it.

**Trigger.** IF the manual NVDA + Chrome pass finds per-row toolbar announcements intolerable at
20+ rows — that is, if reaching a row costs the user a toolbar announcement they must sit through
before hearing the tab — THEN the retreat is the **VS Code shape**, not a redesign:

- the row is a `listitem`;
- the primary action is a plain `button`, the row's only unconditional Tab stop;
- the secondary controls (select, mute, reorder, close, group menu) move into a `toolbar` **beside**
  that button rather than around it.

Cost: **two Tab stops per row instead of one** — 40 at 20 tabs, against 20 today and 80 under the
plain-buttons option. Benefit: the toolbar is entered only when the user Tabs into it, so a pass down
the list hears one button per row and no toolbar at all.

This shape has real precedent at the scale we care about and is source-verified in
`microsoft/vscode` (`listView.ts`, `actionbar.ts`) — VS Code's own file tree and editor tabs use it.
Recorded as a decision with a trigger rather than a vague risk note, so a future session inherits the
alternative instead of rediscovering it.

### 13.2 Amendments — 2026-09-29, during implementation planning

Both found by planning against the spec rather than by reading it, which is the point of planning.
Recorded here because a criterion that was wrong once will be re-proposed unless the reason it was
wrong is written down.

| #         | Amendment                                                                                                                                                                                                                                                                                                                                 |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **AM-1**  | **AC-29 relaxed from "all distinct" to "distinct wherever subjects are distinct".** The original was self-contradictory — it demanded subject-derived names *and* global distinctness, and two tabs on the same page have the same subject. It was also **stricter than ARIA**, which requires only "a label on each toolbar" with nothing about uniqueness. A correction, not a concession. Window rows may still take an ordinal (a real improvement); tab rows deliberately do not, because `index` churns. E-18. |
| **AM-2**  | **AC-32 carved out search-result group rows, which have no primary action**; AC-33 scoped to rows that actually render a chevron. Grounded in `GroupListItem.tsx:183`, `:271` and `SearchView/index.tsx:58`. The rejected alternative — render the chevron unconditionally — would add a permanently visible control the product does not have and let users collapse groups from inside search results. E-17. |

**AM-2 turned out to be stronger than the defect it was raised for.** The premise was "a search-result
group row's body click does nothing, so there is nothing to mirror". The code says otherwise:
`GroupDisplay`'s `handleClick` calls `chrome.tabGroups.update(group.id, { collapsed: !group.collapsed })`
**unconditionally**, so that click really does collapse the user's tab group in the browser — while
the search list goes on rendering the tabs anyway (`:271`) and shows no chevron to say what happened.
It is an invisible side effect on live browser state. Dropping the primary action there does not
merely decline to add a control; **it removes that.** Not fixed by this spec beyond the row's
keyboard surface, and worth its own look — PI-8.

## 14. Traceability

| AC                                | Where it lands                                                                                       |
| --------------------------------- | ------------------------------------------------------------------------------------------------------ |
| AC-1, AC-2                        | The row components (`TabDisplay`, `GroupDisplay`, `WindowDisplay`) + a new automated axe check         |
| AC-3, AC-4                        | `Tabs.tsx`, `TabGrid.tsx`, `TabsView/index.tsx`, `SearchView/index.tsx` — the containers               |
| AC-5 … AC-10                      | `elements/rowControls.ts` (or its successor), every row component, `ItemButton`                        |
| AC-11 … AC-15                     | `elements/DragHandle.tsx`, `App.tsx` (sensors, `setRowDragActive`), `Tab/TabListItem.tsx`, `TabsGroup/GroupListItem.tsx` |
| AC-16 … AC-19                     | `selection/SelectionContext.tsx`, `selection/useSelected.ts`, the per-row select controls              |
| AC-20, AC-21                      | `src/test/manifest.test.ts` — unmodified                                                               |
| AC-22, AC-23                      | `rowControls.ts` (`rowControlsSx`, `rowTailMaskSx`, `rowTailReserveSx`), manual at 400px + `harness/`  |
| AC-24                             | Every accessible-name construction site; a hostile-title unit test                                     |
| AC-25, AC-26, AC-27               | A new `vitest-axe` (or equivalent) `devDependency` + check, and a recorded NVDA result in this file     |
| AC-28, AC-29                      | `Tab/TabDisplay.tsx`, `TabsGroup/GroupDisplay.tsx`, `Window/WindowDisplay.tsx` — the row elements    |
| AC-33                             | `TabsGroup/GroupListItem.tsx` and `Window/WindowDisplay.tsx` — only where a chevron is rendered     |
| AC-30                             | `Tab/TabDisplay.tsx` and `TabsGroup/GroupListItem.tsx` — DOM order of the secondary action only     |
| AC-31                             | `Tabs.tsx`, `elements/TabGrid.tsx`, `DnD/DropPlaceholder.tsx`                                          |
| AC-32                             | The primary-action button on each row kind; `GroupListItem.tsx` + `SearchView/index.tsx` for the search-result carve-out. The handlers themselves are unchanged |
| AC-34, AC-35, AC-36, AC-37        | `elements/rowControls.ts` — pinned, not rewritten                                                    |

## 15. Measurement log

Everything numeric in §1 was measured on **2026-09-28** against the working tree at `main`
(`c822b6d`), by rendering `TabsView` inside `SelectionProvider` under vitest/jsdom with the repo's
own `src/test/chromeStub.ts`, and running `axe.run()` from the installed **axe-core 4.13.0**.

- `nested-interactive` node count equals the rendered row count exactly, at 2, 5, 8 and 20 rows.
- Tab stops equal the rendered row count exactly, at the same sizes; `[data-row-control]` elements
  number 3 per plain tab row, 4 with mute, 4 on a window row and 5 on a group row (3 of which carry
  `aria-hidden` expand indicators across the mixed fixture).
- The full ruleset additionally reported `image-alt`, 6 nodes, impact `critical` (§1.5). No other
  rule fired, and `incomplete` was empty.
- `grep` for `<ul>`, `<li>`, `role="list"` and MUI `<List>` across `src/` returns nothing (§1.4).
- `manifest.json` `permissions` reads exactly
  `["sidePanel","tabs","tabGroups","sessions","favicon"]`, with no `host_permissions` and no
  `content_scripts`.

Added **2026-09-29**, on branch `fix/avatar-favicon-alt`, for the toolbar decision:

- Row control DOM order, read as `[data-row-control]` in document order (§1.4a). The drag handle is
  **never last**: 2nd of 3 on a silent tab row, 3rd of 4 on an audible one, and 2nd of 4 on a group
  row with both the actions menu and Close after it. Window rows have no drag handle.
- Control counts per row are 4 or 5 — every row kind clears APG's "3 or more controls" threshold
  for using `toolbar` as a grouping element.
- `GroupListItem` already names its `MoreVert` button `Actions for group {title}`, which is why
  AC-29 forbids naming a group row's toolbar with the same phrase.
- The `image-alt` finding of 2026-09-28 is fixed in the working tree: `TabAvatarsDisplay.tsx`
  carries `alt=""` and `TabAvatarsDisplay.test.tsx` guards it (§1.5).

Read **2026-09-29**, for the AM-1 / AM-2 amendments (§13.2):

- `GroupListItem.tsx:183` gates the chevron on `expanded === undefined`; `SearchView/index.tsx:58`
  passes `expandedGroups`; `GroupListItem.tsx:271` renders the group's tabs on
  `!group.collapsed || expanded`. A search-result group row therefore has no chevron and cannot
  show a collapsed state.
- `GroupDisplay.tsx` `handleClick` calls `chrome.tabGroups.update(group.id, { collapsed: !group.collapsed })`
  with no surface check, so the body click changes real browser state even where nothing renders it.
- `SearchView` renders `Tabs` directly and never `WindowListItem`, so search results contain no
  window rows at all (E-3).
- `WindowDisplay` names its switch button `Switch to this window, ${tabs.length} tab(s)`, so two
  windows holding five tabs each are today indistinguishable by name — the gap the optional
  ordinal under AC-29 closes.
