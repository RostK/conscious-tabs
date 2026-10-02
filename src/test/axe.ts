import axe from "axe-core";

/**
 * axe-core, as this suite runs it.
 *
 * Until SPEC-04 nothing in this repository imported axe: it was present only
 * as a transitive dependency of `eslint-plugin-jsx-a11y`, so "axe is wired
 * into the suite" was a claim with no test behind it. It is a declared
 * devDependency now, and this is the one place that calls it.
 *
 * Two rules for anyone adding a caller here:
 *
 *   - Narrow a run with `runOnly`, which says what to run. Never switch a rule
 *     off to make a count come out: a rule that is disabled reports zero on
 *     every tree, including the broken one, which is the failure this exists
 *     to catch. `rows.a11y.test.tsx` scans `src/` for exactly that.
 *   - Only violations are asked for, unless the caller names other result
 *     types. `passes` lists every element that was fine, which on a
 *     twenty-row list is noise nobody reads; a run that has to prove a rule
 *     *ran*, or that nothing was left undecided, asks for `passes` and
 *     `incomplete` by name.
 *
 * The first rule is enforced here, not merely asked for. `rules` is how a run
 * switches a rule off, and `disableOtherRules` turns off everything a
 * `runOnly` did not name; either one lets a count come out right for the wrong
 * reason. Refusing them at run time cannot be fooled by how the call is
 * spelled, which a scan of the source can be (`rows.a11y.test.tsx` still does
 * that too, for `axe.configure`, which never passes through here).
 */
export const runAxe = (
  container: Element,
  options: axe.RunOptions = {},
): Promise<axe.AxeResults> => {
  if (options.rules !== undefined) {
    throw new Error(
      "runAxe: `rules` can switch a rule off, and a rule that is off reports zero on every tree. Narrow the run with `runOnly` instead.",
    );
  }
  if ("disableOtherRules" in options) {
    throw new Error(
      "runOnly names what to run; `disableOtherRules` switches off everything else and is not accepted here.",
    );
  }
  return axe.run(container, { resultTypes: ["violations"], ...options });
};

/** How many nodes a rule flagged — zero when it did not fire at all. */
export const countNodes = (results: axe.AxeResults, ruleId: string): number =>
  results.violations
    .filter(({ id }) => id === ruleId)
    .reduce((sum, { nodes }) => sum + nodes.length, 0);

/**
 * Fails with what to go and look at, not a count.
 *
 * "expected 0, received 20" says the tree is wrong and nothing about where; a
 * failing run should name each offending element and carry axe's own
 * explanation, because that message is the specification of the fix. Scoped to
 * one rule when `ruleId` is given, so a fixture that is legitimately noisy
 * about something else can still be held to the rule under test.
 */
export const expectNoViolations = (
  results: axe.AxeResults,
  ruleId?: string,
): void => {
  const violations = results.violations.filter(
    ({ id }) => ruleId === undefined || id === ruleId,
  );
  if (violations.length === 0) return;

  const plural = (count: number, noun: string) =>
    `${count} ${noun}${count === 1 ? "" : "s"}`;

  const report = violations
    .map(({ id, impact, help, nodes }) => {
      const where = nodes
        .map(
          ({ target, html, failureSummary }) =>
            // The selector says where, the markup says which: a list's rows
            // all share their classes, so a selector alone cannot tell row 3
            // from row 17.
            `    ${target.join(" ")}\n      ${html.slice(0, 160)}\n      ${(failureSummary ?? "").replace(/\n\s*/g, "\n      ")}`,
        )
        .join("\n");
      return `  ${id} (${impact ?? "no impact"}), ${plural(nodes.length, "node")}: ${help}\n${where}`;
    })
    .join("\n");

  throw new Error(
    `axe found ${plural(violations.length, "violated rule")}${
      ruleId ? ` (scoped to ${ruleId})` : ""
    }:\n${report}`,
  );
};
