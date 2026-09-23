# Conscious Tabs

A quieter way to handle tab overload — every open tab, searchable and closable from the side panel, a
full tab, or a small window that floats above your other apps.

Conscious Tabs is a Chrome extension that mirrors your open tabs — grouped by window and by Chrome
tab group — so you can find, switch, tidy, and close them without hunting through a crowded tab
strip. It lives in the browser **side panel**, opens into a **full tab** when you want more room,
and from there **floats on top** of your other applications in a small always-on-top window.

## Features

- **Current-tab panel** pinned at the top: close, mute/unmute, pin/unpin, duplicate, hard reload, or
  move the tab you're looking at to a new window — without scrolling.
- **Search** every open tab by title or URL across all windows.
- **Multi-select** with `Ctrl`/`Cmd`-click (or the checkbox), then close, group, or move the
  selection to a new window in one action.
- **Drag and drop** to reorder tabs and groups, or move them between windows.
- **Undo** closed tabs from a snackbar (restores via the browser's session history).
- **Audio at a glance** — a speaker badge marks every tab making noise. Mute one from its own row,
  or silence them all from the toolbar.
- **Float it on top** — from the full-tab view, send the manager into an always-on-top window and
  triage your tabs without switching back to the browser first. Costs no browser width and needs no
  extra permission.
- **Built for the keyboard** — `Tab` moves between rows, `←` / `→` reach the controls on the row
  you're on. One stop per row, so walking a list of twenty tabs costs twenty stops rather than
  eighty. Controls reveal on focus as well as on hover, and each is named for what it acts on —
  _"Close Gmail"_, not _"Close"_.
- Follows your system **light / dark** theme.

## Install

**[Install from the Chrome Web Store](https://chromewebstore.google.com/detail/conscious-tabs/gipghehefjijomemklmaknpfmcccgnel)**
— or run an unpacked build from source:

1. `npm install`
2. `npm run build` (or `npm run dev` for a hot-reloading dev build)
3. Open `chrome://extensions`, enable **Developer mode**, click **Load unpacked**, and select the
   generated `dist/` folder.
4. Click the Conscious Tabs toolbar icon to open the side panel.

## Development

| Script             | Description                                            |
| ------------------ | ------------------------------------------------------ |
| `npm run dev`      | Vite dev server with HMR (writes the build to `dist/`) |
| `npm run build`    | Type-check (`tsc`) and bundle to `dist/`               |
| `npm run test`     | Vitest, single run                                     |
| `npm run lint`     | ESLint (`--max-warnings 0`)                            |
| `npm run lint:fix` | ESLint with autofix                                    |
| `npm run prettier` | Format the project with Prettier                       |

After editing React components the side panel hot-reloads; after changing `manifest.json` or the
background service worker, click the reload icon on the extension's card in `chrome://extensions`.

## Built with

React 18 · TypeScript · Vite · [@crxjs/vite-plugin](https://crxjs.dev/) · MUI · @dnd-kit · notistack

Requested permissions: `sidePanel`, `tabs`, `tabGroups`, `sessions`.
