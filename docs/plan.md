# Progenitor implementation plan

As of 2026-10-01. Source of truth for this document is the shared plan; this copy is for the repository.

## What we are building

Progenitor is a Windows desktop app that creates custom Crusader Kings 3 characters, houses and families, by hand or through an AI chat, organizes them into collections tied to a start date, and installs them as one CK3 mod. The app owns every deterministic rule (ids, dates, house membership, title history, localization, DLC gating); the user and the AI own only the creative part. Research behind every game-file claim is in the companion doc *CK3 character modding research*.

**Decisions this plan rests on**

| Area | Decision |
| --- | --- |
| Platform and stack | Windows only. Rust, gpui, gpui-kit. Apache-2.0, public repository. |
| AI | Bring your own key. OpenAI-compatible adapter first (OpenRouter, OpenAI, DeepSeek, Ollama, LM Studio), Anthropic second. Tool calling required. Chat available on every screen and able to run any command. |
| Architecture | Plugin-shaped core: our own features are compile-time plugins filling fixed extension points. Dynamic loading later. Commands are the single write path for UI, AI and undo. |
| Data model | Characters are atoms with age at start and relations; families are derived; one family per character. Houses create their dynasty implicitly. Collections hold a start date and one placement per member. Library is plain files. |
| Placement | Replace a vanilla ruler, courtier of a ruler, wanderer in the pool, landless adventurer (Roads to Power). Displaced rulers stay alive and landless. |
| Install | One mod, all installed collections, any mix of dates. Each title grant gets a restore block one day later; every character gets a death age. File drop plus launcher instructions. |
| Points | Game formula reproduced exactly; budget on characters flagged playable, 400 default, per-character override; warns, never blocks. |
| Appearance | Full DNA sliders and coat of arms editor with no preview; copy and paste in the game's formats. |
| Scope cuts | No portrait preview, no other mods, no custom start dates, descriptions app-only, game 1.20 only, DLC-gated options hidden when absent, localization text copied to every language folder. |

**v1 is done when**

1. One chat message produces a Norse family of eight; after review and install, an 867 game starts with the head as count of the chosen county, the family at court, and a clean `error.log`.
2. A library with an 867 and a 1066 collection installed starts cleanly at both dates.
3. The points shown in the app match the in-game Ruler Designer for the same character.
4. A Copy DNA block pasted from the game, exported back and pasted into the game gives the identical face.
5. Every DLC-gated option is hidden on an install without that DLC.

## Architecture

One Cargo workspace, 15 crates, strict downward dependencies. Feature plugins (row 3) never import each other; they talk through the registry in core. `progenitor-points`, `-dna` and `-coa` are pure Rust with no gpui so their gate tests run headless and fast.

```
Layer 8  progenitor-app          binary: opens the window, bootstraps the registry, loads every plugin
Layer 7  progenitor-generators   single, family, batch, DNA from words
         progenitor-chat         chat page over the agent loop
         progenitor-mod          pipeline: validate, export, deploy
Layer 6  progenitor-characters   entity, commands, rules, page, export
         progenitor-houses       entity, dynasty, commands, page, export
         progenitor-collections  date, placements, install state
Layer 5  progenitor-ui           gpui-kit wrapper, field editors
         progenitor-agent        agent loop, tools from the registry
         progenitor-llm          OpenAI-compatible and Anthropic providers
Layer 4  progenitor-points       the Ruler Designer formula (pure Rust)
         progenitor-dna          genes, slider map, DNA codec (pure Rust)
         progenitor-coa          patterns, emblems, CoA codec (pure Rust)
Layer 3  progenitor-content      vanilla and DLC content source: cultures, faiths, titles at a date, traits, genes, governments, DLC flags
Layer 2  progenitor-game         install detection, version and DLC, jomini parser, byte-exact writer, SQLite index of the installed game
Layer 1  progenitor-core         registry, extension-point traits, command bus with undo, events, jobs, storage, draft state

Each crate depends only on crates in lower layers.
```

The three crates that depend on gpui-kit are `progenitor-ui`, the three feature plugins (their `ui` modules) and `progenitor-chat`; everything else compiles without a window, which is what keeps the test suite fast.

**Boundaries that matter**

- Core defines the extension-point traits and the `Command`, `Query`, `EntitySchema` and `Validator` types. Nothing in core knows a character exists.
- `progenitor-game` is the only crate that touches the game install on disk. It exposes a parsed, typed view and a writer; nobody else formats Clausewitz script.
- `progenitor-content` is a plugin, not core. It is the first content source, and a future mod-support plugin is a second one.
- Entity schemas hold culture, faith and title keys as plain strings; validators check them. That keeps entity types independent of content and the dependency graph acyclic.
- `progenitor-mod` reaches exporters only through the registry, so adding an entity type with an exporter changes nothing in the pipeline.
- `progenitor-agent` derives its tool list from the registry at startup; it never imports a feature crate. Generators do import feature crates, which is why they sit above them.

**Crate naming and discoverability.** Every exported type and function carries its domain in its name (`CharacterAgeAtStart`, `TitleHolderAtDate`, `RulerDesignerPointBreakdown`), no barrel modules or `pub use *`, and every error string names the rule that failed. Agents navigate this code by text search.

## Extension points and core services

Twelve sockets, each a trait in `progenitor-core`. A plugin is a struct implementing `Plugin` whose `register(&mut Registry)` fills any number of them. The registry loads plugins in declared dependency order and refuses cycles at startup.

| Socket | A plugin contributes | Depends on |
| --- | --- | --- |
| Content source | Cultures, faiths (and rites on 1.20), titles with history, traits, genes and templates, governments, bookmarks, CoA patterns and emblems, name lists, nicknames; each item tagged with its DLC flag | Game environment |
| Entity type | A record kind: schema, file format, version migrations | Nothing |
| Command | A named, typed, undoable write | Entity types, content |
| Query | A named, typed read | Entity types, content |
| AI tool | A command or query with LLM-facing description; derived automatically, overridable | Commands, queries |
| Generator | An AI workflow: prompt, allowed tools, how output lands as drafts | LLM provider, AI tools, entity types |
| LLM provider | An adapter reporting its capabilities (tool calling, JSON mode, context size) | Settings |
| Validator | A rule at stage entity, collection or mod-output | Entity types, content; mod-output stage also exporters |
| Importer | Parses an outside format into entities or fields | Entity types, content |
| Exporter | Writes one part of the mod and returns localization entries | Entity types, content |
| Field editor | A UI editor for one schema field type | progenitor-ui |
| Page | A screen or a slot in one (navigation entry, character tab, collection column, settings section) | Commands, queries, validators, field editors |

