---
title: "Add the Research preset"
kind: feature
status: done
waits_on: none
outcome: "Done 2026-11-13. Built as the Research preset, data only. Checked by tests and live in Foundry as Gamemaster and Test Player 1. One display leak found live and fixed (Days as a number)."
priority: ⏬
blocked_by: []
source: "Justin's list of items, 2026-11-11; plan refreshed 2026-11-12"
added: 2026-11-11
updated: 2026-11-13
---
# Add the Research preset

Research as a preset of the generic challenge from [[generic-subsystem-shared-mechanics]]. Rules: GM Core, [Research](https://2e.aonprd.com/Rules.aspx?ID=3045) and its subpages.

## Rules to cover

| Part | Rules | Built from |
|---|---|---|
| **Research Points (RP)** | One pool for the party | Challenge-wide points |
| **Research checks** | Placed around the library. Each lists skills with DCs, and a Maximum RP: once reached, that check gives no more | Subjects (library areas) with one action each, and the action's maximum points |
| **Research activity** | Crit success 2 RP, success 1 RP, failure 0, crit failure a false discovery and −1 RP | The outcome table; the false discovery is a note for the GM |
| **Thresholds** | RP needed and what it gives, from fewest RP to most | Thresholds |
| **Timed events** | Triggered by time, not RP | A "Days" counter that changes by +1 each round, with thresholds (checked against *Ruins of the Radiant Siege*, 2026-11-11) |
| **Round length** | 10 minutes to a day, set by the GM | The GM's notes (round length was removed) |

## Plan on today's framework (proposed, 2026-11-12)

Outcome tables and maximum points are gone, and subjects now own counters (spec 14.13). So:

- **Research Points:** a challenge counter, shown to players, with the RP thresholds.
- **Library areas:** subjects, each with one action holding its skills and DCs, and an "RP given" counter whose maximum is the area's Maximum RP. The GM adds to both counters by hand.
- **Days:** a challenge counter, +1 each round, with the timed events as thresholds.
- **False discoveries:** the GM writes them in a secret block in the area's description.

Open question for the build, settled 2026-11-13: two hand changes per roll (see Results).

**Done when:** a GM can run a research challenge, and players can roll its checks from the panel. Check it in Foundry with a live test challenge and a player login.

## Results

Built 2026-11-13 as the Research preset in `scripts/challenge/data.js` and `lang/en.json`, with a test in `tools/test.mjs` and a row in spec 14.6. Rules checked against GM Core on Archives of Nethys (Research, ID 3045 to 3048).

**Justin's choices (2026-11-13).**

| Question | Choice |
|---|---|
| Each area's Maximum RP | An RP Gathered counter on the area; the GM adds to it and to Research Points by hand |
| Players see RP Gathered | Yes, as a bar |
| Days | Shown; timed events hidden until revealed |
| New areas | All start revealed |

**How the rules fit.**

| Rule | Result | How |
|---|---|---|
| Research Points | **Covered** | A challenge counter, minimum 0, shown |
| Research checks and DCs | **Covered** | One Research action per area, one check row per skill |
| Maximum RP | **Covered** | RP Gathered, 0 to 5 by default; the GM sets the maximum. The counter stops at it |
| Crit success 2, success 1, crit failure −1 | **GM's call** | + and − by hand; rolls change nothing |
| False discovery | **GM's call** | A secret block in the area's description (areas have no GM text field) |
| Thresholds | **Covered** | The GM adds them to Research Points; they tick as RP rises, with a GM notice |
| Timed events | **Covered** | Days, starting at 1, +1 each round; events are hidden thresholds |
| Round length and time limit | **GM's call** | GM notes; Maximum Rounds for the limit |
| Extra skill at the highest DC | **GM's call** | Add a check row |

**Live check, 2026-11-13**, in the "test" world. As Gamemaster: created a challenge from the create dialog's Research button, added a Society DC 15 check, an RP threshold at 2 (shown) and a Days event at 3 (hidden). Started it, added 2 RP and 2 RP Gathered (2/5), and advanced to round 3: Days reached 3, the event ticked, and the GM got a notice for each threshold. As Test Player 1: the panel showed Research Points with the reached threshold, Days, and the area's RP Gathered bar; the hidden event's text was nowhere in the page. Rolled Society from the panel: the chat card read "Research: Library Area 1" against the DC. The test challenge was deleted, the earlier "New Challenge" put back on the panel, and both users logged out.

**Found and fixed.** With a hidden event, Days drew as a bar on the player panel, and the bar's end showed where the event sat. Days now uses the Number display. Checked by the test; not re-checked live.
