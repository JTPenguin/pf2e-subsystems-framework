---
title: "Lay out the Edit tab like Run view"
kind: feature
status: done
waits_on: none
priority: 🔼
blocked_by: []
source: "Justin's list of items, 2026-11-12; interview with Justin, 2026-11-12"
added: 2026-11-12
updated: 2026-11-12
outcome: "Built 2026-11-12. Both Edit tabs are one red block with small section titles, as in Run view. The subject's bar holds its name, order arrows and delete button; Revealed stays a checkbox under it (no eye, which only works while running). A hidden subject's block is dashed, as in Run view. Checked live on Influence Test."
---
# Lay out the Edit tab like Run view

Today the Edit tab mixes three looks: red-edged fieldsets with a red tab label (Names, Rounds, Premise, GM notes, Counters), plain bold `h3` headings (Actions, Modifiers, Challenge modifiers), and a fieldset per modifier category. Run view is consistent: one red block per subject with a red header bar (`.ssm-block`, `.ssm-block-head`), and small underlined uppercase section titles inside it (`.ssm-section`, `.ssm-section-title`).

## Decided (Justin, 2026-11-12)

Every section on the Edit tab uses Run view's styling, mirroring its two levels.

| Tab | Red block (header bar) | Sections inside it |
|---|---|---|
| **Subject** | One block. The header bar holds the subject's name, as in Run view, plus its eye, order and delete buttons. | Name and Revealed row, description editor, Counters, Actions, Modifiers |
| **Challenge** | One "Challenge" block | Names, Rounds, Premise, GM notes, Counters, Modifiers (keeps the challenge-modifiers hint on its title) |

```
┏━ CROWDED MARKET ━━━━━━━━━━ 👁 🗑 ┓
┃ Name [........]  [x] Revealed   ┃
┃ [description editor]            ┃
┃ COUNTERS ─────────────────── +  ┃
┃ ACTIONS ──────────────────── +  ┃
┃  [action card]                  ┃
┃ MODIFIERS ────────────────── +  ┃
┃  │Resistance                    ┃
┃  │ [entry]                      ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

- Action cards keep their own boxes inside the Actions section.
- Run view doesn't change.
- The `+` buttons in the sketch are [[section-add-buttons-in-header]]; the Modifiers layout is [[modifiers-section]].

**Changes:** the Edit-tab half of `templates/challenge-sheet.hbs` (fieldsets and `h3.ssm-section-head` become `.ssm-block` and `.ssm-section`), and the Edit-tab fieldset rules in `styles/subsystems.css` (lines 143–145, 372, 404), which may then go. The subject drag grip in [[subject-drag-reorder]] lands in the same header bar, so build this first.

**Done when:** both Edit tabs show one red block with small section titles, matching Run view, and every field still saves. Check it live in Foundry on an Influence and a Chase challenge.
