---
title: "Show DC changes as DC changes on the player panel"
kind: work
status: done
waits_on: none
priority: ⏫
blocked_by: []
source: "Justin's request, 2026-11-09; wording decided in the items interview, 2026-11-09"
added: 2026-11-09
updated: 2026-11-09
outcome: "Done 2026-11-09. The panel shows DC changes as DC changes: '−2 to all DCs', '−2 to DCs vs Diplomacy' (list for several skills), never a DC number. Change type renamed check to dc. Checked live as Test Player 1."
---
# Show DC changes as DC changes on the player panel

Revealed weaknesses, resistances and penalties are defined as DC changes. The player panel shows them as the opposite bonus to the check, so the display and the rule don't match.

**Now:**

- The rule is already a DC change: `currentDc` in `run.js` adds it to the DC the roll uses.
- The GM sheet already says "DC −2 (Diplomacy)" (`#effectText` in `sheet.js`).
- Only the panel flips it: `changeView` in `panel-view.js` turns DC −2 into "+2 to Diplomacy" (`SSM.Panel.Change.check` in `lang/en.json`).

**Decided (Justin, 2026-11-09):** players still never see a DC number. The panel says:

- All skills: "−2 to all DCs"
- Some skills: "−2 to DCs vs Diplomacy" (a list for several skills)

**Next step:** stop negating the amount in `changeView`, rename the change type from `check` to `dc`, change the two language strings, update the tests and spec section 7, and check the panel live as a player with a weakness and a resistance.
