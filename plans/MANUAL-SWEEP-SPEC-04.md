# Manual sweep — SPEC-04

What a real Chrome and a real screen reader have to answer about row semantics, because no test in
this repository can. Ordered so the one that could invalidate the design is answered first.

**Setup.** `npm run build`, then load `dist/` unpacked. §A runs from a test, not a browser. §B is the
gate and needs **NVDA + Chrome**; run it before §C, §D and §E exist to be run.

Record the **NVDA version** and the **Chrome version** at the top of each section. "It worked" is not
a result — write what you heard, verbatim where the wording is the question.

---

## A. Before the rows change  *(T-0 — from the test suite, not the browser)*

- [x] **AC-1 · today's `nested-interactive` node count, per fixture**
      **Do:** run `src/lib/Tabs/rows.a11y.test.tsx` against the unmodified tree.
      **Record:** the count for each of the four fixtures, and the axe-core version.
      **Expect, from §1.1 of the spec:** 5 plain tabs → **5**; 20 plain tabs → **20**;
      2 windows / 1 group / 6 tabs → **8**; 1 window / 1 collapsed group / 2 tabs → **2**.
      **Recorded 2026-09-30, axe-core 4.13.0, `main` at `f99b6b2`:** 5, 20, 8, 2 — identical to the
      expected figures, and to the spec's 2026-09-28 measurement, even though PRs #20–#22 (row
      controls made clickable, Up returns to search) landed in between. Asserted by
      `rows.a11y.test.tsx`; each equals the rendered row count (`.MuiListItemButton-root`).
      **Why this cannot wait:** AC-1 and AC-9 are comparisons. After the first row changes role there
      is no "today" left to compare against.

- [x] **AC-9 · today's Tab-stop budget**
      **Record:** the number of Tab stops the 20-plain-tab fixture costs. **Expect 20.**
      Record the `[data-row-control]` count too — 3 per plain tab row, 4 with mute, 4 on a window
      row, 5 on a group row.
      **Recorded 2026-09-30:** **20** Tab stops (a `userEvent.tab()` loop, asserted), none of them
      a `[data-row-control]`; **60** `[data-row-control]` elements (asserted) — 20 rows plus
      60 controls is the 80 stops the list would cost if every control were focusable.
      The other three fixtures were measured once, not asserted: 5 / 8 / 2 stops and
      15 / 27 / 7 `[data-row-control]`.

**AC-2 · no rule is switched off** — `rows.a11y.test.tsx` also scans every `.ts`/`.tsx` under `src/`
for an axe `rules` block naming `nested-interactive` and for `disableOtherRules`; both absent.
Falsified by planting a `rules: { "nested-interactive": … }` block in `src/test/axe.ts` (the scan
failed naming it), then removing it.

**Fixture shapes, so the numbers can be reproduced** (`src/test/rowFixtures.tsx`): the 2-window
fixture renders 2 window rows + 1 group row + 5 tab rows, because only the focused window is
expanded (window 2 contributes its header and its one tab stays hidden); the collapsed-group fixture
renders the group row + the 1 tab outside it (the other is hidden by the collapse).

| Fixture | `nested-interactive` before | after | Tab stops before | after |
| ------- | --------------------------- | ----- | ---------------- | ----- |
| 5 plain tabs | 5 | 0 | 5 | 5 |
| 20 plain tabs | 20 | 0 | 20 | 20 |
| 2 windows, 1 group, 6 tabs | 8 | 0 | 8 | 8 |
| 1 window, 1 collapsed group, 2 tabs | 2 | 0 | 2 | 2 |

**After, recorded 2026-10-02 on `accessible-rows` at `08ae0bb`, axe-core 4.13.0.** The Tab stops
were measured with the same `userEvent.tab()` loop as before. Each stop is now the row's primary
control (`Switch` on a tab row, `Tabs` on a group or window row), not the row. The
`[data-row-control]` counts went from 15 / 60 / 27 / 7 to 20 / 80 / 35 / 9, which is one new
primary control per row. Only the 20-tab figure is asserted by a test; the other three were
measured once.

