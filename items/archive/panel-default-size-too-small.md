---
title: "Panel at default size is too short for its content"
kind: work
status: done
waits_on: none
blocked_by: []
source: "Justin's list of items, 2026-11-11"
added: 2026-11-11
updated: 2026-11-11
outcome: "Done 2026-11-11. Cause: the resize handle's negative bottom margin cancelled the panel's bottom padding in its height but not in its scroll height, leaving 6px of overflow (350 vs 356). The padding now sits on the content above the handle, and the handle has no bottom margin. Checked live as GM and player: scroll height equals height, the handle stays in the corner while scrolling."
---
# Panel at default size is too short for its content

At default size the panel is a little too small for what it holds. The panel fits its height to the content, up to a maximum. Even so, the content runs slightly past the bottom of the panel, and a scroll bar appears.

**Where to look first** (`styles/subsystems.css`):

- The resize handle is `position: sticky` with negative margins (line 164). It may add a few pixels the panel's height doesn't count, which would explain a scroll bar of only a few pixels.
- The height limits: 80% of `#ui-top` at the starting spot (line 152), and 40% of the screen once dragged (line 158). A full panel may simply hit one of these.

Reproduce it first, at the starting spot and after a drag, to tell which it is. If it is the limit, the fix is a taller limit; if it is the handle, the content should fit with no scroll bar at all.

**Done when:** at default size, with a full panel, no scroll bar appears and no content is cut off. Check it in Foundry on a live panel, for both the player and the GM view.
