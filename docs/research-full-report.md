# Ship Custom CK3 Rulers as Installable Mods

A CK3 character mod is a handful of plain-text Clausewitz-script files dropped into `Documents/Paradox Interactive/Crusader Kings III/mod/<name>/` plus a `<name>.mod` descriptor beside it; the app never needs to touch vanilla files, because new characters (`history/characters`), dynasties (`common/dynasties`), houses (`common/dynasty_houses`), title holders (`history/titles`), DNA (`common/dna_data`) and localization (`localization/english/*_l_english.yml`) are all additive when shipped in uniquely named files with unique ids ([CK3 wiki: Modding](https://ck3.paradoxwikis.com/Modding); [Mod structure](https://ck3.paradoxwikis.com/Mod_structure)). The current game is **1.20.0 "Crozier"**, released 2026-09-30 with the *By God Alone* expansion, and every schema below was read from the 1.19.0.6 vanilla tree plus a community 1.20 diff, so 1.20-specific changes (notably `religion =` → `rite =` in history and 62 faith keys becoming rites) are flagged as unverified ([Patches](https://ck3.paradoxwikis.com/Patches); [1.20.0.2.md](https://github.com/skonester/ck3-mod-base/blob/master/1.20.0.2.md)). The Ruler Designer's point system is fully scripted: `IRONMAN_POINT_MAX = 400`, age cost = age × a 36-entry multiplier table, skill cost = a five-bracket piecewise-linear script value, children 10 points each, spouse 0, and every trait carries `ruler_designer_cost` in `common/traits/00_traits.txt`, so an external app can reproduce the game's number exactly ([00_defines.txt](https://github.com/skonester/ck3-mod-base/blob/master/base/game/common/defines/00_defines.txt); [02_ruler_designer_values.txt](https://github.com/skonester/ck3-mod-base/blob/master/base/game/common/script_values/02_ruler_designer_values.txt)). Start dates are just bookmark dates (867.1.1, 1066.9.15, 1178.10.1 in vanilla); the game applies every dated history block with date ≤ start date, so "valid at start year" reduces to replaying `history/titles` and `history/characters` up to that date ([00_bookmark_groups.txt](https://github.com/skonester/ck3-mod-base/blob/master/base/game/common/bookmarks/groups/00_bookmark_groups.txt); [History modding](https://ck3.paradoxwikis.com/History_modding)). DLC ownership never gates traits, DNA or ethnicities in script; it gates governments, bookmarks, clothing templates and cultural/religious options through feature-flag keys, which an app can infer from `game/dlc/*/*.dlc` descriptors and `dlc_load.json` ([_traits.info](https://github.com/skonester/ck3-mod-base/blob/master/base/game/common/traits/_traits.info); [00_has_dlc_scripted_triggers.txt](https://github.com/skonester/ck3-mod-base/blob/master/base/game/common/scripted_triggers/00_has_dlc_scripted_triggers.txt)). No existing tool exports a designed ruler to a mod, so the app fills a real gap; the reusable pieces are the `jomini` parser, `ck3-tiger` for validation and ImperatorToCK3's date-keyed `TitleHistory` model ([amtep/tiger](https://github.com/amtep/tiger); [rakaly/jomini](https://github.com/rakaly/jomini)).

## Mod structure and file locations

**Conclusion for the developer:** generate one folder plus one descriptor in the user-data `mod/` directory, name every file with a unique mod prefix, never reuse a vanilla filename, never set `replace_path`, and read the game version and folder tree from the live install instead of embedding them.

### Version state

The CK3 wiki patch table (last updated 2026-05-30) lists **1.19.0.6** (2026-05-25) as the newest entry, preceded by 1.19 "Scribe" (2026-04-20) and 1.18 "Crane" (2025-10-28, *All Under Heaven*) ([Patches](https://ck3.paradoxwikis.com/Patches)). A Steam news post timestamped 2026-09-30 is titled "Now Available: By God Alone & 1.20.0 'Crozier' Update" ([Steam news](https://store.steampowered.com/news/app/1158310/view/684140727200907281)). The Steam AppID is 1158310. A community diff of 1.19.0.6 against a clean 1.20.0.2 Steam install reports `rawVersion: 1.20.0.2` in `launcher-settings.json` ([1.20.0.2.md](https://github.com/skonester/ck3-mod-base/blob/master/1.20.0.2.md)). **Unverified:** the wiki "Patch 1.20" page returned 404 on release day and the Steam patch-notes body could not be extracted, so no official 1.20 modding changelog was reachable.

### Install and user-data paths

| Platform | Game install (vanilla content under `game/`) | User data (mods, logs, saves, launcher DB) |
|---|---|---|
| Windows (Steam) | `steamapps\common\Crusader Kings III\game` | `%USERPROFILE%\Documents\Paradox Interactive\Crusader Kings III\` |
| macOS (Steam) | `~/Library/Application Support/Steam/SteamApps/common/Crusader Kings III/` | `~/Documents/Paradox Interactive/Crusader Kings III/` |
| Linux | `steamapps/common/Crusader Kings III/game` | `~/.local/share/Paradox Interactive/Crusader Kings III/` |

Sources: ([Modding](https://ck3.paradoxwikis.com/Modding); [Mod structure](https://ck3.paradoxwikis.com/Mod_structure); [Paradox forum, macOS](https://forum.paradoxplaza.com/forum/threads/crusader-kings-iii-blocked-macos.1855757/)). The user-data path can be redirected: Steam builds honor the `gameDataPath` key in `steamapps\common\Crusader Kings III\launcher\launcher-settings.json`; the Xbox/Microsoft Store build honors a `game\userdir.txt` whose content must end with `/`. The UWP build's files are not directly readable (the wiki points to UWPDumper) ([Modding](https://ck3.paradoxwikis.com/Modding)). Folder and file names are case-sensitive on macOS and Linux ([Mod structure](https://ck3.paradoxwikis.com/Mod_structure)).

The user-data folder contains `mod/`, `logs/error.log`, `logs/database_conflicts.log`, `save games/` (saves are archives), `mods_registry.json` (mod database) and `launcher-v2.sqlite` (launcher database) ([Modding](https://ck3.paradoxwikis.com/Modding)), plus `dlc_load.json` ([Paradox forum, DLCs no longer load](https://forum.paradoxplaza.com/forum/threads/dlcs-no-longer-load-in-older-versions-edit-or-at-all.1626287/)).

A third-party CK3 tool locates installs by parsing Irony Mod Manager `Database_*.json` files in `%APPDATA%/Mario/IronyModManager/`, reading Steam's `steamapps/libraryfolders.vdf`, probing `C:\Games\Crusader Kings III`, and accepting user-supplied roots; it reads the version from `[game_root]/launcher/launcher-settings.json` (fallback `[game_root]/launcher-settings.json`) using `rawVersion` then `version`, extracted with regex `\d+(?:\.\d+){1,3}`, and validates `gameId == "ck3"` ([ck3_game_detection.py](https://raw.githubusercontent.com/ghostwritesme/ck3-mod-updater/main/ck3_game_detection.py)). **Unverified:** non-Steam (Paradox store, GOG) install paths; whether Windows "Documents" redirection (OneDrive) is handled by the game — query the shell's Documents path rather than assuming `%USERPROFILE%\Documents`.

### The `.mod` descriptor

Every mod needs two parts with matching names: a `.mod` metadata file and a folder (or `.zip`). Two copies exist per mod: `(modname).mod` beside the folder ("required for launcher recognition") and `descriptor.mod` inside the folder ("recommended for consistency, excludes `path` key") ([Mod structure](https://ck3.paradoxwikis.com/Mod_structure)). Fields:

| Key | Required | Example | Notes |
|---|---|---|---|
| `version` | yes | `version="0.0.1"` | free string |
| `name` | yes | `name="My Mod"` | launcher display name |
| `supported_version` | yes (outer file) | `supported_version="1.1.3"` | "not needed in descriptor.mod" |
| `path` | yes (outer file only) | `path="mod/my_mod"` | relative to user-data folder or absolute with forward slashes |
| `tags` | optional | `tags={"Culture" "Decisions"}` | Workshop categories |
| `remote_file_id` | conditional | `remote_file_id="2220762808"` | Steam Workshop id |
| `picture` | optional | `picture="thumbnail.png"` | |
| `replace_path` | optional | `replace_path="history/characters"` | "Exclude vanilla files" for that folder |

Verbatim wiki example (content "last verified for version 1.1"):

```
version="0.0.1"
tags={
	"Culture"
	"Decisions"
	"Fixes"
}
name="My Mod"
supported_version="1.1.3"
path="mod/my_mod"
```

([Mod structure](https://ck3.paradoxwikis.com/Mod_structure)). A manual-install guide confirms absolute paths work (`"C:/Users/YourName/Documents/Paradox Interactive/Crusader Kings III/mod/modname"`), that a wrong path yields a "descriptor file error" in the launcher, and warns: "Close the Launcher. Doing the next steps while the launcher is still on might result in corrupted mod files" ([Nexus article 55](https://www.nexusmods.com/crusaderkings3/articles/55)). **Unverified:** whether `supported_version` accepts wildcards (`1.20.*`) and what the launcher does on mismatch; fill it from `rawVersion`.

### Enabling a mod programmatically

The launcher stores playsets in `launcher-v2.sqlite` (tables `playsets`, `mods`, `playsets_mods`). SQL a working third-party tool runs against the same Paradox launcher DB (Stellaris, shared launcher):

```sql
SELECT * from playsets
SELECT * FROM playsets_mods WHERE playsetId=@psid
SELECT * FROM mods
INSERT INTO playsets VALUES(@id, @name, 0, 'custom')
SELECT id FROM mods WHERE steamid=@steamid
INSERT INTO mods (id, steamId, displayName, status, source) VALUES(@id, @steamid, @name, 'to_install', 'steam')
INSERT INTO playsets_mods (playsetId, modId, position, enabled) VALUES(@psid, @mid, @position, @enabled)
```

([stellaris-playset-sync](https://github.com/goigle/stellaris-playset-sync/blob/master/MainWindow.xaml.cs)). Paradox Launcher 2026.8/2026.10 migrated the schema: `playsets.lastServerChecksum` → `deprecatedLastServerChecksum`, `playsets.thumbnailFileUrl` → `coverImagePath`, plus migrations `addPlaysetSharingColumns`, `addRemoteUserIdsToMods`, `addStateToMod`; a tool hardcoding the old columns crashed with `no such column: p.lastServerChecksum` ([StlTechRelGen #14](https://github.com/Clazex/StlTechRelGen/issues/14)). Stable columns observed: `playsets.id/name/isActive`, `mods.status/displayName/dirPath`, `playsets_mods.playsetId/modId/position/enabled`. Introspect with `PRAGMA table_info` before writing and write only while the launcher is closed.

The game itself reads `dlc_load.json`: `{"enabled_mods":[],"disabled_dlcs":[]}`, DLC entries like `"dlc/dlc012_leviathans/dlc012.dlc"`; a Paradox moderator states `enabled_mods` "can be controlled ... using similar paths" and changes take effect on next launch without the launcher ([Paradox forum, dlc_load.json](https://forum.paradoxplaza.com/forum/threads/paradox-launcher-ubuntu-20-04-method-to-enable-disable-dlc-without-launcher.1439893/)). Irony Mod Manager's maintainer: "It's dlc_load.json that's important. That's what holds the mod load order" ([Irony #171](https://github.com/bcssov/IronyModManager/issues/171)). **Unverified:** the exact CK3 string form inside `enabled_mods` (relative `mod/x.mod` vs absolute); the full current DDL of the launcher DB; the `mods_registry.json` format. The launcher rewrites `dlc_load.json` from the active playset when it launches, so the robust default is: write files, tell the user to add the mod to a playset, and offer DB/JSON automation as opt-in.

### Load order and override rules

"Mods are loaded in order from top to bottom of the playset. The mod lower in the playset will overwrite identical files from above." Same path + same filename = full-file replacement. Single-object override ("LIOS — Last In Only Served"): "The name of your file should come later in ASCIIbetical order: 01_defines.txt will override 00_defines.txt." A single override "cannot remove an object, only change it" ([Modding](https://ck3.paradoxwikis.com/Modding)). "Mods are compatible if their footprints do not overlap" ([Mod compatibility](https://ck3.paradoxwikis.com/Mod_compatibility)). The wiki's "Common issues" adds: "In history defined characters do not overwrite each other but produce duplicates. Have to override the whole file" ([Modding](https://ck3.paradoxwikis.com/Modding)). Duplicate character ids in vanilla were observed to "become the same character ... appear twice in the dynasty tree" rather than error loudly ([Paradox forum, duplicate characters](https://forum.paradoxplaza.com/forum/threads/ck-iii-duplicate-characters-in-history-files.1531263/)). Localization overrides go in `localization/replace/<lang>/` or `localization/<lang>/replace/` ([Localization](https://ck3.paradoxwikis.com/Localization)). **Unverified (1.20):** `history_override_priority = N` "overrides a single vanilla character from your own file, with no whole-file override needed" ([1.20.0.2.md](https://github.com/skonester/ck3-mod-base/blob/master/1.20.0.2.md)).

Recommended additive file set (inference from the rules above):

```
mod/<mod>.mod
mod/<mod>/descriptor.mod
mod/<mod>/common/dynasties/zz_<mod>_dynasties.txt
mod/<mod>/common/dynasty_houses/zz_<mod>_houses.txt
mod/<mod>/common/coat_of_arms/coat_of_arms/zz_<mod>_coa.txt
mod/<mod>/common/dna_data/zz_<mod>_dna.txt
mod/<mod>/history/characters/zz_<mod>_characters.txt
mod/<mod>/history/titles/zz_<mod>_titles.txt
mod/<mod>/common/bookmarks/bookmarks/zz_<mod>_bookmarks.txt      (optional)
mod/<mod>/gfx/portraits/portrait_modifiers/zz_<mod>_hair.txt      (optional)
mod/<mod>/localization/english/zz_<mod>_l_english.yml
```

### Script syntax and encoding

Script is `key = value` / `key = { ... }` trees; `#` comments; operators `=`, `!=`, `<`, `<=`, `>`, `>=`; logic `AND OR NOT NOR NAND`; booleans `yes`/`no`; scope prefixes `culture:`, `faith:`, `title:`, `character:`; "Indentation isn't important for execution of script" ([Scripting](https://ck3.paradoxwikis.com/Scripting)). Dates are `yyyy.mm.dd` without zero padding (`846.7.29`, `939.1.2`, `1199.4.6`) ([Character modding](https://ck3.paradoxwikis.com/Character_modding); [french.txt](https://github.com/skonester/ck3-mod-base/blob/master/base/game/history/characters/french.txt)). Vanilla history files are UTF-8 **with** BOM and tab-indented (BOM observed at the start of `french.txt`) ([french.txt](https://github.com/skonester/ck3-mod-base/blob/master/base/game/history/characters/french.txt)); `.yml` localization "must be saved with UTF-8 + BOM encoding" ([Localization](https://ck3.paradoxwikis.com/Localization)). Quote string values (`name = "Henri"`, `religion = "catholic"`); bare tokens are also accepted (`culture = french`). **Unverified:** escaping rules for quotes inside `.txt` string values.

### Localization

File `localization/english/<anything>_l_english.yml` (US spelling — "The Commonwealth spelling of 'localisation' will not work"), first line `l_english:`, entries ` key:0 "Text"` with one leading space; the `:0` version number "is no longer necessary"; `\n` line breaks, `\"` escaped quotes. Language folders: english, french, german, spanish, italian, polish, russian, simp_chinese, trad_chinese, japanese, korean, portuguese ([Localization](https://ck3.paradoxwikis.com/Localization); [Modding](https://ck3.paradoxwikis.com/Modding)). Example for a generated mod:

```
l_english:
 dynn_mymod_Stark:0 "Stark"
 dynnp_mymod_of:0 "of "
 dynn_mymod_Stark_motto:0 "Winter is Coming"
 k_mymod_north:0 "The North"
 k_mymod_north_adj:0 "Northern"
```

Common failures: missing keys, "using strings instead of loc keys", duplicate keys ([Mod troubleshooting](https://ck3.paradoxwikis.com/Mod_troubleshooting)). **Unverified:** whether a missing non-English file falls back to English or shows raw keys.

### Validation and logs

`logs/error.log` and `logs/database_conflicts.log` live in the user-data folder; launch options `-debug_mode -develop` enable the console and hot reload; console commands `script_docs` and `dump_data_types` write effect/trigger/data-type docs ([Modding](https://ck3.paradoxwikis.com/Modding); [Mod troubleshooting](https://ck3.paradoxwikis.com/Mod_troubleshooting)). `ck3-tiger` validates a mod against vanilla: `ck3-tiger path/to/descriptor.mod` with `--game <dir>`, `--paradox <userdir>`, `--config`, `--json`, `--no-color`, `--suppress <baseline.json>`; a `ck3-tiger.conf` in the mod folder selects languages and suppressions; it checks "spouse/employer/liege validity and genealogical integrity" and "will also often take a few days or even weeks to catch up with the latest updates to the games" ([amtep/ck3-tiger](https://github.com/amtep/ck3-tiger)). A broken mod can grow `error.log` to "hundreds of GB" ([Steam guide 2872535463](https://steamcommunity.com/sharedfiles/filedetails/?id=2872535463)). **Unverified:** the `--json` report schema; engine behaviour for a malformed `history/characters` file (skip entry vs skip file vs crash).

## Characters

**Conclusion for the developer:** a character is `<id> = { static keys ... <date> = { dated commands } }`; every generated character must have a `birth` block, should have a `death` block, must reference an existing faith key, culture key and dynasty or house, and gets its titles only from `history/titles`, never from its own block.

### Official schema

Paradox's shipped structure doc, verbatim ([history/_characters.info](https://github.com/skonester/ck3-mod-base/blob/master/base/game/history/_characters.info)):

```
=== Structure ===

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
	
	portrait_override = {	# Will override the character's appearance
		portrait_modifier_overrides={
			modifier_category_1 = modifier_1 # E.g. clothes=western_low_nobles
			modifier_category_1 = modifier_2
			...
		}
		hair={ R G B }	# hair color, e.g. hair={ 0.592 0.314 0.176 }
	}
}
```

The generic history format: "`<basic key-value pairs that denote the beginning of time>` then `date = { <overriding key-value pairs> }`" ([_history.info](https://github.com/skonester/ck3-mod-base/blob/master/base/game/history/_history.info)). Wiki rules: attributes "cap at 100"; `sexuality` ∈ `asexual|heterosexual|homosexual|bisexual`; `disallow_random_traits = yes` prevents random trait generation; "birth and death of the character have to be defined" ([Character modding](https://ck3.paradoxwikis.com/Character_modding)).

Measured key frequencies across all **71,124** vanilla characters (207 files, 1.19.0.6): static — `name` 71,138, `culture` 71,082, `religion` 70,078, `dynasty` 56,738, `father` 55,961, `trait` 28,690, `mother` 14,911, `female` 12,520, `dynasty_house` 10,426, `stewardship` 8,961, `martial` 8,937, `diplomacy` 8,905, `intrigue` 8,888, `faith` 1,002, `learning` 493, `dna` 438, `disallow_random_traits` 241, `sexuality` 188, `prowess` 149, `health` 25, `fertility` 6; `set_house`, `set_culture`, `set_character_faith_no_effect`, `add_same_sex_spouse`, `portrait_override` have **0** uses. Dated — `death` 56,465, `birth` 56,451, `add_spouse` 6,811, `employer` 949, `effect` 851, `trait` 845, `add_pressed_claim` 600, `name` 553, `give_nickname` 502, `religion` 422, `remove_spouse` 178, `remove_claim` 157, `culture` 143, `dynasty_house` 119, `capital` 105, `dynasty` 95, `add_trait` 66, `give_council_position` 65, `move_to_pool` 62, `add_matrilineal_spouse` 61, `remove_trait` 57, `add_concubine` 47, `faith` 25, `add_unpressed_claim` 12, `father` 11, `set_primary_title_to` 9 ([history/characters](https://github.com/skonester/ck3-mod-base/tree/master/base/game/history/characters)). Every vanilla character has a `birth` block; exactly one lacks `death`. **Unverified:** engine behaviour for a character with no `birth` block.

### Verbatim examples

Basic ([french.txt](https://github.com/skonester/ck3-mod-base/blob/master/base/game/history/characters/french.txt)):

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
		effect = {
	 		learn_language_of_culture = culture:occitan
		} 
	}
	1169.1.1 = {
		effect = {
			create_betrothal = character:205518 # Adèle de France
		}
	}
	1187.1.1 = {
		give_nickname = nick_the_lionheart
		trait = faith_warrior
	}
	1191.5.1 = {
		add_spouse = 206501 #Berengaria de Navarra
	}	
	1199.4.6 = {
		death = "1199.4.6"
	}
}
```

Wiki template for a mod character ([Character modding](https://ck3.paradoxwikis.com/Character_modding)):

```
999001 = {
	name = "Henri"	#Henri de Lyon
	dna = lyon_twin_dna_entry
	dynasty = 2100001 #Lyon
	martial = 14
	diplomacy = 23
	intrigue = 10
	stewardship = 21
	religion = catholic	
	culture = french
	trait = diligent
	trait = education_learning_4
	trait = just
	trait = twin
	trait = physique_good_3
	trait = intellect_good_3
	trait = beauty_good_3
	trait = shrewd
	disallow_random_traits = yes
	father = 999003
	mother = 999004
	846.7.29 = {
		birth = yes
	}
	920.5.25 = {
		death = yes
	}
}
```

### Birth, death, and dated state

`birth = yes` means born on the block date; `birth = "1048.1.1"` lets the stored date differ from the block date (a debug character uses `1.6.2 = { birth = "800.6.2" }`), so `birth = yes` in a block dated to the birthday is the canonical form ([portrait_debug_characters.txt](https://github.com/skonester/ck3-mod-base/blob/master/base/game/history/characters/portrait_debug_characters.txt)). Death forms: `death = yes`, `death = "1199.4.6"`, or

```
		death = {
			death_reason = death_battle
			killer = 163101
		}
```

Most-used `death_reason` keys: death_battle 186, death_execution 185, death_natural_causes 130, death_murder 116, death_ill 62, death_old_age 61, death_murder_known 58, death_suicide 26, death_childbirth 19, death_poison 16, death_dungeon 16 ([history/characters](https://github.com/skonester/ck3-mod-base/tree/master/base/game/history/characters)). "Dead at start" is simply a `death` block dated before the bookmark; no flag exists. Static fields may be overridden in a dated block (`1200.1.1 = { name = "Ioane" faith = "orthodox" culture = "georgian" dynasty = 101747 }`) ([armenian.txt](https://github.com/skonester/ck3-mod-base/blob/master/base/game/history/characters/armenian.txt)).

Placement of unlanded characters: `employer = <id>` in a dated block ("equivalent to `set_employer` effect"), optionally `give_council_position = councillor_marshal|councillor_spymaster|councillor_chancellor|councillor_court_chaplain|councillor_steward`; `move_to_pool = yes` makes a wanderer; `capital = c_denia` sets a ruler's capital; `add_pressed_claim = title:d_valencia` / `add_unpressed_claim` / `remove_claim` / `set_primary_title_to` ([Character modding](https://ck3.paradoxwikis.com/Character_modding); [english.txt](https://github.com/skonester/ck3-mod-base/blob/master/base/game/history/characters/english.txt)). Example: `1176.4.20 = { employer = 204500  give_council_position = councillor_marshal }`. **Unverified:** behaviour when a landed character also has `employer`, or when the employer is dead.

### Faith key: `religion`, `faith`, and the 1.20 `rite` change

Vanilla 1.19 uses `religion = <faith key>` 70,078× and `faith = <faith key>` 1,002×; both take a *faith* key (e.g. `religion = "catholic"`, `faith = "mahayana"`). The 1.20 community report states: "1.19: `religion = "waaqism_pagan"` | 1.20: `rite = "waaqism_pagan"` (`faith = x` gives the faith's main Rite; `religion = <faith>` is kept as a compatibility alias for faith keys only)", that 76,870 character lines switched, and that 62 former faith keys (`ashari`, `theravada`, `coptic`, `insular_celtic` ...) are no longer faiths — "`ashari`, `maturidi`, `mutazila` and `muwalladi` no longer exist anywhere, so use `faith = sunni` plus a madhhab rite (`hanafi`, `maliki`, `shafii`, `hanbali`)"; a null faith "is a classic CK3 crash cause" ([1.20.0.2.md](https://github.com/skonester/ck3-mod-base/blob/master/1.20.0.2.md)). **Unverified** against real 1.20 files; the app must read the installed `common/religion/` tree and, on 1.20+, validate `rite` keys too.

### Ids

Vanilla ids are mixed: 37,921 numeric (99 … 1,000,230,517) and ~33,100 strings (`aragonese0001`, `han_90005`, `zubu_13`, `patriarch_in_the_east_70`, `easteregg_anna_johansson`). Numeric distribution: <100k: 13,482; 100k–900k: 24,131; 900k–10M: 238 (e.g. 942069, 1229651, 3023080); 10M–1B: 0; ≥1B: 70 (e.g. 1000230101) ([history/characters](https://github.com/skonester/ck3-mod-base/tree/master/base/game/history/characters)). The wiki's "going for 900000 and further should be safe" ([Character modding](https://ck3.paradoxwikis.com/Character_modding)) is therefore not strictly true. Vanilla already contains duplicate ids (`aragonese0001` twice in one file; `142193`, `145712`–`145715` in more than one file), so the loader tolerates them, but a collision with a vanilla id silently merges/replaces that character. Cross-file references use bare ids (`father = aragonese0002`, `add_concubine = basque0149`) and `character:<id>` inside effects (`set_father = character:han_90005`). Observed charset `[A-Za-z0-9_\-]`. Recommendation: string ids with a mod prefix (`<mod>_char_0001`), or numerics in 10,000,000–999,999,999; check the installed `history/characters/*.txt` for collisions at generation time. Large mods do the same (Princes of Darkness: `POD_fae_character_1000`, tracked in a spreadsheet) ([PoD wiki](https://www.princesofdarknessmod.com/wiki/index.php/Character_Creation_Steps)).

### Names and nicknames

`name =` is a localization key resolved through `localization/english/names/character_names_l_english.yml` (`E_douard:0 "Édouard"`, `Hugues:0 "Hugues"`, `Robert:0 "Robert"`); accented letters are encoded in keys as `X_` (`AmE_dE_e`, `BenoI_t`, `dynn_GuzmA_n`) ([character_names_l_english.yml](https://github.com/skonester/ck3-mod-base/blob/master/base/game/localization/english/names/character_names_l_english.yml); [00_frankish.txt](https://github.com/skonester/ck3-mod-base/blob/master/base/game/common/culture/name_lists/00_frankish.txt)). Names need not be in any culture name list: 17,706 of 30,636 distinct vanilla names appear in no `common/culture/name_lists` file, and 492 have no loc entry at all ([history/characters](https://github.com/skonester/ck3-mod-base/tree/master/base/game/history/characters)). Names may be quoted or not and may contain underscores (`name="Songtsen_Gampo"`). Emit a `<key>:0 "Display"` line for every generated name. Nicknames: `give_nickname = nick_the_lionheart` (`nick_*` keys); `remove_nickname` exists ([english.txt](https://github.com/skonester/ck3-mod-base/blob/master/base/game/history/characters/english.txt)). **Unverified:** what the game shows for a name key with no localization (presumed raw key).

### Relations

Parentage: `father =` / `mother =` (static; dated forms are rare). Marriage: `add_spouse = <id>` written on one partner only (the engine makes it bidirectional), `add_matrilineal_spouse` flags matrilineal, `remove_spouse`; `add_same_sex_spouse` is documented but has 0 vanilla uses. Concubinage: `add_concubine = <id>` on the concubine-taker (47 uses). Bastardy: `trait = bastard`; legitimization on a date: `remove_trait = bastard` + `trait = legitimized_bastard`; `wild_oat` also exists. Twins: `trait = twin` on each with identical parents and birth date. Adoption/changed paternity: not a history key; vanilla uses `860.1.1 = { effect = { set_father = character:han_90005 } }`. Siblings are inferred from shared parents. House membership rule: "Characters are born into father's house in Patrilineal marriage, or mother's house in Matrilineal marriage" ([english.txt](https://github.com/skonester/ck3-mod-base/blob/master/base/game/history/characters/english.txt); [bodpa.txt](https://github.com/skonester/ck3-mod-base/blob/master/base/game/history/characters/bodpa.txt); [han.txt](https://github.com/skonester/ck3-mod-base/blob/master/base/game/history/characters/han.txt); [CK3 wiki: Dynasty](https://ck3.paradoxwikis.com/Dynasty)). Family-trait counts in vanilla: `bastard` 671, `legitimized_bastard` 114, `twin` 56, `disinherited` 14, `bastard_founder` 9, `wild_oat` 8. Other relation effects used in vanilla `effect` blocks: `set_relation_rival`, `set_relation_friend`, `set_relation_lover`, `set_relation_guardian`, `create_betrothal`, `set_designated_heir`, `marry`.

Verbatim bastard/legitimization example ([english.txt](https://github.com/skonester/ck3-mod-base/blob/master/base/game/history/characters/english.txt)):

```
	name = "Joan"
	female = yes
	dynasty_house = house_plantagenet
	religion = "catholic"
	culture = "english"
	trait = bastard
	father = 204514 #King John of England
	1189.1.1 = {
		birth = "1189.1.1"
	}
	1226.1.1 = {
		remove_trait = bastard
		trait = legitimized_bastard
	}
```

### Ruler Designer output is not script

The Ruler Designer writes nothing to `history/characters`. It offers "Copy DNA"/"Paste DNA" (clipboard) and "Save Ruler"/"Load Ruler" by filename (`RULER_DESIGNER_SAVE_WINDOW_TITLE:0 "Save Ruler"`, `RULER_DESIGNER_SAVE_OVERWRITE_RULER_DESC:0 "Ruler with the same file name already exists..."`); 1.13.2 added loading "only Traits or Appearance from a saved Ruler" ([ruler_designer_l_english.yml](https://github.com/skonester/ck3-mod-base/blob/master/base/game/localization/english/gui/ruler_designer_l_english.yml); [1.13.2 notes](https://github.com/skonester/ck3-mod-base/blob/master/base/release-notes/1_13_2_0_2024-10-23.md)). **Unverified:** the on-disk path and format of saved rulers (a forum thread confirms files are written — antivirus blocked them — but gives no path) ([Paradox forum](https://forum.paradoxplaza.com/forum/threads/how-to-save-a-custom-ruler.1587398/)). Designed characters are excluded from the sexuality-distribution reroll and the family-generation game rule (`is_from_ruler_designer = no`) ([00_game_rule_effects.txt](https://github.com/skonester/ck3-mod-base/blob/master/base/game/common/scripted_effects/00_game_rule_effects.txt)).

### Validation checklist for generated characters (inference)

(a) id unique against installed vanilla and other mods; (b) `culture` exists in `common/culture/cultures`; (c) `religion`/`faith` (and on 1.20 `rite`) key exists; (d) exactly one of `dynasty`/`dynasty_house`, both referencing existing entries; (e) all `father`/`mother`/`add_spouse`/`employer`/`killer` ids exist; (f) birth < marriage/employer/house-change dates < death; (g) title holder dates within lifetime; (h) trait keys exist in `common/traits`; (i) `name` has a loc entry; (j) `dna` key exists in `common/dna_data`. Other 1.20 additions reported but **unverified**: `effect_even_if_dead`, permanently unprunable historical characters, "obscured" characters with `<key>_obscured_desc`, and a `trait_conversion.lookup` (`scholar = erudite`, `eunuch = eunuch_1`, `poet = lifestyle_poet`) that auto-converts history but not script ([1.20.0.2.md](https://github.com/skonester/ck3-mod-base/blob/master/1.20.0.2.md)).

## Dynasties and houses

**Conclusion for the developer:** emit a dynasty (numeric or string id, `name` = loc key, `culture`) and attach founders with `dynasty =`; create a `dynasty_house` entry only for named cadet branches, because the engine auto-creates the founding house and vanilla never sets both `dynasty` and `dynasty_house` on one character.

### Schema and examples

Dynasty ([00_dynasties.txt](https://github.com/skonester/ck3-mod-base/blob/master/base/game/common/dynasties/00_dynasties.txt)):

```
2 = {
	name = "dynn_Orsini"
	culture = "italian"
}
3 = {
	prefix = "dynnp_de"
	name = "dynn_Villeneuve"
	culture = "norman"
}
7267 = { name = "dynn_Bunduqdarid" culture = "turkish" forced_coa_religiongroup = "muslim" }
```

House ([00_dynasty_houses.txt](https://github.com/skonester/ck3-mod-base/blob/master/base/game/common/dynasty_houses/00_dynasty_houses.txt)):

```
house_luxemburg = { # Karling cadets
	prefix = "dynnp_von"
	name = "dynn_Luxemburg"
	dynasty = 25061 #Karling
}
house_capet = {
	name = "dynn_Capet"
	dynasty = 743 #(Robertine)
}
house_habsburg = { # Etichonen cadets
	prefix = "dynnp_von"
	name = "dynn_Habsburg"
	motto = dynn_Habsburg_motto
	dynasty = 664 # Etichonen
}
```

Measured keys: dynasties — `culture` 10,338, `name` 10,331, `prefix` 1,244, `motto` 132, `forced_coa_religiongroup` 72; houses — `name` 558, `dynasty` 558, `prefix` 182, `motto` 8, `forced_coa_religiongroup` 3. No other keys occur; there is no `head =` key ([common/dynasties](https://github.com/skonester/ck3-mod-base/tree/master/base/game/common/dynasties); [common/dynasty_houses](https://github.com/skonester/ck3-mod-base/tree/master/base/game/common/dynasty_houses)). Dynasty ids may be strings in vanilla (`tondaiman = { name = "dynn_Tondaiman" culture = tamil }`, `vanity_johansson_2`), contradicting the wiki's "String IDs are not supported for dynasties" ([05_historical_character_dynasties.txt](https://github.com/skonester/ck3-mod-base/blob/master/base/game/common/dynasties/05_historical_character_dynasties.txt); [Dynasties modding](https://ck3.paradoxwikis.com/Dynasties_modding)). Numeric dynasty ids range 2 … 1,000,101,763. House ids are usually `house_*` but numeric ids exist (`12319 = { name = "dynn_Kalyani_Chalukya" dynasty = 1043012 }`).

The wiki template (page "timeless", updated 2021) and coat of arms keyed by dynasty id in `common/coat_of_arms/coat_of_arms/90_dynasties.txt` ([Dynasties modding](https://ck3.paradoxwikis.com/Dynasties_modding)):

```
2100001 = {
	prefix = "dynnp_de"
	name = "dynn_Lyon"
	culture = "french"
	motto = "dynn_Lyon_motto"
}
house_lyon = {
	prefix = "dynnp_de"
	name = "dynn_Lyon"
	dynasty = 2100001
}
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

### Structural facts from vanilla

538 houses, all with `dynasty =` pointing at an existing dynasty; 10,328 dynasties, so ~9,800 have no house entry. Characters: 56,780 use `dynasty` only, 10,427 `dynasty_house` only, **0 both**, 3,917 neither (lowborn) ([history/characters](https://github.com/skonester/ck3-mod-base/tree/master/base/game/history/characters)). A founder references the house directly (`200 = { #Hugh Capet ... dynasty_house = house_capet ... }`); a cadet house is founded at a date inside the character block ([aragonese.txt](https://github.com/skonester/ck3-mod-base/blob/master/base/game/history/characters/aragonese.txt)):

```
aragonese0001 = {
	name = "Blasco"
	dynasty = 8685
	religion = catholic
	culture = aragonese
	trait = education_intrigue_1
	father = aragonese0002
	1256.1.1 = {
		birth = yes
	}
	1279.1.1 = {
		add_spouse = 30793
		dynasty_house = house_alagona # House of Alagona, Founder
	}
	1302.1.1 = {
		death = yes
	}
}
```

A forum tutorial warns "the game is not supposed to have dynasties without founding houses", recommends "Do not create a house for your founding house ... Create a house only for cadet branches", and notes the wiki "was incomplete, lacking these crucial implementation details" ([Paradox forum tutorial](https://forum.paradoxplaza.com/forum/threads/lack-of-the-founding-house-tutorial-of-modding-dynasties.1452333/)). The wiki says "If no house is created, the game auto-generates one using dynasty details" ([Dynasties modding](https://ck3.paradoxwikis.com/Dynasties_modding)). Heads are computed, not scripted: "Upon a House Head's death, their Primary Heir becomes the next House Head"; the Dynasty Head "is the most powerful House Head within a dynasty ... If another House Head becomes 10% stronger than the current Dynasty Head it will take its place"; "House heads with Adventurer government cannot become dynasty heads, though custom characters will start as one" ([CK3 wiki: Dynasty](https://ck3.paradoxwikis.com/Dynasty)). **Unverified:** how the engine picks the initial house head at a bookmark; behaviour when a character's `dynasty` conflicts with its house's `dynasty`.

### Localization keys

`dynn_<Name>` for dynasty/house names and `dynnp_<word>` for prefixes resolve in `localization/<lang>/dynasties/dynasty_names_l_<lang>.yml` (`dynnp_de:0 "de "` with trailing space, `dynnp_d-:0 "d'"` without, `dynn_Capet:0 "Capet"`); mottos (`dynn_Hauteville_motto:0 "God's Hand Made Wonders, God's Hand Made Me"`) in `mottos_l_<lang>.yml` ([dynasty_names_l_english.yml](https://github.com/skonester/ck3-mod-base/blob/master/base/game/localization/english/dynasties/dynasty_names_l_english.yml); [mottos_l_english.yml](https://github.com/skonester/ck3-mod-base/blob/master/base/game/localization/english/mottos_l_english.yml)). Prefix keys seen: `dynnp_de`, `dynnp_von`, `dynnp_of`, `dynnp_du`, `dynnp_d_`, `dynnp_di`, `dynnp_ua`, `dynnp_av`. The `dynn_`/`dynnp_` prefixes are conventions, not engine requirements, but name lists reference them (`cadet_dynasty_names = { { "dynnp_of" "dynn_Capet" } ... }`, `dynasty_of_location_prefix = "dynnp_de"`) ([00_frankish.txt](https://github.com/skonester/ck3-mod-base/blob/master/base/game/common/culture/name_lists/00_frankish.txt)). Name lists also carry child-naming odds (`pat_grf_name_chance = 50 mat_grf_name_chance = 5 father_name_chance = 10`), which matter for generated children, not for scripted names. **Unverified (1.20):** "+69 dynasties" and a "single house/dynasty CoA frame override" ([1.20.0.2.md](https://github.com/skonester/ck3-mod-base/blob/master/1.20.0.2.md)).

## Titles and title history

**Conclusion for the developer:** `common/landed_titles` makes a title key valid; `history/titles` makes it exist at a date. To land a custom character at a start date, add a new `history/titles/zz_<mod>.txt` with a dated block `holder = <id>` (plus `liege`) dated later than the last vanilla block before the bookmark and ≤ the bookmark date, and compute "exists at date D" by replaying all blocks with date ≤ D.

### `common/landed_titles`

Hierarchy is nested top-down with tier prefixes `e_ k_ d_ c_ b_` (plus `h_` hegemony); baronies carry `province = <id>` ([_landed_titles.info](https://github.com/skonester/ck3-mod-base/blob/master/base/game/common/landed_titles/_landed_titles.info)):

```
e_my_empire = {
	k_my_kingdom = {
		d_my_duchy = {
			c_my_county = {
				b_my_barony = {
				}
			}
		}
	}
	c_my_other_county = {}
}
```

Rules: "you cannot add titular barony or county titles"; a county needs a duchy parent, a barony a county parent, every county at least one barony, every barony a province id. Minimal titular title: `k_titular_kingdom_name = { color = { 100 255 200 } }` ([Title modding](https://ck3.paradoxwikis.com/Title_modding)). Attributes with defaults from the 1.19 `.info`: `color`, `figurehead` (no), `allow_domicile` (yes), `landless` (no), `require_landless` (no; "may be destroyed on succession if the character gets land"), `destroy_if_invalid_heir`, `destroy_on_succession`, `delete_on_destroy`, `delete_on_gain_same_tier`, `no_automatic_claims`, `definite_form`, `always_follows_primary_heir`, `ruler_uses_title_name` (yes), `can_be_named_after_dynasty` (yes), `province` (barony only), `capital` (county key), `de_jure_drift_disabled`, `ignore_titularity_for_title_weighting`, `holding_regnal_*_names`, `posthumous_regnal_*_names`, `disable_regnal_numbers`, `ai_primary_priority` (scripted value), `can_create`/`can_create_on_partition`/`can_destroy` (triggers), `cultural_names = { name_list_norse = cn_noregr }`; `key`, `tier`, `de_jure_liege`, `dyn` "Should not be used in database definitions" ([_landed_titles.info](https://github.com/skonester/ck3-mod-base/blob/master/base/game/common/landed_titles/_landed_titles.info)). `color2` is "unused and unsupported by the game engine" as of 1.18 ([Title modding](https://ck3.paradoxwikis.com/Title_modding)).

Vanilla example (note there is **no** `c_wessex`/`d_wessex`; "Wessex" is the loc name of `d_somerset`, Winchester is `b_winchester` in `c_hampton` = "Hampshire") ([00_landed_titles.txt](https://github.com/skonester/ck3-mod-base/blob/master/base/game/common/landed_titles/00_landed_titles.txt)):

```
	k_england = {
		color = { 202 26 26 }
		capital = c_middlesex
		ai_primary_priority = {
			if = {
				limit = {
					OR = {
						culture = culture:english
						culture = culture:anglo_saxon
					}
				}
				add = @correct_culture_primary_score
			}
		}
...
		d_somerset = {
			color = hsv{ 1 0.9 0.9 }
			capital = c_hampton # Winchester
...
			c_hampton = {
				color = { 230 15 55 }
				b_winchester = {
					province = 1544
					color = { 230 15 55 }
				}
```

Landless adventurer title (Roads to Power) and a landless "noble family" title, which uses the county prefix with no baronies and `noble_family = yes` ([00_landed_titles.txt](https://github.com/skonester/ck3-mod-base/blob/master/base/game/common/landed_titles/00_landed_titles.txt); [01_other_noble_family.txt](https://github.com/skonester/ck3-mod-base/blob/master/base/game/common/landed_titles/01_other_noble_family.txt)):

```
d_laamp_wake = { # Hereweard the Wake
	color = { 100 100 100 }
	capital = c_brugge
	definite_form = yes
	landless = yes
	require_landless = yes
	ruler_uses_title_name = no
	no_automatic_claims = yes
	destroy_if_invalid_heir = yes
	ai_primary_priority = { add = @never_primary_score }
}

c_nf_dam = { # DAM
	color = { 100 100 100 }
	capital = c_lam_tay
	definite_form = yes
	landless = yes
	ruler_uses_title_name = no
	always_follows_primary_heir = yes
	no_automatic_claims = yes
	noble_family = yes
	destroy_if_invalid_heir = yes
	ai_primary_priority = { add = @never_primary_score }
}
```

A validator must not assume every `c_` key maps to provinces; treat `landless = yes` as non-map regardless of prefix. Vanilla 1.19 files: `00_landed_titles.txt, 01_japan.txt, 01_japan_noble_family.txt, 01_korea_noble_family.txt, 01_other_noble_family.txt, 02_china.txt, 03_seasia.txt, 04_china_noble_families.txt, 05_goryeo.txt, 06_philippines.txt` ([common/landed_titles](https://github.com/skonester/ck3-mod-base/tree/master/base/game/common/landed_titles)). **Unverified (1.20):** new `07_pam_ecclesiastical_titles.txt` (~290 `d_cd_*` clerical titles), `07_pam_hegemony_titles.txt` (`h_kingdom_of_heaven`), rename `d_knights_hospitaler` → `d_knights_hospitaller`, and a warning that a 1.19 full-file override of `00_landed_titles.txt` breaks ([1.20.0.2.md](https://github.com/skonester/ck3-mod-base/blob/master/1.20.0.2.md)).

Province mapping: `b_winchester = { province = 1544 }` ↔ `map_data/definition.csv` row `1544;169;159;72;WINCHESTER;x;` ↔ `history/provinces/k_england.txt` block `1544 = { culture = anglo_saxon religion = catholic holding = castle_holding 867.1.1 = { buildings = { common_tradeport_01 } } ... }` ([definition.csv](https://github.com/skonester/ck3-mod-base/blob/master/base/game/map_data/definition.csv); [history/provinces/k_england.txt](https://github.com/skonester/ck3-mod-base/blob/master/base/game/history/provinces/k_england.txt)). County culture/faith/holding come from the capital barony's province; the wiki's note that the capital is "the first listed barony" is flagged on the wiki itself as "doesn't seem correct anymore" ([Title modding](https://ck3.paradoxwikis.com/Title_modding)).

### `history/titles`

Wiki schema ([Title modding](https://ck3.paradoxwikis.com/Title_modding)):

```
d_NAME={
	YYYY.MM.DD={
		holder = <historical_char_id> # 0 if title should no longer exists
		government = <feudal/theocracy/clan/republican/holy_order>_government 
		liege = k_NAME # Musst be a higher tier or 0 if independent now
		de_jure_liege = k_OTHER # de jure part of
		change_development_level = INT #
		succession_laws = { <NAME>_succession_law }
		set_court_language = language_NAME # consider a has_dlc_feature = royal_court block before
		effect = {
			set_capital_county = title:c_<NAME> # Relocate capital province - like Winchester to London
		}
	}
}
```

Semantics, verbatim from the wiki: the holder "should also be alive, otherwise there is a risk of an error or a crash ... a Muslim cannot be the Catholic Pope. If set to 0 the title is destroyed. This doesn't work for contries [sic] or baronies"; `liege` "is a vassal of the other title until the value is reset ... liege = 0 ... corresponds to independence"; "If no other liege or holder is added, they will be identical to the previous entry. A completely missing liege will result in an independent holder"; `de_jure_liege` "results in critical errors if done with Barony"; development "is also transferred to titles below it. CK3 reads and executes these commands in the order they appear in the text files"; government changes can leak ("a feudal emperor gets a county that was historically a republic ... the feudal empire becomes a republic") ([Title modding](https://ck3.paradoxwikis.com/Title_modding); [History modding](https://ck3.paradoxwikis.com/History_modding)). Existence rule when a title has no start-date entry: county → given to the lowest valid living de jure holder or a random character as an independent one-province county; barony → random vassal of the county owner; "Otherwise -Title is not created" ([Title modding](https://ck3.paradoxwikis.com/Title_modding)).

Vanilla kingdom, duchy that ceases to exist, and county ([k_england.txt](https://github.com/skonester/ck3-mod-base/blob/master/base/game/history/titles/k_england.txt)):

```
k_england = {
	867.1.1 = { change_development_level = 5 }
	1066.1.1 = { change_development_level = 8 }
	1178.1.1 = { change_development_level = 24 }
	700.1.1 = {
		effect = {
			set_capital_county = title:c_hampton
		}
	}
	927.7.12 = {
		holder = 33350 # Aethelstan the Glorious
		succession_laws = { saxon_elective_succession_law }
	}
...
	1066.1.5 = {
		holder = 122 # Harold Godwinson
		effect = {
			set_capital_county = title:c_middlesex
		}
	}
	1066.10.14 = {
		holder = 140 # William the Conqueror
		remove_succession_laws = yes
	}
}

d_somerset = {
	757.1.1 = {
		holder = 205180
	}
...
	924.8.3 = {
		holder = 33350 # Aethelstan the Glorious
	}
	939.10.27 = {
		holder = 0
	}
}

c_hampton = {
	867.1.1 = { change_development_level = 8 }
	1066.1.1 = { change_development_level = 11 }
	757.1.1 = {
		holder = 205180
	}
	865.1.1 = {
		liege = "k_england"
		holder = 33358
	}
	1066.1.5 = {
		holder = 122 #Harold Godwinson's heir
	}
	1066.10.14 = {
		holder = 140 # William the Conqueror
	}
	1070.1.1 = {
		holder = 155245 #Bishops of Winchester
		government = theocracy_government
	}
```

So `d_somerset` exists in 867 and not in 1066/1178; the development entries dated `1066.1.1`/`1178.1.1` with bookmarks at 1066.9.15/1178.10.1 confirm "≤ start date" semantics. Holders may be string ids (`holder = patriarch_in_the_east_70`, `holder = viet_dam_1`) and blocks are not in date order in the file. Two blocks with the **same date** are allowed and both applied ([02_other_noble_family.txt](https://github.com/skonester/ck3-mod-base/blob/master/base/game/history/titles/02_other_noble_family.txt)):

```
c_nf_dam = {
	1178.1.1 = {
		liege = k_viet
		holder = viet_dam_1 # Thu_Phung
		government = meritocratic_government
		succession_laws = { noble_family_succession_law }
	}
	1178.1.1 = {
		effect = {
			destroy_landless_title_no_tgp_dlc_effect = { DATE = 1178.1.1 }
		}
	}
	1179.1.1 = { holder = 0 }
}
```

Vanilla 1.19 has 183 title-history files (one per de jure kingdom, some `e_*`, plus `00_other_titles.txt, 01_admin_titles.txt, 01_admin_titles_tgp.txt, 01_laamp_titles.txt, 02_*_noble_family.txt`); the same key appears in two files with differing values (`c_bombogor` in `k_naimania.txt` with `tribal_government` and `k_otuken.txt` with `nomad_government`) and `c_nf_dam` is defined twice in one file, so the engine tolerates duplicates ([k_otuken.txt](https://github.com/skonester/ck3-mod-base/blob/master/base/game/history/titles/k_otuken.txt); [history/titles](https://github.com/skonester/ck3-mod-base/tree/master/base/game/history/titles)). **Unverified:** which block wins when two files give the same key and date; whether `name`/`reset_name` are valid history keys (the `k_france.txt` example uses `name = WEST_FRANCIA` inside a dated block); engine behaviour when the resolved holder is dead at start. **Unverified (1.20):** subfolders inside `history/titles` (`ce3/00_ecclesiastical_titles.txt`) are read, and the `destroy_landless_title_no_*dlc_effect` calls were removed ([1.20.0.2.md](https://github.com/skonester/ck3-mod-base/blob/master/1.20.0.2.md)).

### Resolving state at a start date (algorithm, inference)

Parse every file under `history/titles/**`; build `title → [(date, block)]` merging duplicate keys across files; stable-sort by date; apply blocks with date ≤ D in order, keeping the last value per key (`holder`, `liege`, `government`, `de_jure_liege`, `succession_laws`, development). Duchy+ exists iff final `holder != 0` and that holder is alive at D; counties and baronies always exist. A `liege` pointing at a title held by the same character is normal (Harold holds both `k_england` and `c_hampton`) — treat "liege held by self" as "not a vassal". ImperatorToCK3's MIT `TitleHistory` implements exactly this: `AddFieldValue(date, field, changetype, value)` with `GetHolderId(date)` (default `"0"`), `GetLiegeId(date)`, `GetGovernment(date)`, `GetDevelopmentLevel(date)` ([TitleHistoryTests.cs](https://github.com/ParadoxGameConverters/ImperatorToCK3/blob/master/ImperatorToCK3.UnitTests/CK3/Titles/TitleHistoryTests.cs)). No vanilla file enumerates titles per bookmark; the git mirror `skonester/ck3-mod-base` is a usable offline copy of the text tree ([ck3-mod-base](https://github.com/skonester/ck3-mod-base)).

### Replacing a vanilla holder

Pattern: (1) define the character in `history/characters/zz_<mod>.txt`, born before and dying after the bookmark; (2) add `history/titles/zz_<mod>.txt` with

```
c_hampton = {
	1066.9.15 = {
		holder = mymod_char_0001
		liege = k_england
	}
}
```

using a date > the last vanilla block before the bookmark (1066.1.5 here) and ≤ the bookmark, so ordering is unambiguous regardless of same-date precedence. The displaced vanilla holder keeps every other title (each title's history is independent); vassals follow the *title* (`liege = d_x`), not the character. The wiki advises adjusting the predecessor's death date to the takeover date, otherwise "in the dynasty tree the predecessor won't be Count X of Lyon" ([History modding](https://ck3.paradoxwikis.com/History_modding)). Vanilla itself frames laamp titles by date so they exist only at one bookmark (`1066.6.1` creation, `1072.1.1 = { holder = 0 }`).

### Governments and landless characters

1.19 government keys (`common/governments/00_government_types.txt`, `01_japan_government_types.txt`): `feudal_government, republic_government, theocracy_government, clan_government, tribal_government, wanua_government, mercenary_government, holy_order_government, administrative_government, landless_adventurer_government, nomad_government, herder_government, celestial_government, mandala_government, steppe_admin_government, meritocratic_government, japan_feudal_government` ([common/governments](https://github.com/skonester/ck3-mod-base/tree/master/base/game/common/governments)). Schema: `can_get_government` (trigger, "checked when landed ... fallback will be used"), `primary_holding`, `valid_holdings`, `required_county_holdings`, `primary_heritages`, `preferred_religions`, `landless_playable` ("Requires the dlc_flag landless_playable"), `administrative` ("Requires the dlc_flag admin_gov"), `fallback` ([_governments.info](https://github.com/skonester/ck3-mod-base/blob/master/base/game/common/governments/_governments.info)). Concrete: feudal `primary_holding = castle_holding`, `required_county_holdings = { castle_holding city_holding church_holding }`, `fallback = 1`; tribal `primary_holding = tribal_holding`; clan `primary_heritages = { heritage_arabic heritage_iranian heritage_turkic }`, `preferred_religions = { islam_religion }`; administrative `landless_playable = yes`, `fallback = 3`; landless_adventurer `can_get_government = { any_held_title = { title_tier = duchy is_landless_type_title = yes } }` ([00_government_types.txt](https://github.com/skonester/ck3-mod-base/blob/master/base/game/common/governments/00_government_types.txt)). A validator should warn (not reject) when the county capital's `holding` is not in the holder government's primary/valid holdings. **Unverified:** the primary-title rule at start (assume highest tier); 1.20's `mechanic_type = administrative` rewrite and new `ecclesiastical_government`.

A landless adventurer is created by a `landless = yes`/`require_landless = yes` duchy plus title history, not by character history ([01_laamp_titles.txt](https://github.com/skonester/ck3-mod-base/blob/master/base/game/history/titles/01_laamp_titles.txt)):

```
d_laamp_wake = { # Hereweard the Wake
	1066.6.1 = {
		liege = 0
		holder = 90028 # Hereweard the Wake
		government = landless_adventurer_government
		succession_laws = { landless_adventurer_succession_law }
		effect = {
			create_landless_adventurer_title_history_effect = yes
			set_variable = { name = adventurer_creation_reason value = flag:historical }
		}
	}
	1066.9.15 = {
		effect = {
			destroy_landless_title_no_dlc_effect = { DATE = 1066.9.15 }
		}
	}
	1072.1.1 = {
		holder = 0
	}
}
```

`destroy_landless_title_no_dlc_effect` destroys the title when `NOT = { has_dlc_feature = roads_to_power }` and `game_start_date = $DATE$` ([07_dlc_ep3_scripted_effects.txt](https://github.com/skonester/ck3-mod-base/blob/master/base/game/common/scripted_effects/07_dlc_ep3_scripted_effects.txt)). Administrative "noble family" vassals use the same shape with `liege = e_byzantium`, `government = administrative_government`, `succession_laws = { noble_family_succession_law }` ([01_admin_titles.txt](https://github.com/skonester/ck3-mod-base/blob/master/base/game/history/titles/01_admin_titles.txt)). Localization: every title needs `<key>` and `<key>_adj`, optionally `<key>_article` ([Title modding](https://ck3.paradoxwikis.com/Title_modding)).

## Traits, skills and the Ruler Designer point system

**Conclusion for the developer:** points used = AgeCost + Σ SkillCost(base value) + 10·sons + 10·daughters + Σ `ruler_designer_cost`; there is no budget in the engine, only the achievements cap `IRONMAN_POINT_MAX = 400`, and every input is in three files (`00_defines.txt`, `02_ruler_designer_values.txt`, `00_traits.txt`) that the app should parse from the installed game rather than hardcode.

### Defines (verbatim, unchanged by 1.20 per the community diff)

```
NRulerDesigner = {
	IRONMAN_POINT_MAX = 400 # Above this value achievements are not allowed
	AGE_LEVELS = { 10 16 18 20 22 23 24 25 26 27 28 29 30 31 32 33 34 35 36 37 38 39 40 41 42 43 44 45 46 47 48 49 50 60 70 } # Index into below if <= age
	AGE_LEVEL_MULTIPLIERS = { 2 2.25 2.5 2.7 2.9 3 2.9 2.8 2.7 2.6 2.5 2.4 2.3 2.2 2.1 2 1.9 1.8 1.7 1.6 1.5 1.4 1.3 1.2 1.1 1 0.9 0.8 0.7 0.6 0.5 0.4 0.3 0.2 0.1 0 } # Multiplier on age for points used
	DEFAULT_SKILL_VALUE = 5
	GENERATED_SONS_MULTIPLIER = 10
	GENERATED_DAUGHTERS_MULTIPLIER = 10
	GENERATED_SPOUSE = 0
	DEFAULT_EDUCATION_TRAIT = "education_intrigue_1"
	BASE_HEALTH = 5.0
}
```

([00_defines.txt](https://github.com/skonester/ck3-mod-base/blob/master/base/game/common/defines/00_defines.txt); [1.20.0.2.md](https://github.com/skonester/ck3-mod-base/blob/master/1.20.0.2.md)). Related: `NSkills = { MAX_DIPLOMACY = 100 ... MAX_PROWESS = 100 }`, `SKILL_LEVELS_VALUES = { 4 8 12 16 68 69 99 }`, `MALE_ADULT_AGE = 16`, `FEMALE_ADULT_AGE = 16`, `CHILDHOOD_AGE = 6`. The GUI reads the cap from the define (`LessThanOrEqualTo_int32( RulerDesignerWindow.GetPointsUsed, GetDefine( 'NRulerDesigner', 'IRONMAN_POINT_MAX' ) )`) and turns the bar red above it; sliders: age `min = 0 max = 120`, weight `min = -100 max = 100` ([window_ruler_designer.gui](https://github.com/skonester/ck3-mod-base/blob/master/base/game/gui/window_ruler_designer.gui)). The localization has exactly six breakdown line items — `RULER_DESIGNER_POINTS_AGE "Age"`, `RULER_DESIGNER_POINTS_SKILL "$SKILL$"`, `RULER_DESIGNER_POINTS_SONS "Generated Sons"`, `RULER_DESIGNER_POINTS_DAUGHTERS "Generated Daughters"`, `RULER_DESIGNER_SPOUSE "Married"`, `RULER_DESIGNER_POINTS_TRAIT` — and no weight/appearance/dynasty/culture/faith/title items ([ruler_designer_l_english.yml](https://github.com/skonester/ck3-mod-base/blob/master/base/game/localization/english/gui/ruler_designer_l_english.yml)). The wiki confirms sex, sexuality, faith, culture, name, dynasty name/heraldry cost nothing; each child costs 10 and "A ruler is limited to a number of children equal to one for each year since they turned 16"; a random spouse costs 0; weight costs nothing (obesity >50 or malnutrition <−50 gives −1 health); "Exceeding 400 points will disallow achievements, even if Ironman is enabled"; "a trait's cost isn't affected by it being considered a virtue or sin under the ruler's faith" ([Ruler Designer](https://ck3.paradoxwikis.com/Ruler_Designer)). A 2020 PCGamesN claim that weight "factors into the point calculation" is contradicted by the current files ([PCGamesN](https://www.pcgamesn.com/crusader-kings-3/ruler-designer-ck3-patch-12)).

### Age cost

Cost = age × `AGE_LEVEL_MULTIPLIERS[i]` where i is the first index with age ≤ `AGE_LEVELS[i]`; the 36th multiplier (0) applies above 70. Computed table (raw products; **Unverified:** the engine's integer rounding rule):

| Age | Mult | Cost | Age | Mult | Cost | Age | Mult | Cost |
|---|---|---|---|---|---|---|---|---|
| 0–10 | 2 | 0…20 | 30 | 2.3 | 69 | 41 | 1.2 | 49.2 |
| 11–16 | 2.25 | 24.75…36 | 31 | 2.2 | 68.2 | 42 | 1.1 | 46.2 |
| 17–18 | 2.5 | 42.5, 45 | 32 | 2.1 | 67.2 | 43 | 1 | 43 |
| 19–20 | 2.7 | 51.3, 54 | 33 | 2 | 66 | 44 | 0.9 | 39.6 |
| 21–22 | 2.9 | 60.9, 63.8 | 34 | 1.9 | 64.6 | 45 | 0.8 | 36 |
| 23 | 3 | 69 | 35 | 1.8 | 63 | 46 | 0.7 | 32.2 |
| 24 | 2.9 | 69.6 | 36 | 1.7 | 61.2 | 47 | 0.6 | 28.2 |
| 25 | 2.8 | 70 | 37 | 1.6 | 59.2 | 48 | 0.5 | 24 |
| 26 | 2.7 | 70.2 | 38 | 1.5 | 57 | 49 | 0.4 | 19.6 |
| 27 | 2.6 | 70.2 | 39 | 1.4 | 54.6 | 50 | 0.3 | 15 |
| 28 | 2.5 | 70 | 40 | 1.3 | 52 | 51–60 | 0.2 | 10.2…12 |
| 29 | 2.4 | 69.6 | | | | 61–70 | 0.1 | 6.1…7 |
| | | | | | | 71–120 | 0 | 0 |

This matches the wiki ("The range between 24 and 28 is considered a ruler's prime and thus costs the most"). Age side-effects: starting health 5.0 at 0–47, 4.0 at 48–64, 3.0 at 65–120; "Starting with the age of 15, your ruler also receives 1 lifestyle perk for every 3 years ... up to a maximum of 20 perks at the age of 75", plus a bonus lifestyle trait per 9 perk points ([Ruler Designer](https://ck3.paradoxwikis.com/Ruler_Designer)). Prestige is recomputed on finish: reset to 0, then `medium_prestige_value` (150) × age bracket (>60→5, >48→4, >36→3, >24→2, >12→1; +1 arrogant/ambitious, −1 humble/content, floored at 0) plus 150 × highest held title tier; child or incapable rulers get a regency via `diarchy.0011`; a Mecca-capital `mandatory_hajj` ruler gets `hajjaj` free; an `h_china` holder gets +1000 prestige, +500 piety, +1000 influence, +500 dynasty prestige ([ruler_designer.txt](https://github.com/skonester/ck3-mod-base/blob/master/base/game/common/on_action/ruler_designer.txt); [game_start.txt](https://github.com/skonester/ck3-mod-base/blob/master/base/game/common/on_action/game_start.txt)). **Unverified:** the default age the designer opens with and how the birth day/month is chosen (engine-side).

### Skill cost

Verbatim script (reformatted onto single lines) ([02_ruler_designer_values.txt](https://github.com/skonester/ck3-mod-base/blob/master/base/game/common/script_values/02_ruler_designer_values.txt)):

```
ruler_designer_general_skill_value_cost = {
	value = 0
	if = { limit = { scope:value > 0  scope:value < 5 }   add = 2  multiply = scope:value }
	else_if = { limit = { scope:value > 4  scope:value < 9 }   add = 4  multiply = { value = scope:value subtract = 4 }  add = 8 }
	else_if = { limit = { scope:value > 8  scope:value < 13 }  add = 7  multiply = { value = scope:value subtract = 8 }  add = 24 }
	else_if = { limit = { scope:value > 12 scope:value < 17 }  add = 11 multiply = { value = scope:value subtract = 12 } add = 52 }
	else_if = { limit = { scope:value > 16 }                   add = 17 multiply = { value = scope:value subtract = 16 } add = 96 }
}
ruler_designer_diplomacy_skill_value_cost = { value = ruler_designer_general_skill_value_cost }
ruler_designer_martial_skill_value_cost = { value = ruler_designer_general_skill_value_cost }
ruler_designer_stewardship_skill_value_cost = { value = ruler_designer_general_skill_value_cost }
ruler_designer_intrigue_skill_value_cost = { value = ruler_designer_general_skill_value_cost }
ruler_designer_learning_skill_value_cost = { value = ruler_designer_general_skill_value_cost }
```

Prowess uses the same structure with per-point prices 1/2/4/7/11 and offsets 0/4/12/28/56. Closed forms — general: `v≤0→0; 1–4→2v; 5–8→4(v−4)+8; 9–12→7(v−8)+24; 13–16→11(v−12)+52; 17+→17(v−16)+96`; prowess: `1–4→v; 5–8→2(v−4)+4; 9–12→4(v−8)+12; 13–16→7(v−12)+28; 17+→11(v−16)+56`. The brackets align with `SKILL_LEVELS_VALUES` 4/8/12/16.

| Base | General | Prowess | Base | General | Prowess |
|---|---|---|---|---|---|
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

The input is the **base** value: the GUI's − button disables at `GetBaseValue = 0` and the + button at `GetMaxValue`, the displayed total is `GetModifiedValueBreakdown` (rows "Base Skill", "[TRAIT.GetName]"), and the wiki states cost depends on the threshold "after the increase, but before traits are applies" and "Increasing prowess costs half as much as the other five core skills" ([window_ruler_designer.gui](https://github.com/skonester/ck3-mod-base/blob/master/base/game/gui/window_ruler_designer.gui); [Ruler Designer §Skills](https://ck3.paradoxwikis.com/index.php?title=Ruler_Designer&action=raw&section=5)). A fresh designer with all six skills at 5 therefore shows 5×12 + 6 = 66 skill points before age. **Unverified:** a fan tool claims trait modifiers change per-point cost ([ck3-random-ruler](https://ck3-random-ruler.vercel.app/)); the files and wiki contradict it.

### Trait schema

All 301 vanilla traits live in `common/traits/00_traits.txt`; 222 carry an explicit cost. Schema lines from `_traits.info`: `category = X` ("Valid categories: personality, education, childhood, commander, winter_commander, lifestyle, court_type, fame, health"; congenital traits have **no** category), `valid_sex = all/male/female`, `minimum_age`, `maximum_age`, `potential = { }` ("This will not run in ruler designer"), `genetic = yes/no` ("An active trait is inherited with 100% chance, an inactive trait with a 50% chance"), `good`, `physical`, `inherit_chance`, `shown_in_ruler_designer = yes/no` ("Defaults to yes"), `ruler_designer_cost = int` ("defaults to zero"), `opposites = { }`, `level`, `group`, `track`/`tracks`; "Any other unknown property is read in as a modifier"; loc keys `trait_<key>`/`trait_<key>_desc`, icon `gfx/interface/icons/traits/<trait>.dds` ([_traits.info](https://github.com/skonester/ck3-mod-base/blob/master/base/game/common/traits/_traits.info)). The picker shows a trait iff `Trait.ShowInRulerDesigner` and not already taken, enables it via `RulerDesignerWindow.CanPickTrait`, and prints `[Trait.GetRulerDesignerCost|=]`; tabs are `GetEducationTraits`, `GetPersonalityTraits`, `GetOtherRulerDesignerTraits` ([window_ruler_designer.gui](https://github.com/skonester/ck3-mod-base/blob/master/base/game/gui/window_ruler_designer.gui)). No trait file contains a `potential` block or DLC reference.

Selection rules (wiki + files): "you can start with any number of personality traits ... or get the lifestyle traits ... without having to complete said tree"; "if a trait has no cost it's not available"; "If a trait has congenital and non-congenital versions, only the former can be purchased" (`depressed_1`/`lunatic_1`/`possessed_1` hidden; `depressed_genetic` −20, `lunatic_genetic` −15, `possessed_genetic` −20 shown) ([Ruler Designer §Traits](https://ck3.paradoxwikis.com/index.php?title=Ruler_Designer&action=raw&section=4); [Traits](https://ck3.paradoxwikis.com/Traits)). Enforce: only visible traits; at most one `category = education` trait and only if age ≥ 16 (all have `minimum_age = 16`; "Only adults may have an education trait"); childhood traits `minimum_age = 3`, `maximum_age = 15`; `eunuch_1`/`beardless_eunuch` `valid_sex = male`; no pair where either lists the other or its `group` in `opposites`. `immortal` is visible but costs 10000. 1.10.1 fixed "the Eccentric trait improperly subtracting customization points" ([1.10.1 notes](https://github.com/skonester/ck3-mod-base/blob/master/base/release-notes/1_10_1_0_2023-08-31.md)). **Unverified:** whether the engine hides traits from unowned DLC; whether 1.20's new `INTENDED_MAX_PERSONALITY_TRAITS` define restricts the designer.

Hidden (`shown_in_ruler_designer = no`, 79 traits): `pregnant, depressed_1, lunatic_1, possessed_1, early_great_pox, wounded_1, wounded_2, wounded_3, maimed, incapable, bubonic_plague, sickly, impotent, celibate, excommunicated, devoted, saoshyant, saoshyant_descendant, savior, divine_blood, blood_of_prophet, saint, historical_character, legend, order_member, disputed_heritage, child_of_concubine_female, child_of_concubine_male, bastard_founder, twin, kinslayer_1..3, sodomite, augustus, reincarnation, disinherited, denounced, decadent, extolled, gallivanter, chakravarti, greatest_of_khans, conqueror, paragon, consecrated_blood, education_martial_prowess_1..4, diplomatic/warlike/administrative/intrigue/scholarly_court_1/2, education_republican_knowledge_1..4, fp3_struggle_detractor, fp3_struggle_supporter, charioteer_blue/green/white/red, despoiler_of_byzantium, campeador, violet_poet, the_wake, nomadic_philosophy, lifestyle_seasoned_pastor, golden_lineage, former_emperor` ([00_traits.txt](https://github.com/skonester/ck3-mod-base/blob/master/base/game/common/traits/00_traits.txt)).

### Trait costs (1.19.0.6, all from `00_traits.txt`)

Personality (36, all selectable; opposites in parentheses):

| Trait | Cost | Trait | Cost | Trait | Cost |
|---|---|---|---|---|---|
| lustful (chaste) | 25 | chaste | 20 | gluttonous (temperate) | 20 |
| temperate | 40 | greedy (generous) | 30 | generous | 20 |
| lazy (diligent) | −10 | diligent | 40 | wrathful (calm) | 30 |
| calm | 25 | patient (impatient) | 30 | impatient | 25 |
| arrogant (humble) | 20 | humble | 20 | deceitful (honest) | 30 |
| honest | 20 | craven (brave) | −10 | brave | 40 |
| shy (gregarious) | −10 | gregarious | 30 | ambitious (content) | 40 |
| content | 20 | arbitrary (just) | 30 | just | 40 |
| cynical (zealous) | 30 | zealous | 30 | paranoid (trusting) | −10 |
| trusting | 10 | compassionate (callous, sadistic) | 10 | callous | 40 |
| sadistic | 40 | stubborn (fickle, eccentric) | 30 | fickle | 25 |
| eccentric | 15 | vengeful (forgiving) | 30 | forgiving | 25 |

Education (25): five tracks (`education_intrigue|diplomacy|stewardship|martial|learning_1..5`), level 1 = 0, 2 = 20, 3 = 40, 4 = 80, 5 = 150; skill bonus +2/+4/+6/+8/+10 in the track skill (level 5 adds +3 in a second skill; martial/learning also add prowess); all `minimum_age = 16`. Childhood (5): `rowdy, charming, curious, pensive, bossy` = 5 each (ages 3–15).

Congenital / no-category (40 selectable):

| Trait | Cost | Trait | Cost | Trait | Cost |
|---|---|---|---|---|---|
| beauty_bad_1/2/3 | −10/−20/−30 | beauty_good_1/2/3 | 40/80/120 | intellect_bad_1/2/3 | −15/−30/−45 |
| intellect_good_1/2/3 | 80/160/240 | physique_bad_1/2/3 | −15/−30/−45 | physique_good_1/2/3 | 60/120/180 |
| pure_blooded | 50 | fecund (infertile) | 50 | strong (weak, physique_bad) | 50 |
| shrewd (intellect_bad, dull) | 50 | clubfooted | 0 | hunchbacked | −10 |
| lisping | −5 | stuttering | −5 | dwarf (giant) | 0 |
| giant | 20 | inbred | −30 | weak | −10 |
| dull | −20 | spindly | −10 | scaly | 0 |
| albino | 0 | wheezing | −10 | bleeder | −20 |
| infertile | 0 | confider | 15 | tourney_participant | 5 |
| immortal (incapable) | 10000 | | | | |

Health (28 selectable): depressed_genetic −20, lunatic_genetic −15, possessed_genetic −20, ill 0 (opp. pneumonic), pneumonic 0, great_pox −10, lovers_pox 0, leper −30, one_eyed 10, one_legged −5, disfigured −10, infirm −20, withering_mind −20, clouded_eyes −20, faltering_heart −20, fragile_bones −20, gout_ridden −5, consumption 0, cancer −10, typhus 0, smallpox 0, measles 0, dysentery 0, ergotism 0, scarred 10, eunuch_1 −10 (male), beardless_eunuch −15 (male), blind −10.

Fame (45 selectable): drunkard −10, hashishiyah 5, rakish 0, reclusive −5, irritable 0, flagellant −10, profligate 10 (opp. improvident), improvident −5, contrite −5, comfort_eater −5 (opp. inappetetic), inappetetic −5, journaller 15, athletic 40, pilgrim 30, hajjaj 30, sayyid 25, faith_warrior 50, berserker 40, shieldmaiden 40, varangian 40, bastard 0, legitimized_bastard 0, wild_oat 0 (these three mutually exclusive), deviant −5, cannibal 40, incestuous 0, adulterer −5, fornicator −5, murderer −10, born_in_the_purple 40, viking 25, adventurer 50 (opp. adventurer_follower), adventurer_follower 10, heresiarch 50, peasant_leader 100, populist_leader 150, witch 10, loyal 20 (opp. disloyal), disloyal −20, gallowsbait 0, crusader_king 120, governor 40, knight_errant 75, confucian_education 15 (age ≥ 16), burdened −10.

Lifestyle (27 selectable): diplomat 50, family_first 50, august 50, lifestyle_reveler 20, lifestyle_blademaster 20, lifestyle_hunter 20, strategist 50, overseer 50, gallant 50, architect 50, administrator 50, avaricious 50, schemer 50, seducer 50, torturer 50, whole_of_body 75, scholar 50, theologian 50, lifestyle_mystic 20, lifestyle_physician 20, lifestyle_herbalist 50, lifestyle_gardener 50, lifestyle_poet 40, lifestyle_traveler 20, lifestyle_wayfarer 50, lifestyle_voyager 50, lifestyle_surveyor 50. Commander (16) and winter_commander (1): all 25 (`logistician, military_engineer, aggressive_attacker, unyielding_defender, forder, flexible_leader, desert_warrior, jungle_stalker, reaver, reckless (opp. cautious_leader), holy_warrior, open_terrain_expert, rough_terrain_expert, forest_fighter, cautious_leader, organizer, winter_soldier`). Court_type: 10 traits, all hidden ([00_traits.txt](https://github.com/skonester/ck3-mod-base/blob/master/base/game/common/traits/00_traits.txt)). Wiki cross-check on personality and education values matched the file exactly ([Traits](https://ck3.paradoxwikis.com/Traits)).

**Unverified (1.20):** `scholar` was renamed `erudite` ("same stats"); new `cleric`, `herald`, `lifestyle_scholar` traits with unknown costs; `INTENDED_MAX_PERSONALITY_TRAITS` define added; no `NRulerDesigner` define changed ([1.20.0.2.md](https://github.com/skonester/ck3-mod-base/blob/master/1.20.0.2.md)). Parse the installed `00_traits.txt` at runtime.

### Design modes

`on_ruler_designer_finished` documents `scope:ruler_designer` ∈ `flag:landed_title` ("Default landed ruler that overrides previous title holder. They already have all titles transferred to them"), `flag:landless_adventurer`, `flag:landless_noble_family` ("inside administrative or other realm that allows landless vassals"); the noble-family path adds `add_gold = 100`; none costs points ([ruler_designer.txt](https://github.com/skonester/ck3-mod-base/blob/master/base/game/common/on_action/ruler_designer.txt)). The designer shipped free in patch 1.2; 1.13.0 added adventurers; 1.13.2 added random appearance by culture and partial load; 1.19 overhauled the portrait UI ([Patch 1.2](https://ck3.paradoxwikis.com/Patch_1.2); [1.13.0 notes](https://github.com/skonester/ck3-mod-base/blob/master/base/release-notes/1_13_0_0_2024-09-24.md); [1.19.0 notes](https://github.com/skonester/ck3-mod-base/blob/master/base/release-notes/1_19_0_0_2026-04-20.md)). A designed character always founds a new dynasty ([PCGamesN](https://www.pcgamesn.com/crusader-kings-3/ruler-designer-ck3-patch-12)). For the app: model "default 400" as "points used ≤ 400 → achievements-legal", and let the user exceed it with a warning, matching the game.

## Appearance and DNA

**Conclusion for the developer:** DNA is optional — omit `dna =` and the engine rolls a culture-appropriate face and gives children family resemblance; when the user supplies a look, take the Ruler Designer's "Copy DNA" text, keep only the `genes = { ... }` block, drop the `clothes` line, wrap it in a `common/dna_data` entry, and reference it with `dna = <key>`. Do not attempt to render portraits outside the game.

### `common/dna_data` schema

Paradox's doc ([_dna_data.info](https://github.com/skonester/ck3-mod-base/blob/master/base/game/common/dna_data/_dna_data.info)):

```
key = {
	dna = "" # DNA String
	portrait_info = { # Portrait-based way of specifying the DNA, same format as bookmark characters
		genes = {
			hair_color={ 14 244 25 255 }
			...
			gene_cheek_puffy={ cheek_puffy_neg 109 cheek_puffy_neg 92 }
			...
		}
	}
}
```

A real vanilla entry: `163112_halfdan_whiteshirt = { portrait_info = { genes={ hair_color={ 137 167 111 140 } skin_color={ 46 75 44 75 } eye_color={ 195 192 123 200 } gene_chin_forward={ "chin_forward_neg" 98 "chin_forward_pos" 134 } ...`; vanilla files are `00_dna.txt, 00_ep3_dna.txt, 00_fp3_dna.txt, 00_mpo_dna.txt, 00_tgp_dna.txt, 01_easteregg_dna.txt, 02_easteregg_dna_non_developers.txt, 03_fp2_dna.txt` ([_dna_data.info](https://github.com/skonester/ck3-mod-base/blob/master/base/game/common/dna_data/_dna_data.info)). The character references it with `dna = "204510_richard_poitiers"` or `dna = lyon_twin_dna_entry` ([english.txt](https://github.com/skonester/ck3-mod-base/blob/master/base/game/history/characters/english.txt); [Character modding](https://ck3.paradoxwikis.com/Character_modding)). The Guardians of Azeroth 2 team's template and workflow: open the Ruler Designer, "Copy DNA", paste into a text editor, copy "the entire `genes` block, from opening to closing brace", paste into

```
<Character_name_here>_dna = {
	portrait_info = {
		<genes block here>
	}
	enabled=yes
}
```

and "Delete the `clothes` line to prevent characters appearing in bedchamber attire" ([GoA2 wiki](https://github-wiki-see.page/m/Warcraft-GoA-Development-Team/Warcraft-Guardians-of-Azeroth-2/wiki/How-To-Assign-DNAs-%28Portraits%29-To-Characters)). 438 vanilla characters carry `dna`; the other ~70,000 are generated.

### The "Copy DNA" text form

A real clipboard output posted by a player ([Share your DNA](https://forum.paradoxplaza.com/forum/threads/share-your-dna.1444216/)):

```
ruler_designer_1140624539={
type=girl
id=0
genes={ hair_color={ 42 222 176 166 }
skin_color={ 173 102 108 89 }
eye_color={ 11 5 39 147 }
gene_chin_forward={ "chin_forward_pos" 140 "chin_forward_pos" 127 }
gene_chin_height={ "chin_height_pos" 177 "chin_height_pos" 127 }
gene_chin_width={ "chin_width_pos" 137 "chin_width_pos" 127 }
[... additional facial feature genes continue ...]
gene_height={ "normal_height" 177 "normal_height" 127 }
hairstyles={ "western_hairstyles" 50 "all_hairstyles" 0 }
beards={ "all_beards" 0 "all_beards" 0 }
clothes={ "western_bedchamber" 68 "most_clothes" 0 }
}
entity={ 0 0 }
}
```

Grammar per gene: `<gene>={ "<expressed template>" <value> "<unexpressed template>" <value> }` with values 0–255; the three color genes are four bare integers (two x/y pairs into a palette texture, not RGBA). The converter regex is `/\s*(\w+)=\{ (("\w+"|\d+)) (\d+) (("\w+"|\d+)) (\d+) \}$/` with groups `gene, exp_type, exp_val, unexp_type, unexp_val` ([Kyusoo/CK3_Utility](https://github.com/Kyusoo/CK3_Utility)). The first pair is the dominant allele, the second recessive (dev diary: two gene sets, "dominant genes from the parents have a higher chance of being inherited as dominant genes") ([Dev Diary #34](https://forum.paradoxplaza.com/forum/threads/ck3-dev-diary-34-its-all-about-appearances.1406933/)). The designer writes the slider value to the dominant allele and 127 to the recessive; a "DNA Duplicator" tool copies the expressed value into both slots "ensuring children inherit the parent's actual appearance" ([CK3-DNA-Duplicator](https://github.com/Deticaru/CK3-DNA-Duplicator)). For generated DNA, emit both alleles identical. Editor percentages map to 0.0–1.0 in ethnicity files ("37% in Editor = 0.37") ([Ethnicity Modding](https://forum.paradoxplaza.com/forum/threads/ethnicity-modding.1451760/)).

Vanilla gene order (104 entries, community-derived from Kyusoo's converter, targets ≤1.18.4): `hair_color, skin_color, eye_color, gene_chin_forward, gene_chin_height, gene_chin_width, gene_eye_angle, gene_eye_depth, gene_eye_height, gene_eye_distance, gene_eye_shut, gene_forehead_angle, gene_forehead_brow_height, gene_forehead_roundness, gene_forehead_width, gene_forehead_height, gene_head_height, gene_head_width, gene_head_profile, gene_head_top_height, gene_head_top_width, gene_jaw_angle, gene_jaw_forward, gene_jaw_height, gene_jaw_width, gene_mouth_corner_depth, gene_mouth_corner_height, gene_mouth_forward, gene_mouth_height, gene_mouth_width, gene_mouth_upper_lip_size, gene_mouth_lower_lip_size, gene_mouth_open, gene_neck_length, gene_neck_width, gene_bs_cheek_forward, gene_bs_cheek_height, gene_bs_cheek_width, gene_bs_ear_angle, gene_bs_ear_inner_shape, gene_bs_ear_bend, gene_bs_ear_outward, gene_bs_ear_size, gene_bs_eye_corner_depth, gene_bs_eye_fold_shape, gene_bs_eye_size, gene_bs_eye_upper_lid_size, gene_bs_forehead_brow_curve, gene_bs_forehead_brow_forward, gene_bs_forehead_brow_inner_height, gene_bs_forehead_brow_outer_height, gene_bs_forehead_brow_width, gene_bs_jaw_def, gene_bs_mouth_lower_lip_def, gene_bs_mouth_lower_lip_full, gene_bs_mouth_lower_lip_pad, gene_bs_mouth_lower_lip_width, gene_bs_mouth_philtrum_def, gene_bs_mouth_philtrum_shape, gene_bs_mouth_philtrum_width, gene_bs_mouth_upper_lip_def, gene_bs_mouth_upper_lip_full, gene_bs_mouth_upper_lip_profile, gene_bs_mouth_upper_lip_width, gene_bs_nose_forward, gene_bs_nose_height, gene_bs_nose_length, gene_bs_nose_nostril_height, gene_bs_nose_nostril_width, gene_bs_nose_profile, gene_bs_nose_ridge_angle, gene_bs_nose_ridge_width, gene_bs_nose_size, gene_bs_nose_tip_angle, gene_bs_nose_tip_forward, gene_bs_nose_tip_width, face_detail_cheek_def, face_detail_cheek_fat, face_detail_chin_cleft, face_detail_chin_def, face_detail_eye_lower_lid_def, face_detail_eye_socket, face_detail_nasolabial, face_detail_nose_ridge_def, face_detail_nose_tip_def, face_detail_temple_def, expression_brow_wrinkles, expression_eye_wrinkles, expression_forehead_wrinkles, expression_other, complexion, gene_height, gene_bs_body_type, gene_bs_body_shape, gene_bs_bust, gene_age, gene_eyebrows_shape, gene_eyebrows_fullness, gene_body_hair, gene_hair_type, gene_baldness, eye_accessory, teeth_accessory, eyelashes_accessory`, followed in text form by `beards`, `hairstyles`, `clothes` ([Kyusoo/CK3_Utility](https://github.com/Kyusoo/CK3_Utility)). Most morph genes have exactly two templates `<name>_neg` (index 0) and `<name>_pos` (index 1); exceptions include `gene_bs_nose_profile:{nose_profile_neg, nose_profile_pos, nose_profile_hawk, nose_profile_hawk_pos}`, `gene_bs_ear_bend:{ear_lower_bend_pos, ear_upper_bend_pos, ear_both_bend_pos}`, `complexion:{complexion_1..7, complexion_beauty_1, complexion_ugly_1, complexion_no_face}`, `gene_height:{full_height, normal_height, dwarf_height, giant_height}`, `gene_bs_body_type:{body_average, body_fat_head_fat_low/medium/full, no_portrait}`, `gene_age:{old_1..4, old_beauty_1, no_aging}`, `gene_hair_type:{hair_straight, hair_wavy, hair_curly, hair_afro, hair_straight_thin_beard}`, `gene_baldness:{no_baldness, male_pattern_baldness}`, `eye_accessory:{normal_eyes, normal_eyes_no_shadow, normal_eyes_dark_iris, normal_eyes_asian, bloodshot_eyes, blind_eyes, no_eyes}`, `teeth_accessory:{normal_teeth, no_teeth}`, `eyelashes_accessory:{no_eyelashes, normal_eyelashes, asian_eyelashes}`; hairstyle/beard sets are region- and hair-type-named (`western_hairstyles_straight`, `mena_beards_curly`, `sub_saharan_hairstyles_afro`, `steppe_*`, `indian_*`, `byzantine_*`, `northern_*`, DLC sets `fp1_*`, `rtt_*`, `scripted_character_hairstyles_01/02`) ([Kyusoo/CK3_Utility](https://github.com/Kyusoo/CK3_Utility)). **Unverified:** the exact vanilla 1.19/1.20 gene list (genes added after 1.18.4), and the vanilla `common/genes/00_genes.txt` field syntax, neither of which could be fetched.

### Save-file form

Saves store `dna="Hfwd/JlmmWZNoU2hAYwBjAB9AH0BgAGAAHUAdQF/AX8BgAGAAHIAcgGLAYsAcgBy…"`, a base64 byte array of 4 bytes per gene (template index, value, template index, value) in the fixed order above (104 genes → 416 bytes); decoding: `atob` → slice 4 bytes per gene ([Kyusoo/CK3_Utility](https://github.com/Kyusoo/CK3_Utility); [Steam guide: Extracting Character DNA](https://steamcommunity.com/sharedfiles/filedetails/?id=3536915634)). Older strings were ~200 bytes; a 1.14-era change lengthened them to ~400 ([dna-updater](https://github.com/raccoonwannafly/crusader-kings-3-dna-updater)); 1.3 replaced inherited haircuts with a hair-type gene ([Patch 1.3](https://ck3.paradoxwikis.com/Patch_1.3)); 1.12.1 added baldness ([PC Gamer](https://www.pcgamer.com/games/strategy/crusader-kings-3-finally-gets-its-most-hotly-demanded-feature-in-years-an-authentic-male-pattern-baldness-system/)). A mod never needs the base64 form; it matters only for importing from saves. A 1.8-era bug altered `gene_bs_body_shape` on re-paste ([bug report](https://forum.paradoxplaza.com/forum/threads/ck-iii-gene_bs_body_shape-value-is-altered-if-you-paste-a-edited-dna-template-in-ruler-designer.1564995/)).

### Hair, beards, clothes and traits

Hair/beard/clothes are accessory genes chosen at render time by `gfx/portraits/portrait_modifiers` scripts (weighted by culture, faith, government, age, DLC). To lock a scripted character's hair, add to `gfx/portraits/portrait_modifiers/99_hairstyles_scripted_characters.txt` / `99_beards_scripted_characters.txt` ([Character modding](https://ck3.paradoxwikis.com/Character_modding)):

```
modifier = {
	add = 200
	exists = character:<history_id>
	this = character:<history_id>
}
```

Portrait-modifier files use `usage = game`, `priority = 50`, `dna_modifiers = { accessory = { mode = add gene = headgear template = western_imperial value = 1.0 } color = { mode = modify gene = hair_color x = 0.5 y = -0.5 } }` and `weight = { base = 0 modifier = { add = 100 ... } }`; GoA2 adds "For DLC1 haircuts, include `has_fp1_dlc_trigger = yes`, increase weight to 300, and provide a non-DLC option with weight 200" ([GoA2 wiki](https://github-wiki-see.page/m/Warcraft-GoA-Development-Team/Warcraft-Guardians-of-Azeroth-2/wiki/How-To-Assign-DNAs-%28Portraits%29-To-Characters)). Inheritable DNA "doesn't contain hair, beard, clothes, etc." ([Copy DNA mod](https://steamcommunity.com/sharedfiles/filedetails/?id=2606853919)). Traits change portraits through `gfx/portraits/trait_portrait_modifiers`, e.g. the vanilla albino modifier ([Paradox forum](https://forum.paradoxplaza.com/forum/threads/changing-characters-appearance-with-custom-trait.1620460/)):

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

So give `trait = giant`/`dwarf`/`beauty_good_3` in history and keep DNA at `normal_height`; the trait modifier handles it. **Unverified:** how the engine reconciles a DNA `hairstyles` value with competing modifier weights, and what happens when DNA names a missing (DLC) template — the observed symptom in similar cases is a bald/blank slot, not a crash ([Paradox forum, bald characters](https://forum.paradoxplaza.com/forum/threads/ck-iii-hairstyles-are-gone-from-the-game.1484943/)).

### Ethnicities and generation without DNA

Cultures weight ethnicities: `ethnicities = { 10 = ethnicity_1  5 = ethnicity_2 }` ("The weight says how common the ethnicity is within the culture") ([Culture modding](https://ck3.paradoxwikis.com/Culture_modding)); templates live in `game/common/ethnicities/00_ethnicities_templates.txt` with per-gene entries such as `nose_forward_neg range = { 0.25 0.47 }`; "There currently is no way to export a character's DNA into a readymade Ethnicity Template" ([Ethnicity Modding](https://forum.paradoxplaza.com/forum/threads/ethnicity-modding.1451760/)). Babies "inherit two versions of each gene - both of which will come randomly from either parent" ([Dev Diary #34](https://forum.paradoxplaza.com/forum/threads/ck3-dev-diary-34-its-all-about-appearances.1406933/)). **Unverified:** real vanilla ethnicity names and per-gene syntax (read them from the installed game); the exact order in which the engine generates parents' then children's DNA at load.

### No offline renderer

CK3 portraits are 3D `.mesh` models under `game/gfx/models/` with per-gene morph blending, palette-texture colours, decals interpreted by `portrait_decals.fxh` shaders and aging ([3D models](https://ck3.paradoxwikis.com/3D_models); [ck3-modutil-portrait-statues](https://github.com/terrapass/ck3-modutil-portrait-statues/blob/master/mod/common/genes/GH_genes_special_markers.txt)). Every community DNA tool is a converter/gallery/photo-to-DNA experiment, not a renderer; `portraitbuilder` is CK2-only ([scorpdx/portraitbuilder](https://github.com/scorpdx/portraitbuilder)). Feasible previews: user-supplied screenshots, a schematic slider preview, or the in-game console `portrait_editor` in debug mode ([Steam guide: DNA edit](https://steamcommunity.com/sharedfiles/filedetails/?id=2234449846)).

## Start dates and bookmarks

**Conclusion for the developer:** a "collection tied to a start year" maps to one bookmark date; validate by replaying every dated block with date ≤ that exact date (use the group's `default_start_date` — 867.1.1, 1066.9.15, 1178.10.1 — not the bare year), and optionally ship a custom bookmark so the collection appears on the start screen.

### Vanilla groups and bookmarks

Entire `common/bookmarks/groups/00_bookmark_groups.txt` ([00_bookmark_groups.txt](https://github.com/skonester/ck3-mod-base/blob/master/base/game/common/bookmarks/groups/00_bookmark_groups.txt)):

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

Vanilla 1.19 bookmarks in `common/bookmarks/bookmarks/00_bookmarks.txt` ([00_bookmarks.txt](https://github.com/skonester/ck3-mod-base/blob/master/base/game/common/bookmarks/bookmarks/00_bookmarks.txt); wiki names from [Bookmarks](https://ck3.paradoxwikis.com/Bookmarks)):

| Date | Key | DLC gating | Wiki name |
|---|---|---|---|
| 867.1.1 | bm_867_persia | none | The Iranian Intermezzo |
| 867.1.1 | bm_867_iberia | weight +20 if `has_dlc = "The Fate of Iberia"` | The Struggle for Iberia |
| 867.1.1 | bm_867_northmen | weight bonus if `has_dlc = "The Northern Lords"` | Wrath of The Northmen |
| 867.1.1 | bm_867_adventurers | none (recommended) | Humble Beginnings |
| 867.1.1 | bm_867_carolingians | none | The Carolingians |
| 867.1.1 | bm_867_mandalas | `requires_dlc_flag = all_under_heaven` | Living Gods on Earth |
| 867.1.1 | bm_867_china | `requires_dlc_flag = all_under_heaven` | Autumn of Virtue |
| 1066.9.15 | bm_1066_hastings | none, `weight = { value = 100 }` | The Fate of England |
| 1066.9.15 | bm_1066_rags_to_riches | none | Rags to Riches |
| 1066.9.15 | bm_1066_iberia | Fate of Iberia weight | Iberia in Pieces |
| 1066.9.15 | bm_1066_laamps | `requires_dlc_flag = landless_adventurer`, weight 100 | The Wandering Exiles |
| 1066.9.15 | bm_1066_nomads | `requires_dlc_flag = khans_of_the_steppe` | At the Gates |
| 1066.9.15 | bm_1066_china | all_under_heaven (recommended) | Song of Splendor |
| 1066.9.15 | bm_1066_japan | all_under_heaven | A Never-Waning Moon |
| 1178.10.1 | bm_1178_call_of_the_empire | none | Call of the Empire |
| 1178.10.1 | bm_1178_swords_of_faith | none | Sword of Faith |
| 1178.10.1 | bm_1178_nomads | khans_of_the_steppe | The Endless Sky |
| 1178.10.1 | bm_1178_china | all_under_heaven | Heaven in Turmoil |
| 1178.10.1 | bm_1178_genpei | all_under_heaven (recommended) | Rise of the Bushi |

The 1178 date is available without any DLC flag (it arrived with the free 1.13 update; 1.13 "Basileus" 2024-09-24 paired with Roads to Power) ([Patches](https://ck3.paradoxwikis.com/Patches)). Fate of Iberia adds no start date. The default bookmark is the max `weight`. The *By God Alone* wiki article "does not mention any new start dates or bookmarks" ([By God Alone](https://ck3.paradoxwikis.com/By_God_Alone)).

### Bookmark schema

Verbatim from `_bookmarks.info` ([_bookmarks.info](https://github.com/skonester/ck3-mod-base/blob/master/base/game/common/bookmarks/bookmarks/_bookmarks.info)):

```
bookmark_01 = {
	### Brief: start_data (date)
	start_date = 867.1.1
	### Brief: is_playable (yes/no) — defaults to: yes
	is_playable = yes
	### Brief: weight (scriptable value) — Bookmark with the highest value will be the default; default value: -1
	weight = {
		value = 0
		if = {
			limit = { has_dlc = "The Fate of Iberia" }
			add = 20
		}
	}
	### Brief: recommended (yes/no) — defaults to: no
	recommended = yes
	### Brief: group (bookmark_group key) — left empty bookmark will be ungrouped
	group = bm_group_867
	### Brief: requires_dlc_flag (dlc feature flag)
	# Sets a DLC flag the must be active for this bookmark to show.
	# Not adding this will make the bookmark show regardless of active DLCs.
	requires_dlc_flag = legends_of_the_dead
	character = {
		### Brief: name (key) — Localization key for this bookmark
		name = bookmark_test_1066_person_name
		### Brief: history_id (key) — Which historical character ID this bookmark corresponds to
		history_id = test_12345
		### Brief: bookmark_type (existing_ruler, new_landless_adventurer, new_noble_family)
		# For 'new_landless_adventurer' and 'new_noble_family', the starting location 'title' needs to configured
		# defaults to: existing_ruler
		bookmark_type = existing_ruler
	}
}
```

(Comments condensed.) A full vanilla character block ([00_bookmarks.txt](https://github.com/skonester/ck3-mod-base/blob/master/base/game/common/bookmarks/bookmarks/00_bookmarks.txt)):

```
bm_867_persia = {
	start_date = 867.1.1
	is_playable = yes
	group = bm_group_867
	weight = {
		value = 0
	}
	# Ya'qub ibn al-Layth (Saffarid founder) ID: 163101
	character = {
		name = "bookmark_persia_amir_yaqub"
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
		# Amr ibn al-Layth, brother and heir, ID: 163164
		character = {
			name = "bookmark_persia_yaqub_alt_amr"
			relation = "BOOKMARK_RELATION_BROTHER"
			dynasty = 1059
			type = male
			birth = 845.1.1
			culture = persian
			religion = ashari
			history_id = 163164
			animation = personality_bold
		}
```

Note `religion = ashari` here — a key the 1.20 report says no longer exists as a faith, so vanilla bookmark files presumably changed too (**Unverified**). Custom start dates: "start_date = 3000.5.12 for the 12th of May, year 3000. Next add a is_playable = yes"; "A bookmark will not load if it has any character/title history errors"; portraits are dumped with the console command `dump_bookmark_portraits` into `Documents\Paradox Interactive\Crusader Kings III\common\bookmark_portraits` ([Bookmarks modding](https://ck3.paradoxwikis.com/Bookmarks_modding)). History application: "If starting at a newly created bookmark in 950, every mentioned innovation as well as the past ones from 867 will have been discovered at game start" ([History modding](https://ck3.paradoxwikis.com/History_modding)). Layout: `common/bookmarks/bookmarks/`, `common/bookmarks/groups/`, `common/bookmarks/challenge_characters/`.

### Start-date validator (inference from the rules above)

Per (title, date D): title key exists in landed_titles; resolved holder ≠ 0 for duchy+; holder defined with birth ≤ D < death; holder's culture exists and faith/religion/rite key is valid for the installed version; resolved `liege` has a living holder and higher tier; `government` exists and the county capital's `holding` (from `history/provinces`) fits it (warn only); DLC-gated title types (laamp, admin, nomad, noble family) carry the matching flag. Per character: birth ≤ D for anyone meant to be present; dated `employer`/`add_spouse`/`dynasty_house`/`give_nickname` blocks must be ≤ D to be in effect at start. Cultures are static in `common/culture/cultures` (only innovations are dated), so "culture exists at date" reduces to key existence. **Unverified:** the engine's exact hard-vs-soft validation list at bookmark load; only "history errors prevent loading" is documented.

## DLC gating

**Conclusion for the developer:** traits, DNA, ethnicities, dynasties, houses and nicknames are never DLC-gated in script, so a collection can use any of them; what the app must gate is *systems* — landless adventurer/administrative governments (Roads to Power), nomads (Khans of the Steppe), China/Japan bookmarks (All Under Heaven), DLC clothing templates, and DLC cultural/religious options — by mapping installed `game/dlc/*/*.dlc` descriptors to feature-flag keys.

### DLC list

| Folder | `.dlc` name | Steam appid | Type | Kind | Released | Patch |
|---|---|---|---|---|---|---|
| dlc001_preorder | Garments of the Holy Roman Empire | 1296730 | minor | cosmetic | 2020-09-01 | 1.0 |
| dlc002_sp_day1 | Fashion of the Abbasid Court | 1296731 | minor | cosmetic | 2020-09-01 | 1.0 |
| dlc003_fp1 | The Northern Lords | 1303183 | minor | flavor pack | 2021-03-16 | 1.3 Corvus |
| dlc004_ep1 | The Royal Court | 1303182 | major | expansion | 2022-02-08 | 1.5 Fleur-de-Lis |
| dlc005_fp2 | The Fate of Iberia | 1303184 | minor | flavor pack | 2022-05-31 | 1.6 Castle |
| dlc006_bp1 | Friends and Foes | 2114760 | minor | event pack | 2022-09-08 | 1.7 Bastion |
| dlc007_ep2 | Tours and Tournaments | 2311920 | major | expansion | 2023-05-11 | 1.9 Lance |
| dlc008_sp2 | Elegance of the Empire | 2311930 | minor | cosmetic | 2023-04-04 | — |
| dlc009_bp2 | Wards and Wardens | 2313541 | minor | event pack | 2023-08-22 | 1.10 Quill |
| dlc010_fp3 | Legacy of Persia | 2313540 | minor | flavor pack | 2023-11-09 | 1.11 Peacock |
| dlc011_ce1 | Legends of the Dead | 2671060 | medium | core expansion | 2024-03-04 | 1.12 Scythe |
| dlc012_afr | North African Attire | 2671030 | minor | cosmetic | 2024-01-23 | — |
| dlc013_sp3 | Couture of the Capets | 2671040 | minor | cosmetic | 2024-02-06 | — |
| dlc014_ep3 | Roads to Power | 2671070 | major | expansion | 2024-09-24 | 1.13 Basileus |
| dlc015_bp3 | Wandering Nobles | 2671080 | minor | event pack | 2024-11-04 | 1.14 Traverse |
| dlc016_cp2 | West Slavic Attire | 3275760 | minor | cosmetic | 2024-11-27 | — |
| dlc017_cp3 | Medieval Monuments | 3315540 | minor | cosmetic (map) | 2025-02-25 | — |
| dlc018_cp4 | Arctic Attire | 3315550 | minor | cosmetic | 2025-02-25 | — |
| dlc019_sp4 | Crowns of the World | 3315500 | minor | cosmetic | 2025-03-12 | 1.15 Crown |
| dlc020_ce2 | Khans of the Steppe | 3315510 | medium | core expansion | 2025-04-28 | 1.16 Chamfron |
| dlc021_bp4 | Coronations | 3315520 | minor | event pack | 2025-09-09 | 1.17 Ascendant |
| dlc022_ep4 | All Under Heaven | 3315530 | major | expansion | 2025-10-28 | 1.18 Crane |
| dlc023_cp5 | High Medieval Warfare Attire | 3315560 | minor | cosmetic | 2026-01-27 | — |
| dlc024_cp6 | Holy Buildings | 3315570 | minor | cosmetic (map) | 2026-01-27 | — |
| dlc025_cp7 | North Pacific Attire | 3315580 | minor | cosmetic | 2026-03-11 | — |
| dlc026_cp8 | East Asian Wonders | 4232860 | minor | cosmetic (map) | 2026-03-11 | — |
| dlc027_cp9 | Celestial Court Attire | 4232870 | minor | cosmetic | 2026-03-11 | — |
| dlc028_sp5 | Symbols of Authority | 4232890 | minor | cosmetic | 2026-04-20 | 1.19 Scribe |
| dlc029_mp1 | Songs of the Realm | 3315590 | minor | music pack | 2026-04-20 | 1.19 Scribe |
| (expected dlc030) | By God Alone | 4232900 | core expansion | expansion | 2026-09-30 | 1.20 Crozier |
| (unreleased) | Silk & Silver | 4232910 | — | expansion (trade) | — | — |

Sources: `.dlc` files and `dlc_metadata/00_dlc_metadata.txt` ([ck3-mod-base dlc/](https://github.com/skonester/ck3-mod-base/tree/master/base/game/dlc)); dates ([SteamDB](https://steamdb.info/app/1158310/dlc/)); patch pairing ([Patches](https://ck3.paradoxwikis.com/Patches); [Patch 1.17](https://ck3.paradoxwikis.com/Patch_1.17)); By God Alone ([Steam](https://store.steampowered.com/app/4232900/Crusader_Kings_III_By_God_Alone/)). Paradox's `type` classification: "Major = EP, Medium = CE, Minor = FP, BP, CCP" ([_dlc_metadata.info](https://github.com/skonester/ck3-mod-base/tree/master/base/game/dlc_metadata)). Chapters: I = Royal Court + Northern Lords + Fate of Iberia + Fashion of the Abbasid Court; II = Tours & Tournaments + Wards & Wardens + Legacy of Persia + Elegance of the Empire; III = Legends of the Dead + Roads to Power + Wandering Nobles + Couture of the Capets; IV = Khans + All Under Heaven + Coronations + Crowns of the World; V = By God Alone + Silk & Silver + Songs of the Realm + Symbols of Authority ([Downloadable content](https://ck3.paradoxwikis.com/Downloadable_content)). **Unverified:** SteamDB's 2023-11-21 date for Garments of the HRE (vs wiki 2020-09-01); the exact `dlc030_*` folder name.

A `.dlc` descriptor (all 29 share these 8 keys; some start with a BOM) ([dlc014.dlc](https://github.com/skonester/ck3-mod-base/tree/master/base/game/dlc)):

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

### Feature-flag keys

Script checks ownership via `has_dlc_feature = <key>` (trigger), `requires_dlc_flag = <key>` (database field), `HasDlcFeature('<key>')` (GUI) and legacy `has_dlc = "<display name>"`; no `is_dlc_enabled` exists. The vanilla wrapper file `common/scripted_triggers/00_has_dlc_scripted_triggers.txt` maps ([00_has_dlc_scripted_triggers.txt](https://github.com/skonester/ck3-mod-base/blob/master/base/game/common/scripted_triggers/00_has_dlc_scripted_triggers.txt)):

| Wrapper | Feature key | DLC |
|---|---|---|
| has_fp1_dlc_trigger | the_northern_lords | Northern Lords |
| has_ep1_dlc_trigger, has_ep1_court_positions | royal_court | Royal Court |
| has_fp2_dlc_trigger | the_fate_of_iberia | Fate of Iberia |
| has_bp1_dlc_trigger | friends_and_foes | Friends & Foes |
| has_ep2_dlc_trigger | tours_and_tournaments | Tours & Tournaments |
| has_bp2_dlc_trigger | wards_and_wardens | Wards & Wardens |
| has_fp3_dlc_trigger | legacy_of_persia | Legacy of Persia |
| has_ce1_dlc_trigger | legends_of_the_dead | Legends of the Dead |
| has_afr_dlc_trigger | north_african_attire | North African Attire |
| has_ep3_dlc_trigger, has_playable_adventurer_dlc_trigger | roads_to_power | Roads to Power |
| has_bp3_dlc_trigger | wandering_nobles | Wandering Nobles |
| has_pol_dlc_trigger | west_slavic_attire | West Slavic Attire |
| has_cp3/cp4/cp5/cp6/cp7/cp8/cp9_dlc_trigger | medieval_monuments / arctic_attire / high_medieval_warfare_attire / holy_buildings / north_pacific_attire / east_asian_wonders / celestial_court_attire | creator packs |
| has_sp4_dlc_trigger, has_sp5_dlc_triggers | crowns_of_the_world, symbols_of_authority | cosmetic packs |
| has_mpo_dlc_trigger | khans_of_the_steppe | Khans of the Steppe |
| has_ach_dlc_trigger | coronations | Coronations |
| has_tgp_dlc_trigger | all_under_heaven | All Under Heaven |
| has_mp1_dlc_trigger | songs_of_the_realm | Songs of the Realm |
| has_pam_dlc_trigger (1.20, unverified) | by_god_alone | By God Alone |

One DLC exposes several keys (inferred from co-location in ep1/ep2/ce1/ep3 files): Royal Court → `royal_court, diverge_culture, hybridize_culture, reform_culture, court_artifacts, court_room_view`; Tours & Tournaments → `tours_and_tournaments, accolades, advanced_activities`; Legends of the Dead → `legends, legends_of_the_dead`; Roads to Power → `roads_to_power, landless_playable, landless_adventurer, admin_gov`. Usage counts in 1.19.0.6: `has_dlc_feature` royal_court 298, tours_and_tournaments 138, legends 114, roads_to_power 38, landless_playable 6, admin_gov 5; `requires_dlc_flag` all_under_heaven 292, the_fate_of_iberia 63, legacy_of_persia 55, the_northern_lords 53, khans_of_the_steppe 38, roads_to_power 18, landless_adventurer 1, admin_gov 1 ([ck3-mod-base](https://github.com/skonester/ck3-mod-base)). Comments in the wrappers read "Does the host have the appropriate DLC?", and in multiplayer the host's gameplay DLC applies to all ([Downloadable content](https://ck3.paradoxwikis.com/Downloadable_content)).

### What is and is not gated (1.19.0.6 files)

- Not gated: `common/traits` (no `dlc` string at all), `common/ethnicities`, `common/genes`, `common/dynasty_houses`, `common/nicknames` ([_traits.info](https://github.com/skonester/ck3-mod-base/blob/master/base/game/common/traits/_traits.info); [ck3-mod-base](https://github.com/skonester/ck3-mod-base)).
- Governments: `administrative = no # Requires the dlc_flag admin_gov`, `landless_playable = no # Requires the dlc_flag landless_playable`; government files also use `has_tgp_dlc_trigger` (6×) and `has_mpo_dlc_trigger` (1×) ([_governments.info](https://github.com/skonester/ck3-mod-base/blob/master/base/game/common/governments/_governments.info)).
- Bookmarks: `requires_dlc_flag` (table above); the bookmark GUI shows a no-DLC frame for administrative characters via `Not(HasDlcFeature( 'admin_gov' ))`.
- Cultures: `dlc_fallback_pillar = { fallback = martial_custom_female_only requires_dlc_flag = the_northern_lords }` and `dlc_tradition = { trait = tradition_philosopher_culture requires_dlc_flag = the_northern_lords fallback = ... }`; traditions use `is_shown = { has_fp1_dlc_trigger = yes }`; `requires_dlc_flag` counts in `common/culture`: all_under_heaven 61, khans_of_the_steppe 32, hybridize_culture 25, the_fate_of_iberia 21, legacy_of_persia 15 ([_cultures.info](https://github.com/skonester/ck3-mod-base/blob/master/base/game/common/culture/cultures/_cultures.info)).
- Faiths: `doctrine_selection_pair = { requires_dlc_flag = <flag> doctrine = name fallback_doctrine = name }`; 1.20 moves this to `tenet_selection_pair = { requires_dlc_flag = by_god_alone tenet = tenet_dulia fallback_tenet = tenet_armed_pilgrimages }` (unverified) ([_religion_types.info](https://github.com/skonester/ck3-mod-base/tree/master/base/game/common/religion/religion_types); [1.20.0.2.md](https://github.com/skonester/ck3-mod-base/blob/master/1.20.0.2.md)).
- Dynasty legacies: `is_shown = { has_dlc_feature = … }` per track (fp1 pillage, fp2 urbanism/coterie, fp3, ce1 legitimacy, ep2 activities, ep3, mpo, tgp japan/china).
- Appearance: clothing/headgear/beard/hair templates are gated per template in `gfx/portraits/portrait_modifiers` with `is_valid_custom = { has_ep2_dlc_trigger = yes }`; counts: has_ep2 178+, has_tgp 166, has_ep3 99, has_cp5 64, has_mpo 56, has_cp9 44, has_cp7 41, has_ce1 31, has_fp3 28, has_cp4 25, has_fp2 24, has_ep1 22, has_sp4 19, has_fp1 19 ([00_custom_clothes.txt](https://github.com/skonester/ck3-mod-base/tree/master/base/game/gfx/portraits/portrait_modifiers)).
- Ruler Designer: `common/ruler_designer/` and `window_ruler_designer.gui` contain no DLC checks; the only gated modes are landless adventurer/noble family (Roads to Power flags) ([ck3-mod-base](https://github.com/skonester/ck3-mod-base)).

Fallback behaviour is documented per database (hidden bookmark, fallback doctrine/tenet/pillar/tradition, fallback entity/clothing), so missing DLC content degrades silently and logs to `error.log`; the 1.20 report warns "rites with `create = no` error when accessed via `rite:key`" ([_buildings.info](https://github.com/skonester/ck3-mod-base/tree/master/base/game/common/buildings); [1.20.0.2.md](https://github.com/skonester/ck3-mod-base/blob/master/1.20.0.2.md)). **Unverified:** an authoritative "never crashes" statement; per-DLC lists of individual trait names.

### Detection algorithm

(1) Find the install; (2) parse every `game/dlc/*/*.dlc` (strip BOM; `key = value` lines) → installed list with `name`, `path`, `steam_id`; (3) join with `game/dlc_metadata/00_dlc_metadata.txt` for `type` (note: it swaps the `msgr_id` of dlc_001/dlc_002 relative to the `.dlc` files — prefer the `.dlc`); (4) read `dlc_load.json` `disabled_dlcs` (entries are exactly `<path>/<file>.dlc`, e.g. `"dlc/dlc014_ep3/dlc014.dlc"`) and subtract; (5) read `rawVersion` from `launcher-settings.json`; (6) map folders to feature keys via the wrapper table. On Steam, unowned DLC depots are not downloaded, so "installed" ≈ "owned" ([ck3-mod-base dlc/](https://github.com/skonester/ck3-mod-base/tree/master/base/game/dlc); [Paradox forum, dlc_load.json](https://forum.paradoxplaza.com/forum/threads/paradox-launcher-ubuntu-20-04-method-to-enable-disable-dlc-without-launcher.1439893/)). Safe mod pattern: wrap DLC-dependent effects in `if = { limit = { has_XXX_dlc_trigger = yes } }` with a fallback, put `requires_dlc_flag` on bookmarks, and never guard traits/DNA.

## Existing tools and prior art

**Conclusion for the developer:** no maintained tool exports a designed ruler or family to a mod; build on `jomini` (parse/write), `ck3-tiger` (validate, via subprocess because it is GPL-3.0), ImperatorToCK3's `TitleHistory` (date replay), and CK3-GEDCOM's id-cache idea, and study CK3ModStudio and jj248's generator for data models.

| Tool | Lang / license | Last activity | Use |
|---|---|---|---|
| [rakaly/jomini](https://github.com/rakaly/jomini) | Rust, MIT | crate 0.37.1, 2026-09-22 | ">1 GB/s" parser, `TextWriter`; comments not preserved; dates need caller conversion ([docs.rs](https://docs.rs/crate/jomini/latest/source/README.md)) |
| [nickbabcock/jomini](https://github.com/nickbabcock/jomini) (npm) | TS/WASM, MIT | 0.10.0, 2026-03-14 | ">200 MB/s", `parseText()`, writer, dates → JS `Date`, CK3 listed |
| [amtep/tiger](https://github.com/amtep/tiger) (ck3-tiger, tiger-lib) | Rust, GPL-3.0 | 1.19.0, 2026-06-06 | validator; `--json`; `ck3-tiger.conf` with `load_mod = { modfile = ... workshop_id = ... }` and `only_born` ([ck3-tiger.conf](https://github.com/amtep/tiger/blob/main/ck3-tiger.conf)); `tiger_lib::Everything`, `emit_reports(json)`, `take_reports()` ([tiger_lib docs](https://amtep.github.io/tiger/tiger_lib/)) |
| [cwtools/cwtools](https://github.com/cwtools/cwtools) | F#, MIT | pushed 2026-06-30 | only parser claiming "comment preservation"; CK3 rules stale (2023-04-16) |
| [textGamex/ParadoxPower](https://github.com/textGamex/ParadoxPower) | F#/C#, Apache-2.0 | 0.13.1-beta, 2026-07-27 | parser with `ToScript()` |
| [nickbabcock/Pdoxcl2Sharp](https://github.com/nickbabcock/Pdoxcl2Sharp) | C#, MIT | 2026-07-16 | parser |
| [ParadoxGameConverters/ImperatorToCK3](https://github.com/ParadoxGameConverters/ImperatorToCK3) | C#, MIT | 2026-09-21 | generates characters, dynasties, title history, loc, CoA; `TitleHistory.GetHolderId(date)` |
| [jj248/CK3-Character-History-Generator](https://github.com/jj248/CK3-Character-History-Generator) | Python + Tauri/React, MIT | 2026-04-19 | multi-generation dynasties from JSON configs, family-tree images, headless CLI |
| [inccchue/CK3ModStudio](https://github.com/inccchue/CK3ModStudio) | C#/WPF, MIT | 2026-09-06 | families/dynasties/landed titles editor, "realistic date generation", AGOT submod export |
| [KeizerHarm/CK3-GEDCOM](https://github.com/KeizerHarm/CK3-GEDCOM) | C#, GPL-3.0 | 2025-07-11 | GEDCOM → characters/dynasties/houses/loc; "auto-generated CK3 IDs tracked via cache file across multiple tool runs" |
| [theivefjord/ck3-historical-character-creator](https://github.com/theivefjord/ck3-historical-character-creator) | C++/Qt6, LGPL-3.0 | 2025-04-10 | GUI character files only |
| [xetra11/CK3-Workbench](https://github.com/xetra11/CK3-Workbench) | Kotlin, MIT | 2023-03-10 (abandoned) | GUI prototype |
| [Iamgoofball/ck3_title_generator](https://github.com/Iamgoofball/ck3_title_generator) | C#, MIT | 2024-01-13 | landed_titles + loc generator |
| [pryvyd9/AzgaarToCK3](https://github.com/pryvyd9/AzgaarToCK3) / [niefia/AzgaarFMGtoCK3](https://github.com/niefia/AzgaarFMGtoCK3) | C# MIT / Python GPL-3.0 | 1.7.5 2026-04-18 / 2024-05-20 | whole-mod generators; users "must manually add the newly created mod to their playset" |
| [Kyusoo/CK3_Utility](https://github.com/Kyusoo/CK3_Utility) | JS, MIT | 2025-11-17 | DNA converter (base64 ↔ text) |
| [Deticaru/CK3-DNA-Duplicator](https://github.com/Deticaru/CK3-DNA-Duplicator) | Python, MIT | 2025-11-06 | copies expressed allele into recessive slot |
| [amb3rn0va/CK3-DNA-Generator](https://github.com/amb3rn0va/CK3-DNA-Generator) | Python, MIT | 2 commits | photo → DNA via local Ollama + LLaVA |
| [bcssov/IronyModManager](https://github.com/bcssov/IronyModManager) | C#, MIT | 2026-09-19 | mod manager; maintainer: `dlc_load.json` "holds the mod load order" |
| [crschnick/pdx_unlimiter](https://github.com/crschnick/pdx_unlimiter) | Java, GPL-3.0 | 2026-08-23 | save manager, melter, launcher bypass |
| [pdx-tools/pdx-tools](https://github.com/pdx-tools/pdx-tools) (ck3save) | Rust, AGPL-3.0 | 2026-09-29 | save parsing/melting |
| [TCA166/CK3-history-extractor](https://github.com/TCA166/CK3-history-extractor) | Rust, MIT | 2026-03-13 | save → family trees/maps |
| [jacklenzotti/clausewitz-mcp](https://github.com/jacklenzotti/clausewitz-mcp) | Python, MIT | v0.1, ~2026-08 | MCP server: `parse_script`, `validate_mod`, `search_script_docs`, `find_definition` ([glama listing](https://glama.ai/mcp/servers/jacklenzotti/clausewitz-mcp)) |
| [Demeter29/Voices_of_the_Court](https://github.com/Demeter29/Voices_of_the_Court) | TS, GPL-3.0 | 2025-03-07 | in-game LLM dialogue |

Activity dates are from ecosyste.ms/crates.io/npm/NuGet as of 2026-09-30 (e.g. [ecosyste.ms jomini](https://repos.ecosyste.ms/api/v1/hosts/GitHub/repositories/rakaly/jomini); [crates.io ck3-tiger](https://crates.io/crates/ck3-tiger)). There is no maintained pure-Python or pure-Java Clausewitz parser (ClauseWizard abandoned 2019; PyPI `jomini`/`pyradox` are unrelated packages) ([PyPI jomini](https://pypi.org/pypi/jomini/json)). The syntax reference "A Tour of PDS Clausewitz Syntax" covers CK3 quirks ([pdx.tools](https://pdx.tools/blog/a-tour-of-pds-clausewitz-syntax/)). The wiki's tools page also lists Lemmy's ck3editor (C# IDE), meckt (map/title editor), CK3_Validator, ck3spell and the Java Clausewitz Scenario Editor ([Modding tools](https://ck3.paradoxwikis.com/Modding_tools)). No repository prompts an LLM to produce `history/characters` directly; the AI loop pattern that exists is clausewitz-mcp's "parse → validate → fix". Large mods hand-author history with prefixed ids and a tracking spreadsheet ([PoD wiki](https://www.princesofdarknessmod.com/wiki/index.php/Character_Creation_Steps)). **Unverified:** how CK3ModStudio and jj248's generator allocate ids; the exact `--json` schema of ck3-tiger; whether tiger checks that a `holder` id exists.

## Risks and open questions for the app design

- 1.20 `religion` → `rite` change and 62 removed faith keys are known only from a third-party diff — mitigation: read `common/religion/` from the installed game at runtime, validate against it, and emit `faith =` + `rite =` on 1.20+ once verified on a live install.
- Same-date `holder` precedence between a mod file and vanilla is undocumented — mitigation: always date the mod's block strictly later than the last vanilla block before the bookmark and ≤ the bookmark date; test in-game.
- Vanilla numeric ids extend far past 900,000 (up to 1,000,230,517) — mitigation: use prefixed string ids and scan installed `history/characters` for collisions before writing.
- Launcher SQLite schema migrates without notice (2026.10 broke tools) — mitigation: default to file drop + user enables in launcher; make DB/`dlc_load.json` writes opt-in, `PRAGMA table_info`-guarded, and only while the launcher is closed.
- `enabled_mods` entry format for CK3 unverified — mitigation: read an existing `dlc_load.json` from the user's machine and mirror its format before writing.
- Age-cost rounding (e.g. 24 → 69.6) unverified — mitigation: expose the raw formula, display floor and round, and calibrate against the in-game designer once.
- 1.20 trait changes (`scholar`→`erudite`, new `cleric`/`herald`/`lifestyle_scholar`) with unknown costs — mitigation: parse `00_traits.txt` from the install instead of shipping a static table; treat missing `ruler_designer_cost` as 0.
- Whether the designer hides traits from unowned DLC is unknown — mitigation: do not gate traits in the app; warn only for DLC-dependent governments/bookmarks/clothing.
- Engine behaviour for a character without `birth`, a dead holder, or a dead employer is undocumented — mitigation: make `birth` mandatory in the data model, require `death` for anyone not meant to be alive at later bookmarks, and validate holder/employer lifetimes.
- Dynasty-without-house vs explicit founding house: forum advice and wiki disagree — mitigation: emit `dynasty =` for founders and `dynasty_house` only for cadet branches, matching vanilla (0/71,124 characters set both).
- DNA gene list may have grown after 1.18.4 — mitigation: emit only genes present in a user-pasted "Copy DNA" block or in the installed `common/genes`; never emit a hardcoded 104-gene list blindly.
- No offline portrait renderer exists — mitigation: store user screenshots or a schematic preview; document the `portrait_editor` / Ruler Designer verification loop.
- `.txt` BOM tolerance and quote escaping unverified — mitigation: write UTF-8 with BOM (vanilla history files have it), tab indentation, and quote all strings; avoid quotes inside values.
- `supported_version` wildcard behaviour unknown — mitigation: write the exact `rawVersion` from `launcher-settings.json`.
- ck3-tiger lags game updates by "days or even weeks" and is GPL-3.0 — mitigation: invoke it as an optional subprocess with `--json`, matched to the detected game version; keep the app's own validator as the primary gate.
- Full-file override of `00_landed_titles.txt` breaks across versions — mitigation: never override vanilla files; add titles only in new files.
- Landless adventurer and administrative rulers are unplayable without Roads to Power — mitigation: require a landed county for collections targeting no-DLC installs, or tag the collection with `roads_to_power`.
- Vanilla history uses `1066.1.1`/`1178.1.1` for development but bookmarks start 1066.9.15/1178.10.1 — mitigation: key collections to the exact `default_start_date`, never to a bare year.
- Saved-ruler file location/format unknown — mitigation: rely on the clipboard "Copy DNA" path; investigate the user-data folder on a live install.
- Wiki modding pages are "last verified for 1.1" — mitigation: treat `.info` docs and vanilla files as authoritative and the wiki as secondary.

## Sources

- https://ck3.paradoxwikis.com/Patches
- https://store.steampowered.com/news/app/1158310/view/684140727200907281
- https://github.com/skonester/ck3-mod-base
- https://github.com/skonester/ck3-mod-base/blob/master/1.20.0.2.md
- https://ck3.paradoxwikis.com/Modding
- https://ck3.paradoxwikis.com/Mod_structure
- https://forum.paradoxplaza.com/forum/threads/crusader-kings-iii-blocked-macos.1855757/
- https://forum.paradoxplaza.com/forum/threads/dlcs-no-longer-load-in-older-versions-edit-or-at-all.1626287/
- https://raw.githubusercontent.com/ghostwritesme/ck3-mod-updater/main/ck3_game_detection.py
- https://www.nexusmods.com/crusaderkings3/articles/55
- https://github.com/goigle/stellaris-playset-sync/blob/master/MainWindow.xaml.cs
- https://github.com/Clazex/StlTechRelGen/issues/14
- https://forum.paradoxplaza.com/forum/threads/paradox-launcher-ubuntu-20-04-method-to-enable-disable-dlc-without-launcher.1439893/
- https://github.com/bcssov/IronyModManager/issues/171
- https://ck3.paradoxwikis.com/Mod_compatibility
- https://forum.paradoxplaza.com/forum/threads/ck-iii-duplicate-characters-in-history-files.1531263/
- https://ck3.paradoxwikis.com/Localization
- https://ck3.paradoxwikis.com/Scripting
- https://ck3.paradoxwikis.com/Character_modding
- https://github.com/skonester/ck3-mod-base/blob/master/base/game/history/characters/french.txt
- https://ck3.paradoxwikis.com/Mod_troubleshooting
- https://github.com/amtep/ck3-tiger
- https://steamcommunity.com/sharedfiles/filedetails/?id=2872535463
- https://github.com/skonester/ck3-mod-base/blob/master/base/game/history/_characters.info
- https://github.com/skonester/ck3-mod-base/blob/master/base/game/history/_history.info
- https://github.com/skonester/ck3-mod-base/tree/master/base/game/history/characters
- https://github.com/skonester/ck3-mod-base/blob/master/base/game/history/characters/english.txt
- https://github.com/skonester/ck3-mod-base/blob/master/base/game/history/characters/portrait_debug_characters.txt
- https://github.com/skonester/ck3-mod-base/blob/master/base/game/history/characters/armenian.txt
- https://github.com/skonester/ck3-mod-base/blob/master/base/game/history/characters/bodpa.txt
- https://github.com/skonester/ck3-mod-base/blob/master/base/game/history/characters/han.txt
- https://github.com/skonester/ck3-mod-base/blob/master/base/game/history/characters/aragonese.txt
- https://www.princesofdarknessmod.com/wiki/index.php/Character_Creation_Steps
- https://github.com/skonester/ck3-mod-base/blob/master/base/game/localization/english/names/character_names_l_english.yml
- https://github.com/skonester/ck3-mod-base/blob/master/base/game/common/culture/name_lists/00_frankish.txt
- https://ck3.paradoxwikis.com/Dynasty
- https://github.com/skonester/ck3-mod-base/blob/master/base/game/localization/english/gui/ruler_designer_l_english.yml
- https://github.com/skonester/ck3-mod-base/blob/master/base/release-notes/1_13_2_0_2024-10-23.md
- https://forum.paradoxplaza.com/forum/threads/how-to-save-a-custom-ruler.1587398/
- https://github.com/skonester/ck3-mod-base/blob/master/base/game/common/scripted_effects/00_game_rule_effects.txt
- https://github.com/skonester/ck3-mod-base/blob/master/base/game/common/dynasties/00_dynasties.txt
- https://github.com/skonester/ck3-mod-base/blob/master/base/game/common/dynasty_houses/00_dynasty_houses.txt
- https://github.com/skonester/ck3-mod-base/tree/master/base/game/common/dynasties
- https://github.com/skonester/ck3-mod-base/tree/master/base/game/common/dynasty_houses
- https://github.com/skonester/ck3-mod-base/blob/master/base/game/common/dynasties/05_historical_character_dynasties.txt
- https://ck3.paradoxwikis.com/Dynasties_modding
- https://forum.paradoxplaza.com/forum/threads/lack-of-the-founding-house-tutorial-of-modding-dynasties.1452333/
- https://github.com/skonester/ck3-mod-base/blob/master/base/game/localization/english/dynasties/dynasty_names_l_english.yml
- https://github.com/skonester/ck3-mod-base/blob/master/base/game/localization/english/mottos_l_english.yml
- https://github.com/skonester/ck3-mod-base/blob/master/base/game/common/landed_titles/_landed_titles.info
- https://ck3.paradoxwikis.com/Title_modding
- https://github.com/skonester/ck3-mod-base/blob/master/base/game/common/landed_titles/00_landed_titles.txt
- https://github.com/skonester/ck3-mod-base/blob/master/base/game/common/landed_titles/01_other_noble_family.txt
- https://github.com/skonester/ck3-mod-base/tree/master/base/game/common/landed_titles
- https://github.com/skonester/ck3-mod-base/blob/master/base/game/map_data/definition.csv
- https://github.com/skonester/ck3-mod-base/blob/master/base/game/history/provinces/k_england.txt
- https://ck3.paradoxwikis.com/History_modding
- https://github.com/skonester/ck3-mod-base/blob/master/base/game/history/titles/k_england.txt
- https://github.com/skonester/ck3-mod-base/blob/master/base/game/history/titles/02_other_noble_family.txt
- https://github.com/skonester/ck3-mod-base/blob/master/base/game/history/titles/k_otuken.txt
- https://github.com/skonester/ck3-mod-base/tree/master/base/game/history/titles
- https://github.com/ParadoxGameConverters/ImperatorToCK3/blob/master/ImperatorToCK3.UnitTests/CK3/Titles/TitleHistoryTests.cs
- https://github.com/skonester/ck3-mod-base/tree/master/base/game/common/governments
- https://github.com/skonester/ck3-mod-base/blob/master/base/game/common/governments/_governments.info
- https://github.com/skonester/ck3-mod-base/blob/master/base/game/common/governments/00_government_types.txt
- https://github.com/skonester/ck3-mod-base/blob/master/base/game/history/titles/01_laamp_titles.txt
- https://github.com/skonester/ck3-mod-base/blob/master/base/game/common/scripted_effects/07_dlc_ep3_scripted_effects.txt
- https://github.com/skonester/ck3-mod-base/blob/master/base/game/history/titles/01_admin_titles.txt
- https://github.com/skonester/ck3-mod-base/blob/master/base/game/common/defines/00_defines.txt
- https://github.com/skonester/ck3-mod-base/blob/master/base/game/gui/window_ruler_designer.gui
- https://ck3.paradoxwikis.com/Ruler_Designer
- https://www.pcgamesn.com/crusader-kings-3/ruler-designer-ck3-patch-12
- https://github.com/skonester/ck3-mod-base/blob/master/base/game/common/on_action/ruler_designer.txt
- https://github.com/skonester/ck3-mod-base/blob/master/base/game/common/on_action/game_start.txt
- https://github.com/skonester/ck3-mod-base/blob/master/base/game/common/script_values/02_ruler_designer_values.txt
- https://ck3.paradoxwikis.com/index.php?title=Ruler_Designer&action=raw&section=5
- https://ck3-random-ruler.vercel.app/
- https://github.com/skonester/ck3-mod-base/blob/master/base/game/common/traits/_traits.info
- https://ck3.paradoxwikis.com/index.php?title=Ruler_Designer&action=raw&section=4
- https://ck3.paradoxwikis.com/Traits
- https://github.com/skonester/ck3-mod-base/blob/master/base/release-notes/1_10_1_0_2023-08-31.md
- https://github.com/skonester/ck3-mod-base/blob/master/base/game/common/traits/00_traits.txt
- https://ck3.paradoxwikis.com/Patch_1.2
- https://github.com/skonester/ck3-mod-base/blob/master/base/release-notes/1_13_0_0_2024-09-24.md
- https://github.com/skonester/ck3-mod-base/blob/master/base/release-notes/1_19_0_0_2026-04-20.md
- https://github.com/skonester/ck3-mod-base/blob/master/base/game/common/dna_data/_dna_data.info
- https://github-wiki-see.page/m/Warcraft-GoA-Development-Team/Warcraft-Guardians-of-Azeroth-2/wiki/How-To-Assign-DNAs-%28Portraits%29-To-Characters
- https://forum.paradoxplaza.com/forum/threads/share-your-dna.1444216/
- https://github.com/Kyusoo/CK3_Utility
- https://forum.paradoxplaza.com/forum/threads/ck3-dev-diary-34-its-all-about-appearances.1406933/
- https://github.com/Deticaru/CK3-DNA-Duplicator
- https://forum.paradoxplaza.com/forum/threads/ethnicity-modding.1451760/
- https://steamcommunity.com/sharedfiles/filedetails/?id=3536915634
- https://github.com/raccoonwannafly/crusader-kings-3-dna-updater
- https://ck3.paradoxwikis.com/Patch_1.3
- https://www.pcgamer.com/games/strategy/crusader-kings-3-finally-gets-its-most-hotly-demanded-feature-in-years-an-authentic-male-pattern-baldness-system/
- https://forum.paradoxplaza.com/forum/threads/ck-iii-gene_bs_body_shape-value-is-altered-if-you-paste-a-edited-dna-template-in-ruler-designer.1564995/
- https://steamcommunity.com/sharedfiles/filedetails/?id=2606853919
- https://forum.paradoxplaza.com/forum/threads/changing-characters-appearance-with-custom-trait.1620460/
- https://forum.paradoxplaza.com/forum/threads/ck-iii-hairstyles-are-gone-from-the-game.1484943/
- https://ck3.paradoxwikis.com/Culture_modding
- https://ck3.paradoxwikis.com/3D_models
- https://github.com/terrapass/ck3-modutil-portrait-statues/blob/master/mod/common/genes/GH_genes_special_markers.txt
- https://github.com/scorpdx/portraitbuilder
- https://steamcommunity.com/sharedfiles/filedetails/?id=2234449846
- https://github.com/skonester/ck3-mod-base/blob/master/base/game/common/bookmarks/groups/00_bookmark_groups.txt
- https://github.com/skonester/ck3-mod-base/blob/master/base/game/common/bookmarks/bookmarks/00_bookmarks.txt
- https://ck3.paradoxwikis.com/Bookmarks
- https://ck3.paradoxwikis.com/By_God_Alone
- https://github.com/skonester/ck3-mod-base/blob/master/base/game/common/bookmarks/bookmarks/_bookmarks.info
- https://ck3.paradoxwikis.com/Bookmarks_modding
- https://github.com/skonester/ck3-mod-base/tree/master/base/game/dlc
- https://steamdb.info/app/1158310/dlc/
- https://ck3.paradoxwikis.com/Patch_1.17
- https://store.steampowered.com/app/4232900/Crusader_Kings_III_By_God_Alone/
- https://github.com/skonester/ck3-mod-base/tree/master/base/game/dlc_metadata
- https://ck3.paradoxwikis.com/Downloadable_content
- https://github.com/skonester/ck3-mod-base/blob/master/base/game/common/scripted_triggers/00_has_dlc_scripted_triggers.txt
- https://github.com/skonester/ck3-mod-base/blob/master/base/game/common/culture/cultures/_cultures.info
- https://github.com/skonester/ck3-mod-base/tree/master/base/game/common/religion/religion_types
- https://github.com/skonester/ck3-mod-base/tree/master/base/game/gfx/portraits/portrait_modifiers
- https://github.com/skonester/ck3-mod-base/tree/master/base/game/common/buildings
- https://github.com/rakaly/jomini
- https://docs.rs/crate/jomini/latest/source/README.md
- https://github.com/nickbabcock/jomini
- https://github.com/amtep/tiger
- https://github.com/amtep/tiger/blob/main/ck3-tiger.conf
- https://amtep.github.io/tiger/tiger_lib/
- https://github.com/cwtools/cwtools
- https://github.com/textGamex/ParadoxPower
- https://github.com/nickbabcock/Pdoxcl2Sharp
- https://github.com/ParadoxGameConverters/ImperatorToCK3
- https://github.com/jj248/CK3-Character-History-Generator
- https://github.com/inccchue/CK3ModStudio
- https://github.com/KeizerHarm/CK3-GEDCOM
- https://github.com/theivefjord/ck3-historical-character-creator
- https://github.com/xetra11/CK3-Workbench
- https://github.com/Iamgoofball/ck3_title_generator
- https://github.com/pryvyd9/AzgaarToCK3
- https://github.com/niefia/AzgaarFMGtoCK3
- https://github.com/amb3rn0va/CK3-DNA-Generator
- https://github.com/bcssov/IronyModManager
- https://github.com/crschnick/pdx_unlimiter
- https://github.com/pdx-tools/pdx-tools
- https://github.com/TCA166/CK3-history-extractor
- https://github.com/jacklenzotti/clausewitz-mcp
- https://glama.ai/mcp/servers/jacklenzotti/clausewitz-mcp
- https://github.com/Demeter29/Voices_of_the_Court
- https://repos.ecosyste.ms/api/v1/hosts/GitHub/repositories/rakaly/jomini
- https://crates.io/crates/ck3-tiger
- https://pypi.org/pypi/jomini/json
- https://pdx.tools/blog/a-tour-of-pds-clausewitz-syntax/
- https://ck3.paradoxwikis.com/Modding_tools
