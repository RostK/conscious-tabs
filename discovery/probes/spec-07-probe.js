/*
 * Probe for SPEC-07 §13 (specs/tab-list/SPEC-07-2026-10-14-recently-closed-and-other-devices.md).
 * Q-A and Q-B block the spec's approval; the rest are recorded for the plan.
 *
 * Run it like sessions-probe.js: open Conscious Tabs in a full tab, F12,
 * paste this whole file, Enter. It opens small windows of example.com tabs
 * (marked `ct07` in their URLs), closes them in different ways, and reads
 * what Chrome recorded. It deletes the groups it makes, so no saved group is
 * left behind, but its closes do stay in History → Recently closed.
 *
 * ONE STEP NEEDS YOU (Q-B, by hand): partway through, a window of three
 * tabs opens and an alert asks you to close two of them yourself with their
 * tab's ×, one after the other, at your normal pace. The probe waits up to
 * 60 seconds for that, then carries on.
 *
 * Copy back the JSON it prints at the end. It contains no titles or URLs
 * of your own tabs, and no device names.
 *
 * Not covered: Q-D (stopping the float), Q-G (restoring a device's tab) and
 * Q-I (device tab order), which touch your own tabs or other devices. They
 * are optional; see the functions at the bottom.
 */
const ct07 = (() => {
  const stamp = Date.now();
  const url = (label, n) => `https://example.com/?ct07=${label}-${stamp}-${n}`;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const waitLoaded = async (windowId, timeoutMs = 20000) => {
    const until = Date.now() + timeoutMs;
    while (Date.now() < until) {
      const tabs = await chrome.tabs.query({ windowId });
      if (tabs.every((t) => t.status === "complete" && t.url)) return tabs;
      await sleep(250);
    }
    return chrome.tabs.query({ windowId });
  };

  const openWindow = async (label, count) => {
    const urls = Array.from({ length: count }, (_, i) => url(label, i));
    const win = await chrome.windows.create({ url: urls, focused: false });
    return { win, tabs: await waitLoaded(win.id) };
  };

  /** Recently closed entries whose tab (or any tab of whose window) carries `marker`. */
  const closedMatching = async (marker) =>
    (await chrome.sessions.getRecentlyClosed()).filter((s) =>
      (s.tab ? [s.tab] : s.window?.tabs ?? []).some((t) =>
        t.url?.includes(marker),
      ),
    );

  /** Close a probe window without leaving a saved group: groups' tabs first. */
  const cleanUp = async (windowId) => {
    try {
      const tabs = await chrome.tabs.query({ windowId });
      const grouped = tabs.filter((t) => t.groupId !== -1).map((t) => t.id);
      if (grouped.length > 0 && grouped.length < tabs.length) {
        await chrome.tabs.remove(grouped);
      }
      await chrome.windows.remove(windowId);
    } catch {
      /* already gone */
    }
  };

  const spread = (entries) => {
    if (entries.length === 0) return { entries: 0 };
    const times = entries.map((s) => s.lastModified);
    return {
      entries: entries.length,
      lastModifiedSpread: Math.max(...times) - Math.min(...times),
      distinctValues: new Set(times).size,
    };
  };

  /* Q-A — seconds or milliseconds? */
  const qA = async () => {
    const { win, tabs } = await openWindow("qa", 2);
    const before = Date.now();
    await chrome.tabs.remove(tabs[1].id);
    const after = Date.now();
    await sleep(300);
    const [entry] = await closedMatching(`qa-${stamp}-1`);
    await cleanUp(win.id);
    const lm = entry?.lastModified;
    return {
      lastModified: lm,
      dateNowAtClose: before,
      unit:
        lm === undefined
          ? "no entry"
          : Math.abs(lm - before / 1000) < 60
            ? "seconds"
            : Math.abs(lm - before) < 60000
              ? "milliseconds"
              : "neither",
      closeTookMs: after - before,
    };
  };

  /* Q-B (1) and Q-C, Q-H — a 24-tab group deleted the way SPEC-06's X does it. */
  const qB_group = async () => {
    const { win, tabs } = await openWindow("qbg", 25);
    const groupTabs = tabs.slice(1).map((t) => t.id);
    const groupId = await chrome.tabs.group({
      tabIds: groupTabs,
      createProperties: { windowId: win.id },
    });
    await chrome.tabGroups.update(groupId, { title: "CT07 B", color: "red" });
    await sleep(1000);
    const t0 = Date.now();
    await chrome.tabs.remove(groupTabs);
    const removeTookMs = Date.now() - t0;
    await sleep(500);
    const entries = await closedMatching(`qbg-${stamp}`);
    const qC = {
      groupIds: [...new Set(entries.map((s) => s.tab?.groupId))],
      windowEntries: entries.filter((s) => s.window).length,
    };

    // Q-H: restore the newest one alone. Does it come back inside a group?
    let qH;
    try {
      const restored = await chrome.sessions.restore(
        entries[0]?.tab?.sessionId,
      );
      await sleep(800);
      const tab = restored.tab && (await chrome.tabs.get(restored.tab.id));
      const group =
        tab && tab.groupId !== -1
          ? await chrome.tabGroups.get(tab.groupId)
          : undefined;
      qH = {
        grouped: Boolean(group),
        title: group?.title,
        color: group?.color,
        landedInProbeWindow: tab?.windowId === win.id,
      };
      if (tab && tab.windowId !== win.id) await chrome.tabs.remove(tab.id);
    } catch (e) {
      qH = { error: String(e) };
    }
    await cleanUp(win.id);
    return { qB: { ...spread(entries), removeTookMs }, qC, qH };
  };

  /* Q-B (2) — a 10-tab multi-select close, as the selection toolbar does it. */
  const qB_multi = async () => {
    const { win, tabs } = await openWindow("qbm", 11);
    const ids = tabs.slice(1).map((t) => t.id);
    await sleep(500);
    await chrome.tabs.remove(ids);
    await sleep(500);
    const entries = await closedMatching(`qbm-${stamp}`);
    await cleanUp(win.id);
    return spread(entries);
  };

  /* Q-B (3) — two closes made by hand, one after the other. Needs you. */
  const qB_hand = async () => {
    const { win } = await openWindow("qbh", 3);
    await chrome.windows.update(win.id, { focused: true });
    alert(
      "Conscious Tabs probe: in the window that just opened, close TWO of its " +
        "three example.com tabs with their ×, one after the other, at your " +
        "normal pace. Then come back here — the probe waits up to 60 seconds.",
    );
    const until = Date.now() + 60000;
    let entries = [];
    while (Date.now() < until) {
      entries = await closedMatching(`qbh-${stamp}`);
      if (entries.length >= 2) break;
      await sleep(500);
    }
    await cleanUp(win.id);
    return entries.length >= 2
      ? spread(entries.slice(0, 2))
      : { timedOut: true, entries: entries.length };
  };

  /* Q-E — where does a closed tab land once its window has closed too? */
  const qE = async () => {
    const { win, tabs } = await openWindow("qe", 2);
    await chrome.tabs.remove(tabs[1].id);
    await sleep(300);
    await chrome.windows.remove(win.id);
    await sleep(500);
    const entry = (await closedMatching(`qe-${stamp}-1`)).find((s) => s.tab);
    if (!entry) return { found: false };
    const known = new Set((await chrome.windows.getAll()).map((w) => w.id));
    const restored = await chrome.sessions.restore(entry.tab.sessionId);
    await sleep(800);
    const tab = await chrome.tabs.get(restored.tab.id);
    const landedWin = await chrome.windows.get(tab.windowId, {
      populate: true,
    });
    const result = {
      landedIn: known.has(tab.windowId) ? "an existing window" : "a new window",
      windowTabCount: landedWin.tabs.length,
    };
    if (known.has(tab.windowId)) await chrome.tabs.remove(tab.id);
    else await chrome.windows.remove(tab.windowId);
    return result;
  };

  /* Q-F and Q-J — restore one tab of a closed window alone; then the window. */
  const qFJ = async () => {
    const { win } = await openWindow("qf", 3);
    await sleep(300);
    await chrome.windows.remove(win.id);
    await sleep(500);
    const entry = (await closedMatching(`qf-${stamp}`)).find((s) => s.window);
    if (!entry) return { found: false };
    const innerId = entry.window.tabs?.[1]?.sessionId;

    let qF;
    try {
      const restored = await chrome.sessions.restore(innerId);
      await sleep(800);
      const windowId = restored.tab?.windowId ?? restored.window?.id;
      const count = (await chrome.tabs.query({ windowId })).length;
      qF = {
        innerTabHadSessionId: Boolean(innerId),
        restoredAs: restored.tab ? "one tab" : "the whole window",
        tabsInLandingWindow: count,
      };
      await chrome.windows.remove(windowId);
    } catch (e) {
      qF = { innerTabHadSessionId: Boolean(innerId), error: String(e) };
    }

    // Q-J: a fresh window, closed and restored whole.
    const second = await openWindow("qj", 2);
    await chrome.windows.remove(second.win.id);
    await sleep(500);
    const whole = (await closedMatching(`qj-${stamp}`)).find((s) => s.window);
    let qJ;
    try {
      const restored = await chrome.sessions.restore(whole.window.sessionId);
      qJ = { rejected: false };
      await sleep(800);
      await chrome.windows.remove(restored.window.id);
    } catch (e) {
      await sleep(1500);
      // Match patterns ignore the query string, so filter by hand.
      const back = (await chrome.tabs.query({})).filter((t) =>
        t.url?.includes(`qj-${stamp}`),
      );
      qJ = {
        rejected: true,
        error: String(e),
        restoredAnyway: back.length > 0,
      };
      if (back[0]) await chrome.windows.remove(back[0].windowId);
    }
    return { qF, qJ };
  };

  const run = async () => {
    const tryIt = (f) => f().catch((e) => ({ error: String(e) }));
    const group = await tryIt(qB_group);
    const result = {
      chrome: navigator.userAgent.match(/Chrome\/[\d.]+/)?.[0],
      platform: navigator.userAgentData?.platform ?? navigator.platform,
      date: new Date().toISOString(),
      qA: await tryIt(qA),
      qB: {
        group24: group.qB ?? group,
        multiSelect10: await tryIt(qB_multi),
        byHand2: await tryIt(qB_hand),
      },
      qC: group.qC,
      qE: await tryIt(qE),
      ...(await tryIt(qFJ)),
      qH: group.qH,
    };
    console.log(JSON.stringify(result, null, 2));
    return result;
  };

  /*
   * Optional, run by hand afterwards — they involve your own tabs or devices.
   *
   * Q-D: open the float, stop it (close the float window), then run
   *   await ct07.qD()      → whether a Picture-in-Picture entry was recorded
   * Q-G: await ct07.qG()   → restores the first web tab of your first other
   *   device here via sessions.restore, and reports whether it worked. It
   *   opens one of your own tabs in this window.
   * Q-I: await ct07.qI()   → prints, to this console only, the titles of
   *   your first other device's first window, to compare with that device's
   *   tab strip by eye. Answer yes/no; don't paste the titles.
   */
  const qD = async () => {
    const [newest] = await chrome.sessions.getRecentlyClosed({ maxResults: 1 });
    const tabs = newest?.tab ? [newest.tab] : newest?.window?.tabs ?? [];
    return {
      newestIsExtensionPage: tabs.some((t) =>
        t.url?.startsWith(`chrome-extension://${chrome.runtime.id}`),
      ),
      kind: newest?.tab ? "tab" : newest?.window ? "window" : "none",
    };
  };
  const qG = async () => {
    const [device] = await chrome.sessions.getDevices();
    const tab = device?.sessions
      .flatMap((s) => s.window?.tabs ?? (s.tab ? [s.tab] : []))
      .find((t) => /^https?:/.test(t.url ?? ""));
    if (!tab) return { found: false };
    try {
      const restored = await chrome.sessions.restore(tab.sessionId);
      return { accepted: true, restoredAs: restored.tab ? "tab" : "window" };
    } catch (e) {
      return { accepted: false, error: String(e) };
    }
  };
  const qI = async () => {
    const [device] = await chrome.sessions.getDevices();
    const tabs = device?.sessions[0]?.window?.tabs ?? [];
    console.table(tabs.map((t) => ({ index: t.index, title: t.title })));
    return "Compare the table above with that device's tab strip.";
  };

  return { run, qA, qB_group, qB_multi, qB_hand, qE, qFJ, qD, qG, qI };
})();

await ct07.run();
