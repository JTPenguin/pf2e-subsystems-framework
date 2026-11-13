---
title: "Bar, Steps and Track counters fill the panel width"
kind: feature
status: ready
waits_on: Claude
priority: 🔼
blocked_by: []
added: 2026-11-12
updated: 2026-11-12
source: "Justin's UI list, 2026-11-12; scope set in triage interview, 2026-11-12"
---
# Bar, Steps and Track counters fill the panel width

Counters shown as a Bar, Steps or Track should always take the full width of the panel. They should never sit side by side with another counter.

## Request (Justin, 2026-11-12)

- Bar, Steps and Track counters span the full panel width.
- They never share a row with another counter.

## Decisions (Justin, 2026-11-12)

- **Panel, challenge level only.** Per-PC counters and plain Number counters stay as they are.

## What the code does now

- On the sheet, every counter already takes a full row.
- On the panel, `ssmPanelCounters` puts Bar, Steps and Track counters in `.ssm-panel-tracks`, a wrapping flex row. Each `.ssm-panel-track` is `flex: 1 1 12rem`, so two or more sit side by side on a wide panel.
- Inside a subject, `.ssm-panel-subject-counters .ssm-panel-track { flex-basis: 100%; }` already gives each one its own row.

## Plan

- Give challenge-level `.ssm-panel-track` rows a full-width basis too, but not `.ssm-panel-pc-counter`, which shares the class.
- Likely a one-line CSS change. Check the gap between rows looks right once they stack.

## How to check

On the panel, add one Bar, one Steps and one Track counter at challenge level, and one per-PC and one Number counter. Each of the first three takes the full width on its own row. The per-PC and Number counters lay out as before.
