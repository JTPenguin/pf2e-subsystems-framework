---
title: "Tidy modifier headers and show the effect in the header"
kind: feature
status: done
waits_on: none
blocked_by: []
source: "Justin's words, 2026-11-15: let's arrange the modifier headers more neatly, and add the effect to the header. Details from an interview the same day."
added: 2026-11-15
updated: 2026-11-15
outcome: "Built 2026-11-15. Effect tag after the name (whole tag drops below a long name), Decoy and Duration in a right column, opened row shows note and description only. 'No checks' wording kept as '−2 DC (no checks)'. Tests pass; checked live in Foundry."
---
# Tidy modifier headers and show the effect in the header

On the challenge sheet, a modifier row's Duration tag sits straight after the name, so the tags land at different places down a list. The effect ("DC −2 (Diplomacy)") shows only when the row is opened. Justin wants the tags lined up and the effect on the row itself, so a GM can read what a modifier does without opening it.

**Scope: the challenge sheet only.** The panel's modifier cards keep their layout and their fuller wording (players see the bonus type in their roll breakdown anyway).

## Current row (seen live, 2026-11-15)

Caret, eye, On tick, name, Duration tag, Decoy tag, then edit and delete (`templates/challenge-sheet.hbs`, partials `ssmModGroups` and `ssmModifierName`). The effect and note are built as one string, `effectsText`, in `#modifierView` (`scripts/challenge/sheet.js`) and shown only in `ssmModifierDetails` when the row is open.

## New row

```
› 👁 ✓ Old Soldier [−2 DC vs Diplomacy]                 One-time  ✎ 🗑
› 👁 ✓ The Council's Ledger [−2 DC on all checks]       Multi-use ✎ 🗑
› 👁 ✓ A Very Long Modifier Name That Wraps
       [−1 DC, +1 to Diplomacy, Deception]       Decoy  One-time  ✎ 🗑
```

| Part | Decision |
|---|---|
| **Effect** | A tag straight after the name, on the name line. It wraps with the name when the line runs out of room. |
| **Duration and Decoy** | A right-aligned column just before edit and delete, the way Reached sits on threshold rows, so they line up down the list. Order: Decoy, then Duration. |
| **Opened row** | Shows the note and the description only. The effect is no longer repeated there. The caret works only when there is a note or a description. |
| **No effect** | A modifier with no DC change and no roll bonus gets no effect tag. |

## Effect wording

Based on the panel's wording, made shorter. The bonus type (circumstance, status, item) is left out.

| Case | Text |
|---|---|
| DC change | `−2 DC vs Diplomacy` |
| Roll bonus | `+1 to Diplomacy` |
| Both (they share one target list) | One tag: `−1 DC, +1 to Diplomacy, Deception` |
| Every check | `−2 DC on all checks` · `+1 to all checks` · `−1 DC, +1 on all checks` |
| An action as a target | The action's name alone, with no "checks": `−2 DC vs Discover, Diplomacy` |
| Long target list | Show every target and let the tag wrap. No cap. |
| No targets ticked | Claude's default, to confirm in review: `−2 DC (no checks)`, using the existing `SSM.Challenge.NoTargets` text. |

- Use a real minus sign (−), as the sheet and panel already do.
- Targets keep the existing order: actions first, then skills in check order (`sortChecks`), only skills a check still uses (as `#targetText` does now).
- Add new strings under `SSM.Challenge` in `lang/en.json`. Leave `SSM.Panel.Change.*` alone, since the panel keeps its wording. Retire `DcChangeText` and `RollChangeText` if nothing else uses them.

## Spec and docs to update in the same change

- `docs/dev/spec.md` line 176 (modifier rows): the effect is now on the row; the opened row holds the note and description.
- `docs/dev/spec.md` lines 172 and 408 say status tags stay after the name. Modifier rows now put Duration and Decoy in a right column; reword both so they stay true.
- `docs/gm-guide.md`: say where the effect and tags show on a modifier row, if the guide describes the row.

## Check

Open a challenge with varied modifiers in Foundry (the Toll Captain example plus a long name, a Decoy, a roll bonus, a both-changes entry and an Every check entry). Confirm the tags line up, long names and long effects wrap cleanly, the caret only works with a note or description, and the panel is unchanged.

## Next step

None. Done.
