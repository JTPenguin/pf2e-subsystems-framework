---
title: "Remove round length"
kind: feature
status: done
waits_on: none
priority: ⏫
blocked_by: []
source: "Justin's request, 2026-11-10; details from Justin's interview, 2026-11-10"
added: 2026-11-10
updated: 2026-11-10
outcome: "Round length is gone from the schema, Edit mode, run strip, strings and spec; old challenges load and rounds still advance. Checked live."
---
# Remove round length

The round length setting is not needed. Remove it from the UI and the data.

**Where it is (2026-11-10):** the `rounds.length` field in `model.js`, the Edit mode input and the muted text beside the round label in the run strip (`influence-sheet.hbs`), `roundLength` in `sheet.js`, the `SSM.Influence.RoundLength` string, and the Rounds row in `docs/spec.md`.

**Done when:** none of those remain, an old challenge with a round length loads, and rounds still advance on a live challenge.
