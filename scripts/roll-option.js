/*
 * A module roll carries its identity in one PF2e roll option. It works for direct rolls and chat links, and a reroll keeps it.
 * Form: ssm:roll:<challengeId>:<subjectId>:<actionId>:<checkId>:<rollId>. Ids hold only letters and digits, so no part contains the separator.
 * No Foundry calls, so tools/test.mjs can check it.
 */
const PREFIX = "ssm:roll:";
const PARTS = ["challengeId", "subjectId", "actionId", "checkId", "rollId"];

/** A chat link's rollId until it's rolled. One link can be clicked many times, so each click gets its own id when its message is created. */
export const LINK_ROLL_ID = "link";

export const buildRollOption = (roll) => `${PREFIX}${PARTS.map((part) => roll[part]).join(":")}`;

/*
 * A roll from the sheet or the panel also names the modifier entries it used, in a second option: ssm:used:<id>:<id>…, or ssm:used for none.
 * The roll spends exactly those. A chat link has no such option.
 */
const USED = "ssm:used";
export const buildUsedOption = (ids) => [USED, ...ids].join(":");
/** The entry ids a roll's options name, or null if it names none (a chat link, or a roll from before this option). */
export function parseUsedOption(options) {
  const found = Array.isArray(options) ? options.find((option) => option === USED || (typeof option === "string" && option.startsWith(`${USED}:`))) : null;
  return found ? found.split(":").slice(2).filter(Boolean) : null;
}

export function parseRollOption(option) {
  if (typeof option !== "string" || !option.startsWith(PREFIX)) return null;
  const parts = option.slice(PREFIX.length).split(":");
  if (parts.length !== PARTS.length || parts.some((part) => !part)) return null;
  return Object.fromEntries(PARTS.map((part, index) => [part, parts[index]]));
}

export const findRollOption = (options) => (Array.isArray(options) ? options.find((option) => parseRollOption(option)) ?? null : null);

/** The options with an unrolled link's placeholder replaced by rollId. Returns null if there is nothing to replace. */
export function stampLinkRoll(options, rollId) {
  const found = findRollOption(options);
  const roll = parseRollOption(found);
  if (roll?.rollId !== LINK_ROLL_ID) return null;
  return options.map((option) => (option === found ? buildRollOption({ ...roll, rollId }) : option));
}
