---
title: "Add + buttons to modifier subsections"
kind: feature
status: done
waits_on: none
priority: 🔼
blocked_by: [subsection-add-button]
source: "Justin's tweaks to the restyled edit view, 2026-11-12; interview with Justin, 2026-11-12"
added: 2026-11-12
updated: 2026-11-12
outcome: "Built in 7dd648b and checked in Foundry on 2026-11-12."
---
# Add + buttons to modifier subsections

In the Edit tab's Modifiers section, each category subsection gets a + button. It adds a modifier with that category already filled in, and opens its window, as the section's + does now.

## Decided (Justin, 2026-11-12)

- **Only categories in use get a subsection**, as now. The preset's suggested categories don't show empty.
- The section's own + stays. It adds a modifier with a blank category; the GM picks a new category in the modifier window.
- Applies to the challenge's modifiers and to each subject's.

## Plan

- `addRow` in `scripts/challenge/data.js` takes an optional starting value: the new modifier's `category`.
- The subsection's + sends the category label (for example `data-category`), and `#onAddRow` in `sheet.js` passes it on.

**Done when:** a subsection's + adds a modifier in that category and opens its window, a test covers the category, and it's checked in Foundry.

