---
title: "Clearer hidden and revealed styling on the GM window"
kind: feature
status: done
waits_on: none
priority: 🔽
blocked_by: []
source: "Justin's request, 2026-11-09; universal skills settled in the items interview, 2026-11-09"
added: 2026-11-09
updated: 2026-11-09
outcome: "Done 2026-11-09. Thresholds, modifiers and counters are cards: hidden plain, revealed solid fill, points-only half fill. Hidden text is italic, not dimmed. Skills: revealed and universal filled, hidden dashed. Checked live as GM in the dark theme."
---
# Clearer hidden and revealed styling on the GM window

Hidden and revealed items look too alike on the GM window.

- **Skills:** a revealed skill gets a solid background, like an inline roll. Universal skills, which players always see, look the same as revealed ones (decided 2026-11-09).
- **Thresholds, modifiers and counters:** each is a card. A revealed card gains a solid background; a hidden card stays plain. A points-only threshold ([[progress-bar-and-thresholds]]) needs a look between the two.

**Next step:** change the styles in `styles/subsystems.css` and the sheet template, and check both states with a live challenge.
