---
title: "Edit windows: labels left, fields right"
kind: work
status: done
waits_on: none
priority: 🔼
blocked_by: []
source: "Justin's UI list, 2026-11-12; details from Justin, 2026-11-12"
added: 2026-11-12
updated: 2026-11-12
outcome: "The Subject, Action, Counter and Modifier windows are Foundry standard-form windows: one form-group row per field, labels in a fixed left column (so checkboxes sit at the start of the field column), fields on the right. The sheet keeps its inline fields. Checked in Foundry 2026-11-12, light and dark themes."
---
# Edit windows: labels left, fields right

## Request (Justin, 2026-11-12)

- Edit windows should look like other Foundry edit windows: fields stacked vertically, labels on the left, fields on the right.
- Reference: PF2e's spell sheet (Tradition, Cast, Cost, Range fields).

## Where the code does it now

- `templates/challenge-subject.hbs`, `challenge-action.hbs`, `challenge-counter.hbs` and `challenge-modifier.hbs` put several `label` fields side by side in each `.ssm-row`, with the label text and input inside the `label`.
- `styles/subsystems.css:7-11` and the "Inputs, text areas and dropdowns" rules lay them out inline, as the NPC sheet's labeled fields.
- `scripts/challenge/entry-window.js:43-47`: the windows are a `form` with class `ssm-modifier-window`, 640px wide.

## The Foundry pattern

PF2e's `templates/items/spell-details.hbs` uses Foundry's form rows: `div.form-group > label + input`, or `+ div.form-fields` for several controls. Foundry styles these under `.standard-form` (`foundry2.css`, `.standard-form .form-group`): label on the left, fields on the right, one row each. A `p.hint` under a field holds help text.

## Decided (Justin, 2026-11-12)

- **Edit windows only:** Subject, Action, Counter and Modifier. The Challenge sheet's own fields stay inline.
- Tables and repeated rows keep their own layout: the checks table, each threshold's row, and the modifier's skills list.

## Next step

1. Add `standard-form` to the windows' classes, and rewrite each window's fields as `form-group` rows.
2. Remove the inline field CSS that no longer applies to the windows. Keep what the sheet still uses.
3. Do this in the same change as [[subsections-foundry-fieldset-style]]: both rewrite the same four templates.
4. Update spec section 6, which says fields in every edit window look like the NPC sheet's labeled fields.

## How to check

Open each of the four windows on the light and dark themes. Every field is one row, labels aligned in a left column, nothing cut off at 640px. Changing a field still saves at once.
