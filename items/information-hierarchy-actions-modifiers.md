---
title: "Improve visual hierarchy: Actions and Modifiers sections"
kind: feature
status: ready
waits_on: Claude
blocked_by: []
source: "Justin's list of items, 2026-11-11; details from Justin's interview answers, 2026-11-11"
added: 2026-11-11
updated: 2026-11-11
---
# Improve visual hierarchy: Actions and Modifiers sections

The sheet and the panel need a clearer order of information: a section for actions, then a section for modifiers split by category. "Modifier type" here means the modifier's category (spec 14.7).

**Next step:** Claude drafts the design, as a mockup of the sheet and the panel. Justin reviews it before anything is built.

## Decisions (Justin, 2026-11-11)

| Question | Answer |
|---|---|
| Blank-category modifiers | Above the labelled sections, with no heading, on the panel and on the sheet's Run and Edit tabs. Today they go last. |
| Empty sections on the panel | Every category shows, with an empty state when none of its modifiers are revealed. The blank category is the exception: it shows only when at least one of its modifiers is revealed. |
| Challenge-level modifiers | Stay as one strip under the round bar. No category sections. |

## Edit and Run tabs on the sheet

- **Actions section.** Holds the subject's actions. Each action is a card, styled like a modifier card.
- **Modifiers section.** Blank-category modifiers first, then one subsection for each category.

## Panel

- **Actions.** Each action is a card holding its check buttons. The card is the hover target for the action's description ([[action-description]]).
- **Modifiers.** Blank-category cards first, with no heading. Then one section for each category, with an empty state when nothing in it is revealed.

## Code to change

- Category order: `scripts/challenge/sheet.js` (groups, near line 25) and `scripts/challenge/panel-view.js` (line 105) both put the blank category last. Change both, and the spec 14.7 line that says so.
- The panel's grouping drops categories with nothing revealed; it must now keep labelled ones.
- Templates: `templates/challenge-sheet.hbs` and `templates/challenge-panel.hbs`.

## For the design to answer

- What an action card shows on each surface: name, Secret mark, maximum points, check chips, outcome lines.
- How a category heading and its empty state look on the panel, and the empty-state text.
- Whether category headings use the category's stripe colour.
