---
title: "Give the panel a solid header"
kind: work
status: done
waits_on: none
priority: ⏫
source: "Justin's list of items, 2026-11-12; colour chosen in triage, 2026-11-12"
outcome: "The panel header is a dark tint of the PF2e red, edge to edge under the gold border; it still drags the panel. Checked in Foundry as player and (locally faked) GM, 2026-11-12."
added: 2026-11-12
updated: 2026-11-12
---
# Give the panel a solid header

The panel over the canvas gets a solid header bar, in the spirit of the red section headers on the challenge sheet (`.ssm-sheet .ssm-block-head` in `styles/subsystems.css`).

## Decisions

- **Colour:** a dark, semi-transparent tint of the PF2e red (`--color-pf-primary`, `#5e0000`), so it sits quietly on the near-black panel. Not the sheet's full solid red, and not the panel's gold. Justin, 2026-11-12.
- **Contents:** keep what `.ssm-panel-head` holds today: the challenge name (a button for the GM), the round text, and the reset button once the panel is moved.
- **Width:** assumed edge to edge, under the panel's gold border. The panel has `0.4rem 0.75rem` padding, so the bar needs negative margins (or the padding moves to the body) and rounded top corners to match the 6px border radius.

## Next step

Restyle `.ssm-panel-head` in `styles/subsystems.css`. Keep it the drag handle: its cursor, `touch-action` and `user-select` rules stay. Use the same header style as [[subject-border-and-header]] where it helps, but the subject headers are gold, not red.

## Check

Open a running challenge's panel in Foundry, as GM and as a player. Check the bar spans the panel, the name, round text and reset button sit in it, and the panel still drags by the header.
