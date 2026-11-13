---
title: "Put the round buttons beside the portraits, and move the portraits up when there is no maximum rounds"
kind: work
status: done
waits_on: none
priority: ⏫
source: "Justin's list of items, 2026-11-12; layout chosen in triage, 2026-11-12"
outcome: "The round bar shows only with a maximum; the GM's round buttons sit either side of the portraits in both cases. Checked in Foundry with and without a maximum, as player and (locally faked) GM, 2026-11-12."
added: 2026-11-12
updated: 2026-11-12
---
# Put the round buttons beside the portraits, and move the portraits up when there is no maximum rounds

## The problem

In `templates/challenge-panel.hbs`, `.ssm-panel-rounds` holds the GM's previous-round button, the round bar and the next-round button. The party portraits sit in `.ssm-panel-party` below it. With no maximum rounds, `roundSegments` (`scripts/challenge/panel-view.js`) returns no segments, but the row still renders: the empty bar keeps its `flex: 1 1 4rem` space and the portraits stay below it.

## Decision

The previous and next round buttons always flank the portrait row, with or without a maximum. Justin, 2026-11-12.

- **With a maximum:** the round bar sits above, on its own. The portraits sit below, between the buttons.
- **With no maximum:** no round bar. The portraits move up into its place, still between the buttons.
- **Players** see no buttons; only the bar (if any) and the portraits.

## Next step

Group the bar and the portraits in `.ssm-panel-run`. Render the bar only when there are segments. Put the buttons in the portrait row, one each side. A party with no PCs still needs the buttons, so the row renders for the GM even when `party` is empty.

## Check

In Foundry, as GM and as a player, open a challenge with a maximum and one without, and one with no party. Check the layout in each case and that both buttons still work.
