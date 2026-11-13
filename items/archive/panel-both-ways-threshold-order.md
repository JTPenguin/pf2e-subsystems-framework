---
title: "Show a both-ways counter's thresholds highest first on the panel"
kind: work
status: done
waits_on: none
priority: ⏫
blocked_by: []
source: "Found in the Reputation live check, 2026-11-13 (items/archive/reputation-subsystem.md); logged on Justin's request, 2026-11-13; decision by Justin in triage, 2026-11-13"
added: 2026-11-13
updated: 2026-11-13
outcome: "A both-ways list sorts highest first, as a down counter does. Test added. Checked live 2026-11-13 on a Reputation challenge for the GM and Test Player 1: Revered first, Hunted last."
---
# Show a both-ways counter's thresholds highest first on the panel

The panel lists thresholds in the order the track reaches them. A both-ways counter sorts them lowest first, so Reputation's list starts with Hunted (−30) and ends with Revered (+30). Reading down, the best tier is last. The sheet keeps the stored order, which the preset gives highest first.

**Decision (Justin, 2026-11-13):** a both-ways list runs **highest first**, Revered at the top.

## Build notes

- **Where:** `thresholdViews(rows, direction)` in `scripts/challenge/panel-view.js` (around line 74). Today only `"down"` sorts highest first; everything else, both-ways included, sorts lowest first.
- **Change:** sort highest first for both `"down"` and `BOTH_WAYS`. Up counters keep lowest first. Import `BOTH_WAYS` from `data.js` rather than repeating the string.
- **Test:** add a case to `tools/test.mjs` for a both-ways counter's order.
- **Spec:** the panel's threshold card rule in `docs/spec.md` (around line 410 and section 14.8) should say a both-ways list runs highest first.

## Done when

A live Reputation challenge's panel lists Revered first and Hunted last, for the GM and a player login; up and down counters keep their order; `tools/test.mjs` passes.
