# SPEC-05 — Keyboard access to what Chrome cannot do

|                |                                                                                                                                                                                                                 |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Spec ID**    | SPEC-05                                                                                                                                                                                                         |
| **Date**       | 2026-09-29                                                                                                                                                                                                      |
| **Module**     | `ui-shell` (`manifest.json`, `src/worker/index.ts`, `src/lib/anchor.ts`, `src/lib/float.ts`, `src/lib/surfaces.ts`, `src/lib/host.ts`, `src/App.tsx`) — with edges into `tab-list` (`src/lib/Tabs/selection/`) |
| **Status**     | **approved 2026-09-29** — all thirteen clarifications closed; see §13. Ready for `plan-implementation`, **in two groups** — see §1.9.                                                                            |
| **Supersedes** | — (supersedes SPEC-01 **NG-10**, which declined a `chrome.commands` entry point)                                                                                                                                |

---

## 1. Problem

### 1.1 Chrome already won the part of this problem it cares about

For a keyboard user who wants to **find a tab and switch to it**, Chrome ships a complete answer
and has for years:

| Chrome's built-in                          | What it already does for the keyboard                                                          |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| `Ctrl+Shift+A` (tab search)                | Searchable list of open **and recently-closed** tabs, arrow-navigable, a close button per row. |
| `Ctrl+1`…`Ctrl+8`, `Ctrl+9`                | Jump to the n-th / last tab in the current window.                                             |
| `Ctrl+Tab`, `Ctrl+Shift+Tab`, `Ctrl+PgUp/PgDn` | Walk the strip.                                                                            |
| `Ctrl+W`, `Ctrl+Shift+T`                   | Close one, restore the last closed.                                                            |

This extension will not beat that and **should not try** (NG-1). Anything this spec adds that
duplicates tab search is work spent competing with a shipped browser feature on its own ground.

### 1.2 What Chrome does not do — and what this product exists for

Chrome has no answer for the **bulk, cross-window, cross-group** operations that are this
extension's entire reason to exist:

- select nine tabs spread across three windows and close them in one action;
- see windows, groups and tabs as **one structure** rather than one window's strip at a time;
- find what is making noise and mute it;
- keep a panel — or an always-on-top float — visible while working somewhere else.

That is the product. **And today every bit of it is gated behind a mouse.** The three claims below
were verified against the working tree on 2026-09-29, not taken on trust.

### 1.3 Claim 1 — there is no keyboard way in at all

`manifest.json` is twenty-two lines and has **no `commands` key**. Its `action` carries only a
`default_title`, and `src/worker/index.ts` is four lines long:

```
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
```

So the only way to open the side panel is to click the toolbar icon. The anchor tab is one further
click from there (`ControlBar` → "Open full view" → `openAnchorTab`), and the float one further
still ("Float on top" → `openFloat`). **Zero of the three surfaces has a keyboard entry point.**
A keyboard-only user cannot reach this extension at all without a pointing device.

SPEC-01 recorded this as a deliberate choice — **NG-10**, "A keyboard shortcut / `chrome.commands`
entry point to the anchor tab or float. Considered and declined", with the disposition at PI-5:
"declined by the user." This spec reverses that decision. Nothing about the platform changed; the
product argument did — §1.2 was not written down at the time.

### 1.4 Claim 2 — the in-app keyboard model works, and is invisible where it is used

`src/lib/Tabs/elements/rowControls.ts` puts every row control at `tabIndex: -1`:

```
export const rowControlProps = { "data-row-control": true, tabIndex: -1 } as const;
```

and reaches them with a Left/Right walk in `useRowKeys`, whose stop list is
`[row, ...row.querySelectorAll("[data-row-control]")]`. This is a **good** design — it is why a
twenty-tab list costs twenty Tab stops instead of eighty, and SPEC-04 AC-9 pins that figure.

The brief's claim that "nothing in the UI documents it" is **correct, with a correction**: the walk
_is_ documented, but only **outside the product** — `README.md:25` ("`Tab` moves between rows,
`←` / `→` reach the controls on the row you're on") and `store-listing.md:50`. There is nothing in
any of the three surfaces that says so. A user who installs from the Web Store and never reads the
listing has no way to discover that the right arrow does anything.

### 1.5 Claim 3 — selection is per-row, so bulk means per-row work

Verified, and **narrower than the brief states** — which makes the remaining gap sharper:

| What already exists                                                  | Where                                                                      | Keyboard cost                    |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------- |
| Per-tab select/deselect checkbox                                     | `TabDisplay.tsx:124-144`, `aria-label` "Select tab" / "Deselect tab"       | Tab, `→`, activate = **3 keys**  |
| "Select every tab in this window"                                    | `WindowListItem.tsx:105-119`, first `[data-row-control]` on the window row | Tab, `→`, activate = **3 keys**  |
| "Select every tab in group _X_"                                      | `GroupListItem.tsx:178-193`                                                | Tab, `→`, activate = **3 keys**  |
| An arbitrary **range** of rows                                       | —                                                                          | **does not exist**               |
| Select **all** tabs, or all **matching** tabs, in one action         | —                                                                          | **does not exist**               |

> **Corrected 2026-10-02.** The per-tab checkbox is no longer named "Select tab" / "Deselect tab".
> SPEC-04 made it name its tab: "Select ‹title›" / "Deselect ‹title›" (`TabDisplay.tsx`). The line
> numbers in the table are from 2026-09-29 and have moved; the key counts have not.

So "select every tab in one window" is already cheap from the keyboard. What is missing is the
shape the product's own README advertises — _"Multi-select with `Ctrl`/`Cmd`-click (or the
checkbox), then close, group, or move the selection"_ — where the selection is an **arbitrary
set**. From the keyboard that costs **three key presses per row**: `Tab` to the row, `→` to its
select control, `Space` to toggle. Nine tabs is **twenty-seven key presses**; the pointer
equivalent that everyone else's list offers is one click and one Shift-click.

> **Provenance of that count:** it is derived from `useRowKeys`' stop list and the DOM order in
> `TabDisplay`, **not measured in a browser**. AC-31 requires it be measured before it is quoted
> anywhere user-facing.

### 1.6 The three items, in dependency order

1. **A keyboard shortcut that opens the UI** — without it, items 2 and 3 are unreachable.
2. **Focus lands in the search field when the UI opens** — so the user types to narrow eighty rows
   instead of arrowing through them.
3. **Range selection and select-all from the keyboard** — so bulk close, the product's genuine
   advantage, stops being mouse-only.

Each depends on the one above it. A shortcut that lands focus nowhere useful is a shortcut nobody
uses; a filtered list you cannot select in bulk is a search with no payoff.

### 1.7 What the platform has already told us, in this codebase

These are not assumptions — they are constraints this repository has already paid for.

| #   | Constraint                                                                                                                                                                   | Where it is recorded                                        |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| C-1 | `chrome.sidePanel.open()` requires a user gesture, and **awaiting anything first spends it**.                                                                                 | `anchor.ts:88-94`, `surfaces.ts:28-35`                      |
| C-2 | There is no `chrome.sidePanel.close()`; a panel page closing itself is the supported route.                                                                                  | `anchor.ts:65-77` (w3c/webextensions#521)                   |
| C-3 | `sidePanel.open()` **can fail**, and the codebase already has a user-visible failure path for it: _"Couldn't open the side panel"_.                                           | `anchor.ts:102-104`                                         |
| C-4 | The float can only be opened from the **anchor tab** (`canFloat()` is `getHost() === "anchor" && Boolean(documentPictureInPicture)`), synchronously, inside a real gesture.   | `float.ts:118-148`, SPEC-01 C-1/C-3                         |
| C-5 | The anchor tab is **find-or-create, never a second** — because two float-capable documents would evict each other's float.                                                    | `anchor.ts:35-63`                                           |
| C-6 | The app runs in **three separate documents** with three React roots; `search` and the selection genuinely exist once per surface, kept in step by `chrome.runtime` messages.  | `App.tsx:111-162`, `float.ts:177-233`, `SelectionContext.tsx:76-99` |
| C-7 | The float hosts the app in an **iframe**, not by re-parenting DOM.                                                                                                            | `float.ts:315-335`                                          |

And these four are what the research pass established on 2026-09-29. They are recorded with their
sources because three of them are invisible in code review and each one killed a design that looked
reasonable.

| #    | Constraint                                                                                                                                                                                                                                                                                                                      | Source                                                                                                                                                                             |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| C-8  | A `chrome.commands` event **does** qualify as the gesture `chrome.sidePanel.open()` requires — the qualifying triggers are an action click, **a keyboard shortcut**, a context menu, and a gesture on an extension page or content script. **But `open()` must be the first synchronous statement in the listener**: any `await`, or a `runtime.sendMessage` round trip, spends the activation and the call rejects. | https://developer.chrome.com/docs/extensions/reference/api/sidePanel · failure reports: https://issues.chromium.org/issues/355266358, https://github.com/GoogleChrome/chrome-extensions-samples/issues/1001 |
| C-9  | The `commands` manifest key is **not a permission** and adds **no install warning**. It appears in neither Chrome's permissions list nor its permission-warning guidance, and `src/test/manifest.test.ts` asserts only on `manifest.permissions`. **SPEC-01 AC-24 therefore does not fire.** _(No primary source addresses Web Store **re-review** triggers either way; that is unknown, not "no".)_ | https://developer.chrome.com/docs/extensions/reference/permissions-list · https://developer.chrome.com/docs/extensions/develop/concepts/permission-warnings                          |
| C-10 | `suggested_key` constraints: at most **four** suggested shortcuts per extension; every chord must include `Ctrl` or `Alt`; **`Ctrl+Alt` combinations are forbidden** (AltGr); `global` scope is limited to `Ctrl+Shift+[0..9]`; OS and Chrome shortcuts always win and cannot be overridden; **a chord another extension already holds silently fails to register** rather than erroring; users remap at `chrome://extensions/shortcuts`; and `chrome.commands.getAll()` reports `shortcut` as an **empty string** when a command is unassigned. | https://developer.chrome.com/docs/extensions/reference/api/commands                                                                                                                 |
| C-11 | `documentPictureInPicture.requestWindow()` is exposed only on a **top-level `Window`** and throws `NotAllowedError` without transient activation. A service worker has no `window`, and relaying through `runtime.sendMessage` does not transfer activation. **No command can open the float** — this is architectural, not a limitation to work around. | https://developer.mozilla.org/en-US/docs/Web/API/DocumentPictureInPicture/requestWindow · C-4                                                                                       |
| C-12 | **Chrome exposes no API to ask whether the side panel is open, and none to move focus into an open one.** There is no `sidePanel.isOpen()` and no `sidePanel.focus()` — the API surface is `open`, `setOptions`, `getOptions`, `setPanelBehavior`, `getPanelBehavior`. Combined with C-2 (no `close()`), the panel is a surface this extension can create but cannot interrogate or steer. That `sidePanel.open()` on an already-open panel leaves it open is **expected behaviour, not documented behaviour**. **The "cannot focus an open one" half is now measured, not inferred** — C-14 item 3. | https://developer.chrome.com/docs/extensions/reference/api/sidePanel · C-2 (w3c/webextensions#521) · C-14 |
| C-13 | `chrome.commands.onCommand` **passes the active tab to the listener**: `CommandEvent extends chrome.events.Event<(command: string, tab: chrome.tabs.Tab) => void>`. So `tab.windowId` and `tab.url` are both in hand **before the first statement runs**. This is what makes AC-36's operative reading safe — there is nothing to await in order to know which window to open in, or whether the active tab is one of our own pages (AC-39). | `node_modules/@types/chrome/index.d.ts:1264` (`onCommand` declared at `:1278`), verified in this working tree 2026-09-29 |
| C-14 | **Focus on open, measured — the first hard numbers this question has had.** (1) A side panel opened by the keyboard command **does not receive document focus**; typing after the shortcut goes to the page behind it. (2) `window.focus()` **called on mount, from the panel document itself, is honoured** — with it, the first keystroke after the shortcut lands in the search field. (3) A **second** press, with the panel already open, **cannot** bring focus back: the message reaches the panel, but `document.hasFocus()` is `false` before `window.focus()` and `false` after. **Transient activation is required and only the moment of creation carries it.** | Measured on **Chrome 154.0.8037.92, 2026-09-30** — §16. Supersedes the low-confidence Chrome 148/149 claim in §10. |
| C-15 | **`F6` cycles focus between the page and the side panel, in both directions.** The keyboard round trip is therefore complete with nothing from this extension: the shortcut opens the panel and puts the caret in the field (C-14 item 2), and `F6` moves in and out thereafter. **This is why no Escape-to-close handler was added** — NG-13. | Measured on Chrome 154.0.8037.92, 2026-09-30 — §16. |
| C-16 | **dnd-kit's `KeyboardSensor` listens on the owner document**, so a row handler that calls `stopPropagation()` on an arrow hides that key from the drag. The only thing preventing that is `dragActive` — a module-level flag set by a **separate** callback (`App`'s `DndContext` handlers), so it can go stale. Consequence: a row branch that would have to stop on **every** press must not stop at all, so that a stale flag degrades to "focus also moved" rather than "the drag stopped responding". `←`/`→` are exempt because they stop only after finding a stop to move to. | `src/lib/Tabs/elements/rowControls.ts` (`dragActive`, `setRowDragActive`); SPEC-04 §1.6 and AC-37, which record the same hand-off as the part with no external guidance behind it |

