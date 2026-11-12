---
title: "Add Thresholds and Checks subsections with + buttons"
kind: feature
status: in-progress
waits_on: Justin
priority: 🔼
blocked_by: [subsection-add-button]
source: "Justin's tweaks to the restyled edit view, 2026-11-12; interview with Justin, 2026-11-12"
added: 2026-11-12
updated: 2026-11-12
---
# Add Thresholds and Checks subsections with + buttons

Two lists in the Edit tab have an "Add" button under the rows. Each becomes a subsection with a + in its title, using [[subsection-add-button]].

## Decided (Justin, 2026-11-12)

| List | Where | Change |
|---|---|---|
| **Thresholds** | Each counter's card (`ssmCounterEdit`), on the Challenge tab and on subject tabs | A Thresholds subsection. Its + adds a threshold. With none, it shows "This counter has no thresholds." |
| **Checks** | Each action's card on a subject tab | A Checks subsection over the checks table. Its + adds a check. |

- **Per-PC counters show no Thresholds subsection**, as they have no thresholds today.
- The old "Add threshold" and "Add check" buttons go.

**Done when:** both subsections show, each + adds a row, the empty message shows on a counter with no thresholds, per-PC counters show no subsection, and it's checked in Foundry.

**Next step:** built and committed 2026-11-12; tests and an offline template render pass. Still needs the live check in Foundry: the GM slot was taken, so Claude couldn't open the sheet.
