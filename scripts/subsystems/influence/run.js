/*
 * The rules for running an Influence challenge. Each function changes a plain copy of the source data.
 * A function that returns false changed nothing. No Foundry document calls, so tools/test.mjs can check them.
 */

import { clampCounters, limitCounter } from "./data.js";

export const OUTCOMES = ["criticalSuccess", "success", "failure", "criticalFailure"];

const SUGGESTED_POINTS = { criticalSuccess: 2, success: 1, failure: 0, criticalFailure: -1 };

/** Influence Points suggested for a degree of success. */
export const suggestedPoints = (outcome) => SUGGESTED_POINTS[outcome] ?? 0;

const isOneTime = (modifier) => modifier.duration === "oneTime";
const hasDcEffect = (modifier) => modifier.effects.some((effect) => effect.type === "dc");
const otherEffects = (modifier) => modifier.effects.filter((effect) => effect.type !== "dc");
const effectMatches = (effect, row) => effect.type === "dc" && effect.amount !== 0 && (effect.allSkills || effect.skills.includes(row.id));

/** The one-time entries a pending roll has already taken. */
const claimedIds = (system) => new Set(system.run.pending.flatMap((item) => item.claims ?? []));

/** The entries changing this skill's DC for the next check: on, unspent, and for a one-time entry, not taken by a pending roll. */
function liveDcModifiers(system, npc, row) {
  const claimed = claimedIds(system);
  return npc.modifiers.filter((modifier) => modifier.active && !modifier.spent && !(isOneTime(modifier) && claimed.has(modifier.id)) && modifier.effects.some((effect) => effectMatches(effect, row)));
}

/** The DC the next check against this skill rolls against. */
export function currentDc(system, npc, row) {
  const change = liveDcModifiers(system, npc, row).flatMap((modifier) => modifier.effects).filter((effect) => effectMatches(effect, row)).reduce((sum, effect) => sum + effect.amount, 0);
  return Math.max(0, row.dc + change);
}

/** Whether Apply has anything to do: the entry is on, has an effect other than a DC change, and hasn't used it up. */
export function canApplyModifier(modifier) {
  if (!modifier.active || !otherEffects(modifier).length) return false;
  return !isOneTime(modifier) || !(modifier.applied || (modifier.spent && !hasDcEffect(modifier)));
}

export const canRestoreModifier = (modifier) => modifier.spent || (isOneTime(modifier) && modifier.applied);

/** True while a pending roll will spend this one-time entry when it's confirmed. */
export const isClaimed = (system, id) => claimedIds(system).has(id);

const say = (key, data) => globalThis.game?.i18n?.format(key, data) ?? key;

const npcById = (system, id) => system.npcs.find((npc) => npc.id === id);

/** Every entry with a reveal flag, and the NPC lists whose state a reset restores. */
const NPC_ROW_STATE = { discovery: ["revealed"], influence: ["revealed"], thresholds: ["revealed", "reached"], modifiers: ["active", "spent", "revealed"] };
const COUNTER_STATE = ["value", "revealed"];
const pick = (row, fields) => Object.fromEntries(fields.map((field) => [field, row[field]]));

function takeBaseline(system) {
  const rows = (npc) => Object.fromEntries(Object.entries(NPC_ROW_STATE).flatMap(([list, fields]) => npc[list].map((row) => [row.id, pick(row, fields)])));
  return {
    round: system.rounds.current,
    npcs: Object.fromEntries(system.npcs.map((npc) => [npc.id, { points: npc.points, rows: rows(npc) }])),
    counters: Object.fromEntries(system.counters.map((counter) => [counter.id, pick(counter, COUNTER_STATE)])),
  };
}

function restoreBaseline(system, baseline) {
  system.rounds.current = baseline.round ?? system.rounds.current;
  for (const npc of system.npcs) {
    const saved = baseline.npcs?.[npc.id];
    npc.points = saved?.points ?? npc.points;
    // A row added during the run has no saved state. It goes back to hidden, as it can't have been revealed before the run.
    for (const list of Object.keys(NPC_ROW_STATE)) for (const row of npc[list]) Object.assign(row, saved?.rows?.[row.id] ?? { revealed: false });
    for (const row of npc.thresholds) if (!saved?.rows?.[row.id]) row.reached = false;
    // Likewise a modifier entry added during the run starts off and unspent. No entry has its effects applied at Start.
    for (const row of npc.modifiers) {
      row.applied = false;
      if (!saved?.rows?.[row.id]) Object.assign(row, { active: false, spent: false });
    }
  }
  for (const counter of system.counters) Object.assign(counter, baseline.counters?.[counter.id]);
  clampCounters(system);
}

