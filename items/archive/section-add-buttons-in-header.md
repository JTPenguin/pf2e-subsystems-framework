---
title: "Put section add buttons in the section header"
kind: feature
status: done
waits_on: none
priority: 🔼
blocked_by: [actions-section-styling]
source: "Justin's list of items, 2026-11-12; interview with Justin, 2026-11-12"
added: 2026-11-12
updated: 2026-11-12
outcome: "Built 2026-11-12. Counters, Actions and Modifiers have a + at the right of their title on both tabs. Checked live: each + added to the right list."
---
# Put section add buttons in the section header

Today each Edit-tab section ends with a full-width "Add …" button under its list. Move each one into its section's title row, the way the PF2e monster sheet does (`templates/actors/npc/tabs/main.hbs`: a `.section-header` with the `h4` on the left and a `+` link on the right).

## Decided (Justin, 2026-11-12)

| Button | Moves to |
|---|---|
| Add counter (challenge and subject) | The Counters title row |
| Add action | The Actions title row |
| Add entry (challenge and subject modifiers) | The Modifiers title row, as one plain `+` (see [[modifiers-section]]) |
| Add check | Stays under its check table inside the action card |
| Add Obstacle, Add Complication and the other subject buttons | Stay in the tab row |

- Each moved button is a `+` icon on the right of the title, with its old label ("Add counter") as the tooltip and aria-label.
- Section titles come from [[actions-section-styling]], so build that first.

**Done when:** Counters, Actions and Modifiers on both Edit tabs have their `+` in the title row, each still adds to the right list, and no "Add …" button is left under those lists. Check it live in Foundry.
