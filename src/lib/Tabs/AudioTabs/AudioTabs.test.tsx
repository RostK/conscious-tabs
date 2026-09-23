import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { installChrome } from "../../../test/chromeStub.ts";
import { AudioTabs } from "./index.tsx";

const WINDOWS: Partial<chrome.windows.Window>[] = [
  { id: 1, alwaysOnTop: false, type: "normal" },
];

const tab = (over: Partial<chrome.tabs.Tab> = {}) =>
  ({
    id: 1,
    index: 0,
    windowId: 1,
    groupId: -1,
    active: false,
    title: "Example",
    url: "https://example.com/",
    ...over,
  }) as Partial<chrome.tabs.Tab>;

const speaker = () => screen.queryByLabelText("tabs playing sound");

beforeEach(() => {
  installChrome({ windows: WINDOWS });
});

/**
 * The speaker counts every tab making sound — including the one you are
 * looking at.
 *
 * It used to exclude the active tab of the user's window, which meant the
 * control named "tabs playing sound" hid itself the moment the tab in front of
 * you started playing, and reappeared only when you switched away. RostK hit
 * exactly that and read it as the toolbar failing to update.
 */
describe("the toolbar speaker", () => {
  it("stays away while everything is quiet", async () => {
    installChrome({ windows: WINDOWS, tabs: [tab(), tab({ id: 2 })] });

    render(<AudioTabs />);

    await waitFor(() => expect(speaker()).toBeNull());
  });

  it("appears when the active tab is the only one making sound", async () => {
    installChrome({
      windows: WINDOWS,
      tabs: [tab({ active: true, audible: true }), tab({ id: 2 })],
    });

    render(<AudioTabs />);

    await waitFor(() => expect(speaker()).not.toBeNull());
    expect(speaker()).toHaveTextContent("1");
  });

  it("counts the active tab alongside the others", async () => {
    installChrome({
      windows: WINDOWS,
      tabs: [
        tab({ active: true, audible: true }),
        tab({ id: 2, audible: true }),
        tab({ id: 3 }),
      ],
    });

    render(<AudioTabs />);

    await waitFor(() => expect(speaker()).toHaveTextContent("2"));
  });

  // A muted tab reports audible: false, so muted alone has to keep it listed —
  // otherwise muting a tab would remove the way to unmute it.
  it("keeps a muted tab, and offers to unmute when all of them are", async () => {
    installChrome({
      windows: WINDOWS,
      tabs: [tab({ active: true, mutedInfo: { muted: true } })],
    });

    render(<AudioTabs />);

    await waitFor(() => expect(speaker()).not.toBeNull());
    speaker()!.click();
    expect(await screen.findByText("Unmute all")).toBeInTheDocument();
  });
});
