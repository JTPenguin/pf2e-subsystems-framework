/*
 * The rules for running an Influence challenge. Each function changes a plain copy of the source data.
 * A function that returns false changed nothing. No Foundry document calls, so tools/test.mjs can check them.
 */

import { clampCounters, limitCounter, migrateThreshold, nextThresholdReveal } from "./data.js";

export const OUTCOMES = ["criticalSuccess", "success", "failure", "criticalFailure"];

const SUGGESTED_POINTS = { criticalSuccess: 2, success: 1, failure: 0, criticalFailure: -1 };

/** Influence Points suggested for a degree of success. */
export const suggestedPoints = (outcome) => SUGGESTED_POINTS[outcome] ?? 0;

const isOneTime = (modifier) => modifier.duration === "oneTime";
const hasDcEffect = (modifier) => modifier.effects.some((effect) => effect.type === "dc");
const otherEffects = (modifier) => modifier.effects.filter((effect) => effect.type !== "dc");
const effectMatches = (effect, row) => effect.type === "dc" && effect.amount !== 0 && (effect.allSkills || effect.skills.includes(row.id));

/** The entries changing this skill's DC for the next check: on and unspent. */
function liveDcModifiers(npc, row) {
  return npc.modifiers.filter((modifier) => modifier.active && !modifier.spent && modifier.effects.some((effect) => effectMatches(effect, row)));
}

/** The DC the next check against this skill rolls against. */
export function currentDc(system, npc, row) {
  const change = liveDcModifiers(npc, row).flatMap((modifier) => modifier.effects).filter((effect) => effectMatches(effect, row)).reduce((sum, effect) => sum + effect.amount, 0);
  return Math.max(0, row.dc + change);
}

/** Whether Apply has anything to do: the entry is on, has an effect other than a DC change, and hasn't used it up. */
export function canApplyModifier(modifier) {
  if (!modifier.active || !otherEffects(modifier).length) return false;
  return !isOneTime(modifier) || !(modifier.applied || (modifier.spent && !hasDcEffect(modifier)));
}

export const canRestoreModifier = (modifier) => modifier.spent || (isOneTime(modifier) && modifier.applied);

const say = (key, data) => globalThis.game?.i18n?.format(key, data) ?? key;

const npcById = (system, id) => system.npcs.find((npc) => npc.id === id);

/** The NPC lists whose state a reset restores. Thresholds have a three-step `reveal`; the other entries a `revealed` flag. */
const NPC_ROW_STATE = { discovery: ["revealed"], influence: ["revealed"], thresholds: ["reveal", "reached"], modifiers: ["active", "spent", "revealed"] };
/** What a row added during the run goes back to on reset: hidden, as it can't have been revealed before the run. */
const HIDDEN = { discovery: { revealed: false }, influence: { revealed: false }, thresholds: { reveal: "hidden" }, modifiers: { revealed: false } };
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
    // A threshold saved before the three-step reveal holds `revealed`, so it is read as the new field.
    for (const list of Object.keys(NPC_ROW_STATE)) {
      for (const row of npc[list]) {
        const state = saved?.rows?.[row.id];
        Object.assign(row, state ? (list === "thresholds" ? migrateThreshold({ ...state }) : state) : HIDDEN[list]);
      }
    }
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
  Object.assign(system.run, { status: "inactive", acted: [], roundHistory: [], appliedRolls: [], receivedRolls: [], baseline: null, roundsAdded: 0 });
}

/** Whether Next round does anything. The GM window and the panel both disable the button when it doesn't. */
export const canAdvanceRound = (system) => system.run.status === "active" && system.rounds.current < system.rounds.max;

/** Whether Previous round does anything: there is an advance to undo. */
export const canUndoRound = (system) => system.run.status === "active" && system.run.roundHistory.length > 0;

export function advanceRound(system) {
  if (!canAdvanceRound(system)) return false;
  system.run.roundHistory.push({ round: system.rounds.current, acted: system.run.acted });
  system.run.acted = [];
  system.rounds.current += 1;
}

