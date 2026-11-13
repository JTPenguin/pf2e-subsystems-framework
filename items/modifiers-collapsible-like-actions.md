---
title: "Collapsible modifiers, styled like actions"
kind: work
status: ready
waits_on: Claude
priority: 🔽
blocked_by: []
source: "Justin's UI list, 2026-11-12; details from Justin, 2026-11-12"
added: 2026-11-12
updated: 2026-11-12
---
# Collapsible modifiers, styled like actions

## Request (Justin, 2026-11-12)

- Modifiers on the sheet should collapse like actions, with the same card style and chevron. Today they are always expanded rows.

## Where the code does it now

- `templates/challenge-sheet.hbs`, the `ssmModGroups` partial: each modifier is a row (eye, On toggle, name and tags, edit and delete), with `ssmModifierDetails` always shown under it.
- `ssmModifierDetails` shows the DC change and note (`effectsText`, `scripts/challenge/sheet.js:369`), the player text and the GM text.
- Actions do it with `openActions` (`scripts/challenge/sheet.js:26-27`, `:340`, `:558-562`): a set of `pageId:actionId` keys, toggled by `#onToggleAction` and forgotten on reload. The chevron shows only when the action has a description.

## Decided (Justin, 2026-11-12)

- **Collapsed:** the name row only: eye, On toggle, name, tags, edit and delete.
- **Chevron** only when the modifier has details: a DC change, a note, player text or GM text.
- **Starts collapsed.** The state is each user's own and lasts until the page reloads, as for actions.
- Applies to the challenge's modifiers and to each subject's.

## Next step

Add an open set for modifiers, or generalise `openActions` to hold both kinds. Add a chevron before the name, using the action card's chevron style, and show `ssmModifierDetails` only while open. Keep the eye, the On/spent toggle and the row tools working while collapsed.

## How to check

On a challenge with modifiers with and without details: all start collapsed; only those with details show a chevron; opening one shows its DC change, note and texts; the eye and On toggle work while collapsed; after a reload they are collapsed again.