**Core services** (used by plugins, not replaceable in v1)

- **Game environment**: install path (Steam `libraryfolders.vdf`, then a user-chosen path), `rawVersion` from `launcher-settings.json`, installed DLC from `game/dlc/*/*.dlc` minus `dlc_load.json` `disabled_dlcs`, user-data folder via the shell's Documents path (OneDrive-safe).
- **Registry**: plugin loading, socket lookup, dependency order.
- **Storage**: the library folder; trait boundary so SQLite or sync can replace it later.
- **Command bus**: executes commands, records inverse operations, exposes undo and redo; emits events.
- **Event bus**: `EntityChanged`, `GameReindexed`, `DraftCreated`, `InstallFinished`.
- **Job runner**: anything slower than a frame (indexing, LLM calls, ck3-tiger) runs here with progress and cancellation.
- **Draft state**: any entity may be `pending`; `ApproveDraft` and `DiscardDraft` are ordinary commands.
- **Mod pipeline**: validate, export, assemble, fan out localization, deploy. Owned by `progenitor-mod` but exposed as a core job.

**Command contract** (every write in the app)

```rust
pub trait Command: Send + Sync {
    const NAME: &'static str;            // "character.set_trait"
    type Input: DeserializeOwned + JsonSchema;
    type Output: Serialize;
    fn execute(&self, ctx: &mut CommandContext, input: Self::Input) -> Result<Self::Output, CommandError>;
    fn inverse(&self, ctx: &CommandContext, input: &Self::Input) -> Option<Box<dyn AnyCommand>>;
    fn danger(&self) -> Danger;          // Safe | Confirm | Destructive
}
```

`JsonSchema` on `Input` is what makes AI tool derivation automatic: the agent gets a tool per command with its schema and `NAME` as the tool name. `danger()` decides whether the chat asks before running it. A command that returns no inverse is not undoable and must be `Confirm` or `Destructive`.

**Query contract**: same shape minus `inverse` and `danger`; queries are always safe for the AI to call.

**What is not a socket**: pure functions a plugin exposes to dependents, such as `progenitor_points::compute_breakdown`. Not everything needs a socket.

## Data model and library files

Three entity types. A library is one folder; every entity is one JSON file; the folder is safe to put in git or zip and send to a friend.

```
<library>/
  library.json                  # schema version, library name, id prefix
  characters/<id>.json
  houses/<id>.json
  collections/<id>.json
  drafts/<generation id>/...    # pending entities, same layout, moved on approve
```

**Ids.** Generated once, never reused, lowercase so they are valid as CK3 script ids: `progenitor_c_<ulid>` for characters, `progenitor_h_<ulid>` for houses, `progenitor_d_<ulid>` for the implicit dynasty, `progenitor_dna_<ulid>` for DNA entries, `d_laamp_progenitor_<ulid>` for adventurer titles. ULIDs are 26 characters of Crockford base32; lowercased they fit the observed charset `[a-z0-9_]`. Vanilla ids are checked for collision at export, which cannot happen with this prefix but costs nothing.

**Character** (`characters/<id>.json`)

```json
{
  "schema": 1,
  "id": "progenitor_c_01j9k4m7z3q8x2v5n6b1c0d9e8",
  "name": "Felacia",
  "female": true,
  "age_at_start": 31,
  "death_age": 68,
  "culture": "anglo_saxon",
  "faith": "catholic",
  "house": "progenitor_h_01j9k4...",
  "house_override": false,
  "traits": ["brave", "just", "education_martial_3", "beauty_good_1"],
  "skills": { "diplomacy": 7, "martial": 12, "stewardship": 5, "intrigue": 5, "learning": 5, "prowess": 9 },
  "sexuality": "heterosexual",
  "relations": {
    "father": "progenitor_c_01j9...",
    "mother": null,
    "spouses": [ { "id": "progenitor_c_01j9...", "matrilineal": false, "married_at_age": 19 } ],
    "concubines": []
  },
  "external_relations": { "father": "122" },
  "flags": { "bastard": false, "legitimized": false, "twin_of": null },
  "playable": true,
  "point_budget": 400,
  "nickname": null,
  "dna": { "genes": { "hair_color": [42, 222, 176, 166], "gene_chin_forward": ["chin_forward_pos", 140, "chin_forward_pos", 127] } },
  "description": "Countess of Hampshire. Brutal in war, fair to her own.",
  "notes": ""
}
```

Rules the schema encodes:

- `age_at_start` and `death_age` are integers of years; `death_age` must exceed `age_at_start` for anyone the user marks alive, and may be less for ancestors. Birth and death dates are computed per collection, never stored.
- `relations` point at library characters; `external_relations` point at vanilla ids and are validated per collection date. Siblings are never stored.
- `house` is derived from parents by the game's rule unless `house_override` is true. A character with no house and no parents in a house is lowborn.
- `dna` is optional. When present it is the game's gene block as parsed, nothing else; hairstyles, beards and clothes are stored but exported only when the user asks (default: dropped, so the game picks culture-appropriate ones).
- `playable` and `point_budget` drive the budget warning. Points are computed, never stored.
- `description` is app-only. `notes` is free text for the user.

**House** (`houses/<id>.json`)

```json
{
  "schema": 1,
  "id": "progenitor_h_01j9...",
  "name": "Whiteash",
  "prefix": "of ",
  "motto": "Ash endures",
  "culture": "anglo_saxon",
  "parent_house": null,
  "coat_of_arms": { "pattern": "pattern_solid.dds", "color1": "blue", "color2": "white", "emblems": [ { "texture": "ce_lion_rampant_crown.dds", "color1": "white", "color2": "yellow", "instances": [ { "position": [0.5, 0.5], "scale": [1.0, 1.0] } ] } ] }
}
```

A house with `parent_house: null` is a founding house: at export it becomes a dynasty entry and the house is implicit. A house with a parent is a cadet branch: it becomes a `dynasty_house` entry under the parent's dynasty. `coat_of_arms: null` lets the game generate one.

**Collection** (`collections/<id>.json`)

