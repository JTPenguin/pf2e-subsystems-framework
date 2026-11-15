---
title: "Name the modifiers that changed the DC on the roll's chat card"
kind: feature
status: needs-decision
waits_on: Justin
blocked_by: []
source: "Justin's words, 2026-11-15: name DC changes on the card, using the same pattern PF2e uses for an off-guard target, as a separate feature"
added: 2026-11-15
updated: 2026-11-15
---
# Name the modifiers that changed the DC on the roll's chat card

A modifier's roll bonus already shows on the chat card under its own name when the modifier is revealed. A hidden modifier shows as "Challenge modifier", which Justin confirmed should stay that way (2026-11-15). A DC change never shows on the card at all. So a player can't see that "Old Soldier" lowered the DC and turned a failure into a success. Justin wants the revealed modifiers that changed the DC named on the card, following PF2e's own pattern.

## PF2e's pattern (checked in the installed system, 2026-11-15)

When a strike's target is off-guard, PF2e's check card shows the DC line as `Target: Goblin (AC 18 16)`, with the unadjusted value struck through and the adjusted one coloured. Hovering the adjusted value shows a tooltip such as `Off-guard: −2`.

- **Strings:** the label is `PF2E.Check.DC.Label.AdjustedTarget` in `lang/en.json`, and the template is `templates/chat/check/target-dc-result.hbs`.
- **Code:** in `pf2e.mjs`, search for `AdjustedTarget` and `circumstances`. The tooltip is built from `adjustment.circumstances`.
- **What triggers it:** the check's `dc.statistic` must be a `StatisticDifficultyClass` with enabled **circumstance** modifiers. PF2e works out the unadjusted value by taking those modifiers off `dc.value`.
- **What we pass now:** `scripts/challenge/roll.js` passes a plain `dc: { value, visible: false }`. That has no statistic, so PF2e shows no adjustment.

## Open questions for Justin

1. **The DC stays hidden from players.** We pass `visible: false`, so PF2e marks the whole DC part `data-visibility="gm"`. Players never see the DC line, its struck-through value, or the tooltip. PF2e's pattern alone would only show the names to the GM. Options:
   - Show players the DC line with the numbers hidden, and only the names in the tooltip. This needs our own markup, because PF2e's markup always prints the numbers.
   - Add a separate line or flag to the card for players, such as "DC lowered by Old Soldier", in the same style.
   - Show the DC to players when a revealed modifier changed it. This gives the DC away.
2. **Hidden modifiers** that change the DC: leave them off the card entirely, or count them as "Challenge modifier", as roll bonuses do?
3. **Reached thresholds** also change the DC. Should they be named too, such as "Suspicion 4: +2"?
4. **Chat links** roll against the changed DC but carry no bonuses. Should they carry the names too?

## Next step

Justin answers the open questions. Then Claude tries a synthetic `StatisticDifficultyClass` in Foundry, to see whether PF2e's pattern can be reused as is or needs our own markup.
