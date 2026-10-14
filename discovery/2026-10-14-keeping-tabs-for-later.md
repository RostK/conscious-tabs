# Discovery — keeping tabs for later

**Date:** 2026-10-14 · **Status:** open — Q1 and Q4 answered, Q2 and Q3 owed · **Feeds:** a spec,
once the open questions below are answered

Not a spec. This records an exploration: what people use session savers for, how much of that
Chrome's own APIs can carry without the extension storing anything, and what is still unknown.
The spec that comes out of it decides the WHAT; this note is the evidence it starts from.

## Where it came from

A comparison with Session Buddy (v4.1.2, about 1M users) found the two products barely overlap.
Session Buddy saves and restores sessions and curates collections of links. Conscious Tabs triages
the tabs that are open now, and keeps nothing beyond the Undo of a closed tab. The one need it
leaves unmet is the one Session Buddy's reviews praise most: close the rest, and keep them.

## Why people keep a session "as it was"

General reasoning, not user research — the demand evidence below tests it.

1. **Insurance.** Chrome's "Continue where you left off" fails sometimes: a crash, an update, the
   wrong window closed, a "Close other tabs" misclick. Losing eighty tabs once is how a session
   saver gets installed.
2. **Permission to close.** Tabs are hoarded because closing one feels like losing it. Saved, the
   window can go, and the tabs stop being a to-do list that can't be put down. This is the one that
   fits _conscious_ tabs: it makes closing calm.
3. **Switching contexts.** A window is often one piece of work — research for an article, a bug, a
   trip. Kept as a whole, it can be put away and reopened next week.
4. **The arrangement is the work.** Which tabs were together, in what order, which were pinned, how
   they were grouped. A flat list of forty URLs means sorting them again.
5. **Smaller ones:** freeing memory, moving tabs to another machine, a record of what was open.

Chrome now covers some of this itself: tab groups can be saved and synced, Memory Saver discards
idle tabs, and History → Recently closed reopens a whole window. What is missing is a snapshot that
does not depend on Chrome's restore working.

## What Chrome's APIs can carry

