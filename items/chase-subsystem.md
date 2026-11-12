---
title: "Add the Chase preset"
kind: feature
status: in-progress
waits_on: Justin
blocked_by: []
source: "Justin's list of items, 2026-11-11; scope answers from Justin, 2026-11-11"
added: 2026-11-11
updated: 2026-11-11
---
# Add the Chase preset

Chase as a preset of the generic challenge from [[generic-subsystem-shared-mechanics]]. Rules: GM Core, [Chases](https://2e.aonprd.com/Rules.aspx?ID=3049) and its subpages.

## In the first version

| Part | Rules | Decision |
|---|---|---|
| **Obstacles** | In order. Each needs a number of Chase Points (CP), and has two or more approaches (skill, Perception, sometimes a save or attack) with DCs | Subjects with a goal, in the GM's order on the sheet; the GM reveals the next by hand. Saves are check rows. Attacks are left to the GM. |
| **Checks** | Crit success 2 CP, success 1 CP, failure 0, crit failure −1 CP. CP never drop below 0. Extra CP don't carry over; PCs who haven't acted can go on to the next obstacle | The outcome table; subject minimum 0 |
| **Passing** | A PC who passes or can't act costs the group 1 CP | A GM control |
| **The other side** | Moves at a set pace: usually one obstacle a round, slower on hard ones | Proposed after the framework mapping: a counter that changes by +1 each round, nudged by hand. Earlier plan: each obstacle has an NPC pace and Next round moves them (Justin). Settle at the spec step. |
| **Chase types** | Chase Down, Run Away, Beat the Clock, Competitive | Starting positions and end checks |
| **Ending** | Pursuers reach the quarry's obstacle; the quarry clears the last obstacle; or the quarry gets about three obstacles ahead | A notice to the GM |
| **Panel** | | Only the current obstacle and its approaches, plus a progress track showing both sides (Justin) |

## Not in the first version

- Split paths and shortcuts.
- Solo chase rules (each PC advances alone).

## Settled (Justin, 2026-11-11)

| Question | Answer |
|---|---|
| The other side's pace | A counter, +1 each round, nudged by hand |
| The panel | Only the current obstacle: the first revealed one that isn't Complete |
| Progress track | Yes: a row of slots, hidden obstacles as "?", with party and other-side markers |
| Chase types | One Chase preset, with a type field in the Edit tab |
| Competitive initiative; being stuck | Notices to the GM, as proposed |

The full design is spec 14.11.

## Notes kept from the spec step

- Preparation (*Punks in a Powderkeg*'s Scout a Route) is a separate challenge, as for Infiltration; Preparation Points are a per-PC counter spent with the roll card's degree buttons.


**Done when:** a GM can run a chase from a sheet, and players can take its actions from the panel. Check it in Foundry with a live test chase and a player login.

## Where it stands (2026-11-11)

- **Built:** the Chase preset, the chase type and other-side settings, the panel's current-obstacle view and progress track, the sheet's Chase line, and the end, stuck, initiative and last-round notices. Spec 14.6, 14.10 and 14.11 are updated.
- **Checked:** `tools/test.mjs` (136 pass, 5 new), `tools/check-load.mjs`. Live in the test world as GM and Test Player 1: made a chase from the preset; switching to Run Away renamed the Quarry to Pursuers at 0; started it; both panels showed the track with hidden obstacles as "?" and only the first obstacle. The player rolled Athletics from the panel; the GM applied Critical Success (+2 CP) from the roll card, then + on the sheet cleared the obstacle. The panel emptied until the GM revealed Rooftops, then showed it. Moving the Pursuers to obstacle 2 gave "The Pursuers catch the party." and the sheet's Chase line showed it.
- **Your calls:** a new obstacle's goal is 3 (GM Core says one or two fewer than the party size; edit per obstacle). Chase Down counts as caught as soon as the party reaches the quarry's obstacle, so a quarry that starts on the party's obstacle is caught at once.
- **Not built:** split paths, shortcuts, solo chases.
- **Test challenge** "SSM Chase check" is in the test world and on the panel (it took the panel from "SSM Infiltration check", which is still running). Delete it when done.
