# PF2e Subsystems Framework: spec

**Status:** approved by Justin, including the three decisions proposed by Claude in section 2. **Date:** 2026-11-08. **Targets:** Foundry 14, PF2e 8.6 or later.

## 1. Summary

A Foundry module for running PF2e subsystems. Each subsystem challenge is an object in its own sidebar tab, with a sheet the GM runs it from. While a challenge is active, players see a panel over the canvas that they can't close.

Every subsystem is a Victory Points challenge (section 14), with presets for Influence, Infiltration, Infiltration Preparation, Chase, Reputation and Research. Sections 5 to 8 describe the first, Influence-only build; where section 14 differs, section 14 wins.

## 2. Decisions

| Topic | Decision | Source |
|---|---|---|
| Existing PF2e Subsystems module | Replace it. No importer. | Justin |
| Audience | Justin and friends' tables, released on a public GitHub repo with a manifest URL | Justin, 2026-11-13 |
| First subsystem | Influence | Justin |
| Player panel | Fixed on screen over the canvas. Stays put during pan and zoom. Only the GM can end or hide it. | Justin |
| Where the panel shows | Every scene, for all players, until the GM ends or hides it. Survives scene changes and reloads. | Justin |
| Rolling | Players click skills on the panel. The GM can also click them, or roll or post chat links from the sheet. | Justin |
| Roll results | Normal PF2e checks. Players see the degree of success on the chat card as with any other roll, subject to PF2e's own metagame settings. | Justin |
| Missing Lore | A PC without a listed Lore rolls it untrained (Intelligence +0) from the sheet or panel. Chat links can't do this, as PF2e reports the statistic as missing. | Justin |
| Applying points | Nothing applies points automatically. The GM changes every value by hand with + and − on the sheet. A roll only marks the PC as acted and spends the one-time DC entries it used. | Justin, 2026-11-12 |
| NPCs | One challenge holds one or more NPCs and one shared round clock | Justin |
| Hidden by default | Everything except the NPC name, Influence Points, rounds remaining and the checks the GM has revealed (a preset starts its Perception, Deception, Diplomacy and Intimidation checks revealed) | Justin |
| Universal skills | Dropped. No check is always shown: every check has a reveal eye and a decoy flag. Every new check starts revealed, whether a preset makes it or the GM adds it, and the GM can hide or delete it. | Justin |
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
              Player roll -> chat message -> GM changes points by hand on the sheet
