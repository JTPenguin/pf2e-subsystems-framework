---
title: "Shorter description field in the Edit action window"
kind: work
status: done
waits_on: none
priority: 🔼
blocked_by: []
source: "Justin's UI list, 2026-11-12; details from Justin, 2026-11-12"
added: 2026-11-12
updated: 2026-11-12
outcome: "The Action and Subject windows' description sits in the flow: about 3 lines (4.5em) when short, growing with its text to 14rem, then scrolling, in both the shown text and the open editor (menu and save button visible). Checked in Foundry 2026-11-12, light and dark themes."
---
# Shorter description field in the Edit action window

## Request (Justin, 2026-11-12)

- The Description field takes too much height in the Edit action window. This pushes the Checks subsection down and leaves less room for skill rows.

## Where the code does it now

- `styles/subsystems.css:390`: `.ssm-modifier-window .ssm-window-editor prose-mirror { min-height: 14rem; }`, about 12 lines. It applies to the Subject window too.
- Foundry's `prose-mirror .editor-content` is `position: absolute; inset: 0`. The editor never grows with its text; its height comes only from `min-height` (Foundry's `--min-height`).

## Decided (Justin, 2026-11-12)

- **Small, and it grows.** About 3 lines when empty or short, growing with its text up to a cap, then it scrolls.
- The same rule applies to the Subject window's description.

## Next step

Override the editor's content to sit in normal flow (`position: static` or `relative`), with a min-height of about 3 lines and a max-height cap, about 14rem, with `overflow-y: auto`. Check both the toggled view (rendered text with the edit button) and the open editor with its menu.

## How to check

In the Action and Subject windows: an empty description takes about 3 lines; a long one grows, then scrolls at the cap; the editor's menu and save button still show while editing.
