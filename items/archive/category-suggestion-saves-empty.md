---
title: "Clicking a category suggestion can save an empty category"
kind: work
status: done
waits_on: Claude
priority: ⏫
blocked_by: []
source: "Found by the edit-window restyle agent, 2026-11-12"
added: 2026-11-12
updated: 2026-11-12
outcome: "Fixed 2026-11-12. Confirmed cause: pressing on a suggestion blurred the field, the blur saved the cleared value, and the save redrew the window, which closed the menu before the button came up, so the click never reached the pick. A fast click (release before the redraw) still worked, which is why the bug showed only sometimes; the type-part path runs the same race. Pressing on the menu now keeps focus in the field (mousedown preventDefault in category-autocomplete.js), so only the pick saves. Checked live in both windows: clear then click, type part then click, and arrow keys plus Enter."
---
# Clicking a category suggestion can save an empty category

In a Subject or Modifier window, after clearing the Category field, clicking a suggestion once saved an empty category instead of the pick. Typing part of the name and then clicking a suggestion worked.

## Cause (confirmed 2026-11-12)

The windows save on every change. Clicking a suggestion blurs the field first, so the empty value saves and the window redraws before the click lands. The suggestions are in `scripts/challenge/category-autocomplete.js`.

## Fix

A `mousedown` on the suggestion menu now calls `preventDefault`, so the field keeps focus and no blur save runs. The click then picks the suggestion as before.
