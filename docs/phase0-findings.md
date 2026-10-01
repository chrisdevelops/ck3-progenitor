# Phase 0 findings

Measured on the live install. Fill every item before Phase 1 code starts. Keep raw
captures (Copy DNA text, clipboard dumps, log excerpts) under `docs/phase0/`;
anything containing Paradox file contents goes under `docs/phase0/private/`
(gitignored).

Checklist and instructions: `docs/plan.md`, section "Phase 0 checklist".

## 1. Environment

- Install path:
- `rawVersion` (from `launcher/launcher-settings.json`):
- Real Documents path (OneDrive redirected? yes/no):
- User-data folder:
- `game/dlc/` folders with `name` and `steam_id`:

| Folder | name | steam_id |
|---|---|---|
| | | |

- `dlc_load.json` contents (verbatim, with at least one mod enabled):

```json
```

- Conclusion: `enabled_mods` entry form is:

## 2. 1.20 history form

- Key used for faith in `history/characters/english.txt` (`religion` / `faith` / `rite`):
- Richard I (204510) block, verbatim:

```
```

- `common/religion/` folder layout:
- Conclusion: the character exporter writes:

## 3. Slider to gene mapping

Procedure: Ruler Designer, one slider at a time, Copy DNA after each position.

| Gene | Slider position | Expressed template | Value | Recessive template | Value |
|---|---|---|---|---|---|
| gene_chin_forward | left (0%) | | | | |
| gene_chin_forward | 25% | | | | |
| gene_chin_forward | 50% | | | | |
| gene_chin_forward | 75% | | | | |
| gene_chin_forward | right (100%) | | | | |
| hair_color | (describe) | | | | |
| gene_height | (describe) | | | | |

- Full default Copy DNA saved at `docs/phase0/copy_dna_default.txt`: yes/no
- Conclusion: mapping rule from slider percent to (template, value):

## 4. Age cost rounding and the parity fixture

| Character | Age | Skills (D/M/S/I/L/P) | Traits | Age line | Skill lines | Trait lines | Total |
|---|---|---|---|---|---|---|---|
| default | | | | | | | |
| age 24, all skills 5 | 24 | 5/5/5/5/5/5 | | | | | |
| age 24, martial 12 | 24 | 5/12/5/5/5/5 | | | | | |
| brave, just, beauty_good_1, education_martial_3 | | | | | | | |
| age 71 | 71 | | | | | | |
| lazy, craven | | | | | | | |

- Conclusion: age cost rounding rule:

## 5. Coat of arms clipboard

- Copy / Paste buttons present in the CoA editor: yes/no
- Clipboard contents after Copy (verbatim, saved at `docs/phase0/coa_copy.txt`):
- Conclusion: CoA codec target format:

## 6. Save Ruler location (low priority)

- Path:
- Format notes:

## 7. Hand-written test mod

- Mod folder: `mod/progenitor_test/`
- County chosen (vanilla holder has no later vanilla block before 1066):
- 867 start: count present? courtier present? wanderer in pool?
- 1066 start: vanilla holder restored?
- `error.log` lines mentioning `progenitor` (should be none):
- The mod is kept at `fixtures/phase0-test-mod/` as the first integration fixture: yes/no

## 8. Same-date precedence (optional)

- Title and date used:
- Which block won:

## Follow-ups folded into the plan

- [ ] Character exporter faith line
- [ ] DNA slider mapping table in `progenitor-dna`
- [ ] Age rounding in `progenitor-points`
- [ ] CoA codec target
- [ ] Parity fixture at `crates/progenitor-points/tests/parity.json`
