---
title: "Audit the Infiltration presets against the rules"
kind: test
status: ready
waits_on: Claude
priority: ⏬
blocked_by: []
source: "Built 2026-11-11 (Justin's list); turned into an audit by Justin, 2026-11-12"
added: 2026-11-11
updated: 2026-11-12
---
# Audit the Infiltration presets against the rules

The Infiltration and Infiltration Preparation presets are built (spec 14.6, 14.7, 14.8, 14.10). Since then the roll card's degree buttons and point automation were removed (remove-roll-card-point-automation), and subject templates with their three Add buttons were replaced by a Category field (commit c7a8cc0). This item checks that a GM can still run every use case in GM Core's [Infiltration](https://2e.aonprd.com/Rules.aspx?ID=3059), and records how.

## Use cases to check

Mark each **Covered** (say how), **GM's call** (the GM notes say what to do), or **Gap** (file a new item).

| Use case | Rules | Expected coverage |
|---|---|---|
| Obstacles with IP | Usually 1–2 IP; each overcome once per objective | Subjects with an IP counter; a new one's goal is 2 |
| Individual vs group obstacles | Each PC earns IP alone, or the party pools them | Per-PC counter vs a plain counter on the subject |
| Obstacle results | +2 IP, +1 IP, +1 AP, +2 AP | Hand changes on the counters |
| Automatic help | Usually 1 IP, or 2 | Hand change |
| Awareness Points | +1 each round; failures; disruptive acts | Challenge counter, +1 each round, shown to players |
| AP thresholds | 5: DCs +1; 10, 15: complications, DCs +2; 20: fails | Counter thresholds with DC changes |
| Complications | From crit failures, thresholds or the GM; must be cleared first | Subjects in the Complication category, revealed by hand |
| Combat noise | Each round of combat adds AP | Hand change |
| Opportunities | Benefits, with risks; one-time or repeatable | A challenge modifier in the Opportunity category, or a subject with no points |
| Edge Points | Turn a failure into a success | Per-PC counter; GM lowers it and treats the roll as a success (degree buttons are gone: check the GM notes say this) |
| Situational, dud and cursed EP | Only in one situation; no benefit; crit failure | Per-PC GM notes on the Edge counter |
| Preparation | Days and activity limits; six activities, four secret | The Preparation preset: one subject, secret actions |
| Preparation failures | Add AP before the start | Typed into the infiltration by hand |
| Several objectives | In sequence; each PC advances alone | Not built: check whether categories and per-PC counters cover it |
| Group checks | Pass when half the party succeeds | Not built: check |
| Round length | Minutes to hours | GM notes |
| Infiltration fails | Top AP threshold | Last threshold's text |

## Also check

- The defaults: a new obstacle's goal is 2 IP; preparation checks start at DC 15; Gain Contact's Lore option is left to the GM.
- Notes that still mention the degree buttons or subject templates: GM notes, action descriptions, spec 14.8 and 14.10.
- A **player login** rolls a secret preparation action and an obstacle check from the panel, and sees Awareness Points.
- Delete the test challenges "SSM Infiltration check" and "SSM Preparation check" when done.

**Done when:** every row above is marked, each gap has its own item, stale notes are fixed, the player login check has run, and the test challenges are gone.
