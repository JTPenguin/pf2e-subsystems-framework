import { applyPending, ignorePending, receiveRoll, suggestedPoints, triggerKey } from "./run.js";

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

export async function receiveInfluenceRoll(page, roll) {
  const result = await writeChallenge(page, (system) => receiveRoll(system, roll));
  if (result === "afterApply") ui.notifications.info("SSM.Influence.RerollAfterApply", { localize: true });
}

/* The confirm controls, used by the sheet and the GM's panel. */

export const confirmResult = (page, id, amount) => writeChallenge(page, (system) => applyPending(system, id, amount));
export const ignoreResult = (page, id) => writeChallenge(page, (system) => ignorePending(system, id));

export async function adjustResult(page, id) {
  const item = page.system.run.pending.find((candidate) => candidate.id === id);
  if (!item) return;
  const { DialogV2 } = foundry.applications.api;
  const value = suggestedPoints(item.outcome);
  const label = game.i18n.localize("SSM.Influence.AdjustPrompt");
  const amount = await DialogV2.prompt({
    window: { title: "SSM.Influence.Adjust" },
    content: `<label>${label} <input type="number" name="amount" step="1" value="${value}" autofocus></label>`,
    ok: { label: "SSM.Influence.Apply", callback: (event, button) => button.form.elements.amount.valueAsNumber },
    rejectClose: false,
  });
  if (Number.isInteger(amount)) return confirmResult(page, id, amount);
}
