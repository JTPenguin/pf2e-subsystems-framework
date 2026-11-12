---
title: "Add a description field to Actions"
kind: feature
status: ready
waits_on: Claude
blocked_by: []
source: "Justin's list of items, 2026-11-11; details from Justin's interview answers, 2026-11-11"
added: 2026-11-11
updated: 2026-11-11
---
# Add a description field to Actions

Actions get a description: what the action is and how players use it, for example "Spend an action to sway the merchant with a skill check".

## Decisions (Justin, 2026-11-11)

| Question | Answer |
|---|---|
| Who sees it | Everyone. One field, no separate player and GM text. |
| Kind of text | Plain text, several lines allowed. No rich text or enrichers. |

## What to build

- **Data.** Add `description: ""` to `newAction()` in `scripts/challenge/data.js`, to the action schema in `scripts/challenge/model.js`, and to `ACTION_FIELDS` so the action window saves it. Old challenges read as an empty description.
- **Action window.** A textarea under the name row in `templates/challenge-action.hbs`.
- **Challenge sheet.** Show the description under the action's name on the Run tab and on the Edit tab's action block. Keep line breaks (`white-space: pre-line`). Show nothing when it is empty.
- **Panel.** Show the description as a hover tooltip on the action. Escape the text, and keep line breaks. No tooltip when it is empty.
- **Search text.** `scripts/challenge/data.js` near line 292 collects action names for search; add the description there too.
- **Tests.** Extend `tools/test.mjs`: a new action has an empty description, and `saveAction` saves it.

## Order with the card redesign

The hover target on the panel changes when [[information-hierarchy-actions-modifiers]] turns actions into cards. Build the field now, with the tooltip on today's action line. Move the tooltip to the card when the card lands.

## Check

Edit an action's description in Foundry, then check the sheet's Run and Edit tabs and hover the action on the panel as GM and as a player.
