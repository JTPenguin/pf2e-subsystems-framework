---
title: "Bug: negative threshold points wrap on the panel"
kind: work
status: done
waits_on: none
priority: ⏫
blocked_by: []
source: "Found in the Reputation live check, 2026-11-13 (items/archive/reputation-subsystem.md); logged on Justin's request, 2026-11-13; look decided by Justin in triage, 2026-11-13"
added: 2026-11-13
updated: 2026-11-13
outcome: "The points are a right-aligned, nowrap column, with + on a both-ways counter's positives and a real minus sign. Checked live 2026-11-13 for the GM and Test Player 1: every point on one line, also with the column squeezed to 134px. The counter value on the panel didn't wrap either."
---
# Bug: negative threshold points wrap on the panel

The panel's threshold list gives each row's points a column too narrow for three characters. On a both-ways counter, "−30" and "−15" break onto one character per line ("−", "3", "0"). Seen on the Reputation preset's tiers, in a column of normal width.

## Cause

`.ssm-panel` in `styles/subsystems.css` (line 120) sets `overflow-wrap: anywhere`, so long names break instead of widening the panel. That also lets any word break between characters, which makes the points' minimum width one character. The points (`<strong class="ssm-panel-threshold-points">` in `ssmPanelThresholds`, `templates/challenge-panel.hbs` line 13) have no rule of their own, so the `.ssm-panel-threshold` flex row (around line 215) shrinks them to that width when the text beside them is long.

## Decision (Justin, 2026-11-13)

Besides stopping the wrap, the points become a **fixed-width, right-aligned column**, so −30 and +30 line up. On a both-ways counter, positive points get a **+ sign** (+30, +15, 0, −15, −30).

## Build notes

- **CSS:** give `.ssm-panel-threshold-points` `flex: none`, `white-space: nowrap`, `overflow-wrap: normal`, `text-align: right`, `font-variant-numeric: tabular-nums`, and a width that fits the widest value in the list (for example `min-width: 2.5em`, or a width set from the longest label).
- **Sign:** `thresholdViews` in `scripts/challenge/panel-view.js` (around line 74) passes `points` as a number. Add a display string there: `+N` for positive points on a both-ways counter, a real minus sign (−) for negatives, plain numbers on up and down counters. Keep the number for sorting.
- **Sweep:** other numbers inside the panel may break the same way under `overflow-wrap: anywhere`, for example the plain "Suspicion: 10" counters. Check them in the same live check and fix any that wrap.

## Done when

On a live Reputation challenge at −30 and at +30, every threshold's points sit on one line, right-aligned, with + on positives; a counter with one-digit thresholds still looks right; checked for the GM and a player login.