/** Undo a round advance, and bring back that round's acted markers. */
export function undoRound(system) {
  if (!canUndoRound(system)) return false;
  const last = system.run.roundHistory.at(-1);
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

/** Mark a threshold reached, or clear it, by hand. Dropping points never clears it. */
export function toggleReached(system, npcId, id) {
  const threshold = npcById(system, npcId)?.thresholds.find((row) => row.id === id);
  if (!threshold) return false;
  threshold.reached = !threshold.reached;
}

/** A counter, skill or modifier entry by id. Thresholds have their own reveal, below. */
function findEntry(system, id) {
  for (const counter of system.counters) if (counter.id === id) return counter;
  for (const npc of system.npcs) {
    for (const list of ["discovery", "influence", "modifiers"]) {
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

/** Step a threshold's reveal on: hidden, then its points, then its points and text, then hidden again. */
export function cycleThresholdReveal(system, npcId, id) {
  const threshold = npcById(system, npcId)?.thresholds.find((row) => row.id === id);
  if (!threshold) return false;
  threshold.reveal = nextThresholdReveal(threshold.reveal);
}

const rowOf = (npc, roll) => (roll.kind === "influence" ? npc?.influence : roll.kind === "discover" ? npc?.discovery : null)?.find((row) => row.id === roll.entryId) ?? null;

/** Spend the one-time entries that changed this roll's DC. Only a roll at the current DC used them: a roll at any other DC, such as an old chat link, leaves them for the next check. */
function spendDcEntries(system, npc, row, dc) {
  if (dc === null || dc === undefined || dc !== currentDc(system, npc, row)) return;
  for (const modifier of liveDcModifiers(npc, row)) if (isOneTime(modifier)) modifier.spent = true;
}

/**
 * Take in a roll as it arrives. Returns false when it changes nothing: the roll doesn't belong to a running challenge, or it's a reroll.
 * The PC is marked as having acted; a reroll doesn't mark them again.
 * The roll spends the one-time DC entries it used now, for Influence and Discover alike, so the next check gets the normal DC.
 * If the GM skips Apply on that roll, they Restore the entry by hand. The roll id is recorded so Apply knows its entries were already handled.
 */
export function receiveRoll(system, roll) {
  const npc = npcById(system, roll.npcId);
  const row = rowOf(npc, roll);
  if (system.run.status !== "active" || !row) return false;
  if (roll.isReroll) return false;
  if (roll.actorId && !system.run.acted.includes(roll.actorId)) system.run.acted.push(roll.actorId);
  system.run.receivedRolls ??= [];
  if (!system.run.receivedRolls.includes(roll.rollId)) {
    system.run.receivedRolls.push(roll.rollId);
    spendDcEntries(system, npc, row, roll.dc ?? null);
  }
}

/**
 * Why an Influence roll's Apply can't be used, or "" when it can.
 * "gone": the NPC or skill was removed. "notRunning": the challenge isn't active. "applied": this roll was applied.
 * "rerollAfterApply": this is a reroll of a roll that was already applied, so the GM changes points by hand.
 */
export function applyBlock(system, roll) {
  if (roll.kind !== "influence" || !rowOf(npcById(system, roll.npcId), roll)) return "gone";
  if (system.run.status !== "active") return "notRunning";
  if (system.run.appliedRolls.includes(roll.rollId)) return roll.isReroll ? "rerollAfterApply" : "applied";
  return "";
}

/**
 * Apply an Influence roll from its chat card: the suggested points for its outcome and any thresholds they reach.
 * Its one-time DC entries were spent when it arrived. Only a roll that arrived with no active GM online, so was never received, spends them here.
 * A roll and its reroll share a roll id, so a roll id counts once. Returns the points applied, or false if applyBlock says no.
 */
export function applyRoll(system, roll) {
  if (applyBlock(system, roll)) return false;
  const npc = npcById(system, roll.npcId);
  if (!(system.run.receivedRolls ?? []).includes(roll.rollId)) spendDcEntries(system, npc, rowOf(npc, roll), roll.dc ?? null);
  system.run.appliedRolls.push(roll.rollId);
  const points = suggestedPoints(roll.outcome);
  changePoints(system, npc.id, points);
  return { points };
}

function findModifier(system, npcId, id) {
  return npcById(system, npcId)?.modifiers.find((modifier) => modifier.id === id) ?? null;
}

const isRunning = (system) => system.run.status === "active";

/** Turn an entry on or off. A spent entry has to be restored first. */
export function toggleModifier(system, npcId, id) {
  const modifier = findModifier(system, npcId, id);
  if (!isRunning(system) || !modifier || modifier.spent) return false;
  modifier.active = !modifier.active;
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

/** Make an entry's effects other than DC changes happen. A one-time entry with no DC change is then spent; one with a DC change is spent when its check is applied. */
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