/** A counter added during the run has no saved state, so save it just before the run first changes it. */
function rememberCounter(system, counter) {
  const saved = system.run.baseline?.counters;
  if (saved && !saved[counter.id]) saved[counter.id] = pick(counter, COUNTER_STATE);
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
  system.rounds.max = Math.max(1, system.rounds.max - (system.run.roundsAdded ?? 0));
  Object.assign(system.run, { status: "inactive", acted: [], roundHistory: [], pending: [], appliedRolls: [], baseline: null, roundsAdded: 0 });
}

export function advanceRound(system) {
  if (system.run.status !== "active" || system.rounds.current >= system.rounds.max) return false;
  system.run.roundHistory.push({ round: system.rounds.current, acted: system.run.acted });
  system.run.acted = [];
  system.rounds.current += 1;
}

/** Undo a round advance, and bring back that round's acted markers. */
export function undoRound(system) {
  const last = system.run.roundHistory.at(-1);
  if (system.run.status !== "active" || !last) return false;
  system.run.roundHistory.pop();
  system.rounds.current = last.round;
  system.run.acted = last.acted;
}

export function toggleActed(system, actorId) {
  const { acted } = system.run;
  const at = acted.indexOf(actorId);
  if (at >= 0) acted.splice(at, 1);
  else acted.push(actorId);
}

/** Thresholds the NPC's points have just reached. A threshold stays reached if points later fall. */
export function markReachedThresholds(npc) {
  const reached = npc.thresholds.filter((threshold) => !threshold.reached && npc.points >= threshold.points);
  for (const threshold of reached) threshold.reached = true;
  return reached;
}

/** Add or remove points, marking any thresholds that are reached. */
export function changePoints(system, npcId, delta) {
  const npc = npcById(system, npcId);
  if (!npc) return false;
  npc.points += delta;
  if (delta > 0) markReachedThresholds(npc);
}

