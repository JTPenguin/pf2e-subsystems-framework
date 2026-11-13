---
title: "Make action checks smaller and fit their content"
kind: feature
status: ready
waits_on: Claude
priority: ⏫
blocked_by: []
added: 2026-11-12
updated: 2026-11-12
source: "Justin's UI list, 2026-11-12; scope set in triage interview, 2026-11-12"
---
# Make action checks smaller and fit their content

Action checks on the challenge sheet are too big. They should be smaller and only as wide as their text, so they line up with the inline roll styles.

## Request (Justin, 2026-11-12)

- Make action checks smaller.
- Size each check to its content, not the full width of the row.
- Match the look of the inline roll styles.

## Decisions (Justin, 2026-11-12)

- **Sheet only.** The panel's check buttons already copy PF2e's inline check (`a.inline-check` in `pf2e.css`; see the comment above `.ssm-panel button.ssm-panel-skill` in `styles/subsystems.css`).

## What the code does now

- `.ssm-skill-grid` is a grid of `minmax(11rem, 1fr)` columns, so every check is at least 11rem and stretches to fill its column.
- Each check (`.ssm-skill`) is `1.6rem` tall with `font-size-13`, and holds three buttons: the eye, the roll (name and DC) and the post-to-chat button.

## Plan

- Change `.ssm-skill-grid` to a wrapping flex row, with each check sized to its content. Remove the ellipsis on the name, since checks no longer have a fixed width.
- Bring the height, padding and font size in line with PF2e's inline check on the sheet. Use the theme's variables, since the sheet follows the light or dark theme, unlike the panel.
- Keep the eye and post buttons inside the check.
- Do this with [[action-name-on-header-line]].
- Related but separate: [[checks-table-compact]] covered the checks table in the Edit window.

## How to check

Open an action with a short check (for example "Perception DC 20") and a long one (a Lore). Each check is only as wide as its text, and they wrap onto a second line when the row is full. Compare with an inline `@Check` roll in the action's description: no size jump. Check in both Foundry themes.
