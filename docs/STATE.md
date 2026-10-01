# STATE

Shared memory for the agent loop. Only the orchestrator (`/next`) writes this file.
Every agent reads it first.

## Current phase

- Phase: 0 (Verify on the live install)
- Phase status: not started
- Gate: the hand-written test mod loads at 867 and 1066 with a clean `error.log`

## Environment (fill once; agents rely on it)

- Game install path:
- User-data folder:
- `rawVersion`:
- Launcher closed before any write under `mod/`: required

## Phase task list

Derived from the Phase 0 checklist in `docs/plan.md`. File-only items go to
`game-files-specialist`; items marked (human) are run by the human with steps the
verifier writes.

- [ ] 0.1 Environment: paths, version, DLC list, `dlc_load.json` form -> `docs/phase0-findings.md` section 1 (game-files-specialist)
- [ ] 0.2 1.20 history form: faith key, Richard I block, `common/religion/` layout -> section 2 (game-files-specialist)
- [ ] 0.3 Slider to gene mapping (human; verifier writes the steps) -> section 3
- [ ] 0.4 Age cost rounding and the parity fixture (human) -> section 4
- [ ] 0.5 Coat of arms clipboard (human) -> section 5
- [ ] 0.6 Save Ruler location (human, low priority) -> section 6
- [ ] 0.7 Hand-written test mod in `fixtures/phase0-test-mod/` (game-files-specialist), then copied to the mod folder and run at 867 and 1066 (human) -> section 7
- [ ] 0.8 Same-date precedence (optional, human) -> section 8
- [ ] 0.9 Fold findings into the plan: exporter faith line, slider table, age rounding, CoA codec target, parity fixture (orchestrator, then `/phase-review`)

## Waiting on human

(none)

## Decisions made during implementation

(none yet)

## Doc corrections needed

(none yet)

## Log

- 2026-10-01 Repository scaffolded; agent team defined; Phase 0 not started.
