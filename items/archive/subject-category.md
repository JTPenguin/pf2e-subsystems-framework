---
title: "Add a Category field to subjects, replacing subject templates"
kind: feature
status: done
waits_on: none
outcome: "Built 2026-11-12. Subjects have a Category field with their own suggestions; Infiltration has one Add button and GM notes on setting up complications and opportunities. Tests pass (120); checked live in Foundry."
priority: 🔽
blocked_by: []
source: "Justin's tweaks to the restyled edit view, 2026-11-12; interview with Justin, 2026-11-12"
added: 2026-11-12
updated: 2026-11-12
---
# Add a Category field to subjects, replacing subject templates

The top section of a subject tab becomes "Subject". It keeps Name, Description and Revealed, and gets a new Category field. Categories sort subjects into groups such as Obstacles, Complications and Opportunities.

## Decided (Justin, 2026-11-12)

- **The field works like the modifier category field:** free text, with a suggestion menu as the GM types (as in `entry-window.js`).
- **Its own suggestions:** the preset's subject category names plus categories already used on subjects. Modifier categories stay separate.
- **One Add button.** The preset's subject templates go: Infiltration's Add Complication and Add Opportunity buttons are dropped. The one button makes the preset's first subject. The GM sets the category, and any links such as failure rows to Awareness, by hand.

## Plan

- Add `category` to the subject model (`model.js`) and to new subjects.
- Add `subjectCategories` to presets that need it, in place of their extra templates. Infiltration: Obstacle, Complication, Opportunity.
- Remove the extra templates, `subjectTemplates` and the `addSubjectButtons` loop. Update the tests that cover them (`tools/test.mjs`, around line 1415).
- Update spec 14.10 (subject templates) and the Infiltration GM notes, so they say how to set up a complication.
- Grouping subjects by category in Run view is a separate item: [[run-view-subject-grouping]].

**Done when:** a subject saves its category, the suggestions show, Infiltration has one Add button, tests pass, and it's checked in Foundry.

## Outcome

- **Built:** `category` on the subject model; presets make one subject (`subject`, in place of the `subjects` template list) and can suggest `subjectCategories`. Infiltration suggests Obstacle, Complication and Opportunity. The suggestion menu is shared with the modifier window (`category-autocomplete.js`).
- **Infiltration GM notes** now say how to turn an obstacle into a complication or an opportunity. Existing Infiltration challenges keep their old notes.
- **Checked:** `tools/test.mjs` (120 pass), `tools/check-load.mjs`. Live in the test world as GM: a new Infiltration challenge shows one Add Obstacle button; the subject tab's Subject section has Category; the menu offers the three suggestions, filters as you type, and saves the pick; a custom "Guard Post" shows up as a suggestion on a new obstacle; the modifier window's menu still works and does not offer subject categories.
