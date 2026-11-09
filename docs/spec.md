# PF2e Subsystem Manager: spec

**Status:** approved by Justin, including the three decisions proposed by Claude in section 2. **Date:** 2026-11-08. **Targets:** Foundry 14, PF2e 8.6 or later.

## 1. Summary

A Foundry module for running PF2e subsystems. Each subsystem challenge is an object in its own sidebar tab, with a sheet the GM runs it from. While a challenge is active, players see a panel over the canvas that they can't close.

The first version covers **Influence only**. The data and panel code are built so chases and other subsystems can be added without a rewrite.

## 2. Decisions

| Topic | Decision | Source |
|---|---|---|
| Existing PF2e Subsystems module | Replace it. No importer. | Justin |
| Audience | Justin and friends' tables, shared privately | Justin |
| First subsystem | Influence | Justin |
| Player panel | Fixed on screen over the canvas. Stays put during pan and zoom. Only the GM can end or hide it. | Justin |
| Where the panel shows | Every scene, for all players, until the GM ends or hides it. Survives scene changes and reloads. | Justin |
| Rolling | Players click skills on the panel. The GM can also roll or post chat links from the sheet. | Justin |
| Roll results | Normal PF2e checks. Players see the degree of success on the chat card as with any other roll, subject to PF2e's own metagame settings. | Justin |
| Missing Lore | A PC without a listed Lore rolls it untrained (Intelligence +0) from the sheet or panel. Chat links can't do this, as PF2e reports the statistic as missing. | Justin |
| Applying points | The module suggests the change and the GM confirms it | Justin |
| NPCs | One challenge holds one or more NPCs and one shared round clock | Justin |
| Hidden by default | Everything except the NPC name, Influence Points, rounds remaining and the universal skills: Perception for Discovery, and Deception, Diplomacy and Intimidation for Influence | Justin |
| Universal skills | Always on the panel, with no reveal control and no decoy flag. A new NPC starts with a row for each, at the default DC; the GM can edit or delete them. Existing NPCs are unchanged. A universal row flagged as a decoy (from an import, say) is treated as not a decoy. | Justin |
| DCs | Always hidden from players: not on the panel, not on the chat card. If a world turns on PF2e's `metagame_showDC` setting, DCs show as on any other roll, with no warning to the GM. | Justin |
| Several NPCs on the panel | One column per NPC, each with its own skills. No separate NPC picker. | Justin |
| Portraits | Not on the panel. Tokens or VN Stage handle those. | Justin |
| False information | The GM can reveal a planted decoy. Players can't tell it from a true entry. | Justin |
| Who has acted | Shown on the panel. Advisory only; nothing blocks a roll. | Justin |
| Modifiers | One-time and ongoing, on DCs and on other values | Justin |
| Custom values | Any number of named counters per challenge | Justin |
| One module or two | **One module** with separate parts for the sheet and the panel. The panel has no use without the challenge data, and two modules would add version matching for no benefit. | Claude, for review |
| Panel technology | **HTML placed over the canvas**, not drawn in PIXI. It looks the same to players, and gives sharp text, CSS layout and normal clicks. | Claude, for review |
| Active challenges | **One at a time** | Claude, for review |

## 3. What Foundry and PF2e allow

These were checked against the installed code (Foundry 14, PF2e 8.6.1).

| Finding | Effect on the design |
|---|---|
| Foundry's top-level document types are a fixed list. A module can't add one. | A "Subsystem" can't be a true peer of Actor or Item. |
| PF2e throws an error for custom Actor types: "actor module subtypes are not supported". | Actors can't hold challenges. |
| `JournalEntryPage` supports module sub-types with a data model, and PF2e doesn't interfere. | Challenges are stored as a journal entry with one typed page. |
| The sidebar is built from `Sidebar.TABS` and `CONFIG.ui`. | A module can add its own tab. |
| PF2e checks accept `dc`, `identifier` and `extraRollOptions`, and inline checks have a `showDC` option. | The module can roll against a hidden DC and recognise its own rolls in chat. |
| PF2e Subsystems has no canvas display. Players get a window. | Nothing existing does the panel job. Chase Forge's listing doesn't say where its player view appears, and it covers chases only. |

