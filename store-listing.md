# Chrome Web Store listing — Conscious Tabs

Copy for the Chrome Web Store dashboard. Paste each field into the matching
section when submitting. Character limits noted where the store enforces them.

## Name (≤45 chars)

```
Conscious Tabs — calm tab manager
```

> The manifest `name` stays `Conscious Tabs`; the store listing name may add the
> short tagline above to use the character budget. Use whichever you prefer.

## Summary / short description (≤132 chars)

```
A quieter way to handle tab overload. Find, tidy, group, mute, and close every open tab — from the side panel or floating on top.
```

> This matches the `description` field in `manifest.json`.

## Category

Productivity

## Detailed description

```
A quieter way to handle tab overload.

Conscious Tabs lives in your browser's side panel and mirrors every open tab — grouped by window and by Chrome tab group — so you can find, switch, tidy, and close them without hunting through a crowded tab strip. It's built to be calm and out of the way: no noise, no urgency, just your tabs, organised.

What you can do

• See the tab you're on — a pinned panel at the top keeps your current tab one click from close, mute, pin, duplicate, hard-reload, or move to a new window.

• Search everything — filter every open tab by title or URL across all your windows, instantly.

• Tidy in bulk — Ctrl/⌘-click (or the checkbox) to select several tabs, then close, group, or move them to a new window in one action.

• Drag and drop — reorder tabs and groups, or move them between windows.

• Quiet the noise — see at a glance which tabs are playing sound. Mute one from its own row, or silence them all from the toolbar.

• Undo closes — bring a tab back from a snackbar, restored via your browser's session history.

• Float it on top — open Conscious Tabs in a tab, then float it into a small always-on-top window that stays visible over your other apps. Triage your tabs without switching back to the browser, and get your full browser width back while you do it.

• Reach it all from the keyboard — Tab steps between rows, the arrow keys reach the controls on the row you're on, and every button announces the tab, group, or window it acts on rather than just "Close".

• Fits your browser — follows your system light / dark theme and sits natively in the side panel.

Private by design

Conscious Tabs works entirely on your machine. It doesn't collect, transmit, or sell any of your data — your tabs never leave your browser.
```

## Single purpose

```
A tab manager that lets you find, organise, and close your open tabs from the browser side panel.
```

## Permission justifications

- **sidePanel** — The entire UI lives in the browser side panel; required to open and render it.
- **tabs** — To list, search, activate, mute, pin, duplicate, reload, move, and close your open tabs.
- **tabGroups** — To mirror and manage Chrome tab groups (collapse, rename, recolour, ungroup).
- **sessions** — To restore recently closed tabs via the Undo action.
- **favicon** — To show each tab's icon from the icons your browser has already
  stored, so that drawing the list sends no request to the sites you have open.

## Screenshots

Store specs: **1280×800** (preferred) or 640×400, PNG or JPEG, 1–5 images. The
first one is the thumbnail shown in search results, so make it the strongest.

Capture with a **clean demo profile** — a handful of neutral, recognisable tabs
(docs, a couple of well-known sites, one tab group). Avoid personal data:
signed-in Gmail with inbox counts, `file:///` paths, private URLs. The side
panel is narrow, so place the capture on a calm paper/neutral backdrop (or a
browser frame) to fill the 1280×800 canvas.

Recommended set, in order:

1. **Hero — the whole panel.** The tab list with the current-tab panel pinned at
   the top and one tab group expanded. Caption: _"Every open tab, calm and in one place."_
2. **Search.** A query typed in, list filtered to matching tabs. Caption:
   _"Find any tab by title or URL — across every window."_
3. **Multi-select + bulk action.** A few tabs checked with the selection toolbar
   showing. Caption: _"Select and tidy in bulk — close, group, or move."_
4. **Current-tab quick actions.** The current-tab panel with its menu open
   (mute / pin / duplicate / move). Caption: _"Manage the tab you're on without scrolling."_
5. **Dark mode.** The same hero view in system dark theme. Caption:
   _"Follows your system light and dark theme."_

### Ready-to-upload assets

Ready 1280×800 screenshots are in `store-assets/`. These are **real captures of
the actual extension** — the production build running with a `chrome.*`
demo-data shim (curated neutral tabs across one focused + two collapsed
windows) so no personal data appears — driven through its real interactions
(search typed, tabs selected, the current-tab menu opened, dark theme
emulated) and composited onto the branded frame:

| File                              | Scene                                        |
| --------------------------------- | -------------------------------------------- |
| `store-assets/01-hero.png`        | Hero — the whole panel                       |
| `store-assets/02-search.png`      | Search / filter                              |
| `store-assets/03-multiselect.png` | Multi-select + bulk actions                  |
| `store-assets/04-current-tab.png` | Current-tab quick-action menu                |
| `store-assets/05-dark-mode.png`   | Dark mode                                    |
| `store-assets/06-floating.png`    | **Missing** — the float on top of other apps |

**06-floating is the one that cannot be faked, and the one the listing most
needs.** Floating on top is the capability nobody can guess from a side panel,
and the only image that argues for it is the float genuinely sitting above
something that is not a browser — an editor, a document — with the browser
window visible behind it. Rendering the panel at 400×640 in a tab looks close
and proves nothing: it has no Picture-in-Picture window chrome, no shadow, and
nothing behind it to be on top of.

Capture notes for that one: a clean demo profile so the titles are neutral,
one tab group in view because the colour reads well at that size, and take it
after the `favicon` permission is live so the rows show real site icons rather
than the fallback globe.

Optional promo assets (dashboard only, not required):

- Small promo tile **440×280**, marquee **1400×560** — use the paper background
  with the plum logo and the summary line.

## Data usage

- Does **not** collect or transmit user data. No remote servers; everything runs locally in the browser.
