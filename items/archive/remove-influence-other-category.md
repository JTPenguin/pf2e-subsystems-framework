---
title: 'Remove "Other" as a default Influence category'
kind: work
status: done
waits_on: Claude
priority: ⏫
blocked_by: []
source: "Justin's list of items, 2026-11-12; interview with Justin, 2026-11-12"
added: 2026-11-12
updated: 2026-11-12
outcome: "Influence suggests Resistance and Weakness only; spec 14.6 and 14.7, strings and tests updated."
---
# Remove "Other" as a default Influence category

Influence suggests Resistance, Weakness and Other. Remove Other. Entries that fit neither go in the blank category, which groups first with no heading (spec 14.7).

**Changes:** the Influence preset's `categories` in `data.js` and the palette comment above it, `SSM.Preset.influence.Category.other` in `lang/en.json`, and spec 14.6 and 14.7 (which say Other is one of Influence's suggestions). Resistance and Weakness keep their colours.

**Done when:** a new Influence challenge offers Resistance and Weakness only, a GM can still type "Other" by hand, and tests pass.
