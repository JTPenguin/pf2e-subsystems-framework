---
title: "Make modifier category a type-ahead field"
kind: feature
status: ready
waits_on: Claude
blocked_by: []
source: "Justin's list of items, 2026-11-11; details from Justin's interview answers, 2026-11-11"
added: 2026-11-11
updated: 2026-11-11
---
# Make modifier category a type-ahead field

The category control in a modifier's edit window is clunky. It is a browser `datalist` with a Foundry tooltip on its label, so the tooltip and the browser's dropdown overlap. It is also unclear that you can type your own category.

## Decision (Justin, 2026-11-11)

Use Foundry v14's own Autocomplete menu, the one its tag fields use, on a plain text input.

## What to build

- **Field.** In `templates/challenge-modifier.hbs`, keep `<input type="text" name="category">` but remove the `list` attribute, the `<datalist>` and the label's `data-tooltip`.
- **Hint.** Put the hint in a placeholder instead, for example "Resistance, Weakness, or your own". Add it to `lang/en.json` and retire `SSM.Challenge.CategoryHint` if nothing else uses it.
- **Suggestions.** Attach Foundry's `Autocomplete` (`client/applications/ux/autocomplete.mjs`, reached through `Autocomplete.implementation`) to the input in `scripts/challenge/entry-window.js`. Feed it `categoryOrder(system)`, which the window already builds at line 200: the preset's suggestions, then every category in use.
- **Matching.** Match on what the user has typed, ignoring case, as `categoryKey` does. Show all suggestions when the field is focused and empty.
- **Choosing.** Picking a suggestion fills the field. Typing a new name and saving makes a new category, as today.
- **Keyboard.** Arrow keys, Enter and Escape work through the Autocomplete widget. Enter on a suggestion must not submit the form.

## Check against the installed code first

`HTMLAutocompleteTagsElement` in `client/applications/elements/autocomplete-tags.mjs` shows how Foundry wires `Autocomplete` to an input (`activate`, `dismiss`, `onSelect`). Copy its pattern rather than guessing.

## Check

In Foundry, open a modifier's window: focus the field, type part of an existing category, pick it with the keyboard and the mouse, then type a new category and save. No tooltip should cover the menu.
