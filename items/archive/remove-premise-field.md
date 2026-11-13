---
title: "Remove the Premise field"
kind: work
status: done
waits_on: Claude
priority: 🔼
blocked_by: []
added: 2026-11-12
updated: 2026-11-12
source: "Justin's UI list, 2026-11-12; data decision in triage interview, 2026-11-12"
outcome: "Premise removed from the model, sheet, search, lang, tests, spec, module.json htmlFields and the influence-foundry skill (premise text now goes into GM Notes). Tests pass; checked live: no Premise on the sheet, GM Notes saves, a page created with a premise key loads without error."
---
# Remove the Premise field

The Premise field is not used anywhere. Remove it and keep GM Notes as the only notes field.

## Request (Justin, 2026-11-12)

- Remove the Premise field from the challenge sheet.
- Keep GM Notes.

## Decisions (Justin, 2026-11-12)

- **Drop it, with its saved text.** Nothing in use has Premise text worth keeping.

## Where Premise appears

| Place | What to do |
|---|---|
| `scripts/challenge/model.js` | Remove the `premise` field from the data model. Foundry drops the unknown key from saved data. |
| `scripts/challenge/data.js` | Remove it from `EDITABLE` and `searchText()`. |
| `scripts/challenge/sheet.js` | Remove `premiseHtml`. |
| `templates/challenge-sheet.hbs` | Remove the Premise section. |
| `lang/en.json` | Remove `SSM.Challenge.Premise`. |
| `tools/test.mjs` | Fix the tests that set or check `premise`. |
| `docs/spec.md` | Lines 83, 133 and 329 list it. |
| `~/.claude/skills/pf2e-influence-foundry/SKILL.md` | The skill writes Premise into import files. Stop it, and move what it wrote there into GM Notes. |

The panel never showed Premise, so it is not affected.

## How to check

Open a challenge's sheet. There is no Premise field, and GM Notes still saves. Import an older file that has a premise: it imports without error. Run the tests.
