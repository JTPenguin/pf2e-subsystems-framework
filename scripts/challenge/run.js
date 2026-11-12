/*
 * The rules for running a challenge (spec section 14). Each function changes a plain copy of the source data.
 * A function that returns false changed nothing. No Foundry document calls, so tools/test.mjs can check them.
 */

import { BOTH_WAYS, CHASE_LEAD, CHASE_STUCK, clampTracks, limitTrack, modifierList, nextThresholdReveal, OUTCOMES, skillKey } from "./data.js";

export { OUTCOMES };

const isOneTime = (modifier) => modifier.duration === "oneTime";
const hasDcEffect = (modifier) => modifier.effects.some((effect) => effect.type === "dc");
/** The effects Apply makes happen: all but DC changes. A challenge-level entry has no subject, so no points effect either (spec 14.7). */
const otherEffects = (modifier, challengeLevel = false) => modifier.effects.filter((effect) => effect.type !== "dc" && !(challengeLevel && effect.type === "points"));
/** A subject's entry names its checks by id; a challenge-level entry names skills, so it matches that skill on any subject (spec 14.7). */
const effectMatches = (effect, check, challengeLevel) => effect.type === "dc" && effect.amount !== 0 && (effect.allSkills || effect.skills.includes(challengeLevel ? skillKey(check) : check.id));

/** The entries changing this check's DC for the next roll: on and unspent, on the check's subject and on the challenge. Each is { modifier, challengeLevel }. */
function liveDcModifiers(system, subject, check) {
  const live = (list, challengeLevel) => list
    .filter((modifier) => modifier.active && !modifier.spent && modifier.effects.some((effect) => effectMatches(effect, check, challengeLevel)))
    .map((modifier) => ({ modifier, challengeLevel }));
  return [...live(subject.modifiers, false), ...live(system.modifiers ?? [], true)];
}

/** The DC change from reached thresholds. */
const thresholdDc = (thresholds) => thresholds.reduce((sum, threshold) => sum + (threshold.reached ? threshold.dc || 0 : 0), 0);

/**
 * The DC the next roll of this check is made against: its own DC, the live modifier entries (the subject's and the challenge's),
 * the subject's reached thresholds, and every counter's reached thresholds.
 */
export function currentDc(system, subject, check) {
  const modifiers = liveDcModifiers(system, subject, check)
    .flatMap(({ modifier, challengeLevel }) => modifier.effects.filter((effect) => effectMatches(effect, check, challengeLevel)))
    .reduce((sum, effect) => sum + effect.amount, 0);
  const counters = system.counters.reduce((sum, counter) => sum + thresholdDc(counter.thresholds), 0);
  return Math.max(0, check.dc + modifiers + thresholdDc(subject.thresholds) + counters);
}

/** Whether Apply has anything to do: the entry is on, has an effect other than a DC change, and hasn't used it up. */
export function canApplyModifier(modifier, challengeLevel = false) {
  if (!modifier.active || !otherEffects(modifier, challengeLevel).length) return false;
  return !isOneTime(modifier) || !(modifier.applied || (modifier.spent && !hasDcEffect(modifier)));
}

export const canRestoreModifier = (modifier) => modifier.spent || (isOneTime(modifier) && modifier.applied);

const say = (key, data) => globalThis.game?.i18n?.format(key, data) ?? key;

const subjectById = (system, id) => system.subjects.find((subject) => subject.id === id);
const allChecks = (subject) => subject.actions.flatMap((action) => action.checks);

/* -------------------------------------------- */
/*  Tracks: a subject's points and a counter     */
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

/** Make every both-ways track's Reached follow its value, after any change, a form edit included. */
export function syncBothWays(system) {
  for (const subject of system.subjects) if (subject.direction === BOTH_WAYS && !subject.individual) settleThresholds(subject.thresholds, BOTH_WAYS, subject.points);
  for (const counter of system.counters) if (counter.direction === BOTH_WAYS && !counter.perPc) settleThresholds(counter.thresholds, BOTH_WAYS, counter.value);
}

