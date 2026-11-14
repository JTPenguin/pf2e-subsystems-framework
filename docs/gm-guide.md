# GM guide

How to build and run a challenge with PF2e Subsystems Framework. The [README](../README.md) has the install steps and a quick start.

## How a challenge is built

Every challenge uses one framework, GM Core's [Victory Points](https://2e.aonprd.com/Rules.aspx?ID=3028). A preset only fills in a starting point.

| Part | What it is | Influence example |
|---|---|---|
| **Challenge** | The whole scene: its rounds, GM notes, own counters and own modifiers. | The Governor's Banquet |
| **Subject** | One thing the party works on. It gets its own column on the panel. | An NPC |
| **Counter** | A number with an optional minimum, maximum and thresholds. On the challenge or on a subject. | Influence Points, Suspicion |
| **Threshold** | A point on a counter where something happens. | 4: she offers an introduction |
| **Action** | Something the PCs do to a subject, with one or more checks. | Discover, Influence |
| **Check** | One skill, Perception, save or Lore, with a DC. | Diplomacy DC 20 |
| **Modifier** | Something that changes DCs or notes a consequence. Grouped by a category you name. | A weakness: flattery, −2 to Diplomacy DCs |

## Creating a challenge

1. Open the **Subsystems** tab and click **Create Challenge**.
2. Pick a preset. Each preset puts GM notes in the challenge on how to run that subsystem with the module. Read them first.

