---
title: "Make On and Off clearer: stripe only when On, solid green chip"
kind: feature
status: done
waits_on: none
priority: 🔽
blocked_by: []
source: "Justin's request, 2026-11-10; details from Justin's interview, 2026-11-10"
added: 2026-11-10
updated: 2026-11-10
outcome: "The kind stripe now shows only on On cards (GM window and panel), Off is no longer dimmed, and the GM window On chip is solid green. Built together with gm-window-hidden-faded-revealed-bright; checked live in both themes."
---
# Make On and Off clearer: stripe only when On, solid green chip

The On/Off indicator should be clearer in the GM window and on the panel.

**Decisions (Justin, 2026-11-10):**

- The color stripe appears only when the item is On. A missing stripe means Off.
- Off items are no longer dimmed. Fading now means hidden only (see [[gm-window-hidden-faded-revealed-bright]]).
- The On/Off chip in the GM window is filled solid green when On, not just a green border.

Do this together with [[gm-window-hidden-faded-revealed-bright]]: both change the same card styles in `styles/subsystems.css`.

Builds on [[modifier-toggles]] (archived, done 2026-11-09).

**Done when:** on a live challenge, all four mixes (On or Off, hidden or revealed) read clearly in the GM window, and On and Off read clearly on the panel.
