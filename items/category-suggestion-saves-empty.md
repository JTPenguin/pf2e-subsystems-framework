---
title: "Clicking a category suggestion can save an empty category"
kind: work
status: proposed
waits_on: Justin
blocked_by: []
source: "Found by the edit-window restyle agent, 2026-11-12"
added: 2026-11-12
updated: 2026-11-12
---
# Clicking a category suggestion can save an empty category

In a Subject or Modifier window, after clearing the Category field, clicking a suggestion once saved an empty category instead of the pick. Typing part of the name and then clicking a suggestion worked. Not yet known whether this predates the edit-window restyle (commit `35e6695`).

## Likely cause (not confirmed)

The windows save on every change. Clicking a suggestion blurs the field first, so the empty value saves and the window redraws before the click lands. The suggestions are in `scripts/challenge/category-autocomplete.js`.

## Next step

Reproduce it in the browser pane. If the blur save is the cause, pick the suggestion on `pointerdown` (with `preventDefault` so the field keeps focus), or hold the save while the suggestion list is open.
