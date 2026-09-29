# Manual sweep — SPEC-05 group A

What a real Chrome has to answer about a keyboard shortcut and where focus lands, because no test
in this repository can. Ordered so the one that could invalidate the design is answered first.

**Setup.** `npm run build`, then load `dist/` unpacked. Sections A and B need a **clean profile**;
C and D can run on any profile with the extension installed.

Record the Chrome version at the top of each section. "It worked" is not a result — write what you
saw.

---

## A. Before the manifest changes  *(run from `main`, T-0)*

- [ ] **AC-5 · today's install warning, verbatim**
      **Do:** on `main`, build and load unpacked on a clean profile.
      **Record:** the permission-warning dialog, word for word, plus a screenshot and the Chrome
      version.
      **Why this cannot wait:** AC-5 asks whether the warning is *unchanged*. After the `commands`
      key lands there is no unchanged state left to compare against.

## B. The gate  *(T-5 — stop here if the first one fails)*

- [ ] **AC-5 · the warning after the change** — same steps, compare against §A verbatim.
      **Fail if:** one word differs. That would mean C-9 is wrong and SPEC-01 AC-24 fires after all.

- [ ] **AC-2 · the key opens the side panel**
      **Do:** on an ordinary web page, press `Ctrl+Shift+K` (`Command+Shift+K` on macOS).
      **Expect:** the side panel opens in that window, fully functional — the tab list, the search
      field, the control bar.
      **Fail if:** nothing happens. That is the C-8 failure mode, it is silent, and it means
      `sidePanel.open()` was not the first thing to run or the activation does not survive.
      **Then: stop and re-plan T-4** against AC-8's anchor-tab fallback as the primary path.

- [ ] **AC-3 / E-5 · three presses, three states**
      **Do:** press the key three times in a row, from each of — an ordinary page with nothing open;
      an ordinary page with the panel already open; the anchor tab.
      **Expect:** exactly one surface after each, never a second copy, never a close, never a
      reopen. From the anchor tab, no panel is added at all (AC-39).
      **Fail if:** a repeat press opens an anchor tab you did not ask for. That is the AC-8 fallback
      firing on a rejected repeat open — R-2.

- [ ] **AC-38 · does the panel take focus?** _(the measurement item 2's shape rests on)_
      **Do:** press the key with focus in the page, and do not touch the mouse.
      **Record:** did the side-panel document have focus when it opened? Where was the caret? Does
      typing go into the search field, or into the page behind it?
      **Note:** a "no" here is a platform limitation to record, not a defect to fix. The caret must
      still be in the field the moment the document does receive focus, and nothing may force it.

- [ ] **AC-7 / E-7 · with the shortcut cleared**
      **Do:** clear the shortcut at `chrome://extensions/shortcuts`, then use the toolbar icon,
      "Open full view", "Float on top" and "Back to panel".
      **Expect:** every one still works. No error, no console noise.
      **Then:** with it still cleared, open each surface and confirm the unbound notice appears and
      names `chrome://extensions/shortcuts` (**AC-35**). Restore the shortcut afterwards.

- [ ] **AC-4 · the description on the shortcuts page**
      **Expect:** `chrome://extensions/shortcuts` shows the command under its description verbatim,
      not under its internal id.

## C. Focus, in all three surfaces  *(T-10)*

- [ ] **AC-38 / AC-12 · the anchor tab** — open it, type without touching the mouse. Record whether
      the document had focus on open and where the caret was. The list must narrow.
- [ ] **AC-38 / AC-12 · the float** — open it from the anchor tab, then type.
      **Watch for E-9:** the app runs in an iframe appended after the window is dressed
      (`float.ts:330-334`), so focus has to cross a document boundary and the app may not be mounted
      when the float first paints.
- [ ] **AC-14 · one `↓`** — from the field, press `↓` once in each surface. Focus lands on the row
      for the tab you are already on, not on row 1; on a filtered list with no active tab among the
      matches, it lands on the first row.
- [ ] **AC-28 · the float at ~400 px** — everything above behaves the same at the float's width.
- [ ] **AC-13 · one screen-reader pass per surface** — the focused field is announced as "search",
      and the heading and `main` landmark are still reachable from a freshly opened surface.

## D. The states most likely to surprise  *(T-10)*

- [ ] **E-4 · a privileged page** — press the key on `chrome://extensions` and on the Web Store.
      **Expect:** the same behaviour as anywhere else. The side panel is per-window, not per-tab.
- [ ] **E-1 · with a float up** — press the key from a normal page in another window, and from the
      anchor tab. **Expect:** the float is never opened, closed or touched, either time.
- [ ] **E-3 · no browser window** — with Chrome alive in the background and no normal window open,
      press the key if the OS lets you. **Expect:** nothing thrown into the worker where nobody sees
      it. Record what actually happens; this may not be reachable at all for a browser-scoped
      command, which is itself the answer.
- [ ] **E-14 · incognito** — the extension is not enabled in incognito by default, so the command
      does not fire there. Confirm once, so it is not later filed as a bug.

---

## If something fails

Say which item and what you saw. Every one maps to a numbered criterion in
`specs/ui-shell/SPEC-05-2026-09-29-keyboard-access.md`, so a failure names its own fix. The two
worth escalating rather than logging: a changed install warning (§B, AC-5 — C-9 was wrong), and a
key that opens nothing (§B, AC-2 — C-8 was wrong, and T-4 has to be re-planned).
