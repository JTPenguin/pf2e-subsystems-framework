# Follow-ups from the items run (2026-11-09)

Minor issues found while building the open items. None blocked the work. Each line names the item it came from.

- **modifier-toggles:** a one-time modifier that has been applied but not yet spent (its DC change waits for the next check) can no longer have Apply re-armed from the sheet. The old Restore button allowed it. If you want it back, it needs its own small control or a fourth "Applied" state, not the Spent tag.

- **threshold-unreach-by-click:** in the test world, Sergei and Ireena share threshold ids (probably one NPC was copied from the other). `toggleReveal` and `findEntry` in `run.js` look up an entry by id alone, so revealing one NPC's threshold may also reveal the other's. Worth checking how the copy happened and either giving copies new ids or looking entries up per NPC.
