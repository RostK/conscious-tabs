import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { EXTENSION_ORIGIN, installChrome } from "../../../test/chromeStub.ts";
import { DragHandle } from "../elements/DragHandle.tsx";
import { setRowDragActive } from "../elements/rowControls.ts";
import { SelectionProvider } from "../selection";
import { TabItem } from "../types.ts";
import { TabDisplay } from "./TabDisplay.tsx";
import { TabListItem } from "./TabListItem.tsx";

const tab = (over: Partial<TabItem> = {}): TabItem => ({
  type: "tab",
  id: 1,
  index: 0,
  windowId: 1,
  groupId: -1,
  active: false,
  highlighted: false,
  title: "Example",
  url: "https://example.com/",
  ...over,
});

// The real handle, built the way TabListItem builds it — labelled for its tab,
// and given `edge="end"` at its source — so a stand-in would test nothing.
const handleFor = (title: string) => (
  <DragHandle
    edge="end"
    label={`Reorder ${title}`}
    setActivatorNodeRef={() => undefined}
    attributes={{
      role: "button",
      tabIndex: 0,
      "aria-disabled": false,
      "aria-pressed": undefined,
      "aria-roledescription": "draggable",
      "aria-describedby": "DndDescribedBy-0",
    }}
  />
);

const renderTab = (item: TabItem) =>
  render(
    <SelectionProvider>
      <TabDisplay tab={item} dragHandle={handleFor(item.title || "tab")} />
    </SelectionProvider>,
  );

beforeEach(() => {
  installChrome();
  setRowDragActive(false);
});

/**
 * AC-26 / NFR-4. Every tab title and URL is a string an arbitrary web page
 * chose, and the float renders them in a window that sits on top of every
 * other application — which is precisely why Chrome refuses to let extensions
 * make an always-on-top window of their own. A title that could inject markup
 * would be a spoofing surface with unusually good placement.
 *
 * React escapes by default, so this is a regression guard rather than a fix:
 * it fails the day someone reaches for dangerouslySetInnerHTML.
 */
/**
 * Measured in the layout harness at the float's width, 2026-09-30: of the close
 * button's 37 pixels, **11 were clickable**. The row's text spans the whole row,
 * controls included, and the tail mask makes it a stacking context that
 * hit-tests above the absolutely positioned buttons — so the icon was drawn
 * where the pointer could not reach it, which reads as a broken button rather
 * than a hidden one.
 *
 * jsdom lays nothing out, so the proportion cannot be re-measured here. What is
 * guarded is the rule that makes it true, which is the part an edit removes.
 */
describe("whether a row's controls can actually be clicked", () => {
  it("refuses pointer events on the text that covers them", () => {
    const { container } = renderTab(tab());

    const text = container.querySelector(".MuiListItemText-root");

    expect(text).not.toBeNull();
    expect(getComputedStyle(text as Element).pointerEvents).toBe("none");
  });

  /**
   * The select checkbox began at `left: -8`, so eight of its thirty-seven
   * pixels sat outside the viewport — invisible as a fault, because the glyph
   * inside the button was still fully drawn.
   */
  it("keeps the select control inside the row", () => {
    const { container } = renderTab(tab());

    const select = container.querySelector('[aria-label="Select Example"]');
    const left = getComputedStyle(select as Element).left;

    expect(left.startsWith("-")).toBe(false);
  });
});

