---
title: "Tidier NPC section on the GM sheet, with skill chips"
kind: feature
status: ready
waits_on: Claude
blocked_by: []
source: "Justin's request, 2026-11-09"
added: 2026-11-09
updated: 2026-11-09
---
# Tidier NPC section on the GM sheet, with skill chips

Lay out each NPC's Run mode section more compactly. Each Discovery and Influence skill becomes a chip, like a PF2e inline roll, instead of a full row.

**Now:** the `ssmSkillRow` partial in `templates/influence-sheet.hbs` gives every skill its own row: eye toggle, name, decoy tag, base DC, current DC, roll button and post-link button.

**Next step:**

1. Build the chip. **Decided (Justin, 2026-11-09):** clicking the chip rolls for the selected PC, a small chat icon on it posts the link, and the eye sits on the chip. It also shows the name and current DC, marked when changed. Base DC and decoy go in a tooltip.
2. Group the rest of the NPC section (points, thresholds, modifiers) so it reads at a glance. Style it in `styles/subsystems.css`.
3. Check it in Foundry in Run mode with a challenge that has several NPCs, and run `tools/test.mjs`.

Related: [[drop-pending-results]] and [[drop-gm-log]] also change the Run mode sheet.
