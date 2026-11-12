---
title: "Center the party portraits in the panel"
kind: work
status: done
waits_on: none
blocked_by: []
source: "Justin's list of items, 2026-11-11; details from Justin's interview answers, 2026-11-11"
added: 2026-11-11
updated: 2026-11-11
outcome: "Done 2026-11-11. justify-content: center on .ssm-panel-party in styles/subsystems.css. Justin checked it in Foundry."
---
# Center the party portraits in the panel

The row of party portraits under the round bar sits at the left of the panel. Justin wants the row centred in the panel (confirmed 2026-11-11). The crop inside each circle is fine.

## What to change

- `styles/subsystems.css`, `.ssm-panel-party`: add `justify-content: center`. The row wraps, so each wrapped line centres too.
- Leave `.ssm-panel-pc` alone: `object-position: top` and the acted dimming stay as they are.
- The portraits in per-PC counters and individual subjects (`.ssm-panel-pc-row`, `.ssm-panel-pc-values`) are not part of this item.

## Check

Open the panel in Foundry with several party members, as GM and as a player. Check the row is centred at the default width and after resizing the panel narrow enough to wrap.
