# Changelog

## Unreleased

- A subject can have a **level**. New checks start at its level-based DC, and the action window's VE, E, N, H and VH buttons set a check's DC to Very easy through Very hard from it. Changing the level moves every check that has a step; a typed DC clears it. New `level` (subject) and `difficulty` (check) fields in the import format.
- A modifier can apply to whole **actions**, such as every Discover check, beside single checks. On a challenge modifier, an action means every action with that name. New `dc.actions` field in the import format.
- The panel lists each action's checks in alphabetical order, so the sheet's easiest-to-hardest order doesn't give the DCs away.

## 0.2.0

- An **Example Challenges** compendium: one challenge for each preset, and one for each of GM Core's chase types (Chase Down, Run Away, Beat the Clock, Competitive). The source files are in `examples/` and import over a blank challenge.
- GM-only text in descriptions uses PF2e's GM Text Block and GM Text Inline. The panel leaves them out, as it does Foundry's secret blocks. The presets' GM guidance on thresholds is now a GM Text Block.
- The challenge window has a sidebar on the left, as on a PF2e NPC sheet: the run's status (Not started, Running, Finished), the run buttons, the round as `◀ Round current / max ▶`, the party and Roll as, and Allow multiple subjects. GM notes move to their own collapsible box at the top of the body. The party list shows each participant's portrait; an ally's remove button shows on hover.
- NPC allies can take part in a challenge: drag an actor onto the challenge window. It gets a portrait, an acted mark and per-PC counter values, and a × to remove it. A player who owns it picks its portrait on the panel to roll for it. New `participants` field in the import format.
- Modifiers can give a typed roll bonus or penalty (circumstance, status, item or untyped), with or without a DC change. New `roll` field in the import format.
- A roll spends the modifiers it used, including ones with only a roll bonus.
- A counter's thresholds are added from an **Add threshold** row under the open counter; the counter's row keeps one +.
- In the challenge window, an open row's content lines up with the first element after its caret.
- Clearing a DC change, roll bonus or counter's Per round sets it to 0. It used to keep the old value.
- Clearing a number that can't be blank (a counter's value, a threshold's points, a check's DC, the current round) shows the kept value again instead of an empty field.

## 0.1.0

First release.

- Challenges in their own Subsystems sidebar tab, run from a sheet styled like a PF2e NPC sheet.
- Presets: Victory Points, Influence, Infiltration, Infiltration Preparation, Chase, Reputation and Research.
- A player panel over the canvas showing only what the GM reveals, with clickable checks, counters, thresholds, modifiers, a round bar and party portraits.
- Challenges can be written as JSON and imported: see `docs/challenge-format.md`.
