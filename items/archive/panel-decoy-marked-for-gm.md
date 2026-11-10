---
title: "Mark decoy items on the panel with the orange Decoy tag, for the GM only"
kind: feature
status: done
waits_on: none
priority: 🔼
blocked_by: []
source: "Justin's request, 2026-11-10; mark picked in the triage interview, 2026-11-10"
added: 2026-11-10
updated: 2026-11-10
outcome: "The GM's panel shows the orange Decoy tag on decoy skill buttons and modifier cards, read from the challenge on GM clients only; universal skills never get it. Players see nothing. Checked live 2026-11-10."
---
# Mark decoy items on the panel with the orange Decoy tag, for the GM only

A decoy is a skill row or modifier that the GM has flagged as a decoy. The GM should see decoys clearly on the panel. Players must not.

**Now:** the GM window shows an orange "Decoy" tag (`.ssm-decoy` in `styles/subsystems.css`) on decoy rows and modifiers. The panel does not mark them, and the panel's copy (`panel-view.js`) holds no decoy flag.

**Decided (Justin, 2026-11-10):**

- The GM's panel shows the **same orange Decoy tag** the GM window uses, on decoy skill buttons and decoy modifier cards.
- Players see nothing new.

**Watch for:** the decoy flag must never reach a player's client. Read it from the challenge on GM clients only, not from the shared copy. Universal skills are never decoys (`isUniversal` in `data.js`).

**Done when:** as GM, a decoy skill button and a decoy card on the panel show the Decoy tag. As a player, no tag shows and the player's panel data holds no decoy flag. Check with a decoy and a non-decoy side by side.
