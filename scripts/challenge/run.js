/*
 * The rules for running a challenge (spec section 14). Each function changes a plain copy of the source data.
 * A function that returns false changed nothing. No Foundry document calls, so tools/test.mjs can check them.
 */

import { allCounters, BOTH_WAYS, clampTracks, findCounter, limitTrack, modifierList, nextThresholdReveal, revealOnly, skillKey } from "./data.js";

const isOneTime = (modifier) => modifier.duration === "oneTime";
/** A subject's entry names its checks by id; a challenge-level entry names skills, so it matches that skill on any subject (spec 14.7). */
const dcMatches = ({ dc }, check, challengeLevel) => !!dc && dc.amount !== 0 && (dc.allSkills || dc.skills.includes(challengeLevel ? skillKey(check) : check.id));

/** The entries changing this check's DC for the next roll: on and unspent, on the check's subject and on the challenge. Each is { modifier, challengeLevel }. */
function liveDcModifiers(system, subject, check) {
  const live = (list, challengeLevel) => list
    .filter((modifier) => modifier.active && !modifier.spent && dcMatches(modifier, check, challengeLevel))
    .map((modifier) => ({ modifier, challengeLevel }));
  return [...live(subject.modifiers, false), ...live(system.modifiers ?? [], true)];
}

/** The DC change from reached thresholds. */
const thresholdDc = (thresholds) => thresholds.reduce((sum, threshold) => sum + (threshold.reached ? threshold.dc || 0 : 0), 0);

/**
 * The DC the next roll of this check is made against: its own DC, the live modifier entries (the subject's and the challenge's),
 * the reached thresholds of the subject's own counters, and of every challenge counter.
 */
export function currentDc(system, subject, check) {
  const modifiers = liveDcModifiers(system, subject, check).reduce((sum, { modifier }) => sum + modifier.dc.amount, 0);
  const counters = [...system.counters, ...(subject.counters ?? [])].reduce((sum, counter) => sum + thresholdDc(counter.thresholds), 0);
  return Math.max(0, check.dc + modifiers + counters);
}

export const canRestoreModifier = (modifier) => !!modifier.spent;

const say = (key, data) => globalThis.game?.i18n?.format(key, data) ?? key;

const subjectById = (system, id) => system.subjects.find((subject) => subject.id === id);
const allChecks = (subject) => subject.actions.flatMap((action) => action.checks);

/* -------------------------------------------- */
/*  Counters: the challenge's and each subject's */
/* -------------------------------------------- */

/**
 * Whether a track at `value` has reached `points`, in its direction. A both-ways track reaches a threshold above 0 by rising to it,
 * one below 0 by falling to it, and never one at 0 (spec 14.8).
 */
export function hasReached(direction, value, points) {
  if (direction === BOTH_WAYS) return points > 0 ? value >= points : points < 0 ? value <= points : false;
  return direction === "down" ? value <= points : value >= points;
}
const movesOn = (direction, delta) => (direction === BOTH_WAYS ? delta !== 0 : direction === "down" ? delta < 0 : delta > 0);

/**
 * Bring a track's thresholds up to date with its value. Counting up or down, a threshold stays reached if the value later moves back.
 * Both ways, Reached follows the value: it clears itself when the value moves back past it. Returns the thresholds newly reached.
 */
function settleThresholds(thresholds, direction, value) {
  const reached = thresholds.filter((threshold) => !threshold.reached && hasReached(direction, value, threshold.points));
  for (const threshold of reached) threshold.reached = true;
  if (direction === BOTH_WAYS) for (const threshold of thresholds) if (threshold.reached && !hasReached(direction, value, threshold.points)) threshold.reached = false;
  return reached;
}

/** Make every both-ways counter's Reached follow its value, after any change, a form edit included. */
export function syncBothWays(system) {
  for (const counter of allCounters(system)) if (counter.direction === BOTH_WAYS && !counter.perPc) settleThresholds(counter.thresholds, BOTH_WAYS, counter.value);
}

/** A PC's value on a counter. On a per-PC counter each PC starts from the counter's own value. */
export const counterValueOf = (counter, actorId) => (counter.perPc ? counter.valueBy?.[actorId] ?? counter.value : counter.value);

/** Mark a subject complete, or clear it. Only the GM does, by hand: no counter sets it (spec 14.13). */
export function toggleComplete(system, subjectId) {
  const subject = subjectById(system, subjectId);
  if (!subject) return false;
  subject.complete = !subject.complete;
}

/** The counter that owns thresholds, the challenge's or a subject's, by id. */
const thresholdOwner = (system, ownerId) => findCounter(system, ownerId)?.counter ?? null;

