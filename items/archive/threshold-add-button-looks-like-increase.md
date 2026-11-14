---
title: "Move adding a threshold to its own row under the counter"
kind: work
status: done
waits_on: none
priority: ⏫
blocked_by: []
added: 2026-11-13
updated: 2026-11-13
outcome: "The threshold + left the counter row. Every counter that can hold thresholds (not per-PC) now has a caret, and opening it shows an Add threshold row under its thresholds, so a counter with none can still get one. Checked in Foundry."
source: "Justin's words, 2026-11-13: the + that adds a threshold to a counter looks like the + that increases the counter, in the challenge window; fix picked by Justin in triage, 2026-11-13"
---
# Move adding a threshold to its own row under the counter

In the challenge window, a counter's row reads − 3 + + edit delete. The second + adds a threshold, and it looks the same as the + that increases the counter (`ssmCounterRun` in `templates/challenge-sheet.hbs`, lines 69–73). A GM can read one as the other and change the wrong thing.

## Decision (Justin, 2026-11-13)

Remove the threshold + from the counter's row. Add an "Add threshold" row under the counter's thresholds, shown while the counter is open, like the subsection add buttons elsewhere on the sheet.

## Build notes

- A counter with no thresholds has no caret today (`ssmCaret` gets an empty action when `thresholds.length` is 0), so it can never open. Give every counter a caret, or show the add row under a counter with no thresholds. Pick one and say which.
- Per-PC counters have no threshold + today (`{{#unless perPc}}`). Keep that unless Justin says otherwise.

## Done when

The counter's row has only one +, the increase. The GM can add a threshold from the new row under the counter, including on a counter with no thresholds yet. Checked in the challenge window in Foundry.
