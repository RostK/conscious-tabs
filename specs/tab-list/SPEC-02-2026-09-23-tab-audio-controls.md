# SPEC-02 — Tab audio controls

|                |                                                                                              |
| -------------- | ---------------------------------------------------------------------------------------------- |
| **Spec ID**    | SPEC-02                                                                                          |
| **Date**       | 2026-09-23                                                                                       |
| **Module**     | `tab-list` (`src/lib/Tabs/AudioTabs/`, `src/lib/Tabs/useAudioTabs.ts`, `src/lib/Tabs/elements/AudioBadge.tsx`, `src/lib/Tabs/Tab/TabDisplay.tsx`, `src/lib/Tabs/CurrentTab/`) |
| **Status**     | implemented — **written after the code**, see 1.3                                                |
| **Supersedes** | —                                                                                                |

---

## 1. Problem

A tab makes a sound and the user cannot tell which one. Chrome marks the noisy tab in the tab strip,
but the tab strip is exactly where the problem already is: at forty tabs the strip is a row of
favicon slivers, and the speaker mark is a few pixels inside one of them. The manager is the surface
that already lists every tab, in three hosts (side panel, anchor tab, float), and already receives
each tab's `audible` and `mutedInfo` from `chrome.tabs`.

Two defects surfaced in use on 2026-09-23, both found by RostK against the running extension:

1. **The one control named "tabs playing sound" hid itself when a tab started playing sound.** The
   toolbar speaker's list excluded the active tab of the user's own window, on the grounds that the
   current-tab card already covered it. So when the noisy tab was the tab in front of you — the
   commonest case — the speaker vanished, and came back only when the user switched away. It also
   made **"Mute all"** quietly mean "mute all but this one", and unreachable when yours was the only
   noisy tab.
2. **A row could say it was noisy but not do anything about it.** The favicon carried the cue; the
   only controls were the current-tab card and the toolbar menu. Silencing any other row meant going
   up to the toolbar and finding it again in a list.

### 1.1 What already existed

| Piece                         | Role                                                                    |
| ----------------------------- | ----------------------------------------------------------------------- |
| `AudioBadge`                  | The cue: a speaker over the favicon — red when audible, grey when muted. |
| `AudioTabs` (toolbar speaker) | The bulk control: a count badge, a per-tab mute, and mute/unmute all.    |
| `CurrentTab` card             | A mute for the active tab of the user's window.                          |

### 1.2 The user's words

> "is there a way to mute tab from manager?"

> "it is not updated when tab starts playing audio. It only updates if you change smth with tabs (eg
> active tab)"

### 1.3 Provenance — this spec was written after the code

Stated plainly rather than hidden: the behaviour below shipped in `df33a82` (row mute) and `b1c0c05`
(counting the active tab) **before this spec existed**. This document describes the behaviour as
built, and every criterion in section 5 was checked against the working tree at `b1c0c05` rather than
asserted from intent. It is a deviation from this repository's spec-first convention, recorded so the
next reader knows which way the arrow pointed.

---

## 2. Goals

- **G-1** Make it possible to find the tab making a sound without leaving the manager.
- **G-2** Make it possible to silence it from wherever the user already is — the row, the card, or the
  toolbar — rather than from one privileged place.
- **G-3** Make every audio control mean what its label says, including "Mute all".
- **G-4** Add no permission, no persistence, and no new failure mode to the three hosts.

---

## 3. Non-goals

- **NG-1** Muting a **selection** of tabs. Rejected with measurements — see D-3.
- **NG-2** Pre-emptive muting of a silent tab. A control on every row would be dead on nearly all of
  them and would add a stop to every row's keyboard walk.
- **NG-3** Per-site or remembered mute rules. They would require persisted state, which the product
  promise forbids.
- **NG-4** Volume, balance, or audio routing. Chrome offers an extension none of these.
- **NG-5** Blocking or pausing autoplay.
- **NG-6** An undo for muting. Mute is its own inverse and destroys nothing; the undo toast stays for
  tab closure, where something actually is destroyed.
