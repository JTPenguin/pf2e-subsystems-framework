---
title: "Challenge sheet: remove Points name and Subject label, group rounds fields"
kind: feature
status: ready
waits_on: Claude
priority: 🔼
blocked_by: []
source: "Justin's list of items, 2026-11-12; interview with Justin, 2026-11-12"
added: 2026-11-12
updated: 2026-11-12
---
# Challenge sheet: remove Points name and Subject label, group rounds fields

## Request (Justin, 2026-11-12)

- Remove the **Points name** and **Subject label** fields from the Challenge sheet.
- Put the rounds fields and **Allow multiple subjects** into an **unlabeled subsection**.

## Decided (interview with Justin, 2026-11-12)

- **Hide the fields; keep the data.** `pointsName` and `subjectLabel` stay in the data model (`model.js`) and the presets (`data.js`) still set them. So Influence keeps "Add NPC", "NPC 2" for unnamed subjects, NPC in roll labels, and "Influence" as a new subject's first counter.
- Take them out of `EDITABLE` in `data.js` only if leaving them in would let a sheet submit blank them. The Names and Rounds subsection titles go.
- **Order:** after [[combine-edit-and-run-views]]. The fields then sit in its inline Challenge section.

**Done when:** the two fields no longer show on the sheet, the rounds fields and Allow multiple subjects sit together in an unlabeled subsection, a preset challenge still shows its own subject label and points name, and existing values still load and save.
