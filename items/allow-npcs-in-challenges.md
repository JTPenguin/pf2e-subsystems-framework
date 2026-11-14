---
title: "Let NPC allies join a challenge beside the PCs"
kind: feature
status: ready
waits_on: Claude
priority: 🔽
blocked_by: []
added: 2026-11-13
updated: 2026-11-13
source: "Justin's request, 2026-11-13: allow NPCs and/or other actors outside the party to be included in subsystem challenges; questions answered by Justin in triage, 2026-11-13"
---
# Let NPC allies join a challenge beside the PCs

Today only the PCs in PF2e's Party actor take part in a challenge. `partyPCs()` in `scripts/party.js` leaves out NPCs, familiars, eidolons and minions. Only those PCs get a portrait in the round strip, an acted mark and a value on per-PC counters. Justin wants other actors, such as an NPC ally or a hireling, to take part in the same way.

## Decisions (Justin, 2026-11-13)

| Question | Answer |
|---|---|
| What an NPC is | An ally beside the PCs: a portrait, an acted mark and per-PC counter values, like a PC. Not a rival with its own counter. |
| How it joins | The GM drags an actor from the sidebar onto the challenge window. It joins that challenge only, and has a remove button. |
| Who rolls for it | The GM, and any player who owns the actor (for example, a hireling that player runs). |

## Build notes

- Store the extra actors on the challenge, for example `system.participants: [actorId]`. Add it to the data model, the import format and `docs/challenge-format.md`.
- Replace the direct `partyPCs()` calls with one "participants" function: the party's PCs plus the challenge's extra actors. The callers are `scripts/challenge/sheet.js` (around lines 247, 274 and 344), `scripts/panel/activation.js` line 39, and `panel-view.js` line 217. Per-PC counters already key `valueBy` and `noteBy` by actor id, so they need no change.
- The panel rolls for `game.user.character` (`scripts/challenge/panel.js` line 185). A player who owns an ally needs a way to choose it, for example by clicking its portrait before the skill.
- A deleted or missing actor must not break the sheet: show its id, as the sheet does today for an acted id with no actor.
- Update `docs/gm-guide.md` (the party line at line 114) and the spec.

## Done when

- The GM can drag an NPC onto a challenge and remove it again.
- The NPC gets a portrait, an acted mark and per-PC counter values on the sheet and on the panel.
- A player who owns the NPC can roll for it from the panel; a player who doesn't own it cannot.
- Checked live in Foundry with a GM and a player login.
