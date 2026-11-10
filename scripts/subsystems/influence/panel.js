import { MODULE } from "../../constants.js";
import { isOtherModifier } from "./data.js";
import { skillLabel } from "./skill-label.js";
import { buildPanelView, changeText, findPanelRow, pointsBar, roundSegments } from "./panel-view.js";
import { rollCheck, rollTarget } from "./roll.js";
import { advanceRound, canAdvanceRound, canUndoRound, toggleModifier, undoRound } from "./run.js";
import { InfluenceSheet } from "./sheet.js";
import { announceTriggers, writeChallenge } from "./state.js";
import { challengePage } from "../../registry.js";

const loc = (key) => game.i18n.localize(key);

/** A modifier card's context: its kind (none for Other), duration and state as labels, and each change as text, marked done once it has happened. */
function modifierCard(row, npcId) {
  const text = { format: (key, data) => game.i18n.format(key, data), list: (items) => game.i18n.getListFormatter().format(items), label: skillLabel };
  return {
    ...row,
    npcId,
    name: row.name || loc("SSM.Influence.UnnamedEntry"),
    kindLabel: isOtherModifier(row) ? "" : loc(`SSM.Influence.Kind.${row.kind}`),
    durationLabel: loc(`SSM.Influence.Duration.${row.duration}`),
    // Struck once it has happened: all of a spent entry, or an applied entry's changes other than a DC change.
    changes: row.changes.map((change) => ({ text: changeText(change, text), done: row.spent || (row.applied && change.type !== "dc") })),
    inactive: !row.active && !row.spent,
  };
}

/** The GM's round buttons are enabled as the GM window's are: only the active GM, and only when the move does something. The real challenge is read, as the copy has no round history. */
function roundButtons(state) {
  const entry = game.user.isGM && state ? game.journal.get(state.id) : null;
  const page = entry && challengePage(entry);
  const run = !!page && game.user.isActiveGM;
  return { canPreviousRound: run && canUndoRound(page.system), canNextRound: run && canAdvanceRound(page.system) };
}

/** The Influence panel's context, drawn only from the filtered copy. The GM's round buttons also read the challenge. */
function prepareView(view, state) {
  // Only ids go in the HTML. A click looks the DC up in the copy.
  const skillButton = (npc, n, row, kind) => ({
    id: row.id, npcId: npc.id, kind,
    label: skillLabel(row),
  });
  return {
    name: view.name,
    roundLabel: game.i18n.format("SSM.Influence.Round", view.rounds),
    roundSegments: roundSegments(view.rounds.current, view.rounds.max),
    ...roundButtons(state),
    several: view.npcs.length > 1,
    npcs: view.npcs.map((npc, n) => ({
      ...npc,
      name: npc.name || `${loc("SSM.Influence.NPC")} ${n + 1}`,
      bar: pointsBar(npc.points, npc.goal),
      discovery: npc.discovery.map((row) => skillButton(npc, n, row, "discover")),
      influence: npc.influence.map((row) => skillButton(npc, n, row, "influence")),
      known: npc.known.map((row) => modifierCard(row, npc.id)),
    })),
    counters: view.counters.map((row) => ({ ...row, name: row.name || loc("SSM.Influence.UnnamedCounter") })),
    party: view.party.map((pc) => ({ ...pc, label: game.i18n.format(pc.acted ? "SSM.Panel.ActedLabel" : "SSM.Panel.NotActedLabel", { name: pc.name }) })),
  };
}

let rolling = false;

/** Who the GM rolls for: the selected token's actor, else the challenge sheet's Roll as choice. Null if there is neither. */
function gmRollActor(state) {
  const controlled = canvas.ready ? canvas.tokens.controlled[0]?.actor : null;
  if (controlled) return controlled;
  // The sheet keeps its Roll as choice while closed, so this works with the sheet shut too.
  const sheet = game.journal.get(state.id)?.sheet;
  return sheet instanceof InfluenceSheet ? sheet.rollAsActor : null;
}

/** A click on a skill. Everything comes from the filtered copy, as players can't read the challenge; the GM's click uses it too, so both roll the same way. */
async function rollFromPanel(state, button, event) {
  // `rolling` covers an open dialog. With the dialog off the roll ends in milliseconds, so the click count stops the second click of a double click.
  if (rolling || event.detail > 1) return;
  const found = findPanelRow(state.view, button.dataset);
  if (!found) return ui.notifications.info("SSM.Panel.SkillGone", { localize: true });
  const actor = game.user.isGM ? gmRollActor(state) : game.user.character;
  if (!actor) return game.user.isGM ? ui.notifications.warn("SSM.Panel.NoGMActor", { localize: true }) : ui.notifications.info("SSM.Panel.NoCharacter", { localize: true });
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

/** A GM click on Previous or Next round: the same change as the GM window's button. */
async function moveRound(state, button) {
  const entry = game.journal.get(state.id);
  const page = entry && challengePage(entry);
  if (!game.user.isActiveGM || !page) return;
  announceTriggers(await writeChallenge(page, button.dataset.action === "nextRound" ? advanceRound : undoRound));
}

/** A GM click on a modifier card: On or Off, as the GM window's chip does. A spent entry stays spent; restoring it is a GM window action. The card is found by id in the real challenge, as the copy's order differs. */
async function flipModifier(state, card) {
  const entry = game.journal.get(state.id);
  const page = entry && challengePage(entry);
  if (!game.user.isActiveGM || !page) return;
  announceTriggers(await writeChallenge(page, (system) => toggleModifier(system, card.dataset.npc, card.dataset.id)));
}

export const influencePanel = {
  template: `modules/${MODULE}/templates/influence-panel.hbs`,
  isRunning: (system) => system.run.status === "active",
  buildView: buildPanelView,
  prepareView,
  viewActions: { rollSkill: rollFromPanel, previousRound: moveRound, nextRound: moveRound, toggleModifier: flipModifier },
};