C-3 and C-8 together are what makes item 1 buildable at all: the gesture constraint is met, and the
codebase already has a user-visible failure path for the case where the open is refused anyway.
C-8's second sentence is the one that will break this feature if it is forgotten — AC-36 exists for
exactly that, because "the first statement" is not a thing a reviewer notices.

### 1.7a One chord, and what it is not

C-10 leaves a narrow field. The suggested chord is **`Ctrl+Shift+K`** (`Command+Shift+K` on macOS):
it carries `Ctrl`/`Command` as required, is not a `Ctrl+Alt` combination, is not one of Chrome's own
bindings, and is not in the `Ctrl+Shift+[0..9]` range that `global`-scope commands are confined to —
leaving that range for the extensions that actually need it.

Rejected, with reasons, so nobody re-opens this:

| Rejected                                                              | Why                                                                                                                                                                             |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Ctrl+Shift+A`                                                        | Chrome's tab search — the very feature §1.1 says not to compete with. **No Google source names it as reserved against extensions specifically**; this follows from C-10's general "Chrome shortcuts always win" rule, so the reasoning is inference, not citation. |
| `Ctrl+Shift+T`                                                        | Reopen closed tab — the single most-used shortcut among exactly the people this feature serves.                                                                                 |
| `Ctrl+Shift+B`, `D`, `M`, `N`, `O`, `W`, `Delete`                     | Chrome: bookmarks bar, bookmark all tabs, switch profile, incognito, bookmark manager, close window, clear browsing data.                                                       |
| `Ctrl+Shift+C`, `I`, `J`                                              | DevTools.                                                                                                                                                                       |
| Any `Ctrl+Alt+…`                                                      | Forbidden outright (C-10, AltGr).                                                                                                                                               |
| Any chord without `Ctrl` or `Alt`                                     | Forbidden outright (C-10).                                                                                                                                                      |
| `Ctrl+Shift+[0..9]`                                                   | Reserved in shape for `global`-scope commands. This command is browser-scoped and does not need it.                                                                             |

`Ctrl+Shift+K` is a **suggestion**, not a guarantee: C-10 says a chord another extension already
holds fails **silently**. That is why AC-35 requires the product to be able to say its own shortcut
is unbound, rather than assuming the suggestion took.

### 1.8 The collision nobody has written down

`src/lib/Tabs/Tab/TabDisplay.tsx:99` already autofocuses a row on mount:

```
autoFocus={tab.active && focus}
```

with the comment _"it puts focus on the row for the tab the user is already looking at, so the
keyboard starts where they are rather than at the top of a list of eighty."_ `SearchView` passes
`focus={false}`, so this was believed to fire only in `TabsView` — i.e. **exactly when the search
box is empty, which is exactly when the app opens**.

**It is worse than that, and this is a live defect rather than a forward risk.** Verified
2026-09-29: `SearchView:60` passes `focus={false}` only to the top-level `Tabs`, and `Tabs` forwards
it to `TabListItem` for loose tabs — but `GroupListItem.tsx:271` renders
`<TabListItem group={group} tab={tab} key={tab.id} />` **with no `focus` prop at all**, and
`GroupListItem` never mentions `focus` anywhere, so it cannot forward what it never receives.
`TabListItem` spreads its remaining props into `TabDisplay`, whose signature defaults
`focus = true` (`TabDisplay.tsx:34`). So **every tab inside a group already autofocuses when it is
the active tab — including in search results**, which `SearchView` renders with `expandedGroups`.
The `focus={false}` that was supposed to keep search quiet reaches only the tabs that are not in a
group.

That matters twice over. It means item 2 is not introducing a conflict so much as walking into one
that already exists; and it is the argument for **deleting the `focus` prop outright** rather than
threading it correctly — a prop that has been silently wrong at one of its two call sites is a prop
whose contract nobody can see. §1.8's precedence rule 2 says "withdrawn, not outrun" for exactly
this reason.

Item 2 asks for focus to land in the search field on open. That is a **second claim on initial
focus in the same render**, and the two would race by DOM order rather than by decision. This is
the single most likely way item 2 ships subtly broken.

**Resolved: the search field wins, and `TabDisplay`'s claim is withdrawn rather than outrun.**
Precedence, stated once so it is never re-derived:

1. The **search field** takes initial focus whenever it is present (AC-11, AC-12).
2. `TabDisplay`'s `autoFocus` SHALL NOT fire in that same render — the two must not both call
   `focus()` and let the later win. Withdrawn, not outranked.
3. The active tab's row **keeps its role as the entry point into the list**: one key press from the
   field lands there, not on row 1 (AC-14). `TabDisplay`'s original intent — "the keyboard starts
   where they are rather than at the top of a list of eighty" — is preserved, one press later.

So nothing is lost: the user types to filter immediately (US-2), and the user who wanted the list
gets the row they were already on (US-7), from one `↓`.

### 1.9 Sequencing: two deliverables, not one

This spec describes one feature and **two independently shippable groups**. That is a decision, not
an observation, and a plan should be cut along this line.

| Group                        | Items                                  | Acceptance criteria                                                  | Blocked by                            | Touches                                                                   |
| ---------------------------- | -------------------------------------- | -------------------------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------- |
| **A — Entry and focus**      | 1 (shortcut), 2 (focus lands in search) | AC-1…AC-16, AC-28 (as it applies to §5.2), AC-32, AC-34…AC-39         | Nothing. **Ready now.**               | `manifest.json`, `src/worker/index.ts`, `src/App.tsx`, `src/lib/anchor.ts` |
| **B — Keyboard selection**   | 3 (range and select-all)               | AC-17…AC-27, AC-28 (as it applies to §5.3), AC-29…AC-31, AC-33        | **SPEC-04 being implemented first.**  | `src/lib/Tabs/selection/`, the row components SPEC-04 rewrites            |

**Why A ships now.** It touches the manifest, the worker and `App.tsx`. SPEC-04 rewrites none of
those three — its scope is row roles, `rowControls.ts` and the row components (SPEC-04 §1.7). There
is no overlap and therefore no reason to wait.

**Why B waits.** SPEC-04 replaces the row structure item 3's keys land on: rows become `toolbar`
inside `listitem`, the control set moves, and `ItemButton` changes. Building B against today's
structure means writing it twice and reviewing it twice. **Every AC in group B is written against
SPEC-04's post-rework structure, not today's** — a planner reading AC-17…AC-27 should assume rows
are already `listitem`s and that SPEC-04 AC-34…AC-37 are implemented facts, not aspirations.

---

## 2. Goals

- **G-1** A keyboard-only user can reach this extension at all, without touching a pointing device.
- **G-2** Once reached, the first thing they can do is **narrow the list by typing**, not walk it.
- **G-3** The product's own advantage — bulk operations over an arbitrary set of tabs across
  windows and groups — is available from the keyboard at a cost proportional to the **number of
  ranges**, not the number of tabs.
- **G-4** One keyboard model across the side panel, the anchor tab and the float (SPEC-04 G-5).
- **G-5** Nothing this spec adds competes with Chrome's tab search; it adds only what Chrome has no
  answer for (§1.1, §1.2).
- **G-6** The privacy posture is untouched: five permissions, no storage, no host permissions, no
  content scripts. **C-9 confirms the `commands` key costs none of these**, so SPEC-01 AC-24 does
  not fire — verified on a real install (AC-5) rather than assumed.
- **G-7** Degrade honestly. A shortcut that Chrome declines to bind, or a surface the platform
  refuses to open, leaves the user in a working state with an explanation — never in a dead window
  and never in silence.
- **G-8** Selection only ever covers **rows the user can see**. One principle, applied to both
  range and select-all (§5.3), because "select everything" quietly including eighty invisible tabs
  is how someone closes what they meant to keep.

---

## 3. Non-goals

- **NG-1** Replacing, competing with, or reimplementing **Chrome's tab search** (`Ctrl+Shift+A`).
  Recently-closed tabs, a command palette, fuzzy ranking, "switch to tab" as the headline action —
  all out. Chrome does this well and the user already has it. This spec's search field exists to
  **narrow the bulk-operation target set**, which is a different job.
- **NG-2** Rebinding, shadowing or reserving any of Chrome's own shortcuts (`Ctrl+Shift+A`,
  `Ctrl+1–9`, `Ctrl+Tab`, `Ctrl+W`, `Ctrl+Shift+T`). `Ctrl+Shift+A` in particular is unavailable.
- **NG-3** Any new manifest **permission**. The array stays exactly the five of SPEC-03 AC-6, with
  no `host_permissions` and no `content_scripts` (SPEC-01 NG-3). _(**C-9: the `commands` key is not
  a permission and adds no install warning, so SPEC-01 AC-24 does not fire.** AC-5 is retained as
  the guard that verifies this on a real install rather than assuming it.)_
- **NG-4** Persisting anything: the last search, the last selection, the last surface, a "don't
  focus search again" preference, or a dismissed hint. SPEC-01 **AC-23** forbids `chrome.storage`,
  `localStorage`, `sessionStorage`, IndexedDB and cookies outright, and `src/test/manifest.test.ts`
  enforces it by scanning the source. **A remembered "last search" or "last selection" would
  violate it.**
- **NG-5** A settings screen, an options page, or any in-app way to rebind the shortcut. Chrome
  owns that surface at `chrome://extensions/shortcuts`; a second one would need storage (NG-4).
- **NG-6** Changing SPEC-04's keyboard walk. `Tab` between rows, `←`/`→` within a row, no wrapping,
  no Home/End within a row — all exactly as SPEC-04 AC-34…AC-37 pin them. _(**`↑` and the modifier
  rule do not breach this.** AC-40 adds a key to the handler that implements the walk without
  changing the walk: `↑` is the exit from the list, not a step within it, and every stop SPEC-04
  pins keeps its position and its key. AC-41 narrows `←`/`→` to **unmodified** presses, which is a
  change to what the handler accepts, not to where the walk goes — recorded in §15 A-6 rather than
  left to be found.)_
- **NG-7** Changing what any row control **does**, or the pointer semantics of selection. A plain
  click still activates; `Ctrl`/`Cmd`-click still toggles (SPEC-04 AC-18).
- **NG-8** A global shortcut that performs a **destructive action** without opening the UI first
  ("close all selected", "mute everything"). A key the user may have forgotten binding must not be
  able to close tabs. See NFR-5.
- **NG-9** Opening the **float** from the shortcut. Not declined on taste — **architecturally
  impossible** (C-11): `documentPictureInPicture.requestWindow()` exists only on a top-level
  `Window`, throws `NotAllowedError` without transient activation, a service worker has no `window`,
  and relaying through `runtime.sendMessage` does not transfer activation. **A command can open or
  focus a surface; the user floats it themselves**, from the anchor tab, with the control that is
  already there. Nothing in this spec may attempt to synthesise or forward activation across
  documents to get around it.
- **NG-10** Reordering, dragging or moving tabs from any new key binding. Keyboard drag already
  exists via dnd-kit and SPEC-04 owns it.
- **NG-11** Multi-key chords, a vim-style leader key, or a modal command mode inside the app.
- **NG-12** Announcing anything about the shortcut across surfaces, or syncing a selection to a
  server, a device or a profile. Selection already crosses documents via `chrome.runtime`
  messaging (C-6) and that is the whole of it.
- **NG-13** An **Escape-to-close** handler on the side panel. **Considered and dropped, 2026-09-30.**
  It was on the table as the way out of a panel the keyboard had just entered — but closing the panel
  destroys its search text, which is state the user typed, to solve a problem **`F6` already solves
  in one key with nothing lost** (C-15, measured: `F6` cycles page↔panel in both directions). A
  keyboard user's exit does not have to be a demolition. Recorded so it is not proposed again.