- **NG-7** Any new manifest permission. The four stay exactly as they are.

---

## 4. User stories

- **US-1** _As someone with a sound playing from an unknown tab,_ I want the manager to tell me which
  tab it is, so I can stop hunting through the tab strip.
- **US-2** _As someone looking at a noisy row,_ I want to silence it there, so that acting on what I
  can see does not send me somewhere else first.
- **US-3** _As someone who muted a tab,_ I want to find it again and unmute it, so that muting is not
  a one-way door.
- **US-4** _As someone with several tabs making noise,_ I want to silence all of them at once,
  including the one I am looking at.

---

## 5. Acceptance criteria

Each is one testable statement. IDs are stable — never renumber; append `AC-N+1` for new ones.
Priority uses MoSCoW.

### 5.1 The cue

- **AC-1** _(Must)_ WHILE a tab is audible, the system SHALL show a speaker cue over that tab's
  favicon.
  **Verify:** unit — render a row with `audible: true`; assert the badge is not invisible.
- **AC-2** _(Must)_ WHILE a tab is muted, the system SHALL show a muted-speaker cue over its favicon,
  whether or not the tab is still producing sound.
  **Verify:** unit — `mutedInfo.muted: true`, `audible: false`; assert the muted icon.
- **AC-3** _(Must)_ WHERE a tab is neither audible nor muted, the system SHALL show no cue.
  **Verify:** unit.
- **AC-4** _(Should)_ The cue SHALL be produced by one shared component for both the tab list and the
  current-tab card, so the two cannot drift apart.
  **Verify:** unit/inspection — both render `AudioBadge`.

### 5.2 Acting on one tab

- **AC-5** _(Must)_ WHILE a tab is audible OR muted, its row SHALL present a control that toggles that
  tab's muted state.
  **Verify:** unit — assert the control exists for an audible row and for a muted row.
- **AC-6** _(Must)_ WHERE a tab is neither audible nor muted, its row SHALL NOT present that control.
  **Verify:** unit — assert absence on a silent row.
- **AC-7** _(Must)_ WHEN the user activates a row's mute control, the system SHALL toggle only that
  tab's muted state, and SHALL NOT switch to the tab, select it, or close it.
  **Verify:** unit — assert `chrome.tabs.update(id, { muted })` and no activation call.
- **AC-8** _(Must)_ A muted tab reports `audible: false`; the muted state alone SHALL therefore keep
  the control present, so that muting a tab never removes the way to unmute it.
  **Verify:** unit — muted and silent; assert the control is present and offers "Unmute".
- **AC-9** _(Must)_ The row's mute control SHALL be reachable by the row's Left/Right walk and SHALL
  NOT be a Tab stop of its own.
  **Verify:** unit — assert `data-row-control` and `tabindex="-1"`.
- **AC-10** _(Should)_ Revealing the row's controls SHALL NOT reflow the row's title or URL.
  **Verify:** harness — the row reserves the space permanently; measured at the float's 401px width,
  the title clears the control rather than passing under it.
- **AC-11** _(Must)_ WHILE the active tab of the user's window is audible OR muted, the current-tab
  card SHALL present a mute control for it.
  **Verify:** harness — fire an `audible` change; assert the control appears and disappears.

### 5.3 Acting on all of them

- **AC-12** _(Must)_ WHILE at least one tab is audible OR muted, the toolbar SHALL present a speaker
  control carrying the count of those tabs.
  **Verify:** unit — assert the control and its badge count.
- **AC-13** _(Must)_ WHILE no tab is audible and none is muted, the toolbar SHALL NOT present the
  speaker control.
  **Verify:** unit.
- **AC-14** _(Must)_ The count and the list SHALL include the active tab of the user's own window.
  **Verify:** unit — active-and-audible as the only noisy tab; assert the control appears with a count
  of 1. *(The regression guard for defect 1 in section 1.)*
- **AC-15** _(Must)_ The speaker's menu SHALL list each counted tab by favicon and title, SHALL switch
  to a tab when its entry is chosen, and SHALL offer a mute toggle per entry.
  **Verify:** unit/manual.