Warnings are Chrome's install-prompt text, from the
[permissions list](https://developer.chrome.com/docs/extensions/reference/permissions-list).

| API                                     | New warning                                                                                            | Covers                                      | Loses                                                                        |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------- | ---------------------------------------------------------------------------- |
| `sessions.getRecentlyClosed`, `restore` | none — already held, and used by Undo (`src/lib/Tabs/undo/restore.ts`)                                 | insurance; the wrong window closed          | capped at 25 entries (`MAX_SESSION_RESULTS`); see Q1, Q2                     |
| `sessions.getDevices`                   | none — `sessions` with `tabs` already shows "Read your browsing history on all your signed-in devices" | tabs open on another device                 | read-only; needs Chrome Sync                                                 |
| `bookmarks`                             | "Read and change your bookmarks."                                                                      | keeping a window; contexts; the arrangement | pinned state and group colour, unless written into folder names              |
| `readingList`                           | "Read and change entries in the reading list."                                                         | keeping one tab                             | all structure                                                                |
| `tabs.discard`                          | none                                                                                                   | memory, without closing anything            | nothing — the tab reloads when clicked                                       |
| a file, via Blob + `<a download>`       | none                                                                                                   | moving machines; a record                   | it is a file someone has to keep                                             |
| `history`, `storage`                    | broad / none                                                                                           | —                                           | `history` asks for far more than this needs; `storage` ends "stores nothing" |

A permission that brings a new warning, added as a required permission in an update, disables the
extension for existing users until they accept it. `bookmarks` and `readingList` would go in
`optional_permissions` and be requested with `chrome.permissions.request()` at the first click
that needs them.

## Ideas, cheapest first

1. **Recently closed.** A section listing the windows and tabs Chrome remembers closing, each with
   Restore. No new permission. It turns the one-step Undo into a short history and covers most
   mistakes — not a full crash.
2. **On your other devices.** What is open on the phone or the laptop, from `getDevices`. No new
   permission or warning.
3. **Sleep a window.** `tabs.discard` on every tab in it: the memory comes back, nothing moves.
4. **Close and keep, as bookmarks.** One action writes the window to a folder,
   `Conscious Tabs / <name or date>`, a subfolder per tab group in tab order, then closes it.
   Restore opens a window from the folder and rebuilds the groups (`tabs.group`,
   `tabGroups.update`). Group titles survive; colour and pinned state only if encoded in folder
   names (`📌`, `[purple] Research`), which works and is ugly.
   What makes it fit: the result is the person's own. It syncs, survives an uninstall, opens with
   Chrome's own "Open all in new window" without the extension, and cannot be lost by an extension
   upgrade the way Session Buddy's v3→v4 migration reportedly lost collections.
   Listing line it would earn: _"Windows you keep are ordinary bookmarks — yours, synced, and still
   there if you uninstall."_
5. **Read later.** Send one tab to Chrome's reading list and close it. Lighter than a folder when it
   is one article. Also an optional permission.
6. **Export a window.** A Netscape bookmarks `.html` (every browser imports it) or Markdown. Copy as
   links goes to the clipboard and needs no `clipboardWrite`.

## Ruled out

- **Automatic snapshots into bookmarks**, as crash insurance. Overwriting a "Last session" folder
  every few minutes churns the bookmarks and Sync. Crash recovery stays with Chrome, plus idea 1.
- **`storage`-backed sessions.** Workable, and it ends the claim that the extension keeps nothing.
- **Driving Chrome's saved tab groups.** As far as is known, no API saves or hides a group. Q3
  checks whether removing a group's tabs deletes the saved group.

## Open questions

Answered by [`probes/sessions-probe.js`](probes/sessions-probe.js), pasted into the extension
page's DevTools console. The harness cannot answer them: its `chrome.*` is a demo-data shim.

| #   | Question                                                                                             | Why it matters                                                                              | Answer                                                                                          |
| --- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Q1  | Does `sessions.restore()` bring a window back with its pinned tab and its tab group (title, colour)? | If yes, Recently closed keeps the arrangement for free; bookmarks would be the lossy option | **Yes** — pinned tab, group, title and colour all came back (Chrome 155, 2026-10-14). See below |
| Q2  | Do recently-closed windows survive quitting and reopening Chrome?                                    | Decides whether idea 1 is insurance or only an undo                                         | pending — part A left a closed window behind; the restart check is still owed                   |
| Q3  | When an extension removes a group's tabs, does Chrome keep it as a saved group, or delete it?        | Today's "close group" may be quietly deleting saved groups — or keeping them                | pending — needs a look at ⋮ → Tab groups for "CT probe 3"                                       |
| Q4  | Does `getDevices()` return anything on an ordinary signed-in profile?                                | Idea 2 is only worth a section if it is usually populated                                   | **Yes** — two other devices, 3 windows, 71 tabs. One profile, so "usually" is not proven        |

**Q1 has a catch.** Before restoring, the closed window's session reported `groupId: 0` on all
three tabs — the pinned, ungrouped one included. Chrome restores the structure correctly, but the
session record does not describe it, so a Recently closed list cannot show which tabs were grouped,
or what the group was called, until the window is back. The list can show a window's tabs and
count; not its groups.

## Demand evidence

Mined 2026-10-14 from Hacker News (Algolia API), the Session Buddy Google Group, GitHub issues,
AlternativeTo, and the 10 newest reviews per extension on the extscope.org mirror. **Samples are
small and the rankings are soft.** Reddit could not be reached, the Chrome Web Store sits behind a
consent redirect, and several competitor sources are marketing, used only where flagged.

**What people save tabs for**, by how often it came up (about 26 Session Buddy comments on HN):

- **Named sets for switching between pieces of work** — the most common, about 8 of 26
  ([labelled sets of 100+ tabs](https://news.ycombinator.com/item?id=40251366)). This beats the
  guess above that _permission to close_ is the main need.
- **Crash insurance** — about 5 of 26, many of them from 2012–2015, before Chrome's restore got
  better.
- **Permission to close** — real but rarely stated: 1 of 31 comments in an
  [Ask HN thread](https://news.ycombinator.com/item?id=48934898), 1 of 10 OneTab reviews.
- **Memory** — about 3 of 26. Moving between machines — weak, and mostly from people selling a tool.
- **Many people use nothing.** In the same Ask HN thread, 8 of 31 name any extension; the rest
  prune, use windows, or declare tab bankruptcy. Keeping tabs is a minority need — which suits an
  optional feature, not a reorientation.

**What goes wrong.** Losing what was saved is the failure that runs through every product:

- Session Buddy's v3→v4 upgrade (March 2024): three users on the
  [official group](https://groups.google.com/g/sessionbuddy-discuss/c/dR-YLbsidNY) lost past
  sessions. Support said v4 preserves v3 data; the cause was never confirmed.
- OneTab: ["all my 15k tabs vanished"](https://alternativeto.net/software/onetab/about/), and other
  loss reports, mostly on Firefox.
- Tabs Outliner: ["does occasionally lose all your sessions"](https://news.ycombinator.com/item?id=45110613),
  plus fears it is abandoned. Two new 2026 projects on HN (Shelf, TabVault) exist because saved
  sessions "corrupt or disappear silently".
- Chrome's own saved groups: a Chrome Unboxed writer
  [lost every saved group](https://chromeunboxed.com/psa-dont-make-the-same-mistake-i-did-of-fully-relying-on-chromes-tab-groups-just-yet/)
  across six profiles in an update (January 2023 — possibly fixed since).
- Flattening: list-style savers turn windows into
  [one long list](https://news.ycombinator.com/item?id=48958981) that nobody goes back to.

**Groups must come back whole.** On Tab Session Manager's tracker, about 8 of 29 tab-group issues
are group names lost or colours reset on restore —
[#1136](https://github.com/sienori/Tab-Session-Manager/issues/1136) ran 2023–2025 with seven
reporters. Nobody was found asking for pinned state to be restored.

**Bookmarks: split, and thin.** Three HN voices say bookmarks
["don't work"](https://news.ycombinator.com/item?id=48935002) for this — as a way to _revisit_ tabs.
Against that, bookmarks are recommended to a data-loss victim as the format that survives, and a
new saver offers bookmark export for portability. No one was found complaining that saved tabs
cluttered their bookmarks. Existing bookmark-based savers are tiny (47 and 78 users), so there is no
proof that the approach draws people — only that nobody objects to the storage.

### What this changes

- **Idea 4 should be named, not dated.** Switching between named pieces of work is the strongest
  need, so the folder takes a name, prompted at the moment of keeping, with the date only as a
  fallback.
- **Keeping it as bookmarks answers the top complaint.** Loss through the saver itself is the failure
  every product shares; a bookmark folder is outside the extension and cannot be migrated away.
- **But bookmarks are not the place to show them.** The objections are to bookmarks as a way to
  come back to tabs. Kept windows need to appear in the panel, by name, or they become the
  never-revisited list the flattening complaint describes.
- **Colour matters, pinned does not.** Encode group colour in the subfolder name; drop the `📌`
  idea. Q1 confirms that `sessions.restore()` keeps groups whole, so for a window closed recently,
  Recently closed restores it better than any bookmark folder can. Bookmarks are for keeping a
  window for longer than Chrome's 25 entries last.

## Recommendation

Spec ideas 1 and 2 first: no new permission, little UI, and they cover the mistakes that make
people afraid to close. Add 4 next, as the one optional permission — named, shown in the panel,
groups restored with their titles and colours. Together they cover what people use Session Buddy
for while the extension still keeps nothing of its own. 3, 5 and 6 are small, and can follow.
