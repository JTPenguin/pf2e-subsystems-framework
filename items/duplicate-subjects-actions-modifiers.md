---
title: "Duplicate a subject, counter, action or modifier"
kind: feature
status: ready
waits_on: Claude
priority: ⏬
blocked_by: []
source: "Justin's list, 2026-11-12; questions answered by Justin in triage, 2026-11-12; lowest priority per Justin"
added: 2026-11-12
updated: 2026-11-12
---
# Duplicate a subject, counter, action or modifier

Building a similar entry means starting from scratch. Justin wants a duplicate button that copies an existing entry. Lowest priority of the open items (Justin, 2026-11-12).

## Decisions (Justin, 2026-11-12)

| Question | Answer |
|---|---|
| Which entries | The sheet's entries: subjects, counters, actions and modifiers, on the challenge and on subjects. Not rows inside edit windows (thresholds, checks). |
| Where the copy goes | Right after the original. |
| Its name | The same name. Its edit window opens so the GM can rename it. |
| A copied subject | An exact copy: its counters, modifiers and actions, their values, and its revealed, Complete and Reached states. |

## Build notes

- Add a copy button to `ssmRowTools` in `templates/challenge-sheet.hbs`, next to edit and delete.
- Every copied entry, and everything inside it (counters, thresholds, modifiers, actions, checks), gets a new id. Per-PC values (`valueBy`, `noteBy`) are keyed by actor, so they copy as they are.
- Without Allow multiple subjects, a revealed copy of a subject would show two at once. Follow `revealOnly` in `scripts/challenge/data.js`: either the copy hides the others, or the copy starts hidden in that case. Pick one and say which.

## Done when

Each of the four entry types can be copied on the sheet; the copy sits after the original with new ids; editing the copy leaves the original alone; the panel shows the copy correctly for a player login.
