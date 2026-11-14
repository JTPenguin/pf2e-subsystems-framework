# Changelog

## Unreleased

- Modifiers can give a typed roll bonus or penalty (circumstance, status, item or untyped), with or without a DC change. New `roll` field in the import format.
- A roll spends the modifiers it used, including ones with only a roll bonus.
- A counter's thresholds are added from an **Add threshold** row under the open counter; the counter's row keeps one +.
- In the challenge window, an open row's content lines up with the first element after its caret.

## 0.1.0

First release.

- Challenges in their own Subsystems sidebar tab, run from a sheet styled like a PF2e NPC sheet.
- Presets: Victory Points, Influence, Infiltration, Infiltration Preparation, Chase, Reputation and Research.
- A player panel over the canvas showing only what the GM reveals, with clickable checks, counters, thresholds, modifiers, a round bar and party portraits.
- Challenges can be written as JSON and imported: see `docs/challenge-format.md`.
