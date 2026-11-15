---
title: "Subject level sets default check DCs, with difficulty adjusters"
kind: feature
status: done
waits_on: none
priority: ⏫
blocked_by: []
source: "ChazPls (friend testing the module) in Discord, 2026-11-14; details from Justin's interview, 2026-11-14"
added: 2026-11-14
updated: 2026-11-14
outcome: "Done 2026-11-14. Subjects have an optional level; new checks start at the level-based DC (PF2e's Table 10-5 values) at Normal. The action window has VE/E/N/H/VH buttons (disabled with no level); a new level moves stepped checks, a typed DC clears the step. Assumption kept: buttons disabled with no level. Proficiency Without Level is not applied. Checked live as GM in the test world."
---
# Subject level sets default check DCs, with difficulty adjusters

Every new check starts at DC 15 (`newCheck` in `scripts/challenge/data.js`), and the GM types each DC by hand. ChazPls suggested giving a subject (an NPC) a level, so its checks default to the level-based DC (GM Core Table 10-5), with difficulty buttons in the checks editor. Justin agreed.

## Decided (Justin, 2026-11-14)

| Question | Answer |
|---|---|
| Where the level comes from | A plain field the GM types on the subject. Linked actors are ignored. |
| What the buttons do | Set the DC from the level-based DC. Hard always means level DC +2, so pressing Hard twice stays at Hard. |
| Which steps | Very Easy (−5), Easy (−2), Normal (±0), Hard (+2), Very Hard (+5). Normal resets to the level DC. No Incredibly Easy or Incredibly Hard. |
| Changing the level later | Each check remembers its step. Changing the subject's level recalculates the checks that have a step. A DC the GM typed by hand stays as typed. |

## Design

- **Subject:** a new `level` field (`blankSubject` in `data.js`, the model in `model.js`, the subject editor). Blank means no level, and new checks keep the DC 15 default.
- **Check:** a new `difficulty` field holding the step, or blank for a hand-typed DC. A new check under a levelled subject starts at Normal with the level DC. Typing a DC clears the step.
- **Level-to-DC table** in `data.js`, from GM Core Table 10-5 (checked against the installed PF2e system, which may ship it).
- **Checks editor:** the five step buttons beside each check's DC, with the current step marked. The modifier editor's quick DC buttons (`QUICK_DC_AMOUNTS`, `entry-window.js`) are the model for the look.
- **No level set (Claude's assumption, not asked):** the step buttons are disabled with a tooltip saying to set the subject's level.
- **Import and export:** old files with no `level` or `difficulty` import as blank.

## Done when

- Unit tests in `tools/test.mjs` cover the DC table, the steps and the recalculation on a level change.
- `README.md`, `docs/gm-guide.md` and `docs/challenge-format.md` describe the level field and the steps.
- In a live Foundry check, a levelled subject's new check shows the right DC, a step button sets it, and changing the level moves stepped checks but not hand-typed ones.
