---
title: "Rewrite the Chase GM notes as module guidance"
kind: work
status: done
waits_on: none
blocked_by: []
source: "Chase audit (items/archive/chase-subsystem.md), 2026-11-13; approach set by Justin the same day"
added: 2026-11-13
updated: 2026-11-13
outcome: "Done 2026-11-13. The Chase preset's GM notes are four paragraphs on using the module: obstacles, tracks, each round, variants. GM Core's rules are left out. Spec 14.6 and 14.11 updated; tests pass; a new Chase challenge in Foundry shows the notes. The Infiltration and Infiltration Preparation notes were rewritten the same way."
---
# Rewrite the Chase GM notes as module guidance

The chase audit found that the preset's GM notes mixed GM Core's rules with module tips, and missed some of both.

**Justin's decision (2026-11-13):** GM notes are guidance on using the module for that subsystem in a general way: add obstacles, give each an Overcome action with its approaches, set up the tracks for the party and the other side. They don't cover the official rules; the GM reads those on their own. Spec 14.6 records this for every preset.

**Also decided:** the tracks' maximum stays at the number of obstacles. A side that gets past the last obstacle can't go past the top of its track, so the GM marks the last obstacle Complete.

**The new notes** (`SSM.Preset.chase.GmNotes` in `lang/en.json`):

| Paragraph | Says |
|---|---|
| Obstacles | Add one per stage, in order; set Chase Points' maximum; one check row per approach on Overcome; first revealed, the rest hidden, and revealing the next hides the last |
| Tracks | Party and Quarry hold obstacle numbers; set maximums and starting values; rename Quarry; change the pace; hide Quarry and set Maximum Rounds for a race against time |
| Running | Rolls change nothing, so use + and −; on clearing an obstacle add 1 to Party and reveal the next; Next round moves Quarry; mark the last obstacle Complete when a side gets past it |
| Variants | Split paths: a category per path, with Allow multiple subjects on while the party chooses. A split party: Party set to Per PC |

**Infiltration and Infiltration Preparation (Justin, 2026-11-13).** Rewritten to the same rule.

| Preset | Paragraphs |
|---|---|
| Infiltration | Obstacles, Awareness Points, Edge Points, then the two that were already guidance: Complication and Opportunity |
| Infiltration Preparation | Intro (run it first; activities are actions), Points (add Edge and Awareness by hand), Notes (duds and cursed points go in the PC's note), Handover (type the totals into the infiltration) |

Preparation's per-activity outcomes and the Dud and Cursed rules text were removed from the language file. The activities' descriptions still hold short rules text (requirements and DC bands); players see those on the panel, so they're not GM notes.
