---
title: "Remove Society as a universal Discovery skill"
kind: feature
status: done
waits_on: none
blocked_by: []
source: "Justin's request, 2026-11-09"
added: 2026-11-09
updated: 2026-11-09
outcome: "Done 2026-11-09. Only Perception is universal. Checked live: Society hidden on the player panel until revealed from the sheet's eye toggle."
---
# Remove Society as a universal Discovery skill

Only Perception stays universal. A Society Discovery row then works like any other skill: hidden on the panel until the GM reveals it, with an eye toggle on the sheet.

**Now:** `UNIVERSAL_DISCOVERY` in `scripts/subsystems/influence/data.js` is Perception and Society. The spec records this as Justin's decision (sections 2 and 7).

**Next step:**

1. Drop `"society"` from `UNIVERSAL_DISCOVERY`.
2. Update the tests in `tools/test.mjs` that expect Society to be universal.
3. Update `docs/dev/spec.md`: the "Hidden by default" decision, the Discovery skills row in section 7, and the panel sketch.
4. Check it: run `tools/test.mjs`, then in Foundry confirm a Society row is hidden on the panel until revealed. Existing challenges with an unrevealed Society row will hide it, which is the intent.