- **AC-16** _(Must)_ The menu SHALL offer one action that mutes every listed tab — including the
  user's current tab — and SHALL offer its inverse, labelled to state which it will do.
  **Verify:** unit — all listed muted; assert the label reads "Unmute all".
- **AC-17** _(Should)_ Every audio control SHALL carry an accessible name stating the action; the
  audio controls inside a row SHALL additionally name the tab they act on.
  **Verify:** unit — assert `aria-label` on each; row labels contain the tab title.

### 5.4 Freshness

- **AC-18** _(Must)_ WHEN a tab becomes audible, stops being audible, is muted, or is unmuted, the
  cue, the row control, the card and the toolbar speaker SHALL all reflect it without any further user
  interaction.
  **Verify:** unit/harness — fire `chrome.tabs.onUpdated` with the change alone and assert each
  surface; no click, no focus change, no other re-render trigger.
- **AC-19** _(Must)_ AC-18 SHALL hold identically in all three hosts — side panel, anchor tab and
  float.
  **Verify:** harness at float width plus manual in each host.

### 5.5 Permissions and privacy

- **AC-20** _(Must)_ The feature SHALL read audio state only from `chrome.tabs`, and SHALL require no
  manifest permission beyond the existing `sidePanel`, `tabs`, `tabGroups`, `sessions`.
  **Verify:** unit — the manifest permission list is asserted verbatim.
- **AC-21** _(Must)_ The feature SHALL write nothing to `chrome.storage`, `localStorage`,
  `sessionStorage`, IndexedDB or cookies. Mute state lives in Chrome, not here.
  **Verify:** unit — the repository's storage scan covers these files.

---

## 6. Edge cases

- **E-1** A listed tab is closed while the speaker's menu is open — the entry disappears on the next
  update; acting on a tab that has gone fails through the normal action path and surfaces its message.
- **E-2** A muted tab that has long stopped playing keeps the speaker visible with a count of 1 until
  it is unmuted or closed. Accepted, see D-1.
- **E-3** A tab muted from Chrome's own UI (the tab strip's context menu) is indistinguishable from one
  muted here, and both surfaces show it.
- **E-4** Chrome holds `audible` true for roughly two seconds after sound stops, so the count lags
  reality slightly on the falling edge. Not compensated.
- **E-5** The extension's own pages (anchor tab, float document) are excluded from the tab structure,
  so the manager can never list itself as a noisy tab.
- **E-6** A tab with no title falls back to "tab" in the control's accessible name rather than
  producing an unnamed control.
- **E-7** Many noisy tabs at once — the badge carries the count and the menu scrolls; the toolbar does
  not grow.

---

## 7. Assumptions and dependencies

- **A-1** `chrome.tabs.onUpdated` fires for `audible` and `mutedInfo` changes, which is what makes
  AC-18 achievable without polling. Held in the harness against fired events; the real-extension
  confirmation is that the count follows playback.
- **A-2** `chrome.tabs.update(id, { muted })` is the whole of muting; there is no per-frame or
  per-element audio control available to an extension.
- **A-3** A muted tab reports `audible: false` — the reason AC-8 exists.
- **A-4** The tab structure already excludes non-browsing windows and the extension's own pages, per
  SPEC-01; this feature inherits that and adds no filtering of its own.

---

## 8. Non-functional requirements

- **NFR-1** No layout shift: revealing a row's controls must not move the text beside them (AC-10).
- **NFR-2** Keyboard parity: every audio control is reachable without a mouse, and none of them adds a
  Tab stop (AC-9).
- **NFR-3** Works at the float's ~400px width, where a row carries up to four controls.
- **NFR-4** Tab titles come from web pages and are rendered as text, never as markup (section 11).

---

## 9. Cross-module impact

- **`ui-shell` (SPEC-01)** — unaffected in its own behaviour, but it sets the constraint this feature
  lives inside: the float is ~400px wide, so a row's control set has to stay small enough to leave the
  title readable. The row mute is conditional partly for that reason.
