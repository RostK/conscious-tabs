/*
 * Probe for SPEC-06 (closing a tab group), questions P1–P6.
 *
 * Run it in the DevTools console of the extension's own page, where
 * `chrome.tabs`, `chrome.tabGroups`, `chrome.windows` and `chrome.sessions`
 * are available: open Conscious Tabs in a full tab (or right-click inside the
 * side panel → Inspect), press F12, paste this whole file, press Enter.
 * Chrome asks you to type "allow pasting" the first time.
 *
 * It takes about 40 seconds. Every probe tab carries `ct-close` in its URL.
 * Keep your eyes on the screen and the taskbar from the moment it prints
 * "WATCH NOW" until it prints "STOP WATCHING": that stretch is the one real
 * close, and the question is whether any window appears, even for a moment.
 *
 * When it finishes, copy the JSON it prints, then open ⋮ → Tab groups (and
 * glance at the bookmarks bar) and answer the four lines under "lookFor".
 * Afterwards, delete the "CT close …" groups there: right-click → Delete group.
 * The probe leaves one window open, holding "CT close D": close it yourself
 * after looking, with the window's own X.
 */
const ctClose = (() => {
  const stamp = Date.now();
  const url = (label, n) =>
    `https://example.com/?ct-close=${label}-${stamp}-${n}`;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const NONE = chrome.tabGroups.TAB_GROUP_ID_NONE;

  const waitLoaded = async (windowId, timeoutMs = 15000) => {
    const until = Date.now() + timeoutMs;
    while (Date.now() < until) {
      const tabs = await chrome.tabs.query({ windowId });
      if (tabs.every((t) => t.status === "complete" && t.url)) return tabs;
      await sleep(250);
    }
    return chrome.tabs.query({ windowId });
  };

  /** A window of three tabs: one loose, then two in a named group. */
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
    // Chrome saves a group shortly after it is made; give it time to.
    await sleep(1500);
    return { windowId: win.id, groupId, looseTabId: tabs[0].id };
  };

  /**
   * The candidate "Close group": move the group into a new window made for
   * it, then close that window. `dropPlaceholder` removes the new window's
   * own starting tab before the close, so the closed window holds only the
   * group's tabs.
   */
  const moveThenClose = async (groupId, { dropPlaceholder }) => {
    const steps = {};
    const temp = await chrome.windows.create({
      url: "about:blank",
      state: "minimized",
      focused: false,
    });
    const placeholderId = temp.tabs?.[0]?.id;
    steps.tempWindowState = temp.state;
    try {
      const moved = await chrome.tabGroups.move(groupId, {
        windowId: temp.id,
        index: -1,
      });
      steps.groupIdAfterMove = moved?.id;
      steps.groupIdUnchanged = moved?.id === groupId;
      steps.titleAfterMove = moved?.title;
    } catch (e) {
      steps.moveError = String(e);
      await chrome.windows.remove(temp.id).catch(() => undefined);
      return steps;
    }
    if (dropPlaceholder && placeholderId !== undefined) {
      await chrome.tabs.remove(placeholderId).catch((e) => {
        steps.placeholderError = String(e);
      });
    }
    await sleep(300);
    await chrome.windows.remove(temp.id);
    await sleep(800);
    return steps;
  };

  /** The newest recently-closed entry, described without restoring it. */
  const newestClosed = async () => {
    const [entry] = await chrome.sessions.getRecentlyClosed({ maxResults: 1 });
    if (!entry) return { entry: "none" };
    return entry.window
      ? {
          entry: "window",
          sessionId: entry.window.sessionId,
          tabs: entry.window.tabs?.map((t) =>
            t.url?.replace(/^.*ct-close=/, ""),
          ),
        }
      : { entry: "tab", sessionId: entry.tab?.sessionId };
  };

  /* P1, P2 — the real close, watched: does a window flash; where is focus after? */
  const watched = async () => {
    const src = await makeSource("a", "CT close A", "purple", true);
    const before = await chrome.windows.getLastFocused();
    console.log("WATCH NOW — screen and taskbar");
    await sleep(3000);
    const steps = await moveThenClose(src.groupId, { dropPlaceholder: true });
    await sleep(1500);
    console.log("STOP WATCHING");
    const after = await chrome.windows.getLastFocused();
    const [active] = await chrome.tabs.query({
      active: true,
      windowId: src.windowId,
    });
    const closed = await newestClosed();
    await chrome.windows.remove(src.windowId);
    return {
      steps,
      focusedWindowUnchanged: before.id === after.id,
      sourceActiveTabIsLooseTab: active?.id === src.looseTabId,
      newestClosed: closed,
    };
  };

  /* P3 — the same close, keeping the new window's starting tab. */
  const keepPlaceholder = async () => {
    const src = await makeSource("b", "CT close B", "cyan");
    const steps = await moveThenClose(src.groupId, { dropPlaceholder: false });
    const closed = await newestClosed();
    await chrome.windows.remove(src.windowId);
    return { steps, newestClosed: closed };
  };

  /* P4 — today's close (tabs.remove), then today's Undo (sessions.restore per entry). */
  const deleteThenUndo = async () => {
    const src = await makeSource("c", "CT delete C", "orange");
    const tabIds = (await chrome.tabs.query({ groupId: src.groupId })).map(
      (t) => t.id,
    );
    await chrome.tabs.remove(tabIds);
    await sleep(800);
    const entries = await chrome.sessions.getRecentlyClosed({
      maxResults: tabIds.length,
    });
    const kinds = entries.map((s) => (s.window ? "window" : "tab"));
    for (const s of [...entries].reverse()) {
      await chrome.sessions.restore(s.tab?.sessionId ?? s.window?.sessionId);
    }
    await sleep(1500);
    const groups = await chrome.tabGroups.query({ windowId: src.windowId });
    const back = await chrome.tabs.query({ windowId: src.windowId });
    const result = {
      closedEntries: kinds,
      restoredIntoSourceWindow: back.filter((t) =>
        t.url?.includes("ct-close=c"),
      ).length,
      groupsAfterUndo: groups.map((g) => ({ title: g.title, color: g.color })),
    };
    // Clean up with a delete, so "CT delete C" is not left saved.
    const leftover = back.filter((t) => t.groupId !== NONE).map((t) => t.id);
    if (leftover.length) await chrome.tabs.remove(leftover);
    await chrome.windows.remove(src.windowId);
    return result;
  };

  /*
   * P5, P6 — the candidate close, then an Undo that restores the closed window
   * and moves the group back where it was. Leaves the source window open, so
   * ⋮ → Tab groups can be checked for "CT close D" being listed once, as open.
   */
  const closeThenUndo = async () => {
    const src = await makeSource("d", "CT close D", "green");
    const steps = await moveThenClose(src.groupId, { dropPlaceholder: true });
    const [entry] = await chrome.sessions.getRecentlyClosed({ maxResults: 1 });
    if (!entry?.window) return { steps, undo: "no window entry to restore" };
    const restored = await chrome.sessions.restore(entry.window.sessionId);
    await sleep(1500);
    const restoredWindowId = restored.window?.id;
    const [group] = await chrome.tabGroups.query({
      windowId: restoredWindowId,
    });
    if (!group) return { steps, undo: "restored window holds no group" };
    const restoredGroup = { title: group.title, color: group.color };
    await chrome.tabGroups.move(group.id, {
      windowId: src.windowId,
      index: -1,
    });
    await sleep(800);
    const restoredWindowStillOpen = await chrome.windows
      .get(restoredWindowId)
      .then(() => true)
      .catch(() => false);
    const [home] = await chrome.tabGroups.query({ windowId: src.windowId });
    return {
      steps,
      restoredGroup,
      backInSourceWindow: home
        ? { title: home.title, color: home.color }
        : null,
      restoredWindowClosedItself: !restoredWindowStillOpen,
    };
  };

  const run = async () => {
    const result = {
      chrome: navigator.userAgent.match(/Chrome\/[\d.]+/)?.[0],
      platform: navigator.userAgentData?.platform,
      p1p2Watched: await watched().catch((e) => ({ error: String(e) })),
      p3KeepPlaceholder: await keepPlaceholder().catch((e) => ({
        error: String(e),
      })),
      p4DeleteThenUndo: await deleteThenUndo().catch((e) => ({
        error: String(e),
      })),
      p5p6CloseThenUndo: await closeThenUndo().catch((e) => ({
        error: String(e),
      })),
      lookFor: [
        "P1: did any window appear on screen or in the taskbar between WATCH NOW and STOP WATCHING? (none / a taskbar button / a window)",
        'P1: in ⋮ → Tab groups, is "CT close A" listed (purple), and how many times?',
        'P3: is "CT close B" listed (cyan), and how many times?',
        'P6: is "CT close D" listed once, and shown as open (the window the probe left behind)?',
      ],
    };
    console.log(JSON.stringify(result, null, 2));
    return result;
  };

  return { run };
})();

await ctClose.run();
