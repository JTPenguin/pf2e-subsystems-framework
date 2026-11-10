# Follow-ups from the items run (2026-11-09)

Minor issues found while building the open items. None blocked the work. Each line names the item it came from.

- **modifier-toggles:** a one-time modifier that has been applied but not yet spent (its DC change waits for the next check) can no longer have Apply re-armed from the sheet. The old Restore button allowed it. If you want it back, it needs its own small control or a fourth "Applied" state, not the Spent tag.

- **threshold-unreach-by-click:** in the test world, Sergei and Ireena share threshold ids (probably one NPC was copied from the other). `toggleReveal` and `findEntry` in `run.js` look up an entry by id alone, so revealing one NPC's threshold may also reveal the other's. Worth checking how the copy happened and either giving copies new ids or looking entries up per NPC.
- **progress-bar-and-thresholds:** Reset catches errors while restoring the baseline but not while saving it. A damaged baseline (say, from a hand-edited import) holding a bad `reveal` value would make Reset fail validation (`run.js` around line 104). Very unlikely.
- **thresholds-player-card:** a fully revealed threshold with empty player text shows only its points on the panel. Fine as is, or it could fall back to "???".
- **challenge-overlay-draggable:** a player can drag the panel over the sidebar, chat or hotbar; it is only kept on screen, not clear of Foundry's UI. Not checked: a UI scale other than 1 in a real client setting, and touch input.
