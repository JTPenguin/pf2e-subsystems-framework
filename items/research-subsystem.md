---
title: "Add the Research preset"
kind: feature
status: ready
waits_on: Claude
priority: ⏬
blocked_by: []
source: "Justin's list of items, 2026-11-11"
added: 2026-11-11
updated: 2026-11-12
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

## Open questions for the spec step

- Should Apply stop at a check's Maximum RP on its own? Proposed: yes, and the card says so.
- RP is party-wide in the rules, but a library has several areas. Proposed: points live on the challenge, and each area tracks only how much it has given towards its maximum.

**Done when:** a GM can run a research challenge, and players can roll its checks from the panel. Check it in Foundry with a live test challenge and a player login.

**Note (2026-11-12):** outcome tables and an action's maximum points are being removed (remove-roll-card-point-automation), so the plan above no longer works as written. The GM tracks each area's Maximum RP by eye, or with a counter's maximum once subjects own counters (counter-points-as-generic-counter). Revisit when Research is built.
