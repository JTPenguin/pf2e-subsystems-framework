---
title: "Bug: changing the sheet style breaks the challenge window"
kind: work
status: done
waits_on: none
priority: ⏫
blocked_by: []
source: "Justin's bug report, 2026-11-10; details from Justin's interview, 2026-11-10"
added: 2026-11-10
updated: 2026-11-10
outcome: "Picking a theme in Configure Sheet now keeps the challenge window, and the GM's client repairs broken challenges on load; checked live."
---
# Bug: changing the sheet style breaks the challenge window

Changing the sheet style turns the challenge window back into a normal journal entry window. After that, there is no way to make it a challenge window again.

**Cause (found 2026-11-10):** the Configure Sheet dialog lists only sheets registered with `canConfigure: true`. Ours is registered with `canConfigure: false` (`scripts/module.js`), so it is missing from the Sheet dropdown. Saving the dialog, for example to pick a theme, writes a core sheet into `flags.core.sheetClass`. Foundry builds the dropdown in `client/applications/apps/document-sheet-config.mjs` (around lines 162–177).

**Fix:**

- **Keep the challenge sheet.** In `preUpdateJournalEntry`, if the entry holds a challenge page, drop any `flags.core.sheetClass` change that points away from our sheet. The theme still saves.
- **Repair broken challenges.** On `ready`, the active GM resets `flags.core.sheetClass` on every challenge entry whose flag isn't our sheet. This fixes windows that are already broken.

**Done when:** on a live challenge, picking a theme in Configure Sheet keeps the challenge window and applies the theme, and a challenge broken by hand (flag set to the core sheet) comes back after a reload.
