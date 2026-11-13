---
title: "Remove Always shown from checks"
kind: work
status: ready
waits_on: Claude
priority: ⏫
blocked_by: []
source: "Justin's UI list, 2026-11-12; details from Justin, 2026-11-12"
added: 2026-11-12
updated: 2026-11-12
---
# Remove Always shown from checks

## Request (Justin, 2026-11-12)

- The Always shown column on checks is not needed. A GM can leave a check revealed instead.

## Where the code does it now

| Place | What it does |
|---|---|
| `scripts/challenge/model.js:42` | The `always` flag on each check row |
| `scripts/challenge/data.js:37-40` | `isAlwaysShown`, and `isVisibleCheck` and `isDecoyCheck`, which read it |
| `scripts/challenge/data.js:68`, `:114`, `:125`, `:147-148` | `newCheck`, and the `always()` helper that presets use for Perception, the Influence skills and the Infiltration Preparation activities |
| `scripts/challenge/sheet.js:260-266` | The chip's `always` and `shown` values |
| `scripts/challenge/panel.js:87` | A comment: an always-shown check is never a decoy |
| `templates/challenge-action.hbs:24`, `:32-34` | The column, and the empty Revealed and Decoy cells on an always-shown row |
| `templates/challenge-sheet.hbs:2-3` | `ssm-universal`, and no eye on an always-shown chip |
| `styles/subsystems.css:81-84` | The universal chip's look |
| `lang/en.json:177-178` | `Always` and `AlwaysHint` |
| `docs/spec.md` section 6 and 14.2 | The Action window's columns, universal skills with no eye, and the always-shown row |

## Decided

- **No conversion.** Spec 14.9 says nothing is converted while the module isn't in real use. An old row's `always` flag is dropped by the model; such a row reads as hidden unless it was also revealed. Rebuild a test challenge from its preset if that matters.
- **Preset checks start revealed.** The `always()` helper becomes one that sets `revealed: true`.
- Every chip gets an eye, and every check can be a decoy.

## Next step

Remove the flag, the column, the helper's `always`, the universal style and the two strings. Update spec section 6 and 14.2.

## How to check

Create a challenge from the Influence and the Infiltration Preparation presets. Their preset checks show as revealed chips with an eye, on the sheet and on the panel. Hiding one hides it on the panel. The Action window has no Always shown column.
