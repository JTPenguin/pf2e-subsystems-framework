---
title: "Add the Reputation preset"
kind: feature
status: done
waits_on: none
outcome: "Done 2026-11-13. Built as the Reputation preset, data only. Checked by tests and live in Foundry as Gamemaster and Test Player 1. Four framework gaps flagged below, not fixed."
priority: ⏬
blocked_by: []
source: "Built on Justin's request, 2026-11-13. Mapping the subsystems onto the generic framework, with Justin, 2026-11-11; Blood Lords uses it throughout; mapping refreshed for subject counters, 2026-11-12"
added: 2026-11-11
updated: 2026-11-13
---
# Add the Reputation preset

Reputation as a preset of the generic challenge from [[generic-subsystem-shared-mechanics]]. Rules: GM Core, Reputation (page 200). Blood Lords tracks the party's reputation with Geb's Great Factions across the whole campaign.

| Part | Rules | Built from |
|---|---|---|
| **Factions** | One reputation per group: a guild, church, village | Subjects with no actions, each with one both-ways counter (spec 14.13) |
| **Points** | −50 to +50, starting at 0 (Ignored) | The counter's minimum and maximum |
| **Favors and disservices** | Minor ±1, moderate ±2, major ±5, given by the GM | Hand changes on the sheet |
| **Tiers** | Revered 30, Admired 15, Liked 5, Ignored −4 to 4, Disliked −5, Hated −15, Hunted −30 | The counter's thresholds, both ways |
| **Which favors count** | Higher tiers only count bigger favors | Each tier's GM text |
| **Rounds** | None: campaign-long | A blank round maximum |

**Done when:** a GM can track several factions' reputation across sessions and show the party where they stand. Check it in Foundry with a test challenge and a player login.

## Results

Built 2026-11-13 as the Reputation preset in `scripts/challenge/data.js` and `lang/en.json`, with a test in `tools/test.mjs` and a row in spec 14.6. Rules checked against GM Core on Archives of Nethys (Reputation, ID 3072 to 3083).

**Justin's choices (2026-11-13).**

| Question | Choice |
|---|---|
| What players see of each tier | Full text from the start |
| Tier list on the panel | List and bar ticks, as other presets |
| New factions | All start revealed |
| Names | Faction, Reputation Points |

**How the rules fit.**

| Rule | Result | How |
|---|---|---|
| One reputation per group | **Covered** | A faction subject with one Reputation Points counter |
| −50 to +50, start at 0 | **Covered** | Both-ways counter, minimum −50, maximum 50; the GM sets another start by hand |
| Favors and disservices | **GM's call** | + and − on the sheet or the panel |
| Tiers | **Covered** | Six thresholds; Reached follows the value. Ignored has no threshold: nothing ticked means Ignored |
| Which favors count per tier | **Covered** | Each tier's GM text. The player text is the tier's name alone (Justin, 2026-11-13) |
| Campaign-long | **Covered** | No rounds; the challenge stays running |

**Live check, 2026-11-13**, in the "test" world. As Gamemaster: created "SSM Reputation check" from the create dialog, added a second faction with Add Faction, started it, and used + and − to reach Admired (+16) and Disliked (−7). Tiers ticked and unticked as expected, and the GM got a notice on each tier. As Test Player 1: the panel showed both factions, bars, values and full tier text (then the name and what it means; since cut to the name alone), with no buttons; the player copy held no GM text. The test challenge was deleted, the panel cleared and both users logged out.

**Framework gaps (flagged, not fixed).**

| Gap | What happens |
|---|---|
| Threshold notice doesn't name the subject | Every faction's counter is called Reputation Points, so "Reputation Points reached −5" doesn't say which faction. The notice gives the tier's points but not its name |
| Panel points column too narrow | "−30" and "−15" wrap to one character per line in the tier list |
| Both-ways tier order | The panel lists tiers from lowest to highest, so Hunted is first and Revered last |
| No way to hide rounds | A campaign-long challenge still shows "Round 1" and the round buttons on the panel |

Also seen on the sheet: a long tier text pushes its Reached tag onto its own line (Admired).
