---
title: "Read-only modifiers on the sheet, edited in their own window"
kind: feature
status: done
waits_on: none
priority: 🔽
blocked_by: []
source: "Justin's request, 2026-11-09; scope set in the items interview, 2026-11-09"
added: 2026-11-09
updated: 2026-11-09
outcome: "Done 2026-11-09. Modifiers are read-only cards in the Edit tab and edited in their own window (one per modifier), opened from Edit or Run (GM). Saving writes only changed fields onto the latest data. Checked live as GM: sheet and panel update; outside edits are kept."
---
# Read-only modifiers on the sheet, edited in their own window

Treat modifiers (weaknesses, resistances, penalties and adjustments) like attacks or abilities on a monster sheet: read-only on the sheet, edited in their own window.

**Decided (Justin, 2026-11-09):** modifiers only. Thresholds, counters and skills stay inline in the Edit tab.

**Open:** whether the window can open from Run mode too, or only from Edit. Default: from both, since a GM may need to fix a modifier mid-run.

**Next step:** build a small application for one modifier (name, kind, duration, player and GM text, effects), show each modifier as a read-only row in the Edit tab with an edit button, and check that saving the window updates the sheet and the player panel.
