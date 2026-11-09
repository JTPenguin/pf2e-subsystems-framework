/*
 * The rules for running an Influence challenge. Each function changes a plain copy of the source data.
 * A function that returns false changed nothing. No Foundry document calls, so tools/test.mjs can check them.
 */

export const OUTCOMES = ["criticalSuccess", "success", "failure", "criticalFailure"];

const SUGGESTED_POINTS = { criticalSuccess: 2, success: 1, failure: 0, criticalFailure: -1 };

/** Influence Points suggested for a degree of success. */
export const suggestedPoints = (outcome) => SUGGESTED_POINTS[outcome] ?? 0;

/** The DC to roll against. Phase 2b adds modifiers here. */
export const currentDc = (npc, row) => row.dc;

const say = (key, data) => globalThis.game?.i18n?.format(key, data) ?? key;
const signed = (n) => (n > 0 ? `+${n}` : `${n}`.replace("-", "−"));

function addLog(system, type, key, data) {
  system.run.log.push({ id: foundry.utils.randomID(), at: Date.now(), round: system.rounds.current, type, text: say(key, data) });
}

const npcById = (system, id) => system.npcs.find((npc) => npc.id === id);
const npcName = (npc) => npc.name || say("SSM.Influence.NPC");

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
  system.rounds.current = baseline.round;
  for (const npc of system.npcs) {
    const saved = baseline.npcs[npc.id];
    if (saved) npc.points = saved.points;
    for (const list of Object.keys(NPC_ROW_STATE)) for (const row of npc[list]) Object.assign(row, saved?.rows[row.id]);
    // A threshold added during the run has no saved state, but it can't have been reached before the run.
    for (const row of npc.thresholds) if (!saved?.rows[row.id]) row.reached = false;
  }
  for (const counter of system.counters) Object.assign(counter, baseline.counters[counter.id]);
}

export function startRun(system) {
  if (system.run.status !== "inactive") return false;
  system.run.baseline = takeBaseline(system);
  system.rounds.current = Math.max(1, system.rounds.current);
  system.run.status = "active";
  addLog(system, "run", "SSM.Influence.Log.Started");
}

export function endRun(system) {
  if (system.run.status !== "active") return false;
  system.run.status = "finished";
  addLog(system, "run", "SSM.Influence.Log.Ended");
}

/** Back to unspent. Edits made during the run, such as a changed DC, stay. */
export function resetRun(system) {
  if (system.run.status === "inactive") return false;
  if (system.run.baseline) restoreBaseline(system, system.run.baseline);
  Object.assign(system.run, { status: "inactive", acted: [], log: [], roundHistory: [], pending: [], appliedRolls: [], baseline: null });
}

export function advanceRound(system) {
  if (system.run.status !== "active" || system.rounds.current >= system.rounds.max) return false;
  system.run.roundHistory.push({ round: system.rounds.current, acted: system.run.acted });
  system.run.acted = [];
  system.rounds.current += 1;
  addLog(system, "round", "SSM.Influence.Log.Round", { round: system.rounds.current });
}

/** Undo a round advance, and bring back that round's acted markers. */
export function undoRound(system) {
  const last = system.run.roundHistory.at(-1);
  if (system.run.status !== "active" || !last) return false;
  system.run.roundHistory.pop();
  system.rounds.current = last.round;
  system.run.acted = last.acted;
  addLog(system, "round", "SSM.Influence.Log.RoundUndone", { round: last.round });
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

/** Add or remove points, marking any thresholds that are reached and writing the log. */
export function changePoints(system, npcId, delta, actorName = "") {
  const npc = npcById(system, npcId);
  if (!npc) return false;
  npc.points += delta;
  const key = actorName ? "SSM.Influence.Log.PointsFromRoll" : "SSM.Influence.Log.Points";
  addLog(system, "points", key, { npc: npcName(npc), delta: signed(delta), total: npc.points, actor: actorName });
  if (delta > 0) {
    for (const threshold of markReachedThresholds(npc)) {
      addLog(system, "threshold", "SSM.Influence.Log.Threshold", { npc: npcName(npc), points: threshold.points, text: threshold.playerText || threshold.gmText });
    }
  }
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
export function toggleReveal(system, id, label) {
  const entry = findEntry(system, id);
  if (!entry) return false;
  entry.revealed = !entry.revealed;
  addLog(system, "reveal", entry.revealed ? "SSM.Influence.Log.Revealed" : "SSM.Influence.Log.Hidden", { entry: label });
}

/**
 * Take in a roll result. Returns what happened: "added", "replaced" or "afterApply", or false when the roll doesn't belong to a running challenge.
 * A reroll replaces its pending item. If that roll was already applied, the GM adjusts by hand, so it only writes the log.
 * A reroll of an ignored roll comes back as a new item: the GM hasn't used that result.
 * After End, only a reroll of a still-pending item is taken, so that item doesn't keep its old result.
 */
export function receiveRoll(system, roll) {
  const npc = npcById(system, roll.npcId);
  if (system.run.status === "inactive" || !npc) return false;
  const known = [...npc.discovery, ...npc.influence].some((row) => row.id === roll.entryId);
  if (!known) return false;

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
    if (system.run.appliedRolls.includes(roll.rollId)) {
      addLog(system, "reroll", "SSM.Influence.Log.RerollAfterApply", { actor: roll.actorName, total });
      return "afterApply";
    }
  }
  system.run.pending.push({
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

/** Confirm a result. Influence changes points by amount, or the suggestion if none is given. Discover has no points, as the GM reveals by hand. */
export function applyPending(system, id, amount) {
  const item = takePending(system, id);
  if (!item) return false;
  system.run.appliedRolls.push(item.rollId);
  if (item.kind === "influence") changePoints(system, item.npcId, amount ?? suggestedPoints(item.outcome), item.actorName);
  else addLog(system, "discover", "SSM.Influence.Log.Discover", { actor: item.actorName, npc: npcName(npcById(system, item.npcId) ?? {}) });
}

export function ignorePending(system, id) {
  return takePending(system, id) ? undefined : false;
}

/** The roll-option slug of a Lore skill's name, using PF2e's sluggify. "Warfare" and "Warfare Lore" both give "warfare-lore". */
export function loreSlug(name, sluggify) {
  const slug = sluggify(name);
  return /\blore\b/.test(slug.replaceAll("-", " ")) ? slug : `${slug}-lore`;
}
