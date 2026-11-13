---
title: "Panel: hide modifier categories with none revealed"
kind: work
status: done
waits_on: none
blocked_by: []
source: Justin's request, 2026-11-12
added: 2026-11-12
updated: 2026-11-12
outcome: "The panel shows a modifier category, blank or labelled, only when one of its entries is revealed; the preset's suggestions no longer show empty, and \"None revealed\" is gone. Checked by test and live in Foundry, 2026-11-12."
priority: 🔽
---
# Panel: hide modifier categories with none revealed

## Request (Justin, 2026-11-12)

- On the player panel, don't show a modifier category when none of its modifiers is revealed.

## Where the code does it now

- `scripts/challenge/panel-view.js:89` (`cardGroups`) keeps every category a subject's modifiers use, via `keep: subject.modifiers.map((row) => row.category)`. So a labelled category with nothing revealed still gets a group.
- `templates/challenge-panel.hbs:63` renders each group "empty or not", which is the same choice.
- The blank category already follows the rule: spec 14.7 (`docs/spec.md`) and the comment at `panel-view.js:85` show it only when one of its entries is revealed.

## Next step

- Drop the `keep` option for the panel's modifier groups, so a category shows only when at least one of its entries is revealed. Then update the template comment at `challenge-panel.hbs:63` to match.
- Check the spec wording at 14.7 and update it if it says otherwise.

**Done when:** on the panel, a category with no revealed modifiers does not show its heading or stripe. A category with a revealed modifier still shows, and the blank category still follows its own rule.
