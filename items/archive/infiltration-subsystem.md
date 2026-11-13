---
title: "Audit the Infiltration presets against the rules"
kind: test
status: done
waits_on: none
outcome: "Done 2026-11-13. Every infiltration use case is covered or the GM's call; no framework gaps. Fixed: the 5 and 15 AP tiers' complications, GM notes for individual obstacles, several objectives and spending Edge, and spec 14.6 and 14.10. Player login checked live as Test Player 1; test challenges deleted."
priority: ⏬
blocked_by: []
source: "Built 2026-11-11 (Justin's list); turned into an audit by Justin, 2026-11-12"
added: 2026-11-11
updated: 2026-11-13
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

## Results

Checked against GM Core on Archives of Nethys and the presets in `scripts/challenge/data.js` and `lang/en.json`, 2026-11-13. "Fixed" means the GM notes or threshold text were changed in this audit.

| Use case | Result | How |
|---|---|---|
| Obstacles with IP | **Covered** | A subject with an Infiltration Points counter, maximum 2; the GM edits the maximum (GM Core: usually 1 or 2, some more) |
| Individual vs group obstacles | **Covered** (fixed) | Group: the plain counter. Individual: turn on Per PC on the obstacle's counter; its maximum applies to each PC, so each overcomes it once. The GM notes now say so |
| Obstacle results | **GM's call** | + on the obstacle's counter, + on Awareness |
| Automatic help | **GM's call** | + on the counter |
| Awareness Points | **Covered** | Challenge counter, shown, +1 on Next round, minimum 0. Failures and disruptive acts are +, per the GM notes |
| AP thresholds | **Covered** (fixed) | GM Core's tiers are 5: DCs +1 **and a complication**; 10: complication; 15: DCs +2 in total **and a complication**; 20: fails. The 5 and 15 tiers' GM text left out the complication; it now says it. The DC change applies to every check in the challenge, not only obstacles: the GM's call for opportunities |
| Complications | **GM's call** | A subject in the Complication category, hidden until its trigger. "Must be cleared first" is the GM's call. A one-off one: remove its counter |
| Combat noise | **GM's call** | + on Awareness |
| Opportunities | **Covered** | A subject with no counter, or a one-time challenge modifier. Repeatable vs once: the GM hides it or leaves it up. Smooth the Path is a PF2e rule (Following the Expert) |
| Edge Points | **Covered** (fixed) | Per-PC counter. The GM notes said to lower it but not what it buys; they now say to give the points a success would. GM Core also lets it turn a failed complication check into a success: the same steps |
| Situational, dud and cursed EP | **Covered** | The per-PC note on the Edge row; the Preparation GM notes say a dud or cursed point still goes on the counter |
| Preparation | **Covered** | The Preparation preset: six activities, Bribe Contact, Forge Documents, Gossip and Scout Location secret. Days: the round maximum. How often each activity can be used: the GM's call |
| Preparation side effects | **GM's call** | Gossip's +2 and −2 and Gain Contact's −2 are modifiers the GM adds. Bribe Contact needing a contact is the GM's call |
| Preparation failures | **GM's call** | The hidden Awareness counter; the GM types it into the infiltration (GM notes: Handover) |
| Several objectives | **Covered** (fixed) | A subject category per objective; Per PC counters let each PC move on alone. No new feature. The GM notes now say so |
| Group checks | **Not a rule** | GM Core's infiltration has no "half the party succeeds" check. Group obstacles pool points, which the plain counter does. Spec 14.10 corrected |
| Round length | **GM's call** | No field (removed earlier); GM Core leaves it to the GM |
| Infiltration fails | **Covered** | The 20 AP threshold: "End the challenge". GM Core scales it to twice the party's total IP; the GM notes say to edit the tiers |

**No framework gaps.** Every row is covered or the GM's call, so no new items.

**Defaults.** A new obstacle's maximum is 2: right. New checks start at DC 15 (`newCheck`), for preparation too: the GM sets level-based DCs, as the action descriptions say. Gain Contact's Lore option is in its description; the GM adds a Lore row.

**Stale notes.** None found: no GM notes, action descriptions or spec lines mention degree buttons or subject templates. Spec 14.6 (tiers) and 14.10 (objectives, group checks) were corrected.

**Player login, checked live 2026-11-13** as Test Player 1 (Test PC A) in the "test" world. With a running infiltration (Guard Post: Deception 18, Stealth 20; Round 2 after Next round), the panel showed Awareness Points 1 with its four tiers as "???", Edge Points 1 and 0, and the Guard Post with Infiltration Points 0/2 and both checks, with no DCs. Next round added 1 AP; the 5 and 15 tiers' new GM text was on the counter. A Stealth roll from the panel opened PF2e's dialog and rolled at DC 20; the player's card showed "Critical Failure" and no DC. With a running preparation, the panel showed Edge Points per PC, no Awareness (hidden), and the six activities. Gossip, a secret action, opened with Blind to Gamemasters and rolled at DC 15; the player saw only "???".

**Test challenges.** "SSM Infiltration check" and "SSM Preparation check" were made for this check and then deleted, with the two test rolls. The panel was cleared and both users logged out. The world holds only "New Challenge".
