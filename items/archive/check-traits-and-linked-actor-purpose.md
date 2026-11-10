---
title: "Remove traits and the linked actor from NPCs"
kind: work
status: done
waits_on: none
priority: ⏫
blocked_by: []
source: "Justin's question, 2026-11-10; details from Justin's interview, 2026-11-10"
added: 2026-11-10
updated: 2026-11-10
outcome: "Traits and the linked actor are gone from the NPC schema, Edit mode, strings and spec; old challenges with both set still load. Checked live."
---
# Remove traits and the linked actor from NPCs

**Finding (2026-11-10):** neither field does anything useful.

| Field | Used by |
|---|---|
| Traits | Only the journal search text (`searchText` in `data.js`) |
| Linked actor (`actorUuid`) | Nothing. Saved, never read |

**Decision (Justin, 2026-11-10):** remove both.

**Work:**

- Remove both fields from the NPC schema (`model.js`), the new-NPC defaults and search text (`data.js`), the sheet context (`sheet.js`), the Edit mode row (`influence-sheet.hbs`) and their strings in `lang/en.json`.
- Update `docs/spec.md` (the NPC table).
- Old challenges still load: the schema drops unknown fields.

**Done when:** Edit mode shows no traits or linked actor row, and an old challenge with both set still loads.