## 4. How it fits together

```
Sidebar tab -> Challenge (journal entry + typed page, GM only) -> GM sheet
                                  |
                       GM client builds a filtered copy
                                  |
                   World setting: active-challenge state
                                  |
                  Panel on every client (players and GM)
                                  |
              Player roll -> chat message -> GM confirms -> points change
```

**Storage.** Each challenge is a `JournalEntry` holding one page of type `pf2e-subsystem-manager.influence`. Journal entries bring folders, compendiums, JSON export and duplication for free. Players have no ownership of them, so the interface doesn't show them to players.

**Sidebar tab.** The tab lists only challenge entries, with folders, search, create, duplicate and delete. The Journal tab hides them.

**Filtered copy.** The GM's client writes a world setting containing only what players may see. Every client redraws its panel when that setting changes. This needs no socket for display, and it survives reloads.

**Limit on secrecy.** Secrets only need to stay out of the player interface. As elsewhere in Foundry, a player who digs through the browser console may be able to read them, and Justin accepts that. A player-side roll needs the DC, so the copy includes DCs for revealed and universal skills, and the panel doesn't show them. The filtered copy leaves out unrevealed entries, decoy markers and GM text.

**Multiple GMs.** Only the active GM's client writes state and handles roll results.

**Extension point.** Each subsystem registers one definition: its data model, sheet, the function that builds the filtered copy, and its panel renderer. The sidebar, activation, panel frame and roll listener are shared.

## 5. Influence data

**Challenge**

| Field | Notes |
|---|---|
| Name, premise, GM notes | Premise and notes are rich text |
| Rounds | Current, maximum, and a free-text round length |
| NPCs | One or more |
| Counters | Zero or more |
| Run state | Inactive, active, or finished; the current round's acted list |

**NPC**

| Field | Notes |
|---|---|
| Name, traits, linked actor | The linked actor is optional |
| Perception and Will | Modifiers, not DCs |
| Influence Points | Current total |
| Discovery checks | Skill, Perception or Lore, DC, revealed flag. A Lore also has a name. A Lore row is never universal. A new NPC starts with Perception, which is universal. |
| Influence skills | Skill or Lore, DC, revealed flag. A new NPC starts with Deception, Diplomacy and Intimidation, which are universal. |
| Thresholds | Points, player text, GM text, revealed flag, reached flag |
| Weaknesses, resistances, penalties | Modifier entries (below) |
| Decoys | A flag on any weakness, resistance or skill entry, except universal skills |

**Modifier entry.** Weaknesses, resistances, penalties and ad hoc adjustments share this shape.

| Field | Notes |
|---|---|
| Name, player text, GM text | Players only see the player text |
| Kind | Weakness, resistance, penalty, or adjustment |
| Duration | **One-time** (spent once used) or **ongoing** (active until the GM turns it off) |
| State | Active or off; spent; revealed; decoy |
| Effects | One or more, listed below |

| Effect | What it does |
|---|---|
| DC change | Signed amount, on all skills or chosen skills. Sheet offers quick −5, −2, +2 and +5. |
| Influence Points | Add or remove a flat amount |
| Counter change | Add or remove from a named counter |
| Rounds | Add or remove rounds |
| Note only | A consequence with no number, such as "she ends the conversation" |

**How one-time entries work.** The GM turns one on. A DC change applies to the next check it matches, then is marked spent when the GM confirms that result. Any other effect applies when the GM clicks apply. Spent entries can be restored.

**Counter.** Name, value, optional minimum and maximum, optional trigger values with GM notes, and a revealed flag. When a value reaches a trigger, the GM gets a notice.