## B. The gate  *(T-3 — stop here if the first one fails)*

The one unmeasured risk in the whole spec (A-7, E-16, §13.1). Nothing in the literature records what
a screen reader says on entering 20–80 toolbars in one scrollable list. This section is that
measurement.

Run in the **side panel**, with tab rows converted and group/window rows not yet. That is enough:
the 20–80 rows are tab rows.

**Run 2026-09-30** by RostK:
- **Setup:** NVDA 2026.2 (read from the installer the tester ran, `nvda_2026.2.exe`), Chrome 154.0.8037.92, Windows 11. The build was `accessible-rows` at `5c11c3b`, loaded unpacked.
- **Recording:** transcribed from NVDA's Speech Viewer. Tab titles that carried personal email addresses are redacted to `‹Gmail tab›`.
- **Scale:** about 6 tabs, not 20. The 80-row run was not done (see below).

**Heard, entering rows by Tab from the search field:**

```
main landmark
Open tabs  list
‹Gmail tab›, mail.google.com  tool bar
Switch to ‹Gmail tab›  button
‹Gmail tab›, mail.google.com  tool bar
Switch to ‹Gmail tab›  button
Google Calendar - Week of 27 September 2026, calendar.google.com  tool bar
Switch to Google Calendar - Week of 27 September 2026  button
Anthropic Courses, anthropic.skilljar.com  tool bar
Switch to Anthropic Courses  button
```

**`↓` from the search field:**

```
main landmark
Open tabs  list
NV Access, www.nvaccess.org  tool bar
Switch to NV Access  button
```

**Left/Right on that row, then Tab out:**

```
Select NV Access  button
Close NV Access  button
Reorder NV Access  draggable  To pick up a draggable item, press the space bar. While dragging, …
Close NV Access  button
Select NV Access  button
Switch to NV Access  button
Extensions, extensions  tool bar
Switch to Extensions  button
Actions  content info landmark  Open full view — … button
```

**Verdict: the gate passes. The §13.1 retreat is NOT triggered, but naming is reworked.**
- The title is heard **first**: the toolbar's name leads with it, and "tool bar" comes after. So no row makes you sit through a toolbar announcement before the tab.
- The real cost is one the plan never predicted: **every row says its title twice**, once as the toolbar name and again in "Switch to …". NVDA does not shorten this on later rows, because each row is a different toolbar.
- The tester set the bar at "better than Chrome's own tab strip", meaning title once and first, plus the state and position Chrome gives. A prototype (`proto/row-names`, `e7340ac`) was built and judged by ear:
  - the toolbar name is `title, site, [current tab], [playing audio | muted], [selected], n of N`;
  - the primary button is just "Switch".
- Verdict on the prototype: **"sounds right"**. That becomes SPEC-04 AM-3 and plan unit T-2b.
- The long "Reorder … draggable" instructions are dnd-kit's defaults; T-6 (AC-15) replaces them. The tester also heard the drag-start default, "draggable item ‹id›", which is the same fix.

- [x] **AC-27 · twenty rows, one toolbar each** _(the measurement the design rests on)_
      **Result 2026-09-30:** passed on the title-first criterion, run at about 6 rows. The title was
      doubled, which led to AM-3; see the run notes above.
      **Do:** ~20 tabs open. From the search field, Tab down the list. Do not touch the mouse.
      **Record, verbatim:** what NVDA says on entering row 1, row 2 and row 3. Does it announce the
      toolbar before the tab's title? How many words before you hear which tab you are on?
      **Fail if:** reaching a row costs a toolbar announcement the user must sit through before
      hearing the tab.
      **Then: stop and re-plan T-2, T-4 and T-5** against §13.1's **VS Code shape** — row stays a
      `listitem`, the primary action becomes a plain `button` outside any toolbar, the secondary
      controls move into a `toolbar` beside it. Cost: **two Tab stops per row**, 40 at 20 tabs. T-0
      and T-1 stand either way. Do not invent a third shape.

