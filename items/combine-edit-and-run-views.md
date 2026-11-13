---
title: "Combine Edit and Run into a single view"
kind: feature
status: ready
waits_on: Claude
priority: ⏫
blocked_by: []
source: "Justin's words, 2026-11-12; interview with Justin, 2026-11-12"
added: 2026-11-12
updated: 2026-11-12
---
# Combine Edit and Run into a single view

## Idea (Justin, 2026-11-12)

Merge the Edit and Run tabs into one view. Subjects and Counters work the way Modifiers do today: each has an edit button that opens a separate edit window. The Challenge section holds only challenge-level fields. Modifiers get their own Modifiers section.

## Decided (interview with Justin, 2026-11-12)

| Topic | Decision |
|---|---|
| **Run strip and live play** | Always shown, even before Start. Roll buttons stay disabled until the run starts, as today. The Edit/Run switch and the subject tabs go. |
| **Challenge section** | Inline and always editable: name, rounds (current and maximum), Allow multiple subjects, premise and GM notes. Points name and Subject label stay off the sheet ([[challenge-sheet-remove-points-and-label-fields]]). |
| **Modifiers section** | The challenge's own modifiers, in their own section, grouped by category as today. |
| **Subject window** | Subject fields only: name, category, revealed and description. |
| **Action window** | New. Each action on a subject card has its own edit button and window: name, secret, description and its checks table. |
| **Counter window** | New. Name, value, direction, display, min, max, per round, per PC and revealed, plus its thresholds (add, change, remove). The view shows thresholds as today's Run cards. |
| **Modifier window** | Stays as it is. |
| **+ buttons** | On section bars: Counters and Modifiers bars; each subject category bar, plus an Add subject button; on a subject card, the subsection titles for its counters, actions and modifiers. Each new entry opens its window. |
| **Delete buttons** | On each row next to its edit button, with a confirmation dialog, as actions on a PF2e NPC sheet do. |

**How:** the new windows subclass `EntryWindow` in `scripts/challenge/entry-window.js`, which `ModifierWindow` already uses (its `ENTRY` config names the key, find, fields and save). Each window takes the sheet's theme, has one window per entry, and saves only changed fields through the write queue (spec section 6).

## Effects on other items

- **Order:** this goes first (Justin, 2026-11-12). Then [[challenge-sheet-remove-points-and-label-fields]] and [[challenge-sheet-style-like-npc-sheet]] work on the one view.
- [[subject-drag-reorder]]: the Edit-tab half (drag a subject's tab) goes, since the tabs go. Drag by the header grip stays.
- [[run-view-collapse-expand-all]]: unchanged; the toggle sits above the subjects in the one view.
- Spec sections 6, 14.4, 14.7 and 14.13 describe Edit and Run modes. Rewrite them in the same change.

**Done when:** the sheet has one view with no mode switch or subject tabs; every subject, action, counter and modifier can be added, edited and deleted (with confirmation) as described above; a full run (Start, rolls, reveals, + and −, End, Reset) still works; tests pass; and it is checked live in Foundry.
