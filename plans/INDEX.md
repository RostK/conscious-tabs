# Plan index — Conscious Tabs

Every implementation plan in this repository, newest last. A plan is named for the spec it
implements, so `SPEC-NN` is the join key between spec, plan, and the code that ships.

Plans define the **HOW** — task units, file-level changes, sequencing, test strategy. The **WHAT**
lives in [`../specs/`](../specs/INDEX.md), not here.

| Spec ID | Date       | Feature                     | Status            | Execution     | File                                                                                       |
| ------- | ---------- | --------------------------- | ----------------- | ------------- | ------------------------------------------------------------------------------------------ |
| SPEC-01 | 2026-09-22 | Floating tab manager window | done              | single-agent  | [PLAN-SPEC-01-floating-tab-manager-window.md](PLAN-SPEC-01-floating-tab-manager-window.md) |
| SPEC-05 | 2026-09-29 | Keyboard entry and focus (group A) | awaiting approval | single-agent  | [PLAN-SPEC-05-keyboard-entry-and-focus.md](PLAN-SPEC-05-keyboard-entry-and-focus.md)         |

**Companion documents.** [MANUAL-SWEEP-SPEC-01.md](MANUAL-SWEEP-SPEC-01.md) — the checks a real
floating window has to answer, which no test can: the browser-owned parts of T-14, T-15 and T-16,
ordered so one float session covers them. [MANUAL-SWEEP-SPEC-05.md](MANUAL-SWEEP-SPEC-05.md) — the
install warning, the shortcut itself, and where focus lands in each surface: what only a real
Chrome on a clean profile can answer, ordered so the one that could invalidate the design is
answered first.

## Status values

- **awaiting approval** — written, not yet agreed. Do not start building.
- **approved** — agreed; ready for `sdd-engineering:run-plan`.
- **in progress** — partially built; the plan's task units record how far.
- **done** — every task unit met its definition-of-done and the spec is marked `implemented`.
- **abandoned** — superseded or dropped. Kept for the reasoning, not as a target.
