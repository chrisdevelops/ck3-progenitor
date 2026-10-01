# Progenitor

A Windows desktop app that creates custom Crusader Kings 3 characters, houses and
families (by hand or through an AI chat), organizes them into collections tied to a
start date, and installs them as one CK3 mod.

Read before any work:

- `docs/plan.md` — the implementation plan: architecture, data model, mod rules,
  phases and gates. This is the authority on what to build and in which order.
- `docs/research.md` — how CK3's game files work (characters, dynasties, houses,
  titles, traits, points, DNA, start dates, DLC gating). This is the authority on the
  game's formats. `docs/research-full-report.md` is the longer version with sources.
- `docs/phase0-findings.md` — measured facts from the live install. Phase 0 must be
  complete before Phase 1 code is written, because its answers change the writer and
  the DNA editor.

## Stack and constraints

- Rust, stable toolchain. UI: `gpui` and `gpui-component` (GPUI Kit). gpui-component
  0.7 pins `gpui-pre = "=0.3.7"` under the crate name `gpui`; depend on it the same way
  (see `[workspace.dependencies]`) and upgrade both together, only at a phase boundary.
- Windows is the only supported and tested platform. Path detection is written for all
  three OSes but macOS and Linux are untested.
- License Apache-2.0. `ck3-tiger` is GPL-3.0 and must stay an external subprocess; never
  link `tiger-lib`. `jomini` (MIT) is the reader; the writer is ours.
- Game version: current (1.20). Read every list (cultures, faiths, traits, genes, titles,
  defines) from the installed game at runtime. Never ship a table copied from the game.
- No other mods are supported in v1 and no vanilla file is ever overridden.
- All data stays local. API keys go through the OS credential store (`keyring`), never
  into the library folder.

## Architecture rules (enforced by review and by `cargo deny` bans)

- Crates depend only on crates in lower layers (the layer list is in `docs/plan.md`,
  Architecture). Feature plugins (`characters`, `houses`, `collections`) never import
  each other; they talk through the registry in `progenitor-core`.
- Commands are the single write path. The UI, the AI and undo all go through the
  command bus. A feature without a command does not exist for the AI, by design.
- `progenitor-game` is the only crate that reads or writes Clausewitz script.
- Entity schemas store game keys (culture, faith, title) as plain strings; validators
  check them. Entity types must not depend on the content source.
- Only `progenitor-ui`, `progenitor-chat`, `progenitor-app` and the `ui` modules of the
  three feature plugins may depend on gpui. Everything else compiles headless.
- Plugins fill extension points (content source, entity type, command, query, AI tool,
  generator, LLM provider, validator, importer, exporter, field editor, page). Core
  never names a plugin.

## Code conventions

- Discoverable names: every exported type, function, file and error string carries its
  domain (`CharacterAgeAtStart`, `TitleHolderAtDate`, `RulerDesignerPointBreakdown`).
  Agents and humans navigate by text search, so an identifier is a search query.
- No barrel modules and no `pub use *`. Re-export by name or import from the source.
- Newtypes for ids, dates and keys (`CharacterId`, `GameDate`, `TitleKey`); enums for
  closed sets (placement kind, severity). Invalid states should not compile.
- Error strings name the rule that failed ("parents must be at least 12 years older
  than the child"), never just "invalid".
- Keep modules small; one concept per file; the file name says what is in it.

## Testing budget (read this twice)

- Few tests, all on crucial paths. The type system is the first test suite.
- One gate test per crate: `<crate>/tests/gate.rs`, written before the implementation,
  driving the crate only through its public contract, covering the crucial path and the
  contract's failure modes. Not every branch.
- Unit tests only where internals are both intricate and compiler-invisible: the script
  writer, the slider-to-gene mapping, the age-consistency graph. Nothing else by
  default. Tests that duplicate what types already guarantee get deleted.
- The whole workspace suite must run in well under a minute. Slow runs (the real
  vanilla snapshot, in-game checks) are `#[ignore]` and run before a release.
- No mocking of internal crates. Fake only the outside world: the LLM provider, the
  file-system root, the game install path.
- Paradox's files are not redistributable: CI uses the small synthetic content tree
  under `fixtures/synthetic-game/`; the real snapshot is built locally into the
  gitignored `fixtures/vanilla-snapshot/` by `cargo run -p progenitor-game -- snapshot`.

## Agent team

Development runs as an agent loop. `docs/STATE.md` is the shared memory; the `/next`
skill is the orchestrator; `.claude/agents/` defines the roles: `rust-implementer`,
`rust-implementer-fast`, `ui-implementer`, `game-files-specialist`, `reviewer`,
`verifier`. Only the orchestrator writes STATE and commits. Every implementer task is
followed by the reviewer and the verifier. Phase boundaries and anything that needs the
game running stop for the human (`/phase-review`).

## Working agreements

- Work phase by phase as `docs/plan.md` lays out; do not start a phase before the
  previous gate is green. Record Phase 0 measurements in `docs/phase0-findings.md`.
- Before changing a decision recorded in `docs/plan.md`, say so and update the doc in
  the same change. The plan is not settled law, but it is the shared memory.
- Prefer `rg` for search. Commit messages describe the change; no attribution trailers.
- Close the Paradox launcher before writing anything under
  `Documents/Paradox Interactive/Crusader Kings III/mod/`.
