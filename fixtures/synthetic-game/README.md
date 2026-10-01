# Synthetic game tree

A small, hand-written tree that mimics the CK3 file formats (history/characters,
history/titles, common/landed_titles, common/dynasties, common/dynasty_houses,
common/traits, common/defines, common/genes, common/culture, common/religion,
common/bookmarks, dlc/) so CI can test parsing, indexing and export without
Paradox's files. Built during Phase 1 from the formats in docs/research.md.

The real snapshot lives in `fixtures/vanilla-snapshot/` (gitignored) and is built
locally with `cargo run -p progenitor-game -- snapshot`.
