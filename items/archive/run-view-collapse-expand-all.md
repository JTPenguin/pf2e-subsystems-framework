---
title: Collapse and expand all subjects in Run view
kind: feature
status: done
waits_on: Claude
priority: 🔽
blocked_by: []
source: Justin's list of items, 2026-11-12; interview with Justin, 2026-11-12
added: 2026-11-12
updated: 2026-11-12
outcome: "A toggle above the subjects collapses all when any is open and expands all when all are collapsed, writing the collapsedSubjects user flag in one update. Checked live in Foundry by mouse clicks, including a reload and a subject's own chevron (2026-11-12)."
---
# Collapse and expand all subjects in Run view

## Decided (Justin, 2026-11-12)

- **One toggle** above the subjects. It collapses every subject when any is open, and expands every subject when all are collapsed. Its icon and tooltip change to match.
- It writes the same per-user flag as each subject's own chevron (`collapsedSubjects` in `sheet.js`), in one update.

**Done when:** the toggle collapses and expands all subjects, the state survives a reload, and each subject's own chevron still works.