describe("a tab title supplied by a web page", () => {
  it("renders markup as text, never as elements", () => {
    const { container } = renderTab(
      tab({ title: '<img src=x onerror="alert(1)">Totally normal page' }),
    );

    // Every image in a row is the favicon, served from our own origin
    // (SPEC-03). This used to assert no <img> at all, which stopped meaning
    // anything the moment rows legitimately had one — an injected element
    // would have gone unnoticed behind a passing test. Asserting the origin
    // instead keeps the question the same: is any element here from
    // somewhere we did not put it?
    const images = [...container.querySelectorAll("img")];
    expect(images.length).toBeGreaterThan(0);
    images.forEach((image) => {
      expect(image.getAttribute("src")).toMatch(EXTENSION_ORIGIN);
    });
    expect(
      screen.getByText(/Totally normal page/, { exact: false }),
    ).toBeInTheDocument();
  });

  /**
   * SPEC-04 AC-24 / §11: the same guard, for the names. A title is now handed to
   * `aria-label` six times over — the toolbar, select, mute, close, reorder —
   * and shown as text, and its URL is shown as the secondary line and parsed
   * for the host. Each is a string given to a sink that treats it as one; this
   * is what says so, with a title and an address that are as hostile as a page
   * can make them. Noisy, so the mute control is in the census too.
   */
  it("carries a hostile title and address as literal text in every name and in the row", () => {
    const title = '"><img src=x onerror=alert(1)>';
    // `&`, `#` and a quote: each one means something to a query string, a
    // fragment or an attribute, and none of them is allowed to mean it here.
    const url = 'https://example.com/a?x=1&y=2#frag"quote';

    // What an ordinary tab renders: the structure the hostile one must not grow.
    const plain = renderTab(tab({ title: "Plain", url, audible: true }));
    const plainElements = [...plain.container.querySelectorAll("*")].map(
      (element) => element.tagName,
    );
    const plainImages = plain.container.querySelectorAll("img").length;
    plain.unmount();

    const { container } = renderTab(tab({ title, url, audible: true }));
    const row = container.querySelector(".MuiListItemButton-root") as HTMLElement;

    // The toolbar: the title, verbatim, the host the URL parsed to, the state.
    expect(row).toHaveAttribute("aria-label", `${title}, example.com, playing audio`);
    expect(row).toHaveAccessibleName(`${title}, example.com, playing audio`);

    // Every other control that says the title, says exactly it and nothing more.
    const names = [...row.querySelectorAll<HTMLElement>("[data-row-control]")]
      .map((control) => control.getAttribute("aria-label"))
      .filter((name) => name !== "Switch");
    expect(names).toEqual([
      `Select ${title}`,
      `Mute ${title}`,
      `Close ${title}`,
      `Reorder ${title}`,
    ]);

    // No element was made of it: the row has the tags a plain row has, and no
    // attribute anywhere is an event handler or the `src=x` it tried to plant.
    expect([...container.querySelectorAll("*")].map((e) => e.tagName)).toEqual(
      plainElements,
    );
    container.querySelectorAll("*").forEach((element) => {
      [...element.attributes].forEach(({ name }) => {
        expect(name.toLowerCase().startsWith("on")).toBe(false);
      });
    });
    expect(document.querySelector('[src="x"]')).toBeNull();

    // Every image is the favicon, from our own origin, and there is no more of
    // them than a plain row has.
    const images = [...container.querySelectorAll("img")];
    expect(images).toHaveLength(plainImages);
    expect(images.length).toBeGreaterThan(0);
    images.forEach((image) => {
      expect(image.getAttribute("src")).toMatch(EXTENSION_ORIGIN);
    });

    // And both are on screen as the characters they are. The secondary line is
    // the URL without its scheme, so it is compared to that.
    expect(row).toHaveTextContent(title);
    expect(row).toHaveTextContent(url.replace("https://", ""));
  });

  it("does not let a page-supplied URL become a link", () => {
    const { container } = renderTab(
      tab({ url: "javascript:alert(1)", title: "Click me" }),
    );

    // Nothing in a row navigates anywhere: activation goes through
    // chrome.tabs.update with a tab id, never through an href.
    expect(container.querySelector("a")).toBeNull();
    expect(container.querySelector("[href]")).toBeNull();
  });

  it("survives control characters and right-to-left overrides", () => {
    const { container } = renderTab(tab({ title: "sloppy\u202egnp.exe\u0000\u0007 name" }));

    expect(container.textContent).toContain("sloppy");
    expect(container.querySelector("script")).toBeNull();
  });

  // E-10: empty, and absurdly long.
  it("renders an untitled tab without collapsing the row", () => {
    const { container } = renderTab(tab({ title: "" }));
    expect(container.querySelector(".MuiListItemButton-root")).not.toBeNull();
  });

  it("renders a very long title without throwing", () => {
    const { container } = renderTab(tab({ title: "no ".repeat(3000) }));
    expect(container.querySelector(".MuiListItemButton-root")).not.toBeNull();
  });
});

/**
 * The row's keyboard model, which broke twice before it worked.
 *
 * **What these cannot catch, stated plainly.** The bug that actually shipped
 * was that `visibility: hidden` removes an element from `focus()` entirely, so
 * arrowing onto a hidden control silently did nothing. jsdom does not model
 * that — it will happily focus a visually hidden element — so these tests pass
 * against the broken version too. They guard the structure and the handler;
 * only a real browser guards the hiding mechanism. That is the argument for
 * the layout harness, not against these.
 */
