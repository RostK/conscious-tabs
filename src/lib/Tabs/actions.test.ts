import { enqueueSnackbar } from "notistack";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { installChrome } from "../../test/chromeStub.ts";
import { groupTabs } from "./actions.ts";

vi.mock("notistack", () => ({
  enqueueSnackbar: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(enqueueSnackbar).mockClear();
});

describe("groupTabs", () => {
  /**
   * Left out, Chrome makes the group in the caller's window. From the float
   * that is the Picture-in-Picture window, which cannot hold groups, so the
   * Group button did nothing there at all.
   */
  it("makes the group in the window it is given, not the caller's", async () => {
    const stub = installChrome();
    stub.tabs.group.mockResolvedValue(7);

    const grouped = await groupTabs([3, 4], 2, {
      title: "Reading",
      color: "blue" as chrome.tabGroups.ColorEnum,
    });

    expect(grouped).toBe(true);
    expect(stub.tabs.group).toHaveBeenCalledWith({
      tabIds: [3, 4],
      createProperties: { windowId: 2 },
    });
    expect(stub.tabGroups.update).toHaveBeenCalledWith(7, {
      title: "Reading",
      color: "blue",
    });
  });

  it("says so when Chrome refuses, rather than nothing", async () => {
    const stub = installChrome();
    stub.tabs.group.mockRejectedValue(new Error("refused"));

    const grouped = await groupTabs([3], 2, {
      color: "grey" as chrome.tabGroups.ColorEnum,
    });

    expect(grouped).toBe(false);
    expect(stub.tabGroups.update).not.toHaveBeenCalled();
    expect(enqueueSnackbar).toHaveBeenCalledWith("Couldn't group tabs", {
      variant: "error",
    });
  });
});
