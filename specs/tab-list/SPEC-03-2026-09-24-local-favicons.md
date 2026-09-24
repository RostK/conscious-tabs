# SPEC-03 — Favicons from the browser's own store

|                |                                                                                                                               |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **Spec ID**    | SPEC-03                                                                                                                       |
| **Date**       | 2026-09-24                                                                                                                    |
| **Module**     | `tab-list` (`src/lib/Tabs/elements/TabFavicon.tsx`, `src/lib/Tabs/elements/TabAvatarsDisplay.tsx`, `src/lib/Tabs/AudioTabs/`) |
| **Status**     | approved                                                                                                                         |
| **Supersedes** | —                                                                                                                             |

---

## 1. Problem

The manager draws a favicon for every tab it lists. It does so by pointing an `<img>` at
`chrome.tabs.Tab.favIconUrl`, which for almost every ordinary tab is a **remote URL** —
`https://github.com/favicon.ico`, `https://mail.google.com/favicon.ico`, and so on.

So rendering the list issues a request to each of those origins, from the extension's origin. At
forty tabs that is forty sites that may observe a request. Nothing identifying is sent — no cookies
are attached from the extension's origin, no referrer, nothing about the user's other tabs — and the
icons are usually served from cache. But the requests are real, they leave the machine, and they
happen because the user opened a tab manager rather than because they visited anything.

This is already disclosed. `PRIVACY.md` carries a paragraph headed _"One clarification on 'nothing
leaves your browser'"_ that says precisely this. The document is honest; it is the behaviour that is
avoidable.

Chrome offers the same pictures from disk. With the `favicon` permission, an extension page may read

```
chrome-extension://<id>/_favicon/?pageUrl=<encoded page url>&size=32
```

which is served from the favicon database the browser already built while the user browsed. No
network request, no origin contacted, and it answers for pages whose icon is not fetchable at all.

### 1.1 Three problems, one cause

| Symptom                                                     | Why                                                                                                                     |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Opening the manager contacts every listed site              | Each row's `<img>` resolves a remote URL.                                                                               |
| `chrome://`, `about:` and extension pages show a grey globe | They have no fetchable icon, so `TabFavicon`'s `onError` fallback fires. Chrome's own store has icons for many of them. |
| A cold open paints globes, then icons                       | Network latency per row, against a disk read.                                                                           |

### 1.2 The cost, stated first

This buys the above with a **fifth manifest permission**. SPEC-01's **AC-22** fixes the array at
exactly four, and **AC-24** is the guard it wrote for this moment: any permission added must land in
`manifest.json`, `PRIVACY.md`, `store-assets/privacy-policy.html`, `README.md` and
`store-listing.md` in the same change.

`favicon` is a quiet permission — it grants no host access, reads no page content, and Chrome shows
it to the user with no warning string of its own. It is nonetheless a permission, and the Chrome Web
Store reviews permission changes. That is the trade this spec asks for, not a detail of it.

---

## 2. Goals

- **G-1** Draw every favicon from the browser's local store, so opening the manager contacts nobody.
- **G-2** Show a real icon where one exists but is not fetchable — `chrome://` pages especially.
- **G-3** Let `PRIVACY.md` drop its favicon caveat because the behaviour it describes is gone, not
  because the wording was softened.
- **G-4** Keep the fallback: a tab with no icon anywhere still gets the neutral globe, never a broken
  image.

## 3. Non-goals

- **NG-1** Caching, preloading or storing icons ourselves. The browser's store _is_ the cache; a
  second one would reintroduce the storage this project does not have (SPEC-01 AC-23).
- **NG-2** Any other permission. This spec asks for `favicon` and nothing else.
- **NG-3** Changing what a favicon _means_ in the UI — size, placement, the audio badge over it, or
  the group/window avatar stacks are all untouched.
- **NG-4** A settings toggle between the two sources. One behaviour, chosen here.
- **NG-5** Host permissions or content scripts, still (SPEC-01 NG-3).

## 4. User stories

