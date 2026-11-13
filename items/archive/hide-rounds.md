---
title: "Hide rounds for a challenge with no rounds"
kind: feature
status: done
waits_on: none
priority: ⏫
blocked_by: []
source: "Found in the Reputation live check, 2026-11-13 (items/archive/reputation-subsystem.md); logged on Justin's request, 2026-11-13; decisions by Justin in triage, 2026-11-13"
added: 2026-11-13
updated: 2026-11-13
outcome: "Maximum rounds 0 means no rounds: Start leaves the round at 0, Next round does nothing, and the panel and sheet hide the round, its buttons, the party portraits and acted marks. The sheet shows Not started, Running or Finished instead. The Reputation preset sets 0, and its GM note says so. Tests added. Checked live 2026-11-13 for the GM and Test Player 1. Existing Reputation challenges keep a blank maximum until the GM sets it to 0."
---
# Hide rounds for a challenge with no rounds

A campaign-long challenge, such as Reputation, has no rounds. Start still sets Round 1, and the panel shows "Round 1" in its header with the GM's previous and next round buttons beside the party portraits. Players read a round count that means nothing.

## Decisions (Justin, 2026-11-13)

| Question | Answer |
|---|---|
| How a challenge says it has no rounds | **Maximum rounds 0.** Reuse the existing field; no new checkbox. |
| What the panel shows with rounds off | **Nothing of the rounds:** no round label, no round buttons, no party portraits, no acted marks. |
| The Reputation preset | Sets Maximum rounds to 0. |

## Build notes

- **The field:** `rounds.max` in `templates/challenge-sheet.hbs` (line 123) has `min="1"`. Allow 0, and say in its hint or placeholder that 0 means no rounds. Today blank means "no limit" (`RoundOpen`), so blank and 0 must stay different.
- **The preset:** `reputation` in `scripts/challenge/data.js` (around line 207) has no `rounds`, so it gets `null`. Give it `rounds: 0`. `newChallenge` reads it as `preset.rounds ?? null`, so 0 survives.
- **The panel:** `templates/challenge-panel.hbs` lines 43–48 draw the label, the segments, the GM's buttons and `ssmPanelParty`. `scripts/challenge/panel.js` line 125–130 builds `roundLabel`, `roundSegments` and the buttons. Skip all of them when `rounds.max === 0`. `roundSegments` with a max of 0 must not draw an empty bar.
- **The sheet:** the run strip (`challenge-sheet.hbs` lines 87–93, `sheet.js` line 318) shows the round label and buttons too. Hide them the same way, keeping Start, End and Reset. The Current round field stays in place (Justin, 2026-11-13: hiding it made the section jump).
- **Run logic:** `startRun` in `scripts/challenge/run.js` sets `rounds.current` to at least 1. With rounds off, leave it at 0 or ignore it. `canAdvanceRound` and `canUndoRound` should return false, so no path moves a round.
- **Change each round:** a counter's "change each round" does nothing with rounds off. Leave the field, but consider a muted note on the counter. Ask before adding one.
- **Spec:** add the rule to `docs/dev/spec.md` next to the rounds description.

## Done when

On a live Reputation challenge, started, the panel shows no round label, buttons or portraits for the GM or a player login; the sheet shows no round label or buttons; a challenge with a blank maximum still shows "Round N" as before; `tools/test.mjs` passes.
