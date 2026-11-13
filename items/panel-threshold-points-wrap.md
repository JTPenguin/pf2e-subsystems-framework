---
title: "Bug: negative threshold points wrap on the panel"
kind: work
status: ready
waits_on: Claude
blocked_by: []
source: "Found in the Reputation live check, 2026-11-13 (items/archive/reputation-subsystem.md); logged on Justin's request, 2026-11-13"
added: 2026-11-13
updated: 2026-11-13
---
# Bug: negative threshold points wrap on the panel

The panel's threshold list gives each row's points a column too narrow for three characters. On a both-ways counter, "−30" and "−15" break onto one character per line ("−", "3", "0"). Seen on the Reputation preset's tiers, in a column of normal width.

**Where:** the `.ssm-panel-threshold` flex row in `styles/subsystems.css` (around line 215). The points (`.ssm-panel-threshold-points`, in `ssmPanelThresholds` in `templates/challenge-panel.hbs`) have no rule of their own, so the flex row shrinks them when the text is long.

**Next step:** let the points column fit its widest value, without the text wrapping. Check it live on a Reputation challenge at −30 and +30, and on a counter with one-digit thresholds.
