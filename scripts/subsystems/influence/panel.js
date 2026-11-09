import { MODULE } from "../../constants.js";
import { skillLabel } from "./skill-label.js";
import { buildPanelView, findPanelRow, pointsBar } from "./panel-view.js";
import { rollCheck, rollTarget } from "./roll.js";

const loc = (key) => game.i18n.localize(key);

/** The Influence panel's context, drawn only from the filtered copy. */
function prepareView(view) {
  // Only ids go in the HTML. A click looks the DC up in the copy. The GM rolls from the sheet, so the GM's panel has no skill buttons.
  const skillButton = (npc, n, row, kind) => ({
    id: row.id, npcId: npc.id, kind,
    label: skillLabel(row),
    canRoll: !game.user.isGM,
    tooltip: game.i18n.format("SSM.Panel.RollAgainst", { skill: skillLabel(row), npc: npc.name || `${loc("SSM.Influence.NPC")} ${n + 1}` }),
  });
  return {
    name: view.name,
    roundLabel: game.i18n.format("SSM.Influence.Round", view.rounds),
    several: view.npcs.length > 1,
    npcs: view.npcs.map((npc, n) => ({
      ...npc,
      name: npc.name || `${loc("SSM.Influence.NPC")} ${n + 1}`,
      bar: pointsBar(npc.points, npc.thresholds),
      discovery: npc.discovery.map((row) => skillButton(npc, n, row, "discover")),
      influence: npc.influence.map((row) => skillButton(npc, n, row, "influence")),
      known: npc.known.map((row) => ({ ...row, name: row.name || loc("SSM.Influence.UnnamedEntry") })),
    })),
    counters: view.counters.map((row) => ({ ...row, name: row.name || loc("SSM.Influence.UnnamedCounter") })),
    party: view.party,
  };
}

let rolling = false;

/** A player's click on a skill. Everything comes from the filtered copy, as players can't read the challenge. */
async function rollFromPanel(state, button, event) {
  // `rolling` covers an open dialog. With the dialog off the roll ends in milliseconds, so the click count stops the second click of a double click.
  if (rolling || game.user.isGM || event.detail > 1) return;
  const found = findPanelRow(state.view, button.dataset);
  if (!found) return ui.notifications.info("SSM.Panel.SkillGone", { localize: true });
  const actor = game.user.character;
  if (!actor) return ui.notifications.info("SSM.Panel.NoCharacter", { localize: true });
  const { npc, row, kind } = found;
  const target = rollTarget({ challengeId: state.id, npc, row, kind, dc: row.dc });
  // One click, one roll: a double click or a click behind the open roll dialog doesn't start another.
  rolling = true;
  try {
    // Statistic.roll falls back to public when given an event and no mode, so pass the player's own. Ctrl-click and the roll dialog can still change it.
    await rollCheck(actor, target, { event, messageMode: game.settings.get("core", "messageMode") });
  } finally {
    rolling = false;
  }
}

export const influencePanel = {
  template: `modules/${MODULE}/templates/influence-panel.hbs`,
  isRunning: (system) => system.run.status === "active",
  buildView: buildPanelView,
  prepareView,
  viewActions: { rollSkill: rollFromPanel },
};
