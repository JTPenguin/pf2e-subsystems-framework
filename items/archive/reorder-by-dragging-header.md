---
title: "Reorder Modifiers, Subjects and Counters by dragging their header"
kind: feature
status: done
waits_on: none
priority: 🔽
blocked_by: []
added: 2026-11-12
updated: 2026-11-12
outcome: "Subjects, modifiers and counters drag by their header within their own group on the sheet (GM only); grip removed; moveModifier() and moveCounter() added with tests. Checked live with dispatched drag events."
source: "Justin's UI list, 2026-11-12; scope set in triage interview, 2026-11-12"
---
# Reorder Modifiers, Subjects and Counters by dragging their header

Justin wants to reorder items inside a section by dragging anywhere on the item's header. This covers reordering within a section, not the sections themselves.

## Request (Justin, 2026-11-12)

- Drag an item by any part of its header to reorder it: Modifiers, Subjects and Counters.
- Remove the rearrange handle from Subjects.

## Decisions (Justin, 2026-11-12)

- **Sheet only.** The panel shows the new order but has no dragging.
- **Within its own group.** A subject or modifier moves only inside its category; a counter only inside its list (the challenge's, or one subject's). Dragging never changes a category.

## What the code does now

- Only subjects can be reordered. `ChallengeSheet` in `scripts/challenge/sheet.js` binds a Foundry `DragDrop` with `dragSelector: ".ssm-subject-grip"` and `dropSelector: ".ssm-subject-card"`. `moveSubject()` in `scripts/challenge/data.js` writes the order.
- Modifiers and counters have no handle and no way to reorder. This item adds that.
- The drop marker is drawn in the gap between cards (commit 6225a6f).

## Plan

- Make the header the drag source: a subject's `.ssm-card-head`, a modifier's `.ssm-entry` row and a counter's first `.ssm-entry` row. Remove the grip.
- A drag must not start from a control: reuse `ChallengeSheet.HEADER_CONTROLS`. A plain click still opens and closes the card.
- Add move functions for modifiers and counters next to `moveSubject()`, with tests in `tools/test.mjs`.
- Only a GM can drag, as now.

## How to check

On the sheet, drag a Subject, a Modifier and a Counter by its header to a new spot in its group. The order sticks after a reload and shows on the panel. Dragging into another category or list does nothing. Clicking the header's buttons still works and does not start a drag. A plain click on the header still opens and closes it.
