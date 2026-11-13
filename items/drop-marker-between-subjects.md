---
title: "Drop marker appears between subjects"
kind: work
status: ready
waits_on: Claude
priority: 🔽
blocked_by: []
source: "Justin's UI list, 2026-11-12; details from Justin, 2026-11-12"
added: 2026-11-12
updated: 2026-11-12
---
# Drop marker appears between subjects

## Request (Justin, 2026-11-12)

- When dragging a subject to reorder it, the marker shows at the top or bottom edge inside another subject. It should sit in the gap between subjects, so the drop point is clear.

## Where the code does it now

- `scripts/challenge/sheet.js:503-527`: the drop place is before or after the card under the pointer, by which half the pointer is in. It sets `ssm-drop-before` or `ssm-drop-after` on that card.
- `styles/subsystems.css:328-329`: each draws an inset 3px `box-shadow` inside the card's top or bottom edge.
- `styles/subsystems.css:379`: cards in a category are `gap: 0.25rem` apart.
- So "after card A" and "before card B" mean the same place, but draw in two different spots, neither in the gap.

## Next step

Draw the marker as a pseudo-element outside the card, centred in the gap above or below it, for example `top: calc(-1 * gap / 2)`. Widen the gap slightly if a 3px line doesn't read in 0.25rem. Leave the drop logic as it is.

## How to check

Drag a subject over each card in a category with three or more subjects. The line always sits in the gap, the same line for "after A" and "before B", and the drop lands there.
