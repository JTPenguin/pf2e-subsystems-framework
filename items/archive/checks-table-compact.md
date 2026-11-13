---
title: "Compact checks table in the Edit action window"
kind: work
status: done
waits_on: none
priority: 🔼
blocked_by: [remove-always-shown-checks]
source: "Justin's UI list, 2026-11-12; details from Justin, 2026-11-12"
added: 2026-11-12
updated: 2026-11-12
outcome: "Cleared Foundry's header border and background, row stripes and margin for .ssm-checks, tightened the cells, and gave the delete column a fixed width at the right edge. Column widths are set by class. Checked in Foundry 2026-11-12 at 640px: no horizontal scroll."
---
# Compact checks table in the Edit action window

## Request (Justin, 2026-11-12)

- The checks table in the Edit action window takes too much room.
- Its header has a border.
- The delete button is not at the far right.

## Where the code does it now

- `templates/challenge-action.hbs:20-40`: a `table.ssm-checks` with Skill, Lore name, DC, Always shown, Revealed, Decoy and a delete column.
- Foundry's own table rules (`foundry2.css`, `table thead`) give the header a background and a 1px border, add `margin: 1rem 0`, pad cells `0.5rem 1rem`, and stripe even and odd rows.
- `styles/subsystems.css:249-260`: the table has `min-width: 26rem` and `table-layout: fixed`. The column widths are set by position (`th:nth-child`), so removing the Always shown column shifts them.

## Decided

- Do this after [[remove-always-shown-checks]], which drops a column and changes the positions the widths depend on.
- The table sits inside the Checks fieldset once [[subsections-foundry-fieldset-style]] lands; this item doesn't wait for it.

## Next step

1. Clear Foundry's header border and background, row striping and table margin for `.ssm-checks`.
2. Tighten cell padding and row height to match the window's 1.5rem inputs.
3. Give the delete column a fixed narrow width, right-aligned, so the trash icon sits at the far right edge. Set widths by class rather than position.

## How to check

Open an action with three or four checks, one of them Lore. No header border, rows close together, the trash icons lined up at the right edge, and no horizontal scroll at the window's default 640px width.
