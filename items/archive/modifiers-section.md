---
title: "Put modifiers in a Modifiers section"
kind: feature
status: done
waits_on: none
priority: 🔼
blocked_by: [actions-section-styling]
source: "Justin's list of items, 2026-11-12; interview with Justin, 2026-11-12"
added: 2026-11-12
updated: 2026-11-12
outcome: "Built 2026-11-12. One Modifiers section per tab, a small striped heading per category in use, one plain + that opens the new entry's window. Checked live: a Resistance entry showed under its heading; a challenge-level entry was added and removed."
---
# Put modifiers in a Modifiers section

Today the Edit tab shows a bold "Modifiers" heading, then one boxed fieldset per category, each ending in its own "Add {category}" button (`ssmEditModGroups` in `templates/challenge-sheet.hbs`). Run view already has the target look: one Modifiers section, with a small striped header per category (`h5.ssm-cat-head`).

## Decided (Justin, 2026-11-12)

- **One Modifiers section** for the challenge and for each subject, styled as in [[actions-section-styling]].
- **A small header per category** inside it, with the category's stripe colour, as in Run view. Uncategorised entries come first with no header, as now.
- **One plain `+`** in the Modifiers title row ([[section-add-buttons-in-header]]). It adds an uncategorised entry and opens its window, as Add does today. The GM picks the category there; the Category box already offers the preset's suggestions, so it stays as it is.
- **Empty categories are hidden.** Today the Edit tab always shows the preset's suggested categories, because each held an Add button (`forEdit` in `modifierGroups`, `scripts/challenge/sheet.js`). That reason goes, so a category header shows only once it has an entry.
- The per-category Add buttons go, along with the `AddModifierTo` string if nothing else uses it.

**Done when:** a challenge and a subject on the Edit tab each show one Modifiers section, with a small header per non-empty category and no Add button under any category; `+` adds an entry and opens its window. Check it live on an Influence challenge (Resistance and Weakness) and run `tools/test.mjs`.
