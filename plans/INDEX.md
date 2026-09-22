# Plan index — Conscious Tabs

Every implementation plan in this repository, newest last. A plan is named for the spec it
implements, so `SPEC-NN` is the join key between spec, plan, and the code that ships.

Plans define the **HOW** — task units, file-level changes, sequencing, test strategy. The **WHAT**
lives in [`../specs/`](../specs/INDEX.md), not here.

| Spec ID | Date       | Feature                     | Status            | Execution     | File                                                                                       |
| ------- | ---------- | --------------------------- | ----------------- | ------------- | ------------------------------------------------------------------------------------------ |
| SPEC-01 | 2026-09-22 | Floating tab manager window | in progress       | single-agent  | [PLAN-SPEC-01-floating-tab-manager-window.md](PLAN-SPEC-01-floating-tab-manager-window.md) |

## Status values

- **awaiting approval** — written, not yet agreed. Do not start building.
- **approved** — agreed; ready for `sdd-engineering:run-plan`.
- **in progress** — partially built; the plan's task units record how far.
- **done** — every task unit met its definition-of-done and the spec is marked `implemented`.
- **abandoned** — superseded or dropped. Kept for the reasoning, not as a target.
