---
title: Drag and drop to reorder subjects, replacing the arrows
kind: feature
status: ready
waits_on: Claude
priority: 🔽
blocked_by: []
source: Justin's list of items, 2026-11-12; interview with Justin, 2026-11-12
added: 2026-11-12
updated: 2026-11-12
---
# Drag and drop to reorder subjects, replacing the arrows

## Decided (Justin, 2026-11-12)

- **Drag a subject by a grip on its card header.** The Edit-tab half (drag a subject's tab) went with the tabs in [[combine-edit-and-run-views]].
- **Within a category only:** a subject can't be dropped into another category's group; its category changes only through the subject window's field ([[run-view-subject-grouping]]).
- The up and down arrows go (the `ssmOrder` partial, and `SSM.Challenge.MoveUp` and `MoveDown`).

**How:** Foundry v14's `DragDrop` helper (`client/applications/ux/drag-drop.mjs`). A drop writes the new subject order; `moveSubject` in `data.js` can become a move-to-index. Only the GM can drag.

**Done when:** a GM can reorder subjects by drag, the panel's columns follow, and tests pass.
