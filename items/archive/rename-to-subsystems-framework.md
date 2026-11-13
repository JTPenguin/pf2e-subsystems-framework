---
title: Rename the module to PF2e Subsystems Framework
kind: work
status: done
waits_on: none
blocked_by: []
source: "Justin, 2026-11-12: 'Subsystem Manager' is clunky; keep 'Subsystems' (the rules' own word) and use 'Framework', since the module is the scaffolding a GM builds each challenge on"
added: 2026-11-12
updated: 2026-11-13
outcome: "Renamed to PF2e Subsystems Framework (id pf2e-subsystems-framework), old challenges migrated, project folder moved to ~/Projects/PF2e Subsystems Framework. Tests pass; Justin checked it in Foundry on 2026-11-13."
priority: ⏫
---
# Rename the module to PF2e Subsystems Framework

"PF2e Subsystem Manager" becomes **PF2e Subsystems Framework**. "Subsystems" is what the PF2e rules call them. "Framework" says what the module is: the scaffolding a GM builds a subsystem or challenge on, with presets such as Influence and Chase on top.

## Where it stands (2026-11-13)

**Done:** id, title, page type, language keys, build script and docs renamed; tests pass; the zip builds as `pf2e-subsystems-framework-0.1.0.zip`. Justin renamed the module symlink and re-enabled the module. A one-off macro (`tools/migrate-old-id.macro.js`, deleted after use; in git at d9ab7e2) moved his test challenges to the new id, and he confirmed it worked.

**Kept on purpose:** the `ssm-` CSS and temp-folder prefixes (internal only), and the old id in `docs/dev/phase-0-results.md` (a record of past findings).

**Folder:** moved to `~/Projects/PF2e Subsystems Framework`, with the Foundry symlink, the memory folder and the app preset updated (2026-11-13).

## Names

| Thing | Now | New |
|---|---|---|
| Title | PF2e Subsystem Manager | PF2e Subsystems Framework |
| Module id | `pf2e-subsystem-manager` | `pf2e-subsystems-framework` (proposed) |
| Page type | `pf2e-subsystem-manager.challenge` | `pf2e-subsystems-framework.challenge` |
| In-game labels | Subsystems | Unchanged: the sidebar tab, sheet and panel keep saying "Subsystems" |

Don't use the bare title "PF2e Subsystems": that is the module this one replaces, and its id `pf2e-subsystems` is installed here.

## What the rename touches

- `module.json`: id, title, the page type key.
- `scripts/constants.js` (`MODULE`), the sheet registration in `scripts/module.js`, log prefixes such as the one in `scripts/challenge/run.js`.
- `lang/en.json`: the keys sit under the module id.
- `tools/build-zip.mjs`: the zip name and the `ssm-` temp prefix.
- `styles/subsystems.css`: 368 `ssm-` class names. Decide whether to change the prefix (for example to `psf-`) or keep `ssm-` as an internal name. Changing it is cosmetic and touches every template.
- Docs: `CLAUDE.md`, `docs/dev/spec.md`, `docs/dev/phase-0-results.md`. The spec's history can keep the old name where it records past decisions.
- The project folder (`~/Projects/PF2e Subsystem Manager`) and the symlink `Data/modules/pf2e-subsystem-manager`. Renaming the folder moves Claude's memory folder for this project too, so copy `MEMORY.md` and its notes across.
- The git remote, if one is added before the rename.

## World data

The module id is stored in world data: the page type, module flags (for example the collapsed-subjects user flag) and world and client settings (the panel's challenge, its position, each user's panel spot). After the change, existing challenges won't load.

- Rename **before** sharing with friends' tables, so no one else has old data.
- For Justin's own worlds: list which hold challenges. Either delete the test challenges or write a one-off migration (change each page's `type`, move flags and settings to the new id). Ask Justin which before building a migration.

## Done when

- The module loads in Foundry under the new id, with no console errors.
- A new challenge can be made, run from the sheet, and shown on the panel, checked in the browser pane.
- `tools/test.mjs` passes, and the zip builds with the new name.
- No reference to the old id is left outside the git history and the spec's decision records.