describe("keyboard navigation within a row", () => {
  const rowOf = (container: HTMLElement) =>
    container.querySelector(".MuiListItemButton-root") as HTMLElement;

  const controlsOf = (row: HTMLElement) => [
    ...row.querySelectorAll<HTMLElement>("[data-row-control]"),
  ];

  /** The row's first control, and its only Tab stop. */
  const primaryOf = (row: HTMLElement) =>
    row.querySelector<HTMLElement>("[data-tab-row]")!;

  // The names a tab's controls carry, in the order the walk visits them.
  const walkNames = (row: HTMLElement) =>
    controlsOf(row).map((control) => control.getAttribute("aria-label"));

  // R-3: MUI's ButtonBase gives a non-button component role="button" and then
  // spreads the caller's props after it, so an explicit role wins. That is a
  // reading of the installed source, not a promise — this is what says so if an
  // upgrade reverses the order. Asserted on the rendered element, not the props.
  it("is a toolbar that never takes focus itself, named for its tab", () => {
    const row = rowOf(renderTab(tab({ title: "Example page" })).container);

    expect(row).toHaveAttribute("role", "toolbar");
    expect(row).toHaveAttribute("tabindex", "-1");
    // AC-29: the subject, and where it lives.
    expect(row).toHaveAttribute("aria-label", "Example page, example.com");
    expect(screen.getAllByRole("toolbar")).toHaveLength(1);
  });

  it("names an untitled or unparseable tab rather than leaving the toolbar blank", () => {
    const { container, unmount } = renderTab(tab({ title: "", url: "" }));
    expect(rowOf(container)).toHaveAttribute("aria-label", "tab");
    unmount();

    const again = renderTab(tab({ title: "Odd", url: "not a url" }));
    expect(rowOf(again.container)).toHaveAttribute(
      "aria-label",
      "Odd, not a url",
    );
  });

  it("is one tab stop — its primary action — with every other control outside the tab order", () => {
    const row = rowOf(renderTab(tab()).container);
    const primary = primaryOf(row);

    expect(primary).toHaveAttribute("tabindex", "0");
    expect(primary).toHaveAttribute("data-row-control");
    const stops = [...row.querySelectorAll("[tabindex='0']")];
    expect(stops).toEqual([primary]);

    const others = controlsOf(row).filter((control) => control !== primary);
    expect(others.length).toBeGreaterThan(0);
    others.forEach((control) => {
      expect(control).toHaveAttribute("tabindex", "-1");
    });
  });

  // AC-10 by construction: the only Tab stop is not inside `.itemAction`, the
  // class `rowControlsSx` gives `opacity: 0`, so it can never be an invisible
  // stop. Asserted as structure because jsdom cannot arbitrate the computed
  // style (LEARNINGS 2026-09-28 on what `sx` testing can and cannot answer).
  it("keeps its tab stop out of the hidden group", () => {
    const row = rowOf(renderTab(tab()).container);

    expect(primaryOf(row).closest(".itemAction")).toBeNull();
  });

  // D-3: App lands the search field's Down on these, so they have to sit on
  // something that can take focus, and the row no longer can.
  it("carries the markers App reads on its primary action, not on the row", () => {
    const row = rowOf(renderTab(tab({ active: true })).container);
    const primary = primaryOf(row);

    expect(primary).toHaveAttribute("data-active-tab");
    expect(row).not.toHaveAttribute("data-tab-row");
    expect(row).not.toHaveAttribute("data-active-tab");
    primary.focus();
    expect(document.activeElement).toBe(primary);
  });

  // AC-30, AC-9: activate, select, (mute), close, reorder.
  it("orders its controls activate, select, close, reorder — mute before close when there is one", () => {
    const silent = rowOf(renderTab(tab()).container);
    expect(walkNames(silent)).toEqual([
      "Switch",
      "Select Example",
      "Close Example",
      "Reorder Example",
    ]);
  });

  it("puts mute between select and close on a noisy tab", () => {
    const noisy = rowOf(renderTab(tab({ audible: true })).container);
    expect(walkNames(noisy)).toEqual([
      "Switch",
      "Select Example",
      "Mute Example",
      "Close Example",
      "Reorder Example",
    ]);
  });

  it("walks its controls with Right and back with Left", () => {
    const row = rowOf(renderTab(tab({ audible: true })).container);
    const controls = controlsOf(row);

    primaryOf(row).focus();
    expect(document.activeElement).toBe(controls[0]);

    controls.slice(1).forEach((control) => {
      fireEvent.keyDown(document.activeElement!, { key: "ArrowRight" });
      expect(document.activeElement).toBe(control);
    });

    [...controls]
      .reverse()
      .slice(1)
      .forEach((control) => {
        fireEvent.keyDown(document.activeElement!, { key: "ArrowLeft" });
        expect(document.activeElement).toBe(control);
      });
    expect(document.activeElement).toBe(primaryOf(row));
  });

  // Wrapping would move focus to a different row's control, which reads as
  // the list jumping about.
  it("stops dead at both ends rather than wrapping", () => {
    const row = rowOf(renderTab(tab()).container);
    const controls = controlsOf(row);
    const primary = primaryOf(row);

    primary.focus();
    fireEvent.keyDown(primary, { key: "ArrowLeft" });
    expect(document.activeElement).toBe(primary);

    controls.slice(1).forEach(() => {
      fireEvent.keyDown(document.activeElement!, { key: "ArrowRight" });
    });
    const last = document.activeElement;
    expect(last).toBe(controls[controls.length - 1]);
    fireEvent.keyDown(last!, { key: "ArrowRight" });
    expect(document.activeElement).toBe(last);
  });

  // AC-30: the handle is the final control, so a keyboard user reaching the end
  // of the walk is on the reorder control and nothing after it.
  it("ends on the drag handle", () => {
    const row = rowOf(renderTab(tab({ audible: true })).container);
    const controls = controlsOf(row);

    expect(controls[controls.length - 1]).toHaveAttribute(
      "aria-label",
      "Reorder Example",
    );
    // `edge="end"` moved onto it from Close.
    expect(controls[controls.length - 1]).toHaveClass("MuiIconButton-edgeEnd");
    expect(
      row.querySelector('[aria-label="Close Example"]'),
    ).not.toHaveClass("MuiIconButton-edgeEnd");
  });

  // The fixture above hands TabDisplay a handle that already has its edge, so
  // it cannot say where the edge comes from. This is the row as the list builds
  // it: TabListItem builds the handle, and it is the one that sets `edge="end"`.
  it("gets the handle's edge from TabListItem, which builds the handle", () => {
    const { container } = render(
      <SelectionProvider>
        <TabListItem tab={tab({ audible: true })} />
      </SelectionProvider>,
    );
    const row = rowOf(container);
    const controls = controlsOf(row);

    expect(controls[controls.length - 1]).toHaveAttribute(
      "aria-label",
      "Reorder Example",
    );
    expect(controls[controls.length - 1]).toHaveClass("MuiIconButton-edgeEnd");
    expect(
      controls.filter((control) =>
        control.classList.contains("MuiIconButton-edgeEnd"),
      ),
    ).toHaveLength(1);
  });

  // Home and End are the page's; they must not become a way along the row.
  it("does not move on Home or End", () => {
    const row = rowOf(renderTab(tab()).container);
    const primary = primaryOf(row);

    primary.focus();
    ["Home", "End"].forEach((key) => {
      fireEvent.keyDown(primary, { key });
      expect(document.activeElement).toBe(primary);
    });
    const [, second] = controlsOf(row);
    second.focus();
    ["Home", "End"].forEach((key) => {
      fireEvent.keyDown(second, { key });
      expect(document.activeElement).toBe(second);
    });
  });

  // AC-36: a fixed stop, not a remembered one. Leave from the middle of the
  // row, and Shift+Tab back lands on the first control, not where you were.
  it("returns to its primary action after Tab away and Shift+Tab back", async () => {
    const user = userEvent.setup();
    const { container } = renderTab(tab());
    const row = rowOf(container);
    const primary = primaryOf(row);
    const outside = document.createElement("button");
    document.body.append(outside);

    try {
      primary.focus();
      fireEvent.keyDown(primary, { key: "ArrowRight" });
      expect(document.activeElement).not.toBe(primary);

      // Nothing else in the row is a stop, so Tab from a secondary control
      // leaves the row for `outside`, and Shift+Tab re-enters at the one stop
      // it has.
      await user.tab();
      expect(document.activeElement).toBe(outside);
      await user.tab({ shift: true });
      expect(document.activeElement).toBe(primary);
    } finally {
      // Not left behind for the next test's Tab order when an assertion above
      // fails, which is exactly when it would matter.
      outside.remove();
    }
  });

  // The primary button has no focus style of its own; what the keyboard user
  // sees is the row's, which learns of the focus from the event bubbling up.
  // Nothing else checks that dependency: give the button its own outline, or
  // stop the event, and the row's indicator quietly disappears.
  it("lights the row's own focus indicator when the primary action takes keyboard focus", async () => {
    const user = userEvent.setup();
    const { container } = renderTab(tab());
    const row = rowOf(container);

    expect(row).not.toHaveClass("Mui-focusVisible");
    await user.tab();

    expect(document.activeElement).toBe(primaryOf(row));
    expect(row).toHaveClass("Mui-focusVisible");
  });

  // Enter and Space belong to the primary button and to dnd-kit's drag; the
  // row handler may claim only the arrows.
  it("leaves other keys alone", () => {
    const row = rowOf(renderTab(tab()).container);
    const primary = primaryOf(row);

    primary.focus();
    // ArrowUp is bound, but only to the search field, which is not here.
    ["Enter", " ", "ArrowDown", "ArrowUp", "Tab"].forEach((key) => {
      fireEvent.keyDown(primary, { key });
      expect(document.activeElement).toBe(primary);
    });
  });

  /**
   * While a drag is live the arrows are dnd-kit's. A tab row unmounts when it
   * is picked up, so this never bit here — but group rows stay mounted, and
   * there the row was stealing the first arrow press, moving focus off the
   * drag handle and stopping the event before the KeyboardSensor saw it.
   */
  it("leaves the arrows to a drag in progress", () => {
    setRowDragActive(true);

    const row = rowOf(renderTab(tab()).container);
    const [control] = controlsOf(row);
    control.focus();

    fireEvent.keyDown(control, { key: "ArrowRight" });

    expect(document.activeElement).toBe(control);
  });

  it("takes them back once the drag is over", () => {
    setRowDragActive(false);

    const row = rowOf(renderTab(tab()).container);
    const [control] = controlsOf(row);
    control.focus();

    fireEvent.keyDown(control, { key: "ArrowRight" });

    expect(document.activeElement).not.toBe(control);
  });

  // AC-6 as amended by AM-3: a name that says "Select tab" is the same name on
  // every row, which is no name at all to someone moving through twenty of them.
  // The one exception is the primary, which the row's own name stands in for —
  // it is announced on entry, so the title said again would be heard twice.
  // Noisy, so the mute control is in the census too.
  it("names every control it can reach after its tab, bar the primary", () => {
    const row = rowOf(
      renderTab(tab({ title: "Example page", audible: true })).container,
    );

    const names = walkNames(row);
    expect(names).toEqual([
      "Switch",
      "Select Example page",
      "Mute Example page",
      "Close Example page",
      "Reorder Example page",
    ]);
    names
      .filter((name) => name !== "Switch")
      .forEach((name) => expect(name).toContain("Example page"));
    // The subject is spoken once, by the toolbar the primary sits in.
    expect(row.getAttribute("aria-label")).toContain("Example page");

    // The same, untitled: the fallback is the one word the other controls use.
    const bare = rowOf(renderTab(tab({ title: "", audible: true })).container);
    walkNames(bare)
      .filter((name) => name !== "Switch")
      .forEach((name) => expect(name).toContain("tab"));
    expect(walkNames(bare)).toContain("Select tab");

    controlsOf(row).forEach((control) => {
      expect(control.getAttribute("aria-label")).toBeTruthy();
    });
    expect(primaryOf(row)).toHaveAttribute("aria-label", "Switch");
  });
});

