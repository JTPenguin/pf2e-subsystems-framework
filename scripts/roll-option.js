/*
 * A module roll carries its identity in one PF2e roll option. It works for direct rolls and chat links, and a reroll keeps it.
 * Form: ssm:roll:<kind>:<challengeId>:<npcId>:<entryId>:<rollId>. Ids hold only letters and digits, so no part contains the separator.
 * No Foundry calls, so tools/test.mjs can check it.
 */
const PREFIX = "ssm:roll:";

/** A chat link's rollId until it's rolled. One link can be clicked many times, so each click gets its own id when its message is created. */
export const LINK_ROLL_ID = "link";

export const buildRollOption = ({ kind, challengeId, npcId, entryId, rollId }) => `${PREFIX}${[kind, challengeId, npcId, entryId, rollId].join(":")}`;

export function parseRollOption(option) {
  if (typeof option !== "string" || !option.startsWith(PREFIX)) return null;
  const parts = option.slice(PREFIX.length).split(":");
  if (parts.length !== 5 || parts.some((part) => !part)) return null;
  const [kind, challengeId, npcId, entryId, rollId] = parts;
  return { kind, challengeId, npcId, entryId, rollId };
}

export const findRollOption = (options) => (Array.isArray(options) ? options.find((option) => parseRollOption(option)) ?? null : null);

/** The options with an unrolled link's placeholder replaced by rollId. Returns null if there is nothing to replace. */
export function stampLinkRoll(options, rollId) {
  const found = findRollOption(options);
  const roll = parseRollOption(found);
  if (roll?.rollId !== LINK_ROLL_ID) return null;
  return options.map((option) => (option === found ? buildRollOption({ ...roll, rollId }) : option));
}
