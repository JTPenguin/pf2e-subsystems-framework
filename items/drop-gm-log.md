---
title: "Remove the log from the GM sheet"
kind: feature
status: ready
waits_on: Claude
blocked_by: []
source: "Justin's request, 2026-11-09"
added: 2026-11-09
updated: 2026-11-09
---
# Remove the log from the GM sheet

The GM doesn't need the log in Run mode.

**Now:** the sheet shows a Log section at the bottom of Run mode and a log entry count in the header (`templates/influence-sheet.hbs`). `addLog` in `scripts/subsystems/influence/run.js` writes an entry for every point change, reveal, round and modifier.

**Next step:**

1. Remove the Log section and the header count from the sheet.
2. Default: stop writing the log too, and remove `run.log` from the model and `addLog`, so nothing grows unseen. Check that nothing else reads the log first, such as undo or the reroll handling.
3. Update the tests, the lang strings and spec sections 5 and 8.
4. Check it: run `tools/test.mjs` and `tools/check-load.mjs`, then open a running challenge in Foundry.