```json
{
  "schema": 1,
  "id": "progenitor_col_01j9...",
  "name": "House Whiteash, 867",
  "start_date": "867.1.1",
  "installed": true,
  "members": [
    { "character": "progenitor_c_01j9...", "placement": { "kind": "replace_ruler", "title": "c_hampton" } },
    { "character": "progenitor_c_01ja...", "placement": { "kind": "courtier", "employer": { "library": "progenitor_c_01j9..." } } },
    { "character": "progenitor_c_01jb...", "placement": { "kind": "courtier", "employer": { "vanilla": "122" } } },
    { "character": "progenitor_c_01jc...", "placement": { "kind": "pool" } },
    { "character": "progenitor_c_01jd...", "placement": { "kind": "adventurer", "region_title": "d_somerset" } }
  ]
}
```

`start_date` is one of the three bookmark dates in v1. A member whose placement is missing defaults to "courtier of the head" if a related member is landed in this collection, otherwise to `pool`; the UI shows the default and lets the user change it.

**The vanilla index** is separate from the library: a SQLite file under the app data folder, rebuilt from the install when `rawVersion` changes. Tables: `title`, `title_history_block`, `character` (id, name, birth, death, dynasty, culture, faith), `dynasty`, `house`, `trait`, `gene_template`, `culture`, `faith`, `government`, `bookmark`, `dlc`. Title state at a date is a query over `title_history_block`, replaying blocks in date order with stable ties.

## Mod generation rules

Install regenerates the whole mod from every collection marked `installed`, every time. Nothing is patched in place, so the output is always a pure function of the library and the installed game.

**Files written** (all additive; no vanilla file is ever overridden)

```
<userdata>/mod/progenitor.mod
<userdata>/mod/progenitor/descriptor.mod
<userdata>/mod/progenitor/common/dynasties/zz_progenitor_dynasties.txt
<userdata>/mod/progenitor/common/dynasty_houses/zz_progenitor_houses.txt
<userdata>/mod/progenitor/common/coat_of_arms/coat_of_arms/zz_progenitor_coa.txt
<userdata>/mod/progenitor/common/dna_data/zz_progenitor_dna.txt
<userdata>/mod/progenitor/common/landed_titles/zz_progenitor_adventurers.txt   (only if adventurers exist)
<userdata>/mod/progenitor/history/characters/zz_progenitor_characters.txt
<userdata>/mod/progenitor/history/titles/zz_progenitor_titles.txt
<userdata>/mod/progenitor/localization/<lang>/zz_progenitor_l_<lang>.yml      (12 languages)
<userdata>/mod/progenitor/progenitor-manifest.json                         (what was installed, for uninstall and diagnostics)
```

Descriptor: `name="Progenitor"`, `version` = app version, `supported_version` = the exact `rawVersion` read from the install, `path="mod/progenitor"`, no `replace_path`. Writer output is UTF-8 with BOM, tab-indented, LF line endings, strings quoted, dates unpadded. The writer is ours; `jomini` is used only for reading.

**Per collection, in order**

1. Resolve dates: `birth = start_date - age_at_start years` (same month and day as the start date), `death = birth + death_age years`. Dates before year 1 are an error.
2. Resolve houses: founding houses become dynasty entries; cadet houses become `dynasty_house` entries. A character gets `dynasty_house = house_x` if in a cadet house, else `dynasty = <dynasty id>`; never both.
3. Resolve relations: a relation to a character outside this collection is dropped and reported. External relations to vanilla ids are kept if the vanilla character exists; dropped and reported otherwise.
4. Emit characters. Static keys in vanilla order: `name`, `dna` (if any), `female`, `dynasty` or `dynasty_house`, skills, `religion` (and `rite` on 1.20 once Phase 0 confirms the form), `culture`, `trait` lines, `father`, `mother`, `sexuality`, `disallow_random_traits = yes` for every character. Dated blocks: `birth = yes`; marriages as `add_spouse` on one partner at the married date; `trait = bastard` and its legitimization; `employer` for courtiers and `move_to_pool = yes` for pool wanderers, dated on the start date; `death = yes` last.
5. Emit title history for each landed member:

```
c_hampton = {
	867.1.1 = {
		holder = progenitor_c_01j9...
		liege = k_england          # vanilla liege at that date, unless the title is independent
	}
	867.1.2 = {
		holder = 33358             # vanilla holder at 867.1.2, restoring the timeline
	}
}
```

