---
title: "Let the GM move to the next or previous round from the panel"
kind: feature
status: done
waits_on: none
priority: 🔽
blocked_by: []
source: "Justin's request, 2026-11-10"
added: 2026-11-10
updated: 2026-11-10
outcome: "The GM has Previous and Next round buttons beside the panel's round bar, with the same action and disabled cases as the GM window; Round X of Y now sits at the header's top right for everyone. Checked live as GM; player view emulated."
---
# Let the GM move to the next or previous round from the panel

The GM should be able to move to the next or previous round from the panel, without opening the GM window.

**Layout:**

- **GM:** a Previous round button before the round bar and a Next round button after it, on the same row.
- **Players:** no buttons. The round bar still fills the full width, as now.
- **Everyone:** the "Round 1 of 3" text moves out of the round row, up to the top right of the header, on the same line as the challenge name.

**Behavior:** the buttons do the same as Previous and Next round in the GM window's run strip (`undoRound` and `advanceRound` in `run.js`), and are disabled in the same cases.

The panel's round row is `ssm-panel-rounds` in `templates/influence-panel.hbs`. Dragging the panel by its header must still work.

Related: [[gm-open-challenge-window-from-panel]] also changes the header, and [[gm-toggle-party-portraits-on-panel]] adds another GM click to the panel.

**Done when:** on a live challenge, the GM's buttons change the round on the panel and in the GM window, a player's panel shows the full-width bar with no buttons, and the round text sits beside the challenge name.