---

## 4. User stories

  **Viability confirmed 2026-09-30 (§16 item 5):** the command does reopen the panel after a manual close, so this was dropped on cost and not on capability — closing destroys the panel's search text to solve what `F6` solves in one key with nothing lost.
- **US-1** As a keyboard-only user, I want to open Conscious Tabs with a key, so that the extension
  is reachable at all without a mouse.
- **US-2** As someone with eighty tabs open, I want to start typing the moment the manager appears,
  so that I narrow the list instead of arrowing through it.
- **US-3** As someone triaging tabs, I want to select a run of rows with the keyboard and close
  them in one action, so that the bulk close this extension exists for costs a few key presses
  rather than twenty-seven.
- **US-4** As someone who has filtered to "docs", I want one key to select everything that matched,
  so that the search and the bulk action are one workflow rather than two.
- **US-5** As a screen-reader user, I want to be told how many tabs are now selected, so that I know
  what a bulk close is about to do before I do it.
- **US-6** As someone who already uses `Ctrl+Shift+A` and a dozen other shortcuts, I want this
  extension's key not to collide with something I rely on, and I want a way to change it if it
  does.
- **US-7** As a user who wanted the **list**, not the search box, I want a cheap way to get to the
  first row, so that focusing the field is a head start rather than a detour.
- **US-8** As a privacy-conscious user, I want a keyboard entry point that costs no new permission
  and stores nothing, so that "runs entirely on your device, stores no data of its own" stays
  literally true.

---

## 5. Acceptance criteria

Each is one testable statement. IDs are stable — never renumber; append `AC-N+1` for new ones.
Priority uses MoSCoW. AC-1…AC-34 were written while thirteen decisions were open; their ids and
`Verify:` hints are unchanged, and the ones that were blocked now name the decision instead.
AC-35…AC-39 are the criteria those decisions added. **§1.9 splits these into two delivery groups.**

### 5.1 Item 1 — a keyboard way in  *(group A)*

**The resolved behaviour, per state.** One custom command, `open-conscious-tabs`, whose only job is
to make a surface present and focused in **the window the user is in**. It opens the side panel —
the default, fully-featured home (SPEC-01 G-4) — or focuses the UI where it already is. **There is
no toggle**: there is no `chrome.sidePanel.close()` (C-2), and a key that destroys a surface is
worse than one that focuses it.

| State when the command fires                                    | What happens                                                                                                                                                                 |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| No surface of the app open                                       | The **side panel opens** in the focused window, with focus in its search field.                                                                                              |
| Side panel already open **in this window**                       | It stays open and is focused. Never closed, never reopened, never duplicated.                                                                                                |
| The active tab in this window **is one of our own pages** (the anchor tab) | The UI is already in front of the user: **no panel is added**; the existing page is focused. (`isOwnPage`, `surfaces.ts:14` — AC-39, with its escape hatch.)        |
| Anchor tab open **in a different window**                        | The **side panel opens in the focused window**. The user is not teleported. Side panels are per-window and SPEC-01 **G-2** already accepts one copy per window; `openAnchorTab`'s focus-and-raise behaviour (`anchor.ts:51-59`) is deliberately **not** reused here. |
| A **float** is up                                                | The float is always-on-top and already visible, and its anchor tab necessarily exists in some window. Treated as the two rows above, by which window the user is in. The command never opens, closes or touches the float (NG-9, C-11). |

- **AC-1** _(Must)_ `manifest.json` SHALL declare a **custom-named** `commands` entry — not the
  reserved `_execute_action` — whose activation opens or focuses a working surface of the tab
  manager.
  **Verify:** unit — extend `src/test/manifest.test.ts` to assert a `commands` key exists with one
  named command, and that the name is not `_execute_action` or any other `_execute_*` reserved
  name; manual — press the key on a clean profile and observe the UI appear. _(§13 DEC-4: a
  reserved name dispatches no `onCommand` event, which removes the branch AC-2 and AC-3 need.
  `_execute_side_panel` does not exist — it appears in AI search summaries and in neither the
  commands reference nor the side-panel guide. Do not use it.)_
- **AC-2** _(Must)_ WHEN the command fires and no surface of the app is open, the system SHALL open
  the **side panel** in the focused window, fully functional — never a blank window, a placard, or a
  surface with a subset of the features.
  **Verify:** manual on a clean profile per §5.1's state table; unit — the handler resolves to the
  side panel and to no other surface.
- **AC-3** _(Must)_ WHEN the command fires and a surface of the app is **already open in the focused
  window**, that surface SHALL be left **intact** — no second copy, no close, no reopen — and the
  outcome SHALL be identical on every repeat.
  **Verify:** manual — fire the command three times in a row from each state in §5.1's table and
  assert the surface is unchanged after each; unit — the handler issues no close, no duplicate open,
  and no surface-destroying call. _(**Deliberately says "intact", not "focused".** C-12: Chrome
  exposes no API to ask whether the side panel is open, and none to move focus into an open one, so
  a focus clause here could be neither satisfied nor verified. What is testable is that nothing is
  disturbed. **The assumption this relaxation rested on is now a measurement** (C-14 item 3, Chrome
  154.0.8037.92, 2026-09-30): the plumbing to focus an already-open panel was built specifically to
  find out — the worker messaged the panel after opening, the panel listened, all three presses were
  heard — and `window.focus()` was ignored every time, `document.hasFocus()` false before the call
  and false after. Only the moment of creation carries the activation. The plumbing was then removed.
  **So this criterion is not a concession to uncertainty; it is the measured ceiling.** `F6` is the
  user's own route back into an open panel (C-15). No toggle either: C-2, there is no
  `chrome.sidePanel.close()`. And the premise that `sidePanel.open()` on an already-open panel leaves
  it open remains **expected behaviour, not documented behaviour**, which is why the manual sweep
  **observes** it rather than a unit test asserting it.)_
- **AC-4** _(Must)_ The command SHALL declare a non-empty, user-facing `description` in the
  manifest, so that it is named and rebindable at `chrome://extensions/shortcuts`.
  **Verify:** unit — assert the description is non-empty and is not the command's internal id;
  manual — the description appears verbatim on the shortcuts page.
- **AC-5** _(Must)_ Declaring the `commands` key SHALL add **no new install-time permission
  warning**, and `PRIVACY.md`, `store-assets/privacy-policy.html`, `README.md` ("Requested
  permissions") and `store-listing.md` ("Permission justifications") SHALL therefore remain
  unedited on the permission question.
  **Verify:** `src/test/manifest.test.ts`'s five-file mirror test, unmodified, must pass; **plus** a
  manual load-unpacked install on a clean profile, recording the warning dialog verbatim and
  asserting it is unchanged from today's. _(C-9 establishes this from Chrome's permissions list and
  permission-warning guidance, so **SPEC-01 AC-24 does not fire**. This criterion is the guard that
  confirms it rather than trusting it: a test that reads `manifest.json` cannot see an install
  warning, so the manual step is not optional. Web Store **re-review** triggers are addressed by no
  primary source either way — unknown, not "no".)_
- **AC-6** _(Must)_ The manifest's `permissions` array SHALL remain exactly
  `["sidePanel", "tabs", "tabGroups", "sessions", "favicon"]`, with no `host_permissions`,
  `optional_host_permissions` or `content_scripts`.
  **Verify:** unit — `src/test/manifest.test.ts`, unmodified.
- **AC-7** _(Must)_ IF Chrome does not bind the suggested key — because the user cleared it, because
  another extension silently took it (C-10), or because a platform limit was reached — THEN every
  existing entry point SHALL continue to work unchanged and no error SHALL be surfaced to the user.
  **Verify:** manual — clear the shortcut at `chrome://extensions/shortcuts`, then exercise the
  toolbar icon, "Open full view", "Float on top" and "Back to panel"; unit — no code path treats an
  unbound command as a failure state.
- **AC-8** _(Must)_ IF `chrome.sidePanel.open()` rejects, THEN the system SHALL land the user in the
  **anchor tab** rather than doing nothing.
  **Verify:** unit — force `sidePanel.open()` to reject; assert the anchor tab is opened or focused.
  _(C-3: the open can fail and the codebase already has a user-visible failure path for it. C-5: the
  anchor tab has no platform precondition — `chrome.tabs.create` needs no gesture, so this fallback
  is still reachable after the activation has been spent by the failed call. **The cost of this
  fallback on a repeat press is accepted, not overlooked — see R-1.**)_
