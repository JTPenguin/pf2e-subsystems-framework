# Phase 0 results

**Status: all six risks tested live.** Foundry 14.369, PF2e 8.6.1, `test` world, with only this module enabled. The GM and Test Player 1 were logged in at the same time in two browser tabs.

| # | Risk | Verdict |
|---|---|---|
| 1 | Custom sidebar tab with folders | **Yes** |
| 2 | Hiding challenges from the Journal tab | **Yes, with one rule to keep** |
| 3 | Hidden DC in the player's chat card | **Yes for the DC while `metagame_showDC` is off. With it on, PF2e shows the DC and margin whatever the module passes.** Degree of success: closed, players see it. |
| 4 | Panel against windows and sidebar | **Yes** |
| 5 | Rerolls in chat | **Yes. The fallback isn't needed.** |
| 6 | Party markers | **Yes, with a filter** |

One result touches spec section 2: "DCs hidden from players by default" can't be enforced when the world's `metagame_showDC` setting is on. That point is open for Justin; see risk 3. No other result changes a section 2 decision.

## Spike code

| File | Purpose |
|---|---|
| `module.json` | Minimal manifest with the `influence` page sub-type |
| `spike/phase0.js` | Sidebar tab, Journal filter, and a console helper that mounts a test panel. Throwaway. |
| `spike/phase0.css` | Test panel style. Throwaway. |

## Risk 1: custom sidebar tab

**Verdict: yes.** `Sidebar.TABS` and `CONFIG.ui` are enough, and no separate collection is needed.

**What I did.** At `init` I added a `subsystems` entry to `foundry.applications.sidebar.Sidebar.TABS` and set `CONFIG.ui.subsystems` to a `DocumentDirectory` subclass with `collection: "JournalEntry"`. The subclass replaces `context.tree` in `_prepareDirectoryContext` (`document-directory.mjs:399-407`) with a pruned copy of `game.journal.tree`.

**What I saw.**

| Action | Result |
|---|---|
| Tab button, switching tabs | Works. The sidebar content class becomes `active-subsystems`. |
| List | Showed only challenges and flagged folders |
| Expand a folder | Works |
| Create entry (header button) | Created one challenge with its page |
| Duplicate (context menu) | The copy keeps page type `pf2e-subsystem-manager.influence` and stays in the tab |
| Delete (context menu and confirm dialog) | Works |
| Popout | Title "Subsystems", same list |
| Reload | All entries and the page data survive |
| JSON shape | `toObject()` includes the typed page. In review, an export and import round trip kept the typed page and its data. The file download itself was not run. |
| Open an entry | Opens the core `JournalEntrySheet` with no error, though the page has no sheet of its own yet |
| Player client | No tab button, and the tab isn't rendered |

**What later phases should do.**

- Keep the tab id to word characters only. `changeTab` swaps its class with `/active-\w+/` (`sidebar.mjs:255`).
- `gmOnly` only removes the button (`sidebar.mjs:169`). The tab also needs `_canRender` to return false for players (`sidebar.mjs:202`).
- `FolderConfig` saves only its form fields, so flags passed to `Folder.createDialog` are lost. My first version created a folder that appeared in the Journal tab instead. A temporary `preCreateFolder` hook fixed it, and a retest passed. Phase 1 can keep this or use its own name prompt.
- Don't filter `collection.folders`. A folder missing from it counts as foreign and gets copied when dragged (`document-directory.mjs:1369`). Pruning the tree avoids this.
- Fix inherited labels: the search box says "Search Journal Entries".
- Drag and drop was not tested by me. See risk 2 for what review found.

## Risk 2: hiding challenges from the Journal tab

**Verdict: yes, as long as an entry's folder flag and its type agree:** challenges stay in flagged folders or at the root, and ordinary entries stay out of flagged folders. The fallback isn't needed.

**What I did.** `CONFIG.ui.journal` is replaced with a subclass that prunes the same tree the other way. A challenge is any entry with a page of the module's type. A challenge folder has the flag `flags.pf2e-subsystem-manager.challengeFolder`.

**What I saw.**

| Test | Journal tab | Subsystems tab |
|---|---|---|
| List | Normal folders and entries only | Challenges and flagged folders only |
| Search "Foldered" (challenge in a flagged folder) | Nothing | Folder and challenge |
| Search "Root Challenge" | Nothing | Not run |
| Search "Normal Entry" | Folder and entry | Nothing |
| Search a flagged folder's name | Nothing | Not run |
| Search a normal folder's name | Not run | Nothing |
| Search "Stray" (challenge inside a normal folder) | **The normal folder appears, with no entry in it** | Nothing, and the challenge isn't listed in this tab at all |

