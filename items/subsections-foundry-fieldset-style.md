---
title: "Subsections styled like Foundry windows"
kind: work
status: ready
waits_on: Claude
priority: 🔼
blocked_by: []
source: "Justin's UI list, 2026-11-12; details from Justin, 2026-11-12"
added: 2026-11-12
updated: 2026-11-12
---
# Subsections styled like Foundry windows

## Request (Justin, 2026-11-12)

- Subsections should look like other Foundry windows: a bordered box with the title as a legend, and the + button in it.
- Reference: PF2e's spell sheet (Defense, Damage, Heightening).

## Where the code does it now

- Subsection titles are `h4.ssm-section-title` with an underline: Checks in `templates/challenge-action.hbs:10-13`, Thresholds in `challenge-counter.hbs:22`.
- The Counter window's Add threshold is a separate button at the bottom (`challenge-counter.hbs:44-48`), not a + in the title.
- The Modifier window's DC change sits in an `.ssm-effect` box with no title.
- `styles/subsystems.css:391` styles the windows' section titles.

## The Foundry pattern

PF2e's `templates/items/spell-details.hbs:120-124`: `<fieldset><legend>Damage <a data-action="..."><i class="fa-solid fa-fw fa-plus"></i></a></legend>`. Foundry styles `.standard-form fieldset` and `fieldset legend` (`foundry2.css`), with `--color-fieldset-border` per theme.

## Decided (Justin, 2026-11-12)

- **Edit windows only.** The Challenge sheet keeps its NPC-sheet look: red section bars and underlined subsection titles.

## Next step

1. Action window: Checks as a fieldset, + in its legend.
2. Counter window: Thresholds as a fieldset, + in its legend, replacing the Add threshold button.
3. Modifier window: put the DC change in a fieldset with a legend.
4. Decide with the template rewrite whether the windows' main fields sit in an untitled fieldset too, as PF2e's spell sheet does with its basics.
5. Do this in the same change as [[edit-windows-label-left-layout]].

## How to check

Open the Action, Counter and Modifier windows on both themes. Each subsection is a bordered box with its title in the border, the + sits in that title and adds a row, and the border colour follows the theme.
