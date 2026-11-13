---
title: "Audit the Chase preset against the rules"
kind: test
status: ready
waits_on: Claude
priority: ⏬
blocked_by: []
source: "Built 2026-11-11 (Justin's list); cut to data only 2026-11-12; turned into an audit by Justin, 2026-11-12"
added: 2026-11-11
updated: 2026-11-12
---
# Audit the Chase preset against the rules

The Chase preset is built, data only, on the generic framework (spec 14.6, 14.11, 14.12; first full build in commit 9388006). This item checks that a GM can run every chase use case in GM Core's [Chases](https://2e.aonprd.com/Rules.aspx?ID=3049) with it, and records how.

## Use cases to check

Mark each **Covered** (say how), **GM's call** (the GM notes say what to do), or **Gap** (file a new item).

| Use case | Rules | Expected coverage |
|---|---|---|
| Obstacles in order | Short 6, medium 8, long 10 | Subjects in sheet order; Allow multiple subjects off |
| Chase Points per obstacle | Party size −1 or −2, minimum 1; harder ones more | The obstacle's Chase Points counter; a new one is 0 to 3 |
| Approaches | Skill, Perception, save, attack or spell, with DCs; at least one easy | Check rows on the obstacle's action; attacks and spells are the GM's call |
| Degrees of success | +2, +1, 0, −1; never below 0 | GM changes the counter by hand; minimum 0 |
| Automatic help | +1, or +2 if very helpful | Hand change |
| Points don't carry over | Unacted PCs go on to the next obstacle | GM's call |
| Passing | Costs the group 1 CP | Hand change |
| Turn order | Pursued act first | GM's call |
| The other side's pace | One obstacle a round, slower on hard ones | Quarry counter +1 each round, nudged by hand |
| Tracking positions | Tokens, cards or a map for each side | Party and Quarry Track counters on the panel |
| Chase Down / Run Away | Start one obstacle behind or ahead | Starting counter values; GM notes |
| Beat the Clock | Obstacles equal the round limit | Maximum Rounds |
| Competitive | Initiative each round | GM's call |
| Endings | Caught; escape after the last obstacle; three ahead; round limit | GM compares the two tracks; round limit from Maximum Rounds |
| Stuck about 3 rounds | Offer another way or a costly helper | GM's call |
| Revealing DCs | Tell players the DCs, or the difficulty | Check rows' Revealed |
| Split paths and shortcuts | Paths split and rejoin | Not built: check whether categories or hidden subjects cover it |
| Solo chases | Each PC advances alone; crit gives +2 next | Not built: check whether per-PC counters cover it |

## Also check

- The defaults: both tracks start at maximum 6, and a new obstacle's goal is 3. Is that the right start?
- A **player login** sees the current obstacle, its approaches and both tracks, and can roll from the panel. This was never checked.
- Delete the test challenges "SSM Chase check" (old build) and "SSM Chase v2 check" when done.

**Done when:** every row above is marked, each gap has its own item, the player login check has run, and the test challenges are gone.
