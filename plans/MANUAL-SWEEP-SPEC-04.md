# Manual sweep — SPEC-04

What a real Chrome and a real screen reader have to answer about row semantics, because no test in
this repository can. Ordered so the one that could invalidate the design is answered first.

**Setup.** `npm run build`, then load `dist/` unpacked. §A runs from a test, not a browser. §B is the
gate and needs **NVDA + Chrome**; run it before §C, §D and §E exist to be run.

Record the **NVDA version** and the **Chrome version** at the top of each section. "It worked" is not
a result — write what you heard, verbatim where the wording is the question.

---

## A. Before the rows change  *(T-0 — from the test suite, not the browser)*

- [ ] **AC-1 · today's `nested-interactive` node count, per fixture**
      **Do:** run `src/lib/Tabs/rows.a11y.test.tsx` against the unmodified tree.
      **Record:** the count for each of the four fixtures, and the axe-core version.
      **Expect, from §1.1 of the spec:** 5 plain tabs → **5**; 20 plain tabs → **20**;
      2 windows / 1 group / 6 tabs → **8**; 1 window / 1 collapsed group / 2 tabs → **2**.
      **Why this cannot wait:** AC-1 and AC-9 are comparisons. After the first row changes role there
      is no "today" left to compare against.

- [ ] **AC-9 · today's Tab-stop budget**
      **Record:** the number of Tab stops the 20-plain-tab fixture costs. **Expect 20.**
      Record the `[data-row-control]` count too — 3 per plain tab row, 4 with mute, 4 on a window
      row, 5 on a group row.

| Fixture | `nested-interactive` before | after | Tab stops before | after |
| ------- | --------------------------- | ----- | ---------------- | ----- |
| 5 plain tabs | | | | |
| 20 plain tabs | | | | |
| 2 windows, 1 group, 6 tabs | | | | |
| 1 window, 1 collapsed group, 2 tabs | | | | |

## B. The gate  *(T-3 — stop here if the first one fails)*

The one unmeasured risk in the whole spec (A-7, E-16, §13.1). Nothing in the literature records what
a screen reader says on entering 20–80 toolbars in one scrollable list. This section is that
measurement.

Run in the **side panel**, with tab rows converted and group/window rows not yet. That is enough:
the 20–80 rows are tab rows.

- [ ] **AC-27 · twenty rows, one toolbar each** _(the measurement the design rests on)_
      **Do:** ~20 tabs open. From the search field, Tab down the list. Do not touch the mouse.
      **Record, verbatim:** what NVDA says on entering row 1, row 2 and row 3. Does it announce the
      toolbar before the tab's title? How many words before you hear which tab you are on?
      **Fail if:** reaching a row costs a toolbar announcement the user must sit through before
      hearing the tab.
      **Then: stop and re-plan T-2, T-4 and T-5** against §13.1's **VS Code shape** — row stays a
      `listitem`, the primary action becomes a plain `button` outside any toolbar, the secondary
      controls move into a `toolbar` beside it. Cost: **two Tab stops per row**, 40 at 20 tabs. T-0
      and T-1 stand either way. Do not invent a third shape.

- [ ] **AC-27 · eighty rows**
      **Do:** the same at ~80 tabs.
      **Record:** does the announcement shorten after the first few rows? Some NVDA configurations
      suppress a repeated container announcement; whether this one does is the whole question.

