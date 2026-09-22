# Learnings — conscious-tabs

Durable, non-obvious learnings for this repo. Append-only: correct a stale record with a
new dated note beneath it rather than rewriting it. Architecture and run steps belong in
[README.md](README.md), not here.

## What Works

- 2026-09-22 — Verified first-hand on current Chrome with a throwaway probe extension: a
  **`chrome.windows.create({ type: "popup" })` extension window can open a Document PiP
  window**, exactly like a normal tab can. This is documented nowhere I could find, and it
  is the fact that makes a floating mode viable — it means the PiP opener (which the float
  cannot outlive) can be a window the user deliberately opened, instead of a stray tab
  parked in their tab strip where this very extension invites them to close it. The same
  probe re-confirmed the side panel is still blocked. Evidence: probe extension, three
  surfaces (side panel / tab / popup window) each calling `requestWindow()` from a click
  handler.
- 2026-09-22 (closes the throttling half of the open question below) — A backgrounded
  opener is **not** timer-throttled while it holds a Document PiP window. Measured with the
  opener tab reporting `document.visibilityState === "hidden"` for 102.1s: hidden-only drift
  −0.1s over 413 ticks. The float's own iframe realm separately reports `visible` and drifts
  0.0s — and that is the number that actually matters, because the shipped app's React and
  timers live inside that iframe, not in the opener. The opener therefore only has to stay
  *alive*, not stay *responsive*, which makes a tab anchor materially safer than it looks.
- 2026-09-22 — **There IS a way to close the side panel programmatically, and it is not
  `close()`.** `chrome.sidePanel.setOptions({ enabled: false })` called *globally* (with no
  `tabId`) evicts an already-open side panel. This matters because w3c/webextensions#521 and
  every discussion around it say there is no `chrome.sidePanel.close()` — literally true,
  practically misleading. Unlike a panel page calling `window.close()` on itself, this works
  from **any** document in the extension. Measured with a probe extension, step 6.
  **It is a one-way door though** — see What Doesn't Work — so do not reach for it without a
  guaranteed re-enable path.
- 2026-09-22 — **A Document Picture-in-Picture window IS a window to `chrome.windows.getAll()`,
  and `type` will not tell you it apart — `alwaysOnTop` will.** Measured against a live
  float: the real browser window came back `{type: "normal", alwaysOnTop: false}` and the float
  came back `{type: "normal", alwaysOnTop: true, 414x681, tabs: ["about:blank"]}`. So a float
  appears in the mirrored tab list as a focused window holding one about:blank tab, complete with
  a close button that destroys it, and any "which window is the user in" logic resolves to it
  unless it is excluded. `alwaysOnTop` is **exact, not a heuristic**: `chrome.windows.create()`
  is forbidden from setting it (anti-phishing — the same restriction that makes a floating
  extension window impossible in the first place), so no window a user or extension opens can
  ever have it. Evidence: `src/lib/surfaces.ts` `isBrowsingWindow`.
- 2026-09-22 — **Chrome honoured the requested float size almost exactly**: `requestWindow({width:
  400, height: 640})` gave an outer window of 414x681 and a content area of 401x641 at dpr 2. The
  clamping warned about in the Document PiP docs did not bite at this size, so a layout budgeted
  for 400x640 is budgeted correctly.
- 2026-09-22 (closes assumption A-8) — **Keyboard focus and text entry do reach a text field
  inside the Document PiP window.** Clicking the search box in the float and typing filters
  the list normally. This was the last unverified assumption in
  `specs/ui-shell/SPEC-01-2026-09-22-floating-tab-manager-window.md`, and the one that would
  have sunk the feature: a float you cannot search is a read-only poster of your tabs. The app
  runs in an extension-origin iframe inside the PiP window, so this also confirms that frame
  keeps working normally — it is not a degraded or inert context.

## What Doesn't Work

- 2026-07-30 — `.gitignore` patterns `*.local` and `.env*.local` do **not** match a bare
  `.env`, so a `.env` written at the repo root by a CLI tool would be committed silently.
  The root ignore file now lists `.env`, `.env.*`, `*.pem`, `*.p12` explicitly — leave
  them in place, they are not redundant with `*.local`. Evidence: `.gitignore:17`.
- 2026-09-22 — The Document Picture-in-Picture API **cannot be opened from the side
  panel**, the action popup, or an offscreen document: `documentPictureInPicture` stays
  null / `requestWindow()` rejects, because those contexts are not a "top-level
  traversable". It works only from an extension page loaded in a real browser tab. So the
  panel can never pop *itself* out — a float needs a separate opener surface. Chrome also
  allows **one PiP window per browser, globally across all tabs and extensions**, so ours
  would evict the user's video PiP and vice versa. Evidence: WICG
  document-picture-in-picture issue #88 (still open, labelled `chrome-bug`) and the
  chromium-extensions thread "Try using Document Picture-in-Picture API".
