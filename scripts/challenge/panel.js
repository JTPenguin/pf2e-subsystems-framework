import { MODULE } from "../constants.js";
import { isDecoyCheck } from "./data.js";
import { actionName, skillLabel, subjectName } from "./skill-label.js";
import { bothWaysBar, buildPanelView, cardTooltip, changeText, findPanelRow, pointsBar, roundSegments } from "./panel-view.js";
import { rollCheck, rollTarget } from "./roll.js";
import { advanceRound, canAdvanceRound, canUndoRound, toggleActed, toggleModifier, undoRound } from "./run.js";
import { ChallengeSheet } from "./sheet.js";
import { announceTriggers, writeChallenge } from "./state.js";
import { challengePage } from "../registry.js";

const loc = (key) => game.i18n.localize(key);

/** The challenge behind the panel, on a GM's client. Null for players, who can't read it. */
function gmPage(state) {
  const entry = game.user.isGM && state ? game.journal.get(state.id) : null;
  return entry ? challengePage(entry) ?? null : null;
}

/** A track's bar: a both-ways bar with a zero mark when the track has a range, else a plain one (spec 14.8). */
const barOf = (value, track) => (track.range ? bothWaysBar(value, track.range) : pointsBar(value, track.scale));

/**
 * A modifier card's context: its category, duration and state as labels, each change as text, marked done once it has happened,
 * and the hover text. `gmText` and `decoy` are read from the challenge on a GM's client only; players pass nothing.
 */
function modifierCard(row, subjectId, pointsName, gmText, decoy) {
  const text = { format: (key, data) => game.i18n.format(key, data), list: (items) => game.i18n.getListFormatter().format(items), label: skillLabel, points: pointsName };
  return {
    ...row,
    subjectId,
    decoy,
    name: row.name || loc("SSM.Challenge.UnnamedEntry"),
    // A blank category shows no label and no stripe colour (spec 14.7).
    categoryLabel: row.category,
    stripe: row.colour ? `--ssm-cat: ${row.colour}` : "",
    durationLabel: loc(`SSM.Challenge.Duration.${row.duration}`),
    // Struck once it has happened: all of a spent entry, or an applied entry's changes other than a DC change.
    changes: row.changes.map((change) => ({ text: changeText(change, text), done: row.spent || (row.applied && change.type !== "dc") })),
    inactive: !row.active && !row.spent,
    tooltip: cardTooltip({ playerText: row.text, gmText, isGM: game.user.isGM }, { escape: foundry.utils.escapeHTML, gmLabel: loc("SSM.Panel.TipGM") }),
  };
}

/** The GM text of each modifier on the panel, keyed "subjectId:modifierId" (":modifierId" for a challenge-level one), read from the challenge itself. Empty for players, who never get GM text. */
function gmTexts(page) {
  const texts = new Map();
  for (const row of page?.system.modifiers ?? []) texts.set(`:${row.id}`, row.gmText);
  for (const subject of page?.system.subjects ?? []) for (const row of subject.modifiers) texts.set(`${subject.id}:${row.id}`, row.gmText);
  return texts;
}

/** The checks and modifiers the GM flagged as decoys, as "subjectId:rowId" keys, read from the challenge itself. Empty for players, so a decoy flag never reaches their client. An always-shown check is never a decoy. */
function gmDecoys(page) {
  const keys = new Set();
  for (const row of page?.system.modifiers ?? []) if (row.decoy) keys.add(`:${row.id}`);
  for (const subject of page?.system.subjects ?? []) {
    for (const action of subject.actions) for (const row of action.checks) if (isDecoyCheck(row)) keys.add(`${subject.id}:${row.id}`);
    for (const row of subject.modifiers) if (row.decoy) keys.add(`${subject.id}:${row.id}`);
  }
  return keys;
}

/** The GM's round buttons are enabled as the GM window's are: only the active GM, and only when the move does something. The real challenge is read, as the copy has no round history. */
function roundButtons(page) {
  const run = !!page && game.user.isActiveGM;
  return { canPreviousRound: run && canUndoRound(page.system), canNextRound: run && canAdvanceRound(page.system) };
}

