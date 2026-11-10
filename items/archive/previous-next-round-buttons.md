---
title: "Previous and Next round buttons instead of Advance and Undo"
kind: feature
status: done
waits_on: none
priority: 🔼
added: 2026-11-09
updated: 2026-11-09
outcome: "GM window buttons are now Previous round (back-step icon) and Next round (forward-step icon), Previous first; sheet actions and context flags renamed to match. Checked live: Next then Previous undoes it, Previous is off at round 1, Next is off at round 7; tests pass."
source: "Justin's request, 2026-11-09; details from interview, 2026-11-09"
---
# Previous and Next round buttons instead of Advance and Undo

Rename the GM window's "Advance round" and "Undo round advance" buttons to "Next round" and "Previous round".

**Decided:**

- Keep them as icon buttons. Change the tooltips and aria labels; use a matching back/forward icon pair.
- Behaviour stays as today. Previous is off when there is no round history. Next is off at the last round.

**Next step:** change the labels and icons in `templates/influence-sheet.hbs` and `lang/en.json`, rename the actions if that keeps the code clearer, and check that Previous undoes a Next and both disable at the ends.
