import { beforeEach, describe, expect, it, vi } from "vitest";

import { installChrome } from "../test/chromeStub.ts";

const enqueueSnackbar = vi.fn();
vi.mock("notistack", () => ({
  enqueueSnackbar: (...args: unknown[]) => enqueueSnackbar(...args),
}));

/**
 * A stand-in for the Picture-in-Picture window. It only has to satisfy what
 * fillFloat() touches, plus a way to fire the pagehide that Chrome sends when
 * the window goes away — for any of three reasons it never tells us apart.
 */
const makeFloatWindow = () => {
  const handlers = new Map<string, (() => void)[]>();
  return {
    document: {
      documentElement: document.createElement("div"),
      body: document.createElement("div"),
      createElement: (tag: string) => document.createElement(tag),
    },
    addEventListener: (type: string, fn: () => void) => {
      handlers.set(type, [...(handlers.get(type) ?? []), fn]);
    },
    close: vi.fn(),
    fire: (type: string) => {
      (handlers.get(type) ?? []).forEach((fn) => {
        fn();
      });
    },
  };
};

type FloatModule = typeof import("./float.ts");

/** The float's state is module-level, so each test needs a fresh copy. */
const loadFloat = async (host = "anchor") => {
  window.history.replaceState(null, "", `/?host=${host}`);
  vi.resetModules();
  return (await import("./float.ts")) as FloatModule;
};

const installPiP = (requestWindow: () => Promise<unknown>) => {
  const api = { window: null as unknown, requestWindow: vi.fn(requestWindow) };
  Object.defineProperty(window, "documentPictureInPicture", {
    value: api,
    configurable: true,
    writable: true,
  });
  return api;
};

/** The deferred focus check in handleFloatGone runs on a macrotask. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  installChrome();
  enqueueSnackbar.mockClear();
  delete (window as unknown as Record<string, unknown>)
    .documentPictureInPicture;
});

describe("canFloat", () => {
  it("is true in the anchor tab when the API is present", async () => {
    installPiP(() => Promise.resolve(makeFloatWindow()));
    const float = await loadFloat("anchor");
    expect(float.canFloat()).toBe(true);
  });

  // AC-5: omit the control rather than show one that fails on activation.
  it("is false when the API is absent", async () => {
    const float = await loadFloat("anchor");
    expect(float.canFloat()).toBe(false);
  });

  // C-1: the side panel is not a top-level traversable, so it can never ask.
  it("is false in the side panel even with the API present", async () => {
    installPiP(() => Promise.resolve(makeFloatWindow()));
    const float = await loadFloat("panel");
    expect(float.canFloat()).toBe(false);
  });

  // AC-14: the float must not offer to float itself.
  it("is false inside the float", async () => {
    installPiP(() => Promise.resolve(makeFloatWindow()));
    const float = await loadFloat("float");
    expect(float.canFloat()).toBe(false);
  });
});

describe("opening the float", () => {
  it("reports open once the window is filled", async () => {
    installPiP(() => Promise.resolve(makeFloatWindow()));
    const float = await loadFloat();

    float.openFloat();
    await settle();

    expect(float.getFloatState()).toBe("open");
  });

  // AC-8: the float renders from this extension's own origin, nothing else.
  it("fills the window with an extension-origin frame", async () => {
    const pipWindow = makeFloatWindow();
    installPiP(() => Promise.resolve(pipWindow));
    const float = await loadFloat();

    float.openFloat();
    await settle();

    const frame = pipWindow.document.body.querySelector("iframe");
    expect(frame?.getAttribute("src")).toMatch(
      /^chrome-extension:\/\/[a-z]+\/index\.html\?host=float$/,
    );
  });

  // E-12: rapid double activation yields one float and no visible error.
  it("ignores a second activation while one is already open", async () => {
    const api = installPiP(() => Promise.resolve(makeFloatWindow()));
    const float = await loadFloat();

    float.openFloat();
    await settle();
    api.window = makeFloatWindow(); // Chrome now reports a live float.
    float.openFloat();

    expect(api.requestWindow).toHaveBeenCalledTimes(1);
    expect(enqueueSnackbar).not.toHaveBeenCalled();
  });

  // AC-7: a refusal must reach the user, not only the console.
  it("tells the user when the request is refused", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    installPiP(() => Promise.reject(new Error("denied")));
    const float = await loadFloat();

    float.openFloat();
    await settle();

    expect(enqueueSnackbar).toHaveBeenCalledWith(
      "Couldn't open the floating window",
      { variant: "error" },
    );
    expect(float.getFloatState()).toBe("closed");
  });
});

describe("when the float goes away", () => {
  const openThen = async (act: (float: FloatModule) => void) => {
    const pipWindow = makeFloatWindow();
    const api = installPiP(() => Promise.resolve(pipWindow));
    const float = await loadFloat();
    float.openFloat();
    await settle();
    api.window = pipWindow; // Chrome exposes the live float here.
    act(float);
    pipWindow.fire("pagehide");
    await settle();
    return { float, pipWindow };
  };

  // Our own "Stop floating": a deliberate return, so say nothing.
  it("returns quietly when we closed it ourselves", async () => {
    const { float } = await openThen((f) => {
      f.closeFloat();
    });
    expect(float.getFloatState()).toBe("closed");
  });

  // AC-34 / E-1: evicted while the user was elsewhere — they need telling.
  it("raises the notice when it closed on its own and we are not focused", async () => {
    vi.spyOn(document, "hasFocus").mockReturnValue(false);
    const { float } = await openThen(() => undefined);
    expect(float.getFloatState()).toBe("wasClosed");
  });

  // D-2a: Chrome's own "Back to tab" focuses the opener on the way out. It is
  // a close we did not initiate, but nagging about it would be absurd — the
  // user just chose it.
  it("stays quiet when Chrome's Back to tab brought us here", async () => {
    vi.spyOn(document, "hasFocus").mockReturnValue(true);
    const { float } = await openThen(() => undefined);
    expect(float.getFloatState()).toBe("closed");
  });

  it("lets the notice be dismissed without reopening anything", async () => {
    vi.spyOn(document, "hasFocus").mockReturnValue(false);
    const { float } = await openThen(() => undefined);

    float.acknowledgeFloatClosed();

    expect(float.getFloatState()).toBe("closed");
  });

  it("notifies subscribers on every transition", async () => {
    vi.spyOn(document, "hasFocus").mockReturnValue(false);
    const seen: string[] = [];
    const pipWindow = makeFloatWindow();
    installPiP(() => Promise.resolve(pipWindow));
    const float = await loadFloat();
    float.subscribeFloat(() => seen.push(float.getFloatState()));

    float.openFloat();
    await settle();
    pipWindow.fire("pagehide");
    await settle();

    expect(seen).toEqual(["open", "wasClosed"]);
  });
});
