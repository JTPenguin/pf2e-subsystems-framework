---
title: "Let players and GMs resize the panel from the bottom-right corner"
kind: feature
status: done
waits_on: none
priority: 🔼
blocked_by: []
source: "Justin's request, 2026-11-10; behavior picked in the triage interview, 2026-11-10"
added: 2026-11-10
updated: 2026-11-10
outcome: "The panel has a bottom-right corner handle for players and GMs. The size is saved per user with the spot, kept on screen, and cleared by Reset, now labelled Reset position and size. Checked live as GM and player 2026-11-10."
---
# Let players and GMs resize the panel from the bottom-right corner

Anyone who can see the panel, player or GM, can resize it by dragging the bottom-right corner.

**Decided (Justin, 2026-11-10):**

- Drag from the bottom-right corner to resize. The corner has a visible handle.
- **Reflow, not zoom.** Width and height change, cards rewrap, and a scrollbar appears when the content is taller than the panel.
- **Remembered per user**, like the dragged position.

**Where:** `scripts/panel/panel.js` already saves each user's dragged spot in a client setting (`SPOT_SETTING`) and keeps the panel on screen with a `ResizeObserver`. Save the size next to the spot, and keep a resized panel on screen the same way. Set a sensible minimum size.

**Done when:** as a player and as a GM, the panel shows a corner handle, resizes when it is dragged, rewraps its cards, scrolls when needed, and keeps its size after a reload. Check it in Foundry.
