---
title: "Add GM plus and minus buttons to every value on the panel"
kind: feature
status: ready
waits_on: Claude
priority: 🔼
blocked_by: [counter-points-as-generic-counter]
source: "Justin's list of items, 2026-11-12; interview with Justin, 2026-11-12"
added: 2026-11-12
updated: 2026-11-12
---
# Add GM plus and minus buttons to every value on the panel

With automatic applying gone, the GM changes values by hand. The sheet's Run mode already has + and − for every value. The panel gets them too.

## Decided (Justin, 2026-11-12)

- **Every value:** subject points, each PC's points on an individual subject, challenge counters, and each PC's value on a per-PC counter.
- **GM only.** Players never see the buttons.
- Same behaviour as the sheet's buttons: the same limits, threshold marking and notices. Reuse the sheet's handlers.

**Build after:** counter-points-as-generic-counter changes what a subject's points are. Build this once subjects own counters, so the buttons go on counters only.

**Done when:** a GM can raise and lower every value from the panel, the buttons respect limits, a player login shows none, and the layout still works at the panel's narrow width.
