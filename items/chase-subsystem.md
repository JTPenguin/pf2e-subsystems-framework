---
title: "Add the Chase preset"
kind: feature
status: in-progress
waits_on: Justin
priority: ⏬
blocked_by: []
source: "Justin's list of items, 2026-11-11; scope answers from Justin, 2026-11-11"
added: 2026-11-11
updated: 2026-11-12
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

- Preparation (*Punks in a Powderkeg*'s Scout a Route) is a separate challenge, as for Infiltration; Preparation Points are a per-PC counter the GM spends by hand (the roll card's degree buttons were removed on 2026-11-12).


**Done when:** a GM can run a chase from a sheet, and players can take its actions from the panel. Check it in Foundry with a live test chase and a player login.

## Cut back to data only (Justin, 2026-11-12)

The first build had chase-only logic: a type field, end and reminder notices, a current-obstacle panel view, a progress track and a Chase line on the sheet. It was cut, so every subsystem runs on the generic framework with no preset-specific code. The first build is in commit 9388006.

| Was automated | Now |
|---|---|
| Chase type field | GM notes say how to set up each type |
| End, lead, stuck, initiative and last-round notices | The GM's call; GM notes list the rules |
| Panel shows only the current obstacle | Allow multiple subjects is off: revealing the next obstacle hides the cleared one (spec 14.12) |
| Progress track with both markers | Party and Quarry counters, each drawn as a Track (spec 14.12). The GM adds 1 to Party when an obstacle clears. |
| Chase line on the sheet | Gone: the sheet shows the obstacles and counters |

## Where it stands (2026-11-12)

- **Built:** the data-only Chase preset, Allow multiple subjects, and counter displays (Hidden, Auto, Number, Bar, Steps, Track). Spec 14.6, 14.11 and 14.12 are updated.
- **Checked:** `tools/test.mjs` (136 pass), `tools/check-load.mjs`. Live in the test world as GM: a new chase has Party and Quarry on tracks and Allow multiple subjects off; Display set to Hidden in the Edit tab hid Quarry, and Track brought it back; revealing Rooftops in Run mode hid Crowded market, and the panel showed only Rooftops with both tracks; Steps and a threshold mark drew correctly. Not checked with a player login.
- **Your calls:** both counters start with maximum 6; set them to the number of obstacles. A new obstacle's goal is 3.
- **Not built:** split paths, shortcuts, solo chases.
- **Test challenges** "SSM Chase check" (old build, still running, off the panel) and "SSM Chase v2 check" (on the panel) are in the test world. Delete them when done.