- **AC-9** _(Must)_ The command SHALL NOT create a second anchor tab when one already exists; the
  find-or-create contract of `openAnchorTab` SHALL be preserved, including its preference for a
  real `?host=anchor` tab over a bare extension page.
  **Verify:** unit — with one anchor tab already open, firing the command leaves exactly one
  extension page open. _(C-5. Two float-capable documents evict each other's float.)_
- **AC-10** _(Must)_ The command handler SHALL perform **no action other than opening or focusing a
  surface** — it SHALL NOT close, mute, move, group or activate any tab.
  **Verify:** unit — the handler's call graph touches only surface-opening APIs; assert
  `chrome.tabs.remove`, `chrome.tabs.update({active})` on user tabs, and `chrome.tabGroups.*` are
  never reached from it. _(NG-8, NFR-5.)_

### 5.2 Item 2 — focus lands in the search field  *(group A)*

- **AC-11** _(Must)_ Exactly **one** element SHALL receive initial focus when a surface mounts: the
  **search field**, and `TabDisplay`'s `autoFocus` SHALL be withdrawn in that render rather than
  left to lose a race.
  **Verify:** unit — mount with an active tab in `TabsView`, **and again with the active tab inside
  a group**, and **again in `SearchView` with the active tab inside a group**; in each case assert
  `document.activeElement` is the search field **and** that the active tab's row never called
  `focus()` at all. _(§1.8. Asserting only the end state would pass while both still fired, which is
  the bug this criterion exists to prevent. The two in-group fixtures are not hypothetical: today
  `GroupListItem.tsx:271` passes no `focus` prop, so `TabDisplay`'s `focus = true` default already
  applies to every grouped tab **including in search results** — the criterion must close the
  existing leak, not only the new one.)_
- **AC-12** _(Must)_ WHEN a surface's document **first receives focus**, the caret SHALL be in the
  search field and the next character the user types SHALL appear in it, with no intervening key
  press.
  **Verify:** unit — `userEvent.keyboard("doc")` immediately after mount produces `search === "doc"`;
  manual in all three surfaces per AC-38. _(Deliberately keyed to "the document first receives
  focus", not "mount", because the panel does **not** get document focus from the open itself — now
  measured, C-14 item 1. What closes the gap is the mount-time `window.focus()` of C-14 item 2, which
  AC-38 permits under its four conditions; the caret is therefore in the field for the first
  keystroke after the shortcut. A criterion written against mount alone would be untestably true in
  jsdom and false in Chrome.)_
- **AC-13** _(Must)_ The auto-focused search field SHALL carry its existing accessible name, and
  focusing it SHALL NOT suppress the document's heading or landmark structure for a screen-reader
  user arriving at a freshly opened surface.
  **Verify:** unit — the focused element's accessible name is `"search"` (`App.tsx:255`); manual —
  one screen-reader pass per surface.
- **AC-14** _(Must)_ WHILE focus is in the search field, **one press of `↓`** SHALL move focus into
  the list — landing on the **active tab's row** where the list contains one, and on the first row
  otherwise.
  **Verify:** unit — from the focused field, `↓` puts `document.activeElement` on the active tab's
  row in a fixture that has one, and on row 1 in a fixture that does not; manual. _(US-7, and §1.8's
  precedence rule 3 — this is where `TabDisplay`'s "start where the user already is" intent is
  honoured, one press later. `↓` is bound **in the field**, not in the list: NG-6 and SPEC-04 keep
  plain arrows from moving between rows, and this does not change that. **AC-40 is the return trip**
  — without it this entry was a one-way door, which is what real use found within a minute.)_
- **AC-15** _(Must)_ Focusing the search field on open SHALL NOT alter the `search` value, and SHALL
  NOT cause the float to report a search the user did not type.
  **Verify:** unit — mount as `host="float"`, assert `reportFloatSearch` is not called on mount;
  then close the float and assert the anchor's search is unchanged. _(`App.tsx:131-148`: the
  `reported.current` guard exists precisely because reporting on mount "would hand the anchor an
  empty search the user never typed, wiping the one they left behind." Any "clear the field on
  open" behaviour breaks it.)_
- **AC-16** _(Must)_ The search field SHALL open empty on every surface, except where the existing
  in-memory float→anchor hand-off supplies text, and nothing about the search SHALL survive the
  surface closing.
  **Verify:** unit — `takeFloatSearch` remains the only source of a non-empty initial search; the
  storage-free scan in `src/test/manifest.test.ts` passes unmodified. _(NG-4, SPEC-01 AC-23.)_

### 5.3 Item 3 — range selection and select-all  *(group B — assumes SPEC-04 is implemented)*

**The resolved key model.** `Shift`+`↑`/`↓` extends a range; **no plain arrow moves focus from one
row to another** (NG-6, SPEC-04). `Ctrl`/`Cmd`+`A` selects all **while focus is in the list**; in the search field it
keeps its native select-all-**text** meaning. And one principle governs both, **G-8: selection only
ever covers rows the user can see.**

> **The invariant, stated precisely, because it reads like a contradiction otherwise.** The rule is
> **not** "plain arrows do nothing in the list" — it is **"no plain arrow moves focus from one row to
> another."** Three plain arrows are bound, and none of them is row-to-row movement: `←`/`→` move
> **within** the focused row (SPEC-04 AC-34), `↑` **leaves the list** for the search field (AC-40),
> and `↓` in the field **enters** it (AC-14). What stays unclaimed is exactly the meaning `Shift`+`↑`
> and `Shift`+`↓` need for a range (AC-17) — which is the whole reason the invariant is worded this
> way. AC-41 is what keeps the modified and unmodified arrows from colliding.

- **AC-17** _(Must)_ WHEN the user presses `Shift`+`↑` or `Shift`+`↓`, focus SHALL move one row in
  that direction and every row between the anchor row and the newly focused row **inclusive** SHALL
  become selected.
  **Verify:** unit — focus row 2, press `Shift`+`↓` five times, assert `selected` contains exactly
  rows 2–7's tab ids and that `document.activeElement` is row 7; assert reversing direction shrinks
  the range rather than starting a new one. _(The anchor is the row focus was on when the first
  `Shift`+arrow was pressed. Plain arrows are **not** bound — `Shift`+arrow both moves and extends,
  which is why this needs no change to SPEC-04's walk.)_
- **AC-18** _(Must)_ WHEN the user presses `Ctrl`/`Cmd`+`A` while focus is in the list, the
  selection SHALL become exactly **the tabs currently matching the filter**, and SHALL NOT include
  tabs excluded by it.
  **Verify:** unit — with a filter matching 5 of 20 tabs, assert `selected` has exactly those 5;
  clear the filter and assert it takes all rendered tabs. _(G-8. "All tabs" is what the words say,
  but selecting eighty invisible tabs from a three-row list is how someone closes what they meant to
  keep. `SearchView:12-19` defines matching as a case-insensitive substring of title **or** URL.)_
- **AC-19** _(Must)_ A keyboard range SHALL cover the rows the user can see: it SHALL run **through**
  window and group boundaries in visual order, SHALL NOT select the window or group header rows
  themselves, and SHALL NOT include the tabs of a **collapsed** group it spans over.
  **Verify:** unit — a fixture with two windows, one expanded group and one **collapsed** group;
  extend a range spanning all of them and assert the selected set contains the visible tabs of both
  windows and the expanded group, and **none** of the collapsed group's tabs and no header ids.
  _(G-8, and SPEC-04 E-1: a collapsed group's tabs are not rendered at all. **Stated explicitly
  because the opposite is a defensible reading** — "the range spanned the group, so it took the
  group" — and someone will assume it. Note this does not contradict the group row's own "Select
  every tab in group _X_" control (AC-22): that is an explicit act on a named target, which is a
  different thing from a range sweeping over a closed container.)_
- **AC-20** _(Must)_ A selection made from the keyboard SHALL be indistinguishable downstream from
  one made with the pointer: it SHALL dispatch the same `SelectionContext` actions, and the
  `SelectionToolbar`'s Deselect, Group, Window and Close SHALL act on it identically.
  **Verify:** unit — assert the dispatched action shapes are the existing
  `select`/`deselect`/`set`/`clear` union from `SelectionContext.tsx:13-20`; render
  `SelectionToolbar` after a keyboard selection and assert it appears with the right count.
- **AC-21** _(Must)_ Pointer selection semantics SHALL be unchanged: a plain click performs the
  row's primary action, a `Ctrl`/`Cmd`-click toggles selection and does nothing else.
  **Verify:** existing `TabDisplay.test.tsx` and `GroupDisplay.test.tsx` assertions pass unmodified
  (SPEC-04 AC-18, NG-7).
- **AC-22** _(Must)_ The existing per-row, per-group and per-window select controls SHALL keep their
  present behaviour, their accessible names and their positions in the `←`/`→` walk.
  **Verify:** unit — the walk over a tab row, a group row and a window row still visits the select
  control at the same index with the same name (`TabDisplay.tsx:129`,
  `WindowListItem.tsx:107-111`, `GroupListItem.tsx:180-184`).
- **AC-23** _(Must)_ WHILE focus is in the search field, `Ctrl`/`Cmd`+`A` SHALL keep its native
  select-all-**text** meaning and SHALL NOT change the selection; the list select-all SHALL apply
  only while focus is in the list.
  **Verify:** unit — with focus in the field and text present, `Ctrl`+`A` selects the field's text
  and leaves `selected` unchanged; with focus on a row, it selects per AC-18; manual in all three
  surfaces. _(The field is exempt. Overriding it would be hostile in the one field item 2 just told
  the user to type in.)_
- **AC-24** _(Must)_ WHEN a selection changes by keyboard, the **running total** of selected tabs
  SHALL be announced in `App.tsx`'s existing polite live region, without moving focus.
  **Verify:** unit — the live region's text after a range selection reads the total (not a delta);
  assert it reuses the existing region and the existing 600 ms debounce, so a ten-row range produces
  one announcement, not ten. _(`App.tsx:164-178` already runs exactly this pattern for match counts,
  with the comment "`polite` queues rather than interrupts". A delta — "6 added" — is meaningless to
  someone who has lost count, which is precisely the user this announcement is for. One region, last
  writer wins: a selection announcement may replace a match-count announcement and vice versa, and
  neither suppresses the other permanently.)_
- **AC-25** _(Must)_ Any announcement this spec adds SHALL be composed of counts and fixed strings,
  and SHALL NOT interpolate a tab title or URL.
  **Verify:** unit — render a tab whose title is `"><img src=x onerror=alert(1)>`, make a keyboard
  selection, assert the announcement contains only the count and fixed words and that no element is
  created from the title. _(SPEC-04 AC-24, SPEC-01 AC-26, NFR-5.)_
- **AC-26** _(Must)_ WHILE a drag is live, no key this spec binds SHALL change the selection or move
  focus; WHEN the drag ends or is cancelled, they SHALL take effect again.
  **Verify:** unit — with `setRowDragActive(true)`, the new keys leave `selected` and
  `document.activeElement` unchanged and reach dnd-kit; after `onDragEnd` and `onDragCancel` they
  work again. _(SPEC-04 AC-37. **AC-42 is the group-A half of this**, already shipped for `↑`,
  including the propagation clause that keeps a stale flag from silencing a drag; C-16.)_
- **AC-27** _(Must)_ The feature SHALL write no data to `chrome.storage`, `localStorage`,
  `sessionStorage`, IndexedDB or cookies — in particular no remembered selection and no remembered
  search.
  **Verify:** unit — `src/test/manifest.test.ts`'s source scan passes unmodified; manual storage
  inspection after a full session. _(SPEC-01 AC-23, NG-4.)_

### 5.4 One model, three surfaces, nothing regressed  *(groups A and B)*

- **AC-28** _(Must)_ Every behaviour in §5.2 and §5.3 SHALL behave identically in the side panel,
  the anchor tab and the float.
  **Verify:** unit — the same key walk run under each `host`; manual at the float's ~400 px width.
  _(SPEC-04 AC-8; C-7 — the float runs the app in an iframe, so focus and key handling cross a
  document boundary there and must be exercised, not assumed.)_
- **AC-29** _(Must)_ SPEC-04's keyboard walk SHALL be unchanged: `Tab` moves between rows and not
  within one, `←`/`→` move between the focused row's controls, neither wraps, and Home/End stay
  unbound within a row.
  **Verify:** SPEC-04's AC-34 and AC-35 tests pass unmodified (NG-6) — with the one stated
  narrowing that those tests must exercise **unmodified** `←`/`→`, per AC-41. _(AC-40's `↑` adds a
  key to the same handler without altering any stop, any order or any boundary of the walk itself.)_
- **AC-30** _(Must)_ The list's Tab-stop budget SHALL NOT increase: a 20-plain-tab fixture SHALL
  still cost **20** stops.
  **Verify:** SPEC-04 AC-9's test passes unmodified. _(A "select mode" that made checkboxes real tab
  stops would quadruple it — the exact defect `rowControls.ts:15-18` exists to prevent.)_
- **AC-31** _(Should)_ The per-row keyboard cost of building an arbitrary selection SHALL be
  **measured in a browser** before it is quoted in any user-facing text.
  **Verify:** manual — record the key-press count for a nine-tab selection before and after, in one
  named surface, in the measurement log. _(§1.5's "27" is derived from source, not observed.)_
- **AC-32** _(Should)_ WHEN this feature ships, `README.md` ("Built for the keyboard") and
  `store-listing.md` SHALL describe the shortcut and the selection keys, and SHALL say that the
  shortcut is rebindable at `chrome://extensions/shortcuts`.
  **Verify:** manual review against `README.md:25` and `store-listing.md:50`, which today describe
  only the `Tab` / `←` / `→` walk.
- **AC-33** _(Could — deferred to **PI-8**)_ The application SHALL make its **row-walk** keyboard
  model discoverable from inside the app, without persisting a dismissal.
  **Verify:** manual — a user who has never read the README can discover the row walk and the
  selection keys from within a surface. _(§1.4: today this is documented only outside the product.
  Deferred rather than dropped — see PI-8, which records what an acceptable affordance looks like.
  AC-35 is **not** deferred: telling the user their shortcut is unbound is required, and is a
  different problem.)_
- **AC-34** _(Must)_ The value delivered to the command handler SHALL be matched against a known
  literal command name, and SHALL NOT be used to index into a handler map or to construct a call.
  **Verify:** unit — an unrecognised command name is ignored and reaches no branch. _(§11.)_

### 5.5 What the resolved decisions added  *(AC-35…AC-39)*

- **AC-35** _(Must)_ WHEN the command's shortcut is not bound — `chrome.commands.getAll()` reports
  its `shortcut` as an empty string — the application SHALL be able to tell the user so, and SHALL
  name `chrome://extensions/shortcuts` as where to fix it.
  **Verify:** unit — with `getAll()` stubbed to return `shortcut: ""`, the surface renders the
  notice and names the shortcuts page; with a bound shortcut, it renders nothing. _(C-10: a chord
  another extension already holds **fails silently**, and a cleared one looks identical. Both
  present as `""`, so one criterion covers both. This is state-derived and permanent, not a
  dismissible hint, so NG-4 and SPEC-01 NG-12 are not implicated — nothing is remembered.)_
- **AC-36** _(Must)_ No `await`, no `.then()` continuation, no `chrome.runtime.sendMessage`, and no
  other `chrome.*` call SHALL precede `chrome.sidePanel.open()` in the command listener. A purely
  synchronous guard over the `tab` argument the event already supplies (C-13) is permitted.
  **Verify:** unit — assert `chrome.sidePanel.open`'s `mock.invocationCallOrder` is **lower than
  every other `chrome.*` mock's** in the listener; static — a source check over the listener body
  that fails on an `await`, a `.then()`, or any other `chrome.*` call before the open, as the loud
  backstop for the case where a new call is added and no mock exists for it yet.
  _(C-8. **This is the operative reading, not "the first statement".** What protects the transient
  activation is that nothing *spends* it beforehand; a synchronous `if` over `tab.url` does not, and
  the literal reading would have made this criterion and AC-39 mutually exclusive. C-13 is what makes
  that safe — `tab.windowId` and `tab.url` arrive with the event, so there is nothing to await. The
  failure this prevents is invisible in review and fatal at runtime: the open rejects with no
  user-facing symptom beyond "the key did nothing". It killed the same design in
  issues.chromium.org/issues/355266358 and chrome-extensions-samples#1001.)_
- **AC-37** _(Must)_ The manifest's `suggested_key` SHALL satisfy C-10 — it SHALL contain `Ctrl`
  (or `Command`/`MacCtrl` on macOS) or `Alt`, SHALL NOT be a `Ctrl+Alt` combination, and SHALL NOT
  be any of Chrome's own chords.
  **Verify:** unit — assert the `suggested_key` strings contain a required modifier, do not match
  `Ctrl+Alt`, and are not in a deny-set naming Chrome's bindings (`Ctrl+Shift+A`, `+T`, `+B`, `+C`,
  `+D`, `+I`, `+J`, `+M`, `+N`, `+O`, `+W`). _(§1.7a. The deny-set is the executable form of that
  table, so the reasoning cannot be lost to a later edit.)_
- **AC-38** _(Must)_ The application SHALL NOT take focus **the user did not ask for**. Claiming
  focus for a surface is permitted only under all four of these conditions together: **on mount**,
  **once**, **only when the document does not already have focus**, and **only because a keypress
  asked for that surface**. AND the focus-on-open behaviour of AC-12 SHALL be measured in a real
  Chrome on all three surfaces — side panel, anchor tab, float — before item 2 is called done.
  **Verify:** unit — the focus call fires once, from mount, guarded on `document.hasFocus()` being
  `false`, and is wired to **no other event** (not a later command press, not `visibilitychange`,
  not `focus`, not a message from the worker). Manual — per surface, record in §16 whether the
  document had focus on open, whether the call was honoured, and where the caret landed.
  _(**Amended 2026-09-30 (§15 A-5). This criterion used to forbid forcing or faking focus outright,
  and the implementation deliberately asks for it — a spec that bans what the code does is worse
  than either position.** C-14 is the measurement that reversed it: a panel opened by the command
  does **not** receive document focus, but `window.focus()` on mount **is** honoured, so the
  keystroke after the shortcut lands in the search field. What stays forbidden is the thing the
  criterion was always about — **a panel pulling focus off a page someone is reading.** The four
  conditions are what make that a rule rather than a loophole: mount-only and once means it cannot
  fire while the user is elsewhere; the `hasFocus()` guard means it cannot steal what it already
  has; and "a keypress asked for this surface" is the user's own request, which is the whole
  difference. C-14 item 3 shows the loophole is not even reachable — a later press cannot take focus
  back, because only the moment of creation carries the activation.)_
- **AC-39** _(Should)_ WHEN the active tab in the focused window is one of the extension's own pages
  (`isOwnPage`), the command SHALL NOT add a second copy of the UI to that window; AND IF that
  determination cannot be made without spending the transient activation C-8 requires, THEN AC-2's
  open SHALL take precedence and the result SHALL be the two-copies-in-one-window state SPEC-01
  **G-2** already tolerates — never a rejected open.
  **Verify:** unit — with the focused window's active tab an extension page, no `sidePanel.open()`
  is issued and the existing page is focused; and a test asserting that whichever branch is taken,
  the user ends on a working surface. _(`surfaces.ts:14`. Deliberately `Should` with a stated
  escape, because this refinement is only available if the active tab is knowable synchronously.
  **C-13 says it is** — `onCommand` hands the listener the active tab, so `isOwnPage(tab.url)` is a
  synchronous guard and AC-36 expressly permits it. The escape hatch is therefore not expected to
  fire; it is retained because a degraded extra copy is a far better failure than a dead key.)_

### 5.6 The list's exit, and the modifier rule  *(group A — AC-40…AC-42)*

`↓` in the search field enters the list (AC-14). **Nothing came back out.** `Shift+Tab` from a row
lands on whatever precedes it in the DOM, not the field, so the list was a one-way trip — reported
from real use within a minute of the shortcut shipping. `↑` is the mirror of `↓`: not row-to-row
movement, **the exit from the list**. See the restated invariant in §5.3.

- **AC-40** _(Must)_ WHEN the user presses a plain `↑` WHILE focus is on a row **or on a control
  inside a row**, focus SHALL move to the search field.
  **Verify:** unit — from the first row, from a later row, and from a control reached by `→` inside a
  later row, `↑` puts `document.activeElement` on the search field; run the same three cases against
  a tab row, a group row and a window row and assert identical behaviour. _(**Bound from any row, not
  only the first.** Plain arrows do not move between rows, so there is no "previous row" meaning to
  displace — and a key that works at the top while silently doing nothing three rows down is worse
  than one that does not exist. Implemented once in `useRowKeys` so all three row kinds cannot
  diverge. The field is located by a marker attribute (`App.tsx:277`, `data-search-field`), so **the
  field carrying its marker is part of this contract** — lose it and `↑` silently does nothing,
  which is the failure this criterion is shaped to catch.)_
- **AC-41** _(Must)_ A row's keyboard handler SHALL ignore any arrow press carrying `Shift`, `Ctrl`,
  `Alt` or `Meta` — `↑`, `←` and `→` alike.
  **Verify:** unit — on a row, `Shift`+`↑` leaves focus unchanged and does not reach the search
  field; `Ctrl`+`→` and `Alt`+`→` leave focus unchanged; plain `←`/`→` still walk the row's controls.
  _(Two reasons, one rule. **`Shift`+`↑` must stay free for group B's range selection** (DEC-6…DEC-9,
  AC-17) — if `↑` claimed it, item 3 would arrive to find its key already taken by item 2. And
  `Ctrl`/`Alt`+arrow belong to the browser. **This is a behaviour change in group A's scope, recorded
  rather than discovered:** `←`/`→` previously accepted modifiers, so `Ctrl`+`→` used to walk a row's
  controls and no longer does.)_
- **AC-42** _(Must)_ WHILE a keyboard drag is live, the row keyboard handler SHALL take no action for
  any arrow key; AND the `↑` branch SHALL NOT call `stopPropagation()`.
  **Verify:** unit — with `setRowDragActive(true)`, `↑`, `←` and `→` all leave
  `document.activeElement` unchanged; **and** a plain `↑` on a row is observed by a listener attached
  to the owner document, proving propagation was not stopped. _(The arrows belong to dnd-kit during a
  drag (SPEC-04 AC-37, C-16). The propagation clause is the load-bearing half and is **not** a style
  preference: `↑` would have to stop on **every** press, since unlike `←`/`→` it has no "found a stop
  to move to" condition to gate on — and the only thing standing between that and a drag whose arrows
  go dead is a module-level flag set by a separate callback. Letting `↑` bubble means a stale flag
  degrades to "focus also moved" rather than "the drag stopped responding". `←`/`→` still stop,
  because they only do so once they have found a stop.)_

---

## 6. Edge cases

| #        | Case                                                                                  | Expected                                                                                                                                                                                       |
| -------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **E-1**  | Command fires while a **float is open**                                               | No second float, and the float is never closed or touched (NG-9, C-11 — a command cannot reach it at all). Resolved by §5.1's state table on which **window** the user is in: the float's anchor tab counts as "our own page" for AC-39. |
| **E-2**  | Command fires while the **anchor tab exists in a different window**                   | `openAnchorTab` focuses it and raises its window (`anchor.ts:51-59`). It must not create a second one (AC-9).                                                                                   |
| **E-3**  | Command fires with **no normal browser window** open (Chrome alive in the background) | `resolveUserWindow()` can return `undefined` (`surfaces.ts:110`). The command must still produce a working surface or fail visibly — not throw into a background worker where nobody sees it.   |
| **E-4**  | Command fires while the user is on a **privileged page** (`chrome://extensions`, the Web Store) | Must behave the same as anywhere else. C-8 makes the command itself a qualifying gesture regardless of the page, and the side panel is per-**window**, not per-tab — but this is the state most likely to surprise, so AC-38's manual pass covers it. |
| **E-5**  | Command fires **twice in rapid succession**                                           | The open surface is left intact (AC-3) and no error toast appears. `float.ts`'s `requesting` flag (`float.ts:87-97`) is the precedent for why this is a real failure and not a theoretical one. **If the second open rejects, AC-8's fallback opens an anchor tab — accepted, see R-1**, and this is the state the manual sweep watches. |
| **E-6**  | The suggested key is **already bound by the OS or another application**               | Chrome never sees the key. Nothing in the app may depend on the command ever firing (AC-7).                                                                                                    |
| **E-7**  | The user **cleared** the shortcut at `chrome://extensions/shortcuts`                   | Identical to E-6 from the app's side. Every existing entry point still works.                                                                                                                  |
| **E-8**  | Surface opens with **zero tabs to show**                                              | `TabsView` renders "No other tabs are open." Focus still lands somewhere real and named — never on a detached or removed node.                                                                  |
| **E-9**  | Focus-on-open in the **float**, whose app runs in an iframe                           | Focus must cross into the iframe's document. Not assumed to work: `float.ts:330-334` appends the frame after dressing the window, so the app may not be mounted when the float is first painted. **Still unmeasured** — §16's outstanding table; AC-38 is not satisfied until it is recorded. |
| **E-10** | Select-all with a filter active and **zero matches**                                  | Selection unchanged, one announcement of the unchanged state or none — never "0 tabs selected" alternating with a stale count.                                                                  |
| **E-11** | A range spanning a **collapsed group**                                                | AC-19: the collapsed group's tabs are **not** selected. A collapsed group's tabs are not rendered (SPEC-04 E-1), and G-8 says selection covers only what the user can see.                       |
| **E-12** | The **range anchor row is closed** from another window mid-range                      | `SelectionContext` already deselects removed tabs (`SelectionContext.tsx:76-81`). The anchor must degrade to "no anchor" rather than leaving a range hanging off a dead id.                     |
| **E-13** | Select-all over **80+ tabs**                                                          | Every selection change broadcasts the whole array over `chrome.runtime.sendMessage` (`SelectionContext.tsx:22-24`). One broadcast per user action, not one per row.                             |
| **E-14** | Extension **not enabled in incognito** (the default)                                  | The command does not fire in incognito windows, and the manager shows no incognito tabs. Stated so it is not later filed as a bug.                                                              |
| **E-15** | Two surfaces open at once (side panel in window A, anchor tab in window B)            | Selection and search already exist once per document (C-6). A keyboard selection in one must not leave the other showing a stale `SelectionToolbar` count.                                      |
| **E-16** | The user presses the select-all key while focus is on the `SelectionToolbar`          | Nothing. AC-23 scopes list select-all to "while focus is in the list"; everywhere else `Ctrl`/`Cmd`+`A` keeps its native meaning. The toolbar is not the list.                                   |

---

## 7. Assumptions and dependencies

- **A-1** Chrome's `chrome.commands` API is available to an MV3 extension and can invoke a service
  worker listener, at **no permission and no install-warning cost** (C-9, verified by AC-5). Web
  Store **re-review** triggers are addressed by no primary source; treated as unknown, not as "no".
- **A-2** `chrome://extensions/shortcuts` is the user's route to rebind or clear the key, and is
  discoverable enough that this spec need not build a second one (NG-5) — provided the app can say
  when the key is unbound (AC-35).
- **A-3** A suggested key that Chrome cannot honour leaves the command **declared but unbound**, and
  reports `shortcut: ""` from `getAll()` (C-10), rather than failing the manifest or the install.
  Verified by AC-7's manual pass.
- **A-4** A command event **does** carry the user activation `chrome.sidePanel.open()` requires
  (C-8) — **provided nothing spends it first**: no `await`, no `.then()`, no `sendMessage`, no other
  `chrome.*` call before the open (AC-36). The `windowId` that call needs must therefore be obtained
  without an await, and **C-13 satisfies that by leaving nothing to await** — `onCommand` passes the
  active tab to the listener, so `tab.windowId` and `tab.url` are both already in hand. A purely
  synchronous guard over them is permitted and is what AC-39 relies on. AC-8's anchor-tab fallback
  remains the path when the open rejects anyway; it is reachable after a spent activation because
  `chrome.tabs.create` needs none.
- **A-5** The float is reachable only from the anchor tab, synchronously, inside a real in-document
  gesture (C-4, C-11). **No command can open it** — architectural, per NG-9.
- **D-1** Depends on **SPEC-01** — the three surfaces, AC-23 (no storage), AC-24 (five-file
  permission mirror), NG-3 (no host permissions / content scripts). **Supersedes SPEC-01 NG-10.**
- **D-2** Depends on **SPEC-03** AC-6 — the permission array is exactly five.
- **D-3** Depends on **SPEC-04** (approved 2026-09-29, **not yet implemented**) for the keyboard
  walk this spec must not disturb: AC-34/AC-35 (the walk), AC-36 (re-entry lands on the first
  control), AC-37 (the `dragActive` hand-off), AC-9 (the 20-stop budget), AC-18 (pointer selection
  semantics), AC-16/AC-17 (how selected state is conveyed and perceived).
  **This spec is independent of** SPEC-04 AC-1/AC-2 (`nested-interactive`), AC-3/AC-4 (list and
  listitem semantics), AC-11–AC-15 (reordering) and AC-28 (the row-as-`toolbar` decision) — none of
  those changes what this spec adds, and this spec adds nothing that changes them.
  **Ordering — promoted to §1.9 and binding:** group A (items 1 and 2) depends on **none** of
  SPEC-04 and ships now; group B (item 3) waits for SPEC-04 to be implemented, and its criteria are
  written against SPEC-04's post-rework structure rather than today's.
- **D-4** `src/test/manifest.test.ts` is the executable form of the permission and storage
  constraints and is expected to pass **unmodified** except for the `commands` assertion AC-1 adds.

### 7.1 Accepted risks

Decisions to **live with** a known cost, recorded so nobody re-litigates them — or quietly "fixes"
one and weakens the criterion it came from.

- **R-1 — a repeat press whose open rejects changes the user's surface.** AC-8's fallback is
  "if `sidePanel.open()` rejects, open or focus the anchor tab". Combined with AC-3, that means a
  **second** press in a state where the panel is already open, if the open rejects for any reason,
  lands the user in an anchor tab they did not ask for — a double-press becomes a change of surface.
  **Accepted, 2026-09-29, rather than weakening AC-8**, on two grounds: `openAnchorTab` is
  find-or-create and never opens a second one (C-5, AC-9), so the blast radius is one tab that the
  user can close or hand back from ("Back to panel"); and the alternative — making the fallback
  conditional on some notion of "was it already open" — is unbuildable, because C-12 says there is
  no API to ask. **Observation point:** the manual sweep presses the key three times from each of
  §5.1's states specifically so this is watched for rather than discovered in the field (AC-3's
  manual verification, E-5).

