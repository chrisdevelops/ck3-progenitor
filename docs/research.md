# CK3 character modding research

As of 2026-09-30. Game files read from a 1.19.0.6 mirror plus a community 1.20 diff; items marked Unverified need checking on a live 1.20 install.

```
common/dynasties          <dyn_id> = { name culture }      name is a loc key dynn_<Name>; founders point here with dynasty =; coat of arms keyed by dyn_id
common/dynasty_houses     house_x = { dynasty = dyn_id }   cadet branches only; the engine makes the founding house; heads are computed, not set
history/characters        <char_id> = { ... }              dynasty = OR dynasty_house =; father, mother, spouse = ids; dated: birth, death, employer
common/landed_titles      k_ > d_ > c_ > b_ { province }   defines that a key is valid; landless = yes for adventurers; loc: <key>, <key>_adj
history/titles            c_x = { date = { holder = id }}  liege = k_y, government = ...; applied if date <= start date; holder = 0 destroys (duchy+)
common/dna_data           <key> = { genes = { ... } }      optional: omit and the engine rolls a face from culture; children inherit from parents
localization/english/     zz_<mod>_l_english.yml           dynn_<Name>, dynnp_<word>, dynn_<Name>_motto, character name keys, <title>, <title>_adj

Links: character --dynasty= / dynasty_house=--> dynasties / houses; house --dynasty=--> dynasty;
       history/titles --holder=<char_id>--> character; history/titles --key must exist--> landed_titles; character --dna=<key>--> dna_data
```

A character's own block never names a title. The title-history block (highlighted) is what lands a character on the map at a start date, and every other file is reached from the character by an id.

## Mod structure and file locations

