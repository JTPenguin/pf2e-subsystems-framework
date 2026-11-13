---
title: Style the Challenge sheet like the NPC sheet
kind: feature
status: done
waits_on: none
priority: 🔼
blocked_by: []
source: Justin's list of items, 2026-11-12; interview with Justin, 2026-11-12
added: 2026-11-12
updated: 2026-11-12
outcome: "Rows like NPC actions (thin line, no box or fill, bare icon controls), fields as bold-labelled smaller inputs, in the sheet and all four edit windows; hidden is fade plus italic. Checked side by side with an NPC sheet in Foundry, light and dark, and a field still saves. Spec section 6 updated."
---
# Style the Challenge sheet like the NPC sheet

## Request (Justin, 2026-11-12)

- Items inside sections are styled like the actions and passives on the NPC sheet.
- Editable fields are styled like the Attribute Modifier fields on the NPC sheet.
- Other elements follow the NPC sheet's look too. Justin will name these as they come up.

## Decided (interview with Justin, 2026-11-12)

- **Scope:** the whole sheet and every edit window (modifier, and the subject, action and counter windows from [[combine-edit-and-run-views]]).
- **Items become NPC action rows.** Plain rows split by a thin line, no card box or fill, name at the left and icon controls at the right. Reference: `templates/actors/npc/partials/action.hbs` and `.npc.sheet .actions-list li.action` in the PF2e system's `styles/pf2e.css`.
- **Hidden is fade only.** A hidden row is faded and italic; a revealed row is full strength. The eye icon also shows it. This replaces spec section 6's "a revealed card is on a bright fill". Update the spec.
- **Fields reuse the system's own form styles.** Justin's words: use the same styles and components other editable sheets use. Inputs, text fields and dropdowns are a little smaller, with a bold label to the left. Reference: `.npc.sheet form .labeled-field` in `pf2e.css`. Prefer the system's or Foundry's existing classes over copying their rules into `styles/subsystems.css`.
- **Order:** after [[combine-edit-and-run-views]], so the one view is styled once.

**Done when:** a side-by-side look at the Challenge sheet and the NPC sheet, in Foundry, shows the same item rows and field styling, in the light and dark themes, and the sheet still reads and saves as before.
