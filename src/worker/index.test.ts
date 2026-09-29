import { beforeEach, describe, expect, it, vi } from "vitest";

import { installChrome } from "../test/chromeStub.ts";

/**
 * The worker's first test, and the recipe every later one depends on.
 *
 * A service worker is all module-scope side effects — it registers what it
 * registers at import and exports nothing — so there is no function to call.
 * The seam is the import itself, and it only works in one order:
 *
 *   1. `vi.resetModules()`, because a module already in the cache does not
 *      re-run its side effects. `restoreMocks: true` in `vitest.config.ts`
 *      resets the mocks between tests; it does not evict the module that
 *      called them, so without this the second test sees zero calls and the
 *      first test looks like the only one that works.
 *   2. `installChrome()`, because the worker touches `chrome.*` on its first
 *      line. Installed after the import, it is a different object than the one
 *      the worker captured.
 *   3. `await import(...)`, whose promise resolves once those side effects have
 *      run — which is what makes the assertions below safe without a wait.
 *
 * From T-4 onward the same three steps are how a test reaches the command
 * handler: it is not exported either, and comes back out of
 * `chrome.commands.onCommand.addListener.mock.calls[0][0]`.
 */
describe("the service worker", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("asks Chrome to open the panel when the icon is clicked", async () => {
    const chrome = installChrome();

    await import("./index.ts");

    expect(chrome.sidePanel.setPanelBehavior).toHaveBeenCalledWith({
      openPanelOnActionClick: true,
    });
  });

  /**
   * The `.catch` on that call is not decoration. A rejected promise at worker
   * scope has nowhere to surface — no window, no console the user will read —
   * and an unhandled rejection can take the worker's registration down with
   * it, which presents as the toolbar icon quietly doing nothing.
   */
  it("survives Chrome refusing the request", async () => {
    const chrome = installChrome();
    chrome.sidePanel.setPanelBehavior.mockRejectedValueOnce(
      new Error("no side panel here"),
    );
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(import("./index.ts")).resolves.toBeDefined();
    // The rejection is handled asynchronously, so let the microtask queue run
    // before asking whether it was swallowed rather than thrown.
    await Promise.resolve();

    expect(error).toHaveBeenCalled();
  });
});
