# Progenitor design system

The look is settled here; the mockups that show it are the "Progenitor UI mockups"
canvas (six artboards: tokens, character traits, character appearance, collection,
review, chat panel). The UI implementer follows this file; the mockups are the
reference for composition.

Direction in one line: a quiet, dense, data-first desktop tool; warm charcoal ground,
one heraldic gold accent, a serif reserved for people and titles, nothing ornate.

## Tokens

Dark is the primary theme. Light mirrors it role for role. Tokens become a
gpui-component theme file in `progenitor-ui`; pages never use literal colors.

| Role | Dark | Light | Used for |
|---|---|---|---|
| ground | `#141311` | `#F3F1EC` | window background, inputs |
| surface-1 | `#1C1A16` | `#FBFAF7` | nav rail, chat panel, panels |
| surface-2 | `#242119` | `#EFECE4` | table headers, chips, cards |
| surface-3 | `#2D2A22` | `#E5E1D7` | user bubbles, meter track |
| line | `#312D25` | `#DDD8CC` | hairlines on surfaces |
| line-strong | `#3D3830` | `#C9C3B4` | control borders |
| text-1 | `#EDE7DA` | `#1E1B16` | primary text |
| text-2 | `#A89F8C` | `#5E574B` | secondary text |
| text-3 | `#6F6757` | `#8A8373` | labels, keys, hints |
| gold | `#C9A84C` | `#8E6F1E` | primary action, selection, active tab, points under budget |
| gold-dim | `#8F7731` | `#B08A2E` | filled slider track, playable pill border |
| error | `#D4574E` | `#B5392F` | errors, over budget, destructive actions |
| warning | `#D9A441` | `#9A6B07` | warnings |
| success | `#6FA86A` | `#3F7A3A` | installed, passed |
| info | `#6E9BC9` | `#2F6498` | informational notes |

Text on gold is `#1A1609` in both themes. Every color that carries a meaning also
carries an icon or a word; never meaning by hue alone.

## Type

| Style | Face | Size / weight | Used for |
|---|---|---|---|
| display | Fraunces | 30 / 500, letter-spacing -1% | page titles, character names on their page |
| name | Fraunces | 15 / 400 | character and house names in tables, cards, tree nodes |
| heading | IBM Plex Sans | 13 / 500 | section titles, buttons |
| body | IBM Plex Sans | 13 / 400, line-height 1.45 | everything readable |
| secondary | IBM Plex Sans | 12 / 400, text-2 | descriptions, meta rows, hints |
| label | IBM Plex Sans | 11 / 400, uppercase, letter-spacing 6%, text-3 | table headers, group labels |
| mono | IBM Plex Mono | 11 to 12 | game keys, ids, aligned numbers |

Fonts are bundled with the app (all three are OFL). The serif appears only on people,
houses and page titles; never on UI chrome or body text.

## Spacing, shape, lines

- 8px scale: 4, 8, 12, 16, 24, 28, 32. Page gutter 28. Panel padding 16 to 18.
- Rows: table row 40, control row 34 to 36, nav item 34.
- Radii: 5 small controls, 6 buttons and inputs, 8 panels, 999 pills.
- Lines: 1px, `line` on surfaces, `line-strong` on controls. No shadows, gradients or glow.
- Density: one screen holds a whole family without scrolling. Rows over cards.

## Layout

- Window: left nav rail 220px (surface-1), main area, chat panel 380px docked right
  (surface-1), collapsible to a 44px bar. Minimum window 1280 x 760.
- Main area: a 44px top bar with breadcrumbs and the page's primary action; a page
  header (display title, meta row, actions); tabs where the entity has them; content in
  a two-column grid where there is a side panel (checks, install, points).
- Nav rail: wordmark, library name, five entries (Characters, Houses, Collections,
  Review, Settings) with counts in mono, a footer with game version and install state.

## Components (progenitor-ui)

- Buttons: primary (gold fill, dark text, 600), secondary (transparent, line-strong
  border), danger (transparent, error border and text). 12px text, 7 x 12 padding,
  icon 16px left of the label when present.
- Pills: 11px, 999 radius; playable pill uses gold-dim border and gold text; draft pill
  uses surface-3 and a sparkle icon.
- Chips (selected traits): surface-2, line-strong border, name, cost in mono colored
  by sign, remove icon.
- Picker rows: icon, name, optional reason in text-3, cost in mono; disabled rows use
  text-3 and show why ("opposes Brave").
- Points meter: display number in gold or error, "/ budget" in text-3, a 6px track with
  a fill in the same color, breakdown rows beneath.
- Sliders: 4px track, gold-dim fill, 14px thumb with a 2px ground ring; DNA sliders add
  a center mark and the two template names in mono on either side, plus a numeric field.
- Tables: surface-2 header with label text, 40px rows, hairline separators, names in the
  serif, keys in mono, a checks column with colored badges.
- Accordion groups (DNA): surface-2 header with chevron, name, count in mono.
- Validation badges and lists: icon, bold one-line statement, secondary explanation,
  optional action link.
- Chat: user bubbles in surface-3 right-aligned; assistant text plain; change cards
  with a 2px gold left border, title, bullet lines, Undo; question cards with option
  buttons and a free-text field; confirmation cards with an error border and two
  buttons; a running indicator with a gold dot.
- Shield placeholder: a 56 x 64 rounded-bottom shape in surface-2 with a shield icon,
  wherever a coat of arms would go.

## Rules

1. Gold is one thing: the primary action, selection, the active tab, points under
   budget. Never decoration.
2. Red is the only alarm. Amber warns, blue informs, green confirms.
3. Game keys are always visible beside display names, in mono.
4. Flavour, lightly: the shield shape and the serif are the only medieval notes. No
   parchment, textures or ornaments.
5. Nothing on the UI thread slower than a frame; long work shows a running indicator.
6. Every control is a real control: buttons, inputs with labels, links; icon-only
   buttons carry an accessible name.
7. Contrast: body text 4.5:1 on its surface in both themes; the text-3 color is for
   labels and keys only, never for sentences.
