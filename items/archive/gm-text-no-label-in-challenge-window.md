---
title: "GM challenge window: drop the 'GM:' label; style GM text like PF2e's GM-only text"
kind: feature
status: done
waits_on: none
priority: 🔼
blocked_by: []
source: "Justin's request, 2026-11-10; style picked in the triage interview, 2026-11-10"
added: 2026-11-10
updated: 2026-11-10
outcome: "GM text has no 'GM:' label and carries data-visibility='gm', so PF2e's GM highlight styles it, on modifiers and thresholds, in both themes. Checked live 2026-11-10."
---
# GM challenge window: drop the 'GM:' label; style GM text like PF2e's GM-only text

In the GM challenge window, GM text shows a "GM:" label in front of it. Justin does not want the label.

**Decided (Justin, 2026-11-10):**

- No "GM:" label.
- GM text uses **PF2e's GM highlight**: the purple-tinted box PF2e puts on GM-only text in item descriptions and inline checks. Not Foundry's journal "secret" block.

**How:** mark GM text with `data-visibility="gm"`, so PF2e's own rule in `systems/pf2e/styles/pf2e.css` styles it (`background: var(--visibility-gm-bg)`). That keeps it in step with PF2e's themes. Check that the rule reaches inside the GM window and looks right in both the light parchment and dark themes.

**Where:** the `ssm-gm-line` spans in `templates/influence-sheet.hbs` (modifier details and thresholds), and the `SSM.Influence.GMLabel` string in `lang/en.json`, which can go once nothing uses it.

This changes what [[gm-text-in-challenge-window]] built, which added the muted "GM:" line.

**Done when:** in the GM challenge window, GM text has no "GM:" label and has PF2e's GM highlight, on modifiers and thresholds, in both themes.