/** A both-ways track has no goal. */
const hasGoal = (subject) => subject.goal !== null && subject.direction !== BOTH_WAYS;
const goalReached = (subject, value) => hasGoal(subject) && hasReached(subject.direction, value, subject.goal);

/** A PC's points on a subject. On an individual subject each PC starts from the subject's own points. */
export const pointsOf = (subject, actorId) => (subject.individual ? subject.pointsBy?.[actorId] ?? subject.points : subject.points);

/** A PC's value on a counter. On a per-PC counter each PC starts from the counter's own value. */
export const counterValueOf = (counter, actorId) => (counter.perPc ? counter.valueBy?.[actorId] ?? counter.value : counter.value);

/** The PCs a change for "everyone" reaches: the party, and any other PC who already has a value. */
const everyone = (partyIds, values) => [...new Set([...partyIds, ...Object.keys(values ?? {})])];

/** Whether a subject is complete. An individual one is complete once every PC in `partyIds` is. */
export function isComplete(subject, partyIds = []) {
  if (subject.complete) return true;
  return subject.individual && partyIds.length > 0 && partyIds.every((id) => subject.completeBy.includes(id));
}

/**
 * Add or remove a subject's points, inside its limits. On an individual subject they are `actorId`'s points; with no actor nothing changes.
 * A move in the track's direction marks the thresholds and the goal it reaches.
 * Returns what changed, for Undo: { delta, reached (threshold ids), completed }; or null if the points didn't move.
 */
function addPoints(subject, delta, actorId) {
  if (!subject.tracksPoints || !delta) return null;
  const before = pointsOf(subject, actorId);
  if (subject.individual && !actorId) return null;
  const value = limitTrack(subject, before + delta);
  if (value === before) return null;
  const done = { delta: value - before, reached: [], completed: false };
  const moving = movesOn(subject.direction, done.delta);
  if (subject.individual) {
    subject.pointsBy = { ...subject.pointsBy, [actorId]: value };
    if (moving && goalReached(subject, value) && !subject.completeBy.includes(actorId)) {
      subject.completeBy.push(actorId);
      done.completed = true;
    }
    return done;
  }
  subject.points = value;
  if (moving) {
    done.reached = settleThresholds(subject.thresholds, subject.direction, value).map((threshold) => threshold.id);
    if (goalReached(subject, value) && !subject.complete) {
      subject.complete = true;
      done.completed = true;
    }
  }
  return done;
}

/** Add or remove points from Run mode. */
export function changePoints(system, subjectId, delta, actorId = "") {
  const subject = subjectById(system, subjectId);
  if (!subject) return false;
  return addPoints(subject, delta, actorId) ? undefined : false;
}

/** Mark a subject complete, or clear it, by hand. With an actor, it is that PC's mark on an individual subject. */
export function toggleComplete(system, subjectId, actorId = "") {
  const subject = subjectById(system, subjectId);
  if (!subject) return false;
  if (!actorId) {
    subject.complete = !subject.complete;
    return;
  }
  const at = subject.completeBy.indexOf(actorId);
  if (at >= 0) subject.completeBy.splice(at, 1);
  else subject.completeBy.push(actorId);
}

/** The subject or counter that owns thresholds, by id. */
const thresholdOwner = (system, ownerId) => subjectById(system, ownerId) ?? system.counters.find((counter) => counter.id === ownerId) ?? null;

/** Mark a threshold reached, or clear it, by hand. A track moving back never clears it. On a both-ways track Reached follows the value, so the GM can't set it. */
export function toggleReached(system, ownerId, id) {
  const owner = thresholdOwner(system, ownerId);
  const threshold = owner?.thresholds.find((row) => row.id === id);
  if (!threshold || owner.direction === BOTH_WAYS) return false;
  if (system.counters.includes(owner)) rememberCounter(system, owner);
  threshold.reached = !threshold.reached;
}

