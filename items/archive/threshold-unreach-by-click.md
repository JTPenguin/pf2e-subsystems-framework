---
title: "Let the GM un-reach a threshold by clicking its Reached tag"
kind: feature
status: done
waits_on: none
priority: ⏫
blocked_by: []
source: "Justin's request, 2026-11-09; corrected in the items interview, 2026-11-09"
added: 2026-11-09
updated: 2026-11-09
outcome: "Done 2026-11-09. In Run mode the Reached tag is a GM-only toggle button both ways (toggleReached in run.js, tested). Dropping points still never un-reaches. Checked live with the GM and Test Player 1: the panel's check mark drops and returns."
---
# Let the GM un-reach a threshold by clicking its Reached tag

After a misclick or a misread roll, the GM needs to undo a threshold that was reached by mistake. Today that is not possible in Run mode.

**Now:** `changePoints` in `scripts/subsystems/influence/run.js` marks thresholds only on a gain, so "reached" never clears when points drop. Only the Edit tab's Reached checkbox can clear it.

**Decided (Justin, 2026-11-09):**

- Keep the current rule: dropping points does not un-reach a threshold.
- In Run mode, the Reached tag on a threshold is a button. Clicking it clears "reached". Whether the GM can also click to mark a threshold reached by hand is open; default to a toggle both ways.

**Next step:** add a `toggleReached` rule in `run.js` with a test in `tools/test.mjs`, make the tag a button in `templates/influence-sheet.hbs`, and check it live: reach a threshold, click the tag, confirm the player panel drops the check mark.