---

## 8. Non-functional requirements

- **NFR-1 Discoverability.** AC-4, AC-32, AC-35; AC-33 deferred to PI-8. A shortcut nobody knows
  exists is worth nothing, and §1.4 shows this project's existing keyboard model already has exactly
  that problem — fully documented in the README, invisible in the product. **The part that is not
  deferred is AC-35**: a shortcut that silently failed to bind (C-10) is worse than no shortcut,
  because the product is then advertising a key that does nothing. Discovery may not be carried by
  anything that needs to remember a dismissal (SPEC-01 NG-12, NG-4) — which AC-35 does not, being
  derived from live state.
- **NFR-2 Non-interference.** A keyboard shortcut is a **global surface**. The user may already have
  the key bound — in Chrome, in another extension, in their OS, or in an application that takes it
  before Chrome does. AC-7 and E-6/E-7 require the extension to be entirely functional when the key
  never arrives, and NG-2 keeps it off Chrome's own bindings. The suggested key is a **suggestion**;
  the rebinding route (AC-4) is the real contract.
- **NFR-3 Privacy posture.** AC-6, AC-27, NG-3, NG-4. Five permissions, no storage, no host
  permissions, no content scripts. The zero-host-permission, stores-nothing promise appears verbatim
  in `PRIVACY.md` and `store-listing.md`; AC-5 is the guard if the platform forces a change.
