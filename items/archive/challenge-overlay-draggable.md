---
title: "Let players drag the challenge overlay on the canvas"
kind: feature
status: done
waits_on: none
priority: 🔼
blocked_by: []
source: "Justin's request, 2026-11-09; details from the items interview, 2026-11-09"
added: 2026-11-09
updated: 2026-11-09
outcome: "Done 2026-11-09. The panel drags by its header; each user's spot is saved per browser in a client setting keyed by user id; the world setting stays the starting spot; a reset button shows once dragged; the panel is clamped on screen. Checked live as GM and Test Player 2 (reload, reset, skill clicks, small windows)."
---
# Let players drag the challenge overlay on the canvas

Players can drag the challenge overlay around the canvas. It still cannot be closed.

**Now:** the panel sits in `#ui-top`, placed by the world setting `panelPosition` (center, left or right) in `scripts/panel/panel.js`.

**Decided (Justin, 2026-11-09):**

- Each player keeps their own spot, saved per client so it survives reloads.
- The GM's world setting stays as the starting spot for anyone who hasn't dragged it.
- A "reset position" option puts it back at the starting spot.
- The drag must not break clicks on skill buttons (the panel already holds redraws back during a press).

**Next step:** add a drag handle (the header), a client setting for the saved position, and the reset option. Keep the panel on screen when the window shrinks. Check it with two players on a live canvas.
