---
title: "Collapsed subjects should show only the header in Run view"
kind: work
status: ready
waits_on: Claude
priority: ⏫
blocked_by: []
source: "Justin's list of items, 2026-11-12; interview with Justin, 2026-11-12"
added: 2026-11-12
updated: 2026-11-12
---
# Collapsed subjects should show only the header in Run view

In Run view, a collapsed subject still leaves a small empty space in its box. A collapsed subject should show only its header.

**Found:** `styles/subsystems.css` hides every child but the header (`.ssm-subject.ssm-collapsed > :not(.ssm-block-head)`). The space likely comes from the box's padding or the header's bottom margin, which stay. Check in the browser pane before changing it.

**Done when:** a collapsed subject is only as tall as its header row, checked live.
