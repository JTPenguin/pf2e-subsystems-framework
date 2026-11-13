---
title: "Collapse and expand all per category, in the category header"
kind: work
status: done
waits_on: none
priority: 🔽
blocked_by: []
source: "Justin's UI list, 2026-11-12; details from Justin, 2026-11-12"
added: 2026-11-12
updated: 2026-11-12
outcome: "Each subject category's red bar, the uncategorised one too, has its own collapse-all toggle beside its +; the single toggle above the subjects is gone. Checked in Foundry 2026-11-12."
---
# Collapse and expand all per category, in the category header

## Request (Justin, 2026-11-12)

- Collapse and expand all should apply to each subject category, and live in the category's red header bar.

## Where the code does it now

- `templates/challenge-sheet.hbs`: one `.ssm-collapse-all` toggle above all subject categories (`data-action="toggleCollapseAll"`).
- `scripts/challenge/sheet.js:347`: the `collapseAll` context. `:550-556`: `#onToggleCollapseAll` collapses every subject when any is open, and expands all when all are collapsed. The state is the `collapsedSubjects` user flag.
- `styles/subsystems.css:330-331`: the toggle's styles.
- Spec 14.8, "Collapsible subjects", describes the single toggle.

## Decided (Justin, 2026-11-12)

- **Remove the single toggle.** Each category's bar gets its own, including the uncategorised Subjects bar.
- Same rule per category: collapse the category's subjects when any is open, expand all when all are collapsed. The icon and tooltip follow.
- It sits on the bar beside the category's +.

## Next step

Pass a collapse-all state per subject group, and pass the category key to the action so it acts on that group's subjects only. Remove `.ssm-collapse-all`. Update spec 14.8.

## How to check

With two categories plus uncategorised subjects: each bar's toggle collapses and expands only its own subjects, its icon follows, and the state survives a reload. No toggle remains above the subjects.
