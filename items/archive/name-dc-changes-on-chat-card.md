---
title: "Name the modifiers that changed the DC on the roll's chat card"
kind: feature
status: done
waits_on: none
outcome: "Built 2026-11-15: the GM's client stores a roll's DC changes on its message, and each card draws a DC line for its viewer. Checked live: sheet roll, panel roll, chat link and a stale link, as GM and as a player."
blocked_by: []
source: "Justin's words, 2026-11-15: name DC changes on the card, using the same pattern PF2e uses for an off-guard target, as a separate feature. Details from Justin's answers, 2026-11-15."
added: 2026-11-15
updated: 2026-11-15
---
# Name the modifiers that changed the DC on the roll's chat card

A modifier's roll bonus already shows on the chat card under its own name when the modifier is revealed. A hidden modifier shows as "Challenge modifier", which Justin confirmed should stay that way (2026-11-15). A DC change never shows on the card at all. So a player can't see that "Old Soldier" lowered the DC and turned a failure into a success. Justin wants the DC changes named on the card, following PF2e's own pattern.

## What the card shows (Justin, 2026-11-15)

One line under the degree of success, the same for the GM and players, with no DC number. Each change is named with its own amount: `DC: Old Soldier −2, Suspicion 4 +2`. It shows even when the amounts cancel out. Justin chose one line for both over PF2e's struck-through DC for the GM: more consistent, less to build (2026-11-15).

| Source of the DC change | On the GM's line | On players' line |
|---|---|---|
| Revealed modifier | Yes | Yes |
| Hidden modifier | Yes, marked hidden | No |
| Reached threshold, fully revealed | Yes | Yes |
| Reached threshold, points-only or hidden | Yes, marked hidden | No |

- **No line** for a viewer when nothing they may see changed the DC.
- **Marked hidden:** dimmed, so the GM can tell what players don't see (Justin, 2026-11-15).
- **Threshold name:** the threshold's own name, as the panel shows it. A points-only threshold ("6: ???" on the panel) has no name players may see, so it stays GM-only.
- **Why the player line gives nothing away:** the panel already shows players a revealed modifier's DC amount, such as "−2 to DCs vs Diplomacy". A fully revealed threshold's DC amount is new to players; Justin accepted that.
- **Chat links:** a link roll gets the same names, worked out at roll time from the live state. Only when the link's DC equals the current DC, the same rule that decides whether a link roll spends entries (`spendUsedEntries` in `scripts/challenge/run.js`). An old link at a stale DC shows no names.
- **Secret actions:** the player line follows the card. A blind roll hides the whole card from the player anyway.

## Research (installed PF2e, 2026-11-15)

**PF2e's pattern.** The DC part of a check card is built in `pf2e.mjs` around line 19700 (search for `AdjustedTarget`), rendered through `templates/chat/check/target-dc-result.hbs`. The adjustment appears only when `dc.statistic` is a `StatisticDifficultyClass` with enabled modifiers of type **circumstance**. PF2e works out the unadjusted DC by taking those modifiers off `dc.value`, and builds the tooltip from their labels. That `instanceof` check is the only place PF2e reads `dc.statistic`, so a statistic there affects display only.

**Why we don't reuse it** (now moot, kept for the record):

- **The class isn't exported.** `StatisticDifficultyClass` is internal to `pf2e.mjs`; the only way to get one is an actor statistic's `.dc`. Building a fake one means borrowing that constructor's prototype, which is fragile across PF2e updates.
- **Our DC changes have no type.** A modifier's `dc` holds only an amount; we'd have to label every change "circumstance" just to trigger the display.
- **The label is wrong without a target.** `AdjustedTarget` reads `Target: {opposer}`, and with no target token PF2e fills in the rolling user's name.
- **It's GM-only for us.** We pass `visible: false`, so the whole `.target-dc` block gets `data-visibility="gm"`. The player line needs our own markup in any case.

**Where the names are known.** The card's markup is built when the message is created, so names must be fixed at roll time. Both roll paths already pass through our hooks:

- **Sheet and panel rolls:** `rollCheck` in `scripts/challenge/roll.js` already gets `bonuses` from `rollBonuses`. A matching `dcChanges(system, subject, check)` in `run.js` would list `{ name, amount, playerVisible }` for live DC modifiers and reached thresholds, next to `currentDc`. The panel gets its copy through `panel-view.js`, which must leave hidden names out.
- **Chat link rolls:** `prepareRollMessage` in `scripts/roll-listener.js` runs on `preCreateChatMessage` and can work them out from the live challenge.
- **As built:** a player's panel copy never holds hidden names, so the card can't be finished on the rolling client. Instead the active GM's client works out the changes as the roll arrives (`rollDcChanges` in `run.js`, before the roll spends anything) and stores them in the message flag `dcChanges`. A `renderChatMessageHTML` hook in `roll-listener.js` draws the line for each viewer: players get the parts they may see, the GM gets all of them with hidden ones dimmed. The line appears a moment after the card.
- **Hidden names in the raw message:** the flag reaches players' clients, so a player digging in the console could read hidden names. PF2e's own GM-only parts work the same way, so this is accepted.
- **Rerolls:** a sheet or panel reroll names the same entries, from its `used` option. A chat link's reroll usually names only thresholds, since the first roll spent its entries and the DC no longer matches.
