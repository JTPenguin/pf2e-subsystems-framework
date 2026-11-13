---
title: "Action window: skills as a subsection with a + in the header"
kind: work
status: done
waits_on: Claude
priority: 🔽
blocked_by: []
source: Justin's request, 2026-11-12
added: 2026-11-12
updated: 2026-11-12
outcome: "Action window shows a Checks subsection header with a + that adds a check; Add check button and its row removed. Checked live: add, remove and save work."
---
# Action window: skills as a subsection with a + in the header

## Request (Justin, 2026-11-12)

- In the Action edit window, the skills area should use the subsection pattern.
- The + that adds a skill goes in the subsection's header, not under the table.

## Where the code does it now

- `templates/challenge-action.hbs:20-44` is the skills table (Skill, Lore name, DC, Always, Revealed, Decoy). It has no heading.
- `templates/challenge-action.hbs:42` puts the "Add check" button under the table, in the `ssm-modifier-buttons` row with Save.
- The subsection pattern is the `ssmSubsectionHead` partial, used in `templates/challenge-sheet.hbs:29` for modifier category headings. Its `label`, `list`, `add` and `stripe` options are described in the archived item `items/archive/subsection-add-button.md`.
- The Action's checks are already a subsection on the sheet, from `items/archive/counter-thresholds-subsection.md` (Checks, with a + to add a check). The window does not use it.

## Next step

- Give the skills table a subsection header labelled **Checks** (Justin, 2026-11-12; matches the sheet) and a + button, using `ssmSubsectionHead`. The + calls the same `addRow` for `checks` as the button does now.
- Remove the "Add check" button. Once [[edit-windows-no-explicit-save-button]] has removed Save, the bottom row is empty: remove it.
- With no checks, show an empty message in the subsection, as the sheet's Thresholds subsection does.

**Done when:** the Action edit window shows the skills table under a Checks subsection header with a + that adds a check row. No buttons sit below the table. Existing checks still load and save.
