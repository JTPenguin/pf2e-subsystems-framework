---
title: "Build the generic Victory Points challenge, and move Influence onto it"
kind: feature
status: done
waits_on: none
blocked_by: []
source: "Justin's list of items, 2026-11-11; design answers from Justin, 2026-11-11 (merged generic-challenge-subsystem into this item)"
added: 2026-11-11
updated: 2026-11-11
outcome: "The generic Victory Points challenge, the Victory Points and Influence presets, and spec 14.7 and 14.8 are built and checked (123 tests; live as GM and player). Closed by Justin, 2026-11-11."
---
# Build the generic Victory Points challenge, and move Influence onto it

Every subsystem runs on one data model, one sheet and one panel. The model is GM Core's Victory Points framework ([Victory Points](https://2e.aonprd.com/Rules.aspx?ID=3028)). Influence, Infiltration, Research and Chase are presets of it, not separate code. A GM can also build a challenge from scratch with it.

## Decisions (Justin, 2026-11-11)

| Topic | Decision |
|---|---|
| Generic subsystem | GM Core's Victory Points framework |
| Build order | Generic challenge first; then the other subsystems as presets |
| Influence | Becomes a preset. Existing Influence challenges convert on load and keep working. One model. |
| Where points live | On each subject (an NPC, an obstacle, a library area). A subject can be **individual**, so each PC has their own points on it. Counters stay challenge-wide. |
| Degree-of-success table | Set per action, and the GM can edit it. Presets fill it in. |
| Per-round and threshold rules | Generic. A counter can change by a set amount each round. A counter threshold can carry effects, such as a DC change, that apply while it is reached. |

## Decisions from the interview (Justin, 2026-11-11)

| Topic | Decision |
|---|---|
| Subjects on the panel | Only revealed subjects, one column each; an eye toggle per subject |
| Per-PC points | One row per PC by portrait; everyone sees all rows |
| Shared pool | Counters get full thresholds and a bar; outcomes can add to a counter |
| Completion | Optional goal; reaching it marks Complete and fades the actions, which still roll |
| Diminishing points | A direction on the track (subject points or counter), not on each threshold |
| Names | Preset fills the points name and subject label; the GM can edit them |
| NPC stats | One GM-only free-text stat line |

**Approved by Justin, 2026-11-11, with one change: no backward compatibility.** The module isn't in real use, so old Influence challenges and chat cards are not converted. Steps 3 and 4 below shrink to: add the Influence preset, remove the Influence-only code.

## Where it stands (2026-11-11)