- **Folder counts:** Foundry 14 shows none, so there's nothing to fix.
- **Player client:** the Journal list was empty, as players have no ownership of these entries.
- **Mismatch 1:** a challenge inside a normal folder is lost from both lists, and a name search shows its folder. Core search walks the whole collection (`document-directory.mjs:761-779`). The spike's create buttons don't make this state, but a drag, macro or import could.
- **Mismatch 2 (found in review):** a normal journal entry moved into a flagged folder vanished from both tabs. `_handleDroppedEntry` (`document-directory.mjs:972`) has no type check, so a drag can cause either mismatch.

**What later phases should do.** Phase 1 must refuse drops in both directions: ordinary entries into challenge folders, and challenges into normal folders. Ideally a challenge found in a normal folder, from a macro or import, should show at the tab's root. Name searches only were tested, not full-text mode.

## Risk 3: hidden DC in the player's chat card

**Verdict: yes for the DC while `metagame_showDC` is off. With it on, PF2e shows the DC and margin whatever the module passes.** Degree of success is closed: Justin decided challenge rolls are normal PF2e checks, so players see it on the chat card like any other roll (spec section 2).

**What I did.** As Test Player 1, I ran `pc.skills.diplomacy.roll({ dc: {...}, skipDialog: true, identifier, extraRollOptions, label })` and read the rendered card in the player's chat log. `metagame_showDC` was off throughout (its default). `metagame_showResults` was tested both ways.

**What the player saw.**

| `dc` passed | `metagame_showResults` | Card text |
|---|---|---|
| `{ value: 15, visible: false }` | on | "Result: Critical Success" on a total of 20. "Result: Failure" on a total of 13. No DC, no "by +5". |
| `{ value: 15 }` | on | "Result: Success" on a total of 15. No DC. |
| `{ value: 15, visible: false }` | off | No result line and no DC at all |
| `{ value: 15 }` | off | No result line and no DC at all |
| `{ value: 15, visible: true }` | off | "DC 15", no result |

Card text in the first row, exactly: "SSM PC / Influence test / Result: Critical Success / Charisma +0 / Untrained +0 / Test Player 1 / 1d20 / 20".

- The die's own colour still shows a natural 1 (`dice-total failure`). That's normal PF2e behaviour.
- **`metagame_showDC` on (tested in review, as the player):** `{ value: 15, visible: false }` gave "DC 15 / Result: Critical Failure by -13". `{ value: 15 }` gave the same form, "by -11". So `dc.visible: false` doesn't hide the DC with this setting on. I checked the code: `u = o?.hasPlayerOwner || i.visible || game.pf2e.settings.metagame.dcs` (`pf2e.mjs:19712`). The first term also shows the DC when the roll has an opposing actor with a player owner. A roll gets an opposing actor only if `dc` has a `slug` or `statistic` key. Tested in review: with a plain `{ value, visible }`, a player's targeted token is ignored and `context.target` is null, so the DC stays hidden. With `slug: "will-dc"` and a player-owned target, the card showed "Target: ... (Will DC 15)". The module must pass plain numeric DCs, with no `slug` or `statistic`, and chat links must use `dc:` rather than `against:`.
- **Chat links (tested in review):** the DC stayed hidden from the player with `showDC:gm` and with the default. The link text was just "Diplomacy", and the card had no DC.

**Note, not a failure.** The DC and outcome are in the message flags (`flags.pf2e.context.dc`, `.outcome`). Justin has accepted console-level access.

**Closed: degree of success.** Players see it on the chat card, subject to PF2e's own `metagame_showResults` setting, as with any other roll.

**Open for Justin: `metagame_showDC`.** With this world setting on, a challenge's hidden DCs show on the chat card. The options are:

1. Respect the world setting. This is consistent with "normal PF2e checks".
2. Respect it, and warn the GM at challenge start that DCs will show.

**What later phases should do.** `identifier` only works for direct rolls. For chat links, `flags.pf2e.context.identifier` was null in review, and the inline handler reads `pf2RollOptions` (`pf2e.mjs:28692`). The roll option is the only carrier that works for both direct rolls and chat links, so put the full identifier in a roll option and read it from `context.options`. It survives rerolls (risk 5).

## Risk 4: panel against windows and the sidebar

**Verdict: yes, mounted in `#ui-top`.** The fallback isn't needed. The "hide UI" toggle was dropped from this risk, so it wasn't tested.

**What I did.** I appended a panel to `#ui-top` with `pointer-events: auto`. Checked on both the GM and player clients, at 1600 by 900.