- 2026-09-22 — Do **not** measure background throttling using a `type: "popup"` window as
  the opener. An unfocused popup window still reports `visibilityState === "visible"`, so it
  is never throttled and the result says nothing about a backgrounded *tab*, which genuinely
  is `hidden`. A first probe run reported a clean 0.0s drift from a popup opener and was
  wrongly read as a general green light; the tab case had to be re-measured from scratch.
  Two rules for any future run: require the opener to report `hidden` before trusting the
  number, and measure drift across the hidden stretch only — total drift is diluted by the
  time the opener spent visible.
- 2026-09-22 — **`chrome.sidePanel.setOptions({ tabId, enabled: false })` does NOT hide a side
  panel that is already open on that tab.** The `enabled` flag controls *availability* — whether
  the panel can be opened there, whether the entry appears — not eviction. Chrome's docs and every
  blog post describing "per-tab side panels" are talking about availability, and reading them as
  "the panel follows the active tab" is wrong. Measured with a probe extension, step 2. The
  consequence is that **no tab activation can hide or restore the panel**: a `tabs.onActivated`
  listener carries no user activation, and `sidePanel.open()` requires one, so the return trip
  needs a real click somewhere in the UI.
- 2026-09-22 — **Re-enabling a globally disabled side panel does not bring it back.**
  `setOptions({ enabled: true })` after a global disable restores availability only; the panel
  stays shut until something calls `open()` with a live user gesture. Measured with a probe
  extension, step 7. So the global disable above is a *close*, not a *hide*, and while it is in
  effect the toolbar icon cannot reopen the panel either — meaning a page that disables the panel
  and then dies leaves the user with no way back. If it is ever used, re-enable from the service
  worker on startup as a backstop.

## Codebase Patterns

- 2026-09-22 — **Never put a volatile flag in a React list key here.** The window rows were keyed
  `"w" + window.id + window.focused`, so every focus change discarded and rebuilt that whole
  subtree. The tab list reveals its close and select controls on `:hover`, so rows being recreated
  under a stationary pointer makes those controls vanish mid-interaction — it presents as "buttons
  need two clicks" and "clicking the title does nothing", not as a rendering bug. Rare enough to
  ignore in the side panel; constant in the floating window, where activating a tab focuses its
  window and so triggers the remount on *every* click. `WindowListItem` already syncs its open
  state from `window.focused` in a `useEffect`, so the key was pure cost. Evidence:
  `src/views/TabsView/index.tsx`, `src/lib/Tabs/Window/WindowListItem.tsx:42`.

- 2026-07-30 — The privacy policy exists in **two copies that must be edited together**:
  [PRIVACY.md](PRIVACY.md) (repo-facing) and
  [store-assets/privacy-policy.html](store-assets/privacy-policy.html), which is the
  hosted copy the Chrome Web Store listing links to. Changing one and not the other
  leaves the live, user-visible policy stale — and the store listing depends on it being
  accurate. Evidence: `store-assets/privacy-policy.html:66`.
