---
title: "Modifiers: DC change and Note fields replace Add effect"
kind: work
status: done
waits_on: none
priority: 🔼
blocked_by: []
source: Justin's request, 2026-11-12
outcome: "Modifiers hold one `dc` (amount, allSkills, skills) and a `note` in place of the effects list; old effects migrate on load. The window shows a DC change row and a Note field. Tests and a Foundry check pass, 2026-11-12."
added: 2026-11-12
updated: 2026-11-12
---
# Modifiers: DC change and Note fields replace Add effect

## Request (Justin, 2026-11-12)

- A modifier can only have two kinds of effect, so the "Add effect" button is no longer needed.
- Show the DC change fields and a Note field on every modifier, instead of effect rows.
- Either field can be left empty when it is not needed.

## Where the code does it now

- `templates/challenge-modifier.hbs:37` has the "Add effect" button (`data-list="effects"`). Each effect row picks a type, and the DC type shows an amount, quick DC buttons, "all skills" and a skills list. The Note type shows a Note field.
- `templates/challenge-modifier.hbs:50` also has a remove button per row (`canRemove`).
- `scripts/challenge/entry-window.js:216-218` builds the effect rows and the effect-type choices.
- `scripts/challenge/data.js:51` starts each new modifier with one effect, and `data.js:308` keeps at least one effect (`KEEP_ONE`).
- `scripts/challenge/model.js:36` stores modifiers as a list of effects.

## Decided (Justin, 2026-11-12)

- **One DC change per modifier.** A split such as +2 to Diplomacy and −2 to Deception is two modifiers.
- **Replace the `effects` list with two named fields** on the modifier: `dc` (`amount`, `allSkills`, `skills`) and `note`. An amount of 0 means no DC change.

## Next step

- **Model and data:** `model.js:36` and `newModifier` in `data.js:49`. Drop `newEffect`, `EFFECT_TYPES`, `effects` from `KEEP_ONE` and `MODIFIER_FIELDS`, and the `effects` row factory.
- **Migration:** in the model's `migrateData`, turn an old `effects` list into the new fields: the first DC row becomes `dc`, and all note rows are joined with "; " into `note`. Later DC rows are dropped. Add a test for this.
- **Readers:** `run.js` (`effectMatches`, `liveDcModifiers`, `currentDc`), `panel-view.js:46` (`changes`), `sheet.js:370` (`effectsText`), the search text at `data.js:440-444`, and the skill clean-up at `data.js:336`, `489` and `532`.
- **Window:** `challenge-modifier.hbs` shows a DC row (amount, quick buttons, All skills, skills list) and a Note field, with no type select, no remove button and no "Add effect". Remove `SSM.Challenge.AddEffect` and the effect-type strings.
- **Spec:** section 14.7 and the Modifiers row in section 14 ("Their effects are DC changes and notes").
- Do this before [[edit-windows-no-explicit-save-button]] reaches the modifier window, or together with it, so the window changes once.

**Done when:** a modifier window has no "Add effect" button. It shows a DC change and a Note field, and either can be left empty. Existing modifiers still load and still work in Run and on the panel.
