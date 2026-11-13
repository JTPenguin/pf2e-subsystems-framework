---
title: "Sheet: remove the Add Subject button, use the section header +"
kind: work
status: done
waits_on: none
priority: 🔼
blocked_by: []
source: Justin's request, 2026-11-12
added: 2026-11-12
updated: 2026-11-12
outcome: "Add Subject button removed; every subjects section has a header + and an empty state (be0907c). Justin checked it, 2026-11-12."
---
# Sheet: remove the Add Subject button, use the section header +

## Request (Justin, 2026-11-12)

- Remove the "Add Subject" button (or "Add Obstacle", and so on) from the bottom of the subjects area.
- Use the + in the section headers instead.
- With no subjects, show one empty subjects section. It has an empty state message and the usual + in its header.

## Where the code does it now

- `templates/challenge-sheet.hbs:188-190` is the `ssm-add-subject` row. Its button calls `addEntry` for `subjects` and is labelled `addSubjectLabel`.
- `scripts/challenge/sheet.js:220` builds `addSubjectLabel` from `SSM.Challenge.AddSubject` ("Add {subject}"). The `{subject}` part is the preset's name for a subject, such as Obstacle.
- `templates/challenge-sheet.hbs:146-151` shows a category's section header only when the group has a heading (`{{#if group.heading}}`). The blank category has no header, so its subjects get no + in a header today.
- The empty-state pattern is already used elsewhere: the Thresholds subsection shows "This counter has no thresholds" (`items/archive/counter-thresholds-subsection.md`). No subjects empty message exists yet.

## Next step

- Delete the `ssm-add-subject` row at `challenge-sheet.hbs:188-190`.
- Make sure a section header with a + always shows for subjects. Then add an empty state message to it, shown when there are no subjects.
- Give the blank category a section header too, labelled with the preset's plural subject name.
- Category headers keep their + (it adds a subject in that category), with the `addSubjectLabel` tooltip.

## Decided (Justin, 2026-11-12)

- **The header uses the preset's plural subject name:** "Obstacles" in a chase, "NPCs" in influence. Old challenges and blank names fall back to "Subjects".
- **Empty message:** "No obstacles yet." in the same way, falling back to "No subjects yet."

**How:** the challenge stores only the singular `subjectLabel`, and the sheet no longer lets the GM edit it. Add a plural string and an empty-message string per preset in `lang/en.json` (`SSM.Preset.<preset>.Subjects`, `SSM.Preset.<preset>.NoSubjects`), store them on the challenge at creation as `subjectLabel` is (`data.js:290`), and add the two fields to `model.js:94`. Old challenges have none, so they show the fallback.

**Done when:** no "Add Subject" button shows at the bottom. Each subjects section has a + in its header that adds a subject. With no subjects, one empty section shows the empty message and the + button.
