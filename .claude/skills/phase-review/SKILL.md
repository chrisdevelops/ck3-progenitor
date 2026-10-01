---
name: phase-review
description: Prepares the human review at a phase boundary for Progenitor - summarises what the phase delivered, the gate evidence, decisions made, doc corrections, and the next phase's first tasks - then stops for approval. Use with /phase-review.
disable-model-invocation: true
---

Produce a phase summary for the human and write it to `docs/phases/phase-<n>-review.md`.
Do not start the next phase.

Contents, in this order, each short:

1. **Gate evidence**: the phase gate from `docs/plan.md`, and the verifier output (or the
   human's in-game result) that satisfies it. If anything is not green, say so first.
2. **What was built**: crates and the public items they now expose, one line each.
3. **Decisions made during implementation**: from `docs/STATE.md`, with the reason each
   was needed. Flag any that changed a plan decision.
4. **Doc corrections**: lines in `docs/plan.md` or `docs/research.md` that turned out to
   be wrong, with the correction applied or proposed.
5. **Test budget check**: number of test files and tests in the workspace, suite time,
   and any unit tests outside the three allowed areas.
6. **Commits**: `git log --oneline` for the phase.
7. **Next phase**: its gate, and a proposed task list of five to ten small tasks.
8. **Questions for the human**: anything that needs a decision before continuing.

Then update `docs/STATE.md`: set "Phase status" to "awaiting human review", and add
"Approve phase <n> and start phase <n+1>" under "Waiting on human". Print the summary
and stop.
