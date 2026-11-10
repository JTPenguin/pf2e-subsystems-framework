---
title: "Let the GM click party portraits on the panel to mark them acted"
kind: feature
status: done
waits_on: none
priority: 🔽
blocked_by: []
source: "Justin's request, 2026-11-10"
added: 2026-11-10
updated: 2026-11-10
outcome: "The GM can click (or Enter/Space) a party portrait on the panel to toggle whether that PC has acted, matching the GM window chip; players' portraits are unchanged. Checked live with real clicks and keys as GM; player view emulated."
---
# Let the GM click party portraits on the panel to mark them acted

The GM should be able to click a character portrait on the panel to toggle whether that PC has acted this round.

- It does the same as the party chips in the GM window's run strip (`toggleActed` in `run.js`). A lit portrait dims, a dimmed one lights.
- Only the GM can click. Players see the portraits as now.
- The portraits are the `ssm-panel-pc` images in `templates/influence-panel.hbs`. Dragging the panel must still work.

Related: [[gm-toggle-categories-on-panel]], which adds the same kind of GM click for modifier cards.

**Done when:** on a live challenge, a GM click on a portrait changes it on the panel and the matching chip in the GM window, and a player's click does nothing.
