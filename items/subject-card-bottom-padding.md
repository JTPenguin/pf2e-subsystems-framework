---
title: "Subject cards: remove the empty area below the header"
kind: work
status: ready
waits_on: Claude
priority: 🔽
blocked_by: []
source: Justin's request, 2026-11-12
added: 2026-11-12
updated: 2026-11-12
---
# Subject cards: remove the empty area below the header

## Request (Justin, 2026-11-12)

- Subject cards still have a small empty area below them, inside the border.
- The card should be just its header, with the border around the header.

## Where the code does it now

- `styles/subsystems.css:375` sets the Run view subject card (`.ssm-subject.ssm-subject-card`) with `padding: 0 var(--space-4) var(--space-4)`. That bottom padding is the empty area, and the border wraps it.
- `styles/subsystems.css:333` already sets `padding-bottom: 0` for a collapsed subject. So collapsed cards may not show the gap. Check this before changing it.
- `templates/challenge-sheet.hbs:152` is the card markup. Its sections (`ssm-subject-counters`, actions, modifiers) sit below the header, and the bottom padding also gives space after the last one.

## Next step

- Set the card's bottom padding to 0, so the border sits right under the header.
- Check the card with its sections open and with it collapsed. If an open card's content needs space at the bottom, give that space to the last section, not the card.

**Done when:** a collapsed subject card shows only its header inside the border, with no empty strip below it. An open card still shows all its sections with normal spacing.
