/*
 * Probe for discovery/2026-10-14-keeping-tabs-for-later.md, questions Q1–Q4.
 *
 * Run it in the DevTools console of the extension's own page, where
 * `chrome.tabs`, `chrome.tabGroups` and `chrome.sessions` are available:
 * open Conscious Tabs in a full tab (or right-click inside the side panel →
 * Inspect), press F12, paste this whole file, press Enter. Chrome asks you to
 * type "allow pasting" the first time.
 *
 * It opens and closes a few small windows of example.com tabs, then prints a
 * JSON summary — copy that back. Every probe tab carries `ct-probe` in its URL
 * so nothing is confused with your own tabs.
 *
 * Q2 needs a browser restart, so it runs in two parts:
 *   1. paste this file — part A runs with the others and leaves a closed window behind;
 *   2. quit Chrome completely (menu → Exit), reopen it, open the console on
 *      the extension's page again and paste only this line — the number it
 *      prints is how many probe windows survived the restart:
 *
 *      (await chrome.sessions.getRecentlyClosed()).filter((s) => s.window?.tabs?.some((t) => t.url?.includes("ct-probe=q2-"))).length
 */
const ctProbe = (() => {
  const stamp = Date.now();
  const url = (label, n) =>
    `https://example.com/?ct-probe=${label}-${stamp}-${n}`;
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

  const findClosedWindow = async (marker) => {
    const closed = await chrome.sessions.getRecentlyClosed();
    return closed.find((s) =>
      s.window?.tabs?.some((t) => t.url?.includes(marker)),
    );
  };

  /* Q1 — does sessions.restore() bring a window back with its pinned tab and its group? */
  const q1 = async () => {
    const urls = [1, 2, 3].map((n) => url("q1", n));
    const win = await chrome.windows.create({ url: urls, focused: false });
    const tabs = await waitLoaded(win.id);
    await chrome.tabs.update(tabs[0].id, { pinned: true });
    const groupId = await chrome.tabs.group({
      tabIds: [tabs[1].id, tabs[2].id],
      createProperties: { windowId: win.id },
    });
    await chrome.tabGroups.update(groupId, {
      title: "CT probe 1",
      color: "purple",
    });
    await sleep(1000);
    await chrome.windows.remove(win.id);
    await sleep(1000);

    const session = await findClosedWindow(`q1-${stamp}`);
    if (!session) return { found: false };
    const recorded = session.window.tabs.map((t) => ({
      pinned: t.pinned,
      groupId: t.groupId,
    }));

    const restored = await chrome.sessions.restore(session.window.sessionId);
    await sleep(1500);
    const windowId = restored.window?.id;
    const back = await chrome.tabs.query({ windowId });
    const groups = await chrome.tabGroups.query({ windowId });
    await chrome.windows.remove(windowId);

    return {
      found: true,
      recordedInSession: recorded,
      restoredTabs: back.map((t) => ({
        pinned: t.pinned,
        grouped: t.groupId !== -1,
      })),
      restoredGroups: groups.map((g) => ({ title: g.title, color: g.color })),
    };
  };

  /* Q2 part A — leave a closed window behind, to look for after a restart. */
  const q2PartA = async () => {
    const win = await chrome.windows.create({
      url: [url("q2", 1), url("q2", 2)],
      focused: false,
    });
    await waitLoaded(win.id);
    await sleep(500);
    await chrome.windows.remove(win.id);
    await sleep(500);
    const session = await findClosedWindow(`q2-${stamp}`);
    return { leftBehind: Boolean(session), marker: `q2-${stamp}` };
  };

  /* Q2 part B — after the restart: is any probe window still in Recently closed? */
  const q2PartB = async () => {
    const closed = await chrome.sessions.getRecentlyClosed();
    const probes = closed.filter((s) =>
      s.window?.tabs?.some((t) => t.url?.includes("ct-probe=q2-")),
    );
    const result = {
      recentlyClosedEntries: closed.length,
      probeWindowsSurvived: probes.length,
    };
    console.log(JSON.stringify(result, null, 2));
    return result;
  };

  /*
   * Q3 — when an extension removes a group's tabs, does Chrome keep the group
   * as a saved group, or delete it? The API cannot read saved groups, so this
   * one needs your eyes afterwards: look for "CT probe 3" in Chrome's saved
   * tab groups (the bookmarks bar, or ⋮ → Tab groups).
   */
  const q3 = async () => {
    const win = await chrome.windows.create({
      url: [url("q3", 1), url("q3", 2), url("q3", 3)],
      focused: false,
    });
    const tabs = await waitLoaded(win.id);
    const groupId = await chrome.tabs.group({
      tabIds: [tabs[1].id, tabs[2].id],
      createProperties: { windowId: win.id },
    });
    await chrome.tabGroups.update(groupId, {
      title: "CT probe 3",
      color: "cyan",
    });
    await sleep(2000);
    await chrome.tabs.remove([tabs[1].id, tabs[2].id]);
    await sleep(500);
    await chrome.windows.remove(win.id);
    return {
      lookFor:
        'Is "CT probe 3" listed in ⋮ → Tab groups, or on the bookmarks bar?',
    };
  };

  /* Q4 — does getDevices() return anything on this profile? */
  const q4 = async () => {
    const devices = await chrome.sessions.getDevices();
    return devices.map((d) => ({
      device: "(name withheld)",
      windows: d.sessions.length,
      tabs: d.sessions.reduce((n, s) => n + (s.window?.tabs?.length ?? 0), 0),
    }));
  };

  const run = async () => {
    const result = {
      chrome: navigator.userAgent.match(/Chrome\/[\d.]+/)?.[0],
      q1: await q1().catch((e) => ({ error: String(e) })),
      q2PartA: await q2PartA().catch((e) => ({ error: String(e) })),
      q3: await q3().catch((e) => ({ error: String(e) })),
      q4: await q4().catch((e) => ({ error: String(e) })),
    };
    console.log(JSON.stringify(result, null, 2));
    return result;
  };

  return { run, q1, q2PartA, q2PartB, q3, q4 };
})();

await ctProbe.run();
