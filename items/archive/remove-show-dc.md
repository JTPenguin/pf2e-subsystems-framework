---
title: "Never show DCs to players"
kind: feature
status: done
waits_on: none
blocked_by: []
source: "Justin, during the items interview, 2026-11-09"
added: 2026-11-09
updated: 2026-11-09
outcome: "Done 2026-11-09. showDC removed; rolls and chat links always hide the DC; old data with showDC loads (Foundry prunes the key). Checked live as Test Player 1."
---
# Never show DCs to players

Players never see a DC: not on the panel, not on the chat card. Remove the per-row show-DC option.

**Now:** each Influence row has a `showDC` flag. When it's on, the panel shows the DC beside the skill (`dcText` in `templates/influence-panel.hbs`) and the roll's chat card shows it too.

**Next step:**

1. Remove `showDC` from the Influence row in `model.js`, `newInfluence` in `data.js`, the sheet's checkbox, and the panel view in `panel-view.js`.
2. Always roll with the DC hidden from players (`roll.js` and the chat links).
3. Old challenges and imports that still carry `showDC` must load without errors. Check how the data model handles an unknown field.
4. Update the tests and `docs/dev/spec.md` sections 5, 7 and 8.
5. Check it: run `tools/test.mjs` and `tools/check-load.mjs`, then roll from the panel in Foundry as a player and confirm no DC shows.
