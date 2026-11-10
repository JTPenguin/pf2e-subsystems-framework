---
title: "Weaknesses, resistances and other: no visibility or on/off styling, no type chip"
kind: feature
status: done
waits_on: none
priority: 🔼
blocked_by: []
source: "Justin's request, 2026-11-10"
added: 2026-11-10
updated: 2026-11-10
outcome: "Edit-tab weakness, resistance and other cards look the same in every state, and the GM window shows no kind chip. The panel keeps its type label, since it has no section headings and panel-card-layout-two-rows wants the type there. Checked live 2026-11-10."
---
# Weaknesses, resistances and other: no visibility or on/off styling, no type chip

Justin wants weaknesses, resistances and other entries styled the same, whatever their state. The section heading already says which kind a card is, so the card does not repeat it.

**Decided (Justin, 2026-11-10):**

- In Edit mode, these entries are not styled by visibility (revealed or hidden) or by on/off.
- They do not show the Resistance or Weakness chip. The section already shows it.
- This is separate from the fading of inactive cards in [[panel-fade-inactive-modifiers]]. Read that note for how inactive cards look on the panel.

**Done when:** in Edit mode, a weakness, resistance or other entry looks the same whether it is hidden, revealed, on or off, and no card shows a Resistance or Weakness chip.
