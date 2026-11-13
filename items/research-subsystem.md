---
title: "Add the Research preset"
kind: feature
status: ready
waits_on: Claude
priority: ⏬
blocked_by: []
source: "Justin's list of items, 2026-11-11; plan refreshed 2026-11-12"
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

## Plan on today's framework (proposed, 2026-11-12)

Outcome tables and maximum points are gone, and subjects now own counters (spec 14.13). So:

- **Research Points:** a challenge counter, shown to players, with the RP thresholds.
- **Library areas:** subjects, each with one action holding its skills and DCs, and an "RP given" counter whose maximum is the area's Maximum RP. The GM adds to both counters by hand.
- **Days:** a challenge counter, +1 each round, with the timed events as thresholds.
- **False discoveries:** the GM writes them in the area's GM text.

Open question for the build: is two hand changes per roll (the pool and the area) acceptable, or does the area's maximum belong in its GM text only?

**Done when:** a GM can run a research challenge, and players can roll its checks from the panel. Check it in Foundry with a live test challenge and a player login.
