import { applyRoll, receiveRoll, triggerKey } from "./run.js";

const queues = new Map();

/** Change a challenge's data. Changes to one page run one at a time, so two quick results or a result and a form save can't overwrite each other. */
export function writeChallenge(page, change, options = {}) {
  const run = async () => {
    const system = page.toObject().system;
    const result = change(system);
    if (result === false) return false;
    const { premise, gmNotes, rounds, npcs, counters, run: runState } = system;
    await page.update({ system: { premise, gmNotes, rounds, npcs, counters, run: runState } }, options);
    return result;
  };
  const next = (queues.get(page.id) ?? Promise.resolve()).then(run);
  queues.set(page.id, next.catch(() => {}));
  return next;
}

/** Tell the GM about any counter triggers a change reached. */
export function announceTriggers(result) {
  for (const trigger of result?.triggers ?? []) ui.notifications.info(game.i18n.format(triggerKey(trigger), trigger));
}

/** A roll as it arrives, on the active GM's client. */
export const receiveInfluenceRoll = (page, roll) => writeChallenge(page, (system) => receiveRoll(system, roll));

/** Apply an Influence roll from its chat card. The check runs again on the latest data, inside the write queue, so a second click can't count it twice. */
export const applyInfluenceRoll = (page, roll) => writeChallenge(page, (system) => applyRoll(system, roll));
