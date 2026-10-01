# Progenitor

Create custom Crusader Kings 3 rulers, courtiers and whole families, by hand or with
an AI chat, organize them into collections tied to a start date, and install them as a
mod. The app handles the modding rules (ids, dates, houses, title history,
localization, DLC gating); you handle the story.

Status: planning complete, Phase 0 (verification on a live install) next. See
`docs/plan.md` for the plan and `docs/research.md` for how the game files work.

## What v1 will do

- Characters: name, sex, age at start, traits, skills, description, full DNA sliders
  (no preview; copy and paste in the game's own format).
- Houses with coat of arms; dynasties are created automatically.
- Families: relations are stored on characters, so a family is whatever is connected.
- Collections: a start date (867, 1066 or 1178), members and their placements
  (replace a ruler, courtier, wanderer, landless adventurer with Roads to Power).
- AI chat on every screen that can create, edit and place characters, with a review
  step before anything generated enters your library. Bring your own API key
  (OpenRouter, OpenAI, DeepSeek, Ollama, LM Studio, Anthropic).
- Ruler Designer points reproduced exactly, with a per-character budget.
- One mod, regenerated on install, that never touches vanilla files.

## Building

Rust stable, Windows. `cargo build --workspace`. The UI uses gpui and gpui-component.

```
cargo test --workspace            # fast gate tests only
bun scripts/check_crate_layers.ts # crate dependency direction
```

## Repository layout

```
crates/            one crate per layer of docs/plan.md (Architecture)
docs/              plan, research, Phase 0 findings
fixtures/          synthetic game tree for CI; the real snapshot is gitignored
scripts/           repository checks
```

## License

Apache-2.0. Crusader Kings III is a trademark of Paradox Interactive; this project is
not affiliated with Paradox.
