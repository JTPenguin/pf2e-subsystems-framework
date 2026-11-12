import { ACTIVE_SETTING, MODULE } from "../constants.js";
import { challengePage, subsystemFor } from "../registry.js";
import { partyPCs, pcImage } from "../party.js";

/*
 * The filtered copy's world setting, and the only code that writes it. The value is {} when no challenge is active, otherwise
 * { id, type, hidden, view }: the journal entry's id, the page type that picks the renderer, and what players may see (null while hidden).
 */

/** Wait this long after a change, so that a burst of updates costs one write. */
const COALESCE_MS = 50;

let timer = null;
let queue = Promise.resolve();

/** Writes run one at a time, so a slow write can't land after a newer one. */
function enqueue(job) {
  queue = queue.then(job).catch((error) => console.error(`${MODULE} | Panel update failed`, error));
  return queue;
}

/** The setting's value. Always an object, even when the setting is empty. */
export function panelState() {
  const value = game.settings.get(MODULE, ACTIVE_SETTING);
  return value && typeof value === "object" ? value : {};
}

/** Work out what the setting should hold for this state, and write it only if players would see a change. */
async function publish(state) {
  if (!state.id) return;
  const entry = game.journal.get(state.id);
  const page = entry && challengePage(entry);
  const subsystem = entry && subsystemFor(entry);
  let next = {};
  if (page && subsystem?.panel?.isRunning(page.system)) {
    const view = state.hidden ? null : subsystem.panel.buildView({
      name: entry.name,
      system: page.toObject().system,
      party: partyPCs().map((actor) => ({ id: actor.id, name: actor.name, img: pcImage(actor) })),
    });
    next = { id: entry.id, type: subsystem.pageType, hidden: !!state.hidden, view };
  }
  if (JSON.stringify(next) !== JSON.stringify(panelState())) await game.settings.set(MODULE, ACTIVE_SETTING, next);
}

/** Bring the setting up to date soon. Each change after the timer fires sets a new one, so the last state always lands. */
export function schedulePublish() {
  if (timer !== null || !game.user.isActiveGM || !panelState().id) return;
  timer = setTimeout(() => {
    timer = null;
    enqueue(() => publish(panelState()));
  }, COALESCE_MS);
}

/** The other challenge on the panel, if there is one, shown or hidden. A stale id counts as none. */
export function panelHolder(entry) {
  const { id } = panelState();
  return id && id !== entry.id ? game.journal.get(id) ?? null : null;
}

/**
 * Put a challenge on the panel in place of any other. Any number of challenges can run; the one that leaves the panel keeps
 * running, with its state on its own page. Says which one left.
 */
export function takePanel(entry) {
  if (!game.user.isActiveGM) return;
  const other = panelHolder(entry);
  if (other) ui.notifications.info(game.i18n.format("SSM.Panel.Replaced", { name: other.name }));
  return showPanel(entry);
}

/** "panel" if players see this challenge on the panel now, "running" if it runs otherwise (a hidden panel included), or null. */
export function runState(entry) {
  const page = challengePage(entry);
  if (!page || !subsystemFor(entry)?.panel?.isRunning(page.system)) return null;
  const { id, hidden } = panelState();
  return id === entry.id && !hidden ? "panel" : "running";
}

export function showPanel(entry) {
  // A change during this first write can't schedule a publish, as the setting has no id yet. Check again once it has.
  if (game.user.isActiveGM) return enqueue(() => publish({ id: entry.id, hidden: false })).then(schedulePublish);
}

export function hidePanel() {
  if (game.user.isActiveGM) return enqueue(() => publish({ ...panelState(), hidden: true }));
}