- **US-1** As someone who opens a tab manager forty times a day, I want looking at my tabs not to be
  an event other people's servers can observe, so that using the tool is not itself a disclosure.
- **US-2** As someone with `chrome://extensions` and a few settings pages open, I want to tell them
  apart in the list, so that I am not scanning six identical grey globes.

---

## 5. Acceptance criteria

### 5.1 Where the picture comes from

- **AC-1** _(Must)_ WHEN the manager renders a favicon for a tab whose `url` is known, it SHALL
  request it from the extension's `_favicon` endpoint keyed on that tab's `url`, and SHALL NOT point
  an image element at `favIconUrl`.
  **Verify:** unit — render a row, assert the `img` `src` starts with the extension origin and
  carries the tab's url as `pageUrl`.
- **AC-2** _(Must)_ The requested `size` SHALL be at least twice the size the icon is drawn at, so
  the image is never upscaled on a high-density display. Requesting the drawn size — 20 or 26 — would
  hand a 2x screen a blurrier icon than the remote one it replaced, which would make this change a
  visible downgrade in exchange for an invisible improvement.
  **Verify:** unit — assert the `size` parameter against the rendered width.
- **AC-3** _(Must)_ WHEN a tab has no `url` (a tab not yet loaded), the manager SHALL render the
  neutral globe rather than requesting an icon for an empty key.
  **Verify:** unit — a tab with `url: undefined` renders no `img`.

### 5.2 Nothing leaves the machine

- **AC-4** _(Must)_ WHEN the tab list renders, the extension SHALL issue no network request to any
  origin other than its own.
  **Verify:** manual — DevTools network panel, filtered to non-extension origins, while opening the
  panel over a window of ordinary tabs. This is the criterion the feature exists for; it is checked
  against a real browser, not a stub.
- **AC-5** _(Must)_ The feature SHALL write nothing to `chrome.storage`, `localStorage`,
  `sessionStorage`, IndexedDB or cookies, preserving SPEC-01 AC-23.
  **Verify:** unit/manual — storage inspection after a session.

### 5.3 The permission, and the five files that must agree

- **AC-6** _(Must)_ The manifest's `permissions` array SHALL be exactly
  `["sidePanel", "tabs", "tabGroups", "sessions", "favicon"]`, with no `host_permissions` and no
  `content_scripts`. This **supersedes SPEC-01 AC-22**, which named the first four as complete.
  **Verify:** unit — assert on `manifest.json`.
- **AC-7** _(Must)_ WHEN this feature ships, `manifest.json`, `PRIVACY.md`,
  `store-assets/privacy-policy.html`, `README.md` ("Requested permissions") and `store-listing.md`
  ("Permission justifications") SHALL all name `favicon` and agree on why it is there. This
  discharges SPEC-01 AC-24.
  **Verify:** manual checklist, or a test asserting the five files agree.
- **AC-8** _(Must)_ `PRIVACY.md` and `store-assets/privacy-policy.html` SHALL drop the favicon
  network caveat, and SHALL NOT claim anything the code does not do.
  **Verify:** manual — read both against the built behaviour.

### 5.4 Nothing looks worse

- **AC-9** _(Must)_ WHEN the browser's store has no icon for a page, the manager SHALL render the
  neutral globe, exactly as it does today for an unfetchable icon.
  **Verify:** unit — the fallback path still fires.
- **AC-10** _(Should)_ WHERE the browser's store holds an icon for a `chrome://` or extension page,
  the manager SHALL show it rather than the globe.
  **Verify:** manual — open `chrome://extensions` and confirm the row is not a globe.
- **AC-11** _(Must)_ The audio badge, selection checkbox and drag affordances that overlay or sit
  beside the favicon SHALL be unchanged in position and behaviour.
  **Verify:** unit — existing `TabDisplay` tests continue to pass unmodified.

---

## 6. Edge cases

