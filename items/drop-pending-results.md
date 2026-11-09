---
title: "Apply results from the chat card, not a pending list"
kind: feature
status: ready
waits_on: Claude
blocked_by: []
source: "Justin's request, 2026-11-09"
added: 2026-11-09
updated: 2026-11-09
---
# Apply results from the chat card, not a pending list

Remove the pending-results list from the GM's panel and from the Run mode sheet. The GM applies results from the roll's chat card instead, the way PF2e damage works.

**Now:** the chat card is a plain PF2e roll with no buttons. The module catches it (`scripts/roll-listener.js`) and adds it to the pending list. **Apply** on that list is what changes points, marks thresholds, spends one-time modifiers and handles rerolls (`scripts/subsystems/influence/run.js`). The list appears on the GM's panel (`panel.js`, `templates/pending-list.hbs`) and in the sheet's Pending section, with Apply, Adjust and Ignore.

**Decided (Justin, 2026-11-09):**

| Question | Answer |
|---|---|
| Buttons | One GM-only **Apply** on an Influence roll's card. It applies the amount the result earns, with its thresholds and one-time modifiers. No Adjust and no Ignore: to use a different amount, the GM skips Apply and changes points by hand on the sheet. |
| Pressing twice | Apply works once, then is disabled, so a result can't count twice. |
| Discover rolls | No button. A GM-only reminder line on the card: one piece of information, two on a critical success, a false one on a critical failure. |
| What players see | The plain roll, nothing extra, before or after Apply. |

**Next step:**

1. Add the GM-only Apply button and the Discover reminder to the roll's chat card, using the apply code in `run.js`. Store on the message that it was applied, so the button stays disabled after a reload and for other GMs.
2. Decide what a reroll does now that there's no pending item to replace. Likely: each card applies on its own, and the GM simply doesn't press Apply on the roll that was replaced.
3. Remove the pending list from the GM's panel (`panel.js`, `templates/pending-list.hbs`), the sheet's Pending section, and the pending state and Adjust and Ignore code that's left unused.
4. Update the tests and spec sections 7 and 8.
5. Check it in Foundry with a player login: the GM sees Apply and the player doesn't, Apply changes points and spends one-time modifiers, and the button stays disabled after a reload.
