---
title: "Start doesn't tick thresholds the starting value already meets"
kind: work
status: done
waits_on: none
outcome: "Done 2026-11-13. Justin chose: Start ticks thresholds already met, with notices. Checked by a test and live in Foundry."
blocked_by: []
source: "Found building Ruins of the Radiant Siege's research challenge in the test world, 2026-11-13"
added: 2026-11-13
updated: 2026-11-13
---
# Start doesn't tick thresholds the starting value already meets

Thresholds tick only when a counter changes (`adjustCounter` in `scripts/challenge/run.js`). Start (`startRun`) doesn't check them, so a threshold at or below a counter's starting value never ticks and never sends its GM notice.

**Where it shows.** The Research preset's Days counter starts at 1, so round 1 is day 1. *Ruins of the Radiant Siege* has a timed event at 1 day. With a threshold at 1 on Days, Start leaves it unticked, while the events at 3, 7 and 14 tick as the rounds pass.

**Options.**

| Option | Effect |
|---|---|
| Start ticks thresholds already met, with notices | Day 1's event fires at Start. A Reputation faction set to +16 before Start would tick Liked and Admired too |
| Days starts at 0 ("days passed") | No framework change. "1 Day" then fires at round 2, which also fits the book's wording |
| Leave it | The GM reads day 1's event off the sheet |

## Results

**Justin's choice (2026-11-13):** Start ticks them.

`startRun` in `scripts/challenge/run.js` now settles every counter's thresholds, the subjects' too, against its value once the baseline is taken, and returns their notices. Reset clears them again, since the baseline holds them unticked. Per-PC counters have no thresholds and are skipped. Both-ways counters already followed their value before Start, so nothing changes for them. Spec 14.8 says so.

**Checked.** A test in `tools/test.mjs` covers the notices, the thresholds left unticked, a subject's counter, and Reset. Live in the "test" world, 2026-11-13: Reset and Start on "Researching the Radiant Spark" gave the notice "Days reached 1" with its GM text and ticked the day-1 event. The challenge was left running on the panel, as Justin had it, and the Gamemaster logged out.
