import { loreStatistic } from "../../lore-statistic.js";
import { buildRollOption } from "../../roll-option.js";
import { LORE, PERCEPTION } from "./data.js";
import { skillLabel } from "./pending-view.js";
import { loreSlug } from "./run.js";

/*
 * The one place an Influence check is rolled, for the GM's sheet and the player panel.
 * Each caller supplies the row and DC from what it may read: the sheet from the challenge, the panel from the filtered copy.
 */

const loc = (key) => game.i18n.localize(key);

/** What a roll or chat link needs. `npc` needs id and name; `row` needs skill and, for a Lore, lore. */
export function rollTarget({ challengeId, npc, row, kind, dc }) {
  const slug = row.skill === LORE ? loreSlug(row.lore || loc("SSM.Influence.Lore"), game.pf2e.system.sluggify) : row.skill;
  const option = (rollId) => buildRollOption({ kind, challengeId, npcId: npc.id, entryId: row.id, rollId });
  return { row, slug, kind, option, dc, npcLabel: npc.name || loc("SSM.Influence.NPC") };
}

/** The statistic this actor rolls. Null if it has none, which a non-character without a Lore, or a loot actor, can be. */
function statisticFor(actor, target) {
  if (target.slug === PERCEPTION) return actor.perception ?? null;
  if (target.row.skill === LORE) return loreStatistic(actor, target.slug, skillLabel(target.row));
  return actor.skills?.[target.slug] ?? null;
}

/** Roll a normal PF2e check for the actor, or tell the user if the actor can't make it. */
export function rollCheck(actor, target, { event, messageMode }) {
  const statistic = statisticFor(actor, target);
  if (!statistic) return ui.notifications.warn(game.i18n.format("SSM.Influence.MissingSkill", { actor: actor.name, skill: skillLabel(target.row) }));
  return statistic.roll({
    event,
    // Players never see a DC. Pass a plain number with no slug or statistic, so PF2e doesn't look for an opposing actor. That would reveal the DC.
    dc: { value: target.dc, visible: false },
    label: game.i18n.format(`SSM.Influence.RollLabel.${target.kind}`, { npc: target.npcLabel }),
    extraRollOptions: [target.option(foundry.utils.randomID())],
    messageMode,
  });
}