- No service-worker, manifest or permission change, so nothing in SPEC-01's permissions section is
  touched.

---

## 10. Inputs

| Input                                             | Provenance                                                 |
| ------------------------------------------------- | ---------------------------------------------------------- |
| The two defect reports and the feature request    | [reused] user, in session, 2026-09-23                      |
| Existing audio components and hook                | [deterministic: repo-intel] `src/lib/Tabs/`                |
| Behaviour of the toolbar filter, before and after | [deterministic: repo-intel] `useAudioTabs.ts`, git history |
| Float-width measurements behind D-3 and AC-10     | [deterministic: harness]                                   |

---

## 11. Untrusted inputs

Tab **titles** and **URLs** are chosen by arbitrary web pages and appear in the speaker's menu, in the
row, and inside accessible names. They are rendered as text by React's default escaping; nothing in
this feature introduces `dangerouslySetInnerHTML`, an `href`, or a string concatenated into markup.
The float makes this sharper than usual, since it renders on top of every other application.

---

## 12. Proposed improvements

- **PI-1** A distinct cue for "noise you cannot see". Removing the active-tab exclusion (D-1) cost the
  badge its old meaning of *hidden* noise, and nothing else carries that meaning now; a future version
  could count all of them and mark the hidden ones.
- **PI-2** The current-tab card's favicon is 20px against the list's 26px, while the cue is 15px on
  both, so the cue reads proportionally larger on the card. Cosmetic, untouched here.
- **PI-3** "Mute all" is one click with a wide blast radius and no undo. If it proves surprising, a
  confirmation or a real undo is the answer, not narrowing what it acts on.

---

## 13. Resolved decisions

| Decision | Resolution | Lands in |
| --- | --- | --- |
| **D-1** Should the toolbar speaker count the user's current tab? | **Yes.** The alternative kept a tidier meaning ("noise you cannot see") at the price of a control that disappeared exactly when it was needed, and a "Mute all" that did not mute all. The duplication it accepts — the current tab reachable from card, row and menu — is the cheapest of the costs, since the card and the row both name the tab they act on. It also removed the hook's dependency on `useUserWindow`, which only the exclusion needed and which had already been wrong once. | AC-14, AC-16, E-2, PI-1 |
| **D-2** Should every row carry a mute, or only noisy ones? | **Only noisy ones.** On a silent row it would be a control that does nothing and an extra stop on the row's Left/Right walk, paid on every row to make pre-emptive muting possible — which is a different feature (NG-2). | AC-5, AC-6, NG-2 |
| **D-3** Should the selection toolbar gain a mute? | **No.** Measured: muting three noisy tabs by selection is four actions against three by row, and the four existing selection buttons already occupy 281px of the float's 401px, leaving no room for a fifth at a full label. A mixed selection would also need an invented rule (mute all? toggle each?). The speaker's menu already covers the many-tabs case without selecting anything. | NG-1 |

---

## 14. Traceability

| AC | Code | Test |
| --- | --- | --- |
| AC-1 … AC-3 | `elements/AudioBadge.tsx` | `elements/AudioBadge.test.tsx` — "the audio cue" |
| AC-4 | both surfaces | inspection — each renders `AudioBadge` |
| AC-5 … AC-10 | `Tab/TabDisplay.tsx` | `Tab/TabDisplay.test.tsx` — "a tab making sound" |
| AC-11 | `CurrentTab/index.tsx` | harness, against a fired `onUpdated` |
| AC-12 … AC-14 | `AudioTabs/index.tsx`, `useAudioTabs.ts` | `AudioTabs.test.tsx` — "the toolbar speaker" |
| AC-15, AC-16 | `AudioTabs/index.tsx` | `AudioTabs.test.tsx` — "the speaker's menu" |
| AC-17 | both of the above | row-control naming test; the card verified in the harness |
| AC-18, AC-19 | `useTabsStructure.ts`, `useUpdateEvents.ts` | harness, at float and anchor widths |
| AC-20, AC-21 | — | the repository's manifest and storage-scan tests |
