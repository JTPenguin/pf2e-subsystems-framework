import { LORE, PERCEPTION } from "./data.js";
import { suggestedPoints } from "./run.js";

const loc = (key) => game.i18n.localize(key);

/** The name of a Discovery or Influence skill row. */
export function skillLabel(row) {
  if (row.skill === LORE) return row.lore || loc("SSM.Influence.Lore");
  if (row.skill === PERCEPTION) return loc("PF2E.PerceptionLabel");
  const skill = CONFIG.PF2E.skills[row.skill];
  return skill ? loc(skill.label) : row.skill;
}

const signed = (n) => (n > 0 ? `+${n}` : `${n}`.replace("-", "−"));

/** The pending-results list as templates/pending-list.hbs shows it. Phase 3's GM panel can use the same two. */
export function pendingItems(system) {
  return system.run.pending.map((item) => {
    const npc = system.npcs.find((candidate) => candidate.id === item.npcId);
    const row = npc && [...npc.discovery, ...npc.influence].find((candidate) => candidate.id === item.entryId);
    const isInfluence = item.kind === "influence";
    return {
      ...item,
      isInfluence,
      npcName: npc?.name || loc("SSM.Influence.NPC"),
      skill: row ? skillLabel(row) : loc("SSM.Influence.UnknownSkill"),
      outcomeLabel: item.outcome ? loc(`SSM.Influence.Outcome.${item.outcome}`) : "",
      suggestion: isInfluence ? game.i18n.format("SSM.Influence.Suggested", { points: signed(suggestedPoints(item.outcome)) }) : "",
      reminder: !isInfluence && item.outcome ? loc(`SSM.Influence.Reminder.${item.outcome}`) : "",
      dcWarning: item.dc !== null && item.expectedDc !== null && item.dc !== item.expectedDc ? game.i18n.format("SSM.Influence.StaleDc", { rolled: item.dc, current: item.expectedDc }) : "",
      spends: (item.claims ?? []).map((id) => npc?.modifiers.find((modifier) => modifier.id === id)?.name).filter(Boolean).join(", "),
    };
  });
}