/** Step a threshold's reveal on: hidden, then its points, then its points and text, then hidden again. */
export function cycleThresholdReveal(system, ownerId, id) {
  const owner = thresholdOwner(system, ownerId);
  const threshold = owner?.thresholds.find((row) => row.id === id);
  if (!threshold) return false;
  if (system.counters.includes(owner)) rememberCounter(system, owner);
  threshold.reveal = nextThresholdReveal(threshold.reveal);
}

/* -------------------------------------------- */
/*  Start, End and Reset                         */
/* -------------------------------------------- */

/** The subject rows whose state a reset restores, by list. Thresholds have a three-step `reveal`; the other rows a `revealed` flag. */
const ROW_STATE = { checks: ["revealed"], thresholds: ["reveal", "reached"], modifiers: ["active", "spent", "revealed"] };
/** What a row added during the run goes back to on reset: hidden, as it can't have been revealed before the run. */
const HIDDEN = { checks: { revealed: false }, thresholds: { reveal: "hidden", reached: false }, modifiers: { revealed: false, active: false, spent: false } };
const SUBJECT_STATE = ["points", "pointsBy", "complete", "completeBy", "revealed"];
const COUNTER_STATE = ["value", "valueBy", "noteBy", "revealed"];
const pick = (row, fields) => structuredClone(Object.fromEntries(fields.map((field) => [field, row[field]])));
const rowsOf = (subject, list) => (list === "checks" ? allChecks(subject) : subject[list]);

const counterBaseline = (counter) => ({
  ...pick(counter, COUNTER_STATE),
  rows: Object.fromEntries(counter.thresholds.map((row) => [row.id, pick(row, ROW_STATE.thresholds)])),
});

function takeBaseline(system) {
  const rows = (subject) => Object.fromEntries(Object.entries(ROW_STATE).flatMap(([list, fields]) => rowsOf(subject, list).map((row) => [row.id, pick(row, fields)])));
  return {
    round: system.rounds.current,
    subjects: Object.fromEntries(system.subjects.map((subject) => [subject.id, { ...pick(subject, SUBJECT_STATE), rows: rows(subject) }])),
    counters: Object.fromEntries(system.counters.map((counter) => [counter.id, counterBaseline(counter)])),
    modifiers: Object.fromEntries((system.modifiers ?? []).map((row) => [row.id, pick(row, ROW_STATE.modifiers)])),
  };
}

function restoreBaseline(system, baseline) {
  system.rounds.current = baseline.round ?? system.rounds.current;
  for (const subject of system.subjects) {
    const saved = baseline.subjects?.[subject.id];
    // A subject added during the run keeps its points, as nothing says what they were. Its per-PC state can only have come from the run.
    Object.assign(subject, saved ? pick(saved, SUBJECT_STATE) : { pointsBy: {}, complete: false, completeBy: [], revealed: false });
    for (const list of Object.keys(ROW_STATE)) {
      for (const row of rowsOf(subject, list)) Object.assign(row, saved?.rows?.[row.id] ?? HIDDEN[list]);
    }
    // No entry has its effects applied at Start, and no action has given points.
    for (const row of subject.modifiers) row.applied = false;
    for (const action of subject.actions) action.given = 0;
  }
  for (const counter of system.counters) {
    const saved = baseline.counters?.[counter.id];
    // A counter added during the run keeps its value; its per-PC values can only have come from the run.
    Object.assign(counter, saved ? pick(saved, COUNTER_STATE) : { valueBy: {} });
    counter.valueBy ??= {};
    counter.noteBy ??= {};
    for (const row of counter.thresholds) Object.assign(row, saved?.rows?.[row.id] ?? HIDDEN.thresholds);
  }
  for (const row of system.modifiers ?? []) Object.assign(row, baseline.modifiers?.[row.id] ?? HIDDEN.modifiers, { applied: false });
  clampTracks(system);
}

/** A counter added during the run has no saved state, so save it just before the run first changes it. */
function rememberCounter(system, counter) {
  const saved = system.run.baseline?.counters;
  if (saved && !saved[counter.id]) saved[counter.id] = counterBaseline(counter);
}

