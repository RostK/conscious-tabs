/**
 * The keyboard command's name, which has to agree in three places: the
 * `commands` key in `manifest.json`, the worker's handler, and the notice that
 * tells the user when Chrome has not bound it to anything.
 *
 * Its own module because the other two have nothing else in common — the
 * handler runs in a service worker with no DOM, the notice is a React
 * component — and a UI component importing the worker's module to borrow a
 * string is a dependency nobody meant to create. `manifest.test.ts` asserts the
 * manifest declares exactly this name, so a rename that misses one place fails
 * a test rather than silently unbinding the shortcut.
 */
export const OPEN_COMMAND = "open-conscious-tabs";
