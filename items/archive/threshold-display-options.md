---
title: "Control how thresholds show, separately from the thresholds section"
kind: feature
status: done
waits_on: none
outcome: "Built 2026-11-12: two checkboxes per counter, Show thresholds list on panel and Show thresholds on counter display (Justin asked for the second the same day), and threshold ticks on Bar displays. Checked by tests and live in Foundry as GM and as Test Player 1."
priority: 🔼
blocked_by: []
source: "Justin's list, 2026-11-12; design picked by Justin in triage, 2026-11-12"
added: 2026-11-12
updated: 2026-11-12
---
# Control how thresholds show, separately from the thresholds section

Justin wants thresholds to mark the counter's display on the panel even when the Thresholds list under the counter is not shown.

## How it works today

- Each threshold's eye sets what players see: **Nothing**, **Points only** or **Points and text** (`THRESHOLD_REVEALS` in `scripts/challenge/data.js`).
- A threshold set to anything but Nothing shows in two places on the panel: a mark on a Steps or Track display (`counterSlots` in `scripts/challenge/panel-view.js`), and a row in the Thresholds list under the counter (`ssmPanelThresholds` in `templates/challenge-panel.hbs`).
- A Bar display shows no threshold marks.
- So there is no way to get the marks without the list.

## Decisions (Justin, 2026-11-12)

| Question | Answer |
|---|---|
| How to split marks from the list | A per-counter setting, **Show thresholds list on panel**, on by default. Off: revealed thresholds still mark the display, but the list is gone. The per-threshold eye is unchanged. |
| Marks on the display | A second per-counter checkbox, **Show thresholds on counter display**, on by default. Off: no marks on the bar, steps or track, whatever the list does (Justin, later on 2026-11-12). |
| Bars | Yes: revealed thresholds draw a tick on Bar displays too, so the setting means the same on every display. Both-ways bars included. |
| GM-only (Nothing) thresholds | Stay hidden everywhere for players, as today. |

## Build notes

- Add the field to `newCounter()` and `COUNTER_FIELDS`, and the checkbox to `templates/challenge-counter.hbs` (hidden for per-PC counters, which have no thresholds).
- The copy sent to players should leave the list's text out when the list is off, not only hide it in the template.
- Tick position on a bar uses the same scale as the fill (`trackScale`, `bothWaysRange`).
- Update spec 14.12.

## Done when

On the panel, as GM and as a player login: a counter with the list off shows marks on Steps, Track and Bar displays and no list; with the list on it looks as before. Checked in light and dark themes.
