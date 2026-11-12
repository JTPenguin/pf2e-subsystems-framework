---
title: "Remove outcome tables and automatic applying"
kind: work
status: ready
waits_on: Claude
priority: ⏫
blocked_by: []
source: "Justin's list of items, 2026-11-12; interview with Justin, 2026-11-12"
added: 2026-11-12
updated: 2026-11-12
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
