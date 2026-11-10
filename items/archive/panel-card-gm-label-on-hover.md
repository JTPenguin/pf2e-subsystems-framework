---
title: "Panel cards: move player text off the card into a hover; GMs also see GM text there"
kind: feature
status: done
waits_on: none
priority: 🔼
blocked_by: []
source: "Justin's request, 2026-11-10; clarified in the triage interview, 2026-11-10"
added: 2026-11-10
updated: 2026-11-10
outcome: "Player text left the card body for a hover. Players see player text only; GMs see Player and GM lines, read from the challenge on GM clients only and escaped. Checked live 2026-11-10."
---
# Panel cards: move player text off the card into a hover; GMs also see GM text there

The goal is compact cards and a panel that is easy to scan.

**Now:** each panel card shows its player text in the card body (`ssm-panel-mod-text` in `templates/influence-panel.hbs`). The GM's panel shows the same filtered copy as players, so GM text never appears on the panel.

**Decided (Justin, 2026-11-10):**

- The card body no longer shows player text.
- **Players:** hovering a card shows its player text.
- **GMs:** hovering a card shows both the player text and the GM text, each labelled (Player / GM), so the GM can tell which is which.

**Watch for:** GM text must never reach a player's client. `panel-view.js` builds the players' copy field by field and leaves GM text out on purpose. Add the GM text from the challenge itself on GM clients only, not to the shared copy. A card with no player text (and, for the GM, no GM text) shows no hover.

Pairs with [[panel-card-layout-two-rows]], which fills the card with name, type, effect and duration.

**Done when:** on the panel, no card shows its text in the body. As a player, hovering shows the player text only. As a GM, hovering shows both, labelled. Check that a player client's panel data holds no GM text.
