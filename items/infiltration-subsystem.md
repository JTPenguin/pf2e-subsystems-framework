---
title: "Add the Infiltration preset"
kind: feature
status: in-progress
waits_on: Justin
blocked_by: []
source: "Justin's list of items, 2026-11-11; scope answers from Justin, 2026-11-11"
added: 2026-11-11
updated: 2026-11-11
---
# Add the Infiltration preset

Infiltration as a preset of the generic challenge from [[generic-subsystem-shared-mechanics]]. Rules: GM Core, [Infiltration](https://2e.aonprd.com/Rules.aspx?ID=3059) and its subpages.

## In the first version

| Part | Rules | Built from |
|---|---|---|
| **Obstacles** | Infiltration Points (IP) to overcome. Individual (each PC earns IP alone) or group (pooled). Overcome once per objective. | Subjects with a goal; individual subjects track per-PC points |
| **Obstacle checks** | Crit success 2 IP, success 1 IP, failure +1 AP, crit failure +2 AP | The outcome table |
| **Awareness Points (AP)** | One party-wide pool. +1 at the end of each round. Thresholds, for example: 5 AP DCs +1, 10 AP complication, 15 AP DCs +2 in total, 20 AP the infiltration fails. | A counter with a per-round change, and thresholds that carry DC changes (Justin chose automatic) |
| **Complications and opportunities** | A complication is triggered by an AP threshold or a crit failure, and must be cleared before the affected PCs go back to obstacles. An opportunity works like an obstacle but gives no IP: it gives a benefit such as lowering AP. | Complications are subjects with their own actions. An opportunity with no check is a challenge-level modifier, category Opportunity; one that needs a roll is a subject with no points. The GM reveals both by hand (spec 14.7). |
| **Edge Points (EP)** | When a PC fails or critically fails an obstacle or complication check, they can spend 1 EP to succeed instead. Some EP only work in one situation (paperwork, a disguise). | A per-PC counter. The GM lowers it and picks Success on the roll card's degree buttons. Situational EP are a note. |
| **Preparation** | Downtime, before the infiltration: Bribe Contact, Forge Documents, Gain Contact, Gossip, Scout Location, Secure Disguises. Four of them are secret. A failed Forge Documents gives an EP that looks real but does nothing; a crit failure turns its use into a crit failure. | A separate challenge, run first: one subject with an action per activity, secret where the rules say. Success adds to a per-PC Edge counter. A dud or cursed EP adds to Edge too, and the GM writes it in that PC's GM note (no Dud counter; Justin, 2026-11-11). The GM types the results into the infiltration by hand (Justin, 2026-11-11). |

## Not in the first version

- Several objectives in sequence, with each PC moving on alone. One objective only for now.

## Settled (Justin, 2026-11-11)

Preparation, Edge Points and duds are settled in spec 14.8: a separate preparation challenge, per-PC counters, and the degree buttons on the GM's roll card. Opportunities and complications are in spec 14.7.

**Done when:** a GM can run an infiltration with preparation, obstacles, Awareness and Edge Points, and players can roll its actions from the panel, including Forge Documents. Check it in Foundry with a live test challenge and a player login.

## Decisions from building it (Justin, 2026-11-11)

| Topic | Decision |
|---|---|
| Dud and cursed EP | No Dud Edge counter. Each PC's row on a per-PC counter gets a GM-only note, beside the value. It also covers situational EP ("paperwork only"). |
| Awareness Points | Shown to players by default. Threshold texts start at "points only" (5: ???). |
| Adding subjects | Three Add buttons: Obstacle, Complication, Opportunity. A preset can now offer several subject templates. |

## Where it stands (2026-11-11)

- **Built:** the Infiltration and Infiltration Preparation presets, subject templates with one Add button each, and per-PC GM notes on per-PC counters. Spec 14.6, 14.8 and 14.10 are updated.
- **Checked:** `tools/test.mjs` (131 pass, 7 new), `tools/check-load.mjs`. Live in the test world as GM and Test Player 1: made both challenges from the presets; the Edit tab shows the three Add buttons and Add Complication links its failure rows to Awareness; a GM note saved, survived a reload and fits on one line. The player rolled Forge Documents from the panel (blind roll, "privately rolled some dice"); the GM's card showed all four degree buttons with the dud and cursed notes in their tooltips; applying Failure gave the player +1 Edge Points on the panel. The player rolled Stealth on an obstacle; applying Critical Failure added 2 AP. Three rounds later AP reached 5 and the obstacle's DC went from 18 to 19.
- **Your calls:** a new obstacle's goal is 2 IP (edit per obstacle). The preparation checks start at DC 15; the action descriptions say which DC band the rules use. Gain Contact's Lore option is left for the GM to add. The roll card only shows the *rolled* degree's notes, so when you apply a different degree (spending an EP), its notes are only in that button's tooltip.
- **Not built:** several objectives in sequence; group checks that pass when half the party succeeds.
- **Test challenges** "SSM Infiltration check" and "SSM Preparation check" are still in the test world (the infiltration is on the panel). Delete them when done.