/** Mark a threshold reached, or clear it, by hand. A counter moving back never clears it. On a both-ways counter Reached follows the value, so the GM can't set it. */
export function toggleReached(system, ownerId, id) {
  const owner = thresholdOwner(system, ownerId);
  const threshold = owner?.thresholds.find((row) => row.id === id);
  if (!threshold || owner.direction === BOTH_WAYS) return false;
  rememberCounter(system, owner);
  threshold.reached = !threshold.reached;
}

/** Step a threshold's reveal on: hidden, then its points, then its points and text, then hidden again. */
export function cycleThresholdReveal(system, ownerId, id) {
  const owner = thresholdOwner(system, ownerId);
  const threshold = owner?.thresholds.find((row) => row.id === id);
  if (!threshold) return false;
  rememberCounter(system, owner);
  threshold.reveal = nextThresholdReveal(threshold.reveal);
}

/* -------------------------------------------- */
/*  Start, End and Reset                         */
/* -------------------------------------------- */

/** The rows whose state a reset restores, by list. Thresholds, on counters, have a three-step `reveal`; the other rows a `revealed` flag. */
const ROW_STATE = { checks: ["revealed"], thresholds: ["reveal", "reached"], modifiers: ["active", "spent", "revealed"] };
/** The subject rows a reset restores. A subject's counters are saved with the challenge's. */
const SUBJECT_ROWS = ["checks", "modifiers"];
/** What a row added during the run goes back to on reset: hidden, as it can't have been revealed before the run. */
const HIDDEN = { checks: { revealed: false }, thresholds: { reveal: "hidden", reached: false }, modifiers: { revealed: false, active: false, spent: false } };
const SUBJECT_STATE = ["complete", "revealed"];
const COUNTER_STATE = ["value", "valueBy", "noteBy", "revealed"];
const pick = (row, fields) => structuredClone(Object.fromEntries(fields.map((field) => [field, row[field]])));
const rowsOf = (subject, list) => (list === "checks" ? allChecks(subject) : subject[list]);

const counterBaseline = (counter) => ({
  ...pick(counter, COUNTER_STATE),
  rows: Object.fromEntries(counter.thresholds.map((row) => [row.id, pick(row, ROW_STATE.thresholds)])),
});

function takeBaseline(system) {
  const rows = (subject) => Object.fromEntries(SUBJECT_ROWS.flatMap((list) => rowsOf(subject, list).map((row) => [row.id, pick(row, ROW_STATE[list])])));
  return {
    round: system.rounds.current,
    subjects: Object.fromEntries(system.subjects.map((subject) => [subject.id, { ...pick(subject, SUBJECT_STATE), rows: rows(subject) }])),
    // Every counter, the subjects' too, by id.
    counters: Object.fromEntries(allCounters(system).map((counter) => [counter.id, counterBaseline(counter)])),
    modifiers: Object.fromEntries((system.modifiers ?? []).map((row) => [row.id, pick(row, ROW_STATE.modifiers)])),
  };
}

function restoreBaseline(system, baseline) {
  system.rounds.current = baseline.round ?? system.rounds.current;
  for (const subject of system.subjects) {
    const saved = baseline.subjects?.[subject.id];
    Object.assign(subject, saved ? pick(saved, SUBJECT_STATE) : { complete: false, revealed: false });
    for (const list of SUBJECT_ROWS) {
      for (const row of rowsOf(subject, list)) Object.assign(row, saved?.rows?.[row.id] ?? HIDDEN[list]);
    }
  }
  for (const counter of allCounters(system)) {
    const saved = baseline.counters?.[counter.id];
    // A counter added during the run keeps its value; its per-PC values can only have come from the run.
    Object.assign(counter, saved ? pick(saved, COUNTER_STATE) : { valueBy: {} });
    counter.valueBy ??= {};
    counter.noteBy ??= {};
    for (const row of counter.thresholds) Object.assign(row, saved?.rows?.[row.id] ?? HIDDEN.thresholds);
  }
  for (const row of system.modifiers ?? []) Object.assign(row, baseline.modifiers?.[row.id] ?? HIDDEN.modifiers);
  clampTracks(system);
}

/** A counter added during the run has no saved state, so save it just before the run first changes it. */
function rememberCounter(system, counter) {
  const saved = system.run.baseline?.counters;
  if (saved && !saved[counter.id]) saved[counter.id] = counterBaseline(counter);
}

/**
 * Start the run. A counter whose starting value already meets a threshold marks it Reached now, with its notice, as a change to it would,
 * such as Research's Days at 1 with an event on day 1. The baseline is taken first, so Reset clears them again. Returns those notices.
 */
