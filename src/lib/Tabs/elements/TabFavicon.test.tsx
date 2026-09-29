import { fireEvent, render } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { installChrome } from "../../../test/chromeStub.ts";
import { TabFavicon } from "./TabFavicon.tsx";

beforeEach(() => {
  installChrome();
});

const image = (container: HTMLElement) => container.querySelector("img");

describe("a tab's favicon", () => {
  it("draws the browser's icon for the page", () => {
    const { container } = render(<TabFavicon pageUrl="https://example.com/" />);

    expect(image(container)?.getAttribute("src")).toContain("_favicon");
  });

  // A tab that has not loaded has no key to ask with, and asking with an empty
  // one would draw the browser's default icon on every such row.
  it("falls back to a globe with no page url", () => {
    const { container } = render(<TabFavicon />);

    expect(image(container)).toBeNull();
  });

  /**
   * The failure this component used to keep forever.
   *
   * `broken` was a boolean, so a row whose icon failed once stayed a globe for
   * as long as it was mounted — and since the request only changes when the
   * browser's icon changes, "once" was usually the moment just after a
   * navigation, before Chrome had catalogued the new page at all.
   */
  it("tries again once the browser has a different icon", () => {
    const { container, rerender } = render(
      <TabFavicon pageUrl="https://example.com/" />,
    );
    fireEvent.error(image(container)!);
    expect(image(container)).toBeNull();

    rerender(
      <TabFavicon
        pageUrl="https://example.com/"
        browserIcon="https://example.com/favicon.ico"
      />,
    );

    expect(image(container)).not.toBeNull();
  });

  // And it does not thrash: the same failure stays failed while nothing has
  // changed, rather than re-requesting an icon that is not coming.
  it("stays a globe while nothing has changed", () => {
    const { container, rerender } = render(
      <TabFavicon pageUrl="https://example.com/" />,
    );
    fireEvent.error(image(container)!);

    rerender(<TabFavicon pageUrl="https://example.com/" />);

    expect(image(container)).toBeNull();
  });
});