```

**Storage.** Each challenge is a `JournalEntry` holding one page of type `pf2e-subsystems-framework.challenge`. Journal entries bring folders, compendiums, JSON export and duplication for free. Players have no ownership of them, so the interface doesn't show them to players.

**Sidebar tab.** The tab lists only challenge entries, with folders, search, create, duplicate and delete. The Journal tab hides them. A running challenge has a play mark by its name; the one players see on the panel has an eye instead (a hidden panel's challenge keeps the play mark). A Running button in the search bar lists only running challenges, without folders; it is off on each load. A running challenge's right-click menu has Show on panel, and the panel's challenge has Hide panel.

**Filtered copy.** The GM's client writes a world setting containing only what players may see, for the one challenge on the panel. Other running challenges keep their state on their own pages and write nothing to the setting. Every client redraws its panel when that setting changes. This needs no socket for display, and it survives reloads.

**Limit on secrecy.** Secrets only need to stay out of the player interface. As elsewhere in Foundry, a player who digs through the browser console may be able to read them, and Justin accepts that. A player-side roll needs the DC, so the copy includes DCs for revealed skills, and the panel doesn't show them. The filtered copy leaves out unrevealed entries, decoy markers, GM notes and secret blocks.

**Multiple GMs.** Only the active GM's client writes state and handles arriving rolls.

**Extension point.** Each subsystem registers one definition: its data model, sheet, the function that builds the filtered copy, and its panel renderer. The sidebar, activation, panel frame and roll listener are shared.

## 5. Influence data

**Challenge**

| Field | Notes |
|---|---|
| Name, GM notes | GM notes are rich text |
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
| Discovery checks | Skill, Perception or Lore, DC, revealed flag. A Lore also has a name. A new NPC starts with Perception, revealed. |
| Influence skills | Skill or Lore, DC, revealed flag. A new NPC starts with Deception, Diplomacy and Intimidation, revealed. |
| Thresholds | Points, name, description (rich text; its secret blocks are the GM's), reveal (hidden, points only, or points, name and description), reached flag. |
| Resistances, weaknesses, Other | Modifier entries (below) |
| Decoys | A flag on any weakness, resistance or skill entry |

**Modifier entry.** Resistances, weaknesses and Other entries share this shape.

| Field | Notes |
|---|---|
| Name, description | The description is rich text, like an action's. Players see it but its secret blocks. |
| Kind | Resistance, weakness or Other. Other holds anything that is not a resistance or weakness. On the panel its cards say Other, as the others say Resistance or Weakness. |
| Duration | **One-time** (spent once used), **multi-use** (turns Off once used; the GM turns it On again each time it is exploited, with no limit) or **ongoing** (active until the GM turns it off) |
| State | Active or off; spent; revealed; decoy |
| DC change | One signed amount, on all skills or chosen skills. The window offers quick −5, −2, +2 and +5. An amount of 0 means no DC change. A split such as +2 to Diplomacy and −2 to Deception is two entries (Justin, 2026-11-12). |
| Note | A consequence with no number, such as "she ends the conversation". May be empty. |

Points, counter and rounds effects were removed (Justin, 2026-11-12): the GM makes those changes by hand.

**The state control is an icon button.** In the GM window it sits beside the eye, with a check icon (a rotate-back icon when Spent), `aria-pressed`, and a label and tooltip that say On, Off or Spent. Click it to switch On or Off, or to restore a Spent entry. It is solid green when On and looks like the eye button otherwise.

**How one-time entries work.** The GM turns one on. A DC change applies to the next check it matches. It is spent when that roll arrives, for Influence and Discover alike, so the next check gets the normal DC. If the roll shouldn't have used it, the GM clicks the entry's restore button.

**How multi-use entries work.** The same as one-time, except the roll turns the entry Off instead of spending it. The GM turns it On again the next time a PC exploits it. There is no limit and no use count until a published subsystem needs one (Justin, 2026-11-13). The panel card says Multi-use.

**Counter.** Name, value, optional minimum and maximum, optional trigger values with GM notes, and a revealed flag. When a value reaches a trigger, the GM gets a notice.

## 6. GM sheet

The sheet has **one view** (Justin, 2026-11-12): live play and editing together, like a PF2e NPC sheet whose actions each open their own edit window. There is no Edit/Run switch and no subject tabs.

**It looks like the PF2e NPC and hazard sheets.** It uses the system's own fonts, colours and spacing: a light parchment window (unless the GM picks a theme for the sheet), the name in the NPC sheet's condensed small caps, each section in a red-edged box under a dark red bar.

**Layout.** A sidebar on the left and the body on the right, as on the PF2e NPC sheet (Justin, 2026-11-13). The sidebar is a fixed 10rem, the NPC sheet's width, at every window width, and runs the window's full height. The sidebar and the body each scroll on their own. Fields in the sidebar sit one per line, NPC style.

| Sidebar part, top to bottom | What it holds |
|---|---|
| Status | Not started, Running or Finished, always shown, apart from the rounds. |
| Run buttons | Start, End, Reset, Hide or Show panel, one per line. |
| Round | One line, like HP on an NPC sheet: Round, then ◀ current / max ▶. Current is locked while running, so only ◀ ▶ change it; max stays editable. A blank max (no limit) shows ∞. With max 0 the numbers stay and ◀ ▶ are disabled. |
| Party | One participant per line: portrait and name, plain, not styled as buttons. A click marks it acted, which fades it and strikes the name through. An added actor's remove button shows only on hover or keyboard focus (Justin, 2026-11-13). Roll as under the list. |
| Allow multiple subjects | A checkbox. |

| Body part, top to bottom | What it holds |
|---|---|
| Name | The challenge name, editable in place. |
| GM notes | Its own box, first in the body. It collapses like a subject card, by its caret or a click on its bar, and each user's choice is kept per challenge in the same user flag (Justin, 2026-11-13). It starts open. |
| Counters | The challenge's counters. |
| Modifiers | The challenge's own modifiers, grouped by category (14.7). |
| Subjects | Grouped by category (14.4), then an Add subject button. |

**Adding, editing and deleting.** Subjects, actions, counters and modifiers are each edited in their own window, opened by an edit button on the entry's row. Each row also has a delete button, which asks for confirmation first, as actions on a PF2e NPC sheet do. A + adds an entry and opens its window:

| + on | Adds |
|---|---|
| The Modifiers and Counters bars | A challenge modifier or counter. |
| A subject category's bar, and the Add subject button | A subject in that category, or with none. |
| A modifier category's title | A modifier in that category. |
| A subject card's Counters, Modifiers and Actions titles | One of those on that subject. |

| Window | Fields |
|---|---|
| Subject | Name, category (with suggestions, 14.6), Revealed and description. |
| Action | Name, Secret, description, and its Checks: a table of Skill, Lore name, DC, Revealed, Decoy and a delete button, with a + in the Checks title to add a check. The Lore name cell is empty unless the skill is Lore. |
| Counter | Name, value, direction, minimum, maximum, change each round and per PC, then a Panel group (Revealed, display, Thresholds list and Threshold marks; only Revealed on a per-PC counter). Its thresholds have windows of their own. |
| Threshold | Name, points, reveal (Players see), DC change, Reached (not on a both-ways track) and description. A threshold with no name opens with the cursor in its name (Justin, 2026-11-13). |
| Modifier | See below. |

Every window takes the sheet's theme. There is one window per entry: opening it again brings it to the front. Every change saves at once, as on a Foundry sheet, and there is no Save button: closing the window just closes it. A description saves from its editor's own button (Justin, 2026-11-12). A description takes about 3 lines when short and grows with its text up to about 14rem, then scrolls (Justin, 2026-11-12). A save writes only the fields the GM changed onto the latest data, through the same write queue as every other change, so the sheet and the panel update and a run change made meanwhile is kept. An update from elsewhere redraws the window and keeps unsaved edits; deleting the entry closes it. Picking a theme in Configure Sheet keeps the challenge sheet, since that dialog can't list it and would otherwise switch the entry to a core journal sheet. When the GM loads the world, any challenge that lost its sheet gets it back. A changed DC uses PF2e's colours for adjusted values: one for higher than the base, one for lower.

**Live play is laid out like a statblock:** small labels beside their values. It shows:

- The sidebar (above). Its party list includes the actors the GM added (14.14), each with a remove button. Roll buttons stay disabled until the run starts.
- Each NPC's name with "Points" and the total beside it on the same line, with buttons to add and remove.
- Each skill as a chip styled like a PF2e inline check, in a grid of two or three columns by window width, with the Discovery and Influence labels beside their grids. The chip shows the skill name (the Lore name for a Lore) and the current DC, colored green (higher) or red (lower) when it differs from the base DC. Its tooltip gives the base DC and says if the skill is a decoy. Clicking the chip rolls for the chosen PC; a chat icon on it posts a chat link. A revealed chip is full strength; a hidden chip is faded, with its name in italics. On the light theme a revealed chip's eye is dark red, so it reads on parchment. While the challenge isn't running, the roll and chat link are disabled.
- An eye toggle to reveal or hide each entry, on the chip for skills. A threshold's eye steps through hidden, points only, and points and text, then back to hidden.
- Actions, modifiers and counters are each a row, like the actions on a PF2e NPC sheet: no box and no fill, a thin line between rows, the name at the left and plain icon controls at the right. A long name wraps in its own space and makes the row taller, as an ability's name does on the NPC sheet; the tags and controls stay on its first line (Justin, 2026-11-13). The same holds for subject headers and action lines. Thresholds sit as indented rows under their counter. Fading means hidden, and nothing else: a hidden row is faded with italic text, and a revealed row is full strength. A points-only threshold is full strength with italic text. The eye icon also shows the state. The GM line keeps upright text inside a faded row, so it stays readable.
- Fields in the sheet look like the NPC sheet's labeled fields: a bold label with a slightly smaller input or dropdown beside it.
- The edit windows look like other Foundry edit windows, such as PF2e's spell sheet (Justin, 2026-11-12): one field per row, the label in a column on the left and the field on the right, with slightly smaller inputs. Each subsection (Checks, Thresholds, DC change) is a bordered box with its title in the border, and any + sits in that title. The checks table, each threshold's row and the modifier's skills list keep their own layout; thresholds are split by a thin line.
- Thresholds under their counter, each a row like a modifier's (Justin, 2026-11-13): caret, eye, points, name, DC change tag, Reached, then edit and delete. A threshold with no name shows just its points. It starts collapsed; its caret works only when it has a description, which shows under it, secret blocks included, when open. Each user's open rows last until the page reloads. A + on the counter's row (not on a per-PC counter) adds a threshold, opens its window and opens the counter. The Reached tag is a button (aria-pressed, GM only): click to mark a threshold reached by hand, click again to clear it. Dropping points never clears it; only this tag or the threshold window does.
- Modifier entries as rows, in three sections, in order: Resistances, Weaknesses, Other. An empty section is hidden. In the GM window, no row carries a kind label, since its section heading says the kind. Each row shows its name, tags and controls (eye, on, off and apply, edit and delete); the DC change and note, then the description, secret blocks included, show under it when the row is open. A row collapses like an action card (Justin, 2026-11-12): it starts collapsed, its caret comes first in the row (14.4) and works only when there are details to show, and each user's open rows last until the page reloads. The kind's colour stripe shows only while the entry is On: no stripe means Off or Spent. Off is not dimmed. The On button is a green icon.
- Counters.

**The modifier window** holds the name, category, duration, the On, Spent, Revealed and Decoy boxes, the description, the DC change (amount, quick buttons, All skills and the skills list) and the Note. Either can be left empty.

**Reveal is one click and can be undone.** The panel updates at once.

**Ending a challenge** removes the panel and keeps the final state on the sheet. Reset returns it to unspent.

## 7. Player panel

```
+------------------------------------------------------------------+
| The Governor's Banquet                                           |
| Round 3 of 6  [###########--------------------]                  |
| (Ezren) (Amiri) (Kyra) (Valeros)   <- portraits                  |
| Suspicion: 3                                                     |
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
+------------------------------------------------------------------+
```

| Item | Default | Notes |
|---|---|---|
| Challenge name and rounds | Shown | The name at the left of the header and "Round 3 of 6" at its right, on one line. The round text is plain text, so the header still drags from it. |
| NPC names and Influence Points | Shown | One column per NPC; compact when there are several |
| Discovery skills | Perception shown at the start (a preset reveals it), no DCs. Others hidden until revealed. | Clickable. The GM's eye toggle appears on every row. |
| Influence skills | Deception, Diplomacy and Intimidation shown at the start (a preset reveals them). Others hidden until revealed. | Clickable. No DC shown. The eye toggle appears on every row. |
| Resistances, weaknesses, Other | Hidden until revealed | One card each, in two rows: the name on the left and the kind (Resistance, Weakness or Other) on the right; then what it does on the left and the duration (One-time, Multi-use, Ongoing or Spent) on the right. A card with no effects players can see leaves the left of row two blank. The name and the effects wrap; the right-hand labels stay on one line. A card with a description opens like an action card (Justin, 2026-11-13): its name, with a caret, opens and closes the description below the card, without its secret blocks, for the GM too. Each user's open cards last until the page reloads. A GM's click elsewhere on the card still turns it On or Off. Cards have no hover. The kind's colour stripe shows only while it is On; an Off card has no stripe and fades to 40% for everyone, GM and players. A spent one-time entry shows Spent, faded the same way, with no stripe, with its effects struck through. An applied one-time entry whose DC change is still to come has its other effects struck through. |
| Thresholds | Hidden until revealed | One card per NPC under its bar, in points order; hidden if none are revealed. Revealed in two steps: points only shows as "6  ???", then points and name. A threshold with a description opens like an action card: its name, with a caret, opens the description below it, without its secret blocks (Justin, 2026-11-13). A reached one has a check mark; its slot is kept (empty, no box) when unreached, so the number and text never move. |
| Counters | Hidden until revealed | |
| Round bar | Shown | One segment per round, the rounds played filled. The segments stretch across the full panel width, like the point bars. Under the header, so it is not part of the drag handle. The GM also gets a Previous round button before the bar and a Next round button after it, doing what the GM window's buttons do and disabled in the same cases (and when this GM is not the active one). Players get no buttons. |
| Party avatars | Shown | Each PC's portrait (the actor's image, else a default icon), filled into the square and anchored to the top in their own row under the round bar. Lit until that PC has acted this round, then dimmed (greyscale and lower opacity) until the round moves on. The name shows on hover and is the accessible label. |

**The points bar** scales to the NPC's highest threshold, hidden or not, or to 10 if the NPC has none. Players can work out the goal from the bar; Justin accepts that (2026-11-09). The filtered copy carries only that one number, never a hidden threshold's text or id.

**What a modifier card says it does.** The filtered copy builds each effect from what players can see:

| Effect | Card text | Never shows |
|---|---|---|
| DC change | Shown as a DC change, never negated: "−2 to DCs vs Diplomacy" (a list for several skills), or "−2 to all DCs" when it covers every skill. | A DC number |
| Note only | Left out: the note is the GM's text. The description covers it. | The note |

A DC change names only skills the panel shows (revealed). It says nothing about hidden skills it covers, and a change that covers only hidden skills is left out (Justin, 2026-11-09). A change of zero, or one that points at a removed skill or counter, is left out. A revealed decoy's card looks like any other to players. On the GM's panel, a decoy skill button and a decoy card carry the orange Decoy tag, as in the GM window; it is read from the challenge on the GM's client, never from the shared copy.

**Rules for the panel:**

- It has no close button, and players have no control that hides it.
- Skills look like PF2e inline checks. Clicking one rolls for the player's assigned character, or for the participant they picked (14.14). Each NPC's column has its own skills, so the click also chooses the NPC.
- It leaves the canvas clickable outside its own area.
- The default position is top centre. A world setting offers other positions; it is the starting spot for anyone who hasn't dragged the panel.
- Anyone, GM included, can drag the panel by its header. The spot is saved in the browser, per user, so it survives reloads. A reset button in the header, shown once the panel is dragged, puts it back at the starting spot. A dragged panel is kept wholly on screen when it loads, redraws or the window shrinks.
- A panel nobody has resized takes its width from the number of revealed subjects and nothing else, so revealing, hiding, expanding or collapsing anything else never makes it jump (Justin, 2026-11-13). Zero or one subject gives one 32rem column; several give 17rem each. Other content wraps to that width. GM and players count the same revealed subjects. The height still follows the content, up to the panel's limit. Past that, or past a resized panel's height, everything under the header scrolls and the header stays put (Justin, 2026-11-13). Subject cards are always as tall as their content.
- A subject column is never narrower than 17rem. When the panel has less room than its columns need, the subject row scrolls sideways and the rest of the panel keeps the panel's width (Justin, 2026-11-13).
- Anyone, GM included, can resize the panel with the handle at its bottom-right corner. The top-left corner stays put, and a panel still at its starting spot is first placed where it is. The NPC columns, their point bars and their cards fill the new width, and the cards rewrap into as many columns as fit. A scrollbar appears only when the content is taller than the panel. The size is at least 240 by 120 pixels and at most the screen. It is saved with the spot, per user, and the reset button clears both.
- For the GM, the challenge name in the header is a button that opens the challenge window, or brings it to the front. A press that moves drags the panel instead and opens nothing. Players see the name as plain text.
- The GM can click a modifier card to turn it On or Off, as the GM window's chip does (a keyboard press works too). A spent card does nothing; restoring it stays a GM window action. Only the active GM's click writes. Players' cards are plain.
- The GM gets − and + beside every counter value on the panel: each challenge and subject counter, and each PC's value on a per-PC counter. They do what the sheet's buttons do, with the same limits and threshold notices, and each is disabled at the limit it would pass (and when this GM is not the active one). Players get no buttons.
- The GM can click a party portrait to mark that character acted or not, as the GM window's party chip does (a keyboard press works too). Only the active GM's click writes. Players' portraits are plain.
- The GM sees the same panel and can click its skills too. The roll is for the selected token's actor, or, with no token selected, for the sheet's Roll as choice. The GM applies results from the chat cards (section 8).
- It must not cover VN Stage's portrait controls at the default position.

## 8. Roll flow

1. A player clicks a skill, or the GM rolls or posts a link. The check is a normal PF2e roll with the current DC, always hidden from players. The roll carries a module identifier: challenge, NPC, skill, whether it's Influence or Discover, and a roll id. A Discover check has PF2e's `secret` trait, like Recall Knowledge, from the panel, the roll button and a chat link alike: a player's roll is blind, so players see that a roll was made but not its result, and the GM's own roll goes to GMs only. Influence rolls stay public. PF2e's Show Secret Checks setting, if turned on, makes secret rolls visible again.
2. When the message arrives, the active GM's client marks the PC as having acted. Advancing the round clears the markers. The GM can toggle a marker by hand.
3. **Results.** No roll changes points, counters or rounds (Justin, 2026-11-12). The GM reads the degree of success on the card and changes values by hand with + and − on the sheet. The chat card is PF2e's own: the module adds nothing to it, for the GM or for players.
4. **One-time DC entries** the roll used are spent when it arrives, for both kinds (Justin, 2026-11-09), so the next check gets the normal DC. If the roll shouldn't have used one, the GM clicks the entry's restore button on the sheet. A roll used an entry only if it was made at the current DC; a roll at any other DC, such as an old chat link, leaves it for the next check. A roll that arrives with no active GM online spends nothing.

**Rerolls.** A PF2e reroll (Hero Point or the reroll menu) deletes the old message and posts a new one marked as a reroll. A reroll doesn't mark the PC as acted again and spends no entries.

## 9. Not in the first version

- Duels, leadership, hexploration and vehicles. (Chases, infiltration, research and reputation became presets: section 14.)
- Importing from PF2e Subsystems. Existing challenges stay in that module.
- Updating the `pf2e-influence-foundry` skill: it was written for PF2e Subsystems, a different module (Justin, 2026-11-13). Challenges can be written as JSON instead: `docs/challenge-format.md`.
- Translations beyond English, AI generation inside the module, a panel placed in the scene.

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
| 4. Player actions | Clickable skills per NPC column, acted markers | A player's roll marks the PC as acted and spends the one-time DC entries it used (the Apply button was removed, 2026-11-12) |
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
| Where points live | On each subject, as counters of its own (14.13). The challenge keeps its own counters too. | Justin, 2026-11-11 and 2026-11-12 |
| Subjects on the panel | Each subject has an eye toggle. Only revealed subjects show, one column each. | Justin |
| Shared pool | A counter is a full points track: a bar, and the same thresholds a subject has. There is no third kind of pool. | Justin |
| Completion | The GM marks a subject Complete by hand: a check on its column, and its actions fade but still roll. Nothing sets it (14.13). | Justin, 2026-11-12 |
| Diminishing points | A direction on the counter itself: **counts up** or **counts down**. Not set per threshold. | Justin |
| Names | Each challenge stores a points name and a subject label. The preset fills them in; the GM can edit them. | Justin |
| Subject description | Every subject has a rich-text description in place of the old GM-only stat line. Players see it in the subject's column on the panel, under the name, except its secret blocks. | Justin, 2026-11-12 |
| No outcome tables | Rolls change nothing. Actions have no outcome table or maximum points, and the GM changes every value by hand (section 8). | Justin, 2026-11-12 |
| Per-round and threshold rules | A counter can change by a set amount each round. A threshold can carry effects that apply while it is reached. | Justin |
| Modifier categories | A modifier's kind becomes a free-text category. The preset suggests names. See 14.7. | Justin, 2026-11-11 |
| Challenge-level modifiers | A challenge has its own modifiers, which apply to every check. See 14.7. | Justin, 2026-11-11 |
| Framework additions | Per-PC counters; saves as checks; subject limits, order and collapsing; both-ways tracks. See 14.8. | Justin, 2026-11-11 |

### 14.2 Data

**Challenge**

| Field | Notes |
|---|---|
| Name, GM notes | As today |
| Preset | Which preset made it. Used only to build a new subject and to name the Add button. |
| Points name, subject label | "Influence Points" and "NPC" for Influence; "Victory Points" and "Subject" for a blank challenge |
| Rounds | Current and maximum. The maximum can be blank: no limit, and the panel shows "Round 3" with no bar. A maximum of 0 means the challenge has no rounds, as a campaign-long one such as Reputation: Start leaves the round at 0, Next round does nothing, and the panel shows neither the round, its buttons, the party portraits nor the acted marks. The sheet keeps its Round line with ◀ ▶ disabled, and lists only added actors, with no acted marks. The sheet's status shows the run's state at all times. Giving a running challenge a maximum again starts it at round 1 (Justin, 2026-11-13). |
| Subjects | One or more, in the GM's order |
| Modifiers | Challenge-level modifier entries (14.7) |
| Counters | Zero or more |
| Run state | As today |

**Track.** A counter, the challenge's or a subject's, has a value, a direction and thresholds.

| Direction | A threshold is reached when | Use |
|---|---|---|
| Counts up | The value rises to it or past it | Influence, Awareness, accumulating points |
| Counts down | The value falls to it or past it | Diminishing points: start high, lose points |
| Both ways | Above 0 by rising, below 0 by falling; Reached follows the value (14.8) | Reputation |

**Subject**

| Field | Notes |
|---|---|
| Name, description | The description is rich text. Players see it on the panel, except its secret blocks |
| Category | Free text, such as Obstacle or Complication. The field suggests the preset's subject categories and those already on subjects, as the GM types; modifier categories stay separate (14.6) |
| Revealed | Off: not on the panel at all |
| Counters | Zero or more, each a full counter (14.13). A subject with none holds only actions, such as an Infiltration opportunity. |
| Complete | Set and cleared by the GM only |
| Modifiers | As in section 5, with a category in place of the kind (14.7). Each has one DC change and a note. |
| Actions | One or more |

**Action**

| Field | Notes |
|---|---|
| Name | "Influence", "Discover", "Overcome" |
| Secret | The check gets PF2e's `secret` trait, as Discover has today |
| Description | Plain text everyone sees: what the action is and how players use it |
| Checks | Rows as today: skill, Perception, Lore or a saving throw (14.8); DC; revealed; decoy. Every row has an eye and a decoy flag; there is no always-shown flag. Every new check starts revealed (Justin, 2026-11-12). This replaces the fixed universal-skill lists. |

An action has no outcome table and no maximum points (Justin, 2026-11-12).

**Threshold.** One shape for subjects and counters.

| Field | Notes |
|---|---|
| Points, name, description, reveal, reached | As above |
| DC change | Optional. Applies while the threshold is Reached: to that subject's checks for a threshold on a subject's counter, to every check in the challenge for one on a challenge counter. A secret block in the description holds any note. |

Reached is set when the counter reaches the threshold in its direction. Start also sets it on any threshold a counter's starting value already meets, with its notice, such as an event on day 1 when Days starts at 1; Reset clears it again (Justin, 2026-11-13). Only the GM clears it, as today. The GM gets a notice when any counter's threshold is reached, giving the counter, the points and the threshold's name (Justin, 2026-11-13).

**Counter.** Name, value, direction, optional minimum and maximum, thresholds, revealed (a new counter starts revealed), and an optional **change each round**. Next round adds that amount; Previous round takes it back. A counter can be **per PC** (14.8).

### 14.3 Rolls

- A roll carries the challenge, subject, action, check row and roll id. Section 8's rules for receiving, one-time DC entries and rerolls apply.
- A roll changes no value. The GM's + and − change counters, mark thresholds Reached and give counter notices. Complete is a button of its own.

### 14.4 Sheet

The sheet's one view (section 6):

- Each subject has an eye by its name, and a Complete tag that is a button, like Reached.
- Each action is a labelled grid of chips, in the GM's order, with edit and delete buttons. An action with no checks still shows, so it can be edited.
- **Order** (Justin, 2026-11-13). The challenge's own fields are in the sidebar (section 6). The body has GM notes, then Counters, Modifiers and Subjects. A subject's card holds its description, then Counters, Modifiers and Actions.
- A subject's card has Counters, Modifiers and Actions subsections, each title with a + (section 6). Its counters each have + and −, as the challenge's do (14.13).
- A counter with thresholds shows them as rows under it, like a subject's.
- Subjects, modifiers and counters can be reordered by drag, and subjects and counters collapsed (14.8). A per-PC counter lists each party PC, with the party total (14.8).
- **Subjects group by category** (Justin, 2026-11-12). Each subject is a collapsible card, with edit and delete buttons in its header. Uncategorised cards come first with no heading; then each category in use has a red section bar with its subjects' cards under it, in subject category order (14.6), and a + that adds a subject in that category. A category bar doesn't collapse. A subject can be dragged only within its category.
- **Collapsible rows share one layout** (Justin, 2026-11-13). The caret comes first, then the eye (if the row has one), then other toggles (such as a modifier's On), then the name. Status tags, such as a subject's Complete, stay after the name. A row with nothing to open keeps an empty caret slot, so its name lines up with its neighbours'. This covers subjects, counters, modifiers and actions on the sheet, not the panel.
- **Clicking a header opens and closes it** (Justin, 2026-11-12). A click on the empty part of a subject's header, an action's line, a modifier's row or a counter's top row does what its caret does. Buttons, inputs, links, skill chips and their eyes, and the edit and delete buttons keep their own jobs. An action, modifier or counter with nothing to show stays still. The caret stays the keyboard target.
- The stored subject list keeps this grouped order, so the panel's columns follow it. A subject whose category changes moves to the end of its new group.
- The challenge has an optional round maximum, edited in place in the sidebar.
- Each action's window holds its name, Secret and description, then its checks as a table. The description is rich text, like an item's, so it can hold the action's degrees of success. Its secret blocks are the GM's alone.
- Counters have direction, change each round, and thresholds in place of triggers, set in the counter window.

### 14.5 Panel

- One column per revealed subject. Complete shows a check by the name and fades the actions.
- A bar scales to the counter's maximum, else to the highest threshold, else to 10. A counts-down counter scales to its starting value.
- **Order** (Justin, 2026-11-12). Round and party, then the challenge's counters, then its modifiers, then the subject columns. In a column: description, counters, modifiers, actions. A rule sits above and below the challenge's counters.
- The challenge's bar, steps and track counters each take the full panel width on their own row. Per-PC and number counters keep their layout.
- A subject's revealed counters show in its column, under its name, each in its display style (14.13).
- Each action is a line: its name, then its visible checks.
- A revealed counter with thresholds gets a bar and a threshold card. A plain counter stays "Suspicion: 3". A per-PC counter shows a row per PC, and a both-ways track a bar with a zero mark (14.8).
- Everything else in section 7 stays: cards, round bar, portraits, drag, resize, GM controls.

### 14.6 Presets

A preset is a starting template: its names, and what a new challenge and a new subject contain. After creation everything can be edited. The sidebar's create button offers the presets.

| Preset | Names | A new subject has |
|---|---|---|
| **Victory Points** (blank) | Victory Points, Subject | A Victory Points counter. Suggested category: Modifier. One action, "Check", with no rows. |
| **Influence** | Influence Points, NPC | An Influence Points counter. Suggested categories: Resistance, Weakness. Revealed. Discover: secret, Perception revealed. Influence: Deception, Diplomacy and Intimidation revealed. |
| **Infiltration** | Infiltration Points, Obstacle | Suggested categories: Opportunity, Complication. Counters: Awareness Points (shown, +1 each round, minimum 0, GM Core's tiers at 5 (DC +1, complication), 10 (complication), 15 (DC +1 more, +2 in total, complication) and 20 (fails)) and Edge Points (per PC, shown). Suggested subject categories: Obstacle, Complication, Opportunity. A new obstacle: an Infiltration Points counter, maximum 2; Overcome with no checks. GM notes say how to use the module for an infiltration: obstacles (individual ones Per PC, several objectives as categories), Awareness, Edge, and turning an obstacle into a complication or an opportunity. The first obstacle starts revealed, later subjects hidden. |
| **Chase** | Chase Points, Obstacle | No suggested categories. Allow multiple subjects is off. GM notes say how to use the module for a chase: obstacles, the tracks, each round, and split paths or a split party. Counters: Party at 1 and Quarry at 2, +1 each round; both minimum 0, maximum 6, Track display, shown. A new obstacle: a Chase Points counter, 0 to 3; Overcome with no checks. The first obstacle starts revealed, later ones hidden. See 14.11. |
| **Infiltration Preparation** | Edge Points, Preparation | Run before the infiltration; the GM types its results in. Counters: Edge Points (per PC, shown) and Awareness Points (hidden). One revealed subject with no counter and GM Core's six activities as actions, every check revealed, secret where the rules say. GM notes say how to run it with the module: rolling activities, adding points by hand, that a dud or cursed Edge Point still adds to Edge and goes in the PC's note, and handing the totals to the infiltration. No suggested categories. |
| **Reputation** | Reputation Points, Faction | No challenge counters, no rounds (Maximum rounds 0), no suggested categories. A new faction is revealed, with no actions and one Reputation Points counter: both ways, −50 to +50, starting at 0, with GM Core's six tiers as thresholds (30, 15, 5, −5, −15, −30), shown in full. Each tier's name is the tier; a secret block in its description says which favors and disservices still count (Justin, 2026-11-13). Ignored has no threshold: no tier ticked means Ignored. GM notes say how to use the module for reputation: factions, favors and disservices by hand, and leaving the challenge running across sessions (Justin, 2026-11-13). |
| **Research** | Research Points, Library Area | No suggested categories, no round maximum. Counters: Research Points (minimum 0, shown, no thresholds: the GM adds the stat block's) and Days (starts at 1, +1 each round, minimum 0, shown as a number, so no bar gives a hidden event away; timed events are its thresholds, hidden until the GM reveals them). A new library area is revealed, with one Research action with no checks and an RP Gathered counter, 0 to 5, drawn as a bar: its maximum is the area's Maximum RP. The GM adds to both the area and the pool by hand after each roll (Justin, 2026-11-13). GM notes say how to use the module for research: areas, each roll and false discoveries, thresholds, and time. |

**GM notes** are guidance on using the module for that subsystem: what to add, how to set up its counters, what to do each round. They don't repeat GM Core's rules; the GM reads those on their own (Justin, 2026-11-13).

A preset makes one kind of subject, so the sheet has one Add subject button, named by the subject label. A preset can suggest **subject categories**, apart from its modifier categories; the GM sets a subject's category by hand (Justin, 2026-11-12).

### 14.7 Modifier categories and challenge-level modifiers

**Status:** decided with Justin, 2026-11-11; built 2026-11-11. Checked against a real infiltration, *The Great Toy Heist*. Resistances and weaknesses are Influence's names for something every subsystem has, so the fixed kinds become categories, and a challenge gets modifiers of its own.

**Category.** A modifier entry's kind (section 5) is replaced by a category: a free-text label.

| Rule | Detail |
|---|---|
| Suggestions | The preset suggests labels in the modifier window (14.6). The GM can type any label. |
| Order | Cards group by category: the preset's suggestions first, in their order, then other labels in order of first use. |
| Colour | Each category's stripe takes the next colour of a fixed palette, in that order. Influence's two keep today's colours. There is no colour picker. |
| Other | Not built in, and not suggested. An entry that fits no category goes in the blank one; the GM can still type "Other". |
| Sheet | A small heading per category in use. A category with no entries is not shown. The + in the Modifiers title adds an entry with an empty category and opens its window, where the GM picks the category (Justin, 2026-11-12); the + on a category's heading starts it in that category. There is no list of categories to edit. |
| Order on the sheet and panel | A blank category groups first, with no heading and no label, then the labelled ones (Justin, 2026-11-11). |
| GM window | Under each subject, Counters, then a Modifiers section with one subsection per category, its heading in the category's colour, then an Actions section of action rows. An action with a description opens and closes by its name to show it, as on the panel. |
| Panel | Each action is a card: its name, a Secret mark and its check buttons. A card with a description opens and closes by its name to show it, as it does in the GM window; each user's open cards are their own. Above the actions, one section per category with a revealed entry, with a heading in the category's colour. A category with nothing revealed, the blank one included, is not shown (Justin, 2026-11-12). The cards leave out the category label, since the heading names it. |

**Challenge-level modifiers.** The challenge holds its own list of modifier entries, beside each subject's.

| Rule | Detail |
|---|---|
| Shape | The same entry as a subject's: name, category, duration, texts, state, DC change and note. |
| DC change | Applies to every check in the challenge, still filtered by chosen skills. The skills are named, not picked by check: the choices are the skills used by checks in the challenge (a Lore by its name), and each matches that skill on any subject (Justin, 2026-11-11). A one-time one is spent by the next matching check anywhere. A change meant for one subject goes on that subject. |
| Sheet | A Modifiers box above the subjects, with its rows grouped by category, as a subject's are, and a + on its bar. |
| Panel | Revealed ones show in a full-width strip above the subject columns, grouped by category with no section headings, in the same card style (with the category label) and with the same GM click. Hidden if none are revealed. |

**Left to the GM.** These were weighed and cut, since each saves only a click or two (Justin, 2026-11-11). GM notes and threshold text say what the GM should do.

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
| Opportunity that needs a roll | A subject with no counter. |
| Complication | A subject with an action. The GM reveals it when its trigger happens. A lasting penalty from failing it is a modifier the GM turns on. |

### 14.8 Framework additions

**Status:** decided with Justin, 2026-11-11; built 2026-11-11. They came from checking every planned subsystem against the framework, using GM Core and real examples: *The Great Toy Heist*, *All or Nothing* (Agents of Edgewatch 3), *Graveclaw* (Blood Lords 2), *Punks in a Powderkeg* (Outlaws of Alkenstar 1), *Ruins of the Radiant Siege* (Agents of Edgewatch 6) and GM Core's Reputation.

**Degree buttons and Undo were removed** (Justin, 2026-11-12), with outcome tables. Rolls change nothing, so there is nothing to apply or undo. To use a degree other than the one rolled, such as after spending an Edge Point, the GM changes the values that degree gives by hand.

**Per-PC counters.**

| Rule | Detail |
|---|---|
| Shape | A counter setting, **Per PC**: one value per party PC, keyed by actor, with the counter's limits applying to each value. |
| Thresholds | None. |
| Change each round | Not offered. |
| Sheet | One row per party PC, with the value and add and remove buttons, and the party total beside the counter's name. |
| Panel | A revealed per-PC counter shows one row per party PC: portrait and value. |
| Spending | By hand: the GM lowers that PC's value and changes what the new degree gives. |
| GM notes | Each PC's row on the sheet has a GM-only note, beside the value. It records which Edge Points are duds, cursed or only for one situation. It saves on its own, and Reset puts it back to its state at Start. The panel never sees it. |
| Dud Edge Points | Not a counter: the GM adds the point to Edge, as the PC thinks it worked, and writes the dud in that PC's note. The preset's GM notes say so (Justin, 2026-11-11 and 2026-11-12). |

**Saving throws as checks.** A check row can be Fortitude, Reflex or Will, as well as a skill, Perception or Lore. It rolls with PF2e's saving throw check at the row's DC and follows every other row rule: reveal, decoy, DC changes.

**Limits.** Every counter, a subject's included, has an optional minimum and maximum. On a per-PC counter they apply to each PC's value. Chase Points use 0 to 3; Reputation uses −50 and +50.

**Subject, modifier and counter order.** On the sheet, the GM drags a subject, modifier or counter by any part of its header outside its controls to a new place in its own group: a subject or modifier within its category, a counter within its list, the challenge's or one subject's (Justin, 2026-11-12). A drop in another group is refused: a subject or modifier changes category only through its window's Category field. Only a GM can drag, and the panel has no dragging; it shows the order. The order is the challenge's subject order, so the panel's columns follow it. It is only for reference: the GM still reveals the next obstacle by hand.

**Collapsible subjects.** Each subject on the sheet can collapse to its header row: name, eye and Complete. The state is each user's own, kept across reloads in a user flag, and changes neither the challenge nor the panel. Each category's red bar, the uncategorised Subjects bar too, has its own toggle beside its +. It collapses that category's subjects when any is open, and expands them all when all are collapsed; its icon and tooltip change to match, and it leaves other categories alone (Justin, 2026-11-12).

**Collapsible counters** (Justin, 2026-11-13). A counter with thresholds can collapse to its top row, hiding its thresholds. Like a subject, it starts open, and the state is each user's own, kept across reloads in a user flag. A counter with no thresholds, a per-PC counter included, has nothing to collapse.

**Both-ways tracks.** A third direction beside Counts up and Counts down.

| Rule | Detail |
|---|---|
| Thresholds | A threshold above 0 is reached when the value rises to it or past it; one below 0 when it falls to it or past it. A threshold at 0 is never reached. |
| Reached follows the value | Unlike the other directions, Reached clears itself when the value moves back past the threshold, and the GM can't set it by hand. A DC change on it lasts only while it is reached. |
| Panel bar | Spans the minimum to the maximum, with a mark at 0, filled from 0 to the value. Without both limits it spans the furthest threshold on each side, else −10 to 10. |
| Panel threshold list | Highest first, as on a counts-down counter, so the list reads from the best tier down (Justin, 2026-11-13). Points sit in a right-aligned column, with + on positives and a minus sign on negatives, so +30 and −30 line up. |

**Settled without new features.**

| Need | How |
|---|---|
| Preparation before an infiltration or chase | A separate challenge, run first, with its own rounds. The GM types its results into the main challenge. A smoother handover can come later. |
| Clues for a party total of per-PC points (*Punks*: one clue per 2 Preparation Points) | The GM watches the total and reveals prepared modifiers or journal entries. |
| Obstacles in order; the other side's position | The GM reveals the next obstacle. The pursuers can be a counter that changes by +1 each round. |
| Research's timed events (day 1, 3, 7, 14) | A "Days" counter that changes by +1 each round, with thresholds. |
| Complications that last until cleared (Alarm Sounded: AP +2 a round; Drunken Gambler: DC 32) | The GM turns on a challenge-level modifier, or edits the counter's change each round. |
| Opportunities with a check (Create a Diversion) | A subject with no counter. A DC that rises with each repeat is a note. |

### 14.9 No backward compatibility

Nothing from before the first release is converted (Justin, 2026-11-11 and 2026-11-13). Challenges use one page type, `pf2e-subsystems-framework.challenge`, and the module has no load-time migrations. The model's only load-time step gives repeated ids new ones, so a hand-written import can't link two rows.

### 14.10 Left to the preset items

- Chase: built as the Chase preset, data only (14.6, 14.11, 14.12). Split paths and solo chases need no new feature (14.11).
- Infiltration: built as the Infiltration and Infiltration Preparation presets (14.6), and audited against GM Core (items/archive/infiltration-subsystem.md). Several objectives in sequence need nothing new: a subject category per objective, and Per PC counters for individual obstacles. GM Core's infiltration has no group checks; group obstacles pool their points on a plain counter.
- Research: built as the Research preset (14.6), data only (items/archive/research-subsystem.md). Each area's Maximum RP is an RP Gathered counter on the area (Justin, 2026-11-13).
- Enemy Victory Points need nothing new: a counter the GM changes by hand.
- Reputation: built as the Reputation preset (14.6), data only (items/archive/reputation-subsystem.md).

### 14.11 Chases

**Status:** decided with Justin, 2026-11-11; cut back to data only, 2026-11-12. Rules: GM Core, [Chases](https://2e.aonprd.com/Rules.aspx?ID=3049).

Chase is a preset and nothing more: no code checks for it. The GM does by eye what the first build automated (Justin, 2026-11-12).

| Topic | Decision |
|---|---|
| Obstacles | Subjects, in the GM's order. Allow multiple subjects is off, so revealing the next obstacle hides the cleared one (14.12). |
| The party and the other side | Two counters holding obstacle numbers, drawn as tracks (14.12). The other side moves +1 each round; the GM nudges it on hard obstacles. The GM adds 1 to Party when an obstacle clears. The GM sets both maximums to the number of obstacles. |
| Chase types | No type field. GM notes say how to set up the tracks: rename Quarry and set where each side starts, or hide Quarry and set a round maximum for a race against time. |
| Ending, being stuck, initiative | The GM's call, from the counters. No notices. A side past the last obstacle can't go past the top of its track, so the GM marks the last obstacle Complete (Justin, 2026-11-13). |
| Passing | The GM lowers the obstacle's Chase Points with −. |
| Saves and attacks | Saves are check rows. Attacks and spells are the GM's to adjudicate. Points change by hand, as for every roll. |
| Split paths and solo chases | No new feature. A category per path, and Allow multiple subjects on while the party chooses. A split party: Party set to Per PC. GM notes say so. |

### 14.12 One subject at a time and counter displays

**Status:** decided with Justin, 2026-11-12; built 2026-11-12. Generic features that replace the first Chase build's custom logic.

**Allow multiple subjects.** A checkbox in the sheet's sidebar, with a tooltip.

| Rule | Detail |
|---|---|
| On (default) | Any number of subjects can be revealed. |
| Off | Revealing a subject, by the eye button or the subject window, hides every other subject. Hiding one reveals nothing. Turning it off changes nothing until the next reveal. |
| Panel | Unchanged: it shows the revealed subjects. A subject keeps its place for a stand-in name ("Obstacle 3"). |

**Counter display.** One Display list per counter in its window, beside its Revealed checkbox. The list sets the style only; Revealed, like the sheet's eye button, sets whether players see it, in the style the list shows.

| Choice | Panel |
|---|---|
| Auto (default) | A bar with thresholds or a both-ways range, else a number: the rule before this section. |
| Number | Name and value on the shared line. With thresholds in its list, its own row instead: name and value, with the threshold card under it (Justin, 2026-11-13). |
| Bar | The progress bar with its threshold card. |
| Steps | One segment per value above the minimum, filled up to the value, like the round counter. |
| Track | A thin line with a tick per value from the minimum to the maximum, and a small rounded square on the value. A revealed threshold's tick is taller and red, green once reached (Justin, 2026-11-12). |

- Steps and Track count from the minimum (0 when unset; −maximum for a both-ways counter) to the maximum. Without a maximum, or with more than 40 slots, they draw as a bar. Steps on a both-ways counter draws as a bar.
- A revealed threshold marks its slot (on a Track, its tick; on a Bar, a thin tick on the fill's scale, both-ways bars included); a reached one in another colour. Hidden thresholds leave no mark.
- **Two checkboxes per counter** in its window, both on by default; not on per-PC counters (Justin, 2026-11-12). The per-threshold eye is unchanged, and each checkbox works without the other.

| Checkbox | Off |
|---|---|
| Show thresholds list on panel | The panel lists no thresholds under the counter. The copy sent to players holds no threshold text. |
| Show thresholds on counter display | Revealed thresholds leave no mark on the bar, steps or track. The copy holds no marks. |

- A per-PC counter has no Display list, only Revealed: it keeps its per-PC rows.

### 14.13 Subjects own counters

**Status:** decided with Justin, 2026-11-12; built 2026-11-12. A subject holds a list of counters in place of its one points track. The challenge's own counters stay as they are.

| Topic | Decision |
|---|---|
| Shape | A subject has zero or more counters, each the challenge counter's shape: name, value, direction, minimum, maximum, thresholds, display, revealed, per PC. |
| Goal | Removed. The maximum takes its place. |
| Complete | Set and cleared by the GM only, on the subject as a whole. No per-PC Complete. Nothing tells the GM when a counter reaches its maximum. |
| Points name | The name a subject's new counter gets, from the preset or the Add counter button. |
| Tracks points, Individual | Removed. A subject with no counters holds only actions; a per-PC counter on the subject replaces Individual. |
| Thresholds | Live on the subject's counters. A DC change on one applies to that subject's checks only. The GM gets a notice when one is reached, as for a challenge counter. |
| Change each round | Offered, as on a challenge counter: Next round adds it and Previous round takes it back (Justin, 2026-11-12). |
| Revealed | Each counter has its own, on by default. Players see it only while its subject is revealed too. |

| Where | What it shows |
|---|---|
| Sheet | The subject's counters under its header, each as a challenge counter is: eye, name and limits, + and −, per-PC rows, thresholds, and edit and delete buttons. Complete is always in the header. The Counters title's + adds one. |
| Panel | Each revealed counter in the subject's column, under its name, in its display style: bar, steps, track, per-PC rows or a number. |

### 14.14 Participants beyond the party

**Status:** decided with Justin, 2026-11-13; built 2026-11-13. Actors outside the Party actor, such as an NPC ally or a hireling, can take part in a challenge beside the PCs.

| Topic | Decision |
|---|---|
| What one is | An ally beside the PCs: a portrait, an acted mark and a value on each per-PC counter, as a PC has. Not a rival with its own counter. |
| Shape | `participants`: a list of world actor ids on the challenge. Setup, not run state, so Reset keeps it. The challenge's participants are the party's PCs, then these actors. |
| Adding | The GM drags an actor from the Actors sidebar onto the challenge window. Only a world character or NPC can join; a party PC, another actor type or a compendium actor gets a notice instead. It joins that challenge only. |
| Removing | A × beside its chip. Removing it clears its acted mark and keeps its per-PC values, so the sheet still lists them. Any GM can add or remove, running or not. |
| No rounds | The sheet lists the added actors under Allies, each with its ×, since there are no acted marks to show. |
| Missing actor | A deleted actor shows by its id on the sheet, so the GM can remove it. The panel leaves it out. |
| Who rolls | The GM, as for a PC: the selected token or Roll as, which lists the participants. A player who owns it, from the panel. |
| Player's choice | A player who owns more than one participant, or one that isn't their assigned character, clicks a portrait they own to roll as it. The one they roll as has a red ring. The choice is theirs alone and lasts until the page reloads. With no pick they roll as their assigned character, else the first participant they own. With no rounds the panel shows only the portraits they can pick. The panel redraws when ownership or their assigned character changes. |