- **NFR-4 Accessibility.** AC-11, AC-13, AC-14, AC-24, AC-28, AC-29, AC-30, AC-38. This spec is
  *about* accessibility, so the bar is that it does not buy keyboard reach at the cost of
  screen-reader coherence: one initial focus, announced changes, an unchanged tab-stop budget, and
  the same model in a ~400 px always-on-top window as in the panel. **The round trip is complete
  without us**: the shortcut gets the user in and the caret into the field (C-14), and `F6` moves
  focus out and back in both directions (C-15) — which is why the exit is not a close (NG-13).
  Taking focus is bounded by AC-38 precisely so that "reachable by keyboard" never becomes "steals
  the keyboard".
- **NFR-5 Security.** AC-10, AC-25, AC-34, NG-8. Three distinct surfaces: (a) a global key is an
  **un-gestured, un-aimed entry point** and must therefore be able to do nothing destructive;
  (b) tab titles and URLs remain untrusted page-supplied strings and must never reach an
  announcement as anything but absent; (c) the command name arriving from the platform is input
  (§11).
- **NFR-6 Responsiveness.** A shortcut exists to be faster than a click. The command opens the side
  panel (AC-2), which is the same surface and the same load the toolbar icon already produces — so
  the budget is simply **no slower than the icon**, measured in the same pass as AC-38. The float is
  not in this path at all (NG-9), so its iframe cost (C-7) does not apply.
- **NFR-7 Observability.** SPEC-01 NFR-6 applies: failure paths must be visible to the **user**, not
  only in the console. **This gets harder here** — a command handler in the service worker has no
  snackbar channel, because `enqueueSnackbar` needs a rendered React tree. AC-8's "land somewhere
  that works" is the answer to that, not a toast.
- **NFR-8 Internationalisation.** The command's `description` (AC-4) is user-visible in Chrome's own
  UI. The extension ships English-only today; this adds one more English string in a place the
  browser renders, which is consistent and worth noting rather than fixing here.
- **NFR-9 Tenancy / multi-profile.** Not applicable beyond E-14: single user, per profile, no
  accounts, no server. Shortcuts are per-profile and Chrome owns that.

---

## 9. Cross-module impact

| File / area                                                                     | Impact                                                                                                                                                                                                                                                                                             |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `manifest.json`                                                                 | Gains a `commands` key — the **only** structural manifest change this spec permits. `permissions` unchanged (AC-6); `action` and `side_panel` unchanged.                                                                                                                                            |
| `src/worker/index.ts`                                                           | Four lines today, one call to `setPanelBehavior`. The command listener lives here, with `sidePanel.open()` as its **first synchronous statement** (AC-36). It is the **only** always-alive context, and it has no React tree — so it has no way to show a snackbar (NFR-7). `setPanelBehavior({openPanelOnActionClick:true})` stays: the icon path and the command path are deliberately distinct (DEC-4). |
| `src/lib/anchor.ts`                                                             | `openAnchorTab` is the find-or-create entry the command most plausibly reuses (AC-9). `backToSidePanel`'s "Couldn't open the side panel" path (line 103) is the precedent for AC-8's fallback, and its comment at lines 88-94 is the gesture constraint C-1 in the codebase's own words.            |
| `src/lib/float.ts`                                                              | `canFloat()` restricts the float to the anchor tab; `openFloat` must stay a direct, synchronous click handler. **No command path may call it** (NG-9, AC-2). `takeFloatSearch`/`reportFloatSearch` constrain AC-15.                                                                                 |
| `src/lib/surfaces.ts`                                                           | `bringPanelAlong` already gates `sidePanel.open()` on `getHost() === "panel"`; a command firing from the worker has **no host**, so it cannot reuse that helper unchanged. `resolveUserWindow()` is what a command would need to answer "which window's panel", and it can return `undefined` (E-3). |
| `src/lib/host.ts`                                                               | `getHost()` reads `window.location.search` — it does not exist in the worker. Any "which surface is open" question asked from the command handler needs a different answer than the one every in-page caller uses.                                                                                  |
| `src/App.tsx`                                                                   | Owns `search`, the `Search`/`StyledInputBase` field, the float↔anchor hand-off and the polite live region. Items 2 and 3 both land here: AC-12, AC-15, AC-16, AC-24. **The field's `data-search-field` marker (`App.tsx:277`) is how `useRowKeys` finds it for AC-40** — a cross-module coupling, and the thing that silently breaks `↑` if it is removed. |
| `src/lib/Tabs/Tab/TabDisplay.tsx`                                               | `autoFocus={tab.active && focus}` (line 99) is the **competing initial-focus claim** (§1.8, AC-11), and its `focus = true` default (line 34) is what carries the leak below into search results. Its select control (lines 124-144) is the per-row checkbox item 3 must keep (AC-22).                |
| `src/lib/Tabs/TabsGroup/GroupListItem.tsx`, `src/lib/Tabs/Tab/TabListItem.tsx`  | **The live half of §1.8.** `GroupListItem.tsx:271` renders `<TabListItem group={group} tab={tab} key={tab.id} />` with no `focus` prop, and the file never mentions `focus` at all — so it cannot forward what it never receives. `TabListItem` spreads the rest into `TabDisplay`, which defaults it to `true`. `SearchView`'s `focus={false}` therefore never reaches a grouped tab. AC-11's two in-group fixtures exist for this. |
| `src/lib/Tabs/elements/rowControls.ts`                                          | `rowControlProps` (`tabIndex: -1`), `useRowKeys`' `←`/`→` walk, `isPlainArrow`, the `↑` exit and the `dragActive` flag. AC-26, AC-29, AC-30 pin the walk; AC-40, AC-41, AC-42 pin the rest. **A new key may be added to this handler, but not to the walk** — `↑` is bound here so all three row kinds cannot diverge, and it is an exit from the list rather than a stop within it. Its propagation behaviour differs from `←`/`→` on purpose (C-16). |
| `src/lib/Tabs/selection/SelectionContext.tsx`                                   | The reducer's action union is the contract keyboard selection must dispatch into (AC-20). Its `chrome.runtime` broadcast is the cross-surface path (E-13, E-15), and its unvalidated `handleMessage` is named in §11.                                                                               |
| `src/lib/Tabs/selection/SelectionToolbar.tsx`                                   | Appears only when `selected.length` is non-zero and is the payoff for item 3. Must act identically on a keyboard-built selection (AC-20).                                                                                                                                                           |
| `src/lib/Tabs/Window/WindowListItem.tsx`, `src/lib/Tabs/TabsGroup/GroupListItem.tsx` | Already carry keyboard-reachable "Select every tab in this window / group _X_" controls (§1.5). AC-22 keeps them unchanged; they remain the **explicit, named-target** route into a collapsed group that AC-19's range deliberately will not take.                                             |
| `src/views/SearchView/index.tsx`                                                | Defines what "matching" means — a case-insensitive substring of title **or** URL (lines 12-19) — and AC-18 makes that set exactly what select-all takes. Renders with `focus={false}`, which is why §1.8's collision only bites in `TabsView`.                                                      |
| `src/test/manifest.test.ts`                                                     | Must pass unmodified except for AC-1's new assertion. Its five-file mirror is AC-5; its source scan is AC-27.                                                                                                                                                                                       |
| `README.md`, `store-listing.md`                                                 | AC-32. Both already describe the row walk; both would be wrong-by-omission once a shortcut ships. `PRIVACY.md` and `store-assets/privacy-policy.html` stay unchanged unless AC-5 fires.                                                                                                             |
| `harness/`                                                                      | The layout harness renders the app against `fakeChrome.ts`. A command cannot be exercised there, but focus-on-open and the selection keys can.                                                                                                                                                      |

---

## 10. Inputs

- User feature request, 2026-09-29: three items — a shortcut that opens the UI, focus into search on
  open, and keyboard range-selection / select-all — with the §1.1/§1.2 argument that Chrome already
  owns find-and-switch and does not own bulk-across-windows.
- Working-tree verification, 2026-09-29, of every claim in §1.3–§1.5 against `manifest.json`,
  `src/worker/index.ts`, `src/lib/anchor.ts`, `src/lib/float.ts`, `src/lib/surfaces.ts`,
  `src/lib/host.ts`, `src/App.tsx`, `src/lib/Tabs/elements/rowControls.ts`,
  `src/lib/Tabs/Tab/TabDisplay.tsx`, `src/lib/Tabs/selection/`,
  `src/lib/Tabs/Window/WindowListItem.tsx`, `src/lib/Tabs/TabsGroup/GroupListItem.tsx`,
  `src/views/SearchView/index.tsx`, `src/lib/ControlBar/index.tsx`, `src/test/manifest.test.ts`.
  Two of the brief's claims were corrected by that pass: the row walk **is** documented, in
  `README.md` and `store-listing.md` but nowhere in the product (§1.4); and per-window and per-group
  select-all **already are** keyboard-reachable, so the missing pieces are ranges and whole-list
  select-all specifically (§1.5).
