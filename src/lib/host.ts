/**
 * Which surface this copy of the app is running in.
 *
 * The side panel loads `index.html` with no query string (see `side_panel` in
 * manifest.json). The other two surfaces are opened by us with an explicit
 * `?host=`, so each copy knows which affordance to offer — and the floating
 * copy knows to offer none.
 *
 * Note that `panel` is the fallback for *anything* unrecognised, which means an
 * extension page sitting in a plain tab also reports `panel`. That is deliberate
 * (an unknown host must degrade to the safest surface) but it is not the same
 * question as "am I the side panel" — see `closeIfSidePanel` in ./anchor.ts.
 */
export type Host = "panel" | "anchor" | "float";

export const getHost = (): Host => {
  const host = new URLSearchParams(window.location.search).get("host");
  return host === "anchor" || host === "float" ? host : "panel";
};
