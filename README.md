# PF2e Subsystems Framework

A Foundry VTT module for running Pathfinder 2e subsystems: Influence, Infiltration, Chases, Research, Reputation, or any Victory Points challenge of your own. The GM runs each challenge from a sheet like a PF2e NPC sheet. While it runs, players see a panel over the canvas with what you have revealed, and roll from it.

**Requires:** Foundry VTT 14 and the PF2e system 8.6 or later.

## What it does

- **One sidebar tab for challenges.** A Subsystems tab lists challenges, with folders, search and a filter for the ones running. They stay out of the Journal tab.
- **Presets.** Create a challenge from Victory Points (blank), Influence, Infiltration, Infiltration Preparation, Chase, Reputation or Research. Each fills in the names, counters, thresholds and actions the GM Core rules use, plus GM notes on running it with the module. Everything can be edited afterwards.
- **Hidden until revealed.** Every subject, check, counter, threshold and modifier has an eye. Players see only what you reveal, and DCs stay hidden. You can plant a decoy that looks real to players.
- **A player panel over the canvas.** It shows on every scene until you end or hide the challenge. Players can drag and resize it but can't close it.
- **Rolls are normal PF2e checks.** Players click a check on the panel; you roll or post a chat link from the sheet. The DC includes any active DC changes. Discover-type actions can roll as secret checks.
- **You stay in charge of the numbers.** A roll marks the PC as acted for the round and uses up any one-time DC changes it used. It never changes points: you read the chat card and click + or −.
- **Counters and thresholds.** Any number of counters, on the challenge or a subject, counting up, down or both ways, drawn as a bar, steps, a track or a number. Thresholds tick when reached, give you a notice and can change DCs.
- **Rounds.** A round clock with an optional limit, party portraits that dim once a PC has acted, and per-round counter changes. A campaign-long challenge, such as Reputation, can have no rounds at all.
- **Several at once.** Any number of challenges can run at the same time; one is on the panel.

## Install

In Foundry's setup screen, go to **Add-on Modules → Install Module** and paste this manifest URL:

```
https://github.com/JTPenguin/pf2e-subsystems-framework/releases/latest/download/module.json
```

Then enable **PF2e Subsystems Framework** in your world's module settings.

## Quick start

1. Open the **Subsystems** tab in the sidebar and click **Create Challenge**. Pick a preset, such as Influence.
2. In the challenge window, click **Add NPC** (the button is named for the preset's subjects). Name the NPC, set the DCs of its checks, and add thresholds to its Influence Points counter.
3. Click **Start**. The panel appears for everyone.
4. Reveal what the players have learned with the eye buttons. The panel updates at once.
5. Players click checks on the panel to roll. After each roll, change the points with + and −.
6. Click **Next round** when the round is over. Click **End** when the challenge is over.

The [GM guide](docs/gm-guide.md) covers each part in more detail.

## Writing challenges as JSON

A challenge can be written as a JSON file, by hand or by an AI agent, and imported into Foundry. The format is in [docs/challenge-format.md](docs/challenge-format.md).

## Notes

- **Secrets stay out of the player interface, not out of the browser.** As elsewhere in Foundry, a player who digs in the browser console could read the DCs of revealed checks.
- **PF2e's metagame settings apply.** If your world shows DCs to players (`Show DCs`), challenge DCs show too. Show Secret Checks makes secret rolls visible again.
- **English only.**

## For developers

The design is in [docs/dev/spec.md](docs/dev/spec.md). Work items are in `items/`. Node isn't needed: the tests and checks run through Foundry's own Electron:

```bash
ELECTRON_RUN_AS_NODE=1 ~/foundryvtt/foundryvtt tools/test.mjs
```

```bash
ELECTRON_RUN_AS_NODE=1 ~/foundryvtt/foundryvtt tools/check-load.mjs
```

```bash
ELECTRON_RUN_AS_NODE=1 ~/foundryvtt/foundryvtt tools/build-zip.mjs
```

## License

The code is under the MIT License: see [LICENSE](LICENSE).

**ORC Notice.** This product is licensed under the ORC License held in the Library of Congress at TX 9-307-067 and available online at various locations including [paizo.com/orclicense](https://paizo.com/orclicense), [azoralaboratories.com/orclicense](https://www.azoralaboratories.com/orclicense) and others. All warranties are disclaimed as set forth therein.

**Attribution.** The presets' rules text is based on *Pathfinder GM Core* © 2023 Paizo Inc., Designed by Logan Bonner and Mark Seifter. Authors: Amirali Attar Olyaee, Logan Bonner, Creighton Broadhurst, Jason Bulmahn, James Case, Jesse Decker, Eleanor Ferron, Fabby Garza Marroquín, Jaym Gates, Matthew Goetz, James Jacobs, Brian R. James, Jenny Jarzabski, Dustin Knight, Jason LeMaitre, Lyz Liddell, Luis Loza, Ron Lundeen, Stephen Radney-MacFarland, David N. Ross, Michael Sayre, Mark Seifter, Owen K.C. Stephens, Amber Stewart, Clark Valentine, Landon Winkler, and Linda Zayas-Palmer.

**Reserved Material.** None. **Expressly Designated Licensed Material:** the presets' rules text, in `lang/en.json`.

This module is not published, endorsed or approved by Paizo. Pathfinder is a trademark of Paizo Inc.
