---
title: "GM challenge window: move the On/Off chip beside the eye button, as an icon button"
kind: feature
status: done
waits_on: none
priority: 🔼
blocked_by: []
source: "Justin's request, 2026-11-10"
added: 2026-11-10
updated: 2026-11-10
outcome: "The On/Off chip is now a check icon button beside the eye, solid green when On, eye-like when Off, rotate-back when Spent. Edit stays on the right. Checked live in both themes 2026-11-10."
---
# GM challenge window: move the On/Off chip beside the eye button, as an icon button

In the GM challenge window's modifier rows (`templates/influence-sheet.hbs`, the `ssm-state` button), the On/Off chip moves next to the eye button and becomes an icon button, styled like the eye button.

**Decided (Justin, 2026-11-10):**

- The On/Off control is an icon button placed next to the eye button.
- Its icon is a checkmark, or a similar icon that fits On/Off.
- When On, the button shows a green state. When Off, it has the normal look of the eye button.
- The Edit button stays on the right.

Builds on [[on-off-indicator-stripe-only-when-on]], which made On solid green in the GM window.

**Done when:** in the GM challenge window, the On/Off icon sits beside the eye, turns green when On, and Edit stays on the right. Check in both themes.
