---
title: "Put the action name on the top line of the action"
kind: feature
status: done
waits_on: Claude
priority: ⏫
blocked_by: []
added: 2026-11-12
updated: 2026-11-12
outcome: "Name on line 1, checks on line 2, description last (2026-11-12)."
source: "Justin's UI list, 2026-11-12; scope set in triage interview, 2026-11-12"
---
# Put the action name on the top line of the action

On the challenge sheet, the action's name should take the header line. The checks move down to the next line. The description, if there is one, sits below the checks.

## Request (Justin, 2026-11-12)

- Line 1: the action's name.
- Line 2: the checks.
- Line 3: the description, only when present.

## Decisions (Justin, 2026-11-12)

- **Sheet only.** The panel already shows the name, then its checks as small inline buttons. Make the sheet match it.

## What the code does now

- `templates/challenge-sheet.hbs`, the `ssm-action-card` block: one `ssm-skill-line` holds the name (or its toggle button), the `ssm-skill-grid` of checks, and the row tools. The description opens below it.
- `styles/subsystems.css`: the name is a fixed `6.5rem` column (`.ssm-skill-line > .ssm-stat-label`), and the description is indented `7rem` (`.ssm-run-description`) to line up with the checks.

## Plan

- Line 1: the name or its toggle, the secret icon, then the row tools on the right. A click on the empty part still opens the card (`ChallengeSheet.HEADERS` includes `.ssm-skill-line`).
- Line 2: the checks, on their own line. Leave out the "No checks" line's indent.
- Drop the fixed name column and the description's `7rem` indent.
- Do this with [[action-checks-compact-width]]: both change the same markup and CSS.

## How to check

Open an action with a name, two checks and a description. The name is on top, the checks below it, the description last. Open an action with no description and check there is no empty third line. Click the empty part of the name line: the card still opens and closes.
