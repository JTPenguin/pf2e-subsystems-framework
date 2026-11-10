---
title: "Remove 'Active · Acted this round: X' line from the GM window"
kind: feature
status: done
waits_on: none
priority: 🔼
added: 2026-11-09
updated: 2026-11-09
outcome: "Removed the status line from the GM window header, with its unused lang strings and context field. Checked live: no .ssm-status in Edit or Run view; 123 tests pass."
source: "Justin's request, 2026-11-09; location confirmed in interview, 2026-11-09"
---
# Remove "Active · Acted this round: X" line from the GM window

Remove the status line under the challenge name in the GM window's header (`ssm-status` in `templates/influence-sheet.hbs`). It's the whole line, status included. The Party chips already show who has acted.