## 6. GM sheet

The sheet has **Edit** and **Run** modes, like a locked and unlocked actor sheet.

**Run mode shows:**

- Round clock with advance and undo.
- Each NPC's points, with buttons to add and remove.
- Each skill, with its base and current DC. Clicking offers: roll for a selected PC, or post a chat link.
- An eye toggle to reveal or hide each entry, except universal skills, which are always shown.
- Modifier entries with on, off and apply controls.
- Counters.
- Start, hide, show and end controls for the panel.

**Reveal is one click and can be undone.** The panel updates at once.

**Ending a challenge** removes the panel and keeps the final state on the sheet. Reset returns it to unspent.

## 7. Player panel

```
+------------------------------------------------------------------+
| The Governor's Banquet                         Round 3 of 6      |
| Lady Vance                     | Lord Ostrov                     |
| [#####-----] 5                 | [##--------] 2                  |
| Influence: Society, Diplomacy, | Influence: Intimidation         |
|   Warfare Lore                 | Discover: Perception            |
| Discover: Perception           | Known: Respects a straight      |
| Known: Weak to flattery about  |   answer.                       |
|   her art. Dislikes threats.   | Goal: 4: he vouches for you     |
| Goal: 8: she offers an         |                                 |
|   introduction                 |                                 |
| Suspicion: 3                                                     |
| Acted: (Ezren) (Amiri) ( Kyra ) ( Valeros )                      |
+------------------------------------------------------------------+
```

| Item | Default | Notes |
|---|---|---|
| Challenge name and rounds | Shown | |
| NPC names and Influence Points | Shown | One column per NPC; compact when there are several |
| Discovery skills | Perception (the universal skill) shown, no DCs. Others hidden until revealed. | Clickable. The GM's eye toggle appears on every row except the universal skill. The sheet shows no Revealed or Decoy checkbox for it. |
| Influence skills | Deception, Diplomacy and Intimidation (the universal skills) shown. Others hidden until revealed. | Clickable. No DC shown. No eye toggle, Revealed or Decoy checkbox on a universal row. |
| Weaknesses, resistances, penalties | Hidden until revealed | Name and player text |
| Thresholds | Hidden until revealed | Player text; marked when reached |
| Counters | Hidden until revealed | |
| Party markers | Shown | Dim once that PC has acted this round |

**Rules for the panel:**

- It has no close button, and players have no control that hides it.
- Clicking a skill rolls for the player's assigned character. Each NPC's column has its own skills, so the click also chooses the NPC.
- It leaves the canvas clickable outside its own area.
- The default position is top centre. A world setting offers other positions.
- The GM sees the same panel plus the pending-results list (section 8).
- It must not cover VN Stage's portrait controls at the default position.

## 8. Roll flow

1. A player clicks a skill, or the GM rolls or posts a link. The check is a normal PF2e roll with the current DC, always hidden from players. The roll carries a module identifier: challenge, NPC, skill, and whether it's Influence or Discover.
2. The active GM's client sees the chat message and adds an item to the pending-results list on the GM's panel.
3. **Influence** suggests: critical success +2, success +1, failure 0, critical failure −1. The GM clicks **Apply**, **Adjust** or **Ignore**.
4. **Discover** shows the degree of success and a reminder of what it earns: one piece of information, two on a critical success, a false one on a critical failure. The GM reveals entries by hand.
5. Applying updates points, marks reached thresholds, and spends one-time entries.
6. The PC is marked as having acted. Advancing the round clears the markers. The GM can toggle a marker by hand.

A reroll replaces the pending item if it hasn't been applied. If it has, the GM adjusts by hand.

## 9. Not in the first version

- Chases, infiltration, research, duels, reputation, leadership, hexploration and vehicles.
- Importing from PF2e Subsystems. Existing challenges stay in that module.
- Updating the `pf2e-influence-foundry` skill. It needs a new target format once this data format settles.
- Public release, translations beyond English, AI generation, a panel placed in the scene.

