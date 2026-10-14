/*
 * Follow-up probe for SPEC-06, after close-group-probe.js on 2026-10-14.
 *
 * That run found two things to chase:
 *   - `windows.create({ state: "minimized" })` came back `state: "normal"`,
 *     so the temporary window may have been visible. F1 tries the other
 *     order: create unfocused, then minimize at once.
 *   - Undo of a Close failed with "Invalid session id". F2 waits for the
 *     closed window's entry to settle, re-reads it before restoring, and
 *     records every id it saw, so the cause shows in the JSON.
 *
 * Paste the whole file into the console of the extension's own page, as
 * before. Watch the screen and taskbar between "WATCH NOW" and
 * "STOP WATCHING" (that is F1). Then copy the JSON and answer its "lookFor"
 * lines. The probe leaves one window open, holding "CT close F2": close it
 * with its own X after looking. Delete the "CT close F…" groups from
 * ⋮ → Tab groups afterwards.
 */
const ctClose2 = (() => {
  const stamp = Date.now();
  const url = (label, n) =>
    `https://example.com/?ct-close=${label}-${stamp}-${n}`;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const waitLoaded = async (windowId, timeoutMs = 15000) => {
    const until = Date.now() + timeoutMs;
    while (Date.now() < until) {
      const tabs = await chrome.tabs.query({ windowId });
      if (tabs.every((t) => t.status === "complete" && t.url)) return tabs;
      await sleep(250);
    }
    return chrome.tabs.query({ windowId });
  };

  const makeSource = async (label, title, color, focused = false) => {
    const win = await chrome.windows.create({
      url: [1, 2, 3].map((n) => url(label, n)),
      focused,
    });
    const tabs = await waitLoaded(win.id);
    const groupId = await chrome.tabs.group({
      tabIds: [tabs[1].id, tabs[2].id],
      createProperties: { windowId: win.id },
    });
    await chrome.tabGroups.update(groupId, { title, color });
    await sleep(1500);
    return { windowId: win.id, groupId, looseTabId: tabs[0].id };
  };

  /** Create unfocused, minimize at once, move the group in, drop the placeholder, close. */
  const moveThenClose = async (groupId) => {
    const steps = {};
    const temp = await chrome.windows.create({
      url: "about:blank",
      focused: false,
    });
    steps.stateAtCreate = temp.state;
    const minimized = await chrome.windows.update(temp.id, {
      state: "minimized",
    });
    steps.stateAfterUpdate = minimized.state;
    const placeholderId = temp.tabs?.[0]?.id;
    const moved = await chrome.tabGroups.move(groupId, {
      windowId: temp.id,
      index: -1,
    });
    steps.groupIdUnchanged = moved?.id === groupId;
    if (placeholderId !== undefined) await chrome.tabs.remove(placeholderId);
    steps.stateBeforeClose = (await chrome.windows.get(temp.id)).state;
    await chrome.windows.remove(temp.id);
    return steps;
  };

  const marker = (label) => `ct-close=${label}-${stamp}`;

  /** The closed window holding `label`'s tabs, polled until it appears. */
  const findClosed = async (label, timeoutMs = 4000) => {
    const until = Date.now() + timeoutMs;
    while (Date.now() < until) {
      const closed = await chrome.sessions.getRecentlyClosed();
      const hit = closed.find((s) =>
        (s.window?.tabs ?? (s.tab ? [s.tab] : [])).some((t) =>
          t.url?.includes(marker(label)),
        ),
      );
      if (hit) return hit;
      await sleep(250);
    }
    return undefined;
  };

  const describe = (s) =>
    s && {
      kind: s.window ? "window" : "tab",
      sessionId: s.window?.sessionId ?? s.tab?.sessionId,
      tabs: s.window?.tabs?.length ?? 1,
    };

  /* F1 — the watched close, minimizing after create. */
  const f1 = async () => {
    const src = await makeSource("f1", "CT close F1", "purple", true);
    const before = await chrome.windows.getLastFocused();
    console.log("WATCH NOW — screen and taskbar");
    await sleep(3000);
    const steps = await moveThenClose(src.groupId);
    await sleep(1500);
    console.log("STOP WATCHING");
    const after = await chrome.windows.getLastFocused();
    await chrome.windows.remove(src.windowId);
    return { steps, focusedWindowUnchanged: before.id === after.id };
  };

  /* F2 — the close, then Undo: restore, move the group home, close what is left. */
  const f2 = async () => {
    const src = await makeSource("f2", "CT close F2", "green");
    const steps = await moveThenClose(src.groupId);
    const seen = [];
    const first = await findClosed("f2");
    seen.push({ at: "found", ...describe(first) });
    await sleep(1500);
    const settled = await findClosed("f2");
    seen.push({ at: "after 1.5s", ...describe(settled) });
    if (!settled) return { steps, seen, undo: "no closed entry found" };

    let restored;
    try {
      restored = await chrome.sessions.restore(describe(settled).sessionId);
    } catch (e) {
      seen.push({ at: "restore failed", error: String(e) });
      const again = await findClosed("f2");
      seen.push({ at: "re-read after failure", ...describe(again) });
      if (!again) return { steps, seen, undo: "entry gone after failure" };
      restored = await chrome.sessions.restore(describe(again).sessionId);
      seen.push({ at: "retry", ok: true });
    }
    await sleep(1500);
    const restoredWindowId = restored.window?.id ?? restored.tab?.windowId;
    const [group] = await chrome.tabGroups.query({
      windowId: restoredWindowId,
    });
    if (!group) {
      return { steps, seen, restoredAs: describe(restored), undo: "no group" };
    }
    const restoredGroup = { title: group.title, color: group.color };
    await chrome.tabGroups.move(group.id, {
      windowId: src.windowId,
      index: -1,
    });
    await sleep(800);
    const restoredWindowClosedItself = await chrome.windows
      .get(restoredWindowId)
      .then(() => false)
      .catch(() => true);
    const [home] = await chrome.tabGroups.query({ windowId: src.windowId });
    return {
      steps,
      seen,
      restoredAs: describe(restored),
      restoredGroup,
      backInSourceWindow: home
        ? { title: home.title, color: home.color }
        : null,
      restoredWindowClosedItself,
    };
  };

  const run = async () => {
    const result = {
      chrome: navigator.userAgent.match(/Chrome\/[\d.]+/)?.[0],
      f1: await f1().catch((e) => ({ error: String(e) })),
      f2: await f2().catch((e) => ({ error: String(e) })),
      lookFor: [
        "F1: between WATCH NOW and STOP WATCHING, did a window appear? (none / a taskbar button only / a window, briefly / a window that stayed)",
        'F1: in ⋮ → Tab groups, how many times is "CT close F1" listed?',
        'F2: is "CT close F2" listed once, and shown as open (in the window the probe left behind)?',
      ],
    };
    console.log(JSON.stringify(result, null, 2));
    return result;
  };

  return { run };
})();

await ctClose2.run();
