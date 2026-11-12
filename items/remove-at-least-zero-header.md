---
title: "Remove the range label from the subject header in Run view"
kind: work
status: ready
waits_on: Claude
priority: 🔼
blocked_by: []
source: "Justin's list of items, 2026-11-12; interview with Justin, 2026-11-12"
added: 2026-11-12
updated: 2026-11-12
---
# Remove the range label from the subject header in Run view

In Run view, the subject header shows its limits, such as "(AT LEAST 0)" on a chase obstacle. Remove it. A maximum shows as "3/6" instead (counter-ratio-display-run-view).

**Change:** drop `subject.rangeLabel` from the header in `templates/challenge-sheet.hbs` and from the subject view in `sheet.js`. Build with counter-ratio-display-run-view.

**Done when:** no subject header shows a range label, checked live on a chase obstacle.
