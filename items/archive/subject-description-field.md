---
title: "Subjects get a description field instead of a stat line"
kind: feature
status: done
waits_on: none
priority: 🔼
blocked_by: []
source: "Justin's list of items, 2026-11-11; visibility from Justin, 2026-11-12"
added: 2026-11-11
updated: 2026-11-12
outcome: "Subjects have a rich-text description in place of the stat line. The sheet edits it with the same editor as an action's; Run view and the panel show it under the name, the panel without secret blocks. An old stat line becomes the description. Checked by tests and live in Foundry, 2026-11-12."
---
# Subjects get a description field instead of a stat line

On a subject, replace the GM-only stat line with a description field. It is a text area, so a GM can write a few sentences. It should be rich text, like the action description.

**Visibility (Justin, 2026-11-12):** players see it. The panel shows it as regular text in the subject's column, under the name, not as a tooltip.

**Done when:** a subject shows a description text area where the stat line was, the text saves and reloads, the panel shows it as text for GM and players, and spec 14.2's stat line row is updated.
