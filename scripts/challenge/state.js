import { EDITABLE } from "./data.js";
import { applyRoll, receiveRoll, settleChase, syncBothWays, triggerKey, undoApply } from "./run.js";

const queues = new Map();

/** Change a challenge's data. Changes to one page run one at a time, so two quick results or a result and a form save can't overwrite each other. */
export function writeChallenge(page, change, options = {}) {
  const run = async () => {
    const system = page.toObject().system;
    const result = change(system);
    if (result === false) return false;
    // A both-ways track's Reached follows its value, whatever changed it: a roll, a hand change or a form edit (spec 14.8).
    syncBothWays(system);
    // A chase's end, stuck and round notices, whatever moved the party or the other side (items/chase-subsystem.md).
    const notices = settleChase(system);
    const update = Object.fromEntries([...EDITABLE, "run"].map((key) => [key, system[key]]));
    await page.update({ system: update }, options);
    for (const notice of notices) ui.notifications.info(game.i18n.format(notice.key, notice.data), { permanent: notice.key.includes(".End.") });
    return result;
  };
  const next = (queues.get(page.id) ?? Promise.resolve()).then(run);
  queues.set(page.id, next.catch(() => {}));
  return next;
}

/** Tell the GM about any counter thresholds a change reached. */
export function announceTriggers(result) {
  for (const trigger of result?.triggers ?? []) ui.notifications.info(game.i18n.format(triggerKey(trigger), trigger));
}

/** A roll as it arrives, on the active GM's client. */
export const receiveChallengeRoll = (page, roll) => writeChallenge(page, (system) => receiveRoll(system, roll));

/** Apply one degree's outcome for a roll from its chat card. The check runs again on the latest data, inside the write queue, so a second click can't count it twice. */
export const applyChallengeRoll = (page, roll, outcome) => writeChallenge(page, (system) => applyRoll(system, roll, outcome));

/** Undo an applied result from its result card, from the record its Apply made. */
export const undoChallengeApply = (page, record) => writeChallenge(page, (system) => undoApply(system, record));
