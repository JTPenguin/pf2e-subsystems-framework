---
title: "Hide rounds for a challenge with no rounds"
kind: feature
status: needs-decision
waits_on: Justin
blocked_by: []
source: "Found in the Reputation live check, 2026-11-13 (items/archive/reputation-subsystem.md); logged on Justin's request, 2026-11-13"
added: 2026-11-13
updated: 2026-11-13
---
# Hide rounds for a challenge with no rounds

A campaign-long challenge, such as Reputation, has no rounds. Start still sets Round 1, and the panel shows "Round 1" in its header with the GM's previous and next round buttons beside the party portraits. Players read a round count that means nothing.

**Where:** the round label and buttons in `templates/challenge-panel.hbs`, the label in `scripts/challenge/panel.js` and `scripts/challenge/sheet.js`.

**Decision for Justin:** how a challenge says it has no rounds. For example:

| Option | How |
|---|---|
| A setting | A "Use rounds" checkbox in the Challenge section; the Reputation preset turns it off |
| From the preset | A preset flag, with no checkbox on the sheet |

With rounds off, decide whether the party portraits (and the acted marks) still show.
