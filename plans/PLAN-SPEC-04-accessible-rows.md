# PLAN SPEC-04 — Accessible rows (clearing `nested-interactive`)

|                    |                                                                                                                                                      |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Plan for**       | [SPEC-04](../specs/tab-list/SPEC-04-2026-09-28-accessible-rows.md) (Status: approved 2026-09-29, 37 ACs, zero open NC)                                 |
| **Date**           | 2026-09-29                                                                                                                                             |
| **Module**         | `tab-list`, with edges into `ui-shell` (`src/App.tsx`)                                                                                                 |
| **Status**         | approved (2026-09-29) — §8's two blocking criteria were decided by the user and the spec is amended to match; the other two need nothing                |
| **Execution mode** | Single-agent, sequential (user decision, 2026-09-29 — precedent PLAN-SPEC-01, PLAN-SPEC-05). T-6, T-7 and T-8 ran in parallel on 2026-10-02; see §0. |
| **Test strategy**  | Vitest for everything reachable without a browser, plus [MANUAL-SWEEP-SPEC-04.md](MANUAL-SWEEP-SPEC-04.md) for what is not (user decision, 2026-09-29)  |
| **Branch**         | `accessible-rows`, cut from **`keyboard-entry-and-focus`** — not from `main`. See §1.1.                                                                  |
| **Scope**          | All 37 criteria, AC-1…AC-37. All three row kinds at once (DEC-6).                                                                                       |
| **Not in scope**   | §9. Notably: the `image-alt` fix (shipped, NG-10), hierarchy in the a11y tree (NG-12), Home/End and wrapping (NG-9), a settings toggle (NG-8).           |

---

## 0. Progress

