---
title: "Build the generic Victory Points challenge, and move Influence onto it"
kind: feature
status: ready
waits_on: Claude
blocked_by: []
source: "Justin's list of items, 2026-11-11; design answers from Justin, 2026-11-11 (merged generic-challenge-subsystem into this item)"
added: 2026-11-11
updated: 2026-11-11
---
# Build the generic Victory Points challenge, and move Influence onto it

Every subsystem runs on one data model, one sheet and one panel. The model is GM Core's Victory Points framework ([Victory Points](https://2e.aonprd.com/Rules.aspx?ID=3028)). Influence, Infiltration, Research and Chase are presets of it, not separate code. A GM can also build a challenge from scratch with it.

## Decisions (Justin, 2026-11-11)

| Topic | Decision |
|---|---|
| Generic subsystem | GM Core's Victory Points framework |
| Build order | Generic challenge first; then the other subsystems as presets |
| Influence | Becomes a preset. Existing Influence challenges convert on load and keep working. One model. |
| Where points live | On each subject (an NPC, an obstacle, a library area). A subject can be **individual**, so each PC has their own points on it. Counters stay challenge-wide. |
| Degree-of-success table | Set per action, and the GM can edit it. Presets fill it in. |
| Per-round and threshold rules | Generic. A counter can change by a set amount each round. A counter threshold can carry effects, such as a DC change, that apply while it is reached. |

## Proposed shape (to confirm in the spec before building)

| Part | Holds | Influence today |
|---|---|---|
| **Challenge** | Name, premise, GM notes, rounds, counters, run state, subjects, preset id | The challenge |
| **Subject** | Name, points (or per-PC points if individual), thresholds, modifiers, actions, reveal state | An NPC |
| **Action** | Name, skills with DCs (reveal and decoy per row), secret flag, outcome table, optional maximum points | Discover and Influence |
| **Outcome table** | For each degree of success: a change to the subject's points, a change to a counter, or a reminder note | Influence: +2 / +1 / 0 / −1 points. Discover: reminder notes only. |
| **Thresholds, modifiers, counters** | As today | As today |

- The Apply button on a chat card applies the roll's outcome row, whatever it holds. The reminder on Discover cards becomes a note-only outcome.
- The subject's label is set by the preset: NPC, Obstacle, Library area.
- Universal skills become a preset choice: Influence's Perception, Deception, Diplomacy and Intimidation.

## Steps

1. Write the generic model into `docs/spec.md` and get Justin's approval. This is the design sign-off the old generic-challenge-subsystem item asked for.
2. Build the generic model, sheet and panel.
3. Add the Influence preset and the load-time conversion. Check an old Influence challenge converts with nothing lost.
4. Remove the Influence-only code.

**Done when:** a GM can build and run a Victory Points challenge from scratch, and an existing Influence challenge still runs as before. Check both in Foundry with a live challenge and a player login.
