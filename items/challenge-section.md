---
title: "Group the Challenge tab fields under a Challenge section"
kind: feature
status: in-progress
waits_on: Justin
priority: 🔼
blocked_by: [subsection-add-button]
source: "Justin's tweaks to the restyled edit view, 2026-11-12; interview with Justin, 2026-11-12"
added: 2026-11-12
updated: 2026-11-12
---
# Group the Challenge tab fields under a Challenge section

In the Challenge tab of the Edit view, four red-bar sections become one section called "Challenge", with four subsections: Names, Rounds, Premise and GM Notes. Counters and Modifiers stay their own sections below it.

## Decided (Justin, 2026-11-12)

- Subsections use the shared subsection style from [[subsection-add-button]] (Run view's section title, no stripe, no +).

## Plan

- In `templates/challenge-sheet.hbs`, the `onChallengeTab` block: replace the four `ssm-block` sections with one, headed `ssmSectionHead label="SSM.Challenge.Challenge"`, and give each part an `ssmSubsectionHead`.
- The fields inside each part don't change.

**Done when:** the Challenge tab shows one Challenge section with the four subsections, every field still saves, and it looks right in Foundry.

**Next step:** built and committed 2026-11-12; tests and an offline template render pass. Still needs the live check in Foundry: the GM slot was taken, so Claude couldn't open the sheet.
