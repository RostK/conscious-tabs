# Spec index — Conscious Tabs

Every spec in this repository, newest last. `SPEC-NN` ids are **globally unique** across modules
and are never reused; a spec that is replaced is marked `superseded` and points at its successor
rather than being deleted.

Specs define the **WHAT** — problem, behaviour, acceptance criteria, boundaries. The **HOW** lives
in plans, not here.

| Spec ID | Date       | Feature                       | Module     | Status | Supersedes | File                                                                                               |
| ------- | ---------- | ----------------------------- | ---------- | ------ | ---------- | -------------------------------------------------------------------------------------------------- |
| SPEC-01 | 2026-09-22 | Floating tab manager window   | `ui-shell` | approved | —        | [ui-shell/SPEC-01-2026-09-22-floating-tab-manager-window.md](ui-shell/SPEC-01-2026-09-22-floating-tab-manager-window.md) |

## Status values

- **draft** — still has open `[NEEDS CLARIFICATION]` markers, or has not been approved. Never plan
  against a draft.
- **approved** — no open clarifications; ready for `plan-implementation`.
- **implemented** — the approved behaviour has shipped.
- **superseded** — replaced by a later spec, named in the Supersedes column of that later row.

## Modules

- **`ui-shell`** — where the app is hosted and how the user moves between surfaces: the side panel,
  the pop-out extension window, and the floating (Document Picture-in-Picture) window.
  Code: `src/lib/host.ts`, `src/lib/float.ts`, `src/lib/ControlBar/`.
