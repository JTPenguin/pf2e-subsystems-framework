import { EDITABLE, sortSubjects } from "./data.js";
import { receiveRoll, syncBothWays, triggerKey } from "./run.js";

const queues = new Map();

/** Change a challenge's data. Changes to one page run one at a time, so two quick changes, or a change and a form save, can't overwrite each other. */
export function writeChallenge(page, change, options = {}) {
  const run = async () => {
    const system = page.toObject().system;
    const result = change(system);
    if (result === false) return false;
    // A both-ways track's Reached follows its value, whatever changed it: a hand change, a round advance or a form edit (spec 14.8).
    syncBothWays(system);
    // The stored subjects stay in grouped order, whatever changed them (spec 14.4).
    sortSubjects(system);
    const update = Object.fromEntries([...EDITABLE, "run"].map((key) => [key, system[key]]));
    await page.update({ system: update }, options);
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
