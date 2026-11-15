---
title: "Sort checks alphabetically on the player panel"
kind: feature
status: done
waits_on: none
priority: ⏫
blocked_by: []
source: "ChazPls (friend testing the module) in Discord, 2026-11-14; details from Justin's interview, 2026-11-14"
added: 2026-11-14
updated: 2026-11-14
outcome: "Done 2026-11-14. The panel sorts each action's checks A–Z by the label players see; the sheet keeps the GM's order. Checked live as Test Player 1."
---
# Sort checks alphabetically on the player panel

The player panel lists an action's checks in the order the GM entered them (`checks: action.checks.filter(isVisibleCheck)` in `scripts/challenge/panel-view.js`). Adventure Paths list skills from easiest to hardest, so a GM who copies a stat block in order gives the DC ranking away. ChazPls suggested sorting the panel alphabetically to stop that metagaming. Justin agreed.

## Decided (Justin, 2026-11-14)

- **Always on.** No setting. The GM sheet keeps the GM's own order.
- **Plain A–Z by the label players see.** Perception, saves and Lores mix in by name, e.g. "Diplomacy, Engineering Lore, Perception, Society".

## Design

- Sort the visible checks in `panel-view.js` by their localized label, with `localeCompare`.

## Done when

- A unit test in `tools/test.mjs` covers the sort, including a Lore and Perception.
- The GM guide mentions that players see checks in alphabetical order.
- In a live check as a player, an action entered out of order shows its checks A–Z.
