/**
 * Which surface this copy of the app is running in.
 *
 * The side panel loads `index.html` with no query string (see `side_panel` in
 * manifest.json). The other two surfaces are opened by us with an explicit
 * `?host=`, so each copy knows which pop-out affordance to offer — and the
 * floating copy knows to offer none.
 */
export type Host = "panel" | "window" | "float";

export const getHost = (): Host => {
  const host = new URLSearchParams(window.location.search).get("host");
  return host === "window" || host === "float" ? host : "panel";
};
