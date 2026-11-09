import { LORE, PERCEPTION } from "./data.js";

const loc = (key) => game.i18n.localize(key);

/** The name of a Discovery or Influence skill row. */
export function skillLabel(row) {
  if (row.skill === LORE) return row.lore || loc("SSM.Influence.Lore");
  if (row.skill === PERCEPTION) return loc("PF2E.PerceptionLabel");
  const skill = CONFIG.PF2E.skills[row.skill];
  return skill ? loc(skill.label) : row.skill;
}