The app never needs to touch vanilla files. Custom characters, dynasties, houses, title holders, DNA and localization are all additive when shipped in uniquely named files with unique ids ([Modding](https://ck3.paradoxwikis.com/Modding), [Mod structure](https://ck3.paradoxwikis.com/Mod_structure)).

**Version state (2026-09-30).** The wiki patch table ends at 1.19.0.6 "Scribe" (2026-05-25). Steam news dated today announces 1.20.0 "Crozier" with the *By God Alone* expansion ([Steam news](https://store.steampowered.com/news/app/1158310/view/684140727200907281)). Every schema in this doc was read from a 1.19.0.6 vanilla mirror plus a community 1.20 diff ([1.20.0.2.md](https://github.com/skonester/ck3-mod-base/blob/master/1.20.0.2.md)). 1.20-specific claims are marked *Unverified*.

**Where things live**

| Platform | Game install (vanilla content under `game/`) | User data (mods, logs, saves, launcher DB) |
| --- | --- | --- |
| Windows (Steam) | `steamapps\common\Crusader Kings III\game` | `%USERPROFILE%\Documents\Paradox Interactive\Crusader Kings III\` |
| macOS (Steam) | `~/Library/Application Support/Steam/SteamApps/common/Crusader Kings III/` | `~/Documents/Paradox Interactive/Crusader Kings III/` |
| Linux | `steamapps/common/Crusader Kings III/game` | `~/.local/share/Paradox Interactive/Crusader Kings III/` |

The user-data folder holds `mod/`, `logs/error.log`, `logs/database_conflicts.log`, `save games/`, `mods_registry.json`, `launcher-v2.sqlite` and `dlc_load.json`. Game version comes from `<install>/launcher/launcher-settings.json` (`rawVersion`, then `version`; check `gameId == "ck3"`). Steam builds can redirect user data via `gameDataPath` in that same file. Folder and file names are case-sensitive on macOS and Linux. Unverified: Paradox Store and GOG install paths; read the Windows Documents path from the shell (OneDrive redirection) rather than assuming `%USERPROFILE%\Documents`.

**The `.mod` descriptor.** Two copies per mod: `<name>.mod` beside the folder (required for the launcher) and `descriptor.mod` inside the folder (same content minus `path`).

```
version="0.0.1"
tags={
	"Culture"
	"Decisions"
}
name="My Mod"
supported_version="1.1.3"
path="mod/my_mod"
```

Other keys: `remote_file_id` (Workshop), `picture`, `replace_path` (removes vanilla files from a folder — never set it for an additive mod). Close the launcher before writing mod files. Unverified: whether `supported_version` accepts wildcards; fill it from `rawVersion`.

**Enabling the mod.** The launcher stores playsets in `launcher-v2.sqlite` (tables `playsets`, `mods`, `playsets_mods`). Launcher 2026.8 and 2026.10 renamed columns (`lastServerChecksum` to `deprecatedLastServerChecksum`, `thumbnailFileUrl` to `coverImagePath`) and broke a tool that hardcoded them ([StlTechRelGen #14](https://github.com/Clazex/StlTechRelGen/issues/14)). Stable columns: `playsets.id/name/isActive`, `mods.status/displayName/dirPath`, `playsets_mods.playsetId/modId/position/enabled`. The game itself reads `dlc_load.json`: `{"enabled_mods":[],"disabled_dlcs":[]}`; Irony's maintainer calls it "what holds the mod load order" ([Irony #171](https://github.com/bcssov/IronyModManager/issues/171)). The launcher rewrites it from the active playset on launch. Safe default: write the files, tell the user to add the mod to a playset, offer DB and JSON automation as an opt-in. Unverified: exact `enabled_mods` string form for CK3, full current launcher DDL.

**Load order and overrides.** Same relative path and filename = whole-file replacement by the lower mod in the playset. Same object id in different files = last file in ASCIIbetical order wins, except history characters, which "do not overwrite each other but produce duplicates" ([Modding](https://ck3.paradoxwikis.com/Modding)). So the additive file set is:

```
mod/<mod>.mod
mod/<mod>/descriptor.mod
mod/<mod>/common/dynasties/zz_<mod>_dynasties.txt
mod/<mod>/common/dynasty_houses/zz_<mod>_houses.txt
mod/<mod>/common/coat_of_arms/coat_of_arms/zz_<mod>_coa.txt
mod/<mod>/common/dna_data/zz_<mod>_dna.txt
mod/<mod>/history/characters/zz_<mod>_characters.txt
mod/<mod>/history/titles/zz_<mod>_titles.txt
mod/<mod>/gfx/portraits/portrait_modifiers/zz_<mod>_hair.txt   (optional)
mod/<mod>/localization/english/zz_<mod>_l_english.yml
```

Unverified (1.20): `history_override_priority = N` lets a mod override a single vanilla character without replacing the whole file.

**Syntax and encoding.** `key = value` and `key = { ... }` trees, `#` comments, `yes`/`no`, scope prefixes `culture:`, `faith:`, `title:`, `character:`. Dates are `yyyy.mm.dd` with no zero padding (`846.7.29`). Vanilla history files are UTF-8 with BOM and tab-indented. Localization `.yml` files must be UTF-8 with BOM.

**Localization.** File `localization/english/<anything>_l_english.yml` (US spelling only), first line `l_english:`, then `  key:0 "Text" ` with one leading space.

```
l_english:
 dynn_mymod_Stark:0 "Stark"
 dynnp_mymod_of:0 "of "
 dynn_mymod_Stark_motto:0 "Winter is Coming"
```

**Validation.** `logs/error.log` in the user-data folder; launch with `-debug_mode` for the console. `ck3-tiger path/to/descriptor.mod --game <dir> --paradox <userdir> --json` validates against vanilla, including spouse, employer and liege validity ([amtep/ck3-tiger](https://github.com/amtep/ck3-tiger)). It often lags game updates by days or weeks. Unverified: its JSON schema; engine behaviour on a malformed history file.

## Characters

A character is `<id> = { static keys ... <date> = { dated commands } }`. Every generated character must have a `birth` block, should have a `death` block, must reference an existing faith, culture and dynasty or house, and gets titles only from `history/titles`, never from its own block ([Character modding](https://ck3.paradoxwikis.com/Character_modding), [\_characters.info](https://github.com/skonester/ck3-mod-base/blob/master/base/game/history/_characters.info)).

**Official schema** (Paradox's shipped `_characters.info`, verbatim):

```
1001 = {	# character id
	name = ...
	dna = ...
	female = ...
	martial = ...
	prowess = ...
	diplomacy = ...
	intrigue = ...
	stewardship = ...
	learning = ...
	trait = ...
	father = ...
	mother = ...
	disallow_random_traits = ...

	faith = ...
	culture = ...
	dynasty = ...
	dynasty_house = ...
	give_nickname = ...
	sexuality = ...
	health = ...
	fertility = ...
	set_house = ...
	set_culture = ...
	set_character_faith_no_effect = ...
	add_spouse/add_matrilineal_spouse/add_same_sex_spouse = ...

	portrait_override = {
		portrait_modifier_overrides={ modifier_category_1 = modifier_1 }
		hair={ R G B }
	}
}
```

Attributes cap at 100. `sexuality` is one of `asexual|heterosexual|homosexual|bisexual`. `disallow_random_traits = yes` stops the engine adding random traits.

**What vanilla actually uses** (71,124 characters, 207 files, 1.19.0.6). Static keys by frequency: `name` 71,138, `culture` 71,082, `religion` 70,078, `dynasty` 56,738, `father` 55,961, `trait` 28,690, `mother` 14,911, `female` 12,520, `dynasty_house` 10,426, the four core skills about 8,900 each, `faith` 1,002, `learning` 493, `dna` 438, `disallow_random_traits` 241, `sexuality` 188, `prowess` 149, `health` 25. `set_house`, `set_culture`, `add_same_sex_spouse` and `portrait_override` have zero uses. Dated keys: `death` 56,465, `birth` 56,451, `add_spouse` 6,811, `employer` 949, `effect` 851, `trait` 845, `add_pressed_claim` 600, `give_nickname` 502, `remove_spouse` 178, `dynasty_house` 119, `capital` 105, `add_matrilineal_spouse` 61, `add_concubine` 47. Every vanilla character has a `birth` block; exactly one lacks `death`. Unverified: engine behaviour when `birth` is missing.

**Verbatim examples.** Basic ([french.txt](https://github.com/skonester/ck3-mod-base/blob/master/base/game/history/characters/french.txt)):

```
10011 = {
	name = "Robert"
	dynasty = 320
	martial = 8
	diplomacy = 6
	intrigue = 4
	stewardship = 6
	religion = "catholic"
	culture = french
	trait = education_martial_2
	father = 10026
	mother = 10027
	1035.1.1 = {
		birth = yes
	}
	1085.1.1 = {
		death = yes
	}
}
```

Rich (Richard I, [english.txt](https://github.com/skonester/ck3-mod-base/blob/master/base/game/history/characters/english.txt)):

```
204510 = {
	name = "Richard"
	dna = "204510_richard_poitiers"
	dynasty_house = house_plantagenet
	martial = 12
	diplomacy = 6
	intrigue = 6
	stewardship = 3
	religion = "catholic"
	culture = "norman"
	trait = brave
	trait = ambitious
	trait = arrogant
	trait = beauty_good_1
	trait = education_martial_3
	trait = education_martial_prowess_3
	trait = lifestyle_poet
	father = 204500
	mother = 205730
	1157.9.8 = {
		birth = "1157.9.8"
		effect = { learn_language_of_culture = culture:occitan }
	}
	1169.1.1 = {
		effect = { create_betrothal = character:205518 }
	}
	1187.1.1 = {
		give_nickname = nick_the_lionheart
		trait = faith_warrior
	}
	1191.5.1 = {
		add_spouse = 206501
	}
	1199.4.6 = {
		death = "1199.4.6"
	}
}
```

**Birth, death and dated state.** `birth = yes` means born on the block date (canonical form). Death forms: `death = yes`, `death = "1199.4.6"`, or `death = { death_reason = death_battle killer = 163101 }`. Common reasons: `death_battle`, `death_execution`, `death_natural_causes`, `death_murder`, `death_ill`, `death_old_age`. "Dead at start" is just a death block dated before the bookmark. Age at a start date = start date minus birth date. Static fields can be changed in a dated block (`1200.1.1 = { name = "Ioane" faith = "orthodox" culture = "georgian" }`).

**Unlanded placement.** `employer = <id>` in a dated block puts a courtier in someone's court; optionally `give_council_position = councillor_marshal|councillor_spymaster|councillor_chancellor|councillor_court_chaplain|councillor_steward`. `move_to_pool = yes` makes a wanderer. `capital = c_denia` sets a ruler's capital. Claims: `add_pressed_claim = title:d_valencia`, `add_unpressed_claim`, `remove_claim`, `set_primary_title_to`. Unverified: a landed character that also has `employer`.

**Faith key and the 1.20 change.** Vanilla 1.19 writes `religion = <faith key>` 70,078 times and `faith = <faith key>` 1,002 times; both take a faith key. The 1.20 community report says history now uses `rite = "..."`, that `religion = <faith>` survives as a compatibility alias, and that 62 former faith keys (`ashari`, `theravada`, `coptic`, `insular_celtic`, ...) became rites of a parent faith; a null faith is a known crash cause. Unverified against real 1.20 files. The app must read the installed `common/religion/` tree at runtime rather than ship a list.

**Ids.** Vanilla ids are mixed: 37,921 numeric (99 to 1,000,230,517) and about 33,100 strings (`aragonese0001`, `han_90005`, `easteregg_anna_johansson`). Numeric ids above 900,000 exist (238 between 900k and 10M; 70 at 1B+), so the wiki's "900000 and further is safe" is not strictly true. Vanilla already contains duplicate ids and the loader merges them silently, so a collision replaces a vanilla character with no error. Charset seen: `[A-Za-z0-9_-]`. Recommendation: prefixed string ids (`<mod>_char_0001`) and a collision scan of the installed `history/characters/*.txt` at generation time. Princes of Darkness does the same ([PoD wiki](https://www.princesofdarknessmod.com/wiki/index.php/Character_Creation_Steps)).

**Names.** `name =` is a localization key, not free text; vanilla resolves it in `localization/english/names/character_names_l_english.yml` (`Robert:0 "Robert"`). Accented letters are encoded in keys as `X_` (`E_douard`). Names do not have to be in a culture name list (17,706 of 30,636 vanilla names are not). Emit a `<key>:0 "Display"` line for every generated name. Nicknames: `give_nickname = nick_the_lionheart`.

**Relations.**

- Parents: `father =` and `mother =` (static).
- Marriage: `add_spouse = <id>` on one partner only (engine makes it bidirectional); `add_matrilineal_spouse`; `remove_spouse`.
- Concubines: `add_concubine = <id>` on the concubine-taker.
- Bastards: `trait = bastard`; legitimized on a date with `remove_trait = bastard` plus `trait = legitimized_bastard`.
- Twins: `trait = twin` on both, same parents and birth date.
- Adoption or changed paternity: only via `effect = { set_father = character:<id> }`.
- Siblings are inferred from shared parents. House membership follows the father in patrilineal marriage and the mother in matrilineal ([Dynasty](https://ck3.paradoxwikis.com/Dynasty)).
- Other effects used in vanilla: `set_relation_rival`, `set_relation_friend`, `set_relation_lover`, `create_betrothal`, `set_designated_heir`.

**Ruler Designer output is not script.** The in-game designer writes nothing to `history/characters`. It offers Copy DNA and Paste DNA (clipboard) and Save Ruler and Load Ruler by filename; 1.13.2 added loading only traits or only appearance from a saved ruler. Unverified: the on-disk path and format of saved rulers.

**Validation checklist for a generated character** (inference from the above):

1. Id is unique against the installed vanilla files and other mods.
2. `culture` exists in `common/culture/cultures`.
3. `religion`/`faith` (and on 1.20, `rite`) key exists.
4. Exactly one of `dynasty` or `dynasty_house`, referencing an existing entry.
5. Every `father`, `mother`, `add_spouse`, `employer` and `killer` id exists.
6. Birth is before every marriage, employer, house-change and death date.
7. Any title-holder dates fall inside the lifetime.
8. Every trait key exists in `common/traits`.
9. `name` has a localization entry.
10. `dna` key, if set, exists in `common/dna_data`.

## Dynasties and houses

Emit a dynasty (`name` = loc key, `culture`) and attach founders with `dynasty =`. Create a `dynasty_house` entry only for named cadet branches: the engine auto-creates the founding house, and vanilla never sets both `dynasty` and `dynasty_house` on one character ([Dynasties modding](https://ck3.paradoxwikis.com/Dynasties_modding), [forum tutorial](https://forum.paradoxplaza.com/forum/threads/lack-of-the-founding-house-tutorial-of-modding-dynasties.1452333/)).

**Schema.** Dynasty keys: `name`, `culture`, optional `prefix`, `motto`, `forced_coa_religiongroup`. House keys: `name`, `dynasty`, optional `prefix`, `motto`, `forced_coa_religiongroup`. No other keys occur in vanilla; there is no `head =` key. From [00\_dynasties.txt](https://github.com/skonester/ck3-mod-base/blob/master/base/game/common/dynasties/00_dynasties.txt) and [00\_dynasty\_houses.txt](https://github.com/skonester/ck3-mod-base/blob/master/base/game/common/dynasty_houses/00_dynasty_houses.txt):

```
3 = {
	prefix = "dynnp_de"
	name = "dynn_Villeneuve"
	culture = "norman"
}
7267 = { name = "dynn_Bunduqdarid" culture = "turkish" forced_coa_religiongroup = "muslim" }

house_habsburg = { # Etichonen cadets
	prefix = "dynnp_von"
	name = "dynn_Habsburg"
	motto = dynn_Habsburg_motto
	dynasty = 664 # Etichonen
}
```

Dynasty ids can be numeric (2 to 1,000,101,763) or strings (`tondaiman`, `vanity_johansson_2`), which contradicts the wiki's "string ids are not supported for dynasties". House ids are usually `house_*` but numeric ones exist.

**Coat of arms** is keyed by dynasty id in `common/coat_of_arms/coat_of_arms/`:

```
2100001 = {
	pattern = "pattern_solid.dds"
	color1 = "blue"
	color2 = "white"
	colored_emblem = {
		texture = "ce_lion_rampant_crown.dds"
		color1 = "white"
		color2 = "yellow"
		instance = { position = { 0.5 0.5 } scale = { 1.0 1.0 } }
	}
}
```

**How vanilla wires it.** 538 houses, every one pointing at an existing dynasty; 10,328 dynasties, so about 9,800 have no house entry at all. Characters: 56,780 use `dynasty` only, 10,427 `dynasty_house` only, 0 both, 3,917 neither (lowborn). A founder references the house directly (`200 = { # Hugh Capet ... dynasty_house = house_capet }`). A cadet house is founded on a date inside the founder's block:

```
aragonese0001 = {
	name = "Blasco"
	dynasty = 8685
	religion = catholic
	culture = aragonese
	father = aragonese0002
	1256.1.1 = { birth = yes }
	1279.1.1 = {
		add_spouse = 30793
		dynasty_house = house_alagona # House of Alagona, Founder
	}
	1302.1.1 = { death = yes }
}
```

**Heads are computed, not scripted.** On a house head's death their primary heir becomes house head. The dynasty head is the most powerful house head; another house head takes over when 10% stronger. Adventurer-government house heads cannot become dynasty heads, though custom characters start as one ([Dynasty](https://ck3.paradoxwikis.com/Dynasty)). Unverified: how the engine picks the initial house head at a bookmark, and what happens when a character's `dynasty` conflicts with its house's `dynasty`.

**Localization keys.** `dynn_<Name>` for dynasty and house names, `dynnp_<word>` for prefixes (`dynnp_de:0 "de "` with a trailing space, `dynnp_d-:0 "d'"` without), `dynn_<Name>_motto` for mottos. Vanilla keeps them in `localization/<lang>/dynasties/dynasty_names_l_<lang>.yml` and `mottos_l_<lang>.yml`. The prefixes are conventions, not engine rules, but culture name lists reference them (`cadet_dynasty_names = { { "dynnp_of" "dynn_Capet" } }`, `dynasty_of_location_prefix = "dynnp_de"`).

**Family generation in the app should mirror the engine rule**: a child born of a patrilineal marriage joins the father's house, of a matrilineal marriage the mother's. Name lists also carry child-naming odds (`pat_grf_name_chance = 50`, `mat_grf_name_chance = 5`, `father_name_chance = 10`), which the AI generator can use as flavour when naming children.

## Titles and title history

`common/landed_titles` makes a title key valid; `history/titles` makes it exist at a date. To land a custom character at a start date, add a new `history/titles/zz_<mod>.txt` with a dated block `holder = <id>` (plus `liege`), dated after the last vanilla block before the bookmark and on or before the bookmark date. "Exists at date D" is computed by replaying every block with date on or before D ([Title modding](https://ck3.paradoxwikis.com/Title_modding), [History modding](https://ck3.paradoxwikis.com/History_modding)).

**`common/landed_titles`.** Nested top-down with tier prefixes `e_ k_ d_ c_ b_` (plus `h_` hegemony). Baronies carry `province = <id>`. A county needs a duchy parent, a barony a county parent, every county at least one barony. You cannot add titular baronies or counties; a titular kingdom is just `k_x = { color = { 100 255 200 } }`.

```
	k_england = {
		color = { 202 26 26 }
		capital = c_middlesex
		...
		d_somerset = {
			color = hsv{ 1 0.9 0.9 }
			capital = c_hampton # Winchester
			...
			c_hampton = {
				color = { 230 15 55 }
				b_winchester = {
					province = 1544
				}
```

There is no `c_wessex` in vanilla; "Wessex" is the display name of `d_somerset`. Attributes that matter to a validator: `landless` (no), `require_landless` (no), `definite_form`, `ruler_uses_title_name` (yes), `capital`, `province` (barony only), `can_create` and `can_destroy` triggers. Landless adventurer titles (`d_laamp_*`) and administrative noble-family titles (`c_nf_*`, `noble_family = yes`) use ordinary prefixes but `landless = yes`, so never assume a `c_` key is on the map. 1.19 files: `00_landed_titles.txt` plus `01_japan*.txt`, `01_korea_noble_family.txt`, `01_other_noble_family.txt`, `02_china.txt`, `03_seasia.txt`, `04_china_noble_families.txt`, `05_goryeo.txt`, `06_philippines.txt`. Unverified (1.20): about 290 new `d_cd_*` clerical titles and `h_kingdom_of_heaven`.

Province mapping, only if the app ever shows a map: `b_winchester = { province = 1544 }` matches `map_data/definition.csv` row `1544;169;159;72;WINCHESTER;x;` and `history/provinces/k_england.txt` block `1544 = { culture = anglo_saxon religion = catholic holding = castle_holding ... }`. County culture, faith and holding type come from the capital barony's province.

**`history/titles` schema** ([Title modding](https://ck3.paradoxwikis.com/Title_modding)):

```
d_NAME={
	YYYY.MM.DD={
		holder = <char id>            # 0 destroys the title (duchy and above only)
		government = feudal_government
		liege = k_NAME                # higher tier, or 0 for independent
		de_jure_liege = k_OTHER
		change_development_level = INT
		succession_laws = { <NAME>_succession_law }
		effect = { set_capital_county = title:c_NAME }
	}
}
```

Semantics: the holder must be alive at the date or there is "a risk of an error or a crash"; `holder = 0` destroys but does not work for counties or baronies; a missing `liege` means independent; values persist until overridden; blocks execute in file order, not date order, so keep them sorted. A county with no entry at the start date is given to the lowest valid de jure holder or a random independent count; a barony to a random vassal of the county owner; a duchy or above is simply not created.

Vanilla example ([k\_england.txt](https://github.com/skonester/ck3-mod-base/blob/master/base/game/history/titles/k_england.txt)):

```
k_england = {
	867.1.1 = { change_development_level = 5 }
	1066.1.1 = { change_development_level = 8 }
	927.7.12 = {
		holder = 33350 # Aethelstan the Glorious
		succession_laws = { saxon_elective_succession_law }
	}
	1066.1.5 = {
		holder = 122 # Harold Godwinson
		effect = { set_capital_county = title:c_middlesex }
	}
	1066.10.14 = {
		holder = 140 # William the Conqueror
		remove_succession_laws = yes
	}
}

d_somerset = {
	757.1.1 = { holder = 205180 }
	924.8.3 = { holder = 33350 }
	939.10.27 = { holder = 0 }
}

c_hampton = {
	757.1.1 = { holder = 205180 }
	865.1.1 = {
		liege = "k_england"
		holder = 33358
	}
	1066.1.5 = { holder = 122 }
	1066.10.14 = { holder = 140 }
	1070.1.1 = {
		holder = 155245 # Bishops of Winchester
		government = theocracy_government
	}
}
```

So `d_somerset` exists in 867 and not in 1066 or 1178. The development entries dated `1066.1.1` with a bookmark at 1066.9.15 confirm "on or before start date" semantics. Holders can be string ids. Vanilla defines the same key in two files (`c_bombogor` in `k_naimania.txt` and `k_otuken.txt`) and defines `c_nf_dam` twice in one file with the same date, so the engine tolerates duplicates and merges them. Unverified: which block wins when two files give the same key and the same date; whether `name` and `reset_name` are valid history keys; engine behaviour when the resolved holder is dead.

**Resolving state at a start date** (algorithm, inference; ImperatorToCK3's MIT `TitleHistory` does exactly this with `GetHolderId(date)`, `GetLiegeId(date)`, `GetGovernment(date)` ([TitleHistoryTests.cs](https://github.com/ParadoxGameConverters/ImperatorToCK3/blob/master/ImperatorToCK3.UnitTests/CK3/Titles/TitleHistoryTests.cs))):

1. Parse every file under `history/titles/**`; merge duplicate keys across files into `title -> [(date, block)]`.
2. Stable-sort by date; apply every block with date on or before D, keeping the last value per key.
3. Duchy and above exists if the final `holder` is not 0 and that holder is alive at D. Counties and baronies always exist.
4. A `liege` held by the same character (Harold holds both `k_england` and `c_hampton`) means "not a vassal".

No vanilla file enumerates titles per bookmark; the app has to compute it. The git mirror [skonester/ck3-mod-base](https://github.com/skonester/ck3-mod-base) is a usable offline copy of the text tree for development.

**Replacing a vanilla holder.** Define the character (born before, dying after the bookmark), then add:

```
c_hampton = {
	1066.9.15 = {
		holder = mymod_char_0001
		liege = k_england
	}
}
```

Date it after the last vanilla block before the bookmark (`1066.1.5` here) and on or before the bookmark, so same-date precedence never matters. The displaced vanilla holder keeps every other title, because each title's history is independent. Vassals follow the title (`liege = d_x`), not the character, so they come along automatically. The wiki suggests moving the predecessor's death date to the takeover date for a clean dynasty tree; that requires overriding a vanilla character, which needs a whole-file override in 1.19 (or `history_override_priority` in 1.20, unverified), so the app should skip it by default.

**Governments.** 1.19 keys: `feudal_government, republic_government, theocracy_government, clan_government, tribal_government, wanua_government, mercenary_government, holy_order_government, administrative_government, landless_adventurer_government, nomad_government, herder_government, celestial_government, mandala_government, steppe_admin_government, meritocratic_government, japan_feudal_government`. Each declares `primary_holding`, `valid_holdings`, `required_county_holdings`, `primary_heritages`, `preferred_religions`, `can_get_government`, `fallback`, and DLC flags (`landless_playable`, `administrative` needs `admin_gov`). Feudal wants `castle_holding`; tribal wants `tribal_holding`; clan prefers Arabic, Iranian and Turkic heritages and Islam. A validator should warn, not reject, when the county capital's holding is not in the government's primary or valid holdings. Unverified: the primary-title rule at start (assume highest tier); the 1.20 `mechanic_type` rewrite and new `ecclesiastical_government`.

**Landless adventurers** (Roads to Power) are created by a `landless = yes` duchy plus title history, not by character history ([01\_laamp\_titles.txt](https://github.com/skonester/ck3-mod-base/blob/master/base/game/history/titles/01_laamp_titles.txt)):

```
d_laamp_wake = { # Hereweard the Wake
	1066.6.1 = {
		liege = 0
		holder = 90028
		government = landless_adventurer_government
		succession_laws = { landless_adventurer_succession_law }
		effect = {
			create_landless_adventurer_title_history_effect = yes
			set_variable = { name = adventurer_creation_reason value = flag:historical }
		}
	}
	1066.9.15 = {
		effect = { destroy_landless_title_no_dlc_effect = { DATE = 1066.9.15 } }
	}
	1072.1.1 = { holder = 0 }
}
```

The destroy effect removes the title when the player lacks `roads_to_power`. Supporting adventurers means the app must also emit a `landed_titles` entry per adventurer. Every title needs `<key>` and `<key>_adj` localization.

## Traits, skills and the Ruler Designer point system

Points used = age cost + sum of skill costs (on base values) + 10 per generated son + 10 per generated daughter + sum of each trait's `ruler_designer_cost`. The engine has no hard budget; `IRONMAN_POINT_MAX = 400` is only the achievements cap, and the bar turns red above it. Every input lives in three files the app should parse from the installed game rather than hardcode: `common/defines/00_defines.txt`, `common/script_values/02_ruler_designer_values.txt`, `common/traits/00_traits.txt` ([Ruler Designer](https://ck3.paradoxwikis.com/Ruler_Designer)).

**What costs nothing.** Sex, sexuality, faith, culture, name, dynasty name and coat of arms, appearance, weight, the title chosen, and landed vs adventurer vs noble-family mode. The localization has exactly six breakdown line items: Age, each Skill, Generated Sons, Generated Daughters, Married, Trait ([ruler\_designer\_l\_english.yml](https://github.com/skonester/ck3-mod-base/blob/master/base/game/localization/english/gui/ruler_designer_l_english.yml)). A random spouse costs 0. Children are limited to one per year since the ruler turned 16. A trait's cost ignores whether the faith counts it as a virtue or sin.

**Defines** (verbatim, [00\_defines.txt](https://github.com/skonester/ck3-mod-base/blob/master/base/game/common/defines/00_defines.txt); unchanged in 1.20 per the community diff):

```
NRulerDesigner = {
	IRONMAN_POINT_MAX = 400 # Above this value achievements are not allowed
	AGE_LEVELS = { 10 16 18 20 22 23 24 25 26 27 28 29 30 31 32 33 34 35 36 37 38 39 40 41 42 43 44 45 46 47 48 49 50 60 70 } # Index into below if <= age
	AGE_LEVEL_MULTIPLIERS = { 2 2.25 2.5 2.7 2.9 3 2.9 2.8 2.7 2.6 2.5 2.4 2.3 2.2 2.1 2 1.9 1.8 1.7 1.6 1.5 1.4 1.3 1.2 1.1 1 0.9 0.8 0.7 0.6 0.5 0.4 0.3 0.2 0.1 0 }
	DEFAULT_SKILL_VALUE = 5
	GENERATED_SONS_MULTIPLIER = 10
	GENERATED_DAUGHTERS_MULTIPLIER = 10
	GENERATED_SPOUSE = 0
	DEFAULT_EDUCATION_TRAIT = "education_intrigue_1"
	BASE_HEALTH = 5.0
}
```

Related: skills max at 100 (`NSkills`), `SKILL_LEVELS_VALUES = { 4 8 12 16 68 69 99 }`, adult age 16. The age slider runs 0 to 120, weight -100 to 100.

**Age cost** = age × the multiplier at the first index where age is on or below `AGE_LEVELS[i]`; the last multiplier (0) applies above 70. Computed values (raw products; unverified: the engine's rounding rule):

| Age | Mult | Cost | Age | Mult | Cost | Age | Mult | Cost |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 to 10 | 2 | 0 to 20 | 30 | 2.3 | 69 | 41 | 1.2 | 49.2 |
| 11 to 16 | 2.25 | 24.75 to 36 | 31 | 2.2 | 68.2 | 42 | 1.1 | 46.2 |
| 17 to 18 | 2.5 | 42.5, 45 | 32 | 2.1 | 67.2 | 43 | 1 | 43 |
| 19 to 20 | 2.7 | 51.3, 54 | 33 | 2 | 66 | 44 | 0.9 | 39.6 |
| 21 to 22 | 2.9 | 60.9, 63.8 | 34 | 1.9 | 64.6 | 45 | 0.8 | 36 |
| 23 | 3 | 69 | 35 | 1.8 | 63 | 46 | 0.7 | 32.2 |
| 24 | 2.9 | 69.6 | 36 | 1.7 | 61.2 | 47 | 0.6 | 28.2 |
| 25 | 2.8 | 70 | 37 | 1.6 | 59.2 | 48 | 0.5 | 24 |
| 26 | 2.7 | 70.2 | 38 | 1.5 | 57 | 49 | 0.4 | 19.6 |
| 27 | 2.6 | 70.2 | 39 | 1.4 | 54.6 | 50 | 0.3 | 15 |
| 28 | 2.5 | 70 | 40 | 1.3 | 52 | 51 to 60 | 0.2 | 10.2 to 12 |
| 29 | 2.4 | 69.6 |  |  |  | 61 to 70 | 0.1 | 6.1 to 7 |
|  |  |  |  |  |  | 71 to 120 | 0 | 0 |

Ages 24 to 28 are the most expensive, matching the wiki's "prime". Side effects of age: starting health 5.0 up to 47, 4.0 at 48 to 64, 3.0 at 65 and above; from age 15, one lifestyle perk per 3 years up to 20 perks at 75. Prestige is recomputed on finish from age bracket and highest title tier ([ruler\_designer.txt](https://github.com/skonester/ck3-mod-base/blob/master/base/game/common/on_action/ruler_designer.txt)). Unverified: the default age the designer opens with, and how the birth day and month are chosen.

**Skill cost** is a script value, applied to the base value before trait bonuses ([02\_ruler\_designer\_values.txt](https://github.com/skonester/ck3-mod-base/blob/master/base/game/common/script_values/02_ruler_designer_values.txt)):

```
ruler_designer_general_skill_value_cost = {
	value = 0
	if      = { limit = { scope:value > 0  scope:value < 5 }  add = 2  multiply = scope:value }
	else_if = { limit = { scope:value > 4  scope:value < 9 }  add = 4  multiply = { value = scope:value subtract = 4 }  add = 8 }
	else_if = { limit = { scope:value > 8  scope:value < 13 } add = 7  multiply = { value = scope:value subtract = 8 }  add = 24 }
	else_if = { limit = { scope:value > 12 scope:value < 17 } add = 11 multiply = { value = scope:value subtract = 12 } add = 52 }
	else_if = { limit = { scope:value > 16 }                  add = 17 multiply = { value = scope:value subtract = 16 } add = 96 }
}
```

Per-point prices are 2, 4, 7, 11, 17 across brackets 1-4, 5-8, 9-12, 13-16, 17+. Prowess uses the same shape at 1, 2, 4, 7, 11 (offsets 0, 4, 12, 28, 56).

| Base | General | Prowess | Base | General | Prowess |
| --- | --- | --- | --- | --- | --- |
| 0 | 0 | 0 | 12 | 52 | 28 |
| 1 | 2 | 1 | 13 | 63 | 35 |
| 2 | 4 | 2 | 14 | 74 | 42 |
| 3 | 6 | 3 | 15 | 85 | 49 |
| 4 | 8 | 4 | 16 | 96 | 56 |
| 5 | 12 | 6 | 17 | 113 | 67 |
| 6 | 16 | 8 | 18 | 130 | 78 |
| 7 | 20 | 10 | 19 | 147 | 89 |
| 8 | 24 | 12 | 20 | 164 | 100 |
| 9 | 31 | 16 | 25 | 249 | 155 |
| 10 | 38 | 20 | 30 | 334 | 210 |
| 11 | 45 | 24 | 100 | 1524 | 980 |

A fresh designer with all six skills at the default 5 shows 5 × 12 + 6 = 66 skill points before age. Unverified: one fan tool claims trait modifiers change the per-point cost; the files and wiki contradict it.

**Trait schema** ([\_traits.info](https://github.com/skonester/ck3-mod-base/blob/master/base/game/common/traits/_traits.info)). 301 vanilla traits in `00_traits.txt`, 222 with an explicit cost. Fields that matter: `category` (personality, education, childhood, commander, winter\_commander, lifestyle, court\_type, fame, health; congenital traits have no category), `valid_sex`, `minimum_age`, `maximum_age`, `genetic`, `inherit_chance`, `shown_in_ruler_designer` (default yes), `ruler_designer_cost` (default 0), `opposites`, `group`, `level`. No trait carries a DLC check. Loc keys `trait_<key>` and `trait_<key>_desc`; icons at `gfx/interface/icons/traits/<trait>.dds`.

**Selection rules the app must enforce**

- Only traits with `shown_in_ruler_designer = yes` (79 are hidden, including `pregnant`, `incapable`, `twin`, `bastard_founder`, `historical_character`, `kinslayer_1..3`, all `education_martial_prowess_*`, court-type traits, and event-only traits like `the_wake` and `crusader_king`).
- Any number of personality traits (unverified: whether 1.20's new `INTENDED_MAX_PERSONALITY_TRAITS` define limits the designer).
- At most one education trait, and only at age 16 or older.
- Childhood traits only at ages 3 to 15.
- No two traits where either lists the other, or its group, in `opposites`.
- `eunuch_1` and `beardless_eunuch` are male only.
- Where a trait has congenital and non-congenital versions, only the congenital one is purchasable (`depressed_genetic` -20, `lunatic_genetic` -15, `possessed_genetic` -20).
- `immortal` is visible and costs 10000.

**Personality traits** (36, opposites in parentheses):

| Trait | Cost | Trait | Cost | Trait | Cost |
| --- | --- | --- | --- | --- | --- |
| lustful (chaste) | 25 | chaste | 20 | gluttonous (temperate) | 20 |
| temperate | 40 | greedy (generous) | 30 | generous | 20 |
| lazy (diligent) | -10 | diligent | 40 | wrathful (calm) | 30 |
| calm | 25 | patient (impatient) | 30 | impatient | 25 |
| arrogant (humble) | 20 | humble | 20 | deceitful (honest) | 30 |
| honest | 20 | craven (brave) | -10 | brave | 40 |
| shy (gregarious) | -10 | gregarious | 30 | ambitious (content) | 40 |
| content | 20 | arbitrary (just) | 30 | just | 40 |
| cynical (zealous) | 30 | zealous | 30 | paranoid (trusting) | -10 |
| trusting | 10 | compassionate (callous, sadistic) | 10 | callous | 40 |
| sadistic | 40 | stubborn (fickle, eccentric) | 30 | fickle | 25 |
| eccentric | 15 | vengeful (forgiving) | 30 | forgiving | 25 |

**Education** (25): five tracks `education_intrigue|diplomacy|stewardship|martial|learning_1..5`; level 1 = 0, 2 = 20, 3 = 40, 4 = 80, 5 = 150; skill bonus +2/+4/+6/+8/+10 in the track skill. **Childhood** (5): `rowdy, charming, curious, pensive, bossy` at 5 each.

**Congenital** (40 selectable):

| Trait | Cost | Trait | Cost | Trait | Cost |
| --- | --- | --- | --- | --- | --- |
| beauty\_bad\_1/2/3 | -10/-20/-30 | beauty\_good\_1/2/3 | 40/80/120 | intellect\_bad\_1/2/3 | -15/-30/-45 |
| intellect\_good\_1/2/3 | 80/160/240 | physique\_bad\_1/2/3 | -15/-30/-45 | physique\_good\_1/2/3 | 60/120/180 |
| pure\_blooded | 50 | fecund (infertile) | 50 | strong (weak) | 50 |
| shrewd (dull) | 50 | clubfooted | 0 | hunchbacked | -10 |
| lisping | -5 | stuttering | -5 | dwarf (giant) | 0 |
| giant | 20 | inbred | -30 | weak | -10 |
| dull | -20 | spindly | -10 | scaly | 0 |
| albino | 0 | wheezing | -10 | bleeder | -20 |
| infertile | 0 | confider | 15 | tourney\_participant | 5 |
| immortal | 10000 |  |  |  |  |

**Health** (28): depressed\_genetic -20, lunatic\_genetic -15, possessed\_genetic -20, ill 0, pneumonic 0, great\_pox -10, lovers\_pox 0, leper -30, one\_eyed 10, one\_legged -5, disfigured -10, infirm -20, withering\_mind -20, clouded\_eyes -20, faltering\_heart -20, fragile\_bones -20, gout\_ridden -5, consumption 0, cancer -10, typhus 0, smallpox 0, measles 0, dysentery 0, ergotism 0, scarred 10, eunuch\_1 -10, beardless\_eunuch -15, blind -10.

**Fame** (45): drunkard -10, hashishiyah 5, rakish 0, reclusive -5, irritable 0, flagellant -10, profligate 10, improvident -5, contrite -5, comfort\_eater -5, inappetetic -5, journaller 15, athletic 40, pilgrim 30, hajjaj 30, sayyid 25, faith\_warrior 50, berserker 40, shieldmaiden 40, varangian 40, bastard 0, legitimized\_bastard 0, wild\_oat 0 (these three mutually exclusive), deviant -5, cannibal 40, incestuous 0, adulterer -5, fornicator -5, murderer -10, born\_in\_the\_purple 40, viking 25, adventurer 50, adventurer\_follower 10, heresiarch 50, peasant\_leader 100, populist\_leader 150, witch 10, loyal 20, disloyal -20, gallowsbait 0, crusader\_king 120, governor 40, knight\_errant 75, confucian\_education 15, burdened -10.

**Lifestyle** (27): diplomat, family\_first, august, strategist, overseer, gallant, architect, administrator, avaricious, schemer, seducer, torturer, scholar, theologian, lifestyle\_herbalist, lifestyle\_gardener, lifestyle\_wayfarer, lifestyle\_voyager, lifestyle\_surveyor at 50; whole\_of\_body 75; lifestyle\_poet 40; lifestyle\_reveler, lifestyle\_blademaster, lifestyle\_hunter, lifestyle\_mystic, lifestyle\_physician, lifestyle\_traveler at 20. **Commander** (17 incl. winter\_soldier): all 25.

Unverified (1.20): `scholar` renamed `erudite` with the same stats; new `cleric`, `herald`, `lifestyle_scholar` with unknown costs. Parse the installed `00_traits.txt` at runtime and this stops mattering.

**Design modes.** `on_ruler_designer_finished` sees `scope:ruler_designer` as `flag:landed_title` (replaces a title holder, inheriting all their titles), `flag:landless_adventurer`, or `flag:landless_noble_family`; none costs points. A designed character always founds a new dynasty. For the app: treat the default 400 as "achievements-legal", show the number going red above the per-character budget, and let the user exceed it deliberately, which is what the game does.

## Appearance and DNA

DNA is optional. Omit `dna =` and the engine rolls a culture-appropriate face and gives children family resemblance through inheritance. When the user supplies a look, take the Ruler Designer's "Copy DNA" text, keep the `genes = { ... }` block, drop the `clothes` line, wrap it in a `common/dna_data` entry and reference it with `dna = <key>`. Do not try to render portraits outside the game; nobody has ([\_dna\_data.info](https://github.com/skonester/ck3-mod-base/blob/master/base/game/common/dna_data/_dna_data.info), [Dev Diary #34](https://forum.paradoxplaza.com/forum/threads/ck3-dev-diary-34-its-all-about-appearances.1406933/)).

**`common/dna_data` schema and the modder workflow.** Only 438 vanilla characters carry `dna`; the other 70,000 are generated. The Guardians of Azeroth team's template ([GoA2 wiki](https://github-wiki-see.page/m/Warcraft-GoA-Development-Team/Warcraft-Guardians-of-Azeroth-2/wiki/How-To-Assign-DNAs-%28Portraits%29-To-Characters)):

```
<character_name>_dna = {
	portrait_info = {
		genes = {
			hair_color={ 42 222 176 166 }
			skin_color={ 173 102 108 89 }
			eye_color={ 11 5 39 147 }
			gene_chin_forward={ "chin_forward_pos" 140 "chin_forward_pos" 127 }
			...
		}
	}
	enabled=yes
}
```

**The "Copy DNA" clipboard form** ([Share your DNA](https://forum.paradoxplaza.com/forum/threads/share-your-dna.1444216/)):

```
ruler_designer_1140624539={
type=girl
id=0
genes={ hair_color={ 42 222 176 166 }
skin_color={ 173 102 108 89 }
eye_color={ 11 5 39 147 }
gene_chin_forward={ "chin_forward_pos" 140 "chin_forward_pos" 127 }
gene_chin_height={ "chin_height_pos" 177 "chin_height_pos" 127 }
[... about 100 more genes ...]
gene_height={ "normal_height" 177 "normal_height" 127 }
hairstyles={ "western_hairstyles" 50 "all_hairstyles" 0 }
beards={ "all_beards" 0 "all_beards" 0 }
clothes={ "western_bedchamber" 68 "most_clothes" 0 }
}
entity={ 0 0 }
}
```

**Grammar.** Every non-color gene is `<gene>={ "<expressed template>" <value> "<unexpressed template>" <value> }` with values 0 to 255. The three color genes are four bare integers: two x/y coordinates into a palette texture, not RGBA. The first pair is the dominant allele, the second recessive. The designer writes the slider value to the dominant allele and 127 to the recessive; for generated DNA emit both alleles identical so children inherit the actual look (the community "DNA Duplicator" exists for exactly this, [CK3-DNA-Duplicator](https://github.com/Deticaru/CK3-DNA-Duplicator)). Converter regex from [Kyusoo/CK3\_Utility](https://github.com/Kyusoo/CK3_Utility): `/\s*(\w+)=\{ (("\w+"|\d+)) (\d+) (("\w+"|\d+)) (\d+) \}$/`.

**Gene inventory** (104 in vanilla up to 1.18.4, in fixed order): 3 color genes; about 32 `gene_*` head and face morphs (chin, eye, forehead, head, jaw, mouth, neck); about 42 `gene_bs_*` blend shapes (cheek, ear, eye, brow, jaw, lips, philtrum, nose); 10 `face_detail_*`; 4 `expression_*`; then `complexion`, `gene_height`, `gene_bs_body_type`, `gene_bs_body_shape`, `gene_bs_bust`, `gene_age`, `gene_eyebrows_shape`, `gene_eyebrows_fullness`, `gene_body_hair`, `gene_hair_type`, `gene_baldness`, `eye_accessory`, `teeth_accessory`, `eyelashes_accessory`; and in text form `hairstyles`, `beards`, `clothes`. Most morph genes have exactly two templates, `<name>_neg` and `<name>_pos`. Notable exceptions: `complexion` (`complexion_1..7`, `complexion_beauty_1`, `complexion_ugly_1`), `gene_height` (`full_height`, `normal_height`, `dwarf_height`, `giant_height`), `gene_age` (`old_1..4`, `no_aging`), `gene_hair_type` (`hair_straight`, `hair_wavy`, `hair_curly`, `hair_afro`), `gene_baldness` (`no_baldness`, `male_pattern_baldness`), `eye_accessory` (`normal_eyes`, `blind_eyes`, `no_eyes`, ...). Hairstyle and beard sets are named by region and hair type (`western_hairstyles_straight`, `mena_beards_curly`, `sub_saharan_hairstyles_afro`, DLC sets `fp1_*`, `rtt_*`). Unverified: genes added after 1.18.4 and the exact syntax of `common/genes/00_genes.txt`, which could not be fetched. Read the installed gene files at runtime.

**Save-file form.** Saves store `dna="Hfwd/JlmmWZN..."`, base64 of 4 bytes per gene in the fixed order (template index, value, template index, value). A mod never needs this; it matters only for importing from saves. Version history: designer shipped in 1.2; 1.3 replaced inherited haircuts with `gene_hair_type` and invalidated old hair; 1.12.1 added `gene_baldness`; a 1.14-era change lengthened strings from about 200 to about 400 bytes.

**Hair, beards, clothes.** These are chosen at render time by `gfx/portraits/portrait_modifiers` scripts weighted by culture, faith, government, age and DLC, and inheritable DNA does not contain them. To lock a scripted character's hairstyle, add a weighted entry in `gfx/portraits/portrait_modifiers/99_hairstyles_scripted_characters.txt` ([Character modding](https://ck3.paradoxwikis.com/Character_modding)):

```
modifier = {
	add = 200
	exists = character:<history_id>
	this = character:<history_id>
}
```

DLC-only templates are guarded in those scripts with `has_fp1_dlc_trigger = yes` and a non-DLC fallback. Unverified: what happens when DNA names a missing DLC template; the observed symptom in similar cases is a bald or blank slot, not a crash.

**Traits change portraits separately from DNA** through `gfx/portraits/trait_portrait_modifiers`. Vanilla albino:

```
albino = {
  albino = {
    traits = { albino }
    dna_modifiers = {
      color = { gene = skin_color mode = modify x = -1.0 y = -1.0 }
      color = { gene = hair_color mode = modify x = -1.0 y = -1.0 }
      color = { gene = eye_color mode = modify x = -1.0 y = 0.0 }
      morph = { mode = modify_multiply gene = gene_eyebrows_shape value = 0.3 }
    }
  }
}
```

So give `trait = giant`, `dwarf` or `beauty_good_3` in history and keep DNA at `normal_height`; the trait modifier does the rest.

**Generation without DNA.** Cultures weight ethnicities (`ethnicities = { 10 = ethnicity_1  5 = ethnicity_2 }`) and ethnicity templates in `common/ethnicities/` give per-gene ranges (`nose_forward_neg range = { 0.25 0.47 }`; editor 37% = 0.37). Children inherit two versions of each gene, each from either parent. For the app this means: a family generated with no DNA will still look related, and a family where only the founder has designer DNA will drift toward the culture's ethnicity for the un-DNA'd members. If the user wants a whole family to share a look, the app must emit DNA for each member by mutating the founder's genes within small ranges.

**No offline renderer exists.** Portraits are 3D meshes with morph blending, palette textures, decal shaders and aging. Every community DNA tool is a converter or gallery. Feasible previews for the app: a schematic slider preview, user-supplied screenshots, or the in-game console `portrait_editor` in `-debug_mode`.

## Start dates and bookmarks

A "collection tied to a start year" maps to one bookmark date. Validate by replaying every dated block with date on or before that exact date, using the group's `default_start_date` (867.1.1, 1066.9.15, 1178.10.1), not the bare year. Optionally ship a custom bookmark so the collection appears on the start screen ([00\_bookmark\_groups.txt](https://github.com/skonester/ck3-mod-base/blob/master/base/game/common/bookmarks/groups/00_bookmark_groups.txt), [Bookmarks modding](https://ck3.paradoxwikis.com/Bookmarks_modding)).

**The three vanilla dates**, entire `common/bookmarks/groups/00_bookmark_groups.txt`:

```
bm_group_867 = {
	default_start_date = 867.1.1
}

bm_group_1066 = {
	default_start_date = 1066.9.15
}

bm_group_1178 = {
	default_start_date = 1178.10.1
}
```

1178 arrived with the free 1.13 update and needs no DLC. Fate of Iberia adds no date. By God Alone adds none according to the wiki. Vanilla 1.19 bookmarks ([00\_bookmarks.txt](https://github.com/skonester/ck3-mod-base/blob/master/base/game/common/bookmarks/bookmarks/00_bookmarks.txt), names from [Bookmarks](https://ck3.paradoxwikis.com/Bookmarks)):

| Date | Key | DLC gating | Name |
| --- | --- | --- | --- |
| 867.1.1 | bm\_867\_persia | none | The Iranian Intermezzo |
| 867.1.1 | bm\_867\_iberia | weight only (Fate of Iberia) | The Struggle for Iberia |
| 867.1.1 | bm\_867\_northmen | weight only (Northern Lords) | Wrath of The Northmen |
| 867.1.1 | bm\_867\_adventurers | none | Humble Beginnings |
| 867.1.1 | bm\_867\_carolingians | none | The Carolingians |
| 867.1.1 | bm\_867\_mandalas | `requires_dlc_flag = all_under_heaven` | Living Gods on Earth |
| 867.1.1 | bm\_867\_china | all\_under\_heaven | Autumn of Virtue |
| 1066.9.15 | bm\_1066\_hastings | none, default (weight 100) | The Fate of England |
| 1066.9.15 | bm\_1066\_rags\_to\_riches | none | Rags to Riches |
| 1066.9.15 | bm\_1066\_iberia | weight only (Fate of Iberia) | Iberia in Pieces |
| 1066.9.15 | bm\_1066\_laamps | `requires_dlc_flag = landless_adventurer` | The Wandering Exiles |
| 1066.9.15 | bm\_1066\_nomads | khans\_of\_the\_steppe | At the Gates |
| 1066.9.15 | bm\_1066\_china | all\_under\_heaven | Song of Splendor |
| 1066.9.15 | bm\_1066\_japan | all\_under\_heaven | A Never-Waning Moon |
| 1178.10.1 | bm\_1178\_call\_of\_the\_empire | none | Call of the Empire |
| 1178.10.1 | bm\_1178\_swords\_of\_faith | none | Sword of Faith |
| 1178.10.1 | bm\_1178\_nomads | khans\_of\_the\_steppe | The Endless Sky |
| 1178.10.1 | bm\_1178\_china | all\_under\_heaven | Heaven in Turmoil |
| 1178.10.1 | bm\_1178\_genpei | all\_under\_heaven | Rise of the Bushi |

**Bookmark schema** (condensed from [\_bookmarks.info](https://github.com/skonester/ck3-mod-base/blob/master/base/game/common/bookmarks/bookmarks/_bookmarks.info)):

```
bm_my_collection = {
	start_date = 867.1.1
	is_playable = yes
	weight = { value = 0 }
	recommended = no
	group = bm_group_867
	requires_dlc_flag = legends_of_the_dead   # optional
	character = {
		name = bookmark_my_ruler_name          # loc key
		dynasty = 812
		dynasty_splendor_level = 1
		type = male
		birth = 840.1.1
		title = k_makran
		government = clan_government
		culture = persian
		religion = ashari
		difficulty = "BOOKMARK_CHARACTER_DIFFICULTY_MEDIUM"
		history_id = 163101
		position = { 1130 770 }
		animation = war_over_win
		bookmark_type = existing_ruler          # or new_landless_adventurer, new_noble_family
	}
}
```

A custom start date is just `start_date = 950.1.1` plus `is_playable = yes`; every history block up to that date is applied. "A bookmark will not load if it has any character/title history errors." Bookmark portraits are dumped with the console command `dump_bookmark_portraits` into `Documents/Paradox Interactive/Crusader Kings III/common/bookmark_portraits`. Unverified: the `religion = ashari` line above is from 1.19; 1.20 presumably changed bookmark files too.

**Custom bookmarks are the nicest install path for a collection** because the user sees their family on the start screen, but they need a portrait dump and a map position, so treat them as a later feature. The minimum viable install is title history plus characters, which show up in any bookmark of that date.

**What a start-date validator checks** (inference):

- Per title at date D: the key exists in `landed_titles`; the resolved holder is not 0 for duchy and above; the holder's `birth` is on or before D and `death` is after D; the resolved `liege` has a living holder of higher tier; the `government` exists and the county capital's holding type fits it (warn only); DLC-gated title kinds (laamp, admin, nomad, noble family) carry the matching feature flag.
- Per character at date D: birth on or before D for anyone meant to be present; dated `employer`, `add_spouse`, `dynasty_house` and `give_nickname` blocks must be dated on or before D to be in effect at start; culture and faith keys exist.
- Cultures are static in `common/culture/cultures` (only innovations are dated), so "culture exists at date" reduces to key existence.

Unverified: the engine's exact hard-vs-soft validation list at bookmark load; only "history errors prevent loading" is documented.

## DLC gating

Traits, DNA, ethnicities, dynasties, houses and nicknames are never DLC-gated in script, so a collection can use any of them. What the app must gate is systems: landless adventurer and administrative governments (Roads to Power), nomads (Khans of the Steppe), China and Japan bookmarks (All Under Heaven), DLC clothing templates, and DLC cultural and religious options. Detection is a matter of mapping the installed `game/dlc/*/*.dlc` descriptors to feature-flag keys ([\_traits.info](https://github.com/skonester/ck3-mod-base/blob/master/base/game/common/traits/_traits.info), [00\_has\_dlc\_scripted\_triggers.txt](https://github.com/skonester/ck3-mod-base/blob/master/base/game/common/scripted_triggers/00_has_dlc_scripted_triggers.txt)).

**DLC list** (from the `.dlc` files, [SteamDB](https://steamdb.info/app/1158310/dlc/), [Patches](https://ck3.paradoxwikis.com/Patches), [Downloadable content](https://ck3.paradoxwikis.com/Downloadable_content)):

| Folder | Name | Steam appid | Kind | Released | Patch |
| --- | --- | --- | --- | --- | --- |
| dlc001\_preorder | Garments of the Holy Roman Empire | 1296730 | cosmetic | 2020-09-01 | 1.0 |
| dlc002\_sp\_day1 | Fashion of the Abbasid Court | 1296731 | cosmetic | 2020-09-01 | 1.0 |
| dlc003\_fp1 | The Northern Lords | 1303183 | flavor pack | 2021-03-16 | 1.3 Corvus |
| dlc004\_ep1 | The Royal Court | 1303182 | expansion | 2022-02-08 | 1.5 Fleur-de-Lis |
| dlc005\_fp2 | The Fate of Iberia | 1303184 | flavor pack | 2022-05-31 | 1.6 Castle |
| dlc006\_bp1 | Friends and Foes | 2114760 | event pack | 2022-09-08 | 1.7 Bastion |
| dlc007\_ep2 | Tours and Tournaments | 2311920 | expansion | 2023-05-11 | 1.9 Lance |
| dlc008\_sp2 | Elegance of the Empire | 2311930 | cosmetic | 2023-04-04 |  |
| dlc009\_bp2 | Wards and Wardens | 2313541 | event pack | 2023-08-22 | 1.10 Quill |
| dlc010\_fp3 | Legacy of Persia | 2313540 | flavor pack | 2023-11-09 | 1.11 Peacock |
| dlc011\_ce1 | Legends of the Dead | 2671060 | core expansion | 2024-03-04 | 1.12 Scythe |
| dlc012\_afr | North African Attire | 2671030 | cosmetic | 2024-01-23 |  |
| dlc013\_sp3 | Couture of the Capets | 2671040 | cosmetic | 2024-02-06 |  |
| dlc014\_ep3 | Roads to Power | 2671070 | expansion | 2024-09-24 | 1.13 Basileus |
| dlc015\_bp3 | Wandering Nobles | 2671080 | event pack | 2024-11-04 | 1.14 Traverse |
| dlc016\_cp2 | West Slavic Attire | 3275760 | cosmetic | 2024-11-27 |  |
| dlc017\_cp3 | Medieval Monuments | 3315540 | cosmetic (map) | 2025-02-25 |  |
| dlc018\_cp4 | Arctic Attire | 3315550 | cosmetic | 2025-02-25 |  |
| dlc019\_sp4 | Crowns of the World | 3315500 | cosmetic | 2025-03-12 | 1.15 Crown |
| dlc020\_ce2 | Khans of the Steppe | 3315510 | core expansion | 2025-04-28 | 1.16 Chamfron |
| dlc021\_bp4 | Coronations | 3315520 | event pack | 2025-09-09 | 1.17 Ascendant |
| dlc022\_ep4 | All Under Heaven | 3315530 | expansion | 2025-10-28 | 1.18 Crane |
| dlc023\_cp5 | High Medieval Warfare Attire | 3315560 | cosmetic | 2026-01-27 |  |
| dlc024\_cp6 | Holy Buildings | 3315570 | cosmetic (map) | 2026-01-27 |  |
| dlc025\_cp7 | North Pacific Attire | 3315580 | cosmetic | 2026-03-11 |  |
| dlc026\_cp8 | East Asian Wonders | 4232860 | cosmetic (map) | 2026-03-11 |  |
| dlc027\_cp9 | Celestial Court Attire | 4232870 | cosmetic | 2026-03-11 |  |
| dlc028\_sp5 | Symbols of Authority | 4232890 | cosmetic | 2026-04-20 | 1.19 Scribe |
| dlc029\_mp1 | Songs of the Realm | 3315590 | music | 2026-04-20 | 1.19 Scribe |
| dlc030 (expected) | By God Alone | 4232900 | expansion | 2026-09-30 | 1.20 Crozier |
| unreleased | Silk & Silver | 4232910 | expansion |  |  |

Chapters: I = Royal Court, Northern Lords, Fate of Iberia, Fashion of the Abbasid Court. II = Tours and Tournaments, Wards and Wardens, Legacy of Persia, Elegance of the Empire. III = Legends of the Dead, Roads to Power, Wandering Nobles, Couture of the Capets. IV = Khans of the Steppe, All Under Heaven, Coronations, Crowns of the World. V = By God Alone, Silk & Silver, Songs of the Realm, Symbols of Authority.

**A `.dlc` descriptor** (all 29 share these keys; some start with a BOM):

```
name = "Roads to Power"
path = "dlc/dlc014_ep3"
steam_id = "2671070"
pops_id = "ck3_dlc014_ep3"
msgr_id = "9PHT1PQ17BJ1"
affects_checksum = yes
localizable_name = "DLC014_EP3"
checksum = "a6cb87f66066287d6f6e71160b7a869e"
```

**Feature-flag keys.** Script checks ownership with `has_dlc_feature = <key>` (trigger), `requires_dlc_flag = <key>` (database field), `HasDlcFeature('<key>')` (GUI) and the legacy `has_dlc = "<display name>"`. There is no `is_dlc_enabled`. Vanilla wraps them in scripted triggers:

| Wrapper trigger | Feature key | DLC |
| --- | --- | --- |
| has\_fp1\_dlc\_trigger | the\_northern\_lords | Northern Lords |
| has\_ep1\_dlc\_trigger | royal\_court (also diverge\_culture, hybridize\_culture, reform\_culture, court\_artifacts) | Royal Court |
| has\_fp2\_dlc\_trigger | the\_fate\_of\_iberia | Fate of Iberia |
| has\_bp1\_dlc\_trigger | friends\_and\_foes | Friends and Foes |
| has\_ep2\_dlc\_trigger | tours\_and\_tournaments (also accolades, advanced\_activities) | Tours and Tournaments |
| has\_bp2\_dlc\_trigger | wards\_and\_wardens | Wards and Wardens |
| has\_fp3\_dlc\_trigger | legacy\_of\_persia | Legacy of Persia |
| has\_ce1\_dlc\_trigger | legends\_of\_the\_dead (also legends) | Legends of the Dead |
| has\_ep3\_dlc\_trigger | roads\_to\_power (also landless\_playable, landless\_adventurer, admin\_gov) | Roads to Power |
| has\_bp3\_dlc\_trigger | wandering\_nobles | Wandering Nobles |
| has\_mpo\_dlc\_trigger | khans\_of\_the\_steppe | Khans of the Steppe |
| has\_ach\_dlc\_trigger | coronations | Coronations |
| has\_tgp\_dlc\_trigger | all\_under\_heaven | All Under Heaven |
| has\_afr / has\_pol / has\_cp3..cp9 / has\_sp4 / has\_sp5 | one key per cosmetic pack | cosmetic packs |
| has\_mp1\_dlc\_trigger | songs\_of\_the\_realm | Songs of the Realm |
| has\_pam\_dlc\_trigger (1.20, unverified) | by\_god\_alone | By God Alone |

**What is and is not gated** in 1.19.0.6 files:

- Not gated: `common/traits`, `common/ethnicities`, `common/genes`, `common/dynasty_houses`, `common/nicknames`, and the Ruler Designer itself (free since 1.2).
- Governments: `administrative = yes` needs `admin_gov`; `landless_playable = yes` needs `landless_playable`; nomad and Japanese governments check All Under Heaven and Khans triggers.
- Bookmarks: `requires_dlc_flag`, see the table in the previous section.
- Cultures: traditions and pillars declare `requires_dlc_flag` with a `fallback`; `requires_dlc_flag` counts in `common/culture`: all\_under\_heaven 61, khans\_of\_the\_steppe 32, hybridize\_culture 25, the\_fate\_of\_iberia 21, legacy\_of\_persia 15.
- Faiths: `doctrine_selection_pair = { requires_dlc_flag = <flag> doctrine = x fallback_doctrine = y }`; 1.20 adds `tenet_selection_pair` (unverified).
- Dynasty legacies: `is_shown = { has_dlc_feature = ... }` per track.
- Appearance: clothing, headgear, beard and hair templates are gated per template in `gfx/portraits/portrait_modifiers` with `is_valid_custom = { has_ep2_dlc_trigger = yes }`; Tours and Tournaments (178+), All Under Heaven (166) and Roads to Power (99) gate the most.

Fallbacks are documented per database (hidden bookmark, fallback doctrine or tradition, fallback clothing), so missing DLC content degrades silently and logs to `error.log`. Unverified: an authoritative "never crashes" statement.

**Detection algorithm for the app**

1. Find the install (Steam `libraryfolders.vdf`, then user-supplied path).
2. Parse every `game/dlc/*/*.dlc` (strip BOM, `key = value` lines) into a list with `name`, `path`, `steam_id`.
3. Read `dlc_load.json` in the user-data folder and subtract `disabled_dlcs` (entries are exactly `"dlc/dlc014_ep3/dlc014.dlc"`).
4. Read `rawVersion` from `launcher-settings.json`.
5. Map folder codes (fp1, ep3, mpo, tgp, ...) to feature keys with the wrapper table.

On Steam, unowned DLC depots are not downloaded, so "installed" is a good proxy for "owned". Safe mod pattern: put `requires_dlc_flag` on bookmarks, wrap DLC-dependent effects in `if = { limit = { has_XXX_dlc_trigger = yes } }` with a fallback, and never guard traits or DNA.

## Existing tools and prior art

No maintained tool exports a designed ruler or a family to a mod, so the app fills a real gap. Build on `jomini` for parsing and writing, `ck3-tiger` for validation (as a subprocess, because it is GPL-3.0), ImperatorToCK3's `TitleHistory` for date replay, and CK3-GEDCOM's id-cache idea. Study CK3ModStudio and jj248's generator for data models. Activity dates are as of 2026-09-30.

| Tool | Language, license | Last activity | What it offers this app |
| --- | --- | --- | --- |
| [rakaly/jomini](https://github.com/rakaly/jomini) | Rust, MIT | 0.37.1, 2026-09-22 | Fast Clausewitz parser with a `TextWriter`; comments not preserved; dates need caller conversion |
| [nickbabcock/jomini](https://github.com/nickbabcock/jomini) (npm) | TypeScript/WASM, MIT | 0.10.0, 2026-03-14 | Same parser for Node and browsers; `parseText()`, writer, dates become JS `Date`; CK3 listed as supported |
| [amtep/tiger](https://github.com/amtep/tiger) (ck3-tiger) | Rust, GPL-3.0 | 1.19.0, 2026-06-06 | Validator with `--json`; checks history dates, spouse/employer/liege validity, loc keys; `tiger-lib` crate embeddable but GPL |
| [cwtools/cwtools](https://github.com/cwtools/cwtools) | F#, MIT | 2026-06-30 | Only parser claiming comment preservation; CK3 rules stale since 2023 |
| [textGamex/ParadoxPower](https://github.com/textGamex/ParadoxPower) | F#/C#, Apache-2.0 | 0.13.1, 2026-07-27 | Parser with `ToScript()` serializer |
| [ImperatorToCK3](https://github.com/ParadoxGameConverters/ImperatorToCK3) | C#, MIT | 2026-09-21 | Generates characters, dynasties, title history, loc and CoA; `TitleHistory.GetHolderId(date)` is the date-replay model to copy |
| [jj248/CK3-Character-History-Generator](https://github.com/jj248/CK3-Character-History-Generator) | Python + Tauri/React, MIT | 2026-04-19 | Multi-generation dynasties from JSON configs, family-tree images, headless CLI; closest prior art for family generation |
| [inccchue/CK3ModStudio](https://github.com/inccchue/CK3ModStudio) | C#/WPF, MIT | 2026-09-06 | Families, dynasties and landed titles editor with realistic date generation; AGOT submod export |
| [KeizerHarm/CK3-GEDCOM](https://github.com/KeizerHarm/CK3-GEDCOM) | C#, GPL-3.0 | 2025-07-11 | GEDCOM to characters, dynasties, houses, loc; auto-generated ids tracked in a cache file across runs |
| [theivefjord/ck3-historical-character-creator](https://github.com/theivefjord/ck3-historical-character-creator) | C++/Qt6, LGPL-3.0 | 2025-04-10 | GUI for character files only |
| [Iamgoofball/ck3\_title\_generator](https://github.com/Iamgoofball/ck3_title_generator) | C#, MIT | 2024-01-13 | landed\_titles plus loc generator |
| [pryvyd9/AzgaarToCK3](https://github.com/pryvyd9/AzgaarToCK3) | C#, MIT | 1.7.5, 2026-04-18 | Whole-mod generator; users "must manually add the newly created mod to their playset" |
| [Kyusoo/CK3\_Utility](https://github.com/Kyusoo/CK3_Utility) | JavaScript, MIT | 2025-11-17 | DNA converter, base64 to text and back; source holds the gene order and template lists |
| [Deticaru/CK3-DNA-Duplicator](https://github.com/Deticaru/CK3-DNA-Duplicator) | Python, MIT | 2025-11-06 | Copies the expressed allele into the recessive slot |
| [amb3rn0va/CK3-DNA-Generator](https://github.com/amb3rn0va/CK3-DNA-Generator) | Python, MIT | 2 commits | Photo to DNA via local Ollama and LLaVA; experimental |
| [bcssov/IronyModManager](https://github.com/bcssov/IronyModManager) | C#, MIT | 2026-09-19 | Mod manager; its maintainer treats `dlc_load.json` as the load-order source of truth |
| [pdx-tools/pdx-tools](https://github.com/pdx-tools/pdx-tools) (ck3save) | Rust, AGPL-3.0 | 2026-09-29 | Save parsing and melting; only relevant for importing from saves |
| [TCA166/CK3-history-extractor](https://github.com/TCA166/CK3-history-extractor) | Rust, MIT | 2026-03-13 | Save to family trees; a reference for tree rendering |
| [jacklenzotti/clausewitz-mcp](https://github.com/jacklenzotti/clausewitz-mcp) | Python, MIT | v0.1, 2026-08 | MCP server with `parse_script`, `validate_mod`, `find_definition`; the only LLM-oriented CK3 tool |

Other findings:

- There is no maintained pure-Python or pure-Java Clausewitz parser; PyPI `jomini` and `pyradox` are unrelated packages.
- No repository prompts an LLM to produce `history/characters` directly. The only AI loop pattern in the wild is clausewitz-mcp's parse, validate, fix.
- Large mods (Princes of Darkness, AGOT) hand-author history with prefixed ids and a tracking spreadsheet; their generator scripts are not public.
- "A Tour of PDS Clausewitz Syntax" on [pdx.tools](https://pdx.tools/blog/a-tour-of-pds-clausewitz-syntax/) covers the syntax quirks a writer must handle.
- The git mirror [skonester/ck3-mod-base](https://github.com/skonester/ck3-mod-base) is a usable offline copy of the vanilla text tree for development and tests.

Unverified: how CK3ModStudio and jj248's generator allocate ids; the exact `--json` schema of ck3-tiger; whether tiger checks that a title `holder` id exists.

## Risks and open questions for the app design

Most risks share one mitigation: read the installed game's files at runtime instead of shipping static tables, and never override a vanilla file.

| Risk or open question | Mitigation |
| --- | --- |
| 1.20 `religion` to `rite` change and 62 removed faith keys are known only from a third-party diff | Read `common/religion/` from the install at runtime; validate against it; emit `faith =` plus `rite =` on 1.20+ once verified on a live install |
| Same-date `holder` precedence between a mod file and vanilla is undocumented | Date the mod's block strictly after the last vanilla block before the bookmark and on or before the bookmark; test in game |
| Vanilla numeric ids run past 900,000, up to 1,000,230,517 | Use prefixed string ids; scan installed `history/characters` for collisions before writing |
| Launcher SQLite schema migrates without notice (2026.10 broke a tool) | Default to file drop plus "add the mod in the launcher"; make DB and `dlc_load.json` writes opt-in, guarded by `PRAGMA table_info`, only while the launcher is closed |
| `enabled_mods` entry format for CK3 is unverified | Read the user's existing `dlc_load.json` and mirror its format before writing |
| Age-cost rounding (24 gives 69.6) is unverified | Expose the raw formula; calibrate against the in-game designer once on a live install |
| 1.20 trait changes (`scholar` to `erudite`, new `cleric`, `herald`, `lifestyle_scholar`) have unknown costs | Parse `00_traits.txt` from the install; treat a missing `ruler_designer_cost` as 0 |
| Whether the designer hides traits from unowned DLC is unknown | Do not gate traits in the app; warn only for DLC-dependent governments, bookmarks and clothing |
| Engine behaviour for a character without `birth`, a dead holder, or a dead employer is undocumented | Make `birth` mandatory in the data model; validate holder and employer lifetimes against the collection date |
| Founding house: forum advice and wiki disagree | Emit `dynasty =` for founders and `dynasty_house` only for cadet branches, matching all 71,124 vanilla characters |
| DNA gene list may have grown after 1.18.4 | Emit only genes present in a pasted "Copy DNA" block or in the installed `common/genes`; never emit a hardcoded list blindly |
| No offline portrait renderer exists | Schematic preview plus user screenshots; document the `portrait_editor` verification loop |
| `.txt` BOM tolerance and quote escaping are unverified | Write UTF-8 with BOM, tab indentation, quote all strings, avoid quotes inside values |
| `supported_version` wildcard behaviour is unknown | Write the exact `rawVersion` from `launcher-settings.json` |
| ck3-tiger lags game updates by days or weeks and is GPL-3.0 | Optional subprocess with `--json`, matched to the detected game version; the app's own validator is the primary gate |
| Full-file override of `00_landed_titles.txt` breaks across versions | Never override vanilla files; add titles only in new files |
| Landless adventurer and administrative rulers need Roads to Power | Require a landed county for no-DLC installs, or tag the collection with `roads_to_power` |
| Vanilla uses `1066.1.1` for development but the bookmark is 1066.9.15 | Key collections to the exact `default_start_date`, never a bare year |
| Saved-ruler file location and format are unknown | Rely on the clipboard "Copy DNA" path; inspect the user-data folder on a live install |
| Wiki modding pages are "last verified for 1.1" | Treat the shipped `.info` docs and vanilla files as authoritative and the wiki as secondary |

**Three things only a live install can answer**, worth doing first when development starts: (1) whether 1.20 really writes `rite =` in history and what `enabled_mods` strings look like in a real `dlc_load.json`; (2) whether a same-date mod holder block beats vanilla; (3) the exact rounding of the age cost in the designer's breakdown.
