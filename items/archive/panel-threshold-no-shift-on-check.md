---
title: "Panel thresholds: number and text do not move when the check appears"
kind: work
status: done
waits_on: none
priority: 🔼
blocked_by: []
source: "Justin's request, 2026-11-10; empty space picked in the triage interview, 2026-11-10"
added: 2026-11-10
updated: 2026-11-10
outcome: "The panel's check slot is 1.25em wide whether reached or not, matching Font Awesome 7's icon width, so the number and text stay put at any font size. Checked live 2026-11-10."
---
# Panel thresholds: number and text do not move when the check appears

On the panel, when a threshold is reached, the check appears and the number and description move slightly to the right. Justin wants the number and description to stay still.

**Decided (Justin, 2026-11-10):**

- The check's space is always kept, so the number and description stay where they are.
- An unreached threshold shows **empty space** there. No empty box.

**Where:** `.ssm-panel-threshold-mark` in `templates/influence-panel.hbs` is empty when unreached. Give it a fixed width in `styles/subsystems.css`.

Related: [[progress-bar-and-thresholds]] and [[threshold-unreach-by-click]].

**Done when:** on the panel, the threshold number and description stay in the same place when a threshold is reached and when it is unreached.
