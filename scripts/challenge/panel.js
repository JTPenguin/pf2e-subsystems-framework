import { MODULE } from "../constants.js";
import { counterMoves, findCounter, isDecoyCheck } from "./data.js";
import { actionName, skillLabel, subjectName } from "./skill-label.js";
import { refreshPanel } from "../panel/panel.js";
import { barTicks, bothWaysBar, buildPanelView, changeText, findPanelRow, pointsBar, roundSegments } from "./panel-view.js";
import { rollCheck, rollTarget } from "./roll.js";
import { advanceRound, canAdvanceRound, canUndoRound, changeCounter, counterValueOf, toggleActed, toggleModifier, undoRound } from "./run.js";
import { ChallengeSheet } from "./sheet.js";
import { announceTriggers, writeChallenge } from "./state.js";
import { challengePage } from "../registry.js";

const loc = (key) => game.i18n.localize(key);

/** The challenge behind the panel, on a GM's client. Null for players, who can't read it. */
function gmPage(state) {
  const entry = game.user.isGM && state ? game.journal.get(state.id) : null;
  return entry ? challengePage(entry) ?? null : null;
}

/** Counter displays drawn as a row of slots. */
const SLOTTED = new Set(["steps", "track"]);
/** A counter's bar: a both-ways bar with a zero mark when it has a range, else a plain one (spec 14.8). */
const barOf = (value, track) => (track.range ? bothWaysBar(value, track.range) : pointsBar(value, track.scale));

/**
 * Whether the GM's + and − can move a value, read from the real counter with the sheet's limits. Only the active GM's buttons work, as on the sheet.
 * Players and a counter gone from the challenge get both off; players never see the buttons anyway.
 */
function moves(page, counterId, actorId = "") {
  const counter = game.user.isActiveGM && page ? findCounter(page.system, counterId)?.counter : null;
  return counter ? counterMoves(counter, counterValueOf(counter, actorId)) : { canAdd: false, canRemove: false };
}

/** The action cards, threshold rows and modifier cards this user has opened on the panel, as "challengeId:ownerId:rowId". Each user's own, kept until the page reloads. */
const openRows = new Set();
const rowKey = (challengeId, ownerId, rowId) => `${challengeId}:${ownerId}:${rowId}`;

/** A click on a row's caret or name opens its description on the panel, or closes it. `data-subject` is the owner: a subject, a counter, or empty for the challenge. */
function toggleRow(state, button) {
  const key = rowKey(state.id, button.dataset.subject, button.dataset.id);
  if (!openRows.delete(key)) openRows.add(key);
  return refreshPanel();
}

/** A subject's, action's, threshold's or modifier's description as HTML. The copy holds no secret blocks, and inline rolls and links work as on an item. */
const enrichDescription = (html) => (html ? foundry.applications.ux.TextEditor.implementation.enrichHTML(html, { secrets: false }) : "");

/** A counter's listed thresholds, each with its description as HTML and whether this user has it open. */
const thresholdRows = (state, counter) => Promise.all(counter.thresholds.map(async (row) => ({
  ...row, counterId: counter.id, descriptionHtml: await enrichDescription(row.description), open: openRows.has(rowKey(state.id, counter.id, row.id)),
})));

/**
 * Counters as the panel draws them, the challenge's below the columns or a subject's in its column (spec 14.12, 14.13):
 * a bar, steps or a track gets its own row and threshold card; per-PC counters a row per party PC; numbers share one line,
 * except a number with thresholds in its list, which gets its own row (name and value, no bar) so its threshold card has a place.
 * On a GM's client each value carries whether its + and − work.
 */
async function counterSet(state, counters, pcs, page) {
  const named = (row) => ({ ...row, name: row.name || loc("SSM.Challenge.UnnamedCounter"), counterId: row.id, ...moves(page, row.id) });
  const ownRow = (row) => SLOTTED.has(row.display) || row.display === "bar" || (row.display === "number" && row.thresholds.length > 0);
  return {
    tracks: await Promise.all(counters.filter(ownRow).map(async (row) => ({
      ...named(row),
      thresholds: await thresholdRows(state, row),
      bar: row.display === "bar" ? barOf(row.value, row) : null,
      ticks: row.display === "bar" ? barTicks(row.marks, row.value, row).map((tick) => ({ ...tick, tooltip: game.i18n.format("SSM.Panel.SlotThreshold", { number: tick.points }) })) : [],
      steps: row.display === "steps",
      slots: row.slots?.map((slot) => ({ ...slot, tooltip: slot.threshold ? game.i18n.format("SSM.Panel.SlotThreshold", { number: slot.number }) : String(slot.number) })) ?? null,
    }))),
    pcCounters: counters.filter((row) => row.perPc).map((row) => ({
      ...named(row),
      pcs: row.pcs.map((pc) => ({ ...pc, counterId: row.id, actor: pc.id, name: pcs.get(pc.id)?.name ?? "", img: pcs.get(pc.id)?.img ?? "", ...moves(page, row.id, pc.id) })),
    })),
    numbers: counters.filter((row) => row.display === "number" && !ownRow(row)).map(named),
    any: counters.length > 0,
  };
}

