---
title: "Edit windows: no explicit save button"
kind: work
status: done
waits_on: none
blocked_by: []
source: Justin's request, 2026-11-12
outcome: "Every edit window saves on each change, including adding and removing rows and the quick DC buttons; descriptions save from their editor's own button. No Save button remains. Checked in Foundry 2026-11-12."
added: 2026-11-12
updated: 2026-11-12
priority: 🔼
---
# Edit windows: no explicit save button

## Request (Justin, 2026-11-12)

- Edit windows should have no explicit save button.

## Where the code does it now

- `templates/challenge-subject.hbs:14`, `challenge-counter.hbs:37`, `challenge-modifier.hbs:38` and `challenge-action.hbs:39` each have a `button.ssm-save` labelled "Save modifier" (`SSM.Challenge.SaveModifier`).
- `scripts/challenge/entry-window.js:46` sets `submitOnChange: false` and `closeOnSubmit: true`, so the window saves only when that button submits it.

## Decided (Justin, 2026-11-12)

- **Save on every change**, as Foundry and PF2e sheets do. A field writes to the challenge as soon as it changes. Closing the window just closes it; there is no cancel.
- **Rich text editors keep their own save button.** A description is not "changed" until its editor's save is clicked.

## Next step

- In `entry-window.js:46`, set `submitOnChange: true` and `closeOnSubmit: false`.
- Make adding and removing rows (`#onAddRow`, `#onRemoveRow`, `quickDc`) save at once too, not only change the draft.
- Give the subject and action windows' `<prose-mirror>` (`challenge-subject.hbs:9`, `challenge-action.hbs:8`) the `toggled` attribute, as the sheet's premise and GM notes use, so it saves only from its own button.
- Check that a save redraws the window without losing focus. The window already keeps the focused field across redraws.
- Remove the four `ssm-save` buttons. A bottom row left empty goes too (subject window). The counter and modifier windows keep their add button there until their own items move it. The action window's row is handled in [[action-skills-subsection-add-button]].
- Remove `SSM.Challenge.SaveModifier` from `lang/en.json` if nothing else uses it.

**Done when:** none of the edit windows shows a save button, and changes still save and persist.
