---
title: "Align the icon inside the rich text editor edit button"
kind: work
status: done
waits_on: none
priority: ⏫
source: "Justin's list of items, 2026-11-12; cause found in triage, 2026-11-12"
outcome: "Cause confirmed: display: block on the toggle button undid Foundry's flex centring (5.75px off in an ApplicationV2 window). Our rule now sets display: flex, at rest and on hover. Measured centred in Foundry, 2026-11-12."
added: 2026-11-12
updated: 2026-11-12
---
# Align the icon inside the rich text editor edit button

The edit button on the toggled description editors shows its icon off-centre. It affects every description field, since they all use `scripts/challenge/description-field.js`.

## Likely cause

Foundry centres a button's icon with `display: flex; justify-content: center; align-items: center` (`foundry2.css`, the base `button` rule). To keep the edit button in view, commit commit f8114f7 added this rule to `styles/subsystems.css`:

`prose-mirror.ssm-description-field.inactive:not(.ssm-description-empty) > button.toggle:enabled { display: block; }`

`display: block` replaces the flex layout, so the icon falls to the top left. Foundry's own hover rule (`prose-mirror:hover button.toggle:enabled { display: block; }`) does the same, so the hover state needs covering too.

## Next step

Set `display: flex` on the button in our rule, and add a hover rule for our fields that does the same. Check in the browser whether the icon then centres, before calling it fixed.

## Check

Open each description editor in Foundry: the challenge sheet, the subject window and the action window. Check the icon sits centred, both at rest and on hover.
