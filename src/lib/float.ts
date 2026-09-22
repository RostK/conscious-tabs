import { getHost } from "./host";

/**
 * The floating, always-on-top window (Document Picture-in-Picture).
 *
 * Three constraints shape everything in this file:
 *
 * 1. `requestWindow()` only works from a *top-level traversable*. The side
 *    panel is not one — it returns no API at all (WICG
 *    document-picture-in-picture#88, still open) — so the float can only be
 *    opened from the pop-out window. A `type: "popup"` extension window does
 *    qualify; that is verified behaviour, not documented anywhere.
 * 2. It must be called synchronously from the click handler. Any `await`
 *    between the user's click and the call burns the transient-activation
 *    token and the request rejects.
 * 3. The float never outlives its opener, so the pop-out window has to stay
 *    open. It becomes a placard rather than a second copy of the UI.
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
const PLACARD_ID = "conscious-tabs-float-placard";

/** Only the pop-out window can open a float — see constraint 1 above. */
export const canFloat = (): boolean =>
  getHost() === "window" && Boolean(pictureInPicture());

export const openFloat = (): void => {
  const pip = pictureInPicture();
  if (!pip) return;

  // Deliberately not async: see constraint 2.
  pip
    .requestWindow({ width: FLOAT_WIDTH, height: FLOAT_HEIGHT })
    .then(fillFloat)
    .catch((error: unknown) => {
      console.error("Could not open the floating window", error);
    });
};

const fillFloat = (float: Window) => {
  const doc = float.document;
  doc.documentElement.style.height = "100%";
  doc.body.style.margin = "0";
  doc.body.style.height = "100%";

  const frame = doc.createElement("iframe");
  frame.src = chrome.runtime.getURL("index.html?host=float");
  frame.title = "Conscious Tabs";
  frame.style.cssText = "display:block;border:0;width:100%;height:100%";
  doc.body.append(frame);

  showPlacard(float);
  float.addEventListener("pagehide", hidePlacard);
};

/**
 * Turn the opener into a placard while the float is up. The app stays mounted
 * behind it rather than being unmounted: reaching the React root from here
 * would mean importing it, and the root already imports this file by way of
 * App → ControlBar. A hidden subtree lays out and paints nothing, so the cost
 * is a few wasted renders on tab events.
 */
const showPlacard = (float: Window) => {
  const root = document.getElementById("root");
  if (root) root.style.display = "none";

  const placard = document.createElement("div");
  placard.id = PLACARD_ID;
  placard.style.cssText = [
    "display:flex",
    "flex-direction:column",
    "gap:12px",
    "align-items:center",
    "justify-content:center",
    "text-align:center",
    "min-height:calc(100vh - 2rem)",
    "font:14px/1.6 Inter,system-ui,sans-serif",
  ].join(";");

  const message = document.createElement("p");
  message.textContent =
    "Conscious Tabs is floating on top. Keep this window open — closing it closes the float.";
  message.style.cssText = "margin:0;opacity:0.7;max-width:26em";

  const back = document.createElement("button");
  back.textContent = "Bring it back here";
  back.style.cssText = [
    "font:inherit",
    "cursor:pointer",
    "padding:8px 16px",
    "border-radius:8px",
    "border:1px solid currentColor",
    "background:transparent",
    "color:inherit",
  ].join(";");
  back.addEventListener("click", () => {
    float.close();
  });

  placard.append(message, back);
  document.body.append(placard);
};

const hidePlacard = () => {
  document.getElementById(PLACARD_ID)?.remove();
  const root = document.getElementById("root");
  if (root) root.style.display = "";
};
