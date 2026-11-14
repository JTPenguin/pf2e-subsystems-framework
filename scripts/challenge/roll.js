import { loreStatistic } from "../lore-statistic.js";
import { buildRollOption, buildUsedOption } from "../roll-option.js";
import { LORE, PERCEPTION, SAVES } from "./data.js";
import { actionName, skillLabel } from "./skill-label.js";
import { loreSlug } from "./run.js";

/*
 * The one place a challenge check is rolled, for the GM's sheet and the player panel.
 * Each caller supplies the check and DC from what it may read: the sheet from the challenge, the panel from the filtered copy.
 */

const loc = (key) => game.i18n.localize(key);

/**
 * What a roll or chat link needs. `subject` needs id; `action` needs id, name and secret; `row` needs id, skill and, for a Lore, lore.
 * `subjectLabel` is the subject's name as shown. `bonuses` are the live roll bonuses ({ id, name, amount, type }, from rollBonuses)
 * and `used` the ids of every entry the roll uses (from usedModifierIds). A chat link carries neither.
 */
export function rollTarget({ challengeId, subject, subjectLabel, action, row, dc, bonuses = [], used = [] }) {
  const slug = row.skill === LORE ? loreSlug(row.lore || loc("SSM.Challenge.Lore"), game.pf2e.system.sluggify) : row.skill;
  const option = (rollId) => buildRollOption({ challengeId, subjectId: subject.id, actionId: action.id, checkId: row.id, rollId });
  const label = game.i18n.format("SSM.Challenge.RollLabel", { action: actionName(action), subject: subjectLabel });
  return { row, slug, option, dc, label, secret: !!action.secret, bonuses, used };
}

/** The roll bonuses as PF2e modifiers, so PF2e applies its stacking rules and shows them in the roll's breakdown. A hidden entry shows as "Challenge modifier". */
const pf2eModifiers = (bonuses) => bonuses.map((bonus) => new game.pf2e.Modifier({
  slug: `ssm-${bonus.id.toLowerCase()}`,
  label: bonus.name || loc("SSM.Challenge.HiddenRollModifier"),
  modifier: bonus.amount,
  type: bonus.type,
}));

/** The statistic this actor rolls. Null if it has none, which a non-character without a Lore, or a loot actor, can be. */
function statisticFor(actor, target) {
  if (target.slug === PERCEPTION) return actor.perception ?? null;
  // A saving throw rolls PF2e's own save statistic (spec 14.8).
  if (SAVES.includes(target.slug)) return actor.saves?.[target.slug] ?? null;
  if (target.row.skill === LORE) return loreStatistic(actor, target.slug, skillLabel(target.row));
  return actor.skills?.[target.slug] ?? null;
}

/** Roll a normal PF2e check for the actor, or tell the user if the actor can't make it. */
export function rollCheck(actor, target, { event, messageMode }) {
  const statistic = statisticFor(actor, target);
  if (!statistic) return ui.notifications.warn(game.i18n.format("SSM.Challenge.MissingSkill", { actor: actor.name, skill: skillLabel(target.row) }));
  return statistic.roll({
    event,
    // Players never see a DC. Pass a plain number with no slug or statistic, so PF2e doesn't look for an opposing actor. That would reveal the DC.
    dc: { value: target.dc, visible: false },
    label: target.label,
    modifiers: pf2eModifiers(target.bonuses ?? []),
    extraRollOptions: [target.option(foundry.utils.randomID()), buildUsedOption(target.used ?? [])],
    // A secret action rolls like Recall Knowledge: PF2e then makes it a blind roll for a player and a GM-only roll for the GM, whatever messageMode says.
    traits: target.secret ? ["secret"] : [],
    messageMode,
  });
}
