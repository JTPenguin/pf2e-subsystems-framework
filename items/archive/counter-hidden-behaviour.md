---
title: "Separate a counter's visibility from its display style"
kind: work
status: done
outcome: "Display holds styles only; a Revealed checkbox beside it, and the Run-mode eye, set visibility. Per-PC counters show only Revealed. Tests pass (117); checked live on SSM Chase v2 check, 2026-11-12."
waits_on: none
priority: ⏫
blocked_by: []
source: "Justin's list of items, 2026-11-12; interview with Justin, 2026-11-12"
added: 2026-11-12
updated: 2026-11-12
---
# Separate a counter's visibility from its display style

Today Display = Hidden keeps the counter's old style in secret, and the Run-mode eye brings that style back. The GM can't see what will come back.

## Decided (Justin, 2026-11-12)

Go back to the old behaviour:

- The Display list holds only styles: Auto, Number, Bar, Steps, Track. Hidden leaves it.
- A **Revealed** checkbox in the Edit tab, beside Display, controls visibility. The Run-mode eye does the same.
- A per-PC counter has no Display list, only Revealed.

**Changes:** `HIDDEN_DISPLAY` and the merged `show` list in `sheet.js` and `data.js`, the Edit template, `lang/en.json`, and spec 14.12's Hidden row.

**Done when:** setting a style and hiding the counter are separate controls; the eye shows the style picked in Edit; tests pass and it is checked live in the sheet.
