---
title: "Make every Discovery roll a blind roll"
kind: feature
status: done
waits_on: none
priority: ⏫
blocked_by: []
source: "Justin's request, 2026-11-10; decided in the triage interview, 2026-11-10"
added: 2026-11-10
updated: 2026-11-10
outcome: "Discover rolls carry PF2e's secret trait from the panel, the GM window and chat links: blind for players, GM-only for the GM's own rolls. Influence stays public. Checked live 2026-11-10."
---
# Make every Discovery roll a blind roll

Discovery rolls should be secret, the way Recall Knowledge is in PF2e.

**Decided (Justin, 2026-11-10):**

- **Blind roll.** The player sees that a roll was made, not the result. Only the GM sees the number and the degree of success. Use PF2e's `secret` trait, so the system handles it the way it handles Recall Knowledge.
- **Every Discovery roll:** rolls from the panel, rolls from the GM window's roll button, and rolls from a link posted to chat.
- **Influence rolls stay public.**

**Where the code is:**

| Roll | Code | Now |
|---|---|---|
| Panel | `scripts/subsystems/influence/panel.js:87` | Uses the player's own message mode |
| GM window | `scripts/subsystems/influence/sheet.js` `#onRollSkill` | `messageMode: "public"` |
| Chat link | `scripts/subsystems/influence/sheet.js` `#onPostLink` | `@Check[...]` with no traits |

All three go through `rollCheck` in `roll.js`, except the chat link, which builds an `@Check`. Likely fix: pass `traits: ["secret"]` for `kind === "discover"` in `rollCheck`, and add `traits:secret` to the `@Check` params. Check PF2e's `Statistic.roll` and the `@Check` parser in the installed system to confirm both turn the trait into a blind roll in v14.

**Also check:** the GM's Discover reminder line (`chat-card.js`) still shows on a blind roll's card, and the roll listener still reads the outcome from a blind message.

**Done when:** in Foundry, a player's Discovery roll from the panel and from a chat link shows no result to that player and none to other players, the GM sees the result and the reminder line, a GM-window Discovery roll is blind too, and an Influence roll is still public.
