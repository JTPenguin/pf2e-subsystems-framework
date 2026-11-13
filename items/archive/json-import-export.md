---
title: "Check that JSON import and export work for challenges"
kind: test
status: done
waits_on: none
priority: 🔽
blocked_by: []
source: "Justin's list, 2026-11-12; cut to a test of Foundry's own export by Justin in triage, 2026-11-12"
added: 2026-11-12
updated: 2026-11-13
outcome: "Foundry's own Export Data and Import Data work for challenges; checked live 2026-11-13. Import overwrites the entry and renames it to the file's name."
---
# Check that JSON import and export work for challenges

Justin asked for JSON export and import. Foundry already has both: the Subsystems tab's right-click menu inherits **Export Data** and **Import Data** from core's `DocumentDirectory` (`_getEntryContextOptions` in `scripts/directories.js` adds to it). Justin chose to test those rather than build our own (2026-11-12).

## What to check

- Export a challenge from the Subsystems tab. The file holds the journal entry and its challenge page with all of `system` (subjects, counters, modifiers, actions, thresholds, run state).
- Import that file over a different challenge. Everything comes back, and the sheet and panel open without errors.
- After the import, the entry is still in the Subsystems tab (its folder flag and page type survive).
- Note how Import behaves: it overwrites the chosen entry; there is no "new challenge from file". Record whether that is a problem in use.

## Done when

The checks above have run in Foundry. If they pass, close this item with the result. If something breaks, or overwriting is a real problem, file a new item for the fix and bring it to Justin.
