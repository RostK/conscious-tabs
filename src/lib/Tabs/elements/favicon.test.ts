import { beforeEach, describe, expect, it } from "vitest";

import { installChrome } from "../../../test/chromeStub.ts";
import { faviconUrl } from "./favicon.ts";

beforeEach(() => {
  installChrome();
});

describe("faviconUrl", () => {
  // SPEC-03 AC-1: the browser's own store, never the site's.
  it("asks the extension's own endpoint, not the site", () => {
    const url = new URL(faviconUrl("https://example.com/page", 20)!);

    expect(url.protocol).toBe("chrome-extension:");
    expect(url.pathname).toBe("/_favicon/");
    expect(url.searchParams.get("pageUrl")).toBe("https://example.com/page");
  });

  // SPEC-03 AC-2. Asking for the drawn size hands a 2x display an upscaled
  // icon — a visible downgrade traded for an invisible privacy win.
  it("asks for twice the size it will be drawn at", () => {
    const small = new URL(faviconUrl("https://example.com/", 20)!);
    const large = new URL(faviconUrl("https://example.com/", 26)!);

    expect(small.searchParams.get("size")).toBe("40");
    expect(large.searchParams.get("size")).toBe("52");
  });

  /**
   * SPEC-03 E-6. A tab's URL is attacker-influenced and routinely carries `&`
   * and `#`. Joined by hand, `?pageUrl=` + a url containing `&size=16` would
   * hand the endpoint a second `size`, and everything after a `#` would never
   * be sent at all.
   */
  it("survives a url that looks like more query string", () => {
    const hostile = "https://example.com/a?b=1&size=999#frag";
    const url = new URL(faviconUrl(hostile, 20)!);

    expect(url.searchParams.get("pageUrl")).toBe(hostile);
    expect(url.searchParams.getAll("size")).toEqual(["40"]);
    expect(url.hash).toBe("");
  });

  // SPEC-03 AC-3 / E-1: a tab that has not loaded yet has no key to ask with,
  // and asking with an empty one would request the browser's default icon for
  // every such row rather than showing them as unknown.
  it("declines to ask when there is no page url", () => {
    expect(faviconUrl(undefined, 20)).toBeUndefined();
    expect(faviconUrl("", 20)).toBeUndefined();
  });

  /**
   * The defect this parameter exists for.
   *
   * `_favicon` is keyed by page URL, and a page URL stops changing once a
   * navigation settles. A tab navigated a second ago asks for an icon Chrome
   * has not catalogued yet and gets the default globe, which the browser
   * caches against that exact request. When Chrome acquires the real icon,
   * the row asked for nothing new and kept the globe.
   */
  it("asks for a different resource once the browser's icon changes", () => {
    const before = faviconUrl("https://example.com/", 20, undefined);
    const globeCached = faviconUrl("https://example.com/", 20, "");
    const after = faviconUrl(
      "https://example.com/",
      20,
      "https://example.com/favicon.ico",
    );

    expect(before).toBe(globeCached);
    expect(after).not.toBe(before);
    expect(new URL(after!).searchParams.get("pageUrl")).toBe(
      "https://example.com/",
    );
  });

  // Stable in, stable out: a token that churned would re-request every icon on
  // every render, which is the opposite of the point.
  it("asks for the same resource while nothing has changed", () => {
    const icon = "data:image/png;base64,iVBORw0KGgo=";

    expect(faviconUrl("https://example.com/", 20, icon)).toBe(
      faviconUrl("https://example.com/", 20, icon),
    );
  });

  // The site's own URL is a change signal, never a source — fetching it is
  // what SPEC-03 removed. It is hashed, so it is not even legible here.
  it("never puts the site's own icon url in the request", () => {
    const icon = "https://tracker.example/pixel.png?id=abc123";
    const url = faviconUrl("https://example.com/", 20, icon);

    expect(url).not.toContain("tracker.example");
    expect(url).not.toContain("abc123");
    expect(new URL(url!).protocol).toBe("chrome-extension:");
  });
});