The grant date is the start date, which is always later than the last vanilla block before it (bookmarks fall after vanilla's `<year>.1.1` entries) and never equal to one. The restore block hands the title to whoever vanilla resolves at start date plus one day. If vanilla's own next block is dated earlier than the restore, the restore is still emitted; it is harmless. Government is not written unless the user changed it.

6. Emit adventurer titles: a `landed_titles` entry copied from the vanilla `d_laamp_*` pattern with the character's id in the key, plus a history block with `government = landless_adventurer_government`, the succession law, the creation effect, the `destroy_landless_title_no_dlc_effect` guard, and `holder = 0` the day after the start date.
7. Emit DNA entries for characters that have one: `<dna id> = { portrait_info = { genes = { ... } } enabled = yes }`, without `clothes`, `hairstyles` or `beards` unless the character's `export_accessories` flag is set.
8. Emit coat of arms entries keyed by dynasty id, only for houses that have one.
9. Collect localization: `<name key>:0 "Felacia"` for every distinct first name (the key is the name with non-ASCII letters encoded as `X_`, matching vanilla), `dynn_progenitor_<id>`, `dynnp_progenitor_<id>` with the trailing space the user typed, `dynn_progenitor_<id>_motto`, and `<laamp key>` plus `_adj` for adventurer titles.

**Across collections**: character, house, DNA and CoA entries are emitted once per library entity, not once per collection; a character in two collections has two sets of dated blocks only if its dates differ, which they do (different start dates give different births), so a character in two collections is exported twice under two ids: `<id>` and `<id>_<start year>`. The manifest records the mapping. This is the one place the "same character at two dates" rule costs something, and it is invisible to the user.

**Localization fan-out**: the pipeline writes the same entries into `english, french, german, spanish, italian, polish, russian, simp_chinese, trad_chinese, japanese, korean, portuguese` with each file's header `l_<lang>:`.

**Deploy** (v1): write the folder atomically (write to `progenitor.tmp`, then rename), write `progenitor.mod`, then show a dialog: "Open the Paradox launcher, Playsets, Add mod, enable Progenitor." Detect the launcher running (process name) and warn before writing. Uninstall removes the folder and the `.mod` file and clears `installed` on every collection. Later: the opt-in launcher step writes `dlc_load.json` and the launcher database, guarded by `PRAGMA table_info`.

**Post-export check**: if `ck3-tiger.exe` is configured, run it on the written `descriptor.mod` with `--json`, parse, and show results in the install panel as the third validation stage. Never bundle its binary (GPL); offer a download link.

## Validation

Three stages, one `Validator` trait. Each rule returns `Error` (blocks install), `Warning` (shown, install allowed) or `Info`. Rules run on the job runner after every command that touches their inputs, and results are cached per entity so pages render badges without recomputing.

**Stage 1: entity** (runs as you edit; no date)

| Rule | Severity |
| --- | --- |
| `culture`, `faith` keys exist in the content source | Error |
| Every trait key exists and is `shown_in_ruler_designer` (hidden traits are allowed only via an "advanced" toggle) | Error |
| No two traits in an `opposites` relation; at most one education trait; education only at age 16+; childhood traits only at ages 3 to 15; sex-restricted traits respect `female` | Error |
| Skills within 0 to 100 | Error |
| `death_age` greater than `age_at_start` when the character is marked alive | Error |
| Parents at least 12 years older than the child; mother no more than about 50 years older; father alive within nine months before the child's birth; mother alive at birth | Error |
| Spouses both alive at marriage; `married_at_age` at or above 16 for both | Error |
| No relation cycles (a character cannot be their own ancestor) | Error |
| House consistent with parents unless `house_override` | Warning |
| DNA gene names and template names exist in the content source; values 0 to 255 | Error |
| Points over `point_budget` for a `playable` character | Warning |
| Name has characters outside the localization-safe set | Warning |

**Stage 2: collection** (against the collection's start date)

| Rule | Severity |
| --- | --- |
| Computed birth date is after year 1 and before the start date for anyone placed | Error |
| A placed character is alive at the start date | Error |
| Replace-ruler placement: the title exists at that date (replay says holder is not 0, or the title is a county or barony) | Error: "d\_somerset does not exist at 1066.9.15" |
| Replace-ruler placement: the title is not `landless` and not already taken by another member of this collection | Error |
| Replace-ruler: the character's government fits the county's holding type | Warning |
| Courtier placement: the employer (library or vanilla) is alive and in this collection or in vanilla at that date | Error |
| Adventurer placement: Roads to Power is installed | Error |
| Any DLC-gated culture, faith, tradition or clothing template referenced is installed | Warning (the game falls back) |
| A relation points at a character not in the collection | Info: "Osric is not in this collection; Felacia will have unknown parents" |
| External relation to a vanilla character who does not exist at that date | Warning, relation dropped |
| Two installed collections share the same start date and the same replaced title | Error |
| Installed collections of different start dates | Info, until mixed installs are proven in-game |

**Stage 3: mod output** (after export)

| Rule | Severity |
| --- | --- |
| Every id referenced in the written files is defined in the written files or in the vanilla index | Error |
| Every localization key written is referenced and vice versa | Warning |
| ck3-tiger findings, if configured, mapped by severity | As reported |
| The written mod re-parses with `jomini` into the same tree | Error (writer bug) |

**Where rules live.** Each rule is a small struct in the plugin that owns the data it checks (characters rules in `progenitor-characters`, placement rules in `progenitor-collections`). The runner in core only knows the trait. A rule declares which entity types and which content tables it reads, so the runner knows what to re-run after a change.

**Age consistency is the one rule that spans entities.** It is implemented once, as a function over the relation graph, and reported on every character involved.

## Point calculator and trait rules

`progenitor-points` is a pure function from a character plus the content source to a breakdown. It reads its constants from the installed game at index time, never from a table in the code, so a game update changes numbers without a release.

```rust
pub struct RulerDesignerPointBreakdown {
    pub age: f64,
    pub skills: [(SkillKind, u32, f64); 6],   // skill, base value, cost
    pub traits: Vec<(TraitKey, i32)>,
    pub sons: u32, pub daughters: u32,         // 10 each; always 0 for library characters
    pub total: f64,
    pub cap: u32,                              // IRONMAN_POINT_MAX, 400 in vanilla
}
pub fn compute_breakdown(c: &CharacterForPoints, content: &dyn PointConstants) -> RulerDesignerPointBreakdown;
```

**Formula** (from `common/defines/00_defines.txt`, `common/script_values/02_ruler_designer_values.txt`, `common/traits/00_traits.txt`):

- Age cost = age multiplied by `AGE_LEVEL_MULTIPLIERS[i]` where `i` is the first index with age at or below `AGE_LEVELS[i]`; above the last level the multiplier is 0. Rounding: whatever Phase 0 measures in the designer's breakdown; until then, display one decimal.
- Skill cost, per skill, on the base value before trait bonuses: brackets 1-4 at 2 per point, 5-8 at 4, 9-12 at 7, 13-16 at 11, 17 and up at 17; cumulative 8, 24, 52, 96 at bracket tops. Prowess at 1, 2, 4, 7, 11 with cumulative 4, 12, 28, 56. Values of 0 cost 0. The constants are parsed from the script value's `if` ladder, not hardcoded; the parser is unit-tested against the vanilla file.
- Trait cost = the trait's `ruler_designer_cost`, default 0.
- Children: not applicable to library characters (relatives are real characters, not generated ones), so 0. Spouse: 0.
- Total compared with the character's `point_budget` (default `IRONMAN_POINT_MAX`); over budget is a Warning.

**Trait selection constraints** enforced by the entity validator and by the trait picker UI:

- Only traits with `shown_in_ruler_designer = yes` appear, grouped by `category` as the game's picker does (education, personality, other), with congenital, health, fame, lifestyle and commander sub-groups inside "other".
- At most one `education` trait; only for characters aged 16 or older. The default education trait is `DEFAULT_EDUCATION_TRAIT` from defines.
- `childhood` traits only at ages 3 to 15.
- Opposites: a trait is disabled while any trait listing it (or its `group`) in `opposites` is selected.
- `valid_sex` respected; leveled traits (`beauty_good_1..3`) allow one per group.
- Hidden traits (`twin`, `bastard`, `legitimized_bastard`, and the rest) are set by the app from flags, never picked.

**Parity test** (success criterion 3): a fixture of six characters with known in-game totals, recorded in Phase 0, lives in `progenitor-points/tests`. The gate test fails if any total drifts.

## DNA and coat of arms editors

Both editors have no preview. Their value is exactness: what the app exports must be what the game would have produced, so the verification loop (copy from app, paste into the game's editor, look) is trustworthy.

**Gene model** (`progenitor-dna`). The content source provides the gene list from the installed `common/genes` (name, category, templates with their index, whether it is a color gene) and the DLC flag of each hairstyle, beard and clothing template. The editor never ships a gene list of its own; the 104-gene inventory in the research doc is a test fixture, not a source of truth.

**Slider mapping.** The game's sliders collapse a gene's two templates into one control. The mapping from slider position to `(template, 0-255)` is Phase 0 item 3; the editor stores the game's representation (two alleles) and shows the slider as a view over it. Until Phase 0 lands, the editor shows the raw pair. Recessive alleles are written equal to the dominant ones for generated DNA, so children inherit the face the user designed.

**Slider groups**, mirroring the in-game designer's sections so an in-game user can navigate by habit: Colors (hair, skin, eyes), Head, Forehead and brows, Eyes, Nose, Mouth, Cheeks and jaw, Ears, Neck and body, Details (face detail, expression, complexion, age), Accessories (hair type, baldness, body hair, eyebrows, eyelashes, teeth, eye accessory), Hair and beard and clothes (shown but marked "chosen by the game unless exported"). Group membership is a table keyed by gene name; unknown genes from a newer game version land in an "Other" group rather than being hidden.

**Codecs.**

- `parse_copy_dna_text(&str) -> Result<DnaBlock, DnaParseError>`: accepts the Ruler Designer's clipboard form (`ruler_designer_<n>={ type=... genes={ ... } entity={ 0 0 } }`), a bare `genes={ ... }` block, and a `common/dna_data` entry. Tolerant of whitespace and quoting variants; strict on gene names (unknown names are reported, not silently dropped, and the user chooses to keep or drop them).
- `write_copy_dna_text(&DnaBlock) -> String`: produces the clipboard form the game's Paste DNA accepts. Round-trip test: parse then write then parse equals the original.
- `write_dna_data_entry(id, &DnaBlock) -> String`: the mod form.
- `parse_save_dna_base64` is out of scope for v1 (importing from saves is a later importer).

**UI.** Each slider row shows the game-style slider, the numeric field, and the two template names in small type. Buttons: Copy DNA (clipboard, game form), Paste DNA, Randomize within culture (uses the content source's ethnicity ranges, so the result is plausible for the character's culture), Reset. "Export accessories" is a per-character toggle, off by default.

**Coat of arms** (`progenitor-coa`). The content source provides patterns, emblem textures and named colors from `gfx/coat_of_arms` and `common/coat_of_arms`. The editor is a form: pattern, two pattern colors, a list of emblems each with texture, up to two colors, and one or more instances (position, scale, rotation). Codecs: `parse_coa_script` and `write_coa_script` for the `common/coat_of_arms` block form (what modders exchange), and whatever clipboard form the in-game designer exposes once Phase 0 item 5 establishes it. If the game has no clipboard form, Copy produces the script block and Paste accepts it.

**DNA from a description** (generator, later phase). The AI receives the gene list with each gene's human meaning and range, plus whatever calibration data exists, and returns slider values. Quality depends on the calibration dataset (parked work). The generator is built in the AI phase; its quality work is separate.

## AI layer

The chat is a thin client over an agent loop that only ever calls registered commands and queries. The LLM never writes game script and never sees a culture, faith or title as free text it could misspell; it picks from lists the tools return.

**Providers** (`progenitor-llm`)

```rust
pub trait LlmProvider: Send + Sync {
    fn id(&self) -> &str;                                   // "openai_compatible", "anthropic"
    fn capabilities(&self, model: &str) -> ModelCapabilities; // tool_calling, json_mode, context_tokens
    async fn chat(&self, req: ChatRequest) -> Result<ChatStream, LlmError>;  // streaming tokens and tool calls
}
```

- `OpenAiCompatibleProvider { base_url, api_key, model }` covers OpenRouter, OpenAI, DeepSeek, Ollama (`/v1`), LM Studio and anything else that speaks chat completions with tools. Presets in Settings fill `base_url` for the known ones.
- `AnthropicProvider` for the Messages API.
- A model without tool calling is refused at Settings time with a clear message (decision Q4).
- Keys are stored with the Windows Credential Manager through the `keyring` crate, never in the library folder.

**Agent loop** (`progenitor-agent`)

1. Build the tool list from the registry: every command and query becomes a tool with its JSON schema and description. Commands marked `Confirm` or `Destructive` are wrapped so the loop pauses and asks the user before executing.
2. System prompt: who the assistant is, the current screen and selected entity (so "make her brother craven" resolves), the active collection and its date, installed DLC, and the rules the AI must follow (ask when a required fact is unknown; never invent keys; prefer queries before commands).
3. Run: send messages, stream the reply, execute tool calls on the command bus, append results, repeat until the model stops. Every executed command is one undo step and is listed in the chat as a change card ("Set Felacia: brave, just. Undo").
4. Clarifying questions are a tool: `ask_user { question, options? }` renders a question card in the chat and blocks the loop until answered. This is how "infer what you can, ask for the rest" is implemented without special cases.
5. Context management: tool results are truncated to what the model needs (a title search returns 20 rows, not 10,000), and the loop summarizes old turns when nearing the model's context size.

**Queries the AI leans on** (all plain registry queries, also used by the UI): `content.search_titles { text, at_date, tier }`, `content.title_holder { title, at_date }`, `content.search_cultures`, `content.search_faiths`, `content.traits { category }`, `content.name_list { culture, female }`, `library.search_characters`, `library.family_of { character }`, `points.breakdown { character }`, `validation.report { entity | collection }`.

**Generators** (`progenitor-generators`). A generator is a scripted conversation with its own prompt, a restricted tool set, and a landing rule. All four land their output as drafts in `drafts/<generation id>/`, never directly in the library.

| Generator | Input | What the model does | What the app does |
| --- | --- | --- | --- |
| Single character | Free text, optional collection | Infers or asks for culture, faith, sex, age; picks traits, skills, name, backstory | Validates keys, computes points, rolls a death age, creates the draft |
| Family | Free text, optional head (existing character), optional size | Proposes the tree as structured data: members with ages relative to the head, relations, names, traits, one-line backstories | Checks age consistency, assigns houses by the game's rule, rolls death ages, places everyone as courtiers of the head by default |
| Batch of NPCs | Free text, count | Proposes unrelated characters | Same as single, repeated; default placement `pool` |
| DNA from words | Free text, a character | Returns slider values per gene | Clamps, fills unset genes from the culture's ethnicity ranges, writes both alleles |

The family generator asks the model for a compact structured proposal first (one tool call: `propose_family { members: [...] }`) and only then runs validation and creation, so a bad proposal costs one round trip, not forty commands.

**Draft and review flow**

- A generation produces a draft set: entities in `drafts/<id>/` plus a summary. The review screen lists them with points, warnings and a family tree; each opens in the normal character editor, so edits in review use the same commands and are undoable.
- `ApproveDraft { ids }` moves entities into the library (and into the collection, if one was targeted); `ApproveAll`; `DiscardDraft`. Approving a subset drops relations to discarded members with the usual warning.
- Drafts persist across restarts until approved or discarded (decision from the assumptions).
- Edits to existing library items through chat skip drafts and apply with undo (decision Q5).

**Cost and privacy**: the Settings page shows tokens used per provider for the session; no telemetry leaves the machine.

## UI

One window: a left navigation rail, a main area, and a chat panel that can be docked right or collapsed to a bar. The chat is present on every screen and knows what is selected. gpui-kit's docking and theming are used as-is; the app ships light and dark.

**Screens**

| Screen | Content | Owned by |
| --- | --- | --- |
| Setup (first run) | Detected game path and version, DLC list, library folder, LLM provider; re-openable from Settings | progenitor-app |
| Characters | Searchable table (name, house, age, points, warnings); New, Duplicate, Generate family around; opens the character page | progenitor-characters |
| Character page | Tabs: Overview (name, sex, age at start, culture, faith, house, playable, budget, description), Traits and skills (picker grouped like the game, points meter with breakdown), Appearance (DNA editor), Family (tree; add parent, spouse, child; external vanilla relations), Placements (which collections include this character and where) | progenitor-characters; the Placements tab is a slot filled by progenitor-collections |
| Houses | List; house page with name, prefix, motto, coat of arms editor, members, "split into cadet house" | progenitor-houses |
| Collections | List with date and installed state; collection page: member table with a placement column and warning badges, add characters (with "bring relatives"), Install, Uninstall, launcher instructions, ck3-tiger results | progenitor-collections, progenitor-mod |
| Review | Pending drafts grouped by generation: summary, family tree, per-member points and warnings, Approve, Approve all, Discard | progenitor-generators |
| Settings | Game path, library folder, providers and keys, model presets, ck3-tiger path, undo history size | progenitor-app, with sections contributed by plugins |

**`progenitor-ui` components** (built on gpui-kit primitives; pages import only these)

- `EntityForm`: renders any entity schema through registered field editors; handles dirty state, validation badges and command dispatch per field.
- Field editors shipped in v1: text, number, toggle, enum (dropdown), `CultureKey`, `FaithKey`, `TitleKey` (with "held by X at the collection date"), `CharacterRef` (library search), `VanillaCharacterRef`, `TraitList`, `SkillSet`, `DnaBlock`, `CoatOfArms`, `AgeAtStart`.
- `PointsMeter`: total vs budget with the breakdown on hover; red above budget.
- `ValidationBadge` and `ValidationList`: severity, message, jump-to-field.
- `FamilyTree`: generations top-down, spouses side by side, click to open, drag to re-parent (dispatches `character.set_parent`).
- `DraftBanner`: shown on any pending entity with Approve and Discard.
- `ChatPanel`: message list, streaming, tool-call change cards with Undo, question cards for `ask_user`, confirmation cards for dangerous commands.
- `SliderWithNumber`: the DNA row control.

**Keyboard and undo**: Ctrl+Z and Ctrl+Shift+Z everywhere, including for changes the chat made. Ctrl+K focuses the chat.

**Design direction**: quiet, dense, data-first; CK3's own UI is ornate, and copying it would make the app harder to read. Game terms are used verbatim (county, duchy, courtier, house, dynasty) and every picker shows the game key in small type next to the display name, so modders can trust what will be written.

**Manual flow for a first-time user** (what "simple" means in practice): New character asks for a name and sex, then opens the page with a culture and faith pre-filled from the last used values; everything else has a sane default. A character is valid the moment it has a name, a culture and a faith. Placing it is one picker on the Collections screen. Install is one button.

## Phases and gates

Nine phases in strict order; each ends at a gate that is a test, not an opinion. Phase 0 has no code and must finish before Phase 1 starts, because its answers change the writer and the DNA editor. The game itself is the gate from Phase 5 on. No dates: the phases are sized so that each is a few focused sessions with a coding agent, and the gate decides when it is done.

| Phase | Scope | Gate |
|---|---|---|
| 0: Verify on the live install | slider map, rite, enabled_mods, age rounding, CoA clipboard; hand-written test mod with one replaced count and one courtier | test mod loads at 867 and 1066 with a clean error.log |
| 1: Foundation | workspace; core: registry, commands, undo, events, jobs, storage; game: detect install, parse, byte-exact write, SQLite index | vanilla parses and round-trips; Harold holds k_england at 1066.9.15 |
| 2: Content, entities, shell | content source with DLC flags; entity schemas; progenitor-ui; schema-driven forms; app shell; Characters list and page | create, edit, save and undo a character via commands and the form |
| 3: Characters in depth | trait picker and rules, points meter, DNA editor and codecs, coat of arms editor, family tree, importers | points parity fixture passes; Copy DNA round-trips byte-exact |
| 4: Houses, collections, validation | house page, implicit dynasty, cadet split; collection page, placements, title picker at date; every stage 1 and 2 rule | an 867-only duchy is flagged inside a 1066 collection |
| 5: Mod pipeline | exporters, restore blocks, death ages, localization fan-out, deploy, manifest, uninstall, ck3-tiger as stage 3 | criterion 1 by hand and criterion 2 pass in the game |
| 6: LLM and chat | providers, agent loop, tool derivation, ask_user, change cards; chat panel docked on every screen with undo | chat edits a character with undo; switching providers works |
| 7: Generators and review | single, family, batch, DNA from words; drafts on disk; review screen with approve, approve all, discard | criterion 1 from one chat message through review and install |
| 8: Release | installer, first-run polish, docs, DLC-hiding audit, tagged release on GitHub | criterion 5; clean install on a second Windows machine |

Each phase ends with its gate test green, with the `CHANGELOG` updated, and with the plan doc's Phase 0 answers folded into code where they applied. Phases 6 and 7 can start in parallel with Phase 5's in-game testing, since the LLM crates depend only on core.

**Work inside each phase, in order**

- **Phase 0**: the checklist in the next section, run with a coding agent on your machine against your game install. Output: a `docs/phase0-findings.md` with measured values and the test mod that loaded cleanly.
- **Phase 1**: Cargo workspace with the 15 crates as empty shells and the dependency rules enforced by `cargo deny` or a workspace lint; `progenitor-core` traits and the command bus with an in-memory test harness; `progenitor-game` with install detection, the `jomini` reader, the byte-exact writer, and the SQLite index; a CLI subcommand `progenitor index` to rebuild it. Gate tests: parse every vanilla file without error; write a parsed file and parse it back to the same tree; `title_holder("k_england", 1066.9.15) == "122"`.
- **Phase 2**: content source plugin; entity schemas for the three types; storage on disk with migrations; `progenitor-ui` primitives and the schema-driven form; the gpui app shell with navigation and the Characters list and page. Gate: a UI test drives New character, edits fields, saves, undoes, and the file on disk matches a fixture.
- **Phase 3**: trait picker with every selection rule; the points crate and meter with the parity fixture; the DNA editor with slider groups and both codecs; the CoA editor and codecs; the family tree and relation commands; the Copy DNA and CoA importers. Gate: parity fixture, DNA round-trip, CoA round-trip.
- **Phase 4**: houses and the implicit dynasty; cadet split; collections with placements, the title picker over `title_holder_at_date`, and bring-relatives; all stage 1 and 2 validators with the runner and caching; the Placements tab slot. Gate: a fixture collection reports the expected warnings and errors.
- **Phase 5**: every exporter; restore blocks; death-age rolling; localization fan-out; deploy, manifest and uninstall; ck3-tiger runner; the install panel. Gate: the generated mod loads at 867 and 1066 with a clean `error.log`, by hand in the game.
- **Phase 6**: `progenitor-llm` with both providers and the capability check; `progenitor-agent` with tool derivation, `ask_user`, confirmation cards, context trimming; `progenitor-chat` panel. Gate: a scripted conversation against a recorded provider edits a character and the undo stack shows one step per command.
- **Phase 7**: the four generators; drafts on disk; the Review screen. Gate: success criterion 1 from one message, with a recorded provider for the automated test and a live one for the real run.
- **Phase 8**: Windows installer (cargo-dist or an Inno script), first-run setup, README and a short user guide, an audit that every DLC-gated option hides on a no-DLC fixture, a signed tag.

## Phase 0 checklist

Run on your machine with a coding agent that can read the game install and the user-data folder. Each item names what to read or do, and what to record in `docs/phase0-findings.md`. Items 1, 2 and 7 need only files; items 3 to 6 need the game running and you at the keyboard.

- [ ] **1. Environment.** Record the install path, `rawVersion` from `launcher/launcher-settings.json`, the full `game/dlc/` folder list with each `.dlc` file's `name` and `steam_id`, and the contents of `dlc_load.json` (this answers the `enabled_mods` string form if any mod is enabled; if none is, enable any Workshop mod once and read it again). Record the real Documents path (OneDrive or not).
- [ ] **2. 1.20 history form.** In `game/history/characters/english.txt`, record whether characters use `religion =`, `faith =` or `rite =`, and copy Richard I's block verbatim. In `game/common/religion/`, list the folder layout (are there `rites/` files?). This decides what the character exporter writes.
- [ ] **3. Slider to gene mapping.** Open the Ruler Designer. For one morph gene (say chin forward): set the slider fully left, Copy DNA, paste into a file; repeat at 25%, 50%, 75%, fully right. Record the five `(template, value, template, value)` tuples. Repeat for one color gene and for `gene_height`. Then one full Copy DNA at defaults, saved as `fixtures/copy_dna_default.txt`.
- [ ] **4. Age cost rounding.** In the designer, set age to 24, 26, 41, 47, 49 and read the Age line in the points breakdown. Record the six characters' full breakdowns (age, each skill, each trait, total) for the parity fixture: default character; age 24 with all skills 5; age 24 with martial 12; one with brave, just, beauty\_good\_1, education\_martial\_3; one at age 71; one with lazy and craven.
- [ ] **5. Coat of arms clipboard.** In the designer's coat-of-arms editor, look for Copy and Paste buttons. If they exist, copy one design and paste the clipboard into a file; record its format. If not, record that paste must accept the script block.
- [ ] **6. Save Ruler location.** Save a ruler from the designer, then search the user-data folder for new files; record path and format. Low priority; skip if it takes more than a few minutes.
- [ ] **7. Hand-written test mod.** With the agent, write `mod/progenitor_test/` by hand following the Mod generation rules: one dynasty with a string id, one character with a string id replacing the count of a county whose vanilla holder has no later vanilla block before 1066 (the agent finds one by replaying title history), with the restore block one day later; one courtier with `employer =` pointing at a vanilla ruler; one wanderer with `move_to_pool`; localization in English only. Enable it in the launcher. Start an 867 game: confirm the count, the courtier and the wanderer. Start a 1066 game: confirm the vanilla holder, and that `error.log` has no lines mentioning `progenitor`. Keep the mod as the first integration fixture.
- [ ] **8. Same-date precedence (optional).** In the test mod, add a second block dated exactly on a vanilla block's date for a different title and see which wins. Only informational; the pipeline never relies on it.

When all eight are recorded, fold the answers into the plan: the writer's faith line, the DNA slider mapping table, the age-rounding rule, the CoA codec target, and the parity fixture.

## Testing strategy

Few tests, all of them on crucial paths. Rust's type system is the first test suite: newtypes for ids, dates and keys (`CharacterId`, `GameDate`, `TitleKey`), enums for placements and severities, and `Result` everywhere mean that most invalid states do not compile. Tests exist only where the compiler cannot help: parsing and writing the game's text formats, the point formula, the date and relation arithmetic, and the end-to-end export.

**Test budget rules**

- One gate test file per crate, `<crate>/tests/gate.rs`, written before the implementation, driving the crate only through its public contract. A gate covers the crucial path and the contract's failure modes, not every branch.
- Unit tests only where a function's internals are both intricate and compiler-invisible: the script writer, the slider mapping, the age-consistency graph. Nothing else gets unit tests by default, and a reviewer may delete tests that duplicate what types already guarantee.
- The whole workspace suite must run in well under a minute on your machine, so the edit-run loop stays short. Anything slower (the real vanilla snapshot, in-game runs) is behind a `--ignored` flag and runs before a release, not on every change.
- No mocking of internal crates. A gate uses real neighbours below it and fakes only the outside world: the LLM provider, the file system root, the game install path.

| Crate | Gate drives | Fixtures |
| --- | --- | --- |
| progenitor-core | Register a fake plugin with one command, one query, one validator; execute, undo, redo; events fire; dependency cycle refused | In-memory |
| progenitor-game | Parse every file in a vanilla snapshot; write and re-parse equals; index builds; `title_holder_at_date` matches known holders | A snapshot of vanilla files built from the local install by a script and gitignored; CI uses a small synthetic tree |
| progenitor-content | Cultures, faiths, traits and genes exposed with DLC flags; a no-DLC fixture hides gated items | Synthetic content tree plus the gitignored real one |
| progenitor-points | The Phase 0 parity fixture: six characters, exact totals | `tests/parity.json` |
| progenitor-dna | Parse and write round-trip on `copy_dna_default.txt` and on three community samples; unknown gene reported | Phase 0 files |
| progenitor-coa | Script round-trip | Vanilla `90_dynasties.txt` excerpt |
| progenitor-characters | Through commands only: create, set traits (rule violations refused with named errors), relations, house derivation, points warning | JSON fixtures |
| progenitor-houses | Implicit dynasty; cadet split re-parents members | JSON fixtures |
| progenitor-collections | Placements and every stage 2 rule against a fixture collection and the synthetic content tree | JSON fixtures |
| progenitor-mod | Export a fixture library and compare the written folder byte-for-byte with a golden folder; the Phase 0 test mod is the first golden | Golden folder |
| progenitor-llm | Both adapters against a recorded HTTP server (`wiremock`): streaming, tool calls, capability refusal | Recorded responses |
| progenitor-agent | Scripted conversations against a fake provider: tool derivation, confirmation pause, `ask_user`, undo per command | Fake provider |
| progenitor-generators | Family generation from a fake provider's fixed proposal lands as valid drafts; approve subset drops relations with a warning | Fake provider |
| progenitor-ui and pages | gpui-kit's UI integration testing: open a page, fill the form, dispatch, assert the command log | Headless gpui |

**In-game checklist** (run by you; the only test the game can give)

1. Phase 0 test mod at 867 and 1066.
2. Phase 5: the generated mod for a hand-built family at 867 and 1066; `error.log` filtered for `progenitor`.
3. Phase 7: success criterion 1 end to end.
4. Phase 8: the no-DLC audit if a second account or a DLC-disabled launch is available; otherwise the fixture test stands in.

**Fixture policy**: Paradox's files are not redistributable, so the repository holds a small synthetic content tree that mimics the formats, and a script (`cargo run -p progenitor-game -- snapshot`) that builds the real fixture from a local install into a gitignored folder. CI runs on the synthetic tree; the real tree runs locally before a release.

**CI**: GitHub Actions on Windows, `cargo clippy -D warnings`, `cargo test --workspace`, `cargo deny` for licenses and the dependency-direction rule, and a build of the installer on tags.

## Risks and parked work

**Risks**

| Risk | Effect | Mitigation |
| --- | --- | --- |
| gpui's API moves with Zed and gpui-kit pins a version | Upgrade churn, occasional breakage | Pin both; upgrade only at phase boundaries; keep gpui out of every crate but five |
| 1.20 history form (`rite`) differs from the 1.19 research | Exporter writes the wrong faith key; null faith can crash the game | Phase 0 item 2 before any exporter code; read `common/religion` at runtime |
| Same-date holder precedence | A grant could be overridden in rare cases | Grants are dated on the bookmark, which never coincides with a vanilla block; Phase 0 item 8 measures it anyway |
| Launcher rewrites `dlc_load.json` | Mod silently disabled after a launcher update | v1 relies on the user's playset; the install panel re-checks the `.mod` file exists and shows status |
| Weak local models produce poor families | Bad first impression of the AI feature | Capability check; recommended-model presets; the family generator asks for one structured proposal so failures are cheap |
| Game update changes a format mid-development | Parser or writer breaks | `supported_version` written exactly; the index rebuild detects the version; the synthetic fixture tree is versioned with the game |
| Paradox files cannot be redistributed | CI cannot test against real data | Synthetic tree in CI, real snapshot locally before release |
| Portrait expectations | Users expect to see faces | The verification loop (Copy DNA, paste in game) is documented on the Appearance tab itself |
| Scope creep from the chat being able to do everything | Unbounded tool surface | Tools are derived from commands; a feature without a command is not reachable by the AI, by design |

**Parked work** (not v1; recorded so it is not lost)

- CKTinder calibration dataset: a separate agent task. Keep only posts whose body or pastebin contains a parseable `genes={` block; drop blocks with non-vanilla gene names; download the portrait image; store (image, gene block) pairs. Reddit requires OAuth; plan for it. Your per-slider screenshots at 0, 50 and 100 percent for both sexes complement it. Both feed the DNA-from-words generator's prompt or a small regression model later.
- "Continue this house into 1066": generate descendants alive at a later date from an earlier collection's family.
- Dynamic plugins (WASM) with a declarative UI layer; the schema-driven form is the first version of that layer.
- Launcher automation as an opt-in deploy step.
- Custom start dates and custom bookmarks with a portrait dump, so a collection appears on the start screen.
- Importers: GEDCOM, save-game DNA (base64), existing mod folders.
- Coat of arms visual preview (feasible: patterns and emblems are 2D textures, unlike portraits).
- Portrait preview research, as the long-term challenge.
- macOS and Linux testing.
- Titular-title placement and an in-game description surface, if anyone asks for them.
