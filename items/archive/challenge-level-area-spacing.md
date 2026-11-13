---
title: "Add spacing and drop borders in the panel's challenge-level area"
kind: work
status: done
waits_on: none
priority: ⏫
blocked_by: []
source: "Justin's list, 2026-11-12; confirmed as the player panel in triage, 2026-11-12"
added: 2026-11-12
updated: 2026-11-12
outcome: "Removed the lines around the panel's challenge counters and set 0.5rem between header, round bar, portraits, challenge counters, challenge modifiers and subject cards. Checked in Foundry on 'Running from the Punks' as GM: 8px gaps, no borders."
---
# Add spacing and drop borders in the panel's challenge-level area

On the player panel, the challenge-level area is cramped. This is the part above the subject columns: header, round bar, portraits, challenge counters and challenge modifiers. The challenge counters also have a gold line above and below them that Justin wants removed. Justin confirmed it is the panel, not the GM sheet (2026-11-12).

## Request (Justin, 2026-11-12)

- Add a little extra vertical space between the elements in the challenge-level area.
- Remove the borders above and below the challenge-level counters.

## Where

- The borders: `.ssm-panel-challenge-counters` in `styles/subsystems.css` (around line 310) sets `border-top` and `border-bottom`.
- The spacing: margins on `.ssm-panel-run`, `.ssm-panel-rounds`, `.ssm-panel-party`, `.ssm-panel-challenge-counters` and `.ssm-panel-challenge-mods`.
- The uncommitted panel header and subject card changes (2026-11-12) touch the same rules. Commit those first, so this change is its own diff.

## Done when

The panel shows even spacing in that area and no lines around the challenge counters, with and without a round maximum, for the GM and a player login, in light and dark themes.
