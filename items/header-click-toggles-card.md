---
title: "Clicking a card header toggles it"
kind: work
status: ready
waits_on: Claude
priority: 🔽
blocked_by: [modifiers-collapsible-like-actions]
source: "Justin's UI list, 2026-11-12; details from Justin, 2026-11-12"
added: 2026-11-12
updated: 2026-11-12
---
# Clicking a card header toggles it

## Request (Justin, 2026-11-12)

- Clicking anywhere on an expandable card's header, other than its controls, expands or collapses it.

## Where the code does it now

- **Subject card:** only the chevron button toggles it (`templates/challenge-sheet.hbs`, `header.ssm-card-head`, `data-action="toggleCollapse"`). The header also holds the grip, eye, name, Complete and the edit and delete tools.
- **Action card:** only the name toggles it (`button.ssm-action-toggle`). The same line holds the skill chips, each with an eye, roll and chat buttons, and the row tools.

## Decided (Justin, 2026-11-12)

- Covers **subject cards, action cards and modifier rows**. Modifiers wait for [[modifiers-collapsible-like-actions]].
- **Action line:** anywhere except the skill chips (and their eyes) and the edit and delete tools.
- Category bars don't collapse (spec 14.4), so they stay as they are.
- Only a card that can open toggles: an action or modifier with no details stays inert.

## Next step

Add one click listener on the sheet for card headers. It ignores clicks on buttons, inputs, links, chips and the grip, then calls the same toggle as the chevron. Keep the chevron as the keyboard target. Clicking must not start a subject drag, and the grip must still drag.

## How to check

Click the empty parts of a subject header, an action line and a modifier row: each toggles. Click every control on those lines: each does only its own job. Drag a subject by its grip.
