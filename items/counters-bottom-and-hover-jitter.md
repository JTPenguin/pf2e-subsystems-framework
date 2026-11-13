---
title: "Last section runs into the window bottom; counter hover jitter"
kind: work
status: ready
waits_on: Claude
priority: ⏫
blocked_by: []
source: "Justin's UI list, 2026-11-12; details from Justin, 2026-11-12"
added: 2026-11-12
updated: 2026-11-12
---
# Last section runs into the window bottom; counter hover jitter

## Request (Justin, 2026-11-12)

- On the **Challenge sheet**, the last section (the challenge's Counters) runs into the bottom of the window, even when scrolled all the way down.
- Hovering over a counter control that glows (the + and −, the eye, the edit and delete icons) makes the bottom of the card jitter for a second or two.
- Adding another counter fixes both, so they may share a cause.

## Where the code does it now

- `styles/subsystems.css:5`: `.ssm-body` is the scroll area: a flex column with `overflow-y: auto`, `gap: 0.5rem` and no bottom padding.
- `styles/subsystems.css:342` and `:379` give `flex: none` to the Challenge block and the subject categories only. The challenge's Modifiers block and the Counters block (`templates/challenge-sheet.hbs`, `section.ssm-counters`) keep the default `flex-shrink: 1`.
- The glow is a `text-shadow` on hover (`styles/subsystems.css`, the "Icon controls are bare icons" rules). A text-shadow doesn't change layout by itself.

## Likely cause (not yet checked live)

- **Bottom:** the Counters block can shrink to fit the scroll area, and the scroll area has no bottom padding, so its bottom border sits on the window edge.
- **Jitter:** when the content is almost exactly as tall as the scroll area, a small change shows and hides the scrollbar. Each change alters the width, rows rewrap, and the height changes again, until it settles. More content keeps the scrollbar on for good, which is why another counter fixes it.

## Next step

1. Reproduce on the sheet in the browser pane, with a challenge whose counters end near the window bottom.
2. Give every `.ssm-body > .ssm-block` `flex: none`, add bottom padding to `.ssm-body`, and try `scrollbar-gutter: stable` on it.
3. If the jitter remains, look for a Foundry transition on hover or a tooltip that changes layout.

## How to check

Resize the sheet so the last counter ends at the window bottom, scroll to the end, and hover each counter control. The last section shows its bottom border with a gap below it, and nothing moves.
