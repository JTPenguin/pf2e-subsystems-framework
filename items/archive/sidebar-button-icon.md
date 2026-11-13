---
title: "Give the sidebar button its own icon"
kind: work
status: done
waits_on: none
priority: ⏫
blocked_by: []
source: "Justin's list, 2026-11-12; icon picked by Justin in triage, 2026-11-12"
added: 2026-11-12
updated: 2026-11-12
outcome: "Sidebar tab icon is now fa-solid fa-chess-knight (scripts/directories.js). Checked in Foundry: it shows between Journal and Tables, distinct from chat's fa-comments."
---
# Give the sidebar button its own icon

The module's sidebar button uses `fa-solid fa-comments`, the same icon as the chat tab, so the two are hard to tell apart.

## Decision (Justin, 2026-11-12)

Use `fa-solid fa-chess-knight`. It is in the Font Awesome that Foundry ships, and no core tab uses it.

## Next step

Change the icon in the `Sidebar.TABS` entry in `scripts/directories.js` (around line 266). Check both buttons in the Foundry sidebar in light and dark themes.
