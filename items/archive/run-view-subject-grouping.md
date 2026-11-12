---
title: Group subjects by category in Run view
kind: feature
status: done
waits_on: none
outcome: "Built 2026-11-12. Run view groups subjects as cards under red category bars; Edit tabs follow with group labels; the stored list stays grouped. Tests pass (123); checked live in Foundry."
priority: ⏫
blocked_by: []
source: Interview with Justin about subject categories, 2026-11-12; interview with Justin on grouping, 2026-11-12
added: 2026-11-12
updated: 2026-11-12
---
# Group subjects by category in Run view

Subjects now have a category ([[subject-category]]). Run view groups them by it, the way modifiers are grouped: uncategorised first, then each category under its own heading.

## Decided (Justin, 2026-11-12)

| Question | Answer |
|---|---|
| Where | GM Run view and the Edit tab's subject tabs. The player panel is not grouped. |
| Category heading | A full-width red section bar with the category name, like the Challenge and Counters bars. |
| Subjects | Every subject becomes a collapsible card under its category's bar, even when no subject has a category. Uncategorised cards come first, with no bar above them. |
| Stored order | The stored subject list keeps grouped order, so the panel's columns match Run view. Setting a subject's category moves it to the end of that group. |
| Edit tab row | Tabs in grouped order, with a small category label before each group's first tab. |
| Drag and drop | A subject only reorders within its own category. Its category changes only through the Edit tab field. See [[subject-drag-reorder]]. |
| Collapse | Per subject only, no chevron on a category bar. The collapse-all toggle ([[run-view-collapse-expand-all]]) still covers every subject. |

## Plan

- **Group order:** blank first, then `subjectCategoryOrder` in `data.js` (the preset's suggestions, then others in order of first use). Within a group, stored order. A category with no subjects shows no bar.
- **Keep the stored list grouped:** a stable sort by that order whenever a subject's category changes, or a subject is added or moved. Existing challenges sort on their next write; Run view sorts on render either way.
- **Run view** (`challenge-sheet.hbs`, the `subjects` loop around line 177): one red bar per labelled group, then that group's subjects as cards. Each card keeps today's header controls: chevron, eye, name, Complete tag and order buttons (a drag grip once [[subject-drag-reorder]] lands).
- **Edit tab row:** build `tabs` in grouped order, with a label on each group's first tab.
- **Move up and down** (until drag replaces them): stay within the group, so the first and last subject of each group can't move past its edge.
- Update spec 14.4 (Sheet) and 14.6 (Presets) to match.

**Card look:** not yet set beyond "collapsible card". Build a lighter header than the red bar, so the category bars stand out, and check it with Justin in Foundry.

**Done when:** subjects group under red category bars in Run view as cards, the Edit tabs follow the same order with group labels, the panel's columns follow it too, tests pass, and it's checked live in Foundry.

## Outcome

- **Built:** `subjectGroups` and `sortSubjects` in `data.js`. Every write keeps the stored list grouped (`writeChallenge` in `state.js`), and a form edit that changes a category moves that subject to the end of its new group (`applyForm`). Moving up and down stops at a group's edge.
- **Run view:** each subject is a card (`ssm-subject-card`) with a light red-tinted header; each category in use gets a red bar. The Edit tab row has a small label before each group.
- **Checked:** `tools/test.mjs` (123 pass, 3 new), `tools/check-load.mjs`. Live as GM on a throwaway Infiltration challenge: unsorted data showed grouped; arrows stopped at group edges; moving Alarm Bell down worked and saved the grouped order; typing "complication" on Loose Grate moved it to the end of Complication with its tab still selected. The panel wasn't opened; it reads the stored list, which was checked.
