---
title: "Make GM blocks readable on the panel"
kind: work
status: ready
waits_on: Claude
priority: ⏫
blocked_by: []
added: 2026-11-12
updated: 2026-11-12
source: "Justin's UI list, 2026-11-12; cause and look confirmed in triage interview, 2026-11-12"
---
# Make GM blocks readable on the panel

GM blocks on the panel use white text on a near-white, light purple background, so they are hard to read. Justin wants the text and background to contrast well.

## Request (Justin, 2026-11-12)

- Fix the contrast of GM blocks on the panel.
- Keep the block visibly different from player content.

## Cause (found 2026-11-12, confirmed by Justin)

- The blocks are PF2e's GM-only text: any element with `data-visibility="gm"`, such as a DC that an `@Check` shows only to the GM.
- PF2e styles them in `pf2e.css` under "GM Visibility Elements": `background: var(--visibility-gm-bg)`, which is `#e8e8ef` in the light theme, with a dotted outline.
- The panel is always dark with light text (`#efe6d8`), so the light text lands on the pale background.
- Foundry's `section.secret` blocks don't show on the panel: it enriches descriptions with `secrets: false` (`scripts/challenge/panel.js`).

## Decisions (Justin, 2026-11-12)

- **Dark purple tint.** On the panel, GM-only text gets a dark, see-through purple background, the panel's light text and a dotted outline, so it still stands out.

## Plan

- Add a rule scoped to `.ssm-panel [data-visibility=gm]` in `styles/subsystems.css`. Use fixed colours, not theme variables, like the other panel rules.
- Leave PF2e's own carve-outs alone, such as GM text inside a secret inline check.

## How to check

As GM, open a panel whose subject or action description has an `@Check` with a GM-only DC. Read the GM-only text in both Foundry themes: it is easy to read and still stands out. A player login sees no GM-only text.
