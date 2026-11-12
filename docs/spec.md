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
| Rolling | Players click skills on the panel. The GM can also click them, or roll or post chat links from the sheet. | Justin |
| Roll results | Normal PF2e checks. Players see the degree of success on the chat card as with any other roll, subject to PF2e's own metagame settings. | Justin |
| Missing Lore | A PC without a listed Lore rolls it untrained (Intelligence +0) from the sheet or panel. Chat links can't do this, as PF2e reports the statistic as missing. | Justin |
| Applying points | The module suggests the change, and the GM applies it with one button on the roll's chat card | Justin |
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
| Running challenges | **Any number run at once; one is on the panel.** Start or Show panel puts a challenge on the panel in place of the one there, which keeps running. Each challenge keeps its own run state, so a long one can run across sessions or a whole campaign while others come and go. | Justin, 2026-11-11 |

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
                   World setting: the challenge on the panel
                                  |
                  Panel on every client (players and GM)
                                  |
              Player roll -> chat message -> GM presses Apply on the card -> points change
```

**Storage.** Each challenge is a `JournalEntry` holding one page of type `pf2e-subsystem-manager.challenge`. Journal entries bring folders, compendiums, JSON export and duplication for free. Players have no ownership of them, so the interface doesn't show them to players.

**Sidebar tab.** The tab lists only challenge entries, with folders, search, create, duplicate and delete. The Journal tab hides them. A running challenge has a play mark by its name; the one players see on the panel has an eye instead (a hidden panel's challenge keeps the play mark). A Running button in the search bar lists only running challenges, without folders; it is off on each load. A running challenge's right-click menu has Show on panel, and the panel's challenge has Hide panel.

**Filtered copy.** The GM's client writes a world setting containing only what players may see, for the one challenge on the panel. Other running challenges keep their state on their own pages and write nothing to the setting. Every client redraws its panel when that setting changes. This needs no socket for display, and it survives reloads.

**Limit on secrecy.** Secrets only need to stay out of the player interface. As elsewhere in Foundry, a player who digs through the browser console may be able to read them, and Justin accepts that. A player-side roll needs the DC, so the copy includes DCs for revealed and universal skills, and the panel doesn't show them. The filtered copy leaves out unrevealed entries, decoy markers and GM text.

**Multiple GMs.** Only the active GM's client writes state and handles roll results. Other GMs see the Apply button on a roll's card, disabled.

**Extension point.** Each subsystem registers one definition: its data model, sheet, the function that builds the filtered copy, and its panel renderer. The sidebar, activation, panel frame and roll listener are shared.

## 5. Influence data

**Challenge**

| Field | Notes |
|---|---|
| Name, premise, GM notes | Premise and notes are rich text |
| Rounds | Current and maximum |
| NPCs | One or more |
| Counters | Zero or more |
| Run state | Inactive, active, or finished; the current round's acted list |

**NPC**

| Field | Notes |
|---|---|
| Name | The NPC's name |
| Perception and Will | Modifiers, not DCs |
| Influence Points | Current total |
| Discovery checks | Skill, Perception or Lore, DC, revealed flag. A Lore also has a name. A Lore row is never universal. A new NPC starts with Perception, which is universal. |
| Influence skills | Skill or Lore, DC, revealed flag. A new NPC starts with Deception, Diplomacy and Intimidation, which are universal. |
| Thresholds | Points, player text, GM text, reveal (hidden, points only, or points and text), reached flag. A threshold saved with the old revealed flag loads as points and text if it was revealed, hidden if not. |
| Resistances, weaknesses, Other | Modifier entries (below) |
| Decoys | A flag on any weakness, resistance or skill entry, except universal skills |

**Modifier entry.** Resistances, weaknesses and Other entries share this shape.

| Field | Notes |
|---|---|
| Name, player text, GM text | Players only see the player text |
| Kind | Resistance, weakness or Other. Other holds anything that is not a resistance or weakness. On the panel its cards say Other, as the others say Resistance or Weakness. An entry saved as a penalty or an adjustment loads as Other. |
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

**The state control is an icon button.** In the GM window it sits beside the eye, with a check icon (a rotate-back icon when Spent), `aria-pressed`, and a label and tooltip that say On, Off or Spent. Click it to switch On or Off, or to restore a Spent entry. It is solid green when On and looks like the eye button otherwise. Apply stays a separate button.

**How one-time entries work.** The GM turns one on. A DC change applies to the next check it matches. It is spent when that roll arrives, for Influence and Discover alike, so the next check gets the normal DC. If the GM skips Apply on that roll, they click the entry's restore button to restore it. Any other effect applies when the GM clicks apply. Spent entries can be restored.

**Counter.** Name, value, optional minimum and maximum, optional trigger values with GM notes, and a revealed flag. When a value reaches a trigger, the GM gets a notice.

## 6. GM sheet

The sheet has **Edit** and **Run** modes, like a locked and unlocked actor sheet.

**It looks like the PF2e NPC and hazard sheets.** It uses the system's own fonts, colours and spacing: a light parchment window (unless the GM picks a theme for the sheet), the name in the NPC sheet's condensed small caps, each NPC and the counters in a red-edged box under a dark red bar, and the Edit tab's boxes with red tabs. The modifier window takes the sheet's theme. Picking a theme in Configure Sheet keeps the challenge sheet, since that dialog can't list it and would otherwise switch the entry to a core journal sheet. When the GM loads the world, any challenge that lost its sheet gets it back. A changed DC uses PF2e's colours for adjusted values: one for higher than the base, one for lower.

**Run mode is laid out like a statblock:** small labels beside their values, with no boxed fieldsets and no folding sections. It shows:

- One strip at the top, in two rows. Row 1 has the round clock with previous and next round buttons on the left, and Start, End and Reset, Hide or Show panel at the far right. Row 2 has the party chips, then the Roll as choice.
- Each NPC's name with "Points" and the total beside it on the same line, with buttons to add and remove.
- Each skill as a chip styled like a PF2e inline check, in a grid of two or three columns by window width, with the Discovery and Influence labels beside their grids. The chip shows the skill name (the Lore name for a Lore) and the current DC, colored green (higher) or red (lower) when it differs from the base DC. Its tooltip gives the base DC and says if the skill is a decoy. Clicking the chip rolls for the chosen PC; a chat icon on it posts a chat link. A revealed chip has a bright fill, and a universal chip looks the same; a hidden chip is faded, with a dashed outline and no fill. On the light theme a revealed chip's eye is dark red, so it reads on parchment. While the challenge isn't running, the roll and chat link are disabled.
- An eye toggle to reveal or hide each entry, on the chip for skills. Universal skills have no eye: they are always shown. A threshold's eye steps through hidden, points only, and points and text, then back to hidden.
- Thresholds, modifiers and counters are each a card. Fading means hidden, and nothing else: a hidden card is faded with no fill and italic text, and a revealed card is full strength on a bright fill. A points-only threshold is full strength on half the fill. The fill is lighter than the background in both themes: white on the light parchment, the text colour on dark. The GM line keeps full strength inside a faded card, so it stays readable.
- Thresholds under the skills, each with its point value, its player text, and its GM text under it with no label, in PF2e's GM highlight. The Reached tag is a button (aria-pressed, GM only): click to mark a threshold reached by hand, click again to clear it. Dropping points never clears it; only this tag or the Edit tab does.
- Modifier entries as cards, in three sections, in order: Resistances, Weaknesses, Other. An empty section is hidden. In the GM window, no card carries a kind label, since its section heading says the kind. Each card shows the effects, the player text and the GM text (no label, in PF2e's GM highlight), with on, off and apply controls, and an edit button for a GM that opens the entry's window. The kind's colour stripe shows only while the entry is On: no stripe means Off or Spent. Off is not dimmed. The On button is filled solid green.
- Counters.

**Modifiers are edited in their own window, like a monster's attacks.** In the Edit tab each modifier entry is a read-only card with edit and delete buttons. It is the same whether the entry is hidden, revealed, On or Off: no fade, no italic name, no stripe, no state tag. The GM window has three sections, in order: Resistances, Weaknesses, Other. The panel lists cards in the same order. The Edit tab shows all three, each with its own Add entry, which adds an entry of that kind and opens its window. The window holds the name, kind, duration, player and GM text, the On, Spent, Revealed and Decoy boxes, and the effects, which can be added, removed and changed there. Thresholds, counters and skills stay inline in the Edit tab. There is one window per entry: opening it again brings it to the front. Save writes only the fields the GM changed onto the latest data, through the same write queue as every other change, so the sheet and the panel update and a run change made meanwhile is kept. An update from elsewhere redraws the window and keeps unsaved edits; deleting the entry closes it.

**Threshold text grows as the GM types.** In the Edit tab a threshold card has the points, reveal and Reached controls and the delete button on one row, and the player text and GM text side by side below, as text areas that grow with their text.

**Skill checks are tables in the Edit tab.** Discovery and Influence each get one table with the field names in a header row: Skill, Lore name, DC, Revealed, Decoy and a delete button. The Lore name cell is empty unless the skill is Lore. Universal rows leave Revealed and Decoy empty.

**Reveal is one click and can be undone.** The panel updates at once.

**Ending a challenge** removes the panel and keeps the final state on the sheet. Reset returns it to unspent.

## 7. Player panel

```
+------------------------------------------------------------------+
| The Governor's Banquet                                           |
| Round 3 of 6  [###########--------------------]                  |
| (Ezren) (Amiri) (Kyra) (Valeros)   <- portraits                  |
| Lady Vance                     | Lord Ostrov                     |
| [#####-----] 5                 | [##--------] 2                  |
| THRESHOLDS                     | THRESHOLDS                      |
| v 4  she offers an introduction|   4  he vouches for you         |
|   8  ???                       |                                 |
| Discover: Perception           | Discover: Perception            |
| Influence: Deception,          | Influence: Deception,           |
|   Diplomacy, Intimidation,     |   Diplomacy, Intimidation       |
|   Society, Warfare Lore        |                                 |
| +----------------------------+ | +-----------------------------+ |
| |Flattery           WEAKNESS | | |Straight talk           OTHER| |
| |-2 DCs vs Diplomacy  ONGOING| | |+2 DCs vs Deception   ONGOING| |
| +----------------------------+ | +-----------------------------+ |
| Suspicion: 3                                                     |
+------------------------------------------------------------------+
```

| Item | Default | Notes |
|---|---|---|
| Challenge name and rounds | Shown | The name at the left of the header and "Round 3 of 6" at its right, on one line. The round text is plain text, so the header still drags from it. |
| NPC names and Influence Points | Shown | One column per NPC; compact when there are several |
| Discovery skills | Perception (the universal skill) shown, no DCs. Others hidden until revealed. | Clickable. The GM's eye toggle appears on every row except the universal skill. The sheet shows no Revealed or Decoy checkbox for it. |
| Influence skills | Deception, Diplomacy and Intimidation (the universal skills) shown. Others hidden until revealed. | Clickable. No DC shown. No eye toggle, Revealed or Decoy checkbox on a universal row. |
| Resistances, weaknesses, Other | Hidden until revealed | One card each, in two rows: the name on the left and the kind (Resistance, Weakness or Other) on the right; then what it does on the left and the duration (One-time, Ongoing or Spent) on the right. A card with no effects players can see leaves the left of row two blank. The name and the effects wrap; the right-hand labels stay on one line. The player text is not on the card: it shows when the pointer rests on the card. A GM's hover shows the player text with no label, then "GM Only" on a line of its own over the GM text. A card with nothing to show has no hover. The kind's colour stripe shows only while it is On; an Off card has no stripe and fades to 40% for everyone, GM and players. A spent one-time entry shows Spent, faded the same way, with no stripe, with its effects struck through. An applied one-time entry whose DC change is still to come has its other effects struck through. |
| Thresholds | Hidden until revealed | One card per NPC under its bar, in points order; hidden if none are revealed. Revealed in two steps: points only shows as "6  ???", then points and player text. A reached one has a check mark; its slot is kept (empty, no box) when unreached, so the number and text never move. |
| Counters | Hidden until revealed | |
| Round bar | Shown | One segment per round, the rounds played filled. The segments stretch across the full panel width, like the point bars. Under the header, so it is not part of the drag handle. The GM also gets a Previous round button before the bar and a Next round button after it, doing what the GM window's buttons do and disabled in the same cases (and when this GM is not the active one). Players get no buttons. |
| Party avatars | Shown | Each PC's portrait (the actor's image, else a default icon), filled into the square and anchored to the top in their own row under the round bar. Lit until that PC has acted this round, then dimmed (greyscale and lower opacity) until the round moves on. The name shows on hover and is the accessible label. |

**The points bar** scales to the NPC's highest threshold, hidden or not, or to 10 if the NPC has none. Players can work out the goal from the bar; Justin accepts that (2026-11-09). The filtered copy carries only that one number, never a hidden threshold's text or id.

**What a modifier card says it does.** The filtered copy builds each effect from what players can see:

| Effect | Card text | Never shows |
|---|---|---|
| DC change | Shown as a DC change, never negated: "−2 to DCs vs Diplomacy" (a list for several skills), or "−2 to all DCs" when it covers every skill. | A DC number |
| Influence Points | "−1 Influence Point", "+2 Influence Points" | |
| Counter | "+1 Suspicion", once the counter is revealed | A hidden counter: the effect is left out |
| Rounds | "+1 round", "−2 rounds" | |
| Note only | Left out: the note is the GM's text. The player text covers it. | The note |

A DC change names only skills the panel shows (universal or revealed). It says nothing about hidden skills it covers, and a change that covers only hidden skills is left out (Justin, 2026-11-09). A change of zero, or one that points at a removed skill or counter, is left out. A revealed decoy's card looks like any other to players. On the GM's panel, a decoy skill button and a decoy card carry the orange Decoy tag, as in the GM window; it is read from the challenge on the GM's client, never from the shared copy.

**Rules for the panel:**

- It has no close button, and players have no control that hides it.
- Skills look like PF2e inline checks. Clicking one rolls for the player's assigned character. Each NPC's column has its own skills, so the click also chooses the NPC.
- It leaves the canvas clickable outside its own area.
- The default position is top centre. A world setting offers other positions; it is the starting spot for anyone who hasn't dragged the panel.
- Anyone, GM included, can drag the panel by its header. The spot is saved in the browser, per user, so it survives reloads. A reset button in the header, shown once the panel is dragged, puts it back at the starting spot. A dragged panel is kept wholly on screen when it loads, redraws or the window shrinks.
- Anyone, GM included, can resize the panel with the handle at its bottom-right corner. The top-left corner stays put, and a panel still at its starting spot is first placed where it is. The NPC columns, their point bars and their cards fill the new width, and the cards rewrap into as many columns as fit. A scrollbar appears only when the content is taller than the panel. The size is at least 240 by 120 pixels and at most the screen. It is saved with the spot, per user, and the reset button clears both.
- For the GM, the challenge name in the header is a button that opens the challenge window, or brings it to the front. A press that moves drags the panel instead and opens nothing. Players see the name as plain text.
- The GM can click a modifier card to turn it On or Off, as the GM window's chip does (a keyboard press works too). A spent card does nothing; restoring it stays a GM window action. Only the active GM's click writes. Players' cards are plain.
- The GM can click a party portrait to mark that character acted or not, as the GM window's party chip does (a keyboard press works too). Only the active GM's click writes. Players' portraits are plain.
- The GM sees the same panel and can click its skills too. The roll is for the selected token's actor, or, with no token selected, for the sheet's Roll as choice. The GM applies results from the chat cards (section 8).
- It must not cover VN Stage's portrait controls at the default position.

## 8. Roll flow

1. A player clicks a skill, or the GM rolls or posts a link. The check is a normal PF2e roll with the current DC, always hidden from players. The roll carries a module identifier: challenge, NPC, skill, whether it's Influence or Discover, and a roll id. A Discover check has PF2e's `secret` trait, like Recall Knowledge, from the panel, the roll button and a chat link alike: a player's roll is blind, so players see that a roll was made but not its result, and the GM's own roll goes to GMs only. Influence rolls stay public. PF2e's Show Secret Checks setting, if turned on, makes secret rolls visible again.
2. When the message arrives, the active GM's client marks the PC as having acted. Advancing the round clears the markers. The GM can toggle a marker by hand.
3. **Influence.** The GM's copy of the chat card gets one **Apply** button, showing the suggested change: critical success +2, success +1, failure 0, critical failure −1. Apply adds those points and marks any thresholds they reach. There is no Adjust or Ignore: to use another amount, the GM skips Apply and changes points by hand on the sheet.
4. **Discover.** No button. The GM's copy of the card gets a reminder of what the result earns: one piece of information, two on a critical success, a false one on a critical failure. The GM reveals entries by hand.
5. **One-time DC entries** the roll used are spent when it arrives, for both kinds (Justin, 2026-11-09). A second PC rolling before Apply then gets the normal DC, and changing another DC entry before Apply can't leave the entry unspent. If the GM skips Apply on that roll, they click the entry's restore button on the sheet. A roll used an entry only if it was made at the current DC; a roll at any other DC, such as an old chat link, leaves it for the next check. A roll that arrived with no active GM online spends its entries when it's applied instead.

**Apply works once.** After Apply, the message carries an `applied` flag, so the button shows as Applied and disabled for every GM and after a reload. The challenge also records the roll id, and Apply checks it inside the write queue, so a double click or a stale card can't count a result twice. Only the active GM can press Apply; other GMs see it disabled.

**When Apply is disabled.** The button explains why when the challenge isn't running, or the NPC or skill has been removed. A card whose challenge was deleted shows a note instead. Cards on screen redraw when the challenge starts, ends or resets. A card from before a Reset can still be applied once the challenge is started again, so the GM leaves old cards alone.

**What players see.** The plain PF2e roll, before and after Apply. The button and reminder are added only when a GM's client draws the card. They are never part of the message, which holds only the `applied` flag.

**Rerolls.** A PF2e reroll (Hero Point or the reroll menu) deletes the old message and posts a new one with the same roll id. Each card applies on its own:

| Situation | What happens |
|---|---|
| The first roll wasn't applied | Its card is gone. The reroll's card has its own Apply. |
| The first roll was already applied | The reroll's card shows Apply disabled, with a note to change points by hand if needed. |

A reroll doesn't mark the PC as acted again.

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
| 2. Run from the sheet | Run mode, rolling, chat links, apply flow, modifiers, counters | A GM can run a whole challenge without the panel |
| 3. Panel | Filtered copy, panel, reveal, every-scene behaviour | A player client shows only what was revealed, across scene changes and reloads |
| 4. Player actions | Clickable skills per NPC column, acted markers | A player's roll gets an Apply button on the GM's chat card and applies correctly |
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

## 14. Generic Victory Points challenge

**Status:** approved by Justin, 2026-11-11, and built. This section replaces the Influence-only parts of sections 5 to 8.

Every subsystem runs on one data model, one sheet and one panel: GM Core's [Victory Points](https://2e.aonprd.com/Rules.aspx?ID=3028) framework. Influence becomes a preset of it. Infiltration, Research and Chase are later presets, each with its own item.

### 14.1 Decisions

| Topic | Decision | Source |
|---|---|---|
| Where points live | On each subject. Counters stay challenge-wide. | Justin, 2026-11-11 |
| Individual subjects | Each PC has their own points on the subject. The panel shows one row per PC: portrait, then points bar. Everyone sees every row. | Justin |
| Subjects on the panel | Each subject has an eye toggle. Only revealed subjects show, one column each. | Justin |
| Shared pool | A counter is a full points track: a bar, and the same thresholds a subject has. An action's outcome can add to a counter. There is no third kind of pool. | Justin |
| Completion | A subject can have a goal. Reaching it marks the subject Complete: a check on its column, and its actions fade but still roll. The GM can set or clear Complete by hand. | Justin |
| Diminishing points | A direction on the track itself (a subject's points or a counter): **counts up** or **counts down**. Not set per threshold. | Justin |
| Names | Each challenge stores a points name and a subject label. The preset fills them in; the GM can edit them. | Justin |
| NPC stats | Every subject has one GM-only stat line of free text. Old Perception and Will numbers convert to "Perception +12, Will +9". | Justin |
| Outcome table | Set per action; the GM can edit it. Presets fill it in. | Justin |
| Per-round and threshold rules | A counter can change by a set amount each round. A threshold can carry effects that apply while it is reached. | Justin |
| Modifier categories | A modifier's kind becomes a free-text category. The preset suggests names. See 14.7. | Justin, 2026-11-11 |
| Challenge-level modifiers | A challenge has its own modifiers, which apply to every check. See 14.7. | Justin, 2026-11-11 |
| Framework additions | Degree buttons and an applied-result card with Undo; per-PC counters; saves as checks; subject limits, order and collapsing; both-ways tracks. See 14.8. | Justin, 2026-11-11 |

### 14.2 Data

**Challenge**

| Field | Notes |
|---|---|
| Name, premise, GM notes | As today |
| Preset | Which preset made it. Used only to build a new subject and to name the Add button. |
| Points name, subject label | "Influence Points" and "NPC" for Influence; "Victory Points" and "Subject" for a blank challenge |
| Rounds | Current and maximum. The maximum can be blank: no limit, and the panel shows "Round 3" with no bar. |
| Subjects | One or more, in the GM's order |
| Modifiers | Challenge-level modifier entries (14.7) |
| Counters | Zero or more |
| Run state | As today |

**Track.** A subject's points and a counter are both tracks. A track has a value, a direction and thresholds.

| Direction | A threshold or goal is reached when | Use |
|---|---|---|
| Counts up | The value rises to it or past it | Influence, Awareness, accumulating points |
| Counts down | The value falls to it or past it | Diminishing points: start high, lose points |
| Both ways | Above 0 by rising, below 0 by falling; Reached follows the value (14.8) | Reputation |

**Subject**

| Field | Notes |
|---|---|
| Name, stat line | The stat line is GM-only |
| Revealed | Off: not on the panel at all |
| Tracks points | On by default. Off for a subject that only holds actions, such as an Infiltration opportunity. |
| Individual | Off: one shared total. On: one total per PC, keyed by actor. A roll changes the roller's total. |
| Points, direction, minimum, maximum | The track. The limits are optional (14.8). |
| Goal | Optional number. Reaching it sets Complete. On an individual subject each PC completes alone, and the subject is Complete when every party PC has. |
| Complete | Set by the goal, or by hand |
| Thresholds | As below. An individual subject has a goal only, no thresholds. |
| Modifiers | As in section 5, with a category in place of the kind (14.7). A points effect on an individual subject changes every PC's total. |
| Actions | One or more |

**Action**

| Field | Notes |
|---|---|
| Name | "Influence", "Discover", "Overcome" |
| Secret | The check gets PF2e's `secret` trait, as Discover has today |
| Checks | Rows as today: skill, Perception, Lore or a saving throw (14.8); DC; revealed; decoy. A row can be **always shown**: no eye, never a decoy. This replaces the fixed universal-skill lists. |
| Outcome table | For each of the four degrees of success, a list of effects: change this subject's points, change a counter, change the rounds, or a note |
| Maximum points | Optional. The most this action can give in total, counting every points or counter amount above zero. Apply stops there, and the card says so. Losses never count. |

**Threshold.** One shape for subjects and counters.

| Field | Notes |
|---|---|
| Points, player text, GM text, reveal, reached | As today |
| DC change | Optional. Applies while the threshold is Reached: to that subject's checks for a subject threshold, to every check in the challenge for a counter threshold. The GM text holds any note. |

Reached is set when the track reaches the threshold in its direction. Only the GM clears it, as today. The GM still gets a notice when a counter threshold is reached.

**Counter.** Name, value, direction, optional minimum and maximum, thresholds, revealed, and an optional **change each round**. Next round adds that amount; Previous round takes it back. A counter can be **per PC** (14.8).

### 14.3 Rolls and Apply

- A roll carries the challenge, subject, action, check row and roll id. Section 8's rules for receiving, one-time DC entries, Apply-once and rerolls stay as they are.
- The GM's card gets one button per degree of success, and each Apply posts an applied-result card with Undo (14.8).
- A note in the row shows on the GM's card as a reminder. A row with only notes has no button. An empty row shows nothing.
- Apply changes the points, marks thresholds reached, sets Complete, and changes counters, with the same notices as a hand change.

### 14.4 Sheet

Run mode keeps its layout. Changes:

- Each subject has an eye by its name, and a Complete tag that is a button, like Reached.
- Each action is a labelled grid of chips, in the GM's order, as Discovery and Influence are today.
- An individual subject lists each party PC with their points and add and remove buttons.
- A counter with thresholds shows them as cards, like a subject's.
- Subjects can be moved up and down, and collapsed (14.8). A per-PC counter lists each party PC, with the party total (14.8).

Edit mode changes:

- The challenge has the points name, subject label and an optional round maximum.
- Each subject has the stat line, Tracks points, Individual, direction and goal.
- Each action's checks stay an inline table. Its name, Secret, maximum points and outcome table are edited in a window of their own, as modifiers are.
- Counters have direction, change each round, and thresholds in place of triggers.

### 14.5 Panel

- One column per revealed subject. Complete shows a check by the name and fades the actions.
- The points bar scales to the goal, else to the highest threshold, else to 10. A counts-down track scales to its starting value.
- An individual subject shows one row per party PC: portrait, bar, and a check when that PC is done.
- Each action is a line: its name, then its visible checks.
- A revealed counter with thresholds gets a bar and a threshold card. A plain counter stays "Suspicion: 3". A per-PC counter shows a row per PC, and a both-ways track a bar with a zero mark (14.8).
- Everything else in section 7 stays: cards, round bar, portraits, drag, resize, GM controls.

### 14.6 Presets

A preset is a starting template: its names, and what a new challenge and a new subject contain. After creation everything can be edited. The sidebar's create button offers the presets.

| Preset | Names | A new subject has |
|---|---|---|
| **Victory Points** (blank) | Victory Points, Subject | Suggested category: Modifier. One action, "Check", with no rows. Outcomes: +2, +1, 0, −1 points. |
| **Influence** | Influence Points, NPC | Suggested categories: Resistance, Weakness, Other. Revealed. Discover: secret, Perception always shown, outcomes are the three reminder notes. Influence: Deception, Diplomacy and Intimidation always shown, outcomes +2, +1, 0, −1 points. |
| **Infiltration** | Infiltration Points, Obstacle | Suggested categories: Opportunity, Complication. Counters: Awareness Points (shown, +1 each round, minimum 0, GM Core's tiers at 5 (DC +1), 10 (complication), 15 (DC +1 more, +2 in total) and 20 (fails)) and Edge Points (per PC, shown). Three Add buttons: **Obstacle** (goal 2; Overcome with no checks; +2 or +1 points, +1 or +2 Awareness); **Complication** (no points; Overcome; success is a note, +1 or +2 Awareness); **Opportunity** (no points; Attempt; success notes). The first obstacle starts revealed, later subjects hidden. |
| **Chase** | Chase Points, Obstacle | No suggested categories. GM notes hold GM Core's reminders (passing costs 1 CP, extra CP don't carry over). A **Chase** box in the Edit tab sets the type (Chase Down, Run Away, Beat the Clock, Competitive) and the counter that is the other side. A new chase is Chase Down with a Quarry counter at obstacle 2, +1 each round, minimum 0, shown. A new obstacle: goal 3, minimum 0, Overcome with no checks, +2, +1, 0, −1 points. The first obstacle starts revealed, later ones hidden. See 14.11. |
| **Infiltration Preparation** | Edge Points, Preparation | Run before the infiltration; the GM types its results in. Counters: Edge Points (per PC, shown) and Awareness Points (hidden). One revealed subject with no points and GM Core's six activities as actions, every check always shown, secret where the rules say. A dud or cursed Edge Point still adds to Edge, and its row's note tells the GM to write it in the PC's note. No suggested categories. |

A preset can offer several **subject templates**, one Add button each; the first is named by the subject label. A template's outcome rows find the preset's counters by name, else the first counter of the same kind (Justin, 2026-11-11).

### 14.7 Modifier categories and challenge-level modifiers

**Status:** decided with Justin, 2026-11-11; built 2026-11-11. Checked against a real infiltration, *The Great Toy Heist*. Resistances and weaknesses are Influence's names for something every subsystem has, so the fixed kinds become categories, and a challenge gets modifiers of its own.

**Category.** A modifier entry's kind (section 5) is replaced by a category: a free-text label.

| Rule | Detail |
|---|---|
| Suggestions | The preset suggests labels in the modifier window (14.6). The GM can type any label. |
| Order | Cards group by category: the preset's suggestions first, in their order, then other labels in order of first use. |
| Colour | Each category's stripe takes the next colour of a fixed palette, in that order. Influence's three keep today's colours. There is no colour picker. |
| Other | Not built in. It is one of Influence's suggestions. |
| Edit tab | One Add entry per category in use, plus a plain Add entry with an empty category. The preset's suggested categories always get one, even when no entry uses them yet (Justin, 2026-11-11). There is no list of categories to edit. |
| Order on the sheet and panel | A blank category groups first, with no heading and no label, then the labelled ones (Justin, 2026-11-11). |
| GM window | Under each subject, an Actions section of action cards, then Thresholds, then a Modifiers section with one subsection per category, its heading in the category's colour. The Edit tab has the same Actions and Modifiers headings. |
| Panel | Each action is a card: its name, a Secret mark, its check buttons, and its description on hover. Then one section per category the subject has, plus the preset's suggestions, with a heading in the category's colour; one with nothing revealed says "None revealed". Its label shows even when every entry in it is hidden. The blank category shows only when one of its entries is revealed. The cards leave out the category label, since the heading names it. |

**Challenge-level modifiers.** The challenge holds its own list of modifier entries, beside each subject's.

| Rule | Detail |
|---|---|
| Shape | The same entry as a subject's: name, category, duration, texts, state, effects. |
| DC change | Applies to every check in the challenge, still filtered by chosen skills. The skills are named, not picked by check: the choices are the skills used by checks in the challenge (a Lore by its name), and each matches that skill on any subject (Justin, 2026-11-11). A one-time one is spent by the next matching check anywhere. A change meant for one subject goes on that subject. |
| Points effect | Not offered: there is no subject to change. Counter, rounds and note effects work as on a subject. |
| Sheet | A Challenge box above the subjects, with its cards grouped by category, as a subject's are. Edit mode adds them there the same way. |
| Panel | Revealed ones show in a full-width strip above the subject columns, grouped by category with no section headings, in the same card style (with the category label) and with the same GM click. Hidden if none are revealed. |

**Left to the GM.** These were weighed and cut, since each saves only a click or two (Justin, 2026-11-11). Outcome notes and threshold text say what the GM should do.

| Not built | Instead |
|---|---|
| Effects that reveal a subject or turn on a modifier | The GM reveals or turns it on by hand. |
| A full effect list on thresholds | Thresholds keep their text and DC change. |
| A "once per PC" duration | An Ongoing modifier the GM turns off, or a note. |
| A challenge-level DC change aimed at chosen subjects | A modifier on that subject. |
| An editable category list with colours | Free-text categories, as above. |

**How Infiltration's parts fit.**

| Part | Built as |
|---|---|
| Opportunity with no check | A one-time challenge-level modifier, category Opportunity. The GM reveals it when it becomes available and turns it on when a player uses it. |
| Opportunity that needs a roll | A subject that tracks no points. |
| Complication | A subject with an action. The GM reveals it when its trigger happens. A lasting penalty from failing it is a modifier the GM turns on. |

### 14.8 Framework additions

**Status:** decided with Justin, 2026-11-11; built 2026-11-11. They came from checking every planned subsystem against the framework, using GM Core and real examples: *The Great Toy Heist*, *All or Nothing* (Agents of Edgewatch 3), *Graveclaw* (Blood Lords 2), *Punks in a Powderkeg* (Outlaws of Alkenstar 1), *Ruins of the Radiant Siege* (Agents of Edgewatch 6) and GM Core's Reputation.

**Degree buttons on the roll card.** These replace the single Apply button of 14.3.

| Rule | Detail |
|---|---|
| Buttons | One per degree of success whose outcome row has an effect, in order from critical success to critical failure. A notes-only or empty row gets no button. |
| The rolled degree | Its button is highlighted, like PF2e's damage buttons on a saving throw card. Its notes show on the card as a reminder, as today. |
| Tooltips | Each button's tooltip lists that row's effects and notes. |
| Labels | Short: the degree and its change, such as "Success: +1 Influence Point". |
| Why | Spending an Edge Point (failure becomes success), a Preparation Point (one step up) or an opportunity like Not Like That! means applying a degree other than the one rolled. The GM picks it. |
| Apply once | Clicking any button applies that row and locks every button on the card, for every GM and after a reload, as section 8's Apply-once rule does. Only the active GM can click. |

**Applied-result card with Undo.**

| Rule | Detail |
|---|---|
| The card | Each Apply posts a new chat card, whispered to GMs only, since it can name hidden subjects and counters. It names the roller, the degree applied, and each change made, such as "+1 Influence Point (Vessa), +1 Awareness". |
| Undo | A button on that card, for the active GM. It reverses exactly what that Apply did, like PF2e's undo on a damage-taken message. Changes made since stay. |
| What Undo reverses | The actual change to each subject's points and counter, after limits clamped it. The actual change to the round maximum (Justin, 2026-11-11). Thresholds that Apply marked Reached, if the value is no longer past them. A Complete that Apply set, if the goal is no longer reached. The action's maximum-points tally. The roll id in the applied list. |
| What Undo leaves | One-time DC entries the roll spent on arrival: the GM restores them by hand, as today. Notes. |
| After Undo | The roll card's buttons unlock, so the GM can pick again. The result card shows Undone, with its button disabled. A reroll of an undone roll can be applied. |

**Per-PC counters.**

| Rule | Detail |
|---|---|
| Shape | A counter setting, **Per PC**: one value per party PC, keyed by actor, with the counter's limits applying to each value. |
| Outcomes | A counter change in an outcome row changes the roller's value. A modifier's counter effect changes every party PC's value. |
| Thresholds and goal | None. |
| Change each round | Not offered. |
| Sheet | One row per party PC, with the value and add and remove buttons, and the party total beside the counter's name. |
| Panel | A revealed per-PC counter shows one row per party PC: portrait and value. |
| Spending | By hand: the GM lowers that PC's value and clicks the degree the spend gives on the roll card. |
| GM notes | Each PC's row on the sheet has a GM-only note, beside the value. It records which Edge Points are duds, cursed or only for one situation. It saves on its own, Reset puts it back to its state at Start, and Undo leaves it. The panel never sees it. |
| Dud Edge Points | Not a counter: the failure row adds to Edge, as the PC thinks it worked, and its note tells the GM to write the dud in that PC's note (Justin, 2026-11-11). |

**Saving throws as checks.** A check row can be Fortitude, Reflex or Will, as well as a skill, Perception or Lore. It rolls with PF2e's saving throw check at the row's DC and follows every other row rule: reveal, decoy, always shown, DC changes.

**Subject limits.** A subject's points get the same optional minimum and maximum as a counter. On an individual subject they apply to each PC's points. Chase Points use minimum 0; Reputation uses −50 and +50.

**Subject order.** In both modes of the sheet, each subject has move up and move down buttons. The order is the challenge's subject order, so the panel's columns follow it. It is only for reference: the GM still reveals the next obstacle by hand.

**Collapsible subjects.** Each subject on the sheet can collapse to its header row: name, eye, points and Complete. The state is each user's own, kept across reloads in a user flag, and changes neither the challenge nor the panel.

**Both-ways tracks.** A third direction beside Counts up and Counts down.

| Rule | Detail |
|---|---|
| Thresholds | A threshold above 0 is reached when the value rises to it or past it; one below 0 when it falls to it or past it. A threshold at 0 is never reached. |
| Reached follows the value | Unlike the other directions, Reached clears itself when the value moves back past the threshold, and the GM can't set it by hand. A DC change on it lasts only while it is reached. |
| Goal | None. |
| Panel bar | Spans the minimum to the maximum, with a mark at 0, filled from 0 to the value. Without both limits it spans the furthest threshold on each side, else −10 to 10. |

**Settled without new features.**

| Need | How |
|---|---|
| Preparation before an infiltration or chase | A separate challenge, run first, with its own rounds. The GM types its results into the main challenge. A smoother handover can come later. |
| Clues for a party total of per-PC points (*Punks*: one clue per 2 Preparation Points) | The GM watches the total and reveals prepared modifiers or journal entries. |
| Obstacles in order; the other side's position | The GM reveals the next obstacle. The pursuers can be a counter that changes by +1 each round. |
| Research's timed events (day 1, 3, 7, 14) | A "Days" counter that changes by +1 each round, with thresholds. |
| Complications that last until cleared (Alarm Sounded: AP +2 a round; Drunken Gambler: DC 32) | The GM turns on a challenge-level modifier, or edits the counter's change each round. |
| Opportunities with a check (Create a Diversion) | A subject that tracks no points. A DC that rises with each repeat is a note. |

### 14.9 No backward compatibility

The module isn't in real use yet (Justin, 2026-11-11), so nothing is converted. Challenges use one page type, `pf2e-subsystem-manager.challenge`. Old Influence pages, their chat cards and old exports stop working, and the old load-time migrations are removed. An Influence challenge is rebuilt from the Influence preset.

### 14.10 Left to the preset items

- Chase: built as the Chase preset (14.6, 14.11). Not built: split paths, shortcuts and solo chases.
- Infiltration: built as the Infiltration and Infiltration Preparation presets (14.6). Not built: several objectives in sequence, and group checks that pass when half the party succeeds.
- Research: nothing new. Research Points are a counter; each area is a subject that tracks no points, with a maximum on its action.
- Enemy Victory Points need nothing new: a counter, changed by outcome rows.
- Reputation (an idea, not yet planned): factions are subjects with no actions on both-ways tracks, −50 to +50, with GM Core's tiers as thresholds.

### 14.11 Chases

**Status:** decided with Justin, 2026-11-11; built 2026-11-11. Rules: GM Core, [Chases](https://2e.aonprd.com/Rules.aspx?ID=3049).

| Topic | Decision |
|---|---|
| Obstacles | Subjects, in the GM's order. The party's obstacle is the first one not Complete. Its goal is the CP it needs. |
| The other side | A counter holding its obstacle number, +1 each round; the GM nudges it by hand on hard obstacles (Justin). |
| Changing the type | If the other side's counter still has a type's default name, it takes the new type's name and start: Quarry at 2, Pursuers at 0, Rival at 1. Beat the Clock hides it and, with no round maximum, sets one round per obstacle. A renamed counter is left alone. |
| Panel | Only the party's obstacle, and only once it is revealed: clearing one brings up the next the GM has revealed (Justin). Above it, a progress track: one slot per obstacle (a hidden one shows "?" and no name), a finish flag, and a start slot when the other side is behind obstacle 1. Markers show the party and, while its counter is revealed, the other side. The other side's counter is left out of the panel's counter list. |
| Sheet | Run mode's strip gets a Chase line: the type, the party's obstacle, the other side's, and how it ended. |
| Notices to the GM | After any change, once each: the chase's end. When a round moves on: Run Away's three-obstacle lead (which ends it), three rounds stuck on one obstacle, Competitive's roll-initiative reminder, and Beat the Clock's last round. End notices stay until dismissed. |
| How each type ends | Chase Down: the party reaches the quarry's obstacle, or the quarry gets past the last. Run Away: the party gets past the last obstacle, or three ahead at the end of a round; the pursuers reach the party's obstacle. Beat the Clock: every obstacle cleared. Competitive: whoever gets past the last obstacle first. |
| Passing | The GM lowers the obstacle's points with −. |
| Saves and attacks | Saves are check rows. Attacks and spells are the GM's: pick a degree on the roll card or change points by hand. |
| Not built | Split paths, shortcuts and solo chases. |
