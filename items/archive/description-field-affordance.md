---
title: "Make empty description fields visible"
kind: feature
status: done
waits_on: none
priority: 🔼
blocked_by: []
added: 2026-11-12
updated: 2026-11-12
outcome: "Done 2026-11-12. Shared scripts/challenge/description-field.js marks toggled editors empty or filled on each render; an empty one shows a dashed 'Click to add a description' box (lang SSM.Challenge.DescriptionPlaceholder) that opens and focuses the editor on a click; a filled one keeps its edit button in view. Foundry v14 has no placeholder for prose-mirror, so this adds one. Checked live in light and dark themes."
source: "Justin's UI list, 2026-11-12; design chosen in triage interview, 2026-11-12"
---
# Make empty description fields visible

Description fields are invisible when blank. The edit button only appears on hover. A GM can miss that a description exists or can be added.

## Request (Justin, 2026-11-12)

- Find a clearer way to show a description field, even when it is empty.
- Do not rely on hover to reveal the edit button.

## Decisions (Justin, 2026-11-12)

- **Placeholder box.** An empty field shows a faint dashed box with "Click to add a description". A click opens the editor.
- **Edit button always visible** once the field has text.

## Where it applies

All are Foundry `<prose-mirror toggled>` editors. The panel has no editors, so it is not affected.

| Field | Template |
|---|---|
| Subject description | `templates/challenge-subject.hbs` |
| Action description | `templates/challenge-action.hbs` |
| GM Notes on the sheet | `templates/challenge-sheet.hbs` |

Premise is left out: [[remove-premise-field]] removes it.

## Plan

- Check how Foundry v14 draws a toggled `prose-mirror` and its edit button (`~/foundryvtt/resources/app`), and whether it already supports a placeholder.
- Use one shared CSS rule for the empty state, plus a click handler that opens the editor, so all three fields behave the same.
- Write the placeholder text in `lang/en.json`.

## How to check

Without hovering, look at a blank and a filled description in a Subject window and an Action window, and at GM Notes on the sheet. The blank ones show the dashed box; a click opens the editor. The filled ones show their edit button. Check both Foundry themes.
