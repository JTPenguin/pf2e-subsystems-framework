---
title: "Unticked Reached checkbox shows a filled grey square"
kind: work
status: proposed
waits_on: Justin
blocked_by: []
source: "Found by the edit-window restyle agent, 2026-11-12"
added: 2026-11-12
updated: 2026-11-12
---
# Unticked Reached checkbox shows a filled grey square

In the Counter window's threshold rows, the Reached checkbox shows a filled grey square while unticked, instead of an empty box. This was there before the edit-window restyle (commit `35e6695`).

## Likely cause (not confirmed)

The checkbox sits inside a bold `label` (`.ssm-row > label`, `font-weight: 600` in `styles/subsystems.css`). Foundry draws checkboxes with a Font Awesome icon, so the icon may take the bold weight and draw as the solid square. The sheet's Allow multiple subjects checkbox likely does the same, so a fix may touch the sheet too.

## Next step

Confirm the cause in the browser pane: compare the checkbox's computed `font-weight` and its icon glyph with a Foundry checkbox outside a bold label. Then fix it for both the threshold rows and the sheet.