| Unit | State       | Note |
| ---- | ----------- | ---- |
| T-0  | built (c90207c) | Wire axe in as a declared devDependency, and record today's numbers before any of them move. Measured 5/20/8/2 and 20 stops — matched the plan on the post-#22 tree. |
| T-1  | built (383f4a1) | One `list`, one `listitem` per rendered row. Survives either outcome of the T-3 gate. |
| T-2  | built (75b2a6e), reviewed, fix round 1 (see below) | The tab row becomes a `toolbar`. The shape the gate is about. nested-interactive now 0/0/3/1; baseline test updated with the old numbers in comments. One authorised edit outside the plan: `App.test.tsx` "comes back from a control inside a row" selector → `main [role="toolbar"] [data-row-control]:not([data-tab-row])`, because D-3 moved `data-tab-row` onto the primary button. |
| T-3  | **passed 2026-09-30** | **Gate — NVDA + Chrome.** The §13.1 retreat is not triggered: the title is heard first. But every row said its title twice, and NVDA gave no count or position. That led to SPEC-04 AM-3 and new unit T-2b. The 80-row check moves to T-10. See sweep §B. |
| T-2b | **built 2026-09-30** | **Name the tab row once** (AM-3): `title, site, state, n of N`, and the primary control is `Switch`. Added after T-3; runs before T-4. |
| T-4  | **built 2026-09-30**, wording awaits a listen | The group row: a toolbar named `Work, group, 3 tabs`, with the chevron as its primary, named `Tabs` plus `aria-expanded`. In search there is no chevron (D-8 over the DoD line that said otherwise), and select-all is the Tab stop. Drift: `81886bf`'s `collapsible` guard is kept. SPEC-04 E-15's "roving state must survive" was stale against D-5/AC-36; corrected in spec §13.4 on 2026-10-02. |
| T-5  | **built 2026-10-01**, wording awaits a listen | The window row: a toolbar named `Window 1, 12 tabs[, current window]`, numbered over the windows actually rendered. Its chevron is the primary, named `Tabs` plus `aria-expanded`, matching the group row rather than the plan's changing Hide/Show name. Switch stays last. `nested-interactive` is now 0 on every fixture. |
| T-6  | **built 2026-10-02** (66faf4a, 084f456, 57a757a), wording awaits a listen | Reordering, pinned. The app supplies its own drag announcements and instructions (`DnD/announcements.ts`, a file beyond the plan's list), and no id is spoken. The hand-off is tested in both directions, on a row that stays mounted. A browser check found focus lost when a drop moves a tab into a group; fixed with an owed-focus flag beside `dragActive`. |
| T-7  | **built 2026-10-02** (da0c186) | The whole list under the full ruleset on all four fixtures: no violations, nothing undecided. Mid-drag, the three hosts, AC-16's absence test and the no-axe-in-shipped-code guard are in. Contrast is not evaluated in jsdom, and two tests say so. |
| T-8  | **built 2026-10-02** (39b3e40) | Hostile titles are literal text in every name; no name by reference; one definition of each style helper. The primary control on a tab row and the switch control on a window row are now `div`s with `role="button"`, which clears the block content inside a `<button>`. Re-measured at 400 px: 57.7 / 94.3 / 88.3 px, unchanged, so no constant moved (sweep §C). |
| T-9  | **built 2026-10-02** (643f38d) | Four dated notes in `LEARNINGS.md`; the 2026-09-24 entry is corrected beneath, not edited. |
| T-10 | **partly done 2026-10-02** | Everything that does not need ears was run in Chromium against the layout harness (sweep, "Chromium pass"). It found and fixed two defects: a focused row hidden under the header or the action bar (AC-7, d78826e), and the lost focus above (AC-13). **Open: every item that is about what NVDA says**, the 80-row listen, and the real side panel and float. |

**Run state, 2026-10-02.** T-6, T-7 and T-8 were built by three implementer agents at once, on
disjoint file lists, and T-9 and the T-10 browser pass by the orchestrator. So the execution mode in
the header is no longer true of this run. The three review gates then ran over everything since T-2.

- **Line-level review: 10 confirmed findings.** Fix round 3 (`611dd83`) closed all that did not need
  a decision:
  - A rejected drop handler left the drag flag on and every row's arrows dead. The reset is in a
    `finally` now, and a refused move is announced.
  - Focus after a keyboard drop: lost when the tab changed parent (`084f456`), and when there was no
    row to rebuild. The dropped row's handle takes it back as it mounts, and focus nobody holds goes
    to the search field.
  - "Picked up X." was replaced 55 ms later by the first place. The first place now carries it.
  - A selection dropped on one of its own tabs was announced as put back.
  - A click on a row's padding left focus on the row, where the arrows did nothing.
- **Architecture review: 0 violations, 4 smells (S-05…S-08).** S-07 (one definition of the row-label
  attribute and of the chevron's name) and S-08 (every axe run through `runAxe`) are fixed. S-05
  (drop-zone types are bare strings that `announcements.ts` mirrors) and S-06 (a second module flag
  in `rowControls.ts`) are discuss-only, with S-02…S-04.
- **Plan check: 34 of 37 criteria implemented with evidence, AC-27 manual, AC-2 and AC-16 partial.**
  AC-2's missing half (no row control is hidden) now has a test. AC-16 is the first open decision
  below.

- **Pre-push self-review: 0 critical, 0 high.** Two reviewers, one on product code and security,
  one on tests. Fix round 4 (`d4592f6`) closed the medium findings:
  - The drop handlers started the move with `void`, so App's "that could not be moved" never
    fired for the drops most likely to be refused. They are awaited now.
  - A drag ends as soon as dnd-kit reports the drop, before the drop is carried out.
  - The drop tests run on fake timers, and every new branch has a test that fails without it.
  - Left as discuss-only: the drag lifecycle is about ninety lines in `App`'s body and would sit
    better in a `useRowDrag` hook under `DnD/`, with the two module flags beside it (S-06).
- ~~**A defect on `main`, found and not fixed here.** A dropped selection is never cleared: `App`
  reads `SelectionContext` above the `SelectionProvider` it renders, so its `dispatch` is the
  default no-op. It is outside SPEC-04. `App.drop.test.tsx` records it as an expected failure,
  and it is raised as its own task.~~ Fixed on `main` in #24 and merged here on 2026-10-02
  (`124d79a`): `App` is only the providers around an `AppBody`. The expected failure is a plain
  test now, with two beside it — a refused move keeps the selection, and a single dragged tab
  leaves one alone.

**Open decisions for the user.** Neither is built either way; both change what is heard.

1. **AC-16 asks the select control to report "its own pressed/checked state".** What is built says
   the state in the name: "Select ‹title›" becomes "Deselect ‹title›", and the toolbar's name gains
   "selected". There is no `aria-pressed`. Either amend AC-16 to say the name carries the state, or
   make it a toggle: a fixed name "Select ‹title›" with `aria-pressed`, which NVDA reads as "toggle
   button, pressed". Adding `aria-pressed` to the name that already flips would say it twice.
2. **Every tab row's primary control is named "Switch", and what is visible is the title** (AM-3).
   That fails WCAG 2.5.3, Label in Name: someone using voice control cannot say the title to press
   it, and a screen reader's list of buttons holds one "Switch" per tab. AM-3 chose it by ear so
   the title is heard once. The alternatives each bring the title back a second time, so this is a
   trade to make knowingly, by ear.

**Known and left.** "Start of window." and "End of window." do not say which window, though the rows
are named "Window N". The window row's walk order (chevron, select, close, switch) differs from its
order on screen, where close is at the far right; it predates this plan. A drop that Chrome refuses
is announced as moved by dnd-kit's region and then corrected by the app's own; whether Chrome
refuses a group dropped inside another group has not been checked in a real Chrome.

**Run state, 2026-09-30.** All three review gates ran over T-0…T-2: `/code-review` (medium),
architecture-reviewer (0 violations, 4 smells) and plan-verifier (0 NOT FOUND, accept-with-gaps).
Fix round 1 closed:

- **Blocking — group and window rows lost Left/Right.** `useRowKeys` now keeps the row as a stop
  when it is itself focusable (`row.tabIndex >= 0`), because the group and window rows stay
  focusable until T-4/T-5. See D-9's second update.
- **AC-6 — the select control names its tab** ("Select ‹title›").
- **E-4 — no empty list while loading.** Neither view renders `RowList` until it has a row.
- **Architecture S-01 — user decision.** The drag handle's `edge="end"` is set where
  `TabListItem` builds the handle, not cloned onto it by `TabDisplay`. T-2's DoD is relaxed to
  "no new prop, comparator untouched".

Still open, carried forward rather than fixed now:

- ~~**AC-16:** a test that `aria-selected` and `aria-multiselectable` stay absent. T-7 or T-8.~~
  Done in T-7 (`rows.a11y.test.tsx`).
- **Architecture S-02…S-04:** `RowList` is a deep import rather than a barrel export; the
  list/listitem contract is split between the views and `lib/Tabs`; `rowFixtures.tsx` lives in
  `src/test/`. All three are discuss-only.
- ~~**Cross-spec, R-8:** `SPEC-05` still quotes the old "Select tab" label in its table
  (`specs/ui-shell/SPEC-05-2026-09-29-keyboard-access.md:86`).~~ Corrected 2026-10-02 with a note
  under that table.

**Real-browser pass (layout harness, Chromium, 2026-09-30):**

- Down from search lands on the active tab's primary button, with focus-visible on it.
- The walk runs Switch → Select → Close → Reorder and stops dead at the end.
- The controls are revealed via `:has(:focus-visible)`, at opacity 1.
- Up returns to search.
- A window row walks row → Select → row.
- `elementFromPoint` at each control's centre on a hovered row returns that control, the checkbox over the favicon included.
- A title click calls `tabs.update` once, and Ctrl-click selects with no call.

**`pr-self-review`: 0 critical.** Fix round 2 closed what it found:

- Row names for `data:`, `blob:`, `file:` and extension URLs are short now, not the whole URL.
- `runAxe` refuses `rules` and `disableOtherRules` at run time, and the source scan catches the other forms.
- The E-4 loading test uses hand-resolved promises instead of timers.
- `App.test.tsx` now asserts that focus reached the control.
- `disableRipple` is on the primary button.
- The row's `Mui-focusVisible` dependency is pinned by a test.
- Test hygiene.

~~Carried to T-8: `ListItemAvatar`/`ListItemText` render `<div>`s inside the primary `<button>`.~~ Fixed in T-8 (D-11), with no layout change measured.

T-3 ran 2026-09-30 and passed; see its row above and sweep §B. T-2b to T-9 followed; see the 2026-10-02 run state above.

---

## 1. Summary

SPEC-04's central claim survived falsification: **the keyboard contract is already built**, by hand,
in `src/lib/Tabs/elements/rowControls.ts`. `useRowKeys` (`rowControls.ts:171-187`) is the Left/Right
walk, `rowControlProps` (`rowControls.ts:21-24`) holds every control at `tabIndex: -1`, and
`setRowDragActive` (`rowControls.ts:164-169`) is the arrow-key hand-off to @dnd-kit. What is missing
is the *roles and names*. So this is a plan about **DOM order, roles, and one new button per row** —
not about keyboard semantics.

Four findings from the working tree change what the work is:

1. **The list container the spec asks for does not exist at any single point in the tree, and cannot
   be put where it looks like it should go.** `Tabs.tsx:16-33` renders one `Grid container` *per
   window*, and in `TabsView` the window row is rendered by `WindowListItem` **outside** that grid
   (`WindowListItem.tsx:137-149` renders `<Dropzone><WindowDisplay/></Dropzone>`, then `Tabs` at
   `:150-152`). Putting `role="list"` on the `Grid container` would therefore produce N lists *and*
   leave every window row a `listitem` with no `list` parent — a fresh `aria-required-parent`
   violation traded for the old one. AC-3's `getByRole("list")` (singular) forces one container
   above both. It goes in `TabsView` and `SearchView`, not in `Tabs`. See D-2.
2. **Intervening `div`s are free, and that is measured in the installed bundle, not assumed.**
   axe-core 4.13.0's `getOwnedRoles` (`node_modules/axe-core/axe.js:27764-27802`) descends *through*
   any element with no role, no global `aria-*` attribute and no focusability
   (`axe.js:27783-27786`), and `getMissingContext` (`axe.js:27651-27682`) walks up past the same.
   So `Grid container` → `Grid item` → styled `Dropzone` div between a `list` and its `listitem`s is
   legal to axe. This is the fact the whole structure rests on and it was read out of the shipped
   engine, not inferred from the spec.
3. **The drag handle cannot simply be moved to the end — the primary-action button has to move to the
   front, and on a tab row that means moving the text.** §1.4a asks for the handle last (AC-30) and
   §1.0 asks for the primary button at position 0 of the walk. On a tab row today the text is the
   *last* child (`TabDisplay.tsx:186` on this plan's base branch). Making the text the primary button
   and leaving it there would put the primary at the **end** of the walk. The select checkbox
   (`:122`) and the whole `ListItemSecondaryAction` (`:157-179`) are absolutely positioned, so DOM
   order is free for them — the reorder is: **primary(avatar + text) → select → mute → close →
   drag**, and it is invisible. See D-4.
4. **`ListItemButton` will keep its `role="button"` unless it is overridden, and it can be — verified
   in the installed MUI.** `ButtonBase` sets `buttonProps.role = 'button'` for any non-`button`
   component (`node_modules/@mui/material/ButtonBase/ButtonBase.js:263`), but its render spreads
   `_extends({… tabIndex: disabled ? -1 : tabIndex, type}, buttonProps, other)` — `other` last. So an
   explicit `role="toolbar"` **wins**, and `tabIndex={-1}` is honoured because `tabIndex` is a
   declared `ButtonBase` prop. That is what makes this a role change rather than a rewrite of three
   row components, and it is why `dense`, `selected`, the ripple, the hover fill and every `sx` in
   those files survive untouched. MUI 5.15.14.

The risk the spec flags — **nobody knows what a screen reader says on entering 20–80 toolbars in one
scrollable list** (A-7, E-16, §13.1) — is answered at **T-3**, after exactly one row kind has been
converted and before the other two. That ordering is deliberate: T-1's list/listitem work is
identical under the chosen shape *and* under the §13.1 VS Code retreat, so a "no" at the gate costs
T-2 and nothing else.

### 1.1 The base branch, and why it is not `main`

**Cut `accessible-rows` from `keyboard-entry-and-focus` (PR #16), not from `main`.** Verified:
`git log keyboard-entry-and-focus..main` is empty, so that branch already contains everything on
`main` — the row memo (`5560291`), the favicon change token (`c0d04fb`) and the float listener fix.
It also contains the three things this plan must not break:

- **`data-tab-row` / `data-active-tab`** on the tab row (`TabDisplay.tsx:96-97`) and the `ArrowDown`
  handler in the search field that reads them (`App.tsx:277-293`), scoped to `main` so the
  `DragOverlay` copy is never found. **D-3** says how those survive the rework.
- **`TabDisplay` no longer has a `focus` prop and no longer autofocuses** — do not reintroduce
  either. E-8's "entry point" is now one `↓` from the search field, not `autoFocus`.
- **The row memo** (`TabListItem.tsx:114-122`), whose comparator is `beforeTab !== afterTab`,
  `beforeGroup?.color !== afterGroup?.color`, then `===` over every remaining prop. **D-6** is this
  plan's commitment about it.

If the branch is cut from `main` instead, `TabDisplay` still carries `focus` and `autoFocus`
(`main:TabDisplay.tsx:31,34,99`), and every line number in T-2 is wrong by two.

## 2. Design decisions this plan makes

The spec chose the pattern (DEC-1). These are the mechanics it left open. Each is a decision, not a
discovery.

- **D-1 — The row's existing container element becomes the toolbar; nothing new wraps it.** All three
  row kinds keep `ListItemButton` and gain `component="div"` + `role="toolbar"` + `tabIndex={-1}` +
  `aria-label`. Grounded in finding 4 above. Consequences, all of them wanted: every control already
  inside the row is inside the toolbar, so AC-28's "full control census" holds by construction;
  `rowControlsSx`, `rowTailMaskSx` and `rowTailReserveSx` keep matching, because their selectors are
  relative to that same element; and `selected={tab.active}` keeps setting `Mui-selected` and **not**
  `aria-selected`, which is what AC-16 requires.
  **Rejected:** a plain `<div role="toolbar" onClick=…>`. `jsx-a11y/recommended` is on and
  `--max-warnings 0` (`package.json` lint script), and `no-noninteractive-element-interactions` fires
  on a lowercase DOM element with a structure role and a click handler. It does **not** fire on
  `<ListItemButton>`, because `.eslintrc.cjs` declares no `settings["jsx-a11y"].components` mapping.
  Swapping to a bare div trades a role change for a lint fight.
- **D-2 — One `list`, rendered by the two views, never by `Tabs`.** A new
  `src/lib/Tabs/elements/RowList.tsx` (`role="list"`, `aria-label="Open tabs"`) wraps the whole
  `windows.map(…)` in `TabsView` and the whole `(windows ?? []).map(…)` in `SearchView`, **after**
  each view's early-return empty state. That gives exactly one list per rendered surface (AC-3), no
  list at all when there is nothing to show (E-4), the right answer in `SearchView`'s window-row-less
  shape (E-3) and in the single-window shape (E-2), and it keeps the `role="status"` live region
  (`App.tsx:327`) outside the list, where it must be.
  **`role="listitem"` goes on `TabGrid`** (`elements/TabGrid.tsx:14-22`), which is already exactly
  one per row — and which `DropPlaceholder` and `WindowDropzone` both render, so both become
  `listitem`s for free and AC-31 is satisfied by construction rather than by a rule. The window row
  is the one row not built on `TabGrid`; it gets a `<Box role="listitem">` **inside** its `Dropzone`
  and **around `WindowDisplay` only** — the `{isOver && <DropPlaceholder/>}` at
  `WindowListItem.tsx:147` must stay outside it, or a `listitem` nests inside a `listitem` and
  `aria-required-parent` fires (`axe.js:27651-27682` returns the missing context the moment it meets
  a roled ancestor that is not a `list`).
- **D-3 — `data-tab-row` and `data-active-tab` move onto the tab row's primary-action button.** They
  are on the row container today (`TabDisplay.tsx:96-97`), and the row container stops being
  focusable — so `row.focus()` in `App.tsx:292` would become a silent no-op. Moving the attributes
  onto the primary button keeps **`App.tsx` untouched**, keeps all four SPEC-05 assertions
  (`App.test.tsx:52,101,115,128`) meaningful, and lands `↓` on the row's **first control**, which is
  exactly AC-36 and E-8. **Rejected:** keeping them on the row and teaching `App.tsx` to query
  inward — it edits a `ui-shell` file to fix a `tab-list` change, and it makes the entry path depend
  on two files agreeing.
- **D-4 — The walk order per row kind, fixed here so three units cannot drift.** Stop 0 is the
  primary action; the drag handle is last (AC-30); nothing else moves.

  | Row kind          | Walk order after this plan                                    | Today (§1.4a)                        |
  | ----------------- | ------------------------------------------------------------- | ------------------------------------ |
  | Tab, silent       | **activate** → select → close → **reorder**                   | row → select → reorder → close       |
  | Tab, audible/muted| **activate** → select → mute → close → **reorder**             | row → select → mute → reorder → close|
  | Group             | **expand/collapse** → select → actions menu → close → **reorder** | row → select → reorder → menu → close |
  | Window            | **expand/collapse** → select → close → switch-to-window        | row → select → close → switch        |

  Stop **count is unchanged** in every row: 4, 5, 5, 4. That is AC-9's whole point and it is what
  makes §13.1's retreat a retreat.
- **D-5 — The tab stop does not rove.** The primary-action button is `tabIndex={0}`, every other
  control stays `tabIndex={-1}`, and **nothing reassigns them**. APG's roving tabindex moves the `0`
  to the last-focused control; **AC-36 explicitly forbids that memory** ("focus … SHALL land on that
  row's **first** control, not on the control last focused there"). A fixed stop satisfies AC-34,
  AC-36 and AC-9 at once and adds no state. §1.7's table calls the current model "roving in shape";
  read that as "one stop in, arrows within" — the mechanic AC-36 actually specifies is a fixed stop,
  and that is what ships. `rowControls.ts` gains `rowPrimaryProps = { "data-row-control": true,
  tabIndex: 0 }` beside `rowControlProps`, so there is one definition of each, per AC-23's standing
  rule about that file.
- **D-6 — No new prop crosses the `TabListItem` memo boundary, and this is a checked property, not an
  intention.** Every name this plan adds to a tab row is derived from `tab` *inside* `TabDisplay`;
  the drag handle is already built inside `TabListItemRow` (`TabListItem.tsx:79-84`), below the memo.
  So `TabListItem`'s prop set is unchanged and the comparator at `TabListItem.tsx:114-122` is
  untouched. **DoD for every unit that edits a tab-row file: `git diff` shows no change to
  `TabListItem.tsx`'s comparator and no new prop on `TabListItem`.** Measured cost of getting this
  wrong, from `LEARNINGS.md` 2026-09-29: one changed title goes from 33 ms back to 500 ms at 80 tabs.
  Where a prop genuinely has to cross — the window row's ordinal in D-7 — it is a **number**, which
  the comparator's `keys.every(key => beforeRest[key] === afterRest[key])` compares correctly, and
  `WindowListItem` is not memoised at all, so it costs nothing.
- **D-7 — Names, and the one place the subject is not enough.** AC-29 requires each toolbar's name to
  be distinct and derived from the row's subject. Two windows with the same tab count have the same
  subject, so the window row takes its 1-based position among rendered windows as a prop from
  `TabsView` (`index.tsx:46-61`, where the map index is already in hand). §10 authorises this — "Row
  position and set size — [new, derived]". Tab rows are named from title + host, which is distinct
  for every distinct tab; **two tabs open on the same page still collide**, and that is §8 item 1,
  not something to invent around.

  | Row kind | Toolbar name (AC-29)                              | Primary button name (AC-6, AC-32, AC-33)              |
  | -------- | ------------------------------------------------- | ------------------------------------------------------ |
  | Tab      | **AM-3 (2026-09-30):** `title, site[, current tab][, muted \| playing audio][, selected], n of N` — was `` `${title \|\| "tab"}, ${host}` `` | **AM-3:** `Switch` — was `` `Switch to ${title \|\| "tab"}` `` |
  | Group    | **As built in T-4 (2026-09-30), wording awaits a listen:** `Work, group, 3 tabs`, or `Untitled, group, …` with no title — was `` `Group ${title \|\| "untitled"}` `` | **As built:** `Tabs`, with `aria-expanded` carrying the state — was `Collapse group …` / `Expand group …` |
  | Window   | **As built in T-5 (2026-10-01), wording awaits a listen:** `Window 1, 12 tabs[, current window]` — was `` `Window ${n}, ${count} tab(s)` `` | **As built:** `Tabs`, with `aria-expanded` — was `Hide this window's tabs` / `Show …` |

  The group and window chevrons share one name and let `aria-expanded` say which way they are.
  A name that changes between "Collapse" and "Expand" says the state twice, once in the name and
  once in the state, and the toolbar around the chevron has already said which row it is.

  `Group …` is deliberately **not** `Actions for …`: `GroupListItem.tsx:139` already names the
  `MoreVert` button `Actions for group {title}` and AC-29 forbids the collision. Every one of these
  is a **string** passed to the `aria-label` prop — never an `aria-labelledby` id, never a selector,
  never markup (AC-24, §11). `host` is derived with `URL(...).hostname` inside a `try`, falling back
  to the raw string; it is text either way and reaches no sink.
- **D-8 — The chevron's render gate does not change; a search-result group row has no primary
  action.** *(Decided by the user 2026-09-29; this decision was reversed from the draft plan, and
  the reasoning that produced the earlier version is kept below because it is the argument someone
  will re-make.)* Today the chevron is gated on `expanded === undefined`
  (`GroupListItem.tsx:183`), so in `SearchView` — which passes `expandedGroups`
  (`SearchView/index.tsx:58`) — a group row has no chevron. The draft plan rendered it always,
  reasoning that the chevron *is* the primary action and a row without one fails AC-32.

  The premise was wrong. AC-32 requires the primary action to do **what clicking the row body does
  today**, and in search results that is *nothing*: groups are force-expanded, so the row's collapse
  click has no visible effect. A row whose body does nothing has nothing to mirror. Inventing a
  control to satisfy the criterion would add an affordance the product does not have, make a control
  permanently visible that is not today, and let people collapse groups inside search results — a
  behaviour change nobody asked for.

  So: the gate at `:183` **stays**. In the tab list a group row's toolbar begins with the chevron as
  its primary action; in search results it begins at the select-all control, and AC-32 carries the
  carve-out saying why. Nothing about the search results changes visually, which also retires R-5.
- **D-9 — `useRowKeys` drops the row from its own stop list.** `rowControls.ts:176-179` builds
  `[row, ...row.querySelectorAll("[data-row-control]")]`. The row is no longer focusable, so index 0
  can never match `document.activeElement` and Left from the first control would call `focus()` on a
  non-focusable div. It becomes `[...row.querySelectorAll("[data-row-control]")]` — one line, and
  the only change **this plan** makes to the file the spec says it changes least. AC-34, AC-35,
  AC-36 and AC-37 pin the result.

  **Updated 2026-09-30.** `useRowKeys` is no longer the function this plan was written against.
  It has since gained an `ArrowUp` branch, ahead of the walk, that returns focus to the search
  field — the exit from the list, added because `↓` put focus on a row and nothing brought it
  back. Three things follow for T-2. The branch sits **above** the `stops` array this decision
  edits, so whoever changes one has to read the other. Left/Right now reject modified arrows via
  a shared `isPlainArrow` predicate, which `App` uses for its half of the model, so a change to
  the walk's key rules is a change to two call sites. And the `dragActive` guard now runs before
  the key test rather than after it, covering every key rather than only the walk's.

  **Updated again 2026-09-30, fix round 1 (review finding).** Dropping the row outright was right
  for the tab row only. `useRowKeys` also serves the group and window rows, which stay focusable
  `ListItemButton`s until T-4 and T-5 convert them, and they lost Left/Right the moment the row
  left `stops`. The row is now a stop exactly when it is itself focusable
  (`row.tabIndex >= 0`), read off the element with no new prop. T-4 and T-5 need do nothing here:
  setting their row to `tabIndex={-1}` drops it from the walk by construction.
  **Updated 2026-10-02, fix round 3.** With all three rows converted, no row is ever a stop, and
  the `row.tabIndex >= 0` branch is gone. One case remains where the row itself has focus: a
  pointer click on its padding, because `tabIndex -1` is still focusable by a click. From there
  Right steps into the first control and Left does nothing.
- **D-10 — axe arrives as `axe-core` in `devDependencies`, not as `vitest-axe`.** AC-25 says
  "`vitest-axe` **or equivalent**", and the defect it names is depending on
  `eslint-plugin-jsx-a11y`'s transitive copy. `axe-core@4.13.0` is already resolved in
  `package-lock.json`; declaring it directly is a lockfile no-op that turns a transitive dependency
  into an owned one, and it avoids betting the gate on a wrapper's peer range against this repo's
  `vitest ^5.0.1`. The wrapper is ~30 lines (`src/test/axe.ts`) and we own it. NFR-6 is met and
  guarded: T-7 asserts no non-test file under `src/` imports axe.
- **D-11 — A control whose children are block content is a `div` with `role="button"`, not a
  `<button>`.** *(Added 2026-10-02, T-8.)* The tab row's primary control wraps the avatar, the
  text box and the secondary line's `<p>`; the window row's switch control wraps the avatars. HTML
  allows only phrasing content inside a `<button>`. MUI's `component="div"` sets the role and
  handles Enter and Space itself, and the box does not change: measured at 400 px, every control
  kept its position. A test over all three row kinds keeps a `div` or `p` from returning inside a
  native button. **Rejected:** converting the children to `span`s, which touches four MUI
  components and their display rules to change nothing a user can perceive.

## 3. Task units

Tracks: `ui` (React/MUI surface) · `a11y-infra` (test tooling, no product code) · `verify` (manual or
harness, no production code).

### T-0 · Wire axe in, and record today's numbers before they move

- **Track:** a11y-infra · **Files:** `package.json`, `package-lock.json`, `src/test/axe.ts` (new),
  `src/test/rowFixtures.tsx` (new), `src/lib/Tabs/rows.a11y.test.tsx` (new), and §A of
  `plans/MANUAL-SWEEP-SPEC-04.md`
- **Why first:** AC-1 and AC-9 are both *comparisons* — "today those same two fixtures measure 8 and
  20", "today: **20**". After T-2 there is no today left. Same shape as PLAN-SPEC-05's T-0, and
  cheaper: this baseline is capturable from a test, because wiring axe changes no product code.
- **Scope:**
  - `npm i -D axe-core@^4.13.0`. Confirm the lockfile's resolved version is unchanged — it is
    already there at 4.13.0 via `eslint-plugin-jsx-a11y`, so the diff should be `package.json` plus
    a `dev: true` flip, nothing more (D-10).
  - `src/test/axe.ts`: `runAxe(container, options?)` → `axe.run(container, { …, resultTypes:
    ["violations"] })`, plus `expectNoViolations(results, ruleId?)` that fails with the offending
    selectors and axe's own message, not a bare count.
  - `src/test/rowFixtures.tsx`: the four fixtures §1.1 measured, built once and shared —
    **5 plain tabs**, **20 plain tabs**, **2 windows / 1 group / 6 tabs (1 audible, 1 muted)**,
    **1 window / 1 collapsed group / 2 tabs** — as `installChrome()` fixture sets, plus a
    `renderList()` that mounts `TabsView` inside `SelectionProvider` the way §15's measurement log
    did.
  - `src/lib/Tabs/rows.a11y.test.tsx`: run `nested-interactive` over all four and **assert today's
    numbers: 5, 20, 8, 2**. Assert the tab-stop count for the 20-tab fixture is **20**, by
    `userEvent.tab()` in a loop. Record all of it in §A of the sweep document.
- **Pitfall — this test must be red at the end of the branch, in a good way.** It asserts the
  *current* violating numbers, so T-2/T-4/T-5 will each break it. That is the point: it is the
  falsification `LEARNINGS.md` (2026-09-23) demands, and it is also AC-25's proof — "fails when a row
  is reverted to `role="button"`" is demonstrated by the tree it was written against. **Do not delete
  it when it turns red.** Convert it, in T-7, into the zero-violation assertion with the old numbers
  kept in a comment and in §A of the sweep.
- **Pitfall — no globals.** `vitest.config.ts:12-15`: `describe`/`it`/`expect` are imported
  explicitly or `no-undef` breaks the lint gate rather than warning.
- **Pitfall — the stub clones what it hands out** (`chromeStub.ts`, LEARNINGS 2026-09-24). A fixture
  builder that hands back live references will make a later assertion pass for the wrong reason.
- **Pitfall — `npm run build` type-checks tests** (`tsconfig.json` `include: ["src"]`). A fixture
  with a wrong `TabItem` field leaves the suite green over a red build; it has happened twice.
- **DoD:** the four baseline counts are asserted and recorded in §A with the axe-core version;
  `expectNoViolations` fails loudly with selectors when given a violation; `npm run lint`,
  `npm test`, `npm run build` all pass.
- **ACs:** **AC-25** _(the check exists, and is falsified by the tree it was written against)_,
  **AC-1** _(baseline half)_, **AC-9** _(baseline half)_, **AC-2** _(no rule is disabled — assert the
  axe config passed anywhere in `src/` has no `rules: { "nested-interactive": … }` and no
  `disableOtherRules`)_

### T-1 · One list, one item per row

- **Track:** ui · **Files:** `src/lib/Tabs/elements/RowList.tsx` (new),
  `src/lib/Tabs/elements/TabGrid.tsx`, `src/views/TabsView/index.tsx`,
  `src/views/SearchView/index.tsx`, `src/lib/Tabs/Window/WindowListItem.tsx`,
  `src/lib/Tabs/elements/RowList.test.tsx` (new), `src/views/TabsView/TabsView.test.tsx`
- **Why second, and why it is safe to do before the gate:** the row is a `listitem` under the chosen
  toolbar shape **and** under §13.1's VS Code retreat. This is the only substantial unit that a "no"
  at T-3 does not invalidate.
- **Scope:**
  - `RowList`: `<Box role="list" aria-label="Open tabs">{children}</Box>`. Two consumers, so it is a
    shared element rather than two copies.
  - `TabsView`: wrap `windows.map(…)` (`index.tsx:46-61`) in `<RowList>`, **below** the empty-state
    early return at `:31-42` (E-4 — an empty container must not announce itself as a list of zero).
  - `SearchView`: same, around `(windows ?? []).map(…)` (`index.tsx:56-65`), below the "No tabs
    match" early return at `:44-52` (E-3).
  - `TabGrid` gains `role="listitem"`. This makes `DropPlaceholder` (which renders `TabGrid`) and
    `WindowDropzone`'s spacer `listitem`s automatically — AC-31 and E-14, by construction.
  - `WindowListItem`: `<Box role="listitem">` around `<WindowDisplay …/>` only, **inside** the
    `Dropzone` and **excluding** `{isOver && <DropPlaceholder />}` at `:147`.
- **Pitfall — a `listitem` inside a `listitem` fires `aria-required-parent`.** `getMissingContext`
  (`axe.js:27661-27680`) walks up and stops at the first ancestor that has a role; if that role is
  `listitem` rather than `list`, it returns the missing context. This is exactly what happens if the
  window row's new wrapper is put around the whole `Dropzone` body.
- **Pitfall — do not put `aria-*` on any wrapper between the list and its items.** axe treats a
  role-less, aria-less, non-focusable element as transparent (`axe.js:27783-27786`), which is what
  lets `Grid container` → `Grid item` → styled `Dropzone` div sit in between. **One global `aria-*`
  attribute on any of them turns that div into an unallowed owned child of the list** and fires
  `aria-required-children`. Write it down next to `RowList`; it is invisible until axe runs.
- **Pitfall — `aria-posinset` / `aria-setsize` are deliberately *not* set.** Native `list`/`listitem`
  is what AC-3 asks for and it costs no props; computing a flat index across windows and groups would
  put a number on every row and defeat the memo for every row on every list change (D-6). If the T-3
  or T-10 screen-reader pass reports the wrong "n of m", **that** is when explicit `aria-posinset` /
  `aria-setsize` go on, with the memo cost accepted and recorded. Named in advance so nobody invents
  a different fallback under pressure.
- **Pitfall — `TabsView.test.tsx` pins the empty states.** Its four empty/first-query assertions
  (`TabsView.test.tsx:88-155`) must pass **unmodified**; if one needs editing, the list wrapper has
  leaked above the early return.
- **DoD:** `getByRole("list")` resolves to exactly one element in every fixture, in both views;
  `getAllByRole("listitem")` returns **2, 5, 8 and 20** for the four fixtures; a `DropPlaceholder`
  rendered between two rows is a `listitem`; `aria-required-children` and `aria-required-parent`
  report zero nodes on all four fixtures; the empty state renders **no** list; `TabsView.test.tsx`
  passes unmodified; `npm test` / `npm run lint` / `npm run build` pass.
- **ACs:** **AC-3** _(unit)_, **AC-4** _(unit — assert no `list` appears inside a `listitem`)_,
  **AC-31** _(structural half; the mid-drag axe run is T-7)_, E-2, E-3, E-4, E-14

### T-2 · The tab row becomes a toolbar

- **Track:** ui · **Files:** `src/lib/Tabs/elements/rowControls.ts`,
  `src/lib/Tabs/Tab/TabDisplay.tsx`, `src/lib/Tabs/elements/DragHandle.tsx`,
  `src/lib/Tabs/Tab/TabDisplay.test.tsx`
- **Scope, `rowControls.ts`:**
  - add `rowPrimaryProps = { "data-row-control": true, tabIndex: 0 } as const` beside
    `rowControlProps` (`:21-24`), with a comment saying why there are two (D-5);
  - `useRowKeys`: drop `row` from `stops` (`:176-179`) — D-9. Everything else in that function,
    including the `dragActive` early return at `:174`, is untouched.
- **Scope, `TabDisplay.tsx`** (line numbers from the base branch, §1.1):
  - `:87` `ListItemButton` gains `component="div"`, `role="toolbar"`, `tabIndex={-1}` and
    `aria-label={toolbarName}`; keeps `dense`, `onClick={handleActivate}`, `onKeyDown={handleRowKeys}`,
    `selected={tab.active}` and the whole `sx` array at `:106`;
  - `data-tab-row` / `data-active-tab` (`:96-97`) move off it and onto the primary button (D-3);
  - new **primary-action button**, first in DOM, wrapping `ListItemAvatar` (`:147-156`) and
    `ListItemText` (`:186-191`): a `ButtonBase` with `{...rowPrimaryProps}`,
    `aria-label={`Switch to ${tab.title || "tab"}`}`, `sx={{ flex: 1, minWidth: 0, justifyContent:
    "flex-start", textAlign: "left", p: 0 }}`, and an `onClick` that calls `handleActivate` **after**
    `event.stopPropagation()`;
  - the select checkbox (`:122-144`) moves to **after** the primary button, unchanged otherwise;
  - inside `ListItemSecondaryAction` (`:157-179`), order becomes **mute → close → `{dragHandle}`**;
    `edge="end"` moves off Close (`:172`) and onto the drag handle.
- **Scope, `DragHandle.tsx`:** add an optional `edge?: "start" | "end"` prop, passed straight to
  `ItemButton`, defaulting to `undefined`. `CurrentTab` (`CurrentTab/index.tsx:149`) passes nothing
  and is unaffected — it is not a row (NG-6) and must not move.
- **Pitfall — the double activation.** The row keeps `onClick={handleActivate}` so a click anywhere on
  it still activates (AC-18, NG-2, AC-14's pointer-drag path). The primary button now sits inside it,
  so a click on the title would fire both. `stopPropagation()` in the button's handler is the whole
  fix, and the event must still be **passed through** to `handleActivate` — it reads `e.ctrlKey ||
  e.metaKey` (`TabDisplay.tsx:39`) and a Ctrl-click that loses its modifier silently stops selecting.
- **Pitfall — `ListItemButton`'s role is overridable, and that is the only reason this unit is
  small.** `ButtonBase.js:263` sets `role: 'button'` for a non-`button` component, and the render
  spreads `other` after `buttonProps`, so the explicit prop wins. **Assert it** — `expect(row).toHaveAttribute("role", "toolbar")` and `expect(row).toHaveAttribute("tabindex", "-1")`
  — rather than trusting the read. If a MUI upgrade reverses the order this is the test that says so.
- **Pitfall — do not delete `&:focus-visible` from `revealedRow` or `rowControlsSx`.** The row is no
  longer focusable, so those two selectors become unreachable, and the reveal now comes from
  `&:has(:focus-visible)` (`rowControls.ts:41`) matching the focused primary button. Leaving dead
  selectors costs nothing; removing them is a behaviour claim jsdom cannot check, in a file that has
  had to re-fix this behaviour twice (AC-23, LEARNINGS 2026-09-28). Add a dated comment instead.
- **Pitfall — AC-10 is satisfied by construction, so assert the construction.** The only Tab stop is
  the primary button, and the primary button is **not** inside `.itemAction`, so it can never be an
  `opacity: 0` silent stop. The test to write is `expect(primary.closest(".itemAction")).toBeNull()`,
  not a computed-style check jsdom cannot arbitrate (LEARNINGS 2026-09-28 on what `sx` testing can
  and cannot answer).
- **Pitfall — never `visibility: hidden`** (`rowControls.ts:9-13`, E-13). It removes the element from
  `focus()` entirely and fails intermittently.
- **Pitfall — the memo.** No new prop on `TabListItem`; `toolbarName` and the primary button's name
  are derived from `tab` inside `TabDisplay` (D-6).
- **Pitfall — `TabDisplay.test.tsx` will need real edits, and one of them is a trap.** It renders
  `<TabDisplay tab={item} focus={false} />` on `main` but **not** on the base branch — confirm which
  tree you are on before "fixing" a prop that is already gone (§1.1). Its hostile-title test
  (`:44-60`) asserts the **origin** of every `<img>`, deliberately, and must keep doing so
  (LEARNINGS 2026-09-24 on absence-assertions).
- **DoD:** `getAllByRole("toolbar")` returns one per tab row and each has a non-empty `aria-label`;
  `nested-interactive` reports **zero** nodes on the 5- and 20-plain-tab fixtures (down from 5 and
  20); `userEvent.tab()` visits exactly **20** elements in the 20-tab fixture, one per row, and none
  of them is a secondary control; Left/Right walk **activate → select → (mute) → close → reorder**
  and stop dead at both ends; Home and End move nothing within a row; Tab away and Shift+Tab back
  lands on the primary button; Enter and Space on the primary button call the same handler the row's
  `onClick` calls; a Ctrl-click on the row still selects and does nothing else; the drag handle is the
  final `[data-row-control]` in document order; `data-tab-row` / `data-active-tab` are on the primary
  button and `App.test.tsx`'s four assertions pass **unmodified**; `TabListItem` gains no prop and its
  memo comparator is untouched (D-6), per the user's 2026-09-30 decision to set the handle's `edge`
  at its source; `npm test` / `npm run lint` / `npm run build` pass.
- **ACs:** **AC-5**, **AC-6**, **AC-7** _(unit half)_, **AC-9**, **AC-10**, **AC-16**, **AC-17**,
  **AC-18**, **AC-24** _(tab row)_, **AC-28**, **AC-29** _(tab row)_, **AC-30** _(tab row)_,
  **AC-32** _(tab row)_, **AC-34**, **AC-35**, **AC-36**, E-5, E-11, E-13

### T-3 · Gate — a real Chrome, NVDA, and eighty rows

- **Track:** verify · **Files:** none (results into `plans/MANUAL-SWEEP-SPEC-04.md` §B)
- **Why here, and not at the end:** A-7 is the only assumption in SPEC-04 that is neither measured nor
  cited, it is load-bearing, and §13.1 names the retreat in advance. Running it now costs one row
  kind. Running it after T-4 and T-5 costs three, plus their tests. This is the same ordering
  PLAN-SPEC-05 used for T-5, for the same reason.
- **Steps:** `npm run build`, load `dist/` unpacked, NVDA + Chrome, on the **side panel** first:
  1. with ~20 tabs open, Tab down the list from the search field. Record **verbatim** what NVDA says
     on entering each row — is the toolbar announced before the tab's title, and how long is it;
  2. the same at ~80 tabs, and record whether the announcement shortens after the first few rows
     (NVDA suppresses repeated container announcements in some configurations — whether it does here
     is the whole question);
  3. `↓` from the search field — does focus land on the active tab's row and is it announced as the
     tab, not as the toolbar;
  4. record what NVDA says for the list itself: "list with N items", and whether "item n of N" is
     correct on each row. A wrong N is the trigger for T-1's named fallback, not a redesign;
  5. Left/Right within one row, and Tab out to the control bar.
- **DoD:** §B of the sweep is filled in with the NVDA version, the Chrome version, the date and the
  tester. **If step 1 or 2 finds the per-row toolbar announcement intolerable at 20+ rows — that is,
  the user must sit through a toolbar announcement before hearing the tab — stop and re-plan T-2, T-4
  and T-5 against §13.1's VS Code shape**: row stays a `listitem`, the primary action becomes a plain
  `button` outside any toolbar, the secondary controls move into a `toolbar` beside it, at a cost of
  **two Tab stops per row (40 at 20 tabs)**. T-0 and T-1 stand either way. If step 4 reports a wrong
  item count, add `aria-posinset`/`aria-setsize` per T-1's pitfall.
- **ACs:** **AC-27** _(the side-panel third; the anchor tab and the float are T-10)_, A-7, E-16

### T-2b · Name the tab row once — title first, then site, state and place

_Added 2026-09-30 from the T-3 gate. SPEC-04 AM-3 (§13.3) amends AC-3, AC-6 and AC-29; the prototype
`proto/row-names` (`e7340ac`) is the reference that was judged by ear, not a patch to merge._

- **Track:** ui · **Files:** `src/lib/Tabs/Tab/TabDisplay.tsx`, `src/lib/Tabs/elements/RowList.tsx`,
  `src/lib/Tabs/Tab/TabDisplay.test.tsx`, `src/lib/Tabs/elements/RowList.test.tsx`, and any existing
  test that asserts `Switch to …` (grep first; `App.test.tsx` included)
- **Scope:**
  - `TabDisplay`: the toolbar name is built in the AM-3 order from `tab`, `hostOf`, `muted` and
    `isSelected`, all of which are already in the component. There is no new prop (D-6).
    The name goes on both `aria-label` and `data-row-label`. The primary control's `aria-label` becomes `Switch`.
  - `RowList`: after commit, append `, n of N` to every `[data-row-label]` element in document order.
    A `MutationObserver` on the list (`childList`, `subtree`, and `attributeFilter: ["data-row-label"]`)
    re-numbers when rows are added, removed or renamed. It never observes `aria-label`, which it
    writes itself, and it writes only when the value differs.
  - Numbering is counted over **tab rows only**, the rows actually rendered, so a collapsed
    group or window, or a search filter, changes N.
- **Why the DOM, not a prop.** A position prop re-renders every row after an insertion, which is
  exactly the cost D-6 was built to remove. Written after commit, the number costs the memo nothing.
  React writes the base name into `aria-label` too, so a row rendered outside a `RowList` still has
  a name. Examples are the drag overlay and a unit test rendering `TabDisplay` alone.
- **Pitfall — React and the observer both write `aria-label`.** React writes only when
  `toolbarName` changes, and then also changes `data-row-label`, which triggers the renumber. If
  React ever writes on a render where the name did not change, the ", n of N" disappears until
  the next mutation. Assert that a re-render with an unchanged tab keeps the position.
- **Measure, don't assume.** At 80 rows, time one renumber pass (a filter keystroke, and a
  close), compare against the pre-change keystroke cost, and record both in `LEARNINGS.md`.
  If a pass costs more than a few milliseconds, stop and report.
- **DoD:**
  - The name is asserted for a plain tab, the active tab, audible, muted, selected, a combined
    state, a no-title tab and a `data:` URL.
  - The primary is named `Switch`, and every other control still contains the title (AC-6 as amended).
  - Filtering renumbers (1…3 of 3). Closing a row renumbers the rest. A collapsed group drops its tabs from N.
  - A title change updates the name without a remount, and a re-render keeps the position.
  - AM-1's distinctness holds, including for two same-title tabs.
  - The 80-row timing is recorded.
  - `TabListItem.tsx` gains no prop.
  - `npm test`, `npm run lint` and `npm run build` pass.
- **ACs:** **AC-3** _(as amended)_, **AC-6** _(as amended)_, **AC-29** _(tab row, as amended)_, E-18
- **Open for T-4/T-5 (not decided here):** the group and window rows would have the same doubling.
  The group toolbar reads `Group X`, then its primary `Collapse group X`. Apply AM-3's principle
  there too (title once, first; a short primary), but settle the wording by ear when T-4 is built,
  not on paper now.

### T-4 · The group row

- **Track:** ui · **Files:** `src/lib/Tabs/TabsGroup/GroupDisplay.tsx`,
  `src/lib/Tabs/TabsGroup/GroupListItem.tsx`, `src/lib/Tabs/TabsGroup/GroupDisplay.test.tsx`
- **Scope:**
  - `GroupDisplay.tsx:49` — same treatment as T-2: `component="div"`, `role="toolbar"`,
    `tabIndex={-1}`, `aria-label={`Group ${group.title || "untitled"}`}`. `onClick={handleClick}`
    (`:50`) and `onKeyDown={rowKeys}` (`:51`) stay, including the early `return` after `onCtrlClick`
    (`:39-42`) that AC-18 names;
  - `GroupListItem.tsx:180-204` (`pre`) — the chevron `IconButton` (`:185-187`) loses `aria-hidden`,
    gains `{...rowPrimaryProps}`, `aria-expanded={!group.collapsed}` and
    `aria-label={`${group.collapsed ? "Expand" : "Collapse"} group ${group.title || ""}`.trim()}`,
    an `onClick` that does what the row's click does (`chrome.tabGroups.update(id, { collapsed:
    !collapsed })`) and stops propagation. **The `expanded === undefined &&` gate at `:183` stays**
    (D-8): where there is no chevron there is no row-body action to mirror, and the toolbar begins
    at the select-all control instead;
  - `GroupListItem.tsx:127-155` (`itemAction`) — order becomes **MoreVert → Close → DragHandle**,
    with `edge="end"` moving from the Close button (`:147`) to the handle.
- **Pitfall — `expanded` still gates the children, only not the button.** `:270-274` renders the
  group's tabs on `(!group.collapsed || expanded)`. That expression does not change; only the
  chevron's own render gate does. Getting this backwards makes search results collapse.
- **Pitfall — the chip's reservation is calibrated and the reorder disturbs it.** `rowTailReserveSx(88.3)` at `GroupDisplay.tsx:90` is the *container's* measured width, which is
  12 px less than its three buttons add up to because of `edge="end"` (LEARNINGS 2026-09-28). Moving
  `edge="end"` from Close to the handle keeps the same three buttons and the same −12, so 88.3 should
  hold — **should**, and `GroupDisplay.test.tsx` asserts the literal `calc(100% - 96.3px)`. Do not
  edit that number to make a test pass; re-measure it in the harness (T-8) and change both together
  or neither.
- **Pitfall — E-15, the portalled menu.** `Menu` (`:276-292`) portals outside the row's subtree, so
  focus leaves the toolbar while it is open. **Nothing needs to survive that**, because D-5's tab
  stop does not rove — say so in a comment, because the obvious defensive code here is state that
  AC-36 forbids. The `open &&` override at `:245-250` that holds the controls visible must keep
  setting `opacity`, not `visibility` (LEARNINGS 2026-09-23).
- **Pitfall — two names, one row.** The toolbar is `Group X`; the `MoreVert` stays
  `Actions for group X` (`:139`). AC-29 exists because those two must not converge.
- **DoD:** one `toolbar` per group row with a distinct non-empty name; the chevron has a name and an
  `aria-expanded` and no `aria-hidden`; it renders in `SearchView` too; Enter on it collapses/expands
  exactly as clicking the row body does; walk order is **expand → select → menu → close → reorder**;
  the handle is the final `[data-row-control]`; `nested-interactive` is zero on the group fixtures;
  `GroupDisplay.test.tsx`'s two reservation assertions pass unmodified; `npm test` / `npm run lint` /
  `npm run build` pass.
- **ACs:** **AC-5**, **AC-6**, **AC-18**, **AC-19** _(group select-all name unchanged)_, **AC-28**,
  **AC-29** _(group)_, **AC-30** _(group)_, **AC-32** _(group)_, **AC-33** _(group chevron)_, E-1,
  E-9, E-12, E-15

### T-5 · The window row

- **Track:** ui · **Files:** `src/lib/Tabs/Window/WindowDisplay.tsx`,
  `src/lib/Tabs/Window/WindowListItem.tsx`, `src/views/TabsView/index.tsx`,
  `src/lib/Tabs/Window/WindowDisplay.test.tsx` (new)
- **Scope:**
  - `WindowDisplay.tsx:38` — `component="div"`, `role="toolbar"`, `tabIndex={-1}`, `aria-label`
    from a new `label` prop; `onClick={handleOpenClick}` and `onKeyDown={rowKeys}` stay;
  - the chevron `IconButton` (`:53-55`) loses `aria-hidden`, gains `{...rowPrimaryProps}`,
    `aria-expanded={isOpen}`, `aria-label={isOpen ? "Hide this window's tabs" : "Show this window's
    tabs"}`, and an `onClick` calling `handleOpenClick` with `stopPropagation`;
  - `WindowListItem` gains `index: number` and `count: number`, passed from `TabsView`'s map
    (`index.tsx:46-61`), and composes `Window ${index + 1}, ${flatTabs.length} tab(s)` for the
    toolbar name (D-7). `WindowListItem` is not memoised, so this costs nothing;
  - no drag handle on a window row, so AC-30 does not apply (§1.4a).
- **Pitfall — `single` means no window row at all** (`WindowListItem.tsx:137`, E-2). The count and
  the index must describe **rendered** windows, and `TabsView` already filters to windows that have
  tabs (`index.tsx:15-17`). Compute both from the filtered array, not from `allWindows`.
- **Pitfall — the switch-to-window `Button` stays last in the walk** and keeps its measured-count
  name (`WindowDisplay.tsx:63-65`). It is not the primary action; the chevron is (E-12).
- **DoD:** one `toolbar` per window row, named distinctly even when two windows hold the same number
  of tabs; the chevron is named, exposes `aria-expanded` and carries no `aria-hidden`; walk order is
  **expand → select → close → switch**; `nested-interactive` is zero across all four fixtures;
  `npm test` / `npm run lint` / `npm run build` pass.
- **ACs:** **AC-5**, **AC-6**, **AC-19** _(window select-all name unchanged)_, **AC-28**,
  **AC-29** _(window)_, **AC-32** _(window)_, **AC-33** _(window chevron)_, E-2, E-12

### T-6 · Reordering, pinned rather than commented

- **Track:** ui · **Files:** `src/App.tsx`, `src/lib/Tabs/elements/rowControls.test.ts` (new),
  `src/lib/Tabs/elements/DragHandle.test.tsx` (new)
- **Scope:**
  - `App.tsx` — `DndContext` (`:234`) gains an explicit `accessibility={{ announcements,
    screenReaderInstructions }}`. AC-15 forbids leaving dnd-kit's defaults "to be guessed at"; the
    keys are already written down in §1.6 and DEC-4 (Space/Enter to pick up and drop, four arrows to
    move, Escape to cancel), and this is the code half. `setRowDragActive` (`:205`, `:210`, `:225`)
    and both sensors (`:193-200`) are **not** touched — DEC-4 and NG-7;
  - `rowControls.test.ts` — the hand-off, asserted: with `setRowDragActive(true)`, an arrow press
    through `useRowKeys` leaves `document.activeElement` unchanged, does not `preventDefault` and
    does not `stopPropagation`; after `setRowDragActive(false)`, Left/Right move within the row
    again;
  - `DragHandle.test.tsx` — the handle is the only element carrying dnd-kit's `attributes`, it ends
    at `tabIndex={-1}` after them (`DragHandle.tsx:69-70`), its `onClick` swallows the click so
    grabbing is not activating (`:53-56`), and its ref reaches `setActivatorNodeRef` (AC-13's
    precondition, `ItemButton.tsx:4-8`).
- **Pitfall — AC-12's first clause is not reachable in jsdom, and pretending otherwise is worse than
  saying so.** "arrow presses change dnd-kit's translation" needs layout; jsdom has none, so
  `KeyboardSensor` computes from zero rects. What **is** provable, and what the tests assert, is the
  half that actually regresses: the row handler yields. The other half is §D of the sweep. §8 item 3.
- **Pitfall — the two module-level-flag alternatives are already tried and rejected**
  (`rowControls.ts:145-163`): `aria-pressed` breaks the day a row control becomes a real toggle, and
  `useDndContext` re-renders every row on every pointer move (NFR-2). Neither may be re-proposed.
- **Pitfall — E-6's asymmetry is why the flag exists at all.** A tab row unmounts the instant it is
  picked up (`TabListItem.tsx:56`); a group row does not (`GroupListItem.tsx:208`). A test that only
  covers tab rows proves nothing about the case the flag was written for.
- **Pitfall — `--report-unused-disable-directives`.** Two `eslint-disable-next-line
  jsx-a11y/no-static-element-interactions` comments sit on the pointer-drag divs
  (`TabListItem.tsx:73`, `GroupListItem.tsx:232`). They are still needed; if a refactor makes one
  redundant, lint **fails**, it does not warn.
- **DoD:** the drag flag's hand-off is asserted in both directions; `onDragEnd` and `onDragCancel`
  both restore the arrows; focus returns to the activator after end and after cancel; the row's
  `onMouseDown` pointer-drag listener is still attached (AC-14) and the existing DnD behaviour is
  unchanged; announcements fire on pick-up and drop; `npm test` / `npm run lint` / `npm run build`
  pass.
- **ACs:** **AC-11**, **AC-12** _(the reachable half)_, **AC-13**, **AC-14**, **AC-15**, **AC-37**,
  E-6

### T-7 · The whole list under axe — mid-drag, and in all three hosts

- **Track:** a11y-infra · **Files:** `src/lib/Tabs/rows.a11y.test.tsx`, `src/test/manifest.test.ts`
- **Scope:**
  - turn T-0's baseline assertions into the zero assertions, keeping the old numbers in a comment and
    in §A of the sweep (AC-1, AC-2);
  - run the **full** ruleset, not just `nested-interactive`, over all four fixtures, and assert
    `violations` is empty — `button-name` and `aria-command-name` are AC-6's automated half, and
    §1.5's `image-alt` regression guard rides along for free;
  - **mid-drag**: render the mixed fixture with a `DropPlaceholder` mounted between two rows and
    assert `aria-required-children` and `aria-required-parent` are zero (AC-31, E-14);
  - **three hosts**: the same key walk under `?host=anchor`, `?host=float` and the bare panel URL.
    `setup.ts:34` resets the URL per test and `host.test.ts` is the precedent (AC-8);
  - a guard that **no non-test file under `src/` imports `axe-core`** (NFR-6) — source scanning is
    already an idiom here (`manifest.test.ts:95-113`);
  - `manifest.test.ts` runs **unmodified**: the five-permission mirror and the storage scan are AC-21
    and AC-20, and neither may be widened.
- **Pitfall — the mid-drag fixture is a structural stand-in, and must say so.** Driving dnd-kit's
  `isOver` from a test in jsdom is not worth what it costs; AC-31's own Verify asks for "a
  `DropPlaceholder` mounted between two rows", which is what this does. The real-drag confirmation is
  §D of the sweep. Write the precondition beside the test (LEARNINGS 2026-09-24: an assertion about
  absence is a precondition, not a property).
- **Pitfall — zero in jsdom is necessary and not sufficient** (A-3). No layout, no virtual cursor, no
  accessibility-API bridge. This unit cannot close AC-27 and must not be read as doing so.
- **DoD:** `nested-interactive` is **0** on all four fixtures, where T-0 recorded 5, 20, 8, 2; the
  full ruleset is empty and `incomplete` is reported rather than swallowed; the mid-drag run is
  clean; all three hosts walk identically; no `src/` non-test file imports axe;
  `manifest.test.ts` passes with a zero-line diff; `npm test` / `npm run lint` / `npm run build` pass.
- **ACs:** **AC-1**, **AC-2**, **AC-6** _(automated half)_, **AC-8** _(unit half)_, **AC-20**,
  **AC-21**, **AC-25**, **AC-31**

### T-8 · Names, hostile input, and the 400 px the reorder invalidates

- **Track:** ui + verify · **Files:** `src/lib/Tabs/rows.a11y.test.tsx`,
  `src/lib/Tabs/Tab/TabDisplay.test.tsx`, `src/lib/Tabs/TabsGroup/GroupDisplay.test.tsx`,
  `harness/fakeChrome.ts`, and possibly `src/lib/Tabs/Tab/TabDisplay.tsx` /
  `src/lib/Tabs/TabsGroup/GroupDisplay.tsx` if a measured width moves
- **Scope:**
  - collect every toolbar's accessible name across the mixed fixture; assert all non-empty and all
    distinct (AC-29);
  - the hostile case: a tab whose title is `"><img src=x onerror=alert(1)>` and a URL containing `&`,
    `#` and a quote. Assert the toolbar's and the primary button's accessible names are the **literal
    text**, that no element was created from them, and that every `<img>` in the row is still served
    from `EXTENSION_ORIGIN` (AC-24, §11). Extend the existing guard at `TabDisplay.test.tsx:44-60`
    rather than writing a second one;
  - assert **no** accessible name is built by `aria-labelledby`, and that no tab title or URL reaches
    an element `id` or a query selector anywhere in the diff;
  - assert a row with no title falls back to `"tab"` and the toolbar's name is non-empty (E-5);
  - assert `rowControlsSx`, `rowTailMaskSx` and `rowTailReserveSx` still have **one definition each**
    (AC-23);
  - **re-measure in the harness** at the float's ~400 px: the tab row's secondary-action container
    (60 px silent / 96 px noisy, `TabDisplay.tsx:106`) and the group row's (88.3 px,
    `GroupDisplay.tsx:90`) after the reorder. Record the
    readings in §C of the sweep; change the constants and their tests **together** if they moved.
- **Pitfall — measure the container, not the buttons** (LEARNINGS 2026-09-28). `edge="end"` is a
  −12 px margin, so a group row's three controls span 100.3 px while the container reports 88.3, and
  88.3 is the number that matters.
- **Pitfall — check which tree the harness is serving.** Port 5200 is `strictPort: true`
  (`vite.harness.config.ts:12`) and a sibling worktree's server answers and looks normal. Read
  `performance.getEntriesByType('resource')` for the `/@fs/` path before trusting any number
  (LEARNINGS 2026-09-28).
- **Pitfall — jsdom answers "is the rule there", never "is it big enough".** A reservation test
  passes at 10 px. Say which of the two each style assertion is doing
  (LEARNINGS 2026-09-28, `GroupDisplay.test.tsx:28-37`).
- **DoD:** every toolbar name is non-empty and distinct on the mixed fixture; the hostile title is
  literal text everywhere it appears; the harness readings are recorded with the width they were
  taken at; any constant that moved moved in both the source and its test; `npm test` /
  `npm run lint` / `npm run build` pass.
- **ACs:** **AC-22** _(harness half)_, **AC-23**, **AC-24**, **AC-29** _(distinctness across the
  mixed fixture)_, E-5

### T-9 · Write down what this cost, and correct what is stale

- **Track:** verify · **Files:** `LEARNINGS.md`
- **Scope:** append dated notes for (a) the corrected audit numbers — the 2026-09-24 entry's "15
  `nested-interactive` violations … axe-core 4.10.2" is **stale twice over**: the count is one per
  rendered row and the installed engine is 4.13.0 (§1.1, PI-4); (b) the measured tab-stop budget
  before and after, so nobody re-derives it; (c) the axe fact this plan rests on — role-less,
  aria-less, non-focusable wrappers are transparent to `aria-required-children`, with the
  `axe.js:27783-27786` citation, because it is the thing that makes a `list` survive three layers of
  MUI `Grid`; (d) the MUI fact — `ButtonBase` spreads `other` after `buttonProps`, so an explicit
  `role` wins (`ButtonBase.js:263` and the render call). Append-only; correct a stale record with a
  new dated note beneath it rather than rewriting it.
- **Pitfall:** `LEARNINGS.md` says architecture and run steps belong in `README.md`. None of the above
  is either.
- **DoD:** four dated entries, each with its evidence path; the 2026-09-24 entry is corrected
  beneath, not edited.
- **ACs:** **AC-26** _(the record half — see §8 item 4 about the spec's own §11 reference)_; PI-4

### T-10 · The rest of the manual sweep

- **Track:** verify · **Files:** none (results into `plans/MANUAL-SWEEP-SPEC-04.md` §C–§E)
- **Scope:** everything a real browser has to answer that T-3 did not — AC-27 on the **anchor tab**
  and the **~400 px float**, AC-22 at the float's width with a very long tab title and a very long
  group name, AC-7 in a list of eighty (does the browser scroll the focused control into view), AC-12
  and AC-15's real keyboard drag with NVDA listening, AC-31 confirmed against a **real** drag with a
  placeholder on screen, and E-9's portalled group menu.
- **DoD:** §C, §D and §E of the sweep are filled in, each with the NVDA and Chrome versions. A "no" on
  AC-27 in any surface is recorded against §13.1's trigger, not patched ad hoc.
- **ACs:** **AC-7** _(manual)_, **AC-8** _(manual, the float's width)_, **AC-12** _(manual)_,
  **AC-15** _(manual)_, **AC-22** _(manual)_, **AC-27** _(anchor tab, float)_, E-9, E-10

## 4. Sequencing

T-0 → T-1 → T-2 → **T-3 (gate)** → **T-2b** (added 2026-09-30, from the gate) → T-4 → T-5 → T-6 → T-7 → T-8 → T-9 → T-10.

Single-agent and sequential, so each unit leaves the tree building and every step of the CI gate —
`npm run lint`, `npm run test`, then `npm run build` (`.github/workflows/ci.yml:41-52`) — green.

Three orderings are load-bearing rather than tidy:

- **T-0 before T-2**, because AC-1 and AC-9 are comparisons and the "before" stops existing the
  moment the first row changes role.
- **T-1 before T-3**, because the list/listitem structure is identical under the chosen shape and
  under §13.1's retreat, so it is the work a "no" at the gate does not waste.
- **T-3 before T-4 and T-5**, because a "no" costs one converted row kind instead of three. This is
  PLAN-SPEC-05's T-5 reasoning applied to the risk SPEC-04 actually flags.

T-6, T-7 and T-8 are order-independent among themselves; they are listed in the order that keeps
each one's failure cheapest to diagnose.

## 5. Test plan

- **Existing suites must pass unmodified**, except the three this plan names: `TabDisplay.test.tsx`
  (the row's role, the new primary button, the reordered controls), `GroupDisplay.test.tsx` (the
  chevron; its two reservation assertions must **not** need editing — if they do, T-4's reorder moved
  a measured width and T-8 owes a harness reading), and `TabsView.test.tsx` (unchanged if T-1 kept the
  list below the early returns — treat an edit there as a signal, not a chore). Run `npm run test`.
- **New tests:** `src/lib/Tabs/rows.a11y.test.tsx` (baseline → zero, full ruleset, mid-drag, three
  hosts, names), `src/lib/Tabs/elements/RowList.test.tsx`, `src/lib/Tabs/elements/rowControls.test.ts`,
  `src/lib/Tabs/elements/DragHandle.test.tsx`, `src/lib/Tabs/Window/WindowDisplay.test.tsx`, plus the
  shared `src/test/axe.ts` and `src/test/rowFixtures.tsx`.
- **`npm run build` is not optional and its exit code is what to read.** Test files live under `src/`
  and `tsconfig.json` includes `src`, so `tsc` type-checks them; twice in this repository a green
  suite sat on a red build, and once a `grep` in an `&&` chain masked the real status.
- **Falsify every new test by reverting the fix it guards** (LEARNINGS 2026-09-23). T-0 gives this for
  free — its baseline assertions *are* the pre-change tree — but the walk-order and name tests each
  need one deliberate break before they are believed.
- **What no test here can reach**, and why the sweep exists: what a screen reader announces on
  entering 20–80 toolbars; whether a real keyboard drag still moves the item; whether a focused
  control is scrolled into view in a list of eighty; whether any control is clipped at the float's
  ~400 px; and whether the list's item count is announced correctly.

## 6. Risks

| #   | Risk | Where it shows up |
| --- | ---- | ----------------- |
| R-1 | Per-row toolbar announcements are intolerable at 20–80 rows. A-7 is the spec's only unmeasured, load-bearing assumption. | **T-3, the gate.** §13.1's VS Code shape is the pre-written retreat, at two Tab stops per row. Do not improvise a third shape. |
| R-2 | A screen reader reports the wrong "item n of N" because the `listitem`s are three `div`s deep inside the `list`. | T-3 step 4. Fallback named in T-1: explicit `aria-posinset`/`aria-setsize`, with the memo cost accepted. |
| R-3 | A MUI upgrade reverses `ButtonBase`'s prop precedence and the rows silently go back to `role="button"`. | T-2 asserts the rendered `role` and `tabindex` directly. That test is the alarm. |
| R-4 | The AC-30 reorder moves a measured control width, and the mask/reserve constants go stale silently — they are only visible as "titles truncate early". | T-8's harness re-measure. Change the constant and its test together or neither. |
| R-5 | ~~D-8's always-visible group chevron clips at the float's ~400 px.~~ **Retired 2026-09-29** — D-8 was reversed and the chevron's render gate is unchanged, so no control becomes permanently visible and NG-5's exception is not used at all. The reorder's own width changes are still measured in T-8. |
| R-6 | A new per-row prop defeats the row memo and the list goes back to 500 ms per keystroke at 80 tabs. | D-6, and the per-unit DoD that `TabListItem.tsx` stays out of the diff. |
| R-7 | The branch is cut from `main` instead of `keyboard-entry-and-focus`, so `TabDisplay` still has `focus`/`autoFocus` and SPEC-05 group A is silently reverted on merge. | §1.1. Check `git log keyboard-entry-and-focus..HEAD` before the first commit. |
| R-8 | SPEC-05 **group B** is blocked on this spec and is written against this row structure (PLAN-SPEC-05 §9). Any late change to the walk order or the control census invalidates criteria that have not been planned yet. | D-4 fixes the walk order once, here. Treat a change to it as a cross-spec change. |

## 7. Traceability — all 37 criteria

| AC    | Unit(s)        | AC    | Unit(s)          | AC    | Unit(s)        |
| ----- | -------------- | ----- | ---------------- | ----- | -------------- |
| AC-1  | T-0, T-7       | AC-14 | T-6              | AC-27 | **T-3**, T-10  |
| AC-2  | T-0, T-7       | AC-15 | T-6, T-10        | AC-28 | T-2, T-4, T-5  |
| AC-3  | T-1            | AC-16 | T-2              | AC-29 | T-2, T-4, T-5, T-8 |
| AC-4  | T-1            | AC-17 | T-2              | AC-30 | T-2, T-4       |
| AC-5  | T-2, T-4, T-5  | AC-18 | T-2, T-4         | AC-31 | T-1, T-7       |
| AC-6  | T-2, T-4, T-5, T-7 | AC-19 | T-4, T-5     | AC-32 | T-2, T-4, T-5  |
| AC-7  | T-2, T-10      | AC-20 | T-7              | AC-33 | T-4, T-5       |
| AC-8  | T-7, T-10      | AC-21 | T-7              | AC-34 | T-2            |
| AC-9  | T-0, T-2       | AC-22 | T-8, T-10        | AC-35 | T-2            |
| AC-10 | T-2            | AC-23 | T-8              | AC-36 | T-2            |
| AC-11 | T-6            | AC-24 | T-2, T-8         | AC-37 | T-6            |
| AC-12 | T-6, T-10      | AC-25 | T-0, T-7         |       |                |
| AC-13 | T-6            | AC-26 | T-9              |       |                |

Every criterion maps to at least one unit, and every unit traces back to at least one criterion —
including T-0, which unlike PLAN-SPEC-05's T-1 is not a bare enabler: the check it builds is AC-25.

## 8. Criteria that cannot be met as written

Recorded here rather than discovered mid-implementation.

**Items 1 and 2 were decided by the user on 2026-09-29 and both are now settled; the spec is being
amended to match. The findings are kept as written below, because the reasoning is what makes the
amendments reviewable — a criterion that changed with no visible cause is worse than one that never
changed.** Items 3 and 4 are recorded and need nothing.

- **Item 1 — resolved as recommended.** AC-29 becomes "all non-empty, and distinct wherever their
  subjects are distinct", and tab rows keep subject-only names. The grounding is stronger than the
  recommendation claimed: ARIA requires *"a label on each toolbar when the application contains more
  than one"* and says nothing about uniqueness, so AC-29's distinctness half was stricter than the
  standard it exists to satisfy. This is a correction, not a concession. The window row keeps D-7's
  ordinal as an improvement rather than an obligation. Note for anyone tempted to revisit: a
  positional name for tab rows would cost no *extra* re-renders, since `index` is already part of a
  row's identity — it was rejected because a row that renames itself whenever something before it
  closes is worse to listen to, not because it was expensive.
- **Item 2 — resolved against D-8's draft.** A search-result group row has **no primary action** and
  its toolbar begins at the select-all control. AC-32's premise does not apply there: it requires
  the primary action to do what clicking the row body does, and in search results that is nothing.
  See the rewritten D-8; R-5 is retired with it.

1. **AC-29's two halves collide for genuinely duplicate subjects — needs a decision.** The criterion
   requires each toolbar's name to be *both* "derived from the row's subject" *and* distinct from
   every other toolbar in the list. Two tabs open on the same page have the same title and the same
   URL, so they have the same subject and cannot have distinct subject-derived names. The window row
   has the sharper version — two windows holding five tabs each are indistinguishable by subject —
   and D-7 resolves **that** one with the window's ordinal, which §10 already authorises as a derived
   input. The tab-row case has no such escape that does not put a position on every row and defeat
   the memo (D-6, R-6).
   **Recommendation:** amend AC-29's Verify to "all non-empty, and distinct wherever their subjects
   are distinct", and keep subject-only names for tab rows. **If literal distinctness is required
   instead**, every tab row takes an ordinal prop and the memo cost is accepted — say so before T-2,
   because it changes `TabListItem`'s prop set and therefore its comparator.
2. **AC-33 and AC-32 cannot both hold in `SearchView` without a visible change — needs a decision.**
   AC-33 makes the chevron a named control; §1.0 and E-12 make the chevron the row's primary action.
   But the group chevron is not rendered at all when `expanded` is passed
   (`GroupListItem.tsx:183`), which is exactly what `SearchView` does (`SearchView/index.tsx:58`). So
   in search results a group row would have **no primary action**, and AC-32 ("performs exactly what
   clicking the row body performs today") would be false there. D-8 renders the chevron
   unconditionally, which makes a control permanently visible that is not today — NG-5 permits this
   only "where a structural change forces a control to become permanently visible", and this is that
   case, but it is a user-visible change to the search results and should be agreed rather than
   assumed. **Alternative if it is rejected:** give search-result group rows a primary button that is
   not a chevron (the chip itself), at the cost of two different group rows in one product.
3. **AC-12's first clause is not provable by any test in this repository.** "WHILE a keyboard drag is
   live, the arrow keys SHALL move the dragged item" needs layout to be true of dnd-kit's
   `KeyboardSensor`, and jsdom has none — every rect is zero, so no translation is computed. The
   second clause ("SHALL NOT move row or control focus") is fully testable and is what T-6 asserts,
   because it is the half a refactor breaks. The first clause is §D of the sweep. Stated so the unit
   test is not mistaken for proof. AC-37 has the same shape and the same split.
4. **AC-26's cross-reference points at the wrong section, and the criterion is satisfied anyway.**
   AC-26 says "**§11** names them", but §11 is *Untrusted inputs*; the limits of the automated check
   are in **A-3** ("jsdom has no layout, no real focus ring, no virtual cursor and no accessibility
   API bridge") and **§13.1**. No work is blocked — the sweep document covers exactly those things —
   but the reference should be corrected to A-3 the next time the spec is touched. Recorded because
   a future reader checking AC-26 against §11 will find nothing and conclude the criterion is unmet.

**One further note that is not a defect.** AC-15's "SHALL be documented in this spec" is already
satisfied by §1.6 and DEC-4, which name Space/Enter, the four arrows and Escape. Only the
announcement half is code, and that is T-6. Flagged so an implementer does not open the spec to add
a section that is already there.

## 9. Explicitly out of scope

Everything in SPEC-04 §3, and in particular: the `image-alt` fix in `TabAvatarsDisplay` — **already
shipped** in PR #11 with a guarding test, and NG-10/DEC-8 forbid re-proposing it; `treegrid`, `grid`
and `listbox`, each rejected with reasons in §1.7a and not to be re-litigated; expressing the
window > group > tab hierarchy (NG-12); Home/End within a row and Left/Right wrapping (NG-9);
`aria-selected` and `aria-multiselectable` (AC-16 — both invalid on `toolbar` and `listitem`);
per-row focus memory (AC-36); a settings toggle between keyboard models (NG-8); `CurrentTab`,
`AudioTabs` and `SelectionToolbar` as rows (NG-6 — `CurrentTab` is touched only in that
`DragHandle` gains an optional prop it does not pass, and MUI's `Toolbar` in `SelectionToolbar`
renders a plain `div` with **no** `role`, so it does not appear in any `getAllByRole("toolbar")`
count); `PRIVACY.md` and `store-assets/privacy-policy.html` (no permission changes — AC-21); and an
aggregate selection announcement (PI-7 / NG-11).

Also out, though tempting while in these files: **PI-6** — whether `TabGrid`'s `xs={12} sm={6}
md={4}` (`TabGrid.tsx:15-17`) is inert given that every caller forces `width: 100%`. It is a real
question and a multi-column list would change what "one row, one listitem" means, but it is not an
AC and it is not a change to make on the same branch as a role rework.
