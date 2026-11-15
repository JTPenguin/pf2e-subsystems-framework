---
title: "Let a modifier apply to all checks of chosen actions"
kind: feature
status: done
waits_on: none
priority: ⏫
blocked_by: []
source: "ChazPls (friend testing the module) in Discord, 2026-11-14; Justin suggested picking actions; details from Justin's interview, 2026-11-14"
added: 2026-11-14
updated: 2026-11-14
outcome: "Done 2026-11-14. New dc.actions list: action ids on a subject modifier, lowercase names on a challenge modifier; mixes with single checks. Modifier window has Actions and Checks lists. Panel reads '−2 to DCs vs Discover checks and Deception'. Checked live as GM and as Test Player 1."
---
# Let a modifier apply to all checks of chosen actions

A modifier's DC change and roll bonus apply either to all skills or to a picked list of checks (`dc.allSkills` and `dc.skills`, `templates/challenge-modifier.hbs`). ChazPls asked for "All Discover" and "All Influence" beside "All skills". Justin's version: let the GM pick actions, so the modifier covers every check under them. This works for every subsystem, not only Influence.

## Decided (Justin, 2026-11-14)

| Question | Answer |
|---|---|
| How many actions | Several. The GM ticks any number of actions, like the skill list today. |
| Mixing | Actions and single checks add together, e.g. all Discover checks plus Diplomacy. |
| Challenge-level modifiers | Supported. They name actions by name, and cover every subject's action with that name. |

## Design

- **Data model:** a list on `dc` beside `skills`, e.g. `dc.actions`. A subject modifier stores action ids, so checks added to the action later are covered. A challenge-level modifier stores action names, matched without case or extra spaces (as `categoryKey` does).
- **Matching:** `appliesTo` in `scripts/challenge/run.js` matches a check if All skills is on, or its action is listed, or the check (or its skill, at challenge level) is listed.
- **Editor:** an Actions list in the modifier editor beside the skill list, shown when All skills is off.
- **Player panel:** `targetView` in `scripts/challenge/panel-view.js` names the actions, e.g. "−2 to DCs vs Discover checks", plus any single skills. A secret or hidden action players can't see is left out, as hidden checks are now.
- **Import and export:** old files with no action list import as empty.

## Done when

- Unit tests in `tools/test.mjs` cover action matching for subject and challenge-level modifiers, and mixing with single checks.
- `README.md`, `docs/gm-guide.md` and `docs/challenge-format.md` describe the new target.
- In a live Foundry check, a modifier set to an action changes the DC of every check under it, and the panel says so as a player.