export function startRun(system) {
  if (system.run.status !== "inactive") return false;
  system.run.baseline = takeBaseline(system);
  system.rounds.current = Math.max(1, system.rounds.current);
  system.run.status = "active";
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
    console.warn("pf2e-subsystem-manager | Could not restore a challenge's start values", error);
  }
  if (system.rounds.max !== null) system.rounds.max = Math.max(1, system.rounds.max - (system.run.roundsAdded ?? 0));
  Object.assign(system.run, { status: "inactive", acted: [], roundHistory: [], appliedRolls: [], receivedRolls: [], baseline: null, roundsAdded: 0, chase: null });
}

/* -------------------------------------------- */
/*  Rounds and counters                          */
/* -------------------------------------------- */

/**
 * Change a counter inside its limits. On a per-PC counter it is `actorId`'s value; with no actor nothing changes.
 * A move in its direction marks the thresholds it reaches, and adds them to `out` as notices.
 * Returns what changed, for Undo: { delta, reached (threshold ids) }; or null if the value didn't move.
 */
function adjustCounter(system, counter, delta, out, actorId = "") {
  if (counter.perPc && !actorId) return null;
  const before = counterValueOf(counter, actorId);
  const after = limitTrack(counter, before + delta);
  if (after === before) return null;
  rememberCounter(system, counter);
  const done = { delta: after - before, reached: [] };
  // A per-PC counter has no thresholds (spec 14.8).
  if (counter.perPc) {
    counter.valueBy = { ...counter.valueBy, [actorId]: after };
    return done;
  }
  counter.value = after;
  if (!movesOn(counter.direction, done.delta)) return done;
  const name = counter.name || say("SSM.Challenge.UnnamedCounter");
  for (const threshold of settleThresholds(counter.thresholds, counter.direction, after)) {
    out.triggers.push({ counter: name, value: threshold.points, note: threshold.gmText });
    out.reached.push(threshold.id);
    done.reached.push(threshold.id);
  }
  return done;
}

/** The language key for a reached counter threshold's notice, which depends on whether it has GM text. */
export const triggerKey = (trigger) => (trigger.note ? "SSM.Challenge.TriggerNotice" : "SSM.Challenge.TriggerNoticeBare");

/** Add to or remove from a counter from Run mode; on a per-PC counter, from `actorId`'s value. Returns the thresholds reached, as notices. */
export function changeCounter(system, id, delta, actorId = "") {
  const counter = system.counters.find((candidate) => candidate.id === id);
  if (!isRunning(system) || !counter) return false;
  const out = { triggers: [], reached: [] };
  if (!adjustCounter(system, counter, delta, out, actorId)) return false;
  return { triggers: out.triggers };
}

/** Whether Next round does anything. The GM window and the panel both disable the button when it doesn't. A blank maximum means no limit. */
export const canAdvanceRound = (system) => system.run.status === "active" && (system.rounds.max === null || system.rounds.current < system.rounds.max);

/** Whether Previous round does anything: there is an advance to undo. */
export const canUndoRound = (system) => system.run.status === "active" && system.run.roundHistory.length > 0;

