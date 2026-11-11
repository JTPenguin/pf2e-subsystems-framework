---
title: "Add the Infiltration preset"
kind: feature
status: ready
waits_on: Claude
blocked_by: [generic-subsystem-shared-mechanics]
source: "Justin's list of items, 2026-11-11; scope answers from Justin, 2026-11-11"
added: 2026-11-11
updated: 2026-11-11
---
# Add the Infiltration preset

Infiltration as a preset of the generic challenge from [[generic-subsystem-shared-mechanics]]. Rules: GM Core, [Infiltration](https://2e.aonprd.com/Rules.aspx?ID=3059) and its subpages.

## In the first version

| Part | Rules | Built from |
|---|---|---|
| **Obstacles** | Infiltration Points (IP) to overcome. Individual (each PC earns IP alone) or group (pooled). Overcome once per objective. | Subjects; individual subjects track per-PC points |
| **Obstacle checks** | Crit success 2 IP, success 1 IP, failure +1 AP, crit failure +2 AP | The outcome table |
| **Awareness Points (AP)** | One party-wide pool. +1 at the end of each round. Thresholds, for example: 5 AP DCs +1, 10 AP complication, 15 AP DCs +2 in total, 20 AP the infiltration fails. | A counter with a per-round change, and thresholds that carry DC changes (Justin chose automatic) |
| **Complications and opportunities** | A complication is triggered by an AP threshold or a crit failure, and must be cleared before the affected PCs go back to obstacles. An opportunity works like an obstacle but gives no IP: it gives a benefit such as lowering AP. | Subjects with their own actions; a trigger links a threshold to a complication |
| **Edge Points (EP)** | When a PC fails or critically fails an obstacle or complication check, they can spend 1 EP to succeed instead. Some EP only work in one situation (paperwork, a disguise). | A counter, plus a spend control on the GM's chat card |
| **Preparation** | Downtime, before the infiltration: Bribe Contact, Forge Documents, Gain Contact, Gossip, Scout Location, Secure Disguises. Four of them are secret. A failed Forge Documents gives an EP that looks real but does nothing; a crit failure turns its use into a crit failure. | Actions on the panel, rolled as secret checks. Dud EP are seen only by the GM. (Justin chose to run preparation in the module.) |

## Not in the first version

- Several objectives in sequence, with each PC moving on alone. One objective only for now.

## Open questions for the spec step

- Preparation runs before Start? Proposed: a Preparation phase, with its own actions on the panel, then Start begins round 1.
- How a player spends an EP: proposed, the GM presses Spend Edge on the failed roll's card, after the player asks. A player-side button would need a socket.
- Dud and situational EP: proposed, each EP is a row (source, situation, real or dud). Players see a count and the situation; only the GM sees a dud.

**Done when:** a GM can run an infiltration with preparation, obstacles, Awareness and Edge Points, and players can roll its actions from the panel, including Forge Documents. Check it in Foundry with a live test challenge and a player login.