- **Second working-tree verification, 2026-09-29**, during planning of group A — source of C-13 and
  of §1.8's live-defect finding:
  - `node_modules/@types/chrome/index.d.ts:1264` —
    `CommandEvent extends chrome.events.Event<(command: string, tab: chrome.tabs.Tab) => void>`,
    with `onCommand` declared at `:1278`. The active tab arrives with the event.
  - `src/lib/Tabs/TabsGroup/GroupListItem.tsx:271` renders `TabListItem` with **no `focus` prop**,
    and the file never mentions `focus`; `src/lib/Tabs/Tab/TabListItem.tsx:19` spreads the rest into
    `TabDisplay`, whose signature defaults `focus = true` (`TabDisplay.tsx:34`). `SearchView:60`'s
    `focus={false}` therefore never reaches a grouped tab.
- SPEC-01 (surfaces, the gesture constraints C-1…C-8, AC-23, AC-24, NG-3, **NG-10 and its
  disposition PI-5**), SPEC-03 (the fifth permission and the five-file mirror made executable),
  SPEC-04 (the keyboard walk, the tab-stop budget, selection semantics) — approved 2026-09-29.
- `specs/INDEX.md` — id scheme, module definitions, status values.
- Chrome's published keyboard shortcuts for tab search and tab navigation (§1.1), as the baseline
  this spec deliberately does not compete with.
- **Research pass, 2026-09-29** — the source of C-8 to C-11 and of §1.7a. Cited rather than
  re-derived:
  - `chrome.sidePanel` reference, for the qualifying-gesture list that includes a keyboard shortcut
    — https://developer.chrome.com/docs/extensions/reference/api/sidePanel — with the
    first-synchronous-statement requirement evidenced by
    https://issues.chromium.org/issues/355266358 and
    https://github.com/GoogleChrome/chrome-extensions-samples/issues/1001.
  - Chrome's permissions list — https://developer.chrome.com/docs/extensions/reference/permissions-list
    — and permission-warning guidance —
    https://developer.chrome.com/docs/extensions/develop/concepts/permission-warnings — neither of
    which mentions `commands`. **No primary source addresses Web Store re-review triggers.**
  - `chrome.commands` reference, for the four-shortcut limit, the `Ctrl`-or-`Alt` requirement, the
    `Ctrl+Alt` prohibition, the `Ctrl+Shift+[0..9]` global range, the silent-failure behaviour and
    `getAll()`'s empty `shortcut` — https://developer.chrome.com/docs/extensions/reference/api/commands.
  - MDN `DocumentPictureInPicture.requestWindow()`, for the top-level-`Window` and
    transient-activation requirements that make the float unreachable from a worker —
    https://developer.mozilla.org/en-US/docs/Web/API/DocumentPictureInPicture/requestWindow.
  - Side-panel focus behaviour: **unverified.** Official docs are silent; a chromium-extensions
    thread reports no focus on open by icon or shortcut, with no Google reply —
    https://groups.google.com/a/chromium.org/g/chromium-extensions/c/nb058-YrrWc. A third-party
    claim of a fix in Chrome 148/149 could not be verified against the tracker and is recorded as
    **low-confidence**. This is why AC-38 was a measurement gate rather than an assumption —
    **and the gate has since been run: superseded by C-14, measured on Chrome 154.0.8037.92,
    2026-09-30 (§16).** The thread's report was right about the panel not receiving focus, and
    silent on the part that mattered: a mount-time `window.focus()` is honoured.
  - `_execute_side_panel`: **fabricated.** Present in AI search summaries, absent from both the
    commands reference and the side-panel guide. Recorded so it is not proposed again (AC-1).

---

## 11. Untrusted inputs

- **Tab titles and URLs**, supplied by arbitrary web pages. Unchanged from SPEC-01 AC-26 and SPEC-04
  AC-24: text only, never markup, never a navigation target. This spec adds one new place they
  could leak into — a selection announcement — and AC-25 forbids it by keeping announcements to
  counts and fixed strings.
- **The command name delivered by the platform.** A string arriving at the worker from outside our
  code. AC-34 requires it be compared against a known literal, not used to index a handler map or
  build a call.
- **The selection broadcast on `chrome.runtime` messaging.** `SelectionContext.tsx:82-92` accepts
  any message shaped `{ type: "selection", payload }` and sets `payload` as the selection with **no
  validation** — it is typed `number[]` at the call site and never checked at runtime. Today the
  channel is reachable only by this extension's own contexts: there is no `externally_connectable`,
  no `content_scripts` (NG-3) and no host permissions, so no web page can post to it. This spec does
  not change that, and does not fix the gap — it **names** it, because item 3 raises the stakes: the
  selection now drives a bulk close built from a single key press, and a malformed payload that
  once produced a wrong checkbox would now produce a wrong set of closed tabs. Recorded as PI-4.
- **The `host` query parameter** on the app document: an allow-list of three values with a panel
  fallback (`host.ts:16-19`). Unchanged.
- **Nothing else.** No network input, no user-authored content, no third-party messages.

---

## 12. Proposed improvements

Surfaced by the completeness pass; dispositions recorded so nobody re-derives them.

- **PI-1** _(Recommended, in scope)_ Reuse `App.tsx`'s existing debounced polite live region for
  selection counts rather than adding a second one. Two live regions in one document queue against
  each other, and this one already carries the pattern and the 600 ms reasoning. Folded into AC-24.
- **PI-2** _(Recommended, in scope)_ Decide AC-11 by making initial focus a single explicit
  decision in `App`, rather than leaving `TabDisplay`'s `autoFocus` and a new field-focus to race.
  §1.8 is the finding; AC-11 is the requirement; the mechanism is the planner's.
- **PI-3** _(Deferred)_ A "Shift+Tab out of the list goes to the search field" affordance, so the
  round trip between filtering and selecting is symmetric. Attractive, but it is a fourth key
  meaning on top of three already being decided here. Revisit after this ships.
- **PI-4** _(Deferred, named in §11)_ Runtime-validate the `selection` message payload in
  `SelectionContext`. Not reachable by any page today, so not a vulnerability — but item 3 makes a
  malformed payload more expensive. A separate, small spec.
- **PI-5** _(Deferred)_ Announce the **selection** in the `SelectionToolbar`'s own accessible name
  ("4 tabs selected") as well as in the live region, so a user who arrives at the toolbar late is
  told what it acts on. Overlaps SPEC-04 NG-11 / its PI-7; should be decided once, there or here,
  not twice.
- **PI-6** _(Deferred)_ A second command that opens the app **already filtered** to audible tabs —
  "show me what is making noise" is the one query with no search text. Genuinely useful, genuinely
  out of scope, and C-10 caps the extension at four suggested shortcuts, so a second one should be
  spent deliberately rather than opportunistically.
- **PI-7** _(Rejected)_ A command that closes the current selection without opening the UI. Rejected
  by NG-8: a global key that destroys tabs is not a feature, it is a hazard.
- **PI-8** _(Deferred — this is where NC-13 landed)_ Surface the **row-walk keyboard model** inside
  the app, so `←`/`→` stops being documented only in `README.md` and `store-listing.md` (§1.4).
  Deferred, not closed, and the door is explicitly left open: SPEC-01 **NG-12** forbids a
  *dismissible* coach mark because remembering the dismissal needs storage (SPEC-01 AC-23, NG-4) —
  it does **not** forbid a permanent affordance. Acceptable shapes, so a future spec does not start
  from zero: a static line of help text in the control bar or an `aria-describedby` on the list; a
  `title`/tooltip on the first row; or `aria-keyshortcuts` on the controls themselves, which is
  assistive-technology-visible, costs no layout and stores nothing. Unacceptable: anything that has
  to remember having been seen. **AC-35 is not part of this deferral** — telling the user their
  shortcut is unbound is required now, and is derived from live state rather than remembered.

---

## 13. Resolved decisions

All thirteen clarifications are closed. Recorded with their reasoning so nobody re-derives them, and
— where a decision was forced by a platform fact rather than chosen — with the fact that forced it.

