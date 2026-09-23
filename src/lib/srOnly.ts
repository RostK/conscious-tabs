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
export const srOnly = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
  border: 0,
} as const;
