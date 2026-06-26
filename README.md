# Conscious Tabs

A quieter way to handle tab overload — every open tab, searchable and closable from one tidy panel.

Conscious Tabs is a Chrome extension that lives in the browser **side panel** and mirrors your open
tabs — grouped by window and by Chrome tab group — so you can find, switch, tidy, and close them
without hunting through a crowded tab strip.

## Features

- **Current-tab panel** pinned at the top: close, mute/unmute, pin/unpin, duplicate, hard reload, or
  move the tab you're looking at to a new window — without scrolling.
- **Search** every open tab by title or URL across all windows.
- **Multi-select** with `Ctrl`/`Cmd`-click (or the checkbox), then close, group, or move the
  selection to a new window in one action.
- **Drag and drop** to reorder tabs and groups, or move them between windows.
- **Undo** closed tabs from a snackbar (restores via the browser's session history).
- Follows your system **light / dark** theme.

## Install (load unpacked)

This extension isn't packaged for the Web Store; run it as an unpacked build:

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
| `npm run lint`     | ESLint (`--max-warnings 0`)                            |
| `npm run lint:fix` | ESLint with autofix                                    |
| `npm run prettier` | Format the project with Prettier                       |

After editing React components the side panel hot-reloads; after changing `manifest.json` or the
background service worker, click the reload icon on the extension's card in `chrome://extensions`.

## Built with

React 18 · TypeScript · Vite · [@crxjs/vite-plugin](https://crxjs.dev/) · MUI · @dnd-kit · notistack

Requested permissions: `sidePanel`, `tabs`, `tabGroups`, `sessions`.
