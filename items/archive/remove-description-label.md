---
title: "Remove the description label from subject and action edit views"
kind: feature
status: done
waits_on: none
priority: 🔼
blocked_by: []
source: "Justin's list of items, 2026-11-12; interview with Justin, 2026-11-12"
added: 2026-11-12
updated: 2026-11-12
outcome: "Built 2026-11-12. Labels, hints and their strings and CSS are gone. Checked live: no labels on the subject tab; a description written to an action's editor path saved."
---
# Remove the description label from subject and action edit views

On the Edit tab, the subject's and each action's description editor has a "Description" label above it (`span.ssm-field-label` in `templates/challenge-sheet.hbs`).

## Decided (Justin, 2026-11-12)

- Remove both labels. The editors stay.
- Drop their hover hints too (`SubjectDescriptionHint`, `ActionDescriptionHint`), with the `SubjectDescription` and `ActionDescription` strings if nothing else uses them, and the `.ssm-field-label` CSS rules.

**Done when:** the subject and action edit views show the description editor with no label or hint, and it still opens and saves. Check it live in Foundry.
