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
A quieter way to handle tab overload. Find, tidy, group, and close every open tab from one calm side panel.
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

• Quiet the noise — spot which tabs are playing sound and mute them from the toolbar.

• Undo closes — bring a tab back from a snackbar, restored via your browser's session history.

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
   the top and one tab group expanded. Caption: *"Every open tab, calm and in one place."*
2. **Search.** A query typed in, list filtered to matching tabs. Caption:
   *"Find any tab by title or URL — across every window."*
3. **Multi-select + bulk action.** A few tabs checked with the selection toolbar
   showing. Caption: *"Select and tidy in bulk — close, group, or move."*
4. **Current-tab quick actions.** The current-tab panel with its menu open
   (mute / pin / duplicate / move). Caption: *"Manage the tab you're on without scrolling."*
5. **Dark mode.** The same hero view in system dark theme. Caption:
   *"Follows your system light and dark theme."*

Optional promo assets (dashboard only, not required):
- Small promo tile **440×280**, marquee **1400×560** — use the paper background
  with the plum logo and the summary line.

## Data usage

- Does **not** collect or transmit user data. No remote servers; everything runs locally in the browser.
