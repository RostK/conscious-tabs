import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { enqueueSnackbar } from "notistack";
import { useContext, useEffect } from "react";
import { describe, expect, it, vi } from "vitest";

import { installChrome } from "../../../test/chromeStub.ts";
import { SelectionContext, SelectionProvider } from "./SelectionContext.tsx";
import { SelectionToolbar } from "./SelectionToolbar.tsx";

vi.mock("notistack", () => ({
  enqueueSnackbar: vi.fn(),
}));

const tab = (id: number, windowId: number) =>
  ({
    id,
    index: 0,
    windowId,
    groupId: -1,
    title: `Tab ${id}`,
    url: `https://example.com/${id}`,
  }) as Partial<chrome.tabs.Tab>;

/** Puts tabs in the selection the way the rows do, newest first. */
const Select = ({ ids }: { ids: number[] }) => {
  const { dispatch } = useContext(SelectionContext);
  useEffect(() => {
    dispatch({ type: "set", data: ids });
  }, [dispatch, ids]);
  return null;
};

const IDS = [2, 1];

// Tabs are listed only from browsing windows, so the stub needs both.
const WINDOWS = [1, 2].map(
  (id) => ({ id, alwaysOnTop: false, type: "normal" }) as chrome.windows.Window,
);

const renderToolbar = () =>
  render(
    <SelectionProvider>
      <Select ids={IDS} />
      <SelectionToolbar />
    </SelectionProvider>,
  );

/** Group, then OK on the dialog it opens with a name and colour filled in. */
const groupSelection = async () => {
  const user = userEvent.setup();
  await user.click(await screen.findByRole("button", { name: "Group" }));
  await user.click(await screen.findByRole("button", { name: "OK" }));
};

/**
 * The toolbar's half of grouping: which window the group goes to, and when
 * the selection is let go. `groupTabs` itself is pinned in actions.test.ts.
 */
describe("grouping a selection", () => {
  it("groups in the window of the selection's lead tab, then clears it", async () => {
    const stub = installChrome({ windows: WINDOWS, tabs: [tab(1, 1), tab(2, 2)] });
    stub.tabs.group.mockResolvedValue(9);
    renderToolbar();

    await groupSelection();

    await waitFor(() => {
      expect(stub.tabs.group).toHaveBeenCalledWith({
        tabIds: IDS,
        // Tab 2 is selected[0], and it lives in window 2.
        createProperties: { windowId: 2 },
      });
    });
    // `hidden: true`, or this passes while the closing dialog still hides the
    // page from the accessibility tree, cleared or not.
    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: "Group", hidden: true }),
      ).toBeNull();
    });
  });

  it("keeps the selection when Chrome refuses, and says so", async () => {
    const stub = installChrome({ windows: WINDOWS, tabs: [tab(1, 1), tab(2, 2)] });
    stub.tabs.group.mockRejectedValue(new Error("refused"));
    renderToolbar();

    await groupSelection();

    await waitFor(() => {
      expect(enqueueSnackbar).toHaveBeenCalledWith("Couldn't group tabs", {
        variant: "error",
      });
    });
    // Found once the dialog has finished closing and handed the page back.
    expect(
      await screen.findByRole("button", { name: "Group" }),
    ).toBeInTheDocument();
  });
});
