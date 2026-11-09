---
title: "Revealed modifiers as cards, with their effect"
kind: feature
status: done
waits_on: none
blocked_by: []
source: "Justin's request, 2026-11-09"
added: 2026-11-09
updated: 2026-11-09
outcome: "Done 2026-11-09. One card per revealed modifier with kind, name, player text, effect and duration; DC changes shown as the opposite check change; hidden skills read as 'other checks'. Checked live as Test Player 1 with two NPCs."
---
# Revealed modifiers as cards, with their effect

On the player panel, give each revealed weakness, resistance, penalty and adjustment its own box, and show what it does (for example "+2 to Diplomacy" or "−1 Influence Point").

**Now:** revealed modifiers share one "Known" line per NPC in `templates/influence-panel.hbs`, as name and player text only. The GM sheet already builds an effect summary (`effectsText` in `sheet.js`).

**Decided (Justin, 2026-11-09):** each card shows the kind (weakness, resistance, penalty or adjustment), name, player text, effect and duration. A spent one-time modifier shows as spent, and an inactive one is dimmed.

**Next step:**

1. Add a player-safe effect summary to the panel view in `panel-view.js`. Check that it can't leak hidden things, such as an unrevealed counter's name or a skill row that is still hidden. Never show a DC in it ([[remove-show-dc]]).
2. Render each modifier as a card in `influence-panel.hbs`, with everything listed above. Pass the duration and active or spent state through the panel view. Style it in `styles/subsystems.css`; check the layout with several NPCs.
3. Add tests for the summary and update spec section 7.
4. Check it: run `tools/test.mjs`, then view the panel in Foundry as a player.
