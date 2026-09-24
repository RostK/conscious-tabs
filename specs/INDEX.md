# Spec index — Conscious Tabs

Every spec in this repository, newest last. `SPEC-NN` ids are **globally unique** across modules
and are never reused; a spec that is replaced is marked `superseded` and points at its successor
rather than being deleted.

Specs define the **WHAT** — problem, behaviour, acceptance criteria, boundaries. The **HOW** lives
in plans, not here.

| Spec ID | Date       | Feature                               | Module     | Status                   | Supersedes                   | File                                                                                                                     |
| ------- | ---------- | ------------------------------------- | ---------- | ------------------------ | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| SPEC-01 | 2026-09-22 | Floating tab manager window           | `ui-shell` | implemented (2026-09-23) | —                            | [ui-shell/SPEC-01-2026-09-22-floating-tab-manager-window.md](ui-shell/SPEC-01-2026-09-22-floating-tab-manager-window.md) |
| SPEC-02 | 2026-09-23 | Tab audio controls                    | `tab-list` | implemented              | —                            | [tab-list/SPEC-02-2026-09-23-tab-audio-controls.md](tab-list/SPEC-02-2026-09-23-tab-audio-controls.md)                   |
| SPEC-03 | 2026-09-24 | Favicons from the browser's own store | `tab-list` | approved                 | — (supersedes SPEC-01 AC-22) | [tab-list/SPEC-03-2026-09-24-local-favicons.md](tab-list/SPEC-03-2026-09-24-local-favicons.md)                           |

## Status values

- **draft** — still has open `[NEEDS CLARIFICATION]` markers, or has not been approved. Never plan
  against a draft.
- **approved** — no open clarifications; ready for `plan-implementation`.
- **implemented** — the approved behaviour has shipped.
- **superseded** — replaced by a later spec, named in the Supersedes column of that later row.

## Modules

- **`ui-shell`** — where the app is hosted and how the user moves between surfaces: the side panel,
  the **anchor tab** (the extension page in a normal browser tab), and the floating (Document
  Picture-in-Picture) window. The pop-out _extension window_ named here originally was superseded
  before any of it shipped.
  Code: `src/lib/host.ts`, `src/lib/anchor.ts`, `src/lib/float.ts`, `src/lib/surfaces.ts`,
  `src/lib/ControlBar/`.
- **`tab-list`** — what the manager shows for the tabs themselves and what can be done to one from
  a row: the list, the current-tab card, selection, and the audio cues and controls.
  Code: `src/lib/Tabs/`.
