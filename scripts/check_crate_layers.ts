// Verifies the crate dependency direction from docs/plan.md (Architecture):
// a crate may depend only on crates in lower layers. Run with: bun scripts/check_crate_layers.ts
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const LAYER_OF: Record<string, number> = {
  "progenitor-core": 1,
  "progenitor-game": 2,
  "progenitor-content": 3,
  "progenitor-points": 4, "progenitor-dna": 4, "progenitor-coa": 4,
  // Within row 5 of the plan, llm sits below agent (agent depends on llm).
  "progenitor-ui": 5, "progenitor-llm": 4.5, "progenitor-agent": 5,
  "progenitor-characters": 6, "progenitor-houses": 6, "progenitor-collections": 6,
  "progenitor-generators": 7, "progenitor-chat": 7, "progenitor-mod": 7,
  "progenitor-app": 8,
};
// Feature plugins never import each other.
const FEATURE_PLUGINS = new Set(["progenitor-characters", "progenitor-houses", "progenitor-collections"]);

const cratesDir = join(import.meta.dir, "..", "crates");
let failures = 0;
for (const name of readdirSync(cratesDir)) {
  const toml = readFileSync(join(cratesDir, name, "Cargo.toml"), "utf8");
  const deps = [...toml.matchAll(/^(progenitor-[a-z]+)\s*=/gm)].map((m) => m[1]);
  for (const dep of deps) {
    const ok = LAYER_OF[dep] < LAYER_OF[name] && !(FEATURE_PLUGINS.has(name) && FEATURE_PLUGINS.has(dep));
    if (!ok) { console.error(`layer violation: ${name} (layer ${LAYER_OF[name]}) depends on ${dep} (layer ${LAYER_OF[dep]})`); failures++; }
  }
}
if (failures) process.exit(1);
console.log("crate layers ok");
