import { enqueueSnackbar } from "notistack";

import { getHost } from "./host";
import { dark, light } from "./Theme/brand";

/**
 * The floating, always-on-top window (Document Picture-in-Picture).
 *
 * Three constraints shape everything in this file:
 *
 * 1. `requestWindow()` only works from a *top-level traversable*. The side
 *    panel is not one — it returns no API at all (WICG
 *    document-picture-in-picture#88, still open) — so the float can only be
 *    opened from the anchor tab.
 * 2. It must be called synchronously from the click handler. Any `await`
 *    between the user's click and the call burns the transient-activation
 *    token and the request rejects.
 * 3. The float never outlives its opener, so the anchor tab has to stay open.
 *    It keeps showing the full tab manager while the float is up.
 *
 * The app is rendered into the float through an extension-origin iframe
 * rather than by moving DOM across documents. Re-parenting would break three
 * things at once: Emotion injects its <style> into the opener's <head>, every
 * MUI Menu/Dialog/Tooltip portals into the opener's <body>, and so do the
 * notistack snackbars — all of which would render into the wrong window.
 */

/**
 * Not in TypeScript's DOM lib as of 5.4. Kept module-local rather than
 * augmenting the global `Window`, so a future lib.dom that ships these
 * can't collide with them.
 */
interface FloatOptions {
  width?: number;
  height?: number;
  disallowReturnToOpener?: boolean;
  preferInitialWindowPlacement?: boolean;
}

interface DocumentPictureInPictureApi {
  readonly window: Window | null;
  requestWindow(options?: FloatOptions): Promise<Window>;
}

const pictureInPicture = (): DocumentPictureInPictureApi | undefined =>
  (
    window as unknown as {
      documentPictureInPicture?: DocumentPictureInPictureApi;
    }
  ).documentPictureInPicture;

const FLOAT_WIDTH = 400;
const FLOAT_HEIGHT = 640;

/**
 * `wasClosed` means the float went away without us asking — evicted by another
 * Picture-in-Picture request, or closed from its own title bar. It is a state
 * rather than a snackbar because it happens while the user is in another
 * application by definition, and a toast that expires in three seconds is a
 * toast nobody sees.
 */
export type FloatState = "closed" | "open" | "wasClosed";

let state: FloatState = "closed";
/**
 * The window *we* asked to close, so the notice stays quiet for it.
 *
 * A boolean instead of a window is what it was, and it could stick: nothing
 * cleared it but the pagehide that followed, so a close that produced none —
 * a window already gone, an event missed — left it set for the life of the
 * realm. The next float to be genuinely evicted then read as a close the user
 * asked for, and AC-34's notice, with its one-click way back, never appeared.
 *
 * Naming the window makes the flag answer "did we ask for *this* one to go",
 * which a later float can never match by accident.
 */
let closingOurselves: Window | undefined;
/**
 * Our own handle on the float. Closing through this rather than through
 * `documentPictureInPicture.window` matters: if that global were ever null
 * when we asked, closeFloat() would silently do nothing *and* skip setting
 * closingOurselves — so the pagehide that followed would be misread as an
 * eviction and the user would be told their float "closed on its own"
 * immediately after they clicked Stop floating.
 */
let current: Window | undefined;
/**
 * Set between asking for a float and getting one.
 *
 * `documentPictureInPicture.window` is null for the whole of that gap, so it
 * cannot answer "is one already coming" — only "is one already here". Two
 * clicks inside the gap therefore both passed the guard below and issued two
 * requests, which E-12 forbids: the second either rejects and raises an error
 * toast for a float the user can see, or replaces the first and leaves this
 * module tracking a window that no longer exists.
 */
let requesting = false;

const listeners = new Set<() => void>();

const setState = (next: FloatState) => {
  if (next === state) return;
  state = next;
  listeners.forEach((notify) => {
    notify();
  });
};

export const subscribeFloat = (notify: () => void) => {
  listeners.add(notify);
  return () => {
    listeners.delete(notify);
  };
};

export const getFloatState = (): FloatState => state;

/** Only the anchor tab can open a float — see constraint 1 above. */
export const canFloat = (): boolean =>
  getHost() === "anchor" && Boolean(pictureInPicture());

export const openFloat = (): void => {
  const pip = pictureInPicture();
  if (!pip) return;

  // Rapid double activation must yield exactly one float and no visible error.
  // Reading `.window` is synchronous, so the activation token survives it —
  // and `requesting` covers the gap before it is set. Both are needed: the
  // flag alone would miss a float opened by something other than this code.
  if (pip.window || requesting) return;
  requesting = true;

  // Deliberately not async: see constraint 2.
  pip
    .requestWindow({ width: FLOAT_WIDTH, height: FLOAT_HEIGHT })
    .then(fillFloat)
    .catch((error: unknown) => {
      console.error("Could not open the floating window", error);
      // The user asked for a window and did not get one; saying so in the
      // console only would leave them staring at a button that did nothing.
      enqueueSnackbar("Couldn't open the floating window", {
        variant: "error",
      });
    })
    .finally(() => {
      requesting = false;
    });
};

export const closeFloat = (): void => {
  if (!current) return;
  closingOurselves = current;
  current.close();
};

