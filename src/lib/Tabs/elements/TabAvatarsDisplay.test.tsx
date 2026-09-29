import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { EXTENSION_ORIGIN, installChrome } from "../../../test/chromeStub.ts";
import { TabItem, TabsStructure } from "../types.ts";
import { TabAvatarsDisplay } from "./TabAvatarsDisplay.tsx";

beforeEach(() => {
  installChrome();
});

const tab = (id: number): TabItem => ({
  type: "tab",
  id,
  index: id,
  windowId: 1,
  groupId: -1,
  active: false,
  highlighted: false,
  title: `Tab ${id}`,
  url: `https://example.com/${id}`,
});

const structure = (count: number): TabsStructure =>
  Array.from({ length: count }, (_, index) => tab(index + 1));

/**
 * A window row summarises the tabs inside it with a strip of favicons. MUI's
 * `Avatar` forwards `alt` to the `<img>` it renders and emits none of its own,
 * so the pictures went out bare — `image-alt`, impact `critical`, one node per
 * avatar. They are decorative: the row already names the window and its tab
 * count, and every tab is listed underneath by title.
 */
describe("the favicon strip on a window row", () => {
  it("marks every favicon decorative", () => {
    const { container } = render(
      <TabAvatarsDisplay tabsStructure={structure(6)} />,
    );

    const images = [...container.querySelectorAll("img")];
    expect(images).toHaveLength(6);
    images.forEach((image) => {
      // Empty, not absent: absent makes a screen reader read the filename,
      // which here is a chrome-extension URL with the page url inside it.
      expect(image.getAttribute("alt")).toBe("");
      expect(image.getAttribute("src")).toMatch(EXTENSION_ORIGIN);
    });
  });

  /**
   * The surplus avatar is a count, not a picture, and carries its own sentence
   * for a listener. Guarded here so a future `alt` change to the group does not
   * hand it an image it never had.
   *
   * Nine, not ten: `max` counts the surplus avatar as one of its slots, so
   * AvatarGroup draws eight fewer than the fourteen tabs and says "5 more".
   * The component slices ten children off the front regardless, and MUI drops
   * the tenth — harmless, but it is why this number is not the slice width.
   */
  it("draws no image for the surplus count", () => {
    const { container } = render(
      <TabAvatarsDisplay tabsStructure={structure(14)} />,
    );

    expect(container.querySelectorAll("img")).toHaveLength(9);
    expect(container.textContent).toContain("5 more tabs");
  });
});
