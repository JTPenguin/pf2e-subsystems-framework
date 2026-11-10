---
title: "One clickable state tag for weaknesses and similar modifiers"
kind: feature
status: done
waits_on: none
priority: ⏫
blocked_by: []
source: "Justin's request, 2026-11-09; control picked in the items interview, 2026-11-09"
added: 2026-11-09
updated: 2026-11-09
outcome: "Done 2026-11-09. The state tag is one button with aria-pressed and a tooltip: On/Off toggles, Spent restores. Turn on/off and Restore buttons removed. Applied-but-unspent entries show On (logged in FOLLOW-UPS.md). Checked live as GM on a running challenge."
---
# One clickable state tag for weaknesses and similar modifiers

The on/off control and the on/off indicator should be one element.

**Now:** each modifier in Run mode has a state tag (On, Off, Spent), a separate "Turn on / Turn off" button, and a Restore button for spent entries (`templates/influence-sheet.hbs`).

**Decided (Justin, 2026-11-09):** the state tag is the button.

- Click "On" or "Off" to switch it.
- Click "Spent" to restore it (replaces the Restore button).
- Apply stays a separate button.

**Next step:** make the tag a button with `aria-pressed`, remove the Turn on/off and Restore buttons, and check all three states on a live challenge.