## 10. Later subsystems

These are notes to prove that the shared design stretches. They aren't requirements.

| Subsystem | Sheet needs | Panel needs |
|---|---|---|
| Chases | Ordered obstacles with branches, checks and Chase Points; PC and quarry position | Current obstacle, its allowed checks, progress along the route |
| Infiltration | Obstacles with Infiltration Points, Awareness thresholds, Edge Points, complications, opportunities | Awareness, current obstacles, Edge Points |
| Research | Library divisions, checks, Research Points, thresholds, false discoveries | Divisions, points, revealed findings |
| Reputation | Long-running per-faction score, tiers | Probably not a live panel |
| Duels | Mostly combat rules | Probably not a good fit |

## 11. Build order

| Phase | Result | Done when |
|---|---|---|
| 0. Prove the risky parts | Small tests of the items in section 12 | Each has a yes or a changed design |
| 1. Objects and sheets | Module loads; sidebar tab; create and edit an Influence challenge | A challenge survives reload, folders, duplicate and JSON export |
| 2. Run from the sheet | Run mode, rolling, chat links, confirm flow, modifiers, counters | A GM can run a whole challenge without the panel |
| 3. Panel | Filtered copy, panel, reveal, every-scene behaviour | A player client shows only what was revealed, across scene changes and reloads |
| 4. Player actions | Clickable skills per NPC column, acted markers | A player's roll reaches the GM's pending list and applies correctly |
| 5. Table polish | Layout with several NPCs, VN Stage check, zip build for friends | One real challenge run end to end with a second player login |

**Checks.** Follow VN Stage's pattern: `tools/test.mjs` for logic and `tools/check-load.mjs` for load errors, run through Foundry's Electron because Node isn't installed. Every phase also gets a live check in Foundry, with a player login for phases 3 to 5.

## 12. Risks to prove first

| Risk | Test | Fallback |
|---|---|---|
| The custom sidebar tab may need more than adding to `Sidebar.TABS` and `CONFIG.ui`, and `DocumentDirectory` assumes a whole collection | Add a tab listing filtered journal entries, with folders | Write a simpler list, or use a marked folder in the Journal tab |
| Hiding challenge entries from the Journal tab | Filter the directory on render, and check search and folder counts | Keep them in one clearly named folder |
| A player roll with a hidden DC may reveal the DC or degree of success in chat | Roll as a player and read the chat card | Have the GM's client post the roll result |
| Panel placement against Foundry's interface layers | Mount the panel and test windows and sidebar collapse | Change the mount point or z-index |
| How PF2e records rerolls in chat | Reroll with a Hero Point | The GM adjusts by hand |
| Finding party markers when the Party actor is empty or has extra members | Test `game.actors.party` | Add a PC list to the challenge |

## 13. Sources

- Foundry: [module sub-types](https://foundryvtt.com/article/module-sub-types/), plus the installed client code.
- PF2e: installed system code (`pf2e.mjs`, 8.6.1).
- Rules: [Influence](https://2e.aonprd.com/Rules.aspx?ID=3040), [stat blocks](https://2e.aonprd.com/Rules.aspx?ID=3041), [Influence action](https://2e.aonprd.com/Actions.aspx?ID=2725), [Discover action](https://2e.aonprd.com/Actions.aspx?ID=2726), [subsystems chapter](https://2e.aonprd.com/Rules.aspx?ID=3026).
- Other modules: [PF2e Subsystems](https://foundryvtt.com/packages/pf2e-subsystems) (installed copy read), [PF2e Chase Forge](https://foundryvtt.com/packages/pf2e-chase-forge), [Matadragones Subsystems](https://foundryvtt.com/packages/matadragones-subsystems-implementation-for-pf2e).
- Justin's own: the `pf2e-influence` skill notes and the VN Stage module.
