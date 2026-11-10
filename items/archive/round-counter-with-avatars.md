---
title: "Round bar with PC avatars on the player panel"
kind: feature
status: done
waits_on: none
priority: 🔽
blocked_by: []
source: "Justin's request, 2026-11-09; design picked in the items interview, 2026-11-09"
added: 2026-11-09
updated: 2026-11-09
outcome: "Done 2026-11-09. Player panel: a round bar ('Round 3 of 5', segments filled) with PC token images under it, acted lit and not-acted dimmed, name on hover. Replaces the header round text and the Acted line. GM sheet unchanged. Checked live as Test Player 2."
---
# Round bar with PC avatars on the player panel

Show who has acted this round as PC avatars next to the round counter, and show the rounds as a bar.

**Now:** the panel shows "Round 3 / 5" as text in the header and an "Acted" line of name markers at the bottom.

**Decided (Justin, 2026-11-09):**

- A round bar ("Round 3 / 5" with 3 of 5 segments filled), with the PCs' token images in a row under it.
- A PC who has acted is lit; one who hasn't is dimmed. The name shows on hover.
- Player panel only. The GM sheet keeps its name chips.

```
Round 3 / 5  ■■■□□
(●)(●)(○)(○)
```

**Next step:** add each PC's token image to the party list in `buildPanelView` (from the prototype token), replace the header round text and the Acted line in the panel template, and check it live as a player as the GM marks PCs acted.
