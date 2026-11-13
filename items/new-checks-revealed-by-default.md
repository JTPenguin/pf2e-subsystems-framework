---
title: "New checks and challenge counters start as revealed"
kind: feature
status: ready
waits_on: Claude
priority: ⏫
blocked_by: []
added: 2026-11-12
updated: 2026-11-12
source: "Justin's UI list, 2026-11-12; counters added in triage interview, 2026-11-12"
---
# New checks and challenge counters start as revealed

When a GM adds a check to an action, it should start as revealed. Today a new check starts hidden. The same goes for a new challenge-level counter.

## Request (Justin, 2026-11-12)

- A check added to an action defaults to revealed.
- Checks already on existing actions keep their current state.

## Decisions (Justin, 2026-11-12)

- **Challenge counters too.** A new challenge-level counter starts revealed.
- **Modifiers and subjects stay hidden** when new.

## What the code does now

In `scripts/challenge/data.js`:

- `newCheck()` sets `revealed: false`. Presets already use `revealedCheck()`, which sets it to true.
- `newCounter()` sets `revealed: false`. Subject counters use `newSubjectCounter()`, which already sets it to true.

## Plan

- Set `revealed: true` in `newCheck()` and `newCounter()`. `revealedCheck()` then adds nothing and can go.
- Saved checks and counters keep their stored value: the defaults apply only to new rows.
- Update the tests in `tools/test.mjs` that expect a new check or counter to start hidden, and the spec lines that say so.

## How to check

Add a new check to an action, and a new challenge counter. Both start revealed. Open an older action and confirm its checks keep their saved state. Run the tests.