| Test | Result |
|---|---|
| Position | Top centre, at the very top of the screen (x 560, width 480) |
| Sidebar expand and collapse | Panel doesn't move and stays clickable. No overlap with the sidebar. |
| Pan and zoom (scale 1 to 1.8) | Panel doesn't move |
| Canvas redraw (`canvas.draw()`) | Panel stays attached |
| Click on the panel | Registers on the panel |
| Around the panel | `elementFromPoint` returns the canvas `#board`, so the canvas stays clickable |
| Windows | A journal sheet (z-index 104) and a PF2e character sheet (z-index 101) both draw over the panel. `#ui-middle` is z-index 30. |

Windows covering the panel is the normal behaviour for interface elements in Foundry. A player can move or close their own window to see it again, so I didn't change it. Other screen sizes and UI scale settings were not tested. In review, the panel survived a real scene activation.

**What later phases should do.** Mount in `#ui-top`, and leave a small top margin in the real styling. VN Stage overlap is still a Phase 5 check.

## Risk 5: rerolls in chat

**Verdict: yes. The module can detect a Hero Point reroll and replace the pending item.** The "GM adjusts by hand" fallback is only needed if the item has already been applied, as spec section 8 already says.

**What I did.** As the player, I rolled against a hidden DC, then called `game.pf2e.Check.rerollFromMessage(message, { resource: "hero-points" })`. That's the same call the chat menu makes (`pf2e.mjs:56193`). The GM client logged chat hooks.

**What I saw.**

- **Message order on the GM client:** `deleteChatMessage` for the original, then `createChatMessage` for a new message 5 ms later, with a new id.
- **New message:** total 16, outcome `success` (was 13, `failure`). `isReroll` and `context.isReroll` are true.
- **Roll options kept:** `identifier: "ssm-reroll"`, `ssm:skill:diplomacy`, and new `check:reroll` and `check:reroll:hero-points`.
- **Module flag lost:** a flag I set under `pf2e-subsystem-manager` on the original was gone. The new message has only `flags.core` and `flags.pf2e` (`pf2e.mjs:19675-19678`).
- **Hero Points:** went from 2 to 1.
- **Player's card:** old and new dice shown, "Result: Success", Hero Point icon, and no DC.

**What later phases should do.** The new message doesn't name the old id. Include a unique per-roll id in the identifier. A reroll keeps it, so the pending item match is exact; section 8's identifier alone isn't unique per roll. Use `context.isReroll` on the new message to replace the pending item, and don't treat the delete on its own as a removal when a reroll follows it. Never store roll identity in the module's own message flags. I tested only the Hero Point path. In review, a keep-higher reroll also kept the identifier.

## Risk 6: party markers

**Verdict: yes, with a filter.** The "add a PC list to the challenge" fallback isn't needed.

**How members are built.** `PartyPF2e.prepareBaseData` maps `system.details.members` through `fromUuidSync`, and keeps only actors that resolve and are creatures, sorted by name (`pf2e.mjs:39158`). `game.actors.party` returns the actor from the `activeParty` setting, otherwise the first party actor, otherwise `null` (`pf2e.mjs:120764`).

**What I saw.**

| Case | `party.members` |
|---|---|
| Empty party | `[]`, no error |
| Character owned by the player | Included |
| Unowned character | Included, `hasPlayerOwner: false` |
| NPC | Included, `alliance: "party"` |
| Familiar owned by the player | Included, type `familiar` |
| Deleted member (one at a time) | Dropped from `members` and from the raw list |
| Several members deleted at once | `members` went to 0, but the raw list kept 3 stale entries. `members` is the one to trust. |
| Read by the player client | Same list, including unowned members |

**What later phases should do.** Use `game.actors.party?.members ?? []` and filter to real PCs the way PF2e does (`alliance === "party"` and `isReallyPC`, `pf2e.mjs:26541` and `20674`). That removes NPCs and familiars. Decide in Phase 4 whether an unowned PC gets a marker. Show nothing, without an error, when the party is empty or `null`. The `null` case wasn't run, as it would mean deleting the world's only party actor; the code path is simple and read directly.

## Untested cases that matter later

| Phase | Case |
|---|---|
| 1 | Drag and drop; full-text search |
| 2 and 4 | A player using self-roll visibility, where the GM's client may never see the message. Pass the roll mode explicitly. |
| 4 | A player with no assigned character; a Lore skill the PC doesn't have (`pc.skills[slug]` undefined) |
| 3 and 5 | Other screen sizes and UI scale |
| 5 | VN Stage overlap |
| Low priority | The `null` party case |

## Cleanup

All test documents are gone: journal entries, journal folders, actors, the scene and chat messages. The party is empty again, `metagame_showResults` is back on, and Test Player 1 has no assigned character. Foundry was not restarted during these tests. The module remains enabled in the world.
