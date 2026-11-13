---
title: "Show Track counters as one line with segment markers"
kind: feature
status: done
waits_on: none
priority: 🔽
blocked_by: []
source: "Justin's list of items, 2026-11-12; interview with Justin, 2026-11-12"
added: 2026-11-12
updated: 2026-11-12
outcome: "Track draws as a thin line with a tick per value, a rounded square on the value, and revealed thresholds as taller red ticks that turn green once reached; spec 14.12 updated. Checked live on a Chase preset's Party and Quarry counters, 2026-11-12."
---
# Show Track counters as one line with segment markers

Today Track draws one box per value, with the value's box filled.

## Decided (Justin, 2026-11-12)

- A thin line with a tick for each value from the minimum to the maximum.
- A small rounded square sits on the current value.
- A revealed threshold's tick is taller and red; green once reached. Hidden thresholds leave no mark.
- The rest of spec 14.12 stays: no maximum, or more than 40 values, draws a bar.

**Changes:** the slots markup in `templates/challenge-panel.hbs` and `.ssm-panel-slots.track` in `styles/subsystems.css`. Steps keeps its boxes. Update spec 14.12's Track row.

**Done when:** Track draws as described on the panel, checked live on the Chase preset's Party and Quarry counters.