/**
 * A modifier card's context: its category, duration and state as labels, each change as text, marked done once it has happened,
 * and its description, which opens below it like an action's. `decoy` is read from the challenge on a GM's client only; players pass nothing.
 */
async function modifierCard(state, row, subjectId, decoy) {
  const text = { format: (key, data) => game.i18n.format(key, data), list: (items) => game.i18n.getListFormatter().format(items), label: skillLabel };
  return {
    ...row,
    subjectId,
    decoy,
    name: row.name || loc("SSM.Challenge.UnnamedEntry"),
    // A blank category shows no label and no stripe colour (spec 14.7).
    categoryLabel: row.category,
    stripe: row.colour ? `--ssm-cat: ${row.colour}` : "",
    durationLabel: loc(`SSM.Challenge.Duration.${row.duration}`),
    // Struck once a one-time entry is spent.
    changes: row.changes.map((change) => ({ text: changeText(change, text), done: row.spent })),
    inactive: !row.active && !row.spent,
    descriptionHtml: await enrichDescription(row.description),
    open: openRows.has(rowKey(state.id, subjectId, row.id)),
  };
}

/** The checks and modifiers the GM flagged as decoys, as "subjectId:rowId" keys, read from the challenge itself. Empty for players, so a decoy flag never reaches their client. */
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

/** The panel's context, drawn only from the filtered copy. On a GM's client, the round buttons and the decoy tags also read the challenge. */
async function prepareView(view, state) {
  const page = gmPage(state);
  const decoys = gmDecoys(page);
  const pcs = new Map(view.party.map((pc) => [pc.id, pc]));
  const segments = roundSegments(view.rounds.current, view.rounds.max);
  // A maximum of 0 means no rounds: no round text, bar or buttons, and no party portraits, since acted marks only mean something within a round.
  const rounds = view.rounds.max !== 0;
  return {
    name: view.name,
    rounds,
    roundLabel: rounds ? game.i18n.format(view.rounds.max === null ? "SSM.Challenge.RoundOpen" : "SSM.Challenge.Round", view.rounds) : "",
    roundSegments: segments,
    ...roundButtons(page),
    several: view.subjects.length > 1,
    // The panel's width follows the revealed subjects only: no subjects is as wide as one (spec 7).
    columns: Math.max(1, view.subjects.length),
    // Challenge-level entries: a full-width strip above the subject columns, hidden with none revealed (spec 14.7).
    challengeMods: await Promise.all((view.modifiers ?? []).map((row) => modifierCard(state, row, "", decoys.has(`:${row.id}`)))),
    subjects: await Promise.all(view.subjects.map(async (subject, n) => ({
      ...subject,
      name: subjectName(subject, subject.index ?? n, view.subjectLabel),
      descriptionHtml: await enrichDescription(subject.description),
      // A copy built before subjects had counters has none (spec 14.9): draw the subject without them.
      counterSet: await counterSet(state, subject.counters ?? [], pcs, page),
      // Only ids go in the HTML. A click looks the DC up in the copy.
      // A card with a description opens and closes by its name.
      actions: await Promise.all(subject.actions.map(async (action) => ({
        id: action.id,
        subjectId: subject.id,
        name: actionName(action),
        secret: action.secret,
        descriptionHtml: await enrichDescription(action.description),
        open: openRows.has(rowKey(state.id, subject.id, action.id)),
        checks: action.checks.map((row) => ({ id: row.id, subjectId: subject.id, actionId: action.id, label: skillLabel(row), decoy: decoys.has(`${subject.id}:${row.id}`) })),
      }))),
      // One section per category; the heading names the category, so the cards leave out its label (spec 14.7).
      modifierGroups: await Promise.all(subject.modifierGroups.map(async (group) => ({
        heading: group.label,
        stripe: group.colour ? `--ssm-cat: ${group.colour}` : "",
        cards: await Promise.all(group.cards.map(async (row) => ({ ...(await modifierCard(state, row, subject.id, decoys.has(`${subject.id}:${row.id}`))), categoryLabel: "" }))),
      }))),
    }))),
    counterSet: await counterSet(state, view.counters, pcs, page),
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
  const subjectLabel = subjectName(subject, subject.index ?? state.view.subjects.indexOf(subject), state.view.subjectLabel);
  const target = rollTarget({ challengeId: state.id, subject, subjectLabel, action, row, dc: row.dc, bonuses: row.bonuses ?? [], used: row.used ?? [] });
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

/** A GM click on a value's + or −: the same change as the sheet's button, with the same limits and threshold notices. On a per-PC value it changes that PC's. */
async function stepCounter(state, button) {
  const entry = game.journal.get(state.id);
  const page = entry && challengePage(entry);
  if (!game.user.isActiveGM || !page) return;
  const { id, delta, actor } = button.dataset;
  announceTriggers(await writeChallenge(page, (system) => changeCounter(system, id, Number(delta), actor ?? "")));
}

export const challengePanel = {
  template: `modules/${MODULE}/templates/challenge-panel.hbs`,
  isRunning: (system) => system.run.status === "active",
  buildView: buildPanelView,
  prepareView,
  viewActions: { rollSkill: rollFromPanel, previousRound: moveRound, nextRound: moveRound, toggleModifier: flipModifier, toggleActed: flipActed, toggleAction: toggleRow, changeCounter: stepCounter },
};