/**
 * The float asking the document that holds it to take over.
 *
 * The float's own copy of the app cannot close the float: this module's state
 * lives per realm, and inside the float `current` is undefined, so `closeFloat`
 * there is a no-op. Calling `parent.close()` instead would work but would look
 * to the holder like a close it did not initiate, raising the "your float
 * closed on its own" notice for something the user deliberately asked for.
 *
 * So the float asks, and the holder acts — which also means the close runs
 * through `closeFloat()` and sets the initiated-by-us flag, exactly as the
 * anchor's own "Stop floating" does.
 */
const RETURN_TO_FULL_VIEW = "float:return-to-full-view";

export const requestFullView = (): void => {
  void chrome.runtime
    .sendMessage({ type: RETURN_TO_FULL_VIEW })
    .catch(() => undefined);
};

chrome.runtime.onMessage.addListener((message: unknown) => {
  if ((message as { type?: string } | null)?.type !== RETURN_TO_FULL_VIEW) {
    return;
  }
  // Only the document actually holding a float can answer this. Every other
  // realm — the side panel, the float itself — receives the message too.
  if (!current) return;
  closeFloat();
  void focusSelf();
});

/**
 * Bring this tab and its window forward.
 *
 * Closing the float already makes the anchor the active tab (AC-11), but
 * deliberately does not raise the window, because an eviction can land while
 * the user is in another application. Here they explicitly asked to go to the
 * full view, so raising it is the whole point — that is the difference between
 * this control and the float's own close button.
 */
const focusSelf = async (): Promise<void> => {
  const tab = await chrome.tabs.getCurrent();
  if (tab?.id === undefined) return;
  await chrome.tabs.update(tab.id, { active: true });
  await chrome.windows.update(tab.windowId, { focused: true });
};

/** Dismiss the "it closed on its own" notice without reopening anything. */
export const acknowledgeFloatClosed = (): void => {
  if (state === "wasClosed") setState("closed");
};

/**
 * The theme's canvas for the scheme the system is currently in.
 *
 * Optional-called on purpose. This is a cosmetic nicety — it stops the float
 * flashing white on open — and it runs inside fillFloat, so if it threw, the
 * float would be left an empty window. A wrong background is a far better
 * failure than no content.
 */
const canvas = (): string =>
  window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? dark.canvas
    : light.canvas;

/**
 * Take ownership before doing anything that can fail.
 *
 * Chrome has already opened a real always-on-top window by the time this
 * runs. Dressing it first and recording it afterwards meant a throw in
 * between left that window on screen with nothing tracking it: closeFloat()
 * returned early, no pagehide listener was attached, and the `pip.window`
 * guard then swallowed the click that would have tried again — a float only
 * its own title bar could close, under a toast saying it had failed to open.
 */
const fillFloat = (float: Window) => {
  current = float;
  closingOurselves = undefined;
  float.addEventListener("pagehide", () => {
    handleFloatGone(float);
  });
  setState("open");

  try {
    dressFloat(float);
  } catch (error) {
    // An empty window is worse than none: take it away and say so, rather
    // than leaving the user a blank always-on-top rectangle.
    console.error("Could not fill the floating window", error);
    closeFloat();
    enqueueSnackbar("Couldn't open the floating window", {
      variant: "error",
    });
  }
};

const dressFloat = (float: Window) => {
  const doc = float.document;
  doc.documentElement.style.height = "100%";
  doc.body.style.margin = "0";
  doc.body.style.height = "100%";

  // The float's own document starts as a blank page with no color-scheme, so
  // it paints white — in both themes — for as long as the iframe inside it
  // takes to load and mount React. Dressing it first means the window opens
  // already the right colour, and the iframe fades in over the same tone
  // instead of over a white rectangle.
  doc.documentElement.style.colorScheme = "light dark";
  doc.documentElement.style.background = canvas();
  doc.body.style.background = canvas();

  const frame = doc.createElement("iframe");
  frame.src = chrome.runtime.getURL("index.html?host=float");
  frame.title = "Conscious Tabs";
  frame.style.cssText = `display:block;border:0;width:100%;height:100%;background:${canvas()}`;
  doc.body.append(frame);
};

/**
 * Chrome reports no reason for a float closing: eviction, the window's own
 * close button and our "Stop floating" all arrive as the same `pagehide`.
 *
 * We know when *we* asked. For everything else, focus is the discriminator —
 * Chrome's built-in "Back to tab" button focuses this document on its way out,
 * while an eviction raised from some other tab does not. Without that check,
 * the blessed return path would be greeted with a "your float closed" notice
 * about a thing the user just deliberately chose.
 *
 * Its one blind spot is harmless: an eviction that happens while the user is
 * already looking at the anchor tab stays silent, which is fine — they watched
 * it disappear.
 */
const handleFloatGone = (float: Window) => {
  // A window that is no longer the one we track has nothing to say about the
  // state: if two ever overlap, the loser's pagehide would otherwise discard
  // the winner's handle and leave a visible float that "Stop floating" can no
  // longer close.
  if (float !== current) return;
  current = undefined;
  if (closingOurselves === float) {
    closingOurselves = undefined;
    setState("closed");
    return;
  }
  // Focus lands after the current task, so the check has to wait a tick.
  setTimeout(() => {
    setState(document.hasFocus() ? "closed" : "wasClosed");
  }, 0);
};
