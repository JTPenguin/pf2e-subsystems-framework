---
title: "Split the GM window's run strip into two rows"
kind: feature
status: done
waits_on: none
priority: 🔼
added: 2026-11-09
updated: 2026-11-09
outcome: "Run strip split into two rows (controls and round, then party and Roll as). Checked live in the GM window at 500px and 900px wide."
source: "Justin's request, 2026-11-09; layout picked in interview, 2026-11-09"
---
# Split the GM window's run strip into two rows

The run strip on the GM window (Run view) wraps in a way Justin doesn't want. This is the GM window, not the player panel.

**Layout:**

| Row | Contents |
|---|---|
| 1 | Start / End / Reset / Hide panel, then the round label and the Previous/Next round buttons |
| 2 | Party chips, then Roll as |

**Next step:** split the strip in `templates/influence-sheet.hbs` into the two rows, and check it at a narrow and a wide window size.