/**
 * The "where it lives" half of the toolbar's name is spoken every time focus
 * enters the row, so it has to be short. A URL with no hostname used to fall
 * back to the whole URL: a `data:` tab would read out its entire payload, and
 * an extension page its 32-character id.
 */
describe("the toolbar's name says where the tab lives, briefly", () => {
  const nameOf = (over: Partial<TabItem>) => {
    const { container, unmount } = renderTab(tab({ title: "Page", ...over }));
    const name = container
      .querySelector(".MuiListItemButton-root")!
      .getAttribute("aria-label");
    unmount();
    return name;
  };

  it.each([
    ["http", "http://sub.example.org:8080/a?b=c", "Page, sub.example.org"],
    ["https", "https://example.com/some/path", "Page, example.com"],
    ["chrome://", "chrome://settings", "Page, settings"],
    ["blob with a host", "blob:https://example.com/0b1c2d3e", "Page, example.com"],
    ["blob with no host", "blob:null/0b1c2d3e", "Page, blob"],
    ["about", "about:blank", "Page, about"],
    ["file", "file:///C:/Users/someone/a.pdf", "Page, file"],
    [
      "an extension page",
      "chrome-extension://abcdefghijklmnopabcdefghijklmnop/index.html",
      "Page, extension",
    ],
  ])("%s", (_kind, url, expected) => {
    expect(nameOf({ url })).toBe(expected);
  });

  it("never speaks a data: payload", () => {
    const payload = "A".repeat(4000);
    const name = nameOf({ url: `data:text/html;base64,${payload}` });

    expect(name).toBe("Page, data");
    expect(name).not.toContain("AAAA");
  });

  it("caps a URL it cannot parse at 60 characters", () => {
    const junk = "x".repeat(200);

    expect(nameOf({ url: junk })).toBe(`Page, ${"x".repeat(60)}…`);
    // Short enough to say whole is said whole.
    expect(nameOf({ url: "not a url" })).toBe("Page, not a url");
  });

  it("has nothing to add for a tab with no URL", () => {
    expect(nameOf({ url: undefined })).toBe("Page");
  });
});

