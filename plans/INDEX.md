# Plan index — Conscious Tabs

Every implementation plan in this repository, newest last. A plan is named for the spec it
implements, so `SPEC-NN` is the join key between spec, plan, and the code that ships.

Plans define the **HOW** — task units, file-level changes, sequencing, test strategy. The **WHAT**
lives in [`../specs/`](../specs/INDEX.md), not here.

| Spec ID | Date       | Feature                     | Status            | Execution     | File                                                                                       |
| ------- | ---------- | --------------------------- | ----------------- | ------------- | ------------------------------------------------------------------------------------------ |
| SPEC-01 | 2026-09-22 | Floating tab manager window | done              | single-agent  | [PLAN-SPEC-01-floating-tab-manager-window.md](PLAN-SPEC-01-floating-tab-manager-window.md) |
| SPEC-05 | 2026-09-29 | Keyboard entry and focus (group A) | approved (2026-09-29) | single-agent  | [PLAN-SPEC-05-keyboard-entry-and-focus.md](PLAN-SPEC-05-keyboard-entry-and-focus.md)         |
| SPEC-04 | 2026-09-29 | Accessible rows (`nested-interactive`) | in progress (T-0…T-9 built; T-10's listening pass open) | single-agent, then three in parallel for T-6…T-8 | [PLAN-SPEC-04-accessible-rows.md](PLAN-SPEC-04-accessible-rows.md)                           |

**Companion documents.** [MANUAL-SWEEP-SPEC-01.md](MANUAL-SWEEP-SPEC-01.md) — the checks a real
floating window has to answer, which no test can: the browser-owned parts of T-14, T-15 and T-16,
ordered so one float session covers them. [MANUAL-SWEEP-SPEC-05.md](MANUAL-SWEEP-SPEC-05.md) — the
install warning, the shortcut itself, and where focus lands in each surface: what only a real
Chrome on a clean profile can answer, ordered so the one that could invalidate the design is
answered first. [MANUAL-SWEEP-SPEC-04.md](MANUAL-SWEEP-SPEC-04.md) — what NVDA says about a list of
twenty to eighty rows, and what a real keyboard drag does: the measurement SPEC-04 §13.1 gates
itself on, ordered so the answer that could force the retreat is heard before the work that assumes
it will not.

**Ordering note.** PLAN-SPEC-04 is listed after PLAN-SPEC-05 because it was written later, not
because it runs later. PLAN-SPEC-05 covers **group A only**; its group B (AC-17…AC-27, AC-29…AC-31,
AC-33) is blocked on SPEC-04 shipping, because those criteria are written against the row structure
PLAN-SPEC-04 builds. PLAN-SPEC-04's branch is cut from `keyboard-entry-and-focus`, not from `main`.

## Status values

- **awaiting approval** — written, not yet agreed. Do not start building.
- **approved** — agreed; ready for `sdd-engineering:run-plan`.
- **in progress** — partially built; the plan's task units record how far.
- **done** — every task unit met its definition-of-done and the spec is marked `implemented`.
- **abandoned** — superseded or dropped. Kept for the reasoning, not as a target.
