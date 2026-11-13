---
title: "Bug: edit windows don't scroll when contents overflow"
kind: work
status: done
waits_on: none
priority: ⏫
blocked_by: []
source: "Justin's bug report, 2026-11-13; cause researched in triage, 2026-11-13"
added: 2026-11-13
updated: 2026-11-13
outcome: "All four edit windows scroll: .ssm-layout scrolls inside the window, and each window's form part is scrollable so a save keeps the place. Checked live 2026-11-13: the counter window at full height and at 300px, and the subject window at 250px, each scroll to the bottom; an edit at the bottom kept the scroll position."
---
# Bug: edit windows don't scroll when contents overflow

When the contents of the edit counter window are taller than the window, the window doesn't scroll. The bottom of the contents can't be reached.

## Cause

All four edit windows (counter, subject, action and modifier) share `EntryWindow` in `scripts/challenge/entry-window.js`. It opens with `position: { height: "auto" }` and has no scrollable part. Foundry caps an auto height at the screen height (`_updatePosition` in `client/applications/api/application.mjs`), and a resized window has a fixed height, so the contents spill past the bottom. Nothing in `styles/subsystems.css` lets `.ssm-modifier-window .window-content` scroll. The challenge sheet doesn't have the bug: it declares `scrollable: [".ssm-body"]` and sizes its body.

So the counter window shows it first, because a counter with many thresholds is the tallest, but a subject, action or modifier with enough rows has the same problem.

## Build notes

- **Fix once, in the shared class:** let `.ssm-modifier-window .window-content` scroll vertically (`overflow-y: auto`), and add `scrollable: [""]` (or the form's selector) to each window's `PARTS` so Foundry keeps the scroll position on a redraw. Every change saves and redraws the window, so without that the scroll jumps to the top after each edit.
- **Watch for:** the category autocomplete dropdown (`category-autocomplete.js`) and the description editors must not be clipped by the new scroll box.

## Done when

With enough rows to overflow, each of the four edit windows scrolls to its bottom, both when it opens taller than the screen and after the GM resizes it smaller; editing a field near the bottom keeps the scroll position; checked live in Foundry.