| #       | Case                                  | Expected                                                                                                              |
| ------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **E-1** | Tab with no `url` yet                 | Globe. No request with an empty `pageUrl` (AC-3).                                                                     |
| **E-2** | `chrome://` page                      | Chrome's stored icon if it has one, else the globe (AC-10, AC-9).                                                     |
| **E-3** | A page never visited in this profile  | Chrome answers with its default icon; accepted, and not distinguishable from a real one.                              |
| **E-4** | Incognito window                      | Out of scope — the manager does not list incognito tabs.                                                              |
| **E-5** | `data:` or `blob:` url                | Long key, no stored icon; globe. Must not throw on encoding.                                                          |
| **E-6** | A url containing `&` or `#`           | Encoded, so the endpoint reads one `pageUrl`. A naive concatenation truncates the key here.                           |
| **E-7** | The permission is missing at runtime  | The endpoint 404s and `onError` fires — the globe. Degrades to today's fallback, not a crash.                         |
| **E-8** | Favicon changes while the tab is open | Accepted staleness: the key is the url, so the image is not re-requested. Chrome's store updates on its own schedule. |

---

## 7. Assumptions and dependencies

- **A-1** `_favicon` is available to extension pages in the Chrome the project targets (MV3, current
  stable). It is not available to content scripts, which this project has none of.
- **A-2** The three hosts — side panel, anchor tab, float — are all extension pages, so all three can
  read the endpoint. The float renders the app in an extension-origin iframe (SPEC-01), so it
  inherits this.
- **A-3** Chrome returns a default icon rather than an error for an unknown page, which is why AC-9's
  fallback is about the _absence of an entry_, not about error handling alone.

## 8. Non-functional requirements

- **NFR-1 Privacy.** The feature's entire purpose. AC-4 is the measurable form of it.
- **NFR-2 Performance.** A disk read replaces a network round trip per row. No budget is set here;
  the requirement is that it not be _slower_, which a local read cannot be.
- **NFR-3 Storage-free.** Unchanged from SPEC-01 AC-23 (AC-5).
- **NFR-4 Accessibility.** Favicons are decorative and already carry `alt=""`. Unchanged.

## 9. Cross-module impact

| Area                 | Impact                                                                                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ui-shell` (SPEC-01) | **AC-22 is superseded** by AC-6 — the permission count changes from four to five. AC-24 fires and is discharged by AC-7. Nothing else in SPEC-01 moves. |
| `tab-list` (SPEC-02) | The audio badge sits over the favicon; AC-11 holds it still.                                                                                            |
| Store listing        | A permission change is reviewable. AC-7 keeps the justification text present and honest.                                                                |

## 10. Inputs

| Input                   | Provenance                                                            |
| ----------------------- | --------------------------------------------------------------------- |
| `chrome.tabs.Tab.url`   | [reused] — already read for search, filtering and own-page exclusion. |
| `chrome.runtime.getURL` | [reused] — already used to build the float's iframe src.              |

## 11. Untrusted inputs

- **A tab's `url` is attacker-influenced.** It is used here as a query-string value and MUST be
  percent-encoded (E-6). It is never interpolated into markup, and the result is only ever assigned
  to an `img` `src` pointing at the extension's own origin.

## 12. Proposed improvements (not required)

- **PI-1** Drop `TabFavicon`'s `broken` state if Chrome's default icon proves good enough to show
  directly. Deliberately _not_ required: the globe is a known-good fallback and removing it trades a
  certainty for a guess.

## 13. Open decisions

_None. The one real trade — a fifth permission — is stated in 1.2 and accepted in AC-6._

## 14. Traceability

| AC                 | Where it lands                                                   |
| ------------------ | ---------------------------------------------------------------- |
| AC-1, AC-2, AC-3   | `TabFavicon.tsx`, `TabAvatarsDisplay.tsx`, `AudioTabs/index.tsx` |
| AC-4, AC-5         | Manual verification against a real browser                       |
| AC-6, AC-7, AC-8   | `manifest.json` + the four documents                             |
| AC-9, AC-10, AC-11 | `TabFavicon.tsx`, existing `TabDisplay` tests                    |