function findEntry(system, id) {
  for (const counter of system.counters) if (counter.id === id) return counter;
  for (const npc of system.npcs) {
    for (const list of Object.keys(NPC_ROW_STATE)) {
      const row = npc[list].find((candidate) => candidate.id === id);
      if (row) return row;
    }
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

/**
 * Take in a roll result. Returns what happened: "added", "replaced" or "afterApply", or false when the roll doesn't belong to a running challenge.
 * A reroll replaces its pending item. If that roll was already applied, the GM adjusts by hand, so nothing changes here.
 * A reroll of an ignored roll comes back as a new item: the GM hasn't used that result.
 * After End, only a reroll of a still-pending item is taken, so that item doesn't keep its old result.
 */
export function receiveRoll(system, roll) {
  const npc = npcById(system, roll.npcId);
  if (system.run.status === "inactive" || !npc) return false;
  const row = [...npc.discovery, ...npc.influence].find((candidate) => candidate.id === roll.entryId);
  if (!row) return false;

  const { messageId, total, outcome } = roll;
  if (roll.isReroll) {
    const pending = system.run.pending.find((item) => item.rollId === roll.rollId);
    if (pending) {
      Object.assign(pending, { messageId, total, outcome });
      return "replaced";
    }
  }
  if (system.run.status !== "active") return false;
  if (roll.isReroll) {
    if (system.run.appliedRolls.includes(roll.rollId)) return "afterApply";
  }
  // The roll takes the one-time entries only if it really used them. A roll at any other DC, such as an old chat link, leaves them for the next check.
  const expectedDc = currentDc(system, npc, row);
  const dc = roll.dc ?? null;
  const claims = dc === expectedDc ? liveDcModifiers(system, npc, row).filter(isOneTime).map((modifier) => modifier.id) : [];
  system.run.pending.push({
    dc, expectedDc, claims,
    id: foundry.utils.randomID(), rollId: roll.rollId, messageId, kind: roll.kind, npcId: roll.npcId, entryId: roll.entryId,
    actorId: roll.actorId, actorName: roll.actorName, total, outcome, round: system.rounds.current,
  });
  if (!roll.isReroll && roll.actorId && !system.run.acted.includes(roll.actorId)) system.run.acted.push(roll.actorId);
  return "added";
}

function takePending(system, id) {
  const at = system.run.pending.findIndex((item) => item.id === id);
  return at < 0 ? null : system.run.pending.splice(at, 1)[0];
}

/** Spend the one-time entries a confirmed roll took. Turning an entry off releases it, so an entry that is off isn't spent. */
function spendClaims(system, item) {
  const npc = npcById(system, item.npcId);
  for (const id of item.claims ?? []) {
    const modifier = npc?.modifiers.find((candidate) => candidate.id === id);
    if (!modifier || !isOneTime(modifier) || !modifier.active || modifier.spent) continue;
    modifier.spent = true;
  }
}

/** Confirm a result. Influence changes points by amount, or the suggestion if none is given. Discover has no points, as the GM reveals by hand. */
export function applyPending(system, id, amount) {
  const item = takePending(system, id);
  if (!item) return false;
  system.run.appliedRolls.push(item.rollId);
  spendClaims(system, item);
  if (item.kind === "influence") changePoints(system, item.npcId, amount ?? suggestedPoints(item.outcome));
}

export function ignorePending(system, id) {
  return takePending(system, id) ? undefined : false;
}

function findModifier(system, npcId, id) {
  return npcById(system, npcId)?.modifiers.find((modifier) => modifier.id === id) ?? null;
}

const isRunning = (system) => system.run.status === "active";

/** Turn an entry on or off. A spent entry has to be restored first. Turning one off releases it from any pending roll. */
export function toggleModifier(system, npcId, id) {
  const modifier = findModifier(system, npcId, id);
  if (!isRunning(system) || !modifier || modifier.spent) return false;
  modifier.active = !modifier.active;
  if (!modifier.active) for (const item of system.run.pending) item.claims = (item.claims ?? []).filter((claim) => claim !== id);
}

/** Make a spent or applied entry usable again. Effects it already made stay; the GM reverses those by hand. */
export function restoreModifier(system, npcId, id) {
  const modifier = findModifier(system, npcId, id);
  if (!isRunning(system) || !modifier || !canRestoreModifier(modifier)) return false;
  Object.assign(modifier, { spent: false, applied: false });
}

/** Add to or remove from the maximum, never below the current round or 1. Undo only moves the current round back, so it can't fall out of step. */
function changeRounds(system, delta) {
  const before = system.rounds.max;
  system.rounds.max = Math.max(1, system.rounds.current, before + delta);
  const change = system.rounds.max - before;
  if (!change) return;
  system.run.roundsAdded = (system.run.roundsAdded ?? 0) + change;
}

/** Change a counter inside its limits. Adds any trigger the value reached or passed to `triggers`. Returns false if the value didn't move. */
function adjustCounter(system, counter, delta, triggers) {
  const before = counter.value;
  const after = limitCounter(counter, before + delta);
  if (after === before) return false;
  rememberCounter(system, counter);
  counter.value = after;
  const name = counter.name || say("SSM.Influence.UnnamedCounter");
  for (const trigger of counter.triggers) {
    const reached = trigger.value !== before && ((before < trigger.value && trigger.value <= after) || (after <= trigger.value && trigger.value < before));
    if (!reached) continue;
    const hit = { counter: name, value: trigger.value, note: trigger.gmNote };
    triggers.push(hit);
  }
}

/** The language key for a trigger's notice, which depends on whether it has a note. */
export const triggerKey = (trigger) => (trigger.note ? "SSM.Influence.TriggerNotice" : "SSM.Influence.TriggerNoticeBare");

/** Add to or remove from a counter from Run mode. Returns the triggers reached. */
export function changeCounter(system, id, delta) {
  const counter = system.counters.find((candidate) => candidate.id === id);
  if (!isRunning(system) || !counter) return false;
  const triggers = [];
  if (adjustCounter(system, counter, delta, triggers) === false) return false;
  return { triggers };
}

/** Make an entry's effects other than DC changes happen. A one-time entry with no DC change is then spent; one with a DC change is spent when its check is confirmed. */
export function applyModifier(system, npcId, id) {
  const modifier = findModifier(system, npcId, id);
  if (!isRunning(system) || !modifier || !canApplyModifier(modifier)) return false;
  const triggers = [];
  for (const effect of otherEffects(modifier)) {
    if (effect.type === "points" && effect.amount) changePoints(system, npcId, effect.amount);
    if (effect.type === "rounds" && effect.amount) changeRounds(system, effect.amount);
    if (effect.type === "counter") {
      const counter = system.counters.find((candidate) => candidate.id === effect.counterId);
      if (counter) adjustCounter(system, counter, effect.amount, triggers);
    }
  }
  if (isOneTime(modifier)) {
    modifier.applied = true;
    if (!hasDcEffect(modifier)) modifier.spent = true;
  }
  return { triggers };
}

/** The roll-option slug of a Lore skill's name, using PF2e's sluggify. "Warfare" and "Warfare Lore" both give "warfare-lore". */
export function loreSlug(name, sluggify) {
  const slug = sluggify(name);
  return /\blore\b/.test(slug.replaceAll("-", " ")) ? slug : `${slug}-lore`;
}
