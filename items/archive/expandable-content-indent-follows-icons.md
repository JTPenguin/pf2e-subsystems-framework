---
title: "Indent expandable-section content from the first element after the caret"
kind: work
status: done
waits_on: none
priority: ⏫
blocked_by: []
added: 2026-11-13
updated: 2026-11-13
outcome: "Threshold, modifier and action content indents by the caret's width plus the row gap (1.75rem), so it starts at the first element after the caret. Measured in Foundry: all three line up to the pixel."
source: "Justin's words, 2026-11-13: in the challenge window, content inside expandable sections is indented to align with the element's name"
---
# Indent expandable-section content from the first element after the caret

In the challenge window, content inside an expandable section is indented to line up with the element's name. When the row has several icons on its left side, the name sits far to the right, so the indent is very large. Justin finds this undesirable.

## Decision (Justin, 2026-11-13)

Content indents to line up with the first element after the caret icon, whatever that element is. The row's other icons do not move the indent.

## Build notes

The indents are fixed sums of icon widths in `styles/subsystems.css`: thresholds at line 274 (caret, eye and points), action cards at line 362 (the caret slot), and modifiers at line 420 (caret, eye and On icon). Each becomes the caret's width plus the row's gap, so content starts at the first element after the caret.

## Done when

In the challenge window, the content of every expandable section lines up with the first element after its caret, including rows with several icons. The change is checked in the browser pane or in Foundry.
