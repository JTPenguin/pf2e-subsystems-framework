---
title: "Replace Adjustments and Penalties with one Other category"
kind: feature
status: done
waits_on: none
priority: ⏫
blocked_by: []
source: "Justin's request, 2026-11-10; details from Justin's interview, 2026-11-10"
added: 2026-11-10
updated: 2026-11-10
outcome: "Penalty and adjustment are now one Other kind, migrated on load; Other cards show no label and get their own GM window section. Checked live."
---
# Replace Adjustments and Penalties with one Other category

Adjustments and Penalties are not a native part of the subsystem. Remove both and use one category, Other.

**Finding (2026-11-10):** the kind changes only the label and the color class. No rule reads it. So the change is a rename plus a migration.

**Decisions (Justin, 2026-11-10):**

- Kinds become `resistance`, `weakness` and `other` (`MODIFIER_KINDS` in `data.js`).
- Other cards show no kind label, on the panel or in the GM window.
- In the GM window, Other gets its own section after Resistances and Weaknesses. The section heading names it (see [[split-weaknesses-resistances-sections]]).

**Work:**

- Migrate `penalty` and `adjustment` to `other` in `migrateData`, for modifiers and for any saved baseline.
- Update the kind dropdown in the modifier window, the strings and the CSS kind colors.
- Update `docs/spec.md`.

**Done when:** an old challenge with a penalty and an adjustment loads with both as Other, and Other cards show no label on the panel.