- [ ] **AC-27 · eighty rows** — *not run 2026-09-30.* The six-row run already showed the full
      name repeated on every row, with no suppression between rows. Re-run this against the AM-3
      names (T-2b) during T-10, together with the scroll-into-view check below.
      **Do:** the same at ~80 tabs.
      **Record:** does the announcement shorten after the first few rows? Some NVDA configurations
      suppress a repeated container announcement; whether this one does is the whole question.

- [x] **AC-3 · does the list announce its own size, and each row's place in it?**
      **Record:** what NVDA says on entering the list ("list with N items"?) and on each row ("item
      n of N"?). Is N the number of **rendered** rows?
      **Fail if:** N is wrong or absent. **Then:** add explicit `aria-posinset` / `aria-setsize` per
      T-1's named fallback — and only that; the memo cost is accepted knowingly.
      **Result 2026-09-30: absent.** NVDA said "Open tabs list" with no count, and gave no position
      on the rows.
      - **The named fallback cannot fix it.** NVDA reports position only for the focused object,
        and focus sits on a `button` inside the `listitem`, so `aria-posinset`/`aria-setsize` on the
        item would never be read.
      - **Replaced by AM-3.** ", n of N" goes at the end of each tab row's toolbar name, counted over
        the tab rows actually rendered. It was heard in the prototype and approved.

- [x] **AC-7 / E-10 · does focus scroll into view at eighty rows?**
      **Do:** Tab to row 60. **Expect:** the browser scrolls it into view without help. This is the
      case `aria-activedescendant` handles worst, and the reason roving real focus was chosen.
      **Result 2026-10-02 (Chromium, 86 rows, no screen reader): it failed at the bars, and is
      fixed.** Sixty Tabs landed on row 59 of 82 at 297–343 px of a 640 px viewport, in view. But a
      row lying under the sticky header or the fixed action bar was not scrolled at all; see the
      Chromium pass below. With the fix, one Tab onto a row under the action bar and one Shift+Tab
      onto a row under the header both bring it to 317–367 px.

- [x] **AC-34 / AC-35 · the walk, heard rather than asserted** — *passed 2026-09-30.* It went
      Switch → Select → Close → Reorder and back without wrapping, each control saying its own name.
      Tab then left the row for the next one.
      **Do:** on one row, Left and Right across every control; then Right on the last and Left on the
      first. **Expect:** each control announces its own name; the ends do not wrap. Then Tab — it
      must leave the row, not move within it.

## Chromium pass without a screen reader — 2026-10-02

Run by the assistant, not by a person, to take everything off the list below that does not need
ears. **Nothing here says what a screen reader announces.** Every item that is about speech is still
open, and says so.

- **Where:** the layout harness (`harness/`, the real `App` over a fake `chrome.*`), in a Chromium
  152 engine at 400 × 640, on `accessible-rows` at `57a757a`. Keys were real key presses, not
  `focus()` calls. Positions were read with `getBoundingClientRect` and `elementFromPoint`.
- **What it is not:** the extension loaded in Chrome, a real side panel, or a real
  Picture-in-Picture float. The three hosts were run as `/`, `?host=anchor` and `?host=float`.
- **A trap in the tool, for whoever repeats this:** the preview pane was hidden and painted about
  two frames a second. `requestAnimationFrame` and `ResizeObserver` wait for a frame, so dnd-kit's
  focus restore and the scroll padding both looked broken until each step was given a second or
  more. Measure the frame rate before believing a timing result.

**Two defects found and fixed, both real.**

1. **A focused row could sit wholly under the header or the action bar (AC-7).** Chrome scrolls a
   focused element into view only when it is outside the viewport, and a row under a sticky or
   fixed bar is inside it. At 86 rows: Shift+Tab left the focused row at 48–97 px under a header
   ending at 100 px, and Tab left it at 585–634 px under an action bar starting at 583 px. Fixed by
   `useScrollPadding` (`d78826e`); after it the same presses put the row at 317–367 px.
2. **Focus was lost when a keyboard drop moved a tab into a group (AC-13).** dnd-kit restored focus
   to the handle, then the list re-rendered with the row under a different parent, and focus fell
   to the body. A drop that only reorders was fine. Fixed by the owed-focus flag (`084f456`). The
   harness's `tabs.move` was a no-op before this, which is why nothing had shown it.

**One observation, not fixed.** A tab with an empty title renders a 29 px row, not 49.5 px, because
the title line is empty. It predates SPEC-04 and Chrome rarely reports an empty title.

## C. The other two surfaces, and the narrow one  *(T-10)*

- [ ] **AC-27 · the anchor tab** — repeat §B's first three items. Record any difference.
- [ ] **AC-27 · the float at ~400 px** — repeat them again. This is the surface no automated check
      can stand in for.
- [x] **AC-22 · nothing clipped at ~400 px** — with a **very long tab title** and a **very long group
      name** open, check that no row control is clipped and none overlaps the row's text.
      _(The note that stood here about a chevron in search results was stale: D-8 was reversed and a
      search-result group row has no chevron.)_
      **Result 2026-10-02 (Chromium, 400 px, harness):** no control starts before 0 or ends after
      400, and the page does not scroll sideways (`scrollWidth` 400).

      | Row | Secondary-action container | Constant it feeds |
      | --- | --- | --- |
      | Tab, silent | 57.7 px | 60 |
      | Tab, audible or muted | 94.3 px | 96 |
      | Group | 88.3 px | 88.3 + 8 reserved |
      | Window | 24.6 px | none |

      All four equal the pre-rework readings, so no constant moved. The long group name ends at
      287.7 px, 8 px short of its first control at 295.7. Taken before and after the primary
      controls became `div`s: every control kept its position.
- [ ] **AC-8 · the same keyboard model in all three** — the walk, the ends, and Tab out behave
      identically in the side panel, the anchor tab and the float.
      **Partly done 2026-10-02 (Chromium, harness):** under `/`, `?host=anchor` and `?host=float`
      the same presses gave the same sequence: search → Switch → Select → Close → Reorder, Right
      again stays, back to Switch, Left again stays, four Tabs, the next row's walk, Up to search.
      **Still open:** the real side panel and the real float, where focus arrives differently.
- [ ] **AC-6 / AC-24 · a hostile title, heard** — open a page whose title contains `<` and `"` and
      confirm it is read as text, with no element created from it.

## D. Reordering, with a screen reader listening  *(T-10)*

- [ ] **AC-11 / AC-15 · pick-up** — Left/Right to the drag handle (it is the **last** control on the
      row now), press Space. **Expect:** a drag starts, an announcement says so, and the row's own
      action does **not** fire.
      **Mechanics pass 2026-10-02 (Chromium):** Space starts the drag and `tabs.update` is not
      called. The handle's description is "Press Space or Enter to pick up. Arrow keys move it,
      Space or Enter drops it, Escape cancels." The live region gets "Picked up ‹title›." and then
      at once the place it is over, for example "Before ‹next tab›."
      **Still open, by ear:** whether NVDA reads both, or the second cuts off the first. The handle
      also still carries dnd-kit's `aria-roledescription="draggable"`, so it may be read as
      "draggable" in place of "button".
- [x] **AC-12 / AC-37 · the arrows, while a drag is live** — press ↑/↓. **Expect:** the item moves;
      focus does **not** move between controls. This is the half no jsdom test can reach.
      **Passed 2026-10-02 (Chromium):** the dragged row went from 199 px to 249 px on two Downs and
      to 149 px on four Ups, 25 px a press. Up did not send focus to the search field and Left did
      not walk the row. The live region followed: "Before group Reading.", then "Before ‹tab›, in
      its group." A drop then called `tabs.move` with the right index, and the list reordered.
- [x] **AC-13 · drop and cancel** — drop with Space, then repeat and cancel with Escape. **Expect:**
      focus returns to the drag handle both times, and Left/Right work within the row again
      immediately.
      **Passed 2026-10-02 (Chromium), after a fix.** Cancel, and a drop that reorders within the
      window: focus is on the moved row's handle and Left walks to Close. A drop **into a group**
      lost focus to the body until `084f456`; with it, focus is on the handle of the row in its new
      place. Not tried: a drop into another window.
- [ ] **AC-31 / E-14 · a real placeholder, mid-drag** — with a drag live and a `DropPlaceholder`
      visible between two rows, confirm the list still reads as a list and nothing announces a
      stray container. The unit test mounts a placeholder structurally; this is the real drag.
      **Structure passes 2026-10-02 (Chromium), real drag:** with a drag live there were two more
      `listitem`s than toolbars (the placeholders), no other role inside the list, and the drag
      overlay sat outside `<main>`. **Still open, by ear:** how it reads.
- [ ] **AC-14 · pointer reordering is unchanged** — drag a row by its body with the mouse.
- [x] **E-6 · a group row mid-drag** — a tab row unmounts the instant it is picked up; a group row
      does not. Pick up a **group** and press an arrow before hovering anything.
      **Passed 2026-10-02 (Chromium):** picking up "Reading" said "Group Reading, where it
      started." Left did nothing, Down moved it, Escape said "Cancelled. Group Reading put back."
      and put focus back on its handle, and Left then walked to Close. In the browser the group
      row did unmount at once, because the overlay starts over a drop zone. The still-mounted case
      is the one the unit tests cover.

## E. The states most likely to surprise  *(T-10)*

- [ ] **E-15 / E-9 · the group's actions menu** — open it with the keyboard. It portals outside the
      row, so focus leaves the toolbar's subtree. **Expect:** on close, focus is somewhere sane and
      Left/Right still work on that row. Confirm the menu button still announces `Actions for group
      …` and the row's toolbar announces `‹name›, group, n tabs` — two names, deliberately
      different (AC-29).
      **Mechanics pass 2026-10-02 (Chromium):** Enter on "Actions for group Reading" opens the menu
      with focus on "Ungroup all tabs". Down and Up move within the menu and never reach the
      search field. Escape closes it and returns focus to the menu button, and Left/Right walk the
      row again. **Still open, by ear:** the two names.
- [ ] **E-1 · a collapsed group** — the group row is there, its tabs are not. The announced item
      count must describe what is **rendered**.
- [ ] **E-2 · a single window** — no window row is rendered at all. The list must not claim a
      container that is not there.
- [ ] **E-3 · search results** — groups render expanded and there are **no** window rows. Confirm the
      group row has **no** chevron there and that Tab lands on its select-all control.
      _(Corrected 2026-10-02: this asked for a chevron. D-8 was reversed, and AM-2 says a
      search-result group row has no primary action.)_
- [ ] **E-4 · an empty list** — close everything but the anchor tab. **Expect:** "No other tabs are
      open." announced as text, **not** as a list of zero items.
- [ ] **E-7 · the drag overlay** — while dragging, the overlay renders a row of its own outside the
      list. **Expect:** it is not announced as a second list item and `↓` from the search field never
      lands in it.
- [x] **E-11 · a silent tab and an audible one, side by side** — the mute control exists only on one.
      Rows are not uniform; confirm the walk simply has one fewer stop rather than an empty one.
      **Passed 2026-10-02 (Chromium):** a silent row has Switch, Select, Close, Reorder. An audible
      row has Switch, Select, Mute, Close, Reorder, and a muted one says Unmute. Their names end
      "playing audio" and "muted".

---

## If something fails

Say which item and what you heard. Every one maps to a numbered criterion in
`specs/tab-list/SPEC-04-2026-09-28-accessible-rows.md`, so a failure names its own fix. The three
worth escalating rather than logging:

- **§B, the first two items** — verbose toolbar announcements at scale. That is A-7 answered "no", and
  §13.1's VS Code shape is the pre-written retreat. It is a re-plan, not a patch.
- **§B, AC-3's item count** — a wrong N means the `listitem`s are not reaching the accessibility tree
  the way §1 of the plan reasoned they would. The fallback is named; nothing else.
- **§D, AC-12** — if the arrows stop moving a dragged item, the `dragActive` hand-off has been broken
  by this rework. That is the one part of the model with no external guidance behind it (§1.6), and
  the part `rowControls.ts:145-163` records two failed attempts at.
