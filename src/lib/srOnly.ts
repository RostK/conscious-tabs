/**
 * Available to a screen reader, invisible on screen.
 *
 * Not `display: none` and not `visibility: hidden` — both remove the text from
 * the accessibility tree along with the pixels, which is the opposite of what
 * this is for. The clip-rect form is the one that leaves it readable.
 *
 * Used where a visual cue carries meaning that its text does not: a count that
 * looks like "3" beside a row of favicons reads as bare "3" aloud, and a page
 * whose title is only a logo has no heading at all.
 */
/*
 * Every length is a string on purpose. This object is spread into MUI's
 * `sx`, where a bare number is not pixels: sizing treats a value of 1 or less
 * as a percentage, and spacing multiplies by 8. Written as plain numbers this
 * resolved to a 100%-tall element with a -8px margin, hidden only by the clip
 * — which worked, but by accident, and left an absolutely positioned box the
 * height of the whole bar sitting over the toolbar.
 */
export const srOnly = {
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: 0,
  margin: "-1px",
  overflow: "hidden",
  // Both spellings on purpose: clip is deprecated but still what older
  // assistive tooling keys on, and clipPath is what the platform supports
  // going forward. They agree, so whichever wins gives the same result.
  clip: "rect(0 0 0 0)",
  clipPath: "inset(50%)",
  whiteSpace: "nowrap",
  border: 0,
} as const;
