---
title: "Give subsections one shared style and a + button"
kind: feature
status: in-progress
waits_on: Justin
priority: 🔼
blocked_by: []
source: "Justin's tweaks to the restyled edit view, 2026-11-12; interview with Justin, 2026-11-12"
added: 2026-11-12
updated: 2026-11-12
---
# Give subsections one shared style and a + button

Sections in the Edit tab have a red bar with a + on the right (the `ssmSectionHead` partial in `templates/challenge-sheet.hbs`). Subsections need the same kind of + button, and one shared look.

## Decided (Justin, 2026-11-12)

- **One subsection style everywhere**, in both views: Run view's section title (`.ssm-section-title`: small uppercase text with a thin underline).
- **An optional colour stripe** on the left. Modifier category headings use it with their category colour (`--ssm-cat`). Other subsections have no stripe.
- **An optional + button** on the right of the title, like the section's: same `addRow` action, `data-list` and label.
- **An optional empty message**, shown when the subsection has no rows.

## Today

| Where | Markup | Look |
|---|---|---|
| Run view: Actions, Modifiers | `h4.ssm-section-title` | Uppercase, underline |
| Edit tab: modifier categories | `h5.ssm-cat-head` in `ssmEditModGroups` | Bold, coloured left stripe |
| Run view: modifier categories | `h5.ssm-cat-head` in `ssmRunModGroups` | Bold, coloured left stripe |

## Plan

1. Add an `ssmSubsectionHead` partial: `label`, optional `list` and `add` for the +, optional `stripe`.
2. Move both modifier category headings onto it, keeping their stripe.
3. Style it from `.ssm-section-title`, with the stripe as a left border when `--ssm-cat` is set.

The users of the + are [[counter-thresholds-subsection]], [[modifier-subsection-add-buttons]] and [[challenge-section]] (no + there).

**Done when:** the modifier category headings in both views use the new partial and look like Run view's section titles with their colour stripe, and a test subsection's + adds a row. Check it in the browser in Foundry.

**Next step:** built and committed 2026-11-12; tests and an offline template render pass. Still needs the live check in Foundry: the GM slot was taken, so Claude couldn't open the sheet.
