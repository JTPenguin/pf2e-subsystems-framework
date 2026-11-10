---
title: "Panel rolls look like inline checks, and the GM can click them"
kind: feature
status: done
waits_on: none
priority: 🔼
added: 2026-11-09
updated: 2026-11-09
outcome: "Panel skills now look like PF2e inline checks, and the GM can click them: the selected token rolls, else the sheet's Roll as choice. Checked live as GM with a token, without one, and with the sheet closed; the player click was checked from code."
source: "Justin's request, 2026-11-09; scope set in interview, 2026-11-09"
---
# Panel rolls look like inline checks, and the GM can click them

Players can already click Influence and Discover skills on the player panel (`canRoll` is true for non-GMs). Two things change:

- **Look:** style the roll buttons like PF2e inline checks, not plain buttons.
- **GM can roll:** the GM sees the skills as plain text today. Make them clickable for the GM too. The roll uses the GM's selected token on the canvas, and falls back to the Roll as actor from the GM window when no token is selected.

**Next step:** restyle `.ssm-panel-skill` to match PF2e inline checks, let the GM roll from the panel with the token-then-Roll-as rule, and check a click as a player and as the GM (with and without a token selected).
