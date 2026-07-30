# Learnings — conscious-tabs

Durable, non-obvious learnings for this repo. Append-only: correct a stale record with a
new dated note beneath it rather than rewriting it. Architecture and run steps belong in
[README.md](README.md), not here.

## What Works

_Nothing recorded yet._

## What Doesn't Work

- 2026-07-30 — `.gitignore` patterns `*.local` and `.env*.local` do **not** match a bare
  `.env`, so a `.env` written at the repo root by a CLI tool would be committed silently.
  The root ignore file now lists `.env`, `.env.*`, `*.pem`, `*.p12` explicitly — leave
  them in place, they are not redundant with `*.local`. Evidence: `.gitignore:17`.

## Codebase Patterns

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

## Tool & Library Notes

- 2026-07-30 — `chrome.windows.*` and `chrome.runtime.*` require **no** manifest
  permission entry, which is why `manifest.json` declares only
  `sidePanel, tabs, tabGroups, sessions` despite heavy `chrome.windows` use. The `tabs`
  permission is what unlocks `url` / `title` / `favIconUrl` on tab objects returned inside
  Window objects. Do not "fix" the apparent gap by adding a `windows` permission — no such
  permission exists and it would fail store review. Evidence: `manifest.json:6`.

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

## Open Questions

- 2026-07-30 — Where is `store-assets/privacy-policy.html` actually deployed? The Chrome
  Web Store listing links to a hosted copy, but the deploy target is not recorded
  anywhere in this repo, so a policy edit here does not obviously propagate. Worth writing
  the URL and deploy step into the README once known.