| Preset | Subjects | Starts with |
|---|---|---|
| **Victory Points** | Subject | A blank challenge. Each new subject has a Victory Points counter and a Check action. |
| **Influence** | NPC | Each new NPC has Influence Points, a secret Discover action (Perception) and an Influence action (Deception, Diplomacy, Intimidation). Suggested modifier categories: Resistance, Weakness. |
| **Infiltration** | Obstacle | Awareness Points (+1 each round, with GM Core's tiers) and Edge Points (one per PC). Each new obstacle has Infiltration Points and an Overcome action. |
| **Infiltration Preparation** | Preparation | GM Core's six preparation activities, Edge Points per PC and hidden Awareness Points. Run it before the infiltration, then type the totals in. |
| **Chase** | Obstacle | Party and Quarry tracks (+1 each round for Quarry). Only one obstacle shows at a time. |
| **Reputation** | Faction | No rounds. Each faction has a −50 to +50 counter with GM Core's tiers. Leave it running for the whole campaign. |
| **Research** | Library Area | Research Points and a Days counter. Each area has an RP Gathered counter and a Research action. |

Challenges have folders, can be duplicated, and can be exported and imported from the right-click menu, like any Foundry document.

## The challenge window

The window is laid out like a PF2e NPC sheet. From top to bottom:

| Part | What it holds |
|---|---|
| **Run strip** | The round, Previous and Next round, Start, End and Reset, Hide or Show panel. Below that, the party (with any allies you added) and the **Roll as** choice. |
| **Challenge** | The points name, subject label, Allow multiple subjects, rounds and GM notes. |
| **Counters** | The challenge's own counters. |
| **Modifiers** | The challenge's own modifiers. Their DC changes and roll bonuses apply to every matching check on every subject. |
| **Subjects** | Each subject as a card, grouped by category, then the Add button. |

**Editing.** Each entry has an edit button that opens its own window, and a delete button. A **+** in a section's title adds an entry there and opens its window. To add a threshold, open the counter and click **Add threshold** under its thresholds. Changes save as you make them. There is no Save button. Drag an entry by its header to reorder it within its group.

**Opening and closing.** Click a header or its caret to open or close a card or row. Collapsed subjects and counters stay collapsed for you across reloads.

### Fields worth knowing

| Field | Where | What it does |
|---|---|---|
| **Maximum Rounds** | Challenge | Blank: no limit. 0: no rounds at all, for a campaign-long challenge. |
| **Allow multiple subjects** | Challenge | Off: revealing a subject hides all the others, so players see one at a time, such as a chase's obstacles. |
| **Direction** | Counter | Counts up, counts down, or both ways (a track around 0, such as Reputation). |
| **Change each round** | Counter | Added on Next round, taken back on Previous round. |
| **Per PC** | Counter | One value per party PC, each with a GM-only note, such as Edge Points. No thresholds. |
| **Display** | Counter | How players see it: Auto, Number, Bar, Steps or Track. |
| **Thresholds list / Threshold marks** | Counter | Turn off the list under the counter, or the marks on its bar, separately. |
| **DC change** | Threshold | Applies while the threshold is reached: to the subject's checks, or to every check for a challenge counter. |
| **Secret** | Action | Rolls its checks as secret checks, like Recall Knowledge. |
| **Duration** | Modifier | One-time, Multi-use or Ongoing (see below). |
| **Decoy** | Check, modifier | Marks false information. Players can't tell it apart; you see an orange Decoy tag. |

### Descriptions and secret text

Subjects, actions, thresholds and modifiers have a rich-text description that players see on the panel. To keep part of it for yourself, put it in a **secret block** (Secret, in the editor's block format list). Players never see secret blocks. Inline checks and links in a description work on the panel as they do on an item.

## Running a challenge

1. **Start.** The challenge starts running and goes on the panel for everyone. Start also saves the state that Reset goes back to.
2. **Reveal.** Click an eye to show or hide an entry. A threshold's eye steps through hidden, points only ("6 ???") and points with its name.
3. **Rolls.** Players click a check on the panel. You can click the same checks, or use the chip on the sheet to roll for the **Roll as** PC, or its chat icon to post a link. On the panel, your roll is for the selected token, or for the Roll as PC with no token selected.
4. **Apply results by hand.** Read the degree of success on the chat card. Use + and − on the counter. Mark a subject **Complete** when it's done.
5. **Next round.** Clears the acted marks and applies each counter's change each round. Previous round undoes the last advance.
6. **End.** Closes the panel and keeps the final state on the sheet. **Reset** puts everything back to how it was at Start.

**Allies.** To add an NPC ally or hireling, drag its actor from the Actors sidebar onto the challenge window. It joins this challenge only, beside the party's PCs: it gets a portrait, an acted mark and a value on each per-PC counter. Its chip has a **×** to remove it. Only characters and NPCs from the sidebar can join; import a compendium actor first. You roll for an ally as for a PC, and so can any player who owns it.

**Acted marks.** A roll marks the PC as acted, and their portrait dims on the panel. This is advisory: nothing stops a second roll. Click a portrait or party chip to change the mark by hand. A reroll doesn't mark the PC again.

**Thresholds.** A threshold is marked Reached when its counter gets there, and you get a notice. Lowering the counter doesn't clear it: click its Reached tag. On a both-ways counter, Reached follows the value.

### Modifiers

A modifier is **On** or **Off**. Its colour stripe shows only while it's On.

| Duration | What happens when a roll uses it |
|---|---|
| **One-time** | It is spent. The next check gets the normal DC and no bonus. Click restore if the roll shouldn't have used it. |
| **Multi-use** | It turns Off. Turn it On again the next time a PC exploits it. |
| **Ongoing** | Nothing. It stays On until you turn it Off. |

A modifier can change the DC, give a **roll bonus**, or both. A roll bonus is a PF2e modifier with a type (circumstance, status, item or untyped), so PF2e's stacking rules apply and players see it in the roll's breakdown. Below 0 it is a penalty. Both changes apply to all skills or to the skills you pick, from one list.

On the panel, players see "−2 to DCs vs Diplomacy" or "+1 circumstance to Diplomacy checks", never a DC. A change on hidden skills only is left out. A hidden modifier's bonus shows in the roll breakdown as "Challenge modifier", without its name. A modifier's **Note** is for you; players see its description.

A chat link from the sheet can't carry a roll bonus: it rolls against the changed DC but without the bonus, and it spends only modifiers that changed its DC.

### Several challenges

Any number of challenges can run at once, such as a Reputation challenge for the whole campaign beside tonight's Influence scene. One is on the panel. Start or **Show on panel** (right-click it in the Subsystems tab) puts a challenge on the panel; the one it replaces keeps running. The **Running** button in the tab's search bar lists only running challenges.

## The panel

| Who | Can |
|---|---|
| **Everyone** | Drag it by its header, resize it from the bottom-right corner, and reset its position and size. Each user's spot is their own. |
| **Players** | Click revealed checks to roll for their assigned character. A player who also owns an ally clicks a portrait to choose who rolls; the chosen one has a red ring. Open descriptions. |
| **GM** | Everything players can, plus: click the challenge name to open its window, turn modifiers On or Off, use + and − on counters, mark portraits acted, and move the round. |

A world setting, **Panel position**, picks where the panel starts: top centre, top left or top right.

## Good to know

- **Players need an assigned character**, or an ally they own, to roll from the panel.
- **The party** is the player characters in PF2e's Party actor; familiars, eidolons and minions are left out. Anyone else, such as an NPC ally, takes part only if you drag them onto the challenge window.
- **A PC without a listed Lore** rolls it untrained from the panel or sheet. A chat link can't do this.
- **With more than one GM**, only the active GM's client writes changes and handles rolls.
- **Configure Sheet** can change the window's theme. The window defaults to PF2e's light parchment.
