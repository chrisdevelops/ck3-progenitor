//! Mod pipeline: validate, export, assemble, localization fan-out, deploy, ck3-tiger runner.
//!
//! See `docs/plan.md` for this crate's place in the layer map and its gate test.

/// Name of this crate as the registry and logs refer to it.
pub const CRATE_NAME: &str = "progenitor-mod";