export function startRun(system) {
  if (system.run.status !== "inactive") return false;
  system.run.baseline = takeBaseline(system);
  if (hasRounds(system)) system.rounds.current = Math.max(1, system.rounds.current);
  system.run.status = "active";
  const out = { triggers: [], reached: [] };
  // A per-PC counter has no thresholds (spec 14.8).
  for (const counter of allCounters(system)) if (!counter.perPc) noteReached(counter, settleThresholds(counter.thresholds, counter.direction, counter.value), out);
  return { triggers: out.triggers };
}

export function endRun(system) {
  if (system.run.status !== "active") return false;
  system.run.status = "finished";
}

/** Back to unspent. Edits made during the run, such as a changed DC, stay. */
export function resetRun(system) {
  if (system.run.status === "inactive") return false;
  // A damaged baseline, as an imported file could hold, must not stop the challenge going back to not started.
  try {
    if (system.run.baseline) restoreBaseline(system, system.run.baseline);
  } catch (error) {
    console.warn("pf2e-subsystems-framework | Could not restore a challenge's start values", error);
  }
  Object.assign(system.run, { status: "inactive", acted: [], roundHistory: [], baseline: null });
}

/* -------------------------------------------- */
/*  Rounds and counters                          */
/* -------------------------------------------- */

/**
 * Change a counter inside its limits. On a per-PC counter it is `actorId`'s value; with no actor nothing changes.
 * A move in its direction marks the thresholds it reaches, and adds them to `out` as notices.
 * Returns false if the value didn't move.
 */
function adjustCounter(system, counter, delta, out, actorId = "") {
  if (counter.perPc && !actorId) return false;
  const before = counterValueOf(counter, actorId);
  const after = limitTrack(counter, before + delta);
  if (after === before) return false;
  rememberCounter(system, counter);
  // A per-PC counter has no thresholds (spec 14.8).
  if (counter.perPc) {
    counter.valueBy = { ...counter.valueBy, [actorId]: after };
    return true;
  }
  counter.value = after;
  if (!movesOn(counter.direction, after - before)) return true;
  noteReached(counter, settleThresholds(counter.thresholds, counter.direction, after), out);
  return true;
}

/** Add a counter's newly reached thresholds to `out` as notices. */
function noteReached(counter, thresholds, out) {
  const name = counter.name || say("SSM.Challenge.UnnamedCounter");
  for (const threshold of thresholds) {
    out.triggers.push({ counter: name, value: threshold.points, note: threshold.gmText });
    out.reached.push(threshold.id);
  }
}

/** The language key for a reached counter threshold's notice, which depends on whether it has GM text. */
export const triggerKey = (trigger) => (trigger.note ? "SSM.Challenge.TriggerNotice" : "SSM.Challenge.TriggerNoticeBare");

/** Add to or remove from a counter, the challenge's or a subject's, from the sheet; on a per-PC counter, from `actorId`'s value. Returns the thresholds reached, as notices. */
export function changeCounter(system, id, delta, actorId = "") {
  const counter = findCounter(system, id)?.counter;
  if (!isRunning(system) || !counter) return false;
  const out = { triggers: [], reached: [] };
  if (!adjustCounter(system, counter, delta, out, actorId)) return false;
  return { triggers: out.triggers };
}

/** Whether the challenge counts rounds. A maximum of 0 means it has none, as a campaign-long challenge such as Reputation: no round, no round buttons, no acted marks. */
export const hasRounds = (system) => system.rounds.max !== 0;

/** Whether Next round does anything. The GM window and the panel both disable the button when it doesn't. A blank maximum means no limit. */
export const canAdvanceRound = (system) => system.run.status === "active" && hasRounds(system) && (system.rounds.max === null || system.rounds.current < system.rounds.max);

/** Whether Previous round does anything: there is an advance to undo. */
export const canUndoRound = (system) => system.run.status === "active" && system.run.roundHistory.length > 0;

/** Move to the next round. Each counter with a change each round takes it, a subject's included; a per-PC counter has none (spec 14.13). Returns the counter thresholds reached, as notices. */
export function advanceRound(system) {
  if (!canAdvanceRound(system)) return false;
  const out = { triggers: [], reached: [] };
  const counters = {};
  for (const counter of allCounters(system)) {
    if (!counter.perRound || counter.perPc) continue;
    const before = counter.value;
    if (adjustCounter(system, counter, counter.perRound, out)) counters[counter.id] = before;
  }
  system.run.roundHistory.push({ round: system.rounds.current, acted: system.run.acted, counters, reached: out.reached });
  system.run.acted = [];
  system.rounds.current += 1;
  return { triggers: out.triggers };
}

