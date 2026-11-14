---
title: "Let modifiers give players roll bonuses and penalties, not only DC changes"
kind: feature
status: done
waits_on: none
priority: ⏫
blocked_by: []
added: 2026-11-13
updated: 2026-11-13
outcome: "New `roll: { amount, type }` field; `dc.allSkills`/`dc.skills` drive both changes. Rolls from the sheet and panel pass PF2e modifiers and name the entries they used in an `ssm:used` roll option, which spends them. Chat links can't carry a bonus. Checked in Foundry as GM and Test Player 1: breakdown and stacking correct, bonus-only one-time entry spent."
source: "Justin's request, 2026-11-13: modifiers should be able to offer bonuses and penalties to players' rolls, not only DC adjustments; questions answered by Justin in triage, 2026-11-13"
---
# Let modifiers give players roll bonuses and penalties, not only DC changes

Today a modifier can only change the DC a roll must meet (`dc.amount`). Justin wants a modifier to be able to give a bonus or a penalty to the roll itself as well.

The earlier item [Show DC changes as DC changes on the player panel](archive/dc-adjustments-for-modifiers.md) settled how DC changes display. This item adds a second kind of effect.

## Decisions (Justin, 2026-11-13)

| Question | Answer |
|---|---|
| How the bonus reaches the roll | As a PF2e roll modifier with a type: circumstance, status, item or untyped. PF2e then applies its own stacking rules, and players see it in the roll's breakdown. |
| Which checks it applies to | The same checks as the modifier's DC change: one "applies to" list (every check, or the chosen checks or skills) drives both. |
| One-time and multi-use | A roll that uses the modifier spends it, whether it gave a DC change, a roll bonus, or both. |

## Build notes

- Add a roll field next to `dc`, for example `roll: { amount: 0, type: "circumstance" }`, in `scripts/challenge/data.js` (`newModifierDc`, `MODIFIER_FIELDS`), the data model and the modifier edit window. Rename `dc.allSkills` and `dc.skills` to a shared target, or keep them under `dc` and say they drive both. Pick one and update `docs/challenge-format.md` either way.
- `rollCheck` in `scripts/challenge/roll.js` passes the live roll bonuses to `statistic.roll()`. Check the installed `pf2e.mjs` for how `Statistic#roll` takes extra modifiers before writing it.
- Spending: `spendDcEntries` in `scripts/challenge/run.js` only spends a modifier when the roll's DC equals the current DC, and `dcMatches` skips a modifier whose DC change is 0. A bonus-only modifier would never be spent. Carry the ids of the modifiers the roll used in its roll option, and spend those.
- The player panel and the sheet show the bonus on the modifier's card, for example "+1 circumstance". Players see it; it is in their roll breakdown anyway.
- The `pf2e-influence-foundry` skill writes modifiers; tell Justin the format changed so the skill can be updated.

## Done when

- A modifier can carry a typed roll bonus or penalty, with or without a DC change.
- A player's roll from the panel and the GM's roll from the sheet both show the bonus in PF2e's breakdown, and two bonuses of the same type don't stack.
- A one-time modifier with only a roll bonus is spent by the roll.
- The docs and import format describe the new field. Checked live in Foundry with a player login.
