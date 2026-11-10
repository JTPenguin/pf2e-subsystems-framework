---
title: "Bar scales to all thresholds; thresholds reveal in two steps"
kind: feature
status: done
waits_on: none
priority: 🔼
blocked_by: []
source: "Justin's request, 2026-11-09; decided in the items interview, 2026-11-09"
added: 2026-11-09
updated: 2026-11-09
outcome: "Done 2026-11-09. The bar scales to the highest threshold, hidden or not (only that number reaches players). Thresholds have a three-step reveal (hidden, points, full); old revealed flags migrate; the eye cycles; the Edit tab has a Players see dropdown; points-only shows '6: ???'. Checked live as GM and Test Player 1."
---
# Bar scales to all thresholds; thresholds reveal in two steps

**Decided (Justin, 2026-11-09):**

1. **Bar scale:** the player panel's points bar scales to the highest threshold, hidden or not. Justin accepts that players can work out the goal from the bar. Today `pointsBar` in `panel-view.js` uses only revealed thresholds, with 10 as a fallback.
2. **Two-step reveal:** a threshold can show its points before its text. On the GM sheet its eye button cycles hidden → points only → points and text → hidden. A points-only threshold shows as "6: ???" on the panel.

**Next step:**

1. Pass every threshold's points to the panel view for the bar only (not the hidden rows' text or ids), and change `pointsBar`. Update the comment that says hidden thresholds must not set it.
2. Replace the threshold's `revealed` flag with a three-state reveal (`hidden`, `points`, `full`). Old data with `revealed: true` loads as `full`. Reset and the baseline in `run.js` must keep the new field.
3. Tests for both, spec sections 5 and 7, and a live check as a player.
