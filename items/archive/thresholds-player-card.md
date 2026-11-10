---
title: "Put thresholds in their own card on the player panel"
kind: feature
status: done
waits_on: none
priority: 🔼
blocked_by: [progress-bar-and-thresholds]
source: "Justin's request, 2026-11-09; layout decided in the items interview, 2026-11-09"
added: 2026-11-09
updated: 2026-11-09
outcome: "Done 2026-11-09. One THRESHOLDS card per NPC under its bar, revealed thresholds in points order, check mark when reached, ??? for points-only. Replaces the Goal lines. Checked live as Test Player 1 with two NPCs."
---
# Put thresholds in their own card on the player panel

Thresholds get their own card in the player panel, instead of loose "Goal" lines at the end of each NPC (`templates/influence-panel.hbs`).

**Decided (Justin, 2026-11-09):** one card per NPC, under that NPC's bar. It lists the NPC's revealed thresholds in points order. A reached one has a check mark. A points-only one (from [[progress-bar-and-thresholds]]) shows "???" for its text.

```
THRESHOLDS
✓ 3  He listens
  6  ???
```

**Next step:** after the two-step reveal is in, build the card in the panel template and `styles/subsystems.css`, matching the modifier cards. Check it as a player with two NPCs.
