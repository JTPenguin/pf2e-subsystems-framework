---
title: "Unticked Reached checkbox shows a filled grey square"
kind: work
status: done
waits_on: none
priority: 🔽
blocked_by: []
source: "Found by the edit-window restyle agent, 2026-11-12"
added: 2026-11-12
updated: 2026-11-12
outcome: "Fixed: the bold label gave the checkbox a bold weight, which Foundry's light theme draws as a solid square. The checkbox now takes Foundry's own weight."
---
# Unticked Reached checkbox shows a filled grey square

In the Counter window's threshold rows, the Reached checkbox shows a filled grey square while unticked, instead of an empty box. This was there before the edit-window restyle (commit `35e6695`).

## Likely cause (not confirmed)

The first guess was the bold `label` around it (`.ssm-row > label`, `font-weight: 600` in `styles/subsystems.css`). Triage research (2026-11-12) makes that unlikely: Foundry's `foundry2.css` sets the icon's weight from `--checkbox-font-weight`, not from the label. It also draws an unticked box as glyph `\f0c8` (a square) in `--checkbox-background-color`. So a filled grey square may simply be Foundry's normal unticked look in this theme.

## Next step

In the browser pane, compare the Reached checkbox with a plain Foundry checkbox, for example one in Foundry's own settings window. If they match, this is Foundry's style: close it, or restyle all the module's checkboxes only if Justin wants that. If they differ, find the rule that differs, and check the sheet's Allow multiple subjects checkbox too.

## Result

The module's checkbox differed from Foundry's. In the light theme Foundry sets `--checkbox-font-weight: unset`, so the box inherits its weight: regular (outline square) in Foundry's windows, but 600 (solid square) inside `.ssm-row > label` (`font-weight: 600`). In the dark theme Foundry sets bold itself, so dark was already the same. Fix: `font-weight: var(--checkbox-font-weight, normal)` on `.ssm-row > label.check > input[type=checkbox]` in `styles/subsystems.css`. Checked live: the Reached box and Allow multiple subjects both compute weight 400 in light and 700 in dark, like Foundry's own.
