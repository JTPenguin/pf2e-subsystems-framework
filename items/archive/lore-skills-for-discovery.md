---
title: "Lore skills for Discovery"
kind: feature
status: done
waits_on: none
blocked_by: []
source: "Justin's request, 2026-11-09"
added: 2026-11-09
updated: 2026-11-09
outcome: "Done 2026-11-09. Discovery rows can be a named Lore. Checked live: set from the sheet, shown by name on the panel, rolled trained by a PC with the Lore (panel) and untrained on Int by one without (sheet)."
---
# Lore skills for Discovery

Let a Discovery check use a Lore skill, as an Influence check already can.

**Now:** a Discovery row offers Perception and the standard skills only. Its data has no `lore` field.

**What Influence already has to reuse:** the `LORE` skill value and `lore` name field, the Lore name input on the sheet, `loreSlug`, and `loreStatistic`, which lets a PC without the Lore roll it untrained.

**Decided (Justin, 2026-11-09):** a PC without the Lore rolls it untrained on Intelligence, as for Influence.

**Next step:**

1. Add `lore` to the Discovery row in `scripts/subsystems/influence/model.js` and `newDiscovery` in `data.js`.
2. Add Lore to the Discovery skill choices and show the Lore name input in `sheet.js` and `templates/influence-sheet.hbs`.
3. Pass `lore` through the Discovery view in `panel-view.js`, so the panel shows the Lore's name.
4. Update the Discovery row in `docs/dev/spec.md` section 5.
5. Check it: run `tools/test.mjs`, then roll a Discovery Lore in Foundry from the sheet and the panel, with a PC who has the Lore and one who doesn't.