/** The panel's context, drawn only from the filtered copy. On a GM's client, the round buttons, the decoy tags and the cards' GM text also read the challenge. */
function prepareView(view, state) {
  const page = gmPage(state);
  const gm = gmTexts(page);
  const decoys = gmDecoys(page);
  const pointsName = view.pointsName || loc("SSM.Challenge.Points");
  const pcs = new Map(view.party.map((pc) => [pc.id, pc]));
  const segments = roundSegments(view.rounds.current, view.rounds.max);
  return {
    name: view.name,
    roundLabel: game.i18n.format(view.rounds.max === null ? "SSM.Challenge.RoundOpen" : "SSM.Challenge.Round", view.rounds),
    roundSegments: segments,
    ...roundButtons(page),
    several: view.subjects.length > 1,
    // Challenge-level entries: a full-width strip above the subject columns, hidden with none revealed (spec 14.7).
    challengeMods: (view.modifiers ?? []).map((row) => modifierCard(row, "", pointsName, gm.get(`:${row.id}`), decoys.has(`:${row.id}`))),
    subjects: view.subjects.map((subject, n) => ({
      ...subject,
      name: subjectName(subject, n, view.subjectLabel),
      bar: barOf(subject.points, subject),
      showPoints: subject.tracksPoints && !subject.individual,
      // One row per PC on an individual subject: portrait, bar, and a check when that PC is done.
      pcs: subject.tracksPoints ? subject.pcs.map((pc) => ({ ...pc, name: pcs.get(pc.id)?.name ?? "", img: pcs.get(pc.id)?.img ?? "", bar: barOf(pc.points, subject) })) : [],
      // Only ids go in the HTML. A click looks the DC up in the copy.
      actions: subject.actions.map((action) => ({
        id: action.id,
        name: actionName(action),
        secret: action.secret,
        // Everyone sees the description, so it goes in as player text.
        tooltip: cardTooltip({ playerText: action.description, isGM: false }, { escape: foundry.utils.escapeHTML }),
        checks: action.checks.map((row) => ({ id: row.id, subjectId: subject.id, actionId: action.id, label: skillLabel(row), decoy: decoys.has(`${subject.id}:${row.id}`) })),
      })),
      // One section per category; the heading names the category, so the cards leave out its label (spec 14.7).
      modifierGroups: subject.modifierGroups.map((group) => ({
        heading: group.label,
        stripe: group.colour ? `--ssm-cat: ${group.colour}` : "",
        cards: group.cards.map((row) => ({ ...modifierCard(row, subject.id, pointsName, gm.get(`${subject.id}:${row.id}`), decoys.has(`${subject.id}:${row.id}`)), categoryLabel: "" })),
      })),
    })),
    // A counter with thresholds is a track, with a bar and a threshold card. The rest stay plain numbers on one line.
    // A both-ways counter gets a bar with a zero mark even with no thresholds.
    tracks: view.counters.filter((row) => row.track || (row.range && !row.perPc)).map((row) => ({ ...row, name: row.name || loc("SSM.Challenge.UnnamedCounter"), bar: barOf(row.value, row) })),
    // A per-PC counter shows one row per party PC: portrait and value (spec 14.8).
    pcCounters: view.counters.filter((row) => row.perPc).map((row) => ({
      ...row,
      name: row.name || loc("SSM.Challenge.UnnamedCounter"),
      pcs: row.pcs.map((pc) => ({ ...pc, name: pcs.get(pc.id)?.name ?? "", img: pcs.get(pc.id)?.img ?? "" })),
    })),
    counters: view.counters.filter((row) => !row.track && !row.range && !row.perPc).map((row) => ({ ...row, name: row.name || loc("SSM.Challenge.UnnamedCounter") })),
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
  return sheet instanceof ChallengeSheet ? sheet.rollAsActor : null;
}

/** A click on a skill. Everything comes from the filtered copy, as players can't read the challenge; the GM's click uses it too, so both roll the same way. */
async function rollFromPanel(state, button, event) {
  // `rolling` covers an open dialog. With the dialog off the roll ends in milliseconds, so the click count stops the second click of a double click.
  if (rolling || event.detail > 1) return;
  const found = findPanelRow(state.view, button.dataset);
  if (!found) return ui.notifications.info("SSM.Panel.SkillGone", { localize: true });
  const actor = game.user.isGM ? gmRollActor(state) : game.user.character;
  if (!actor) return game.user.isGM ? ui.notifications.warn("SSM.Panel.NoGMActor", { localize: true }) : ui.notifications.info("SSM.Panel.NoCharacter", { localize: true });
  const { subject, action, row } = found;
  const subjectLabel = subjectName(subject, state.view.subjects.indexOf(subject), state.view.subjectLabel);
  const target = rollTarget({ challengeId: state.id, subject, subjectLabel, action, row, dc: row.dc });
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
  announceTriggers(await writeChallenge(page, (system) => toggleModifier(system, card.dataset.subject, card.dataset.id)));
}

/** A GM click on a party portrait: acted or not, as the GM window's party chip does. */
async function flipActed(state, portrait) {
  const entry = game.journal.get(state.id);
  const page = entry && challengePage(entry);
  if (!game.user.isActiveGM || !page) return;
  announceTriggers(await writeChallenge(page, (system) => toggleActed(system, portrait.dataset.id)));
}

export const challengePanel = {
  template: `modules/${MODULE}/templates/challenge-panel.hbs`,
  isRunning: (system) => system.run.status === "active",
  buildView: buildPanelView,
  prepareView,
  viewActions: { rollSkill: rollFromPanel, previousRound: moveRound, nextRound: moveRound, toggleModifier: flipModifier, toggleActed: flipActed },
};
