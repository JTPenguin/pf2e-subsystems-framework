import { MODULE } from "../../constants.js";
import { pendingItems, skillLabel } from "./pending-view.js";
import { buildPanelView, pointsBar } from "./panel-view.js";
import { adjustResult, confirmResult, ignoreResult } from "./state.js";

const loc = (key) => game.i18n.localize(key);

/** The Influence panel's context, drawn only from the filtered copy. */
function prepareView(view) {
  const dcText = (row) => (row.showDC ? `${loc("SSM.Influence.DC")} ${row.dc}` : "");
  return {
    name: view.name,
    roundLabel: game.i18n.format("SSM.Influence.Round", view.rounds),
    several: view.npcs.length > 1,
    npcs: view.npcs.map((npc, n) => ({
      ...npc,
      name: npc.name || `${loc("SSM.Influence.NPC")} ${n + 1}`,
      bar: pointsBar(npc.points, npc.thresholds),
      discovery: npc.discovery.map((row) => ({ label: skillLabel(row) })),
      influence: npc.influence.map((row) => ({ label: skillLabel(row), dcText: dcText(row) })),
      known: npc.known.map((row) => ({ ...row, name: row.name || loc("SSM.Influence.UnnamedEntry") })),
    })),
    counters: view.counters.map((row) => ({ ...row, name: row.name || loc("SSM.Influence.UnnamedCounter") })),
    party: view.party,
  };
}

/** The GM's pending results. Null when there's nothing waiting, so the panel stays small. */
function prepareGm(system) {
  const items = pendingItems(system);
  return items.length ? { items, canRun: game.user.isActiveGM } : null;
}

export const influencePanel = {
  template: `modules/${MODULE}/templates/influence-panel.hbs`,
  gmTemplate: `modules/${MODULE}/templates/pending-list.hbs`,
  isRunning: (system) => system.run.status === "active",
  buildView: buildPanelView,
  prepareView,
  prepareGm,
  actions: {
    applyResult: (page, target) => confirmResult(page, target.dataset.id),
    adjustResult: (page, target) => adjustResult(page, target.dataset.id),
    ignoreResult: (page, target) => ignoreResult(page, target.dataset.id),
  },
};
