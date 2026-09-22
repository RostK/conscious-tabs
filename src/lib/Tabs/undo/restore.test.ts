import { beforeEach, describe, expect, it } from "vitest";

import {
  ChromeStub,
  extensionUrl,
  installChrome,
} from "../../../test/chromeStub.ts";
import { restoreSessions } from "./restore.ts";

const session = (sessionId: string): chrome.sessions.Session =>
  ({ tab: { sessionId } }) as chrome.sessions.Session;

const inFloat = () => {
  window.history.replaceState(null, "", "/?host=float");
};

/** One real browser window, plus the window holding our anchor tab. */
const twoWindows = (): ChromeStub =>
  installChrome({
    windows: [{ id: 3 }, { id: 1 }],
    tabs: [
      {
        id: 30,
        windowId: 3,
        active: true,
        url: extensionUrl("index.html?host=anchor"),
      },
      { id: 10, windowId: 1, active: true, url: "https://example.com/" },
    ],
  });

let chrome: ChromeStub;

beforeEach(() => {
  chrome = twoWindows();
  chrome.windows.getLastFocused.mockResolvedValue({
    // The anchor's window was focused most recently: it is where the user
    // clicked "Float on top" on their way out to the floating window.
    id: 3,
  } as chrome.windows.Window);
});

describe("restoreSessions", () => {
  it("restores every session, oldest first", async () => {
    inFloat();
    await restoreSessions([session("newest"), session("oldest")]);

    expect(chrome.sessions.restore.mock.calls.map(([id]) => id)).toEqual([
      "oldest",
      "newest",
    ]);
  });

  // The defect: restoring steals focus, so the user is put back deliberately
  // -- and "back" used to resolve through getLastFocused(), which from the
  // float is the extension's own tab.
  it("returns the user to their own window, never to ours", async () => {
    inFloat();
    await restoreSessions([session("a")]);

    expect(chrome.windows.update).toHaveBeenCalledWith(1, { focused: true });
    expect(chrome.windows.update).not.toHaveBeenCalledWith(3, {
      focused: true,
    });
  });

  it("re-activates the tab the user was actually on", async () => {
    inFloat();
    await restoreSessions([session("a")]);

    expect(chrome.tabs.update).toHaveBeenCalledWith(10, { active: true });
    expect(chrome.tabs.update).not.toHaveBeenCalledWith(30, { active: true });
  });

  it("still restores when there is no user window to return to", async () => {
    inFloat();
    chrome = installChrome({
      windows: [{ id: 3 }],
      tabs: [
        {
          id: 30,
          windowId: 3,
          active: true,
          url: extensionUrl("index.html?host=anchor"),
        },
      ],
    });
    chrome.windows.getLastFocused.mockResolvedValue({
      id: 3,
    } as chrome.windows.Window);

    await restoreSessions([session("a")]);

    expect(chrome.sessions.restore).toHaveBeenCalledWith("a");
    expect(chrome.windows.update).not.toHaveBeenCalled();
  });

  it("ignores a session entry carrying no id", async () => {
    inFloat();
    await restoreSessions([{} as chrome.sessions.Session]);
    expect(chrome.sessions.restore).not.toHaveBeenCalled();
  });
});
