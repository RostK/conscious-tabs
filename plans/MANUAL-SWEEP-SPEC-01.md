# Manual sweep — SPEC-01, one float session

Everything left in T-14, T-15 and T-16 that a real float has to answer. Ordered so a single session
covers it: the items that destroy the float are last, and each says how to get back.

**Setup.** Open the side panel → **Open full view** (you land in the anchor tab) → **Float on top**.

---

## Result — 2026-09-23

Walked against a real float by RostK. **Everything passed** except two that were never run:

- **E-1 and E-2 are deferred, not failed.** Both need a competing video Picture-in-Picture to
  trigger, and none was set up. What rests on them is AC-34 (our float evicted → named state plus
  one-click reopen) and AC-35 (our float evicting a video PiP silently). The state machine behind
  AC-34 has 13 unit tests; it is the eviction that starts it that no one has witnessed.

### Re-run of B and D — 2026-09-23, after the review fixes

Walked again by RostK, and passed. Worth recording as its own run rather than
folding into the one above:  changed three times between them — the
double-activation guard, the pagehide identity check and the close flag — and all
three had only ever run against a stubbed Picture-in-Picture window. Sections B and
D are precisely the paths they touch, so the first sweep no longer spoke for them.

E-1 and E-2 remain deferred on the same grounds as before: no video PiP was set up.

The checklist stays here rather than being deleted: it is what a future change to the float has to
be walked through again, and the two open items are the first things to run when a video PiP is to
hand.

---

## A. Before opening the float

- [ ] **E-2 · our float evicts a video PiP, silently**
  **Do:** with the float closed, start a video Picture-in-Picture (any YouTube tab → PiP), then click
  **Float on top**.
  **Expect:** our float opens; the video PiP disappears without a prompt.
  **Fail if:** a permission or confirmation dialog appears, or our float refuses to open.

## B. With the float up, nothing destructive

- [ ] **AC-27 · the float names itself**
  **Expect:** the float's title bar reads the extension's name, not "about:blank", not a URL, not empty.

- [ ] **AC-20 · freshness while the anchor is backgrounded** *(the T-14 item)*
  **Do:** switch the anchor tab's window to a different tab, then cover that window with another
  application. In a **different** browser window: open a tab, close a tab, drag one to reorder, and
  add one to a group.
  **Expect:** each change appears in the float in about a second.
  **Fail if:** any change takes noticeably longer, or only appears when you return to the anchor tab.
  **Measured already:** the app's own half is 0 ms for a title change and 252 ms for a close, in a
  document Chrome reported hidden. What this checks is the browser half.

- [ ] **AC-21 · nothing running while idle** *(already met — confirm only if you want)*
  **Do:** leave the float alone for a minute.
  **Expect:** no CPU wake-ups attributable to it. Measured as zero `chrome.tabs.query`,
  `chrome.tabGroups.query` and `chrome.windows.getAll` calls across 79 s.

- [ ] **E-6 / E-7 · the float at awkward sizes**
  **Do:** drag the float's corner as small as Chrome allows, and onto a second monitor if you have one.
  **Expect:** search, the rows, the row controls and the selection bar all stay usable; no horizontal
  scrollbar.
  **Measured already:** holds at 280, 320, 401 and 1100 px wide in the harness — this is the real-window
  confirmation, including whatever minimum Chrome enforces.

- [ ] **E-5 · side panel and float at once**
  **Do:** with the float up, click the toolbar icon to reopen the side panel.
  **Expect:** two live copies, both working, both showing the same list; acting in one updates the other.
  An undo toast should appear in **one** of them, not both.
  **Then:** close the side panel again before continuing.

- [ ] **E-11 · a drag released outside the float**
  **Do:** start dragging a row inside the float and release the mouse outside the float window.
  **Expect:** the list returns to its previous order; nothing is half-applied, nothing is left mid-drag.

- [ ] **E-1 · a video PiP evicts our float**
  **Do:** with our float up, start a video Picture-in-Picture.
  **Expect:** our float closes, and the anchor tab shows the "float was closed" notice with a
  one-click **Float again**.
  **Then:** click **Float again** to carry on.

## C. Keyboard and screen reader *(T-15 — same session, skip if you are short of time)*

- [ ] **AC-30 · focus lands inside the float** — on open, Tab and Shift-Tab cycle only the float's own
  controls and never escape into the page behind it.
- [ ] **AC-31 · typing filters** — type without touching the mouse; the list narrows.
- [ ] **AC-33 · destructive controls say so** — anything that closes the float announces that it does.
- [ ] **AC-40 · the payoff copy reaches a screen reader** — the float affordance's wording is available
  without hovering.

## D. The ones that kill the float

Each of these ends the float on purpose. After each, reopen with **Float on top** from the anchor tab
(or the side panel → **Open full view** first).

- [ ] **E-14 · navigate the anchor away**
  **Do:** type a URL into the anchor tab, or follow a link from it.
  **Expect:** the float closes. It must not survive with a dead opener.

- [ ] **E-15 · drag the anchor tab into another window**
  **Do:** drag the anchor tab out into a new window, or into an existing one.
  **Expect:** whatever preserves the document preserves the float; whatever destroys it closes the
  float. **Fail if:** the float is still visible but does nothing.

- [ ] **E-8 · reload the extension**
  **Do:** `chrome://extensions` → reload Conscious Tabs, with the float open.
  **Expect:** the float closes. Nothing is orphaned; no ghost window remains.

- [ ] **E-3 · close the anchor tab, then its window**
  **Do:** close the anchor tab with the float up. Then repeat, closing the whole window instead.
  **Expect:** the float dies with it, both times.

---

## What is already covered, so it is not here

`E-4` (our own pages and the float's window never appear as rows), `E-9` (empty state), `E-10`
(hostile titles), `E-12` (double activation), `E-13` (the refusal path) and `E-16` (pop-out finds the
existing anchor) all have tests that fail if the behaviour regresses. Each was checked against a
deliberately broken build before being trusted.

## If something fails

Say which item and what you saw. Every one of these maps to a numbered criterion in
`specs/ui-shell/SPEC-01-2026-09-22-floating-tab-manager-window.md`, so a failure names its own fix.