| id (was)                                      | Decision                                                                                                                                                                                                                                                                                                                                     | Why, and what it forced                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **DEC-1, DEC-2** (was NC-1, NC-2)             | **One custom command that opens the side panel, or focuses the UI where it already is. No toggle.** Per-state behaviour in §5.1's table.                                                                                                                                                                                                      | The side panel is the default, fully-featured home (SPEC-01 G-4), and C-8 makes it reachable from a command. No toggle: there is no `chrome.sidePanel.close()` (C-2), and a key that destroys a surface is worse than one that focuses it. Across windows the user is **not** teleported — side panels are per-window and SPEC-01 **G-2** already accepts one copy per window, so `openAnchorTab`'s focus-and-raise (`anchor.ts:51-59`) is deliberately not reused. **Amended 2026-09-29 (§15 A-1):** "focuses the UI where it already is" is specced as **leaves it intact**, because C-12 says Chrome offers no way to ask whether the panel is open or to move focus into it — a focus clause would be neither satisfiable nor verifiable. → AC-2, AC-3, AC-39 |
| **DEC-3** (was NC-3)                          | **`Ctrl+Shift+K` / `Command+Shift+K`**, with the whole rejected field and its reasons recorded in §1.7a.                                                                                                                                                                                                                                      | C-10 leaves a narrow field: a required `Ctrl`/`Alt`, no `Ctrl+Alt`, Chrome's own chords unavailable, and `Ctrl+Shift+[0..9]` left for the `global`-scope commands that actually need it. The suggestion is not a guarantee — a chord another extension holds fails **silently** — so both failure modes are specced rather than assumed away. → AC-37, AC-7, AC-35                                                                                                     |
| **DEC-4** (was NC-4)                          | **A custom command name, not the reserved `_execute_action`.**                                                                                                                                                                                                                                                                               | `_execute_action` dispatches no `onCommand` event, which removes exactly the branch DEC-1 and DEC-2 need. `openPanelOnActionClick: true` already covers the icon click, so the two paths stay distinct and neither has to serve both. **Recorded because `_execute_action` looks simpler and someone will propose it again** — and because `_execute_side_panel`, which looks like the obvious answer, does not exist (§10). → AC-1                                     |
| **DEC-5** (was NC-5)                          | **Focus the search field — specced behind a measurement gate**, and keyed to "the document first receives focus" rather than to mount. The initial-focus race is resolved in §1.8: the field wins, `TabDisplay`'s `autoFocus` is **withdrawn rather than outrun**, and the active tab's row stays the entry point into the list, one `↓` away. | _As written 2026-09-29:_ side-panel focus-on-open was unverified and looked unreliable (§10), so the fallback was stated in advance rather than discovered in the field — record the shortfall as a platform limitation, and do not fake focus. A criterion written against mount alone would be untestably true in jsdom and false in Chrome, which is why AC-12 is keyed to the document receiving focus. **Amended 2026-09-29 (§15 A-4):** the collision is not only a forward risk — `GroupListItem.tsx:271` passes no `focus` prop, so grouped tabs already autofocus in search results today. That is the case for **deleting** the prop rather than threading it, and AC-11 gained two in-group fixtures. **Amended 2026-09-30 (§15 A-5):** the gate has been run. The panel does not get document focus on open, but a mount-time `window.focus()` **is** honoured (C-14), so AC-38 now forbids taking focus **the user did not ask for** instead of forbidding the ask. `F6` is the round trip (C-15), which is why Escape-to-close was dropped (NG-13). **Amended 2026-09-30 (§15 A-6):** AC-14's `↓` entry shipped without a way back — `Shift+Tab` lands on whatever precedes the row in the DOM, not the field. `↑` is the mirror (AC-40). → AC-11, AC-12, AC-14, AC-38, AC-40 |
| **DEC-6…DEC-9** (was NC-6, NC-7, NC-8, NC-10) | **`Shift`+`↑`/`↓` extends a range; no plain arrow moves focus from one row to another** _(restated 2026-09-30 — was "plain arrows stay unbound"; same rule, see Why)_. **`Ctrl`/`Cmd`+`A` selects all while focus is in the list, and the search field keeps it as select-all-text. "All" means the filtered result, not the whole browser. A range covers only the rows the user can see — a collapsed group it spans over is not included.** | One principle does all four jobs: **G-8, selection covers only what the user can see.** Selecting eighty invisible tabs from a three-row filtered list is how someone closes what they meant to keep, and the same reasoning excludes a collapsed group a range sweeps over. AC-19 states the collapsed case **explicitly, because the opposite is a defensible reading** and someone will assume it. `Shift`+arrow both moves and extends, so none of this touches SPEC-04's walk (NG-6). **Amended 2026-09-30 (§15 A-6):** "plain arrows stay unbound" is restated as the invariant it always meant — **no plain arrow moves focus from one row to another.** `←`/`→` move within a row, `↑` leaves the list (AC-40), `↓` in the field enters it (AC-14); none is row-to-row, so `Shift`+`↑`/`↓` is still unclaimed and this decision stands untouched. AC-41 is what keeps the modified and unmodified arrows apart. → AC-17, AC-18, AC-19, AC-23, AC-41 |
| **DEC-10** (was NC-9)                         | **Reuse `App.tsx`'s existing debounced polite region; announce the running total, at the existing debounce.**                                                                                                                                                                                                                                 | A delta — "6 added" — is meaningless to someone who has lost count, which is exactly the user the announcement exists for. A second live region would queue against the first; a second debounce would be a second timing to keep in step with the first. → AC-24                                                                                                                                                                                                     |
| **DEC-11** (was NC-11)                        | **The `commands` key is not a permission and adds no install warning. SPEC-01 AC-24 does not fire.**                                                                                                                                                                                                                                          | C-9, from Chrome's permissions list and permission-warning guidance. The five-file mirror stays untouched. AC-5 is **retained** as the guard that confirms this on a real install rather than trusting it, because no test that reads `manifest.json` can see an install warning. Web Store **re-review** triggers are addressed by no primary source — unknown, not "no". → AC-5, AC-6, NG-3                                                                            |
| **DEC-12** (was NC-12)                        | **A command event does carry the activation `chrome.sidePanel.open()` requires — provided the call is the first synchronous statement in the listener.**                                                                                                                                                                                      | C-8. The proviso is the whole decision: it is invisible in code review, fatal at runtime, and has already killed this exact design twice in public (issues.chromium.org/issues/355266358, chrome-extensions-samples#1001). **Amended 2026-09-29 (§15 A-2):** the proviso is specced as **"nothing spends the activation first"** — no `await`, no `.then()`, no `sendMessage`, no other `chrome.*` call — not as the literal "first statement", which would have made AC-36 and AC-39 mutually exclusive. C-13 is what makes the operative reading safe: the event hands the listener the active tab, so there is nothing to await. → AC-36, AC-39, AC-8, A-4, C-13                       |
| **DEC-13** (was NC-13)                        | **Deferred to PI-8**, with the door explicitly left open.                                                                                                                                                                                                                                                                                    | SPEC-01 NG-12 forbids a _dismissible_ hint, because remembering the dismissal needs storage (SPEC-01 AC-23) — it does **not** forbid a permanent affordance. PI-8 records which shapes would be acceptable so a future spec does not start from zero. The part that is **not** deferred is AC-35: telling the user the shortcut is unbound is required now, and is derived from live state rather than remembered. → AC-33 (Could), AC-35, PI-8                          |

### 13.1 What is still unmeasured, and deliberately so

These survive as **criteria**, not as open questions. Neither blocks approval; both block "done",
and both exist because a number derived from source is not the same thing as a number observed in a
browser.

1. ~~_Focus on open_ (AC-38)~~ — **measured 2026-09-30 on Chrome 154.0.8037.92; see C-14 and §16.**
   The answer to the gate's question was "no, the panel does not get document focus" — and then
   "but `window.focus()` on mount is honoured", which is the finding that reversed the earlier
   conclusion that nothing could be done. The **side panel** is measured; the **anchor tab** and the
   **float** rows of AC-38's sweep are still outstanding, and item 2 is not done until they are
   recorded in §16.
2. _The cost of a selection_ (AC-31) — the twenty-seven key presses in §1.5 are derived from
   `useRowKeys`' stop list and DOM order, **not observed**. Measured before that figure is quoted
   anywhere user-facing. Group B, so not yet due.

---

## 14. Traceability

Group per §1.9: **A** ships now, **B** waits for SPEC-04 to be implemented.

| Item                                     | Criteria                                                     | Group |
| ---------------------------------------- | ------------------------------------------------------------ | ----- |
| **1. Keyboard shortcut opens the UI**    | AC-1 … AC-10, AC-35, AC-36, AC-37, AC-39                     | **A** |
| **2. Focus lands in search**             | AC-11 … AC-16, AC-38; **AC-40, AC-41, AC-42** (the exit and the modifier rule) | **A** |
| **3. Range select and select-all**       | AC-17 … AC-27                                                | **B** |
| Cross-surface / no regression            | AC-28 (both groups), AC-29, AC-30, AC-31                     | A + B |
| Documentation & discoverability          | AC-32 (A), AC-35 (A), AC-33 (B, Could — deferred to PI-8)    | A + B |
| Security of a global entry point         | AC-10, AC-25, AC-34                                          | A + B |
| Inherited and re-asserted                | AC-6, AC-21, AC-22, AC-26, AC-27, AC-29, AC-30               | A + B |
| Platform constraints made executable     | AC-5 (C-9), AC-36 (C-8, C-13), AC-37 (C-10), AC-3 (C-2, C-12, C-14), AC-12 + AC-38 (C-14), AC-42 (C-16); NG-9 (C-11), NG-13 (C-15) | **A** |
| The keyboard model, end to end           | `↓` in enters (AC-14) · `←`/`→` within a row (AC-29, SPEC-04 AC-34) · `↑` exits (AC-40) · modifiers ignored (AC-41) · `Shift`+`↑`/`↓` extends (AC-17, group B) · `F6` page↔panel (C-15) | A + B |
| Measured, not derived                    | AC-38 — side panel **done** 2026-09-30 (§16), anchor tab and float outstanding; AC-31 outstanding (group B). See §13.1. | A + B |
| Accepted risks                           | R-1 (§7.1), against AC-8 and AC-3; observed by the manual sweep | **A** |

---

## 15. Amendment log

Changes after approval, all from planning and building group A. User-decided; the spec was already
`approved`, so each is recorded here rather than folded in silently.

**2026-09-29** — A-1 to A-4. **2026-09-30** — A-5.

| #       | Change                                                                                                                                                                                                                                                                                                                                | Why                                                                                                                                                                                                                                                                                       |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A-1** | **AC-3: "focus that surface" → "leave it intact".** New constraint **C-12**.                                                                                                                                                                                                                                                          | Chrome exposes no API to ask whether the panel is open and none to move focus into one, so the focus clause could be neither satisfied nor verified. "Intact" is testable. The premise that `open()` on an open panel leaves it open is expected, not documented — so the sweep observes it. |
| **A-2** | **AC-36: literal → operative reading.** No `await`, no `.then()`, no `sendMessage`, no other `chrome.*` call before `sidePanel.open()`; a synchronous guard over the event's `tab` is permitted. `Verify:` now asserts `mock.invocationCallOrder`, with a static source check as backstop. New constraint **C-13**. **AC-39 unchanged.** | As written, AC-36 and AC-39 were mutually exclusive: AC-39's guard *is* a statement. The operative reading names what actually protects the activation. C-13 makes it safe — `onCommand` hands the listener the active tab, so there is nothing to await.                                   |
| **A-3** | **AC-8 unchanged; risk recorded as R-1** in the new §7.1.                                                                                                                                                                                                                                                                             | The fallback means a repeat press whose open rejects opens an anchor tab the user did not ask for. Accepted rather than weakening AC-8: `openAnchorTab` is find-or-create so the blast radius is one tab, and C-12 makes the conditional alternative unbuildable.                           |
| **A-4** | **§1.8 records a live defect**, not only a forward risk; AC-11 gained two in-group fixtures; §9 gained a `GroupListItem` / `TabListItem` row.                                                                                                                                                                                          | `GroupListItem.tsx:271` passes no `focus` prop and never mentions `focus`, so `TabDisplay`'s `focus = true` default already autofocuses grouped tabs — including in search results. Strengthens the case for deleting the prop rather than threading it.                                    |

| **A-5** _(2026-09-30)_ | **AC-38: "SHALL NOT force or fake focus" → "SHALL NOT take focus the user did not ask for"**, bounded by four conditions (on mount, once, only when the document lacks focus, only because a keypress asked for that surface). New constraints **C-14** (the measurement) and **C-15** (`F6`). New **NG-13** (Escape-to-close dropped). AC-3's assumption replaced by C-14 item 3. AC-12's rationale corrected. §13.1 item 1 closed for the side panel; §16 added. | **AC-38 as written forbade what the implementation now deliberately does**, and a spec that bans what the code does is worse than either position. The measurement is what earned the change: the panel does not get document focus from the open (so the gate's answer was "no"), but a mount-time `window.focus()` **is** honoured (so the earlier "nothing can be done" was wrong), and a second press cannot take focus back at all (so the loophole is unreachable). What stays forbidden is what the criterion was always about: a panel pulling focus off a page someone is reading. |

| **A-6** _(2026-09-30)_ | **Three criteria added for the list's exit: AC-40** (plain `↑` returns to the search field, from any row and from a control inside one), **AC-41** (the handler ignores `Shift`/`Ctrl`/`Alt`/`Meta` arrows — `↑`, `←` and `→` alike), **AC-42** (no action during a drag, and the `↑` branch must not `stopPropagation()`). New constraint **C-16** (dnd-kit's sensor listens on the owner document). New §5.6. The "plain arrows stay unbound" wording restated as **"no plain arrow moves focus from one row to another"** in §5.3, NG-6, AC-14 and DEC-6…DEC-9. | **A code review flagged the spec as contradicting the code**, and the behaviour is wanted, so the spec was wrong. AC-14's `↓` entry shipped with no way back: `Shift+Tab` lands on whatever precedes the row in the DOM, not the field — found in real use within a minute. The restated invariant is what the model always meant; `↑` is an exit from the list, not a step within it, so `Shift`+`↑` stays free for group B. **Two sub-decisions recorded because they are behaviour changes, not details:** `←`/`→` no longer accept modifiers (so `Ctrl`+`→` no longer walks a row), and `↑` deliberately does not stop propagation so that a stale `dragActive` flag degrades to "focus also moved" instead of "the drag stopped responding". |

**Status is unchanged at `approved`.** None of these opens a question: A-1 and A-2 make two criteria
verifiable that were not, A-3 records a decision without changing a criterion, A-4 adds a verified
fact and test coverage for it, A-5 replaces an assumption with a measurement and corrects a
criterion that the measurement had made wrong, and A-6 records shipped behaviour the spec had
accidentally forbidden — none of it reversing a decision.

---

## 16. Measurement log

Facts with a date and a build behind them. Added because AC-38 and AC-31 are the two places this
spec refuses to let a derived number stand in for an observed one.

**Chrome 154.0.8037.92 · 2026-09-30 · side panel, opened by the keyboard command**

| #   | Observation                                                                                                                                                                                                            | Consequence                                                        |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| 1   | A side panel opened by the command **does not receive document focus.** Typing after the shortcut goes to the page behind it.                                                                                            | AC-38's gate answered: "no". C-14 item 1.                          |
| 2   | `window.focus()` **called on mount, from the panel document itself, is honoured.** With it, the first keystroke after the shortcut lands in the search field.                                                            | Reverses "nothing can be done". AC-12 is satisfiable. C-14 item 2. |
| 3   | A **second** press, panel already open, **cannot** bring focus back. The plumbing was built to find out — worker messages the panel after opening, panel listens, **three presses heard** — and `window.focus()` was ignored: `document.hasFocus()` `false` before the call and `false` after. Transient activation is required and only the moment of creation has it. **The plumbing was then removed.** | Confirms AC-3's relaxation and C-12's second half. C-14 item 3.    |
| 4   | **`F6` cycles focus between the page and the panel, in both directions.**                                                                                                                                               | The round trip needs nothing from us. C-15, and the reason for NG-13. |
| 5   | **The command reopens the panel after the user has closed it by hand.** Checked because one Chromium report associates the "may only be called in response to a user gesture" failure with "reopening after manual close"; it does not reproduce here.                                                                     | The ordinary close-and-reopen flow works. It also means NG-13's Escape-to-close was *viable* rather than impossible — it was dropped on cost (it destroys the panel's search text), not on capability, and NG-13 says so. |

**Outstanding**

| Measurement                                         | Criterion | Status                                       |
| --------------------------------------------------- | --------- | -------------------------------------------- |
| Focus on open — **anchor tab**                      | AC-38     | Not yet recorded. Item 2 is not done without it. |
| Focus on open — **float** (app in an iframe, C-7, E-9) | AC-38     | Not yet recorded. Item 2 is not done without it. |
| Key presses to build a nine-tab selection           | AC-31     | Not yet recorded; group B, not yet due.      |
