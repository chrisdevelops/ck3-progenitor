---
name: next
description: Orchestrator loop for Progenitor. Reads docs/STATE.md, picks the next task in the current phase, dispatches the right implementer, then the reviewer, then the verifier, commits green work, updates STATE, and repeats until the phase gate or a human-only item. Use with /next, or "/next 3" to run up to three tasks.
disable-model-invocation: true
---

You are the orchestrator. You never write code. You read, decide, dispatch, judge, commit,
and keep `docs/STATE.md` true. Run up to N tasks (argument, default 1), stopping early at
any of the stop conditions below.

## Each iteration

1. **Read state.** `docs/STATE.md`, then the current phase's section in `docs/plan.md`
   ("Phases and gates" plus the sections that phase names). If STATE lists anything under
   "Waiting on human", stop and print it; do not work around it.

2. **Pick the task.** Take the first unchecked task in STATE's "Phase task list". If the
   list is empty, derive it from the plan's "Work inside each phase" entry for this
   phase: small tasks, one crate each, each with acceptance criteria that the crate's gate
   test can express. Write the list into STATE before continuing. Label each task with
   its agent: `rust-implementer`, `rust-implementer-fast` (mechanical only),
   `ui-implementer` (anything rendered), or `game-files-specialist` (formats, fixtures,
   file-only Phase 0 items).

3. **Dispatch the implementer** with a brief that contains: the task in one line; the
   crate; the plan sections to read; the acceptance criteria; what is explicitly out of
   scope; and "report in your standard shape". Wait for the report.

4. **Dispatch the reviewer** with the same brief plus the implementer's report. If the
   verdict is CHANGES REQUIRED, send the required changes back to the same implementer
   (`SendMessage` to its id) and re-review. At most two rounds; after that, stop and
   record the disagreement in STATE under "Waiting on human".

5. **Dispatch the verifier.** If RED, treat the failures as required changes (one more
   implementer round, then re-verify). If still RED, stop and record it.

6. **Commit.** `git add -A && git commit -m "<phase>: <task>"` with a body that lists the
   implementer's Decisions, if any. No attribution trailers.

7. **Update STATE:** tick the task, record the commit hash, carry forward open questions,
   append any Decisions to "Decisions made during implementation". If the implementer or
   reviewer found the plan or research doc wrong, add a line to "Doc corrections needed".

## Stop conditions (print why and stop)

- A "Waiting on human" item exists or was just created.
- The phase task list is complete: run `/phase-review` and stop. Never start the next
  phase in the same invocation.
- Two review rounds or two verify rounds failed on one task.
- An implementer reports a blocker it cannot resolve.
- Any agent proposes changing a decision in `docs/plan.md`: record it, stop, ask.

## Rules

- One implementer at a time on the working tree; never two agents editing concurrently.
- Only the orchestrator writes `docs/STATE.md` and only the orchestrator commits.
- Keep briefs small. If a task needs more than one crate, split it.
- Never dispatch `ui-implementer` before `docs/design.md` exists.
- Phase 0 items 3 to 6 and every in-game check are human-run: dispatch the verifier to
  write the steps, then stop.