- 2026-07-30 — A manifest permission change must be mirrored in **five** places or the
  docs and store listing drift from what is actually requested: `manifest.json:6` (source
  of truth), `PRIVACY.md` "Permissions and why they are needed",
  `store-assets/privacy-policy.html` (same section), `README.md:48` ("Requested
  permissions" line), and `store-listing.md:61` ("Permission justifications").
- 2026-09-22 — Six `chrome.sidePanel.open({ windowId })` call sites encode a **per-window
  host model**: "focus that window, and bring the panel along." Any alternative surface
  (Document PiP, a `windows.create` popup) is a **global singleton** that follows no
  window, so each of these flows needs a host-aware branch — they are the real cost of a
  second surface, not the rendering. Evidence: `src/lib/Tabs/Tab/TabDisplay.tsx:32`,
  `src/lib/Tabs/actions.ts:37`, `src/lib/Tabs/actions.ts:55`,
  `src/lib/Tabs/selection/SelectionToolbar.tsx:95`,
  `src/lib/Tabs/Window/WindowListItem.tsx:51`, `src/lib/ControlBar/index.tsx:18`.

## Decisions

- 2026-07-30 — Favicons render by pointing `<img src>` at `tab.favIconUrl`, which is
  normally the **site's own** icon URL, so opening the panel can issue image requests to
  the origins of every mirrored tab — including collapsed groups and windows the user is
  not looking at. No user data is transmitted, but it contradicts a literal reading of
  "your tabs never leave your browser" in the privacy policy. Decision for shipped
  v0.0.4: document the behaviour in both policy copies rather than change shipped code.
  Planned for v0.0.5: switch to
  `chrome.runtime.getURL('/_favicon/?pageUrl=…&size=…')` plus the `favicon` permission,
  which reads Chrome's local favicon database (zero network) and also fixes the broken
  icon for `chrome://` pages — then delete the clarifying paragraph from both copies.
  Evidence: `src/lib/Tabs/elements/TabFavicon.tsx:19`, and three further call sites in
  `src/lib/Tabs/Tab/TabDisplay.tsx`, `src/lib/Tabs/AudioTabs/index.tsx`,
  `src/lib/Tabs/elements/TabAvatarsDisplay.tsx`.
- 2026-09-22 — Researched replacing the side panel with a floating Document PiP window.
  Decision: **keep the side panel as the primary home and treat a float as an opt-in
  second surface**, opened from the extension page that `ControlBar` already puts in a tab
  — that opener needs zero new permissions. Rejected the one-click alternative (content
  script on the active tab as the opener, extension page iframed into the PiP window):
  it needs host permissions, which breaks the zero-host-permission claim in `PRIVACY.md`,
  labels the float with the *host page's* origin in the PiP title bar, and kills the float
  whenever that page navigates or closes — fatal for an extension whose job is closing and
  switching tabs. Also rejected `chrome.windows.create({ type: "popup" })`: it survives
  everything but is not always-on-top, and `alwaysOnTop` is deliberately not settable from
  `windows.create` (anti-phishing) — which is why TabFloater ships a native companion app.
  Evidence: `src/lib/ControlBar/index.tsx:23` (existing open-in-tab surface, reuses the
  tab if present).

## Tool & Library Notes

- 2026-07-30 — `chrome.windows.*` and `chrome.runtime.*` require **no** manifest
  permission entry, which is why `manifest.json` declares only
  `sidePanel, tabs, tabGroups, sessions` despite heavy `chrome.windows` use. The `tabs`
  permission is what unlocks `url` / `title` / `favIconUrl` on tab objects returned inside
  Window objects. Do not "fix" the apparent gap by adding a `windows` permission — no such
  permission exists and it would fail store review. Evidence: `manifest.json:6`.
- 2026-09-22 — If a second window surface is ever built, **iframe the extension page into
  it rather than re-parenting React DOM across documents**. Moving nodes into another
  document breaks this stack in three places at once: Emotion injects `<style>` into the
  *opener's* `<head>`, every MUI `Tooltip` (12), `Menu` (9) and `Dialog` (3) portals into
  the opener's `document.body`, and notistack's `SnackbarProvider` does the same — so they
  render invisibly in the wrong window. Fixable with an Emotion `CacheProvider` container
  plus `container=` on every portal, but that is a tax on every future component; an
  extension-origin iframe keeps full `chrome.*` access and costs none of it. Document PiP
  additionally copies **no** stylesheets and requires `requestWindow()` to be called
  synchronously in the click handler — any `await` before it burns the transient-activation
  token. Evidence: `src/lib/Theme/index.tsx` (Emotion/MUI provider setup).

## Recurring Errors & Fixes

_Nothing recorded yet._

## Session Notes

- 2026-07-30 — Prepared the repo for going public (still private at time of writing;
  visibility flip is a manual step). Full-history secret scan came back clean: all 88
  paths ever added and all 405 blobs across every ref content-scanned for connection
  URIs, cloud keys, OAuth secrets, extension signing keys and private keys — zero hits,
  and no `key`/`oauth2`/`host_permissions` in any of the 13 historic `manifest.json`
  versions. Added MIT `LICENSE`, fixed the stale "not on the Web Store" install section,
  and set repo description/topics/homepage. Default branch renamed `master` → `main`.
  README feature claims were re-verified against source and all hold.
- 2026-09-22 — Research-only session (no code changed): can the tab UI live in a Document
  PiP window instead of the side panel? Answer is "not as a swap" — see What Doesn't Work.
  Surveyed three architectures (extension tab as opener / content script as opener /
  non-PiP popup window) and weighed them for users: a float wins by surviving outside the
  browser entirely (visible over Slack, an IDE, a full-screen call), and loses on size
  clamping, no positioning, the global one-PiP limit, and dying with its anchor.

## Open Questions

- 2026-07-30 — Where is `store-assets/privacy-policy.html` actually deployed? The Chrome
  Web Store listing links to a hosted copy, but the deploy target is not recorded
  anywhere in this repo, so a policy edit here does not obviously propagate. Worth writing
  the URL and deploy step into the README once known.
- 2026-09-22 — Two things to settle with a throwaway unpacked extension before writing any
  float feature code: (a) does a backgrounded opener tab throttle timers/rAF for the PiP
  window's content — probably not via an iframe, since the PiP window is its own visible
  widget, but unverified and it is the one failure that would make the float feel broken;
  (b) is WICG #88 still unfixed in current Chrome, i.e. does side-panel → PiP now work?
  Also unverified: keyboard focus into the search field while the float has focus.
- 2026-09-22 (resolves part of the note above) — Answered by the probe: WICG #88 is **not**
  fixed, the side panel still cannot open PiP, and a `type: "popup"` window **can**. Still
  open from that note: whether a backgrounded opener throttles the float's timers, and
  whether keyboard focus reaches a text field inside the float.
- 2026-09-22 (closes both 2026-09-22 notes above) — Throttling is answered: see What Works.
  Still unverified is whether keyboard focus and text entry reach a text field *inside* the
  float. Chrome's own Document PiP documentation names text editing and note-taking among the
  target use cases, so it is assumed to work and is tracked as assumption A-8 in
  `specs/ui-shell/SPEC-01-2026-09-22-floating-tab-manager-window.md`. Verify during
  implementation before relying on the float's search field.
- 2026-09-22 (closes the note above) — Verified by hand: search works inside the float. Nothing
  from the 2026-09-22 research session is open any more. See What Works.