- [ ] **AC-3 · does the list announce its own size, and each row's place in it?**
      **Record:** what NVDA says on entering the list ("list with N items"?) and on each row ("item
      n of N"?). Is N the number of **rendered** rows?
      **Fail if:** N is wrong or absent. **Then:** add explicit `aria-posinset` / `aria-setsize` per
      T-1's named fallback — and only that; the memo cost is accepted knowingly.

- [ ] **AC-7 / E-10 · does focus scroll into view at eighty rows?**
      **Do:** Tab to row 60. **Expect:** the browser scrolls it into view without help. This is the
      case `aria-activedescendant` handles worst, and the reason roving real focus was chosen.

- [ ] **AC-34 / AC-35 · the walk, heard rather than asserted**
      **Do:** on one row, Left and Right across every control; then Right on the last and Left on the
      first. **Expect:** each control announces its own name; the ends do not wrap. Then Tab — it
      must leave the row, not move within it.

## C. The other two surfaces, and the narrow one  *(T-10)*

- [ ] **AC-27 · the anchor tab** — repeat §B's first three items. Record any difference.
- [ ] **AC-27 · the float at ~400 px** — repeat them again. This is the surface no automated check
      can stand in for.
- [ ] **AC-22 · nothing clipped at ~400 px** — with a **very long tab title** and a **very long group
      name** open, check that no row control is clipped and none overlaps the row's text.
      **Watch the group row specifically:** it now shows its expand chevron in search results as well
      (D-8), which it did not before, and it already reserves 88.3 px on the right.
- [ ] **AC-8 · the same keyboard model in all three** — the walk, the ends, and Tab out behave
      identically in the side panel, the anchor tab and the float.
- [ ] **AC-6 / AC-24 · a hostile title, heard** — open a page whose title contains `<` and `"` and
      confirm it is read as text, with no element created from it.

## D. Reordering, with a screen reader listening  *(T-10)*

- [ ] **AC-11 / AC-15 · pick-up** — Left/Right to the drag handle (it is the **last** control on the
      row now), press Space. **Expect:** a drag starts, an announcement says so, and the row's own
      action does **not** fire.
- [ ] **AC-12 / AC-37 · the arrows, while a drag is live** — press ↑/↓. **Expect:** the item moves;
      focus does **not** move between controls. This is the half no jsdom test can reach.
- [ ] **AC-13 · drop and cancel** — drop with Space, then repeat and cancel with Escape. **Expect:**
      focus returns to the drag handle both times, and Left/Right work within the row again
      immediately.
- [ ] **AC-31 / E-14 · a real placeholder, mid-drag** — with a drag live and a `DropPlaceholder`
      visible between two rows, confirm the list still reads as a list and nothing announces a
      stray container. The unit test mounts a placeholder structurally; this is the real drag.
- [ ] **AC-14 · pointer reordering is unchanged** — drag a row by its body with the mouse.
- [ ] **E-6 · a group row mid-drag** — a tab row unmounts the instant it is picked up; a group row
      does not. Pick up a **group** and press an arrow before hovering anything.

## E. The states most likely to surprise  *(T-10)*

- [ ] **E-15 / E-9 · the group's actions menu** — open it with the keyboard. It portals outside the
      row, so focus leaves the toolbar's subtree. **Expect:** on close, focus is somewhere sane and
      Left/Right still work on that row. Confirm the menu button still announces `Actions for group
      …` and the row's toolbar announces `Group …` — two names, deliberately different (AC-29).
- [ ] **E-1 · a collapsed group** — the group row is there, its tabs are not. The announced item
      count must describe what is **rendered**.
- [ ] **E-2 · a single window** — no window row is rendered at all. The list must not claim a
      container that is not there.
- [ ] **E-3 · search results** — groups render expanded and there are **no** window rows. Confirm the
      group row's chevron is present and named, and that pressing it collapses the real group.
- [ ] **E-4 · an empty list** — close everything but the anchor tab. **Expect:** "No other tabs are
      open." announced as text, **not** as a list of zero items.
- [ ] **E-7 · the drag overlay** — while dragging, the overlay renders a row of its own outside the
      list. **Expect:** it is not announced as a second list item and `↓` from the search field never
      lands in it.
- [ ] **E-11 · a silent tab and an audible one, side by side** — the mute control exists only on one.
      Rows are not uniform; confirm the walk simply has one fewer stop rather than an empty one.

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