/** Move to the next round. Each counter with a change each round takes it; a per-PC counter has none. Returns the counter thresholds reached, as notices. */
export function advanceRound(system) {
  if (!canAdvanceRound(system)) return false;
  const out = { triggers: [], reached: [] };
  const counters = {};
  for (const counter of system.counters) {
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
  for (const counter of system.counters) {
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

/** Add to or remove from the maximum, never below the current round or 1. A challenge with no limit has none to change. Returns the actual change. */
function changeRounds(system, delta) {
  const before = system.rounds.max;
  if (before === null) return 0;
  system.rounds.max = Math.max(1, system.rounds.current, before + delta);
  const change = system.rounds.max - before;
  system.run.roundsAdded = (system.run.roundsAdded ?? 0) + change;
  return change;
}

/* -------------------------------------------- */
/*  Reveal                                       */
/* -------------------------------------------- */

/** A counter, subject, check or modifier entry by id. Thresholds have their own reveal, above. */
function findEntry(system, id) {
  for (const counter of system.counters) if (counter.id === id) return counter;
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
  if (system.counters.includes(entry)) rememberCounter(system, entry);
  entry.revealed = !entry.revealed;
}

/* -------------------------------------------- */
/*  Rolls                                        */
/* -------------------------------------------- */

/** The subject, action and check a roll names, or null if any of them is gone. */
function rollTargetOf(system, roll) {
  const subject = subjectById(system, roll.subjectId);
  const action = subject?.actions.find((candidate) => candidate.id === roll.actionId);
  const check = action?.checks.find((candidate) => candidate.id === roll.checkId);
  return check ? { subject, action, check } : null;
}

/** Spend the one-time entries that changed this roll's DC. Only a roll at the current DC used them: a roll at any other DC, such as an old chat link, leaves them for the next check. */
function spendDcEntries(system, subject, check, dc) {
  if (dc === null || dc === undefined || dc !== currentDc(system, subject, check)) return;
  // A one-time challenge-level entry is spent by the next matching check anywhere (spec 14.7).
  for (const { modifier } of liveDcModifiers(system, subject, check)) if (isOneTime(modifier)) modifier.spent = true;
}

/**
 * Take in a roll as it arrives. Returns false when it changes nothing: the roll doesn't belong to a running challenge, or it's a reroll.
 * The PC is marked as having acted; a reroll doesn't mark them again.
 * The roll spends the one-time DC entries it used now, so the next check gets the normal DC.
 * If the GM skips Apply on that roll, they Restore the entry by hand. The roll id is recorded so Apply knows its entries were already handled.
 */
export function receiveRoll(system, roll) {
  const target = rollTargetOf(system, roll);
  if (system.run.status !== "active" || !target) return false;
  if (roll.isReroll) return false;
  if (roll.actorId && !system.run.acted.includes(roll.actorId)) system.run.acted.push(roll.actorId);
  system.run.receivedRolls ??= [];
  if (!system.run.receivedRolls.includes(roll.rollId)) {
    system.run.receivedRolls.push(roll.rollId);
    spendDcEntries(system, target.subject, target.check, roll.dc ?? null);
  }
}

/**
 * What an outcome row does for a roll, before anything is changed: `changes` to apply, the row's `notes`, and whether the action's maximum cut a gain short.
 * `outcome` is the degree of success to plan; it defaults to the rolled one, and the GM can pick another (spec 14.8).
 * A change is { type, amount } with `counterId` and `counter` (its name) for a counter. A gain is a points or counter amount above zero;
 * the action's maximum points caps the gains it gives in total. A change of zero, or one for a missing counter, is left out.
 * Points on an individual subject and a per-PC counter's value are the roller's, so a roll with no actor changes neither.
 * Null if the roll's subject, action or check is gone.
 */
export function outcomePlan(system, roll, outcome = roll.outcome) {
  const target = rollTargetOf(system, roll);
  if (!target) return null;
  const { subject, action } = target;
  let room = action.maxPoints === null ? Infinity : Math.max(0, action.maxPoints - action.given);
  const plan = { outcome, changes: [], notes: [], capped: false };
  const gain = (amount) => {
    if (amount <= 0) return amount;
    const given = Math.min(amount, room);
    if (given < amount) plan.capped = true;
    room -= given;
    return given;
  };
  for (const effect of action.outcomes?.[outcome] ?? []) {
    if (effect.type === "note") {
      if (effect.note) plan.notes.push(effect.note);
    } else if (effect.type === "points") {
      if (!subject.tracksPoints || (subject.individual && !roll.actorId)) continue;
      const amount = gain(effect.amount);
      if (amount) plan.changes.push({ type: "points", amount });
    } else if (effect.type === "counter") {
      const counter = system.counters.find((candidate) => candidate.id === effect.counterId);
      if (!counter || (counter.perPc && !roll.actorId)) continue;
      const amount = gain(effect.amount);
      if (amount) plan.changes.push({ type: "counter", amount, counterId: counter.id, counter: counter.name });
    } else if (effect.type === "rounds" && effect.amount) {
      plan.changes.push({ type: "rounds", amount: effect.amount });
    }
  }
  return plan;
}

/**
 * Why a roll's Apply can't be used, or "" when it can.
 * "gone": the subject, action or check was removed. "notRunning": the challenge isn't active. "applied": this roll was applied.
 * "rerollAfterApply": this is a reroll of a roll that was already applied, so the GM changes points by hand.
 */
export function applyBlock(system, roll) {
  if (!rollTargetOf(system, roll)) return "gone";
  if (system.run.status !== "active") return "notRunning";
  if (system.run.appliedRolls.includes(roll.rollId)) return roll.isReroll ? "rerollAfterApply" : "applied";
  return "";
}

/**
 * Apply one degree's outcome row for a roll from its chat card: its changes, and the thresholds and goal they reach.
 * `outcome` defaults to the rolled degree; the GM's degree buttons can pick another (spec 14.8).
 * Its one-time DC entries were spent when it arrived. Only a roll that arrived with no active GM online, so was never received, spends them here.
 * A roll and its reroll share a roll id, so a roll id counts once.
 * Returns the plan applied, the counter notices and a `record` of exactly what changed, for Undo; or false if applyBlock says no.
 */
export function applyRoll(system, roll, outcome = roll.outcome) {
  if (applyBlock(system, roll) || !OUTCOMES.includes(outcome)) return false;
  const { subject, action, check } = rollTargetOf(system, roll);
  if (!(system.run.receivedRolls ?? []).includes(roll.rollId)) spendDcEntries(system, subject, check, roll.dc ?? null);
  system.run.appliedRolls.push(roll.rollId);
  const plan = outcomePlan(system, roll, outcome);
  const out = { triggers: [], reached: [] };
  const record = { rollId: roll.rollId, outcome, actorId: roll.actorId ?? "", subjectId: subject.id, actionId: action.id, given: 0, changes: [] };
  for (const change of plan.changes) {
    if (change.amount > 0 && change.type !== "rounds") record.given += change.amount;
    if (change.type === "points") {
      const done = addPoints(subject, change.amount, roll.actorId);
      if (done) record.changes.push({ type: "points", subjectId: subject.id, actorId: subject.individual ? roll.actorId : "", amount: done.delta, reached: done.reached, completed: done.completed });
    }
    if (change.type === "rounds") {
      const amount = changeRounds(system, change.amount);
      if (amount) record.changes.push({ type: "rounds", amount });
    }
    if (change.type === "counter") {
      const counter = system.counters.find((candidate) => candidate.id === change.counterId);
      const done = adjustCounter(system, counter, change.amount, out, roll.actorId);
      if (done) record.changes.push({ type: "counter", counterId: counter.id, actorId: counter.perPc ? roll.actorId : "", amount: done.delta, reached: done.reached });
    }
  }
  action.given += record.given;
  return { ...plan, triggers: out.triggers, record };
}

/** Why an applied result can't be undone, or "" when it can. "notRunning": the challenge isn't active. "notApplied": it was undone, or the run was reset since. */
export function undoBlock(system, record) {
  if (system.run.status !== "active") return "notRunning";
  if (!record || !system.run.appliedRolls.includes(record.rollId)) return "notApplied";
  return "";
}

/** Clear the thresholds an Apply marked Reached that the value is no longer past. */
function unreach(thresholds, ids, direction, value) {
  for (const threshold of thresholds) if (ids.includes(threshold.id) && !hasReached(direction, value, threshold.points)) threshold.reached = false;
}

/**
 * Undo one Apply (spec 14.8), from the record applyRoll returned. It reverses exactly what that Apply did: the actual change to each
 * subject's points and counter, the round maximum, the thresholds it marked Reached and the Complete it set if they are no longer reached,
 * the action's maximum-points tally and the roll id, so the roll can be applied again. Changes made since stay.
 * One-time DC entries the roll spent on arrival stay spent. Returns false if undoBlock says no.
 */
export function undoApply(system, record) {
  if (undoBlock(system, record)) return false;
  for (const change of record.changes ?? []) {
    if (change.type === "points") {
      const subject = subjectById(system, change.subjectId);
      if (!subject) continue;
      if (subject.individual) {
        if (!change.actorId) continue;
        const value = limitTrack(subject, pointsOf(subject, change.actorId) - change.amount);
        subject.pointsBy = { ...subject.pointsBy, [change.actorId]: value };
        if (change.completed && !goalReached(subject, value)) subject.completeBy = subject.completeBy.filter((id) => id !== change.actorId);
        continue;
      }
      subject.points = limitTrack(subject, subject.points - change.amount);
      unreach(subject.thresholds, change.reached ?? [], subject.direction, subject.points);
      if (change.completed && !goalReached(subject, subject.points)) subject.complete = false;
    } else if (change.type === "counter") {
      const counter = system.counters.find((candidate) => candidate.id === change.counterId);
      if (!counter) continue;
      rememberCounter(system, counter);
      if (counter.perPc) {
        if (change.actorId) counter.valueBy = { ...counter.valueBy, [change.actorId]: limitTrack(counter, counterValueOf(counter, change.actorId) - change.amount) };
        continue;
      }
      counter.value = limitTrack(counter, counter.value - change.amount);
      unreach(counter.thresholds, change.reached ?? [], counter.direction, counter.value);
    } else if (change.type === "rounds") {
      changeRounds(system, -change.amount);
    }
  }
  const action = subjectById(system, record.subjectId)?.actions.find((candidate) => candidate.id === record.actionId);
  if (action) action.given = Math.max(0, action.given - (record.given ?? 0));
  system.run.appliedRolls = system.run.appliedRolls.filter((id) => id !== record.rollId);
  syncBothWays(system);
}

/* -------------------------------------------- */
/*  Chases                                       */
/* -------------------------------------------- */

export const isChase = (system) => system.preset === "chase" && !!system.chase;

/** The party's obstacle in a chase: the first in order that isn't Complete, or null once every one is. Its `index` is its place in the order. */
export function currentObstacle(system) {
  const index = system.subjects.findIndex((subject) => !isComplete(subject));
  return index < 0 ? null : { subject: system.subjects[index], index };
}

/** The other side's counter in a chase, or null in Beat the Clock or when it was removed. */
export const chaseCounterOf = (system) => (isChase(system) && system.chase.type !== "beatClock" ? system.counters.find((counter) => counter.id === system.chase.counterId) ?? null : null);

/**
 * Where a chase stands. Positions are obstacle numbers from 1; past the last obstacle is `total` + 1.
 * `position` is the party's: the first obstacle not Complete. `other` is the other side's counter value, or null.
 * `end` is how it has ended, or "": the party "caught" the quarry, the quarry "escaped", the party was "caught" by pursuers or "escaped" them,
 * the party "cleared" the course in Beat the Clock, or the party "won" or the rival "lost" them a competitive chase.
 * Run Away's lead of three obstacles is checked only at the end of a round, in settleChase.
 */
export function chaseStatus(system) {
  const total = system.subjects.length;
  const current = currentObstacle(system);
  const position = current ? current.index + 1 : total + 1;
  const counter = chaseCounterOf(system);
  const other = counter ? counter.value : null;
  const type = system.chase.type;
  let end = "";
  if (type === "chaseDown") end = other !== null && position >= other ? "caughtQuarry" : other !== null && other > total ? "quarryEscaped" : "";
  else if (type === "runAway") end = position > total ? "escaped" : other !== null && other >= position ? "caught" : "";
  else if (type === "beatClock") end = position > total ? "cleared" : "";
  else if (type === "competitive") end = position > total ? "won" : other !== null && other > total ? "rivalWon" : "";
  return { type, total, position, other, counter: counter?.name ?? "", obstacle: current?.subject ?? null, end };
}

/**
 * Bring a running chase's notices up to date after any change. It keeps `run.chase`: the party's position, the round it got there,
 * the round last seen and how the chase ended, so each notice comes once. Returns notices, each { key, data }:
 * the chase's end; and when a round has moved on, Run Away's lead, an obstacle the party has been stuck on for three rounds,
 * the competitive chase's initiative reminder, and Beat the Clock's last round. Not a chase, or not running: no notices.
 */
export function settleChase(system) {
  if (!isChase(system) || system.run.status !== "active") return [];
  const status = chaseStatus(system);
  const round = system.rounds.current;
  const last = system.run.chase ?? { position: status.position, since: round, round, end: "" };
  const advanced = round > last.round;
  const notices = [];
  const since = status.position !== last.position ? round : round < last.since ? round : last.since;
  // The lead ends a chase at the end of a round, so it holds until that round is taken back.
  let end = status.end || (last.end === "lead" && round >= last.round ? "lead" : "");
  if (advanced && !end && status.type === "runAway" && status.other !== null && status.position - status.other >= CHASE_LEAD) end = "lead";
  if (advanced && !end) {
    if (status.obstacle && round - since === CHASE_STUCK) notices.push({ key: "SSM.Chase.Notice.Stuck", data: { rounds: CHASE_STUCK, obstacle: status.obstacle.name || `${system.subjectLabel} ${status.position}`.trim() } });
    if (status.type === "competitive") notices.push({ key: "SSM.Chase.Notice.Initiative", data: {} });
    if (status.type === "beatClock" && system.rounds.max !== null && round === system.rounds.max) notices.push({ key: "SSM.Chase.Notice.LastRound", data: {} });
  }
  if (end && end !== last.end) notices.unshift({ key: `SSM.Chase.End.${end}`, data: { other: status.counter } });
  system.run.chase = { position: status.position, since, round, end };
  return notices;
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

/** Make a spent or applied entry usable again. Effects it already made stay; the GM reverses those by hand. */
export function restoreModifier(system, subjectId, id) {
  const modifier = findModifier(system, subjectId, id);
  if (!isRunning(system) || !modifier || !canRestoreModifier(modifier)) return false;
  Object.assign(modifier, { spent: false, applied: false });
}

/**
 * Make an entry's effects other than DC changes happen. A one-time entry with no DC change is then spent; one with a DC change is spent when its check is rolled.
 * On an individual subject a points effect changes the points of every PC in `partyIds`, and of any other PC who already has points there.
 * A counter effect on a per-PC counter changes every such PC's value. A challenge-level entry (empty subject id) has no points effect.
 */
export function applyModifier(system, subjectId, id, partyIds = []) {
  const subject = subjectId ? subjectById(system, subjectId) : null;
  const modifier = findModifier(system, subjectId, id);
  const challengeLevel = !subjectId;
  if (!isRunning(system) || !modifier || !canApplyModifier(modifier, challengeLevel)) return false;
  const out = { triggers: [], reached: [] };
  for (const effect of otherEffects(modifier, challengeLevel)) {
    if (!effect.amount) continue;
    if (effect.type === "points") {
      const actors = subject.individual ? everyone(partyIds, subject.pointsBy) : [""];
      for (const actorId of actors) addPoints(subject, effect.amount, actorId);
    }
    if (effect.type === "rounds") changeRounds(system, effect.amount);
    if (effect.type === "counter") {
      const counter = system.counters.find((candidate) => candidate.id === effect.counterId);
      if (!counter) continue;
      for (const actorId of counter.perPc ? everyone(partyIds, counter.valueBy) : [""]) adjustCounter(system, counter, effect.amount, out, actorId);
    }
  }
  if (isOneTime(modifier)) {
    modifier.applied = true;
    if (!hasDcEffect(modifier)) modifier.spent = true;
  }
  return { triggers: out.triggers };
}

/** The roll-option slug of a Lore skill's name, using PF2e's sluggify. "Warfare" and "Warfare Lore" both give "warfare-lore". */
export function loreSlug(name, sluggify) {
  const slug = sluggify(name);
  return /\blore\b/.test(slug.replaceAll("-", " ")) ? slug : `${slug}-lore`;
}
