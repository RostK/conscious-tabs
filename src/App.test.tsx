import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import App from "./App.tsx";
import { reportFloatSearch } from "./lib/float";
import { Theme } from "./lib/Theme";
import { installChrome } from "./test/chromeStub.ts";

vi.mock("./lib/float", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./lib/float")>()),
  reportFloatSearch: vi.fn(),
}));

const WINDOWS: Partial<chrome.windows.Window>[] = [
  { id: 1, alwaysOnTop: false, type: "normal", focused: true },
];

const tab = (over: Partial<chrome.tabs.Tab> = {}) =>
  ({
    id: 1,
    index: 0,
    windowId: 1,
    groupId: -1,
    active: false,
    highlighted: false,
    title: "A tab",
    url: "https://example.com/",
    ...over,
  }) as chrome.tabs.Tab;

const TABS = [
  tab({ id: 1, index: 0, title: "First tab" }),
  tab({ id: 2, index: 1, title: "The one in front", active: true }),
  tab({ id: 3, index: 2, title: "Third tab" }),
];

const atHost = (search: string) =>
  window.history.replaceState(null, "", search);

const mountApp = async () => {
  const view = render(
    <Theme>
      <App />
    </Theme>,
  );
  await waitFor(() => expect(chrome.tabs.query).toHaveBeenCalled());
  // Waited on by attribute, not by text: the active tab's title is rendered
  // twice — once by `CurrentTab` above the list and once as its row — so
  // findByText would throw on the duplicate rather than wait for the list.
  await waitFor(() =>
    expect(document.querySelectorAll("[data-tab-row]").length).toBeGreaterThan(
      0,
    ),
  );
  return view;
};

beforeEach(() => {
  installChrome({ windows: WINDOWS, tabs: TABS });
});

/**
 * The first tests to mount `App` at all.
 *
 * Initial focus used to be claimed in two places — `App` had none, and
 * `TabDisplay` autofocused the active tab's row — which is why these assert
 * that a row was *never asked* for focus rather than merely that it does not
 * have it. The end state looks identical either way while both still fire.
 */
describe("where the caret goes when a surface opens", () => {
  it("lands in the search field", async () => {
    await mountApp();

    expect(document.activeElement).toBe(screen.getByLabelText("search"));
  });

  // AC-12: the measurable form of "lands in the field" is that what you type
  // arrives there, without a click first.
  it("takes what the user types without a click first", async () => {
    await mountApp();

    await userEvent.keyboard("doc");

    expect(screen.getByLabelText("search")).toHaveValue("doc");
  });

  /**
   * AC-11. `GroupListItem` never forwarded the `focus` prop, so a grouped
   * active tab autofocused even in search results — the prop was silently
   * wrong at one of its two call sites. It is deleted rather than threaded:
   * a contract nobody can see is not a contract.
   */
  it("never asks a row for focus", async () => {
    const focus = vi.spyOn(HTMLElement.prototype, "focus");

    await mountApp();

    const rowsFocused = focus.mock.instances.filter(
      (element) =>
        element instanceof HTMLElement && element.matches("[data-tab-row]"),
    );
    expect(rowsFocused).toEqual([]);
  });
});

describe("one Down from the field", () => {
  // AC-14. Landing on the tab the user is already looking at is what the old
  // autofocus was for; it survives, one key press later and without the race.
  it("lands on the active tab's row, not the first one", async () => {
    await mountApp();

    await userEvent.keyboard("{ArrowDown}");

    expect(document.activeElement).toHaveAttribute("data-active-tab");
    expect(document.activeElement).toHaveTextContent("The one in front");
  });

  it("lands on the first row when no tab is active", async () => {
    installChrome({
      windows: WINDOWS,
      tabs: [tab({ id: 1, title: "Only tab" })],
    });
    await mountApp();

    await userEvent.keyboard("{ArrowDown}");

    expect(document.activeElement).toHaveAttribute("data-tab-row");
  });

  // The field keeps every other key. A modified Down is somebody else's.
  it("leaves a modified Down alone", async () => {
    await mountApp();
    const field = screen.getByLabelText("search");

    await userEvent.keyboard("{Shift>}{ArrowDown}{/Shift}");

    expect(document.activeElement).toBe(field);
  });
});

/**
 * AC-28. Every surface, not just the one the tests happen to mount. The float
 * is a ~400px window and the anchor is an ordinary tab; the side panel is the
 * only one whose focus behaviour Chrome decides for us, and it is the one that
 * measured "no".
 */
describe("in every surface", () => {
  it.each([
    ["the side panel", "/"],
    ["the anchor tab", "/?host=anchor"],
    ["the float", "/?host=float"],
  ])("puts the caret in the field in %s", async (_label, url) => {
    atHost(url);

    await mountApp();

    expect(document.activeElement).toBe(screen.getByLabelText("search"));
  });

  /**
   * AC-15, a regression guard rather than new behaviour. The float reports its
   * search to the anchor so closing it does not drop you on an unfiltered list
   * — but never on mount, which would hand the anchor an empty search the user
   * never typed. Focusing a field changes no value, and this is what says so.
   */
  it("does not report an empty search just because the float opened", async () => {
    atHost("/?host=float");

    await mountApp();

    expect(reportFloatSearch).not.toHaveBeenCalled();
  });
});