/**
 * SPEC-04 AM-3 / AC-29. A tab row says its title once and first, then where it
 * lives, then the state Chrome's own tab strip does not report. ", n of N" is
 * RowList's, appended after commit, so it is absent here on purpose: this is
 * the name a row has on its own — the one the drag overlay shows.
 */
describe("the toolbar's name, in the order it is spoken", () => {
  const nameOf = (item: TabItem) => {
    const { container, unmount } = renderTab(item);
    const row = container.querySelector(".MuiListItemButton-root")!;
    const name = row.getAttribute("aria-label");
    // Both attributes carry it: RowList numbers what `data-row-label` holds.
    expect(row.getAttribute("data-row-label")).toBe(name);
    unmount();
    return name;
  };

  it.each([
    ["a plain tab", {}, "Example page, example.com"],
    ["the current tab", { active: true }, "Example page, example.com, current tab"],
    ["an audible tab", { audible: true }, "Example page, example.com, playing audio"],
    [
      "a muted tab",
      { mutedInfo: { muted: true } },
      "Example page, example.com, muted",
    ],
    // Muted wins: a muted tab that is still audible is not "playing audio".
    [
      "a muted tab that is still audible",
      { audible: true, mutedInfo: { muted: true } },
      "Example page, example.com, muted",
    ],
    [
      "every state at once",
      { active: true, audible: true },
      "Example page, example.com, current tab, playing audio",
    ],
    ["no title", { title: "" }, "tab, example.com"],
    ["no title and no address", { title: "", url: "" }, "tab"],
    [
      "a data: URL",
      { url: `data:text/html;base64,${"A".repeat(4000)}`, active: true },
      "Example page, data, current tab",
    ],
  ] as [string, Partial<TabItem>, string][])("%s", (_kind, over, expected) => {
    expect(nameOf(tab({ title: "Example page", ...over }))).toBe(expected);
  });

  it("says selected last, and follows the selection without a remount", () => {
    const { container } = renderTab(
      tab({ id: 42, title: "Example page", active: true, audible: true }),
    );
    const row = container.querySelector(".MuiListItemButton-root") as HTMLElement;
    const base = "Example page, example.com, current tab, playing audio";
    expect(row).toHaveAttribute("aria-label", base);

    fireEvent.click(row, { ctrlKey: true });
    expect(container.querySelector(".MuiListItemButton-root")).toBe(row);
    expect(row).toHaveAttribute("aria-label", `${base}, selected`);
    expect(row).toHaveAttribute("data-row-label", `${base}, selected`);

    fireEvent.click(row, { ctrlKey: true });
    expect(row).toHaveAttribute("aria-label", base);
  });

  it("follows a change of title, audio and mute on the same element", () => {
    const view = renderTab(tab({ title: "Before" }));
    const row = view.container.querySelector(
      ".MuiListItemButton-root",
    ) as HTMLElement;
    const again = (item: TabItem) =>
      view.rerender(
        <SelectionProvider>
          <TabDisplay tab={item} dragHandle={handleFor(item.title || "tab")} />
        </SelectionProvider>,
      );

    again(tab({ title: "After" }));
    expect(row).toHaveAttribute("aria-label", "After, example.com");

    again(tab({ title: "After", audible: true }));
    expect(row).toHaveAttribute("aria-label", "After, example.com, playing audio");

    again(tab({ title: "After", mutedInfo: { muted: true } }));
    expect(row).toHaveAttribute("aria-label", "After, example.com, muted");
    expect(view.container.querySelector(".MuiListItemButton-root")).toBe(row);
  });
});

