---
title: "Style the GM window like the PF2e monster and hazard sheets"
kind: feature
status: done
waits_on: none
priority: ⏬
blocked_by: [gm-window-compact-layout]
source: "Justin's request, 2026-11-09; level of match set in the items interview, 2026-11-09"
added: 2026-11-09
updated: 2026-11-09
outcome: "Done 2026-11-09. The GM window uses PF2e's own variables, fonts, red section bars and statblock spacing, on parchment by default (a picked sheet theme wins). Edit tab and modifier window match. Checked live as GM beside a PF2e NPC sheet."
---
# Style the GM window like the PF2e monster and hazard sheets

The GM window should look like the PF2e monster and hazard sheets, so it feels familiar to a PF2e GM.

**Decided (Justin, 2026-11-09):** a close match. Use the system's own CSS variables and fonts, its red section bars and its statblock spacing, read from the installed system in `~/.local/share/FoundryVTT/Data/systems/pf2e`.

**Next step:** after the compact layout ([[gm-window-compact-layout]]), match the NPC and hazard sheet styles, and check the sheet side by side with an NPC sheet in Foundry.
