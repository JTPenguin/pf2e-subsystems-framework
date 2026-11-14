---
title: Add a sidebar to the challenge sheet for challenge-level fields and info
kind: feature
status: done
waits_on: none
outcome: "Built 2026-11-13: sidebar with status, run buttons, round line, party and Roll as, Allow multiple subjects; GM notes box at the top of the body. Checked live in Foundry at 760px and narrower. Spec, GM guide and changelog updated."
priority: ⏫
blocked_by: []
source: "Justin's request, 2026-11-13: add a sidebar to the challenge sheet to house the challenge-level fields and info. Details from Justin's interview answers, 2026-11-13."
added: 2026-11-13
updated: 2026-11-13
---
# Add a sidebar to the challenge sheet for challenge-level fields and info

The challenge sheet keeps its run strip and challenge-level fields across the top of the body. Justin wants them in a sidebar, as on the PF2e NPC sheet, so the main body holds the GM notes, counters, modifiers and subjects.

## How PF2e does it

| Sheet | Layout |
|---|---|
| NPC (`templates/actors/npc/sheet.hbs`) | `<section class="sidebar">` on the left, from top to bottom of the window, beside the name and body. CSS: `flex: 10rem 0 0`, `overflow: hidden auto`, `scrollbar-gutter: stable`. Each `.subsection` has a header with a thin bottom border, and fields sit label left, small input right (AC, HP `current / max`). |
| Hazard (`templates/actors/hazard/partials/sidebar.hbs`) | Header across the top, sidebar below it on the left, with a right border and shadow. |

Justin picked the NPC model.

## Layout

| Choice | Decision |
|---|---|
| Placement | Left, full height, like the NPC sheet. The name moves to the top of the body, right of the sidebar. |
| Width | Fixed 10rem, the NPC sheet's width. |
| Scrolling | The sidebar scrolls on its own; the body scrolls on its own. |
| Narrow windows | Always a sidebar. The body just gets narrower. No stacking, no collapse button. |
| Window size | Stays 760 × 800 by default. |
| Field style | NPC style: one item per line, label left, small input right. Each section has a small header with a thin rule under it. |

## Sidebar, top to bottom

1. **Status.** Not started, Running or Finished, always shown, apart from the rounds (Justin, 2026-11-13).
2. **Run.** Start, End, Reset, and Hide or Show panel, as today.
3. **Round.** One line, shown like HP on an NPC sheet: `◀ Round [current] / [max] ▶`. It replaces both the round clock and the Current round and Maximum rounds fields.
   - While the challenge runs, current is locked: plain text, changed only by ◀ ▶. Max stays editable.
   - With max 0 (no rounds), it shows `Round 0 / 0` with ◀ ▶ disabled. Max stays editable, so the GM can give the challenge rounds again.
   - Blank max still means no limit.
4. **Party.** One PC per line, with its acted mark, and a remove button on actors the GM added. Then the **Roll as** dropdown under the list. With max 0, only the added actors show, as today.
5. **Allow multiple subjects** checkbox.

## Body, top to bottom

1. Name.
2. GM notes, in its own box at the top.
3. Counters, Modifiers and Subjects, as today.

The Challenge box goes away: its fields are now in the sidebar or the GM notes box.

## Notes for implementation

- **The "not the active GM" notice.** It sits at the top of the body today. It can stay there.
- **Spec 6 and 14.2 change.** They say the state shows in the round's place when there are no rounds. Now the status always shows at the top of the sidebar, and the round always shows its numbers.

## Files

- `templates/challenge-sheet.hbs`: wrap the strip and fields in a sidebar column; move GM notes to its own box.
- `styles/subsystems.css`: `.ssm-layout` becomes a row of sidebar and body; the sidebar's own scroll.
- `scripts/challenge/sheet.js`: `scrollable` adds the sidebar.
- `docs/dev/spec.md` section 6 (layout table, strip) and section 14.4 (order); `README.md` and `docs/gm-guide.md` where they describe the sheet.

## Next step

None. Done.
