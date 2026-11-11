---
title: "Panel: point progress bar and weak/resist cards fill the panel width"
kind: work
status: done
waits_on: none
blocked_by: []
source: "Justin's list of items, 2026-11-11"
added: 2026-11-11
updated: 2026-11-11
outcome: "Done 2026-11-11. A resized panel drops the NPC column caps (32rem, 17rem) and lets several-NPC cards wrap at 12rem, so bars and cards fill the width. A panel at its natural size keeps the caps (still 586px wide in the test world). Checked live as GM and player: two NPCs give two cards per row per column, one NPC gives four across, all reaching the panel's padding edge."
---
# Panel: point progress bar and weak/resist cards fill the panel width

The point progress bar row and the weak/resist/other cards stop growing at a certain width. They should grow to fill the whole panel.

Cards may move to three or more columns to fill the width.

**Likely cause:** each NPC column has a width cap: `.ssm-panel-npc { max-width: 32rem }`, and `17rem` with several NPCs (`styles/subsystems.css` lines 182–183). The bar and the cards sit inside the column, so they stop at its edge. The cards already wrap at `flex: 1 1 12rem`, so lifting the cap should give three or more columns on its own.

**Watch for:** the panel at its starting spot sizes to its content (`width: fit-content`). Without the cap, a long line could stretch the panel. Keep the cap for the panel's natural width, and drop it only when the GM or player has resized the panel (the `.sized` class), or check that nothing stretches it.

**Done when:** at wide panel sizes, the progress bar row and the cards reach the panel's right edge, for both the player and the GM view, with one NPC and with several. Check it in Foundry on a live panel.
