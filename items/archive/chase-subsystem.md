---
title: "Audit the Chase preset against the rules"
kind: test
status: done
waits_on: none
priority: ⏬
blocked_by: []
source: "Built 2026-11-11 (Justin's list); cut to data only 2026-11-12; turned into an audit by Justin, 2026-11-12"
added: 2026-11-11
updated: 2026-11-13
outcome: "Done 2026-11-13. Every chase use case is covered or the GM's call; no framework gaps. The GM notes were then rewritten as module guidance: chase-gm-notes-missing-rules. Player login checked live as Test Player 1. The old test challenges were already gone."
---
# Audit the Chase preset against the rules

The Chase preset is built, data only, on the generic framework (spec 14.6, 14.11, 14.12; first full build in commit 9388006). This item checks that a GM can run every chase use case in GM Core's [Chases](https://2e.aonprd.com/Rules.aspx?ID=3049) with it, and records how.

## Results

Checked against GM Core on Archives of Nethys and the preset in `scripts/challenge/data.js` and `lang/en.json`, 2026-11-13. "In notes" is the GM notes at the time of the audit. They were then rewritten as guidance on using the module, leaving GM Core's rules out (Justin, 2026-11-13): see [[chase-gm-notes-missing-rules]].

| Use case | Rules | Result | How | In notes |
|---|---|---|---|---|
| Obstacles in order | Short 6, medium 8, long 10 | **Covered** | Subjects in sheet order; Allow multiple subjects is off, so revealing the next obstacle hides the last | Yes |
| Chase Points per obstacle | Half at party size −1, half at −2, minimum 1; harder ones more | **Covered** | The obstacle's Chase Points counter, 0 to 3 (a party of 4); the GM edits the maximum | No (only "about one fewer" in a code comment) |
| Approaches | Skill, Perception, save, attack or spell; at least one easy | **Covered** | Check rows: skill, Perception, Lore or a save. Attacks and spells are the GM's call | Yes |
| Degrees of success | +2, +1, 0, −1 | **GM's call** | + and − on the obstacle's counter | No |
| Never below 0 | | **Covered** | The counter's minimum is 0 | — |
| Automatic help | +1, or +2 if very helpful | **GM's call** | + on the counter | No |
| Points don't carry over | Unacted PCs go on to the next obstacle | **GM's call** | | Yes |
| Passing | Costs the group 1 CP | **GM's call** | − on the counter | Yes |
| Turn order | Pursued act first | **GM's call** | | No |
| Round length | Set at the start | **GM's call** | No field (removed earlier) | No |
| The other side's pace | One obstacle a round, slower on hard ones | **Covered** | Quarry +1 each round; the GM nudges it | Yes |
| Tracking positions | One token per side | **Covered** | Party and Quarry Track counters on the panel | Yes |
| Chase Down / Run Away | Start one obstacle behind or ahead | **Covered** | Party 1, Quarry 2 by default; Run Away renames Quarry and starts it at 0 | Yes |
| Beat the Clock | Obstacles equal the round limit | **Covered** | Maximum Rounds; Next round stops at the maximum | Yes |
| Competitive | Initiative each round | **GM's call** | | Yes |
| Endings | Caught; escape after the last obstacle; three ahead; round limit | **GM's call** | The GM compares the tracks. The track can't go past the last obstacle, so the GM marks the last obstacle Complete (Justin, 2026-11-13) | Partly: "past the last" can't be shown |
| Stuck about 3 rounds | Another way, or costly help | **GM's call** | | Yes |
| Revealing DCs | Tell players the DCs or the difficulty | **GM's call** | The panel never shows DCs (Justin, 2026-11-09). Check rows' Revealed shows the approach; the GM says the DC or difficulty | No |
| Split paths and shortcuts | Paths split and rejoin | **GM's call** | A subject category per path; Allow multiple subjects on at a fork. No new feature needed | No |
| Solo chases | One success moves a PC on; a crit gives +2 on the next check | **GM's call** | Party counter set to Per PC; Allow multiple subjects on. The +2 is a circumstance bonus the player adds in the roll dialog | No |

**Defaults.** Both tracks at maximum 6 suit a short chase, GM Core's shortest. A new obstacle at 0 to 3 suits a party of 4. Both are right as a start. A fresh Chase challenge gets the GM notes, Party 1/6, Quarry 2/6 (+1 a round), and one revealed obstacle with Overcome.

**Player login, checked live 2026-11-13** as Test Player 1 in the "test" world. With a two-obstacle chase running (Crowd: Athletics 15, Society 13, Reflex 14; Fruit Cart hidden), the panel showed the Party and Quarry tracks, Round 1, the Crowd's description, Chase Points 0/3 and the three approaches, with no DCs and no Fruit Cart. A Reflex roll from the panel opened PF2e's dialog and rolled a saving throw at DC 14; the player's chat card showed "Failure" and no DC. The page used for the check ("New Challenge") was put back as it was. The test roll is still in chat.

**Test challenges.** "SSM Chase check" and "SSM Chase v2 check" were already gone; the world holds only "New Challenge".
