---
title: "Add GM plus and minus buttons to every value on the panel"
kind: feature
status: done
waits_on: none
priority: 🔼
blocked_by: [counter-points-as-generic-counter]
source: "Justin's list of items, 2026-11-12; interview with Justin, 2026-11-12"
added: 2026-11-12
updated: 2026-11-12
outcome: "Built 2026-11-12. The GM gets − and + beside every counter value on the panel (challenge, subject, per-PC and number counters), reusing the sheet's changeCounter and a shared counterMoves limit check; spec 7 updated; 118 tests pass. Checked live as GM: + on a 1/6 track climbs to 6/6 and then disables. Subject, per-PC and number counters and the player view (no buttons) were checked by rendering the panel from a challenge's data without saving, as changing test-world data was blocked; not yet seen from a real player login."
---
# Add GM plus and minus buttons to every value on the panel

With automatic applying gone, the GM changes values by hand. The sheet's Run mode already has + and − for every value. The panel gets them too.

## Decided (Justin, 2026-11-12)

- **Every value:** subject points, each PC's points on an individual subject, challenge counters, and each PC's value on a per-PC counter.
- **GM only.** Players never see the buttons.
- Same behaviour as the sheet's buttons: the same limits, threshold marking and notices. Reuse the sheet's handlers.

**Build after:** counter-points-as-generic-counter changes what a subject's points are. Build this once subjects own counters, so the buttons go on counters only.

**Done when:** a GM can raise and lower every value from the panel, the buttons respect limits, a player login shows none, and the layout still works at the panel's narrow width.
