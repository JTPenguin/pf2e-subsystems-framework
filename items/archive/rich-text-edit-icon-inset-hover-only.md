---
title: "Move the rich-text edit icon in and show it only on hover"
kind: work
status: done
waits_on: none
priority: ⏫
blocked_by: []
source: "Justin's list, 2026-11-12; triaged 2026-11-12"
added: 2026-11-12
updated: 2026-11-12
outcome: "Edit button now shows on hover only and sits 1rem from the right, clear of the 10px scrollbar; the always-visible rule and the text's extra right padding are gone. Checked in Foundry on long GM notes with a scrollbar."
---
# Move the rich-text edit icon in and show it only on hover

The edit icon on rich-text fields sits too close to the right edge. When a scrollbar appears, the icon overlaps it.

Justin also wants the icon back to showing only while the pointer is over the field. It should not sit on top of the text the rest of the time.

## Request (Justin, 2026-11-12)

- Move the edit icon further in from the right side so it clears the scrollbar when one shows.
- Show the edit icon only when the field is hovered.

## Conflict with a finished item

[[description-field-affordance]] (done 2026-11-12) made the edit button always visible once a field has text. This item reverses that part. Justin confirmed the hover-only rule on 2026-11-12. The empty-field placeholder from that item stays.

## Where

- Applies to every toggled rich-text field: GM notes, subject descriptions and action descriptions (`scripts/challenge/description-field.js`).
- The always-visible rule is the `display: flex` rule for `prose-mirror.ssm-description-field.inactive:not(.ssm-description-empty) > button.toggle` in `styles/subsystems.css` (end of file). Keep only its `:hover` half, so the icon stays centred when it shows.
- The text's right padding (`padding-right` on `.editor-content`, last rule) was added to keep text clear of an always-visible icon. Recheck whether it is still needed once the icon is hover-only.
- That CSS is in the uncommitted changes of 2026-11-12. Commit those first.

## Next step

Move the icon in and show it only on hover. Test it on a long field with a scrollbar, in light and dark themes.
