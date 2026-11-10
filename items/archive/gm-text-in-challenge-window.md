---
title: "Show GM and player text in the GM window while running a challenge"
kind: feature
status: done
waits_on: none
priority: 🔼
blocked_by: []
source: "Justin's request, 2026-11-09; layout picked in the items interview, 2026-11-09"
added: 2026-11-09
updated: 2026-11-09
outcome: "Done 2026-11-09. Run view shows player text first and a muted 'GM:' line under it for every threshold and modifier; empty lines are left out. Checked live as GM."
---
# Show GM and player text in the GM window while running a challenge

While a challenge runs, the GM window shows both the player text and the GM text for each threshold and modifier, so the GM can read what players see without opening the editor.

**Now:** a threshold shows its player text, or its GM text if there's none (`sheet.js`, `text: row.playerText || row.gmText`). A modifier shows its effects and GM text, but not its player text.

**Decided (Justin, 2026-11-09):** both, on labelled lines. Player text first; GM text under it in a muted style.

```
6  Lowers his guard
   GM: He admits the ledger is forged.
```

**Next step:** pass both fields to the Run view, render them in `templates/influence-sheet.hbs`, and check with a live challenge.
