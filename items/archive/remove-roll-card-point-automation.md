---
title: "Remove outcome tables and automatic applying"
kind: work
status: done
waits_on: none
priority: ⏫
blocked_by: []
source: "Justin's list of items, 2026-11-12; interview with Justin, 2026-11-12"
added: 2026-11-12
updated: 2026-11-12
outcome: "Built 2026-11-12. Rolls change nothing; outcome tables, maximum points, degree buttons, the result card, Undo and points, counter and rounds modifier effects are gone. Checked with tests and live as Test Player 1."
---
# Remove outcome tables and automatic applying

Nothing applies points automatically any more. The GM changes every value by hand with + and −. This removes most of the run logic, including Undo.

## Decided (Justin, 2026-11-12)

| Part | Decision |
|---|---|
| Degree buttons, Apply, applied-result card, Undo | Removed |
| Action outcome tables | Removed, with their editor in the action window. An action keeps its name, description, Secret and checks. |
| Action maximum points and its tally (`maxPoints`, `given`) | Removed |
| Modifier effects | Keep DC changes and notes. Points, counter and rounds effects go, and so does the modifier Apply button on one-time entries (`applied`). |
| One-time DC entries | Unchanged: a roll still spends them when it arrives. |
| Thresholds | Unchanged: a hand change still marks them Reached, with the same notices. |

## What goes in the code

- `chat-card.js`: degree buttons, the result card and Undo. Keep only what one-time DC spending needs on arrival.
- `run.js`: `applyRoll`, `applyBlock`, `outcomePlan`, `undoApply`, `undoBlock`, and `run.appliedRolls`. Check whether `receivedRolls` and reroll handling are still needed once nothing is applied.
- `model.js`: the action's `outcomes`, `maxPoints`, `given`; the modifier's `applied`; the points, counter and rounds effect types.
- `data.js`: every preset's outcome rows, `ACTION_FIELDS`, `BLANK_ALLOWED`'s `maxPoints`.
- Templates, `lang/en.json` and `tools/test.mjs` to match.
- Spec: 14.2 (Action, outcome table), 14.3, 14.8's degree buttons and Undo, the 14.6 preset outcomes, and 14.10's Research line. Infiltration Preparation's dud Edge Point note (14.8) lived in an outcome row: move it to GM notes.

**Done when:** no roll can change a value; + and − on the sheet still change every value and mark thresholds; one-time DC entries still spend on arrival; tests pass; checked live with one roll from the panel as a player.

**Follow-on:** gm-counter-plus-minus-buttons. Research's plan used the action maximum; that item has a note.

## Result (2026-11-12)

- **Removed:** `chat-card.js`; `applyRoll`, `outcomePlan`, `applyBlock`, `undoApply`, `undoBlock`, `applyModifier`; `run.appliedRolls`, `run.receivedRolls` and `run.roundsAdded` (nothing changes the round maximum but the GM now); the action's `outcomes`, `maxPoints`, `given`; the modifier's `applied`; effect `counterId`; the points, counter and rounds effect types and their panel text.
- **Kept:** reroll handling (a reroll still spends nothing and doesn't mark acted again) and the roll id in the roll option, so chat links already in journals still work.
- **Infiltration Preparation:** the activity results and the dud and cursed rules moved from outcome rows into the preset's GM notes, one paragraph each. The Discover reminders and Infiltration's Cleared and Benefit notes were dropped.
- **Old data:** not converted, per spec 14.9 (Justin, 2026-11-12: everything so far is test data). A stored modifier effect of a removed type makes its challenge page fail to load.
- **Checked:** `tools/test.mjs` (116 pass), `tools/check-load.mjs`. Live in the test world: the sheet has no Apply or tally; the action window has only name, Secret and description; the modifier window offers DC change and Note only; the GM's − and + still change points. As Test Player 1, a Diplomacy roll from the panel at DC 13 spent the one-time Over Here! entry and marked the PC acted; no points, counters or rounds changed, and the GM's card had nothing added.