/**
 * What the primary action does, against what the row does.
 *
 * The primary button sits inside a row that still activates on click (AC-18,
 * and the pointer-drag path with it), so one click has to land exactly once. A
 * spy on `chrome.tabs.update` counts activations; selection is what a
 * Ctrl-click does instead of activating.
 */
describe("the primary action", () => {
  const rowOf = (container: HTMLElement) =>
    container.querySelector(".MuiListItemButton-root") as HTMLElement;
  const primaryOf = (container: HTMLElement) =>
    container.querySelector<HTMLElement>("[data-tab-row]")!;
  const activations = () =>
    vi
      .mocked(chrome.tabs.update)
      .mock.calls.filter(
        ([id, props]) => id === 5 && (props as { active?: boolean }).active,
      );

  it("activates once on a click, not twice", async () => {
    const { container } = renderTab(tab({ id: 5 }));

    fireEvent.click(primaryOf(container));

    await waitFor(() => {
      expect(activations()).toHaveLength(1);
    });
    // Let any second, bubbled activation arrive before deciding there was none.
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(activations()).toHaveLength(1);
  });

  // Enter and Space are the same click the pointer makes, on a native button —
  // and so the same handler the row's onClick calls.
  it.each([["{Enter}"], [" "]])(
    "activates on %j, through the same handler the row uses",
    async (key) => {
      const user = userEvent.setup();
      const { container } = renderTab(tab({ id: 5 }));

      primaryOf(container).focus();
      await user.keyboard(key);

      await waitFor(() => {
        expect(activations()).toHaveLength(1);
      });
      // Let any second, bubbled activation arrive before deciding there was
      // none — the same check the click test makes.
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(activations()).toHaveLength(1);
    },
  );

  it("still activates when the pointer lands on the row outside it", async () => {
    const { container } = renderTab(tab({ id: 5 }));

    fireEvent.click(rowOf(container));

    await waitFor(() => {
      expect(activations()).toHaveLength(1);
    });
  });

  // The event has to arrive with its modifier: a stopPropagation that rebuilt
  // it, or a handler that dropped it, would turn selecting into switching.
  it("selects on Ctrl-click and does nothing else", async () => {
    const { container } = renderTab(tab({ id: 5 }));

    fireEvent.click(primaryOf(container), { ctrlKey: true });
    fireEvent.click(rowOf(container), { metaKey: true });

    // Two toggles, on and off again — and no switch.
    expect(
      container.querySelector('[aria-label="Select Example"]'),
    ).not.toBeNull();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(activations()).toHaveLength(0);

    fireEvent.click(primaryOf(container), { ctrlKey: true });
    expect(
      container.querySelector('[aria-label="Deselect Example"]'),
    ).not.toBeNull();
    expect(activations()).toHaveLength(0);
  });
});

/**
 * A checked box is state, and state has to outlive the pointer.
 *
 * This regressed silently and invisibly to any unit test that only looked at
 * React: the markup was right, and the row's own `& .tabSelect { opacity: 0 }`
 * simply outranked what the button set on itself. So the guard is the
 * attribute the CSS keys off, not the computed style — jsdom would not resolve
 * that cascade anyway.
 */
