---
title: 'Show values as "3/6" when they have a maximum'
kind: feature
status: done
waits_on: Claude
priority: 🔼
blocked_by: []
outcome: "Done 2026-11-12: sheet and panel show 3/6, +12 or 3; range labels removed. Checked live (panel Quarry 2/9, no header label) and tests pass."
source: "Justin's list of items, 2026-11-12; interview with Justin, 2026-11-12"
added: 2026-11-12
updated: 2026-11-12
---
# Show values as "3/6" when they have a maximum

In Run view a counter shows its value, and separately "(0 to 6)". Show it as one value, "3/6", instead. This also covers the panel's Number display (was number-display-maximum) and subject points (was subject-points-ratio-display).

## Decided (Justin, 2026-11-12)

| Limits | Shows |
|---|---|
| A maximum | "3/6" |
| Only a minimum, or none | "3" |
| Both-ways track | "+12", no ratio |

- Applies in Run view on the sheet and in the panel's Number display. Proposed: also the number beside a panel bar, steps or track, so every value reads the same.
- The "(0 to 6)", "(at least 0)" and "(up to 6)" labels go from the Run view. `rangeLabel` stays only if the Edit tab uses it.
- Once subjects own counters (counter-points-as-generic-counter), subject points follow the same rule.

**Done when:** each case above shows correctly on the sheet and panel, checked live, and tests pass.
