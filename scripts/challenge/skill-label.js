import { actionKey, LORE, PERCEPTION, SAVES, skillKey } from "./data.js";

const loc = (key) => game.i18n.localize(key);

/** The name of a check's skill. */
export function skillLabel(row) {
  if (row.skill === LORE) return row.lore || loc("SSM.Challenge.Lore");
  if (row.skill === PERCEPTION) return loc("PF2E.PerceptionLabel");
  if (SAVES.includes(row.skill)) return loc(CONFIG.PF2E.saves[row.skill]);
  const skill = CONFIG.PF2E.skills[row.skill];
  return skill ? loc(skill.label) : row.skill;
}

/** A subject's name, or its label and place ("NPC 2") when it has none. `label` is the challenge's subject label. */
export const subjectName = (subject, index, label) => subject.name || `${label || loc("SSM.Challenge.Subject")} ${index + 1}`;

/** An action's name, or a stand-in when it has none. */
export const actionName = (action) => action.name || loc("SSM.Challenge.UnnamedAction");

/** The name of a skill key, as a challenge-level DC change names it: the first check with that key gives the name. */
export function skillKeyLabel(system, key) {
  const check = system.subjects.flatMap((subject) => subject.actions.flatMap((action) => action.checks)).find((row) => skillKey(row) === key);
  return check ? skillLabel(check) : key;
}

/** The name of an action key, as a challenge-level entry names it: the first action with that key gives the name. */
export function actionKeyLabel(system, key) {
  const action = system.subjects.flatMap((subject) => subject.actions).find((row) => actionKey(row) === key);
  return action ? actionName(action) : key;
}