describe("a selected tab", () => {
  // Found by what it does, not by the class that styles it: the checkbox
  // shares .itemAction with every other row control now.
  const boxOf = (container: HTMLElement) =>
    container.querySelector(
      '[aria-label="Select Example"], [aria-label="Deselect Example"]',
    ) as HTMLElement;

  it("marks its checkbox so the row's hide rule cannot win", () => {
    const { container } = renderTab(tab({ id: 42 }));
    const row = container.querySelector(".MuiListItemButton-root")!;

    expect(boxOf(container)).not.toHaveAttribute("data-selected");

    // Ctrl-click is what TabDisplay branches on to select rather than switch.
    fireEvent.click(row, { ctrlKey: true });

    expect(boxOf(container)).toHaveAttribute("data-selected");
  });

  it("says so in the control's name", () => {
    const { container } = renderTab(tab({ id: 42 }));
    const row = container.querySelector(".MuiListItemButton-root")!;

    expect(boxOf(container)).toHaveAttribute("aria-label", "Select Example");
    fireEvent.click(row, { ctrlKey: true });
    expect(boxOf(container)).toHaveAttribute("aria-label", "Deselect Example");
  });

  // SPEC-04 AM-4. The name already changes, so a pressed or checked state on
  // top of it would say the same thing twice: "Deselect Example, pressed".
  it("says so in the name only, with no pressed or checked state", () => {
    const { container } = renderTab(tab({ id: 42 }));
    const row = container.querySelector(".MuiListItemButton-root")!;

    for (const selected of [false, true]) {
      if (selected) fireEvent.click(row, { ctrlKey: true });
      expect(boxOf(container)).not.toHaveAttribute("aria-pressed");
      expect(boxOf(container)).not.toHaveAttribute("aria-checked");
      expect(boxOf(container)).not.toHaveAttribute("aria-selected");
    }
    expect(boxOf(container)).toHaveAttribute("aria-label", "Deselect Example");
  });
});

/**
 * Mute, from the row itself.
 *
 * The favicon badge has always said which rows are making sound; acting on
 * one meant the toolbar menu, which deliberately excludes the tab you are
 * looking at. A noisy row now carries its own control.
 */
describe("a tab making sound", () => {
  const muteOf = (container: HTMLElement) =>
    container.querySelector<HTMLElement>(
      '[aria-label^="Mute"], [aria-label^="Unmute"]',
    );

  it("offers no mute control on a silent tab", () => {
    expect(muteOf(renderTab(tab()).container)).toBeNull();
  });

  it("mutes an audible tab", () => {
    const { container } = renderTab(tab({ id: 7, audible: true }));
    const button = muteOf(container)!;

    expect(button).toHaveAttribute("aria-label", "Mute Example");
    fireEvent.click(button);

    expect(chrome.tabs.update).toHaveBeenCalledWith(7, { muted: true });
  });

  // A muted tab reports audible: false, so muted alone has to keep the
  // control on the row — otherwise muting a tab would remove the only way
  // to unmute it.
  it("unmutes a muted tab that is no longer audible", () => {
    const { container } = renderTab(
      tab({ id: 8, audible: false, mutedInfo: { muted: true } }),
    );
    const button = muteOf(container)!;

    expect(button).toHaveAttribute("aria-label", "Unmute Example");
    fireEvent.click(button);

    expect(chrome.tabs.update).toHaveBeenCalledWith(8, { muted: false });
  });

  it("is reached by arrow, not by Tab", () => {
    const button = muteOf(renderTab(tab({ id: 9, audible: true })).container)!;

    expect(button).toHaveAttribute("data-row-control");
    expect(button).toHaveAttribute("tabindex", "-1");
  });

  // The row switches tabs when clicked; a control on it must not.
  it("does not also switch to the tab", () => {
    const { container } = renderTab(tab({ id: 10, audible: true }));

    fireEvent.click(muteOf(container)!);

    expect(chrome.tabs.update).not.toHaveBeenCalledWith(10, { active: true });
  });
});

/**
 * SPEC-04 §11 / AC-24: a name is a string, never a reference.
 *
 * `aria-labelledby` and `aria-describedby` name an element by its `id`, and an
 * `id` built from a title or a URL is a page-chosen string in a namespace the
 * whole document shares — a title that collides with another element's id
 * renames it. So the row builds none: its names are `aria-label` strings, and
 * no row data reaches an `id`.
 *
 * One reference is allowed, because it is not row data: dnd-kit puts
 * `aria-describedby="DndDescribedBy-<n>"` on the drag handle, where `<n>` is an
 * instance counter and the target is its own screen-reader instructions.
 * `handleFor` above reproduces it, so the pattern is allowed by shape and
 * anything else is a finding.
 */