- Built: the generic model, run rules, sheet, action window, panel, chat card, the Victory Points and Influence presets, and the preset chooser. The Influence-only code is gone.
- Checked: `tools/test.mjs` (101 pass), `tools/check-load.mjs`, and all four templates compile.
- **Checked live in Foundry (test world), as GM and as Test Player 1:** built a Victory Points challenge from scratch (counter with a per-round gain and a DC threshold, a shared subject, an individual subject, an action with a counter outcome) and an Influence challenge from the preset. Rolled from the sheet and from the player's panel, applied results, stepped rounds forward and back, hid a subject, marked one complete, ended and reset. All worked. Fixed three layout issues found on the way: the Direction dropdown was clipped, the "0 of 3 given" text wrapped badly, and the counter range read "(−∞ to 6)".
- **Several challenges can run at once (Justin, 2026-11-11); one is on the panel.** Start or Show panel takes the panel, and the challenge that was there keeps running. Checked live: rolled and applied on a challenge off the panel, swapped back, reloaded, ended one while the other ran on.
- **The Subsystems tab marks running challenges (Justin, 2026-11-11):** an eye on the one players see, a play mark on the others (a hidden panel included), a Running filter in the search bar (off on each load), and Show on panel / Hide panel in the right-click menu. Checked live.
- **Spec 14.7 and 14.8 built (2026-11-11):** free-text modifier categories (grouped and coloured by the preset's suggestions, then first use); challenge-level modifiers (Challenge box on the sheet, strip on the panel, DC changes by skill name); degree buttons on the GM's roll card; a GM-only applied-result card with Undo; per-PC counters; Fortitude, Reflex and Will as check rows; subject minimum and maximum; move up and down; collapse per user; both-ways tracks with a zero-mark bar. Justin's answers: Undo also takes back a Rounds change; challenge DC changes name skills; suggested categories always get an Add button.
- **Checked:** `tools/test.mjs` (123 pass, 21 new for this work), `tools/check-load.mjs`, all four templates compile. Live in the test world as GM and Test Player 1: a challenge modifier lowered Diplomacy on both subjects and was spent by the player's roll; the GM applied Critical Success to a rolled Critical Failure, undid it (points, threshold, per-PC counter and tally all back, roll card unlocked), then applied Success; the result card stays hidden from the player; a Will row rolled PF2e's save and its chat link works; Vessa stopped at her maximum; order, collapse (kept after reload) and the both-ways Reached and bar all worked. Fixed on the way: the challenge entry window offered a points effect; the order arrows were invisible on the red header; an old card showed a raw language key.
- Next: Justin reviews and commits. The test challenge "SSM 14.7-14.8 check" is still running in the test world; delete it when done.
- Old Influence challenges in any world no longer load as challenges. Delete them or leave them.

## Modifier categories and challenge-level modifiers (interview with Justin, 2026-11-11; now in spec 14.7)

Weaknesses and resistances are Influence's names for something every subsystem has: a modifier that changes checks or points. The generic concept is the **modifier category**. Checked against a real infiltration: *The Great Toy Heist*, pages 5 and 6.

| Topic | Decision |
|---|---|
| Generic concept | Modifier entries stay as they are. Their fixed kind (Resistance, Weakness, Other) becomes a **category**. |
| Categories | A free-text label on each modifier. The preset suggests labels; the GM can type any. The GM window and the panel group cards by label, in the preset's order, then in order of first use. Each label's stripe takes a colour from a fixed palette, by that order. No list editor, no colour picker. |
| Other | No built-in catch-all. Influence suggests Resistance, Weakness, Other; the blank Victory Points preset suggests Modifier. |
| Challenge-level modifiers | A challenge has its own modifier list as well as each subject's. Its DC change hits every check in the challenge, still filtered by skill. A one-time one is spent on the next matching check anywhere. A change meant for one subject goes on that subject. |
| Panel | Challenge-level modifiers show in a full-width strip above the subject columns, grouped by category, in the same card style. |
| Opportunities | A plain challenge-level modifier, category Opportunity, with no check. The GM reveals it when it becomes available and turns it on when a player uses it; a one-time one is then spent. An opportunity that needs a roll is a subject with no points. |
| Complications | Subjects with an action. The GM reveals one when its trigger happens. A lasting penalty from failing one is a modifier the GM turns on. |

**Cut to keep it simple (Justin, 2026-11-11).** Each costs the GM a click or two, which the outcome or threshold text describes.

| Cut | Instead |
|---|---|
| Trigger effects (Reveal subject X, Modifier X) | The GM reveals or turns on by hand. Outcome rows and threshold text say what to do. |
| A full effect list on thresholds | Thresholds keep their text and DC change. |
| A "once per PC" duration | An Ongoing modifier the GM turns off, or a note. |
| Challenge-level DC changes aimed at chosen subjects | Put the modifier on that subject. |
| An editable category list with colours | Free-text labels, as above. |

How *The Great Toy Heist* builds with this:

| Its part | Built as |
|---|---|
| IP, one party pool with opportunities at 3, 6 and 9 | A counter. Obstacle outcomes add to it. Each threshold's GM text names the opportunity to reveal. |
| AP, with complications at 3 and 6 | A counter. Each threshold's GM text names the complication to reveal. |
| Over Here!, Not Like That!, Lucky Break | One-time challenge-level modifiers, category Opportunity. +2 circumstance is a DC change; the reroll and roll-twice benefits are notes. |
| Drunken Guest: on a fail, each PC takes −1 on their next check | A subject. Its failure note tells the GM to turn on an Ongoing challenge-level modifier with DC +1, and turn it off once each PC has rolled. |
| Investigating Servant: one PC automatically fails their next check | A subject whose failure outcome is a note. |

Left to the Infiltration item: the preset's suggested categories, and group checks that pass if half the party succeeds.

## Framework additions from mapping the subsystems (interview with Justin, 2026-11-11; now in spec 14.8)

Each planned subsystem was checked against the framework as built plus spec 14.7, using GM Core and real examples from Justin's PDFs: *The Great Toy Heist*, *All or Nothing* (Agents of Edgewatch 3), *Graveclaw* (Blood Lords 2), *Punks in a Powderkeg* (Outlaws of Alkenstar 1), *Ruins of the Radiant Siege* (Agents of Edgewatch 6) and GM Core's Reputation.

| Addition | Decision | Needed by |
|---|---|---|
| **Pick the degree to apply** | The GM's roll card shows one button per degree whose outcome row has an effect; notes-only rows get none. The rolled degree's button is highlighted, like PF2e's damage buttons on a save. Each button's tooltip lists that row's effects and notes; the rolled degree's notes also show on the card, as today. | Edge Points, Preparation Points, opportunities such as Not Like That! |
| **Applied-result card with Undo** | Clicking a degree locks every button on the roll card and posts a new GM-only card listing what changed, with an Undo button, like PF2e's damage-taken message. Undo reverses exactly what that Apply did: the actual change after limits, thresholds it marked Reached (only if the value is now below them), a Complete it set, the action's maximum-points tally, and the roll id. Later changes are left alone. Undo unlocks the roll card. | Every subsystem |
| **Per-PC counters** | A counter can be per PC: one value per party PC. An outcome row's counter change changes the roller's value. No thresholds and no goal. The sheet shows the party total beside the values. Spending is by hand: the GM lowers that PC's value and picks the better degree on the roll card. A dud Edge Point is a second, hidden per-PC counter. | Edge Points, Preparation Points |
| **Saving throws as checks** | Check rows accept Fortitude, Reflex and Will as well as skills, Perception and Lore. | Chase obstacles |
| **Subject limits** | A subject's points get the same optional minimum and maximum as a counter. | Chase Points never below 0; Reputation −50 to +50 |
| **Subject order** | The GM can move subjects up and down on the sheet. The order is for the GM's reference; the GM still reveals the next obstacle by hand. | Chase |
| **Collapsible subjects** | Each subject on the sheet can collapse. The state is each GM's own and is kept across reloads; it doesn't change the challenge or the panel. | Chase, Reputation |
| **Both-ways tracks** | A third direction beside Counts up and Counts down. Thresholds above 0 are reached by rising, below 0 by falling, and Reached follows the value: it clears itself when points move back. The panel bar spans minimum to maximum with a zero mark. | Reputation |

**Settled without new features.**

| Need | How |
|---|---|
| Preparation before an infiltration or chase | A separate challenge, run first, with its own rounds. Its results are typed into the main challenge by hand. A smoother handover can come later. |
| Thresholds on a party total of per-PC points (*Punks*' clues every 2 Preparation Points) | The GM watches the total and reveals prepared modifiers or journal entries by hand. |
| Obstacles in order, the other side's position | The GM reveals the next obstacle. The pursuers are a counter that changes by +1 each round. |
| Research timed events (day 1, 3, 7, 14) | A "Days" counter that changes by +1 each round, with thresholds. |
| Complications that last until cleared (Alarm Sounded: AP +2 a round; Drunken Gambler: DC 32) | The GM turns on a challenge-level modifier, or edits the counter's change each round. |
| Opportunities with a check (Create a Diversion) | A subject that tracks no points. Repeat DC increases are a note. |

## Proposed shape (now written out in spec section 14)

| Part | Holds | Influence today |
|---|---|---|
| **Challenge** | Name, premise, GM notes, rounds, counters, run state, subjects, preset id | The challenge |
| **Subject** | Name, points (or per-PC points if individual), thresholds, modifiers, actions, reveal state | An NPC |
| **Action** | Name, skills with DCs (reveal and decoy per row), secret flag, outcome table, optional maximum points | Discover and Influence |
| **Outcome table** | For each degree of success: a change to the subject's points, a change to a counter, or a reminder note | Influence: +2 / +1 / 0 / −1 points. Discover: reminder notes only. |
| **Thresholds, modifiers, counters** | As today | As today |

- The Apply button on a chat card applies the roll's outcome row, whatever it holds. The reminder on Discover cards becomes a note-only outcome.
- The subject's label is set by the preset: NPC, Obstacle, Library area.
- Universal skills become a preset choice: Influence's Perception, Deception, Diplomacy and Intimidation.

## Steps

1. Write the generic model into `docs/spec.md` and get Justin's approval. This is the design sign-off the old generic-challenge-subsystem item asked for.
2. Build the generic model, sheet and panel.
3. Add the Influence preset and the load-time conversion. Check an old Influence challenge converts with nothing lost.
4. Remove the Influence-only code.

**Done when:** a GM can build and run a Victory Points challenge from scratch, and an existing Influence challenge still runs as before. Check both in Foundry with a live challenge and a player login.