/** Undo a round advance: bring back that round's acted markers, take back the counters' change, and clear the thresholds it reached. */
export function undoRound(system) {
  if (!canUndoRound(system)) return false;
  const last = system.run.roundHistory.pop();
  system.rounds.current = last.round;
  system.run.acted = last.acted;
  for (const counter of allCounters(system)) {
    if (counter.id in (last.counters ?? {})) counter.value = last.counters[counter.id];
    if (counter.direction === BOTH_WAYS) settleThresholds(counter.thresholds, BOTH_WAYS, counter.value);
    else for (const threshold of counter.thresholds) if ((last.reached ?? []).includes(threshold.id)) threshold.reached = false;
  }
}

export function toggleActed(system, actorId) {
  const { acted } = system.run;
  const at = acted.indexOf(actorId);
  if (at >= 0) acted.splice(at, 1);
  else acted.push(actorId);
}

/* -------------------------------------------- */
/*  Reveal                                       */
/* -------------------------------------------- */

/** A counter, subject, check or modifier entry by id. Thresholds have their own reveal, above. */
function findEntry(system, id) {
  const counter = findCounter(system, id)?.counter;
  if (counter) return counter;
  for (const modifier of system.modifiers ?? []) if (modifier.id === id) return modifier;
  for (const subject of system.subjects) {
    if (subject.id === id) return subject;
    const row = [...allChecks(subject), ...subject.modifiers].find((candidate) => candidate.id === id);
    if (row) return row;
  }
  return null;
}

/** Reveal or hide one entry. Clicking again undoes it. */
export function toggleReveal(system, id) {
  const entry = findEntry(system, id);
  if (!entry) return false;
  if (findCounter(system, id)) rememberCounter(system, entry);
  entry.revealed = !entry.revealed;
  if (entry.revealed && system.subjects.includes(entry)) revealOnly(system, entry);
}

/* -------------------------------------------- */
/*  Rolls                                        */
/* -------------------------------------------- */

/** The subject and check a roll names, or null if either is gone. */
function rollTargetOf(system, roll) {
  const subject = subjectById(system, roll.subjectId);
  const action = subject?.actions.find((candidate) => candidate.id === roll.actionId);
  const check = action?.checks.find((candidate) => candidate.id === roll.checkId);
  return check ? { subject, check } : null;
}

/** Spend the one-time entries that changed this roll's DC. Only a roll at the current DC used them: a roll at any other DC, such as an old chat link, leaves them for the next check. */
function spendDcEntries(system, subject, check, dc) {
  if (dc === null || dc === undefined || dc !== currentDc(system, subject, check)) return;
  // A one-time challenge-level entry is spent by the next matching check anywhere (spec 14.7).
  for (const { modifier } of liveDcModifiers(system, subject, check)) if (isOneTime(modifier)) modifier.spent = true;
}

/**
 * Take in a roll as it arrives. This is all a roll does: no roll changes points or counters; the GM does that by hand (spec 14.8).
 * Returns false when it changes nothing: the roll doesn't belong to a running challenge, or it's a reroll.
 * The PC is marked as having acted, and the roll spends the one-time DC entries it used, so the next check gets the normal DC.
 * A reroll does neither again. If the roll shouldn't have spent an entry, the GM restores it by hand.
 */
export function receiveRoll(system, roll) {
  const target = rollTargetOf(system, roll);
  if (system.run.status !== "active" || !target || roll.isReroll) return false;
  if (roll.actorId && !system.run.acted.includes(roll.actorId)) system.run.acted.push(roll.actorId);
  spendDcEntries(system, target.subject, target.check, roll.dc ?? null);
}

/* -------------------------------------------- */
/*  Modifier entries                             */
/* -------------------------------------------- */

/** A modifier entry: a subject's, or the challenge's own for an empty subject id. */
function findModifier(system, subjectId, id) {
  return modifierList(system, subjectId)?.find((modifier) => modifier.id === id) ?? null;
}

const isRunning = (system) => system.run.status === "active";

/** Turn an entry on or off. A spent entry has to be restored first. */
export function toggleModifier(system, subjectId, id) {
  const modifier = findModifier(system, subjectId, id);
  if (!isRunning(system) || !modifier || modifier.spent) return false;
  modifier.active = !modifier.active;
}

/** Make a spent entry usable again. */
export function restoreModifier(system, subjectId, id) {
  const modifier = findModifier(system, subjectId, id);
  if (!isRunning(system) || !modifier || !canRestoreModifier(modifier)) return false;
  modifier.spent = false;
}

/** The roll-option slug of a Lore skill's name, using PF2e's sluggify. "Warfare" and "Warfare Lore" both give "warfare-lore". */
export function loreSlug(name, sluggify) {
  const slug = sluggify(name);
  return /\blore\b/.test(slug.replaceAll("-", " ")) ? slug : `${slug}-lore`;
}
