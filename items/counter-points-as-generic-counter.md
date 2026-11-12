---
title: "Subjects own counters instead of one points track"
kind: feature
status: ready
waits_on: Claude
priority: 🔼
blocked_by: [remove-roll-card-point-automation]
source: "Justin's list of items, 2026-11-12; interview with Justin, 2026-11-12"
added: 2026-11-12
updated: 2026-11-12
---
# Subjects own counters instead of one points track

A subject holds a list of counters, with the same shape and display choices as the challenge's counters. This replaces the subject's one points track.

## Decided (Justin, 2026-11-12)

| Topic | Decision |
|---|---|
| Shape | A subject has zero or more counters, each the challenge counter's shape: name, value, direction, minimum, maximum, thresholds, display, revealed, per PC. |
| Goal | Removed. The maximum takes its place. |
| Complete | Set and cleared by the GM only, on the subject as a whole. No per-PC Complete. Nothing tells the GM when a counter reaches its maximum. |
| Points name | Becomes the name a new subject's counter gets from the preset. |
| Tracks points | Removed: a subject with no counters holds only actions. |
| Individual | Removed: a per-PC counter on the subject. |
| Subject thresholds | Move onto the subject's counters. |
| Challenge counters | Stay as they are. |

## Consequences

- Removed from the subject: `points`, `pointsBy`, `direction`, `min`, `max`, `goal`, `completeBy`, `tracksPoints`, `individual`, `thresholds`.
- Presets rebuilt: Influence's NPC gets one Influence Points counter; Infiltration's obstacle gets Infiltration Points, maximum 2 (was goal 2); Chase's obstacle gets Chase Points, 0 to 3 (was goal 3). Complications and opportunities get no counter.
- The panel draws each revealed subject counter in the subject's column, in its display style. The sheet lists them under the subject header, with + and −.
- No backward compatibility (spec 14.9).

## Left for the spec draft

- Whether a subject counter offers Change each round. Proposed: no, only challenge counters.
- Whether a subject counter has its own Revealed, or follows its subject. Proposed: its own, defaulting to shown.
- Threshold DC changes on a subject counter apply to that subject's checks, as subject thresholds do today.

**Next step:** write spec section 14.13 for Justin's approval, then build. Folds in subject-points-ratio-display.

**Done when:** spec approved; subjects hold counters on the sheet and panel; each preset builds its subjects; tests pass; checked live as GM and as a player.
