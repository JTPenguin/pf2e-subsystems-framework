---
title: "Deception, Diplomacy and Intimidation as universal Influence skills"
kind: feature
status: ready
waits_on: Claude
blocked_by: []
source: "Justin's request, 2026-11-09"
added: 2026-11-09
updated: 2026-11-09
---
# Deception, Diplomacy and Intimidation as universal Influence skills

Treat Deception, Diplomacy and Intimidation as universal Influence skills, the way Perception is for Discovery: always on the panel, with no reveal control.

**Now:** every Influence row is hidden until revealed. Universal applies to Discovery only (`UNIVERSAL_DISCOVERY` and `isUniversalDiscovery` in `scripts/subsystems/influence/data.js`). A new NPC starts with no skill rows.

**Decided (Justin, 2026-11-09):**

| Question | Answer |
|---|---|
| Added for you? | Yes. A new NPC starts with Deception, Diplomacy and Intimidation Influence rows and a Perception Discovery row. The GM can still edit or delete them. Existing NPCs are left as they are. |
| DC on the panel | Never shown. That applies to every skill, so it is its own item: [[remove-show-dc]]. |
| Decoys | Not allowed on a universal row: no decoy checkbox. |

**Next step:**

1. Add `UNIVERSAL_INFLUENCE` and a matching check in `data.js`.
2. Make `newNpc` add the four universal rows, each with the default DC.
3. Use the check in `panel-view.js` (always visible), and in `sheet.js` and `templates/influence-sheet.hbs` (no eye toggle, no Revealed or Decoy checkbox). Do the same for universal Discovery rows, so Perception loses its decoy checkbox too.
4. Decide what happens to a universal row that already has `decoy: true`, for example from an import: treat it as not a decoy.
5. Add tests and update `docs/spec.md` sections 2, 5 and 7.
6. Check it: run `tools/test.mjs`, then add an NPC in Foundry and confirm the rows and the panel.
