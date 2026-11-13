---
title: "Show challenge Counters above Modifiers and Subjects"
kind: feature
status: done
waits_on: Claude
priority: 🔼
blocked_by: []
added: 2026-11-12
updated: 2026-11-12
outcome: "Built and checked live in Foundry, 2026-11-12."
source: "Justin's UI list, 2026-11-12; sheet position set in triage interview, 2026-11-12"
---
# Show challenge Counters above Modifiers and Subjects

Challenge-level Counters should appear above Modifiers and Subjects, on the challenge sheet and on the panel. Inside a Subject, use the same order: Counters, then Modifiers, then Actions.

## Request (Justin, 2026-11-12)

- Challenge level, on the sheet and on the panel: Counters, then Modifiers, then Subjects.
- Inside each Subject: Counters, then Modifiers, then Actions.

## Decisions (Justin, 2026-11-12)

- **On the sheet, the Challenge block stays on top.** Order: Challenge fields, Counters, Modifiers, Subjects.

## What the code does now

| Where | Order now | Order wanted |
|---|---|---|
| Sheet, challenge level (`templates/challenge-sheet.hbs`) | Challenge fields, Modifiers, Subjects, Counters | Challenge fields, Counters, Modifiers, Subjects |
| Sheet, inside a subject | Description, Counters, Actions, Modifiers | Description, Counters, Modifiers, Actions |
| Panel, challenge level (`templates/challenge-panel.hbs`) | Round and party, Modifiers, Subjects, Counters | Round and party, Counters, Modifiers, Subjects |
| Panel, inside a subject | Description, Counters, Actions, Modifiers | Description, Counters, Modifiers, Actions |

## Plan

- Move the template blocks. On the panel, the challenge counter set (`ssmPanelCounters counterSet`) moves above `ssm-panel-challenge-mods`.
- Check the CSS that assumes the old order: `.ssm-panel-tracks` has a top border and padding meant for the bottom of the panel.
- Update spec 14.4 and any spec lines that list the order.

## How to check

Open a challenge with at least one Counter, one Modifier and one Subject that has all three kinds. Check the order on the sheet and on the panel, and again inside the Subject. On the panel, the borders between parts still look right.