describe("a tab row's names are strings, not references", () => {
  const DND_DESCRIBED_BY = /^DndDescribedBy-\d+$/;

  it("builds no aria-labelledby or aria-describedby from the tab, and no id from its title or address", () => {
    const title = '"><img src=x onerror=alert(1)> Hostile';
    const url = 'https://example.com/a?x=1&y=2#frag"quote';
    const { container } = renderTab(
      tab({ title, url, audible: true, active: true }),
    );
    const everything = [...container.querySelectorAll("*")];

    // The census has to be able to see the handle, or the allowance is untested.
    expect(
      container.querySelector('[aria-describedby^="DndDescribedBy-"]'),
    ).not.toBeNull();

    everything.forEach((element) => {
      expect(element).not.toHaveAttribute("aria-labelledby");
      const described = element.getAttribute("aria-describedby");
      if (described !== null) expect(described).toMatch(DND_DESCRIBED_BY);
    });

    const ids = everything.flatMap((element) =>
      element.id ? [element.id] : [],
    );
    ids.forEach((id) => {
      ["Hostile", "example.com", "frag", "quote", "x=1"].forEach((piece) =>
        expect(id).not.toContain(piece),
      );
    });
  });
});

/**
 * E-5: a tab Chrome has not titled yet is still a row someone has to be able to
 * tell from its neighbours, and each control on it still says what it is for.
 */
describe("a tab with no title", () => {
  it("has a toolbar that begins with 'tab', and controls that end with it", () => {
    const { container } = renderTab(
      tab({ title: "", url: "https://example.com/", audible: true }),
    );
    const row = container.querySelector(".MuiListItemButton-root") as HTMLElement;

    const name = row.getAttribute("aria-label") ?? "";
    expect(name).not.toBe("");
    expect(name.startsWith("tab")).toBe(true);

    const names = [...row.querySelectorAll<HTMLElement>("[data-row-control]")]
      .map((control) => control.getAttribute("aria-label"))
      .filter((control) => control !== "Switch");
    expect(names).toEqual([
      "Select tab",
      "Mute tab",
      "Close tab",
      "Reorder tab",
    ]);
    names.forEach((control) => expect(control?.endsWith(" tab")).toBe(true));
  });

  it("still has a name when it has no address either", () => {
    const { container } = renderTab(tab({ title: undefined, url: undefined }));
    const row = container.querySelector(".MuiListItemButton-root") as HTMLElement;

    expect(row).toHaveAttribute("aria-label", "tab");
    expect(row).toHaveAccessibleName("tab");
  });
});

/**
 * Flow content in a button.
 *
 * HTML allows only phrasing content inside a `<button>`. The primary action's
 * children are an avatar and a text box, both `div`s, and a `<p>` for the
 * secondary line, so the primary is a `div` with `role="button"` instead — see
 * the comment on it. The scan below is over every `<button>` in the row, not
 * the primary alone, so the same defect cannot come back through a control
 * added later.
 */
describe("a tab row's buttons", () => {
  const rowOf = (container: HTMLElement) =>
    container.querySelector(".MuiListItemButton-root") as HTMLElement;

  it("contain no div or p, and the primary action is a div that is still a button", () => {
    const { container } = renderTab(
      tab({ title: "Example page", audible: true, active: true }),
    );
    const row = rowOf(container);

    // The scan has to be looking at buttons: select, mute, close, reorder.
    expect(row.querySelectorAll("button").length).toBeGreaterThanOrEqual(4);
    expect(row.querySelectorAll("button div, button p")).toHaveLength(0);

    const primary = row.querySelector<HTMLElement>("[data-tab-row]")!;
    expect(primary.tagName).toBe("DIV");
    expect(primary).toHaveAttribute("role", "button");
    expect(primary).toHaveAttribute("tabindex", "0");
    // Found the way a screen reader finds it: by role, and by its name.
    expect(
      screen.getByRole("button", { name: "Switch" }),
    ).toBe(primary);
    // Its children are still in it; only the element around them changed.
    expect(primary.querySelector(".MuiListItemText-root")).not.toBeNull();
  });

  it("hold true through the list's own TabListItem", () => {
    const { container } = render(
      <SelectionProvider>
        <TabListItem tab={tab({ audible: true })} />
      </SelectionProvider>,
    );

    expect(rowOf(container).querySelectorAll("button").length).toBeGreaterThan(0);
    expect(rowOf(container).querySelectorAll("button div, button p")).toHaveLength(
      0,
    );
  });
});

/**
 * Chrome's own pages are titled with their host: "Extensions" lives at
 * chrome://extensions. Heard with NVDA on 2026-10-02 as "Extensions,
 * extensions, current tab".
 */
describe("a tab whose site is the same word as its title", () => {
  it("says the word once", () => {
    renderTab(tab({ title: "Extensions", url: "chrome://extensions/" }));

    expect(screen.getByRole("toolbar")).toHaveAccessibleName("Extensions");
  });

  it("is compared without regard to case", () => {
    renderTab(tab({ title: "Example.COM", url: "https://example.com/a" }));

    expect(screen.getByRole("toolbar")).toHaveAccessibleName("Example.COM");
  });

  it("still says the site when the title only contains it", () => {
    renderTab(
      tab({ title: "Extensions - Help", url: "chrome://extensions/" }),
    );

    expect(screen.getByRole("toolbar")).toHaveAccessibleName(
      "Extensions - Help, extensions",
    );
  });
});
