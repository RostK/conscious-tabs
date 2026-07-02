/**
 * Conscious brand tokens.
 *
 * Modelled on the real product app (paper canvas, white cards, ink/black as
 * the interactive accent, rounded corners, bold sans). Plum is the brand's
 * identity colour but the app reserves it for the logo mark only — the UI
 * accent is ink — so plum here is documentation/logo reference, not a UI token.
 *
 * These are the single source of truth for the theme — see ./index.tsx.
 * The app is light-only; the `dark` set is a warm-dark counterpart that keeps
 * the same mood (the "black" accent inverts to a paper tone on dark).
 */

/** Light palette — modelled on the Conscious app. */
export const light = {
  /** warm paper canvas that sits behind the cards */
  canvas: "#f5f1e9",
  /** white card surface (rows, fields, sheets) */
  card: "#ffffff",
  /** ink — primary text AND the interactive accent (buttons, selection) */
  ink: "#1f1a14",
  /** taupe secondary text */
  muted: "#6b5b47",
  /** warm hairline — borders / dividers */
  rule: "#e6dfd2",
  /** label colour on top of an ink fill */
  onInk: "#faf8f4",
  /** brand plum — logo mark only, not a UI accent */
  plum: "#5b3a52",
} as const;

/** Warm-dark counterpart (derived — the product app has no dark mode). */
export const dark = {
  /** deep warm ink canvas */
  canvas: "#1a1613",
  /** slightly raised warm card surface */
  card: "#221d18",
  /** on dark, the "black" accent inverts to a paper tone */
  ink: "#f0ebe1",
  /** warm muted secondary text */
  muted: "#b7a894",
  /** warm divider */
  rule: "#38312a",
  /** dark ink sits on the light accent fill */
  onInk: "#1f1a14",
  /** brand plum, lightened — logo/reference only */
  plum: "#c79bbc",
} as const;
