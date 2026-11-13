---
title: "Show a both-ways counter's thresholds highest first on the panel"
kind: work
status: needs-decision
waits_on: Justin
blocked_by: []
source: "Found in the Reputation live check, 2026-11-13 (items/archive/reputation-subsystem.md); logged on Justin's request, 2026-11-13"
added: 2026-11-13
updated: 2026-11-13
---
# Show a both-ways counter's thresholds highest first on the panel

The panel lists thresholds in the order the track reaches them. A both-ways counter sorts them lowest first, so Reputation's list starts with Hunted (−30) and ends with Revered (+30). Reading down, the best tier is last. The sheet keeps the stored order, which the preset gives highest first.

**Where:** `thresholdViews` in `scripts/challenge/panel-view.js` (around line 74).

**Decision for Justin:** should a both-ways list run highest first (Revered at the top), or follow the stored order, as the sheet does?
