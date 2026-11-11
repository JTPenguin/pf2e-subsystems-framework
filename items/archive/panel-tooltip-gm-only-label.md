---
title: "Panel card tooltips: drop the Player label, say GM Only on its own line"
kind: work
status: done
waits_on: none
blocked_by: []
source: "Justin's list of items, 2026-11-11; layout picked by Justin, 2026-11-11"
added: 2026-11-11
updated: 2026-11-11
outcome: "Done 2026-11-11. cardTooltip gives the GM the player text unlabelled, then 'GM Only' (SSM.Panel.TipGM) on its own line over the GM text; SSM.Panel.TipPlayer removed; spec updated. Tests pass. Checked live in the test world: GM hover shows the layout, a player's hover shows the player text only."
---
# Panel card tooltips: drop the Player label, say GM Only on its own line

Players' tooltips already show no label: `cardTooltip` in `scripts/subsystems/influence/panel-view.js` gives them the player text alone. The "Player" label shows only in the GM's tooltip, in front of the player text.

**The GM's tooltip, as Justin picked it:**

```
She hates being flattered.

GM Only
She secretly enjoys it from Ezren.
```

- The player text comes first, with no label.
- "GM Only" is a heading on its own line, with the GM text under it.
- With no player text, the tooltip starts at "GM Only". With no GM text, it shows only the player text and no heading.
- Change `SSM.Panel.TipGM` in `lang/en.json` to "GM Only", and drop `SSM.Panel.TipPlayer`. Update the `cardTooltip` tests in `tools/test.mjs`.

**Done when:** a player's card tooltip is unchanged, and the GM's tooltip matches the layout above. Check both in Foundry on a live panel.
