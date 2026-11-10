---
title: "On/Off chip doesn't change when the window is detached"
kind: work
status: done
waits_on: none
priority: ⏫
added: 2026-11-09
updated: 2026-11-09
outcome: "The sheet watched the main window for the end of a click, so in a detached window every redraw was held back. It now listens on its own window. Checked by moving the sheet into a second same-origin window (old code stale, new code updates) and by a real click docked."
source: "Justin's bug report, 2026-11-09; details from interview, 2026-11-09"
---
# On/Off chip doesn't change when the window is detached

Clicking the On/Off chip on a modifier card in the GM window's Run view does nothing visible. This happens only when the GM window is detached.

**What Justin sees:** the data does change. The player panel updates, and the chip shows the new state once the window is docked again. Only the detached chip stays stale, so this looks like a re-render problem in the detached window, not a failed click.

**Next step:** reproduce with the window detached, find why the detached window doesn't re-render (or re-renders the wrong DOM), and check the chip both detached and docked.
