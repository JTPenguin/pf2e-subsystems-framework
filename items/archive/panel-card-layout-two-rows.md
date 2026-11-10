---
title: "Panel cards: name and type on the top line, effect and duration on the second"
kind: feature
status: done
waits_on: none
priority: 🔼
blocked_by: []
source: "Justin's request, 2026-11-10; effect defined in the triage interview, 2026-11-10"
added: 2026-11-10
updated: 2026-11-10
outcome: "Panel cards show name and type on the top line, effect and duration on the second; name and effect wrap while the right side stays aligned. Checked live 2026-11-10."
---
# Panel cards: name and type on the top line, effect and duration on the second

Justin wants a clearer layout for panel cards, in two rows.

**Decided (Justin, 2026-11-10):**

| | Left | Right |
|---|---|---|
| **Top line** | Name | Type (Resistance, Weakness or Other) |
| **Second line** | Effect | One Time or Ongoing (Spent when spent) |

- **Effect** is the change line the panel already builds, such as "−2 to DCs vs Diplomacy" (`changeText` in `panel-view.js`). A card with no changes leaves the left of line two blank and shows only the duration.
- Player text is not on the card. It moves to a hover: see [[panel-card-gm-label-on-hover]].
- The name and the effect can wrap when there is not enough space.

Builds on [[modifier-cards-on-panel]], which first added the card with kind, name, effect and duration.

**Done when:** on the panel, each card shows the four parts in those four places, and a long name or effect wraps without pushing the right side out of place. Check with several NPCs and in both themes.
