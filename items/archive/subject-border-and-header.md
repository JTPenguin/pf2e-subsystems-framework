---
title: "Give subjects on the panel a border and a solid header"
kind: work
status: done
waits_on: none
priority: ⏫
source: "Justin's list of items, 2026-11-12; style chosen in triage, 2026-11-12"
outcome: "Each panel subject is a gold-bordered card with a faint gold header; the divider between subjects is gone. Checked in Foundry with one and two subjects, 2026-11-12."
added: 2026-11-12
updated: 2026-11-12
---
# Give subjects on the panel a border and a solid header

Each subject on the panel sits in a bordered card with a header bar across its top, so each subject reads apart from the next.

## Decisions

- **Style:** a faint gold tint for the header and a gold border, matching the panel's own frame (`#b8a06a`). Not red: the red tint is for the panel header ([[panel-solid-header]]). Justin, 2026-11-12.
- **Collapse:** not a question here. Subjects on the panel can't collapse; only the sheet's subject cards do.

## Next step

In `styles/subsystems.css`:

- Give `.ssm-panel-subject` a border, radius and inner padding.
- Make `.ssm-panel-subject > .ssm-panel-points` (the row with the subject name and complete mark) the header bar, edge to edge inside the card.
- Drop the divider between subjects (`.ssm-panel-subject + .ssm-panel-subject` sets `padding-left` and `border-left`); the card borders replace it.
- Check the width limits still hold: `max-width: 32rem`, `17rem` for several subjects, and `none` on a resized panel.

## Check

In Foundry, open panels with one subject and with several, and a resized panel. Check each subject has its border and header, a complete subject still dims its actions, and nothing overflows.
