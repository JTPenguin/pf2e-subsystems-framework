/*
 * What players may see of an Influence challenge. No Foundry calls, so tools/test.mjs can check it.
 * Every entry is built field by field: a new field on the data can't reach players until it is added here.
 */

import { isUniversalDiscovery, isUniversalInfluence } from "./data.js";
import { currentDc } from "./run.js";

/** Scale for a bar when no goal has been revealed. Hidden thresholds must not set it: the bar would give the goal away. */
const DEFAULT_SCALE = 10;

const isVisible = (row) => row.revealed;

/** Universal skills always show, decoy or not. Any other shows only once revealed. */
const isVisibleDiscovery = (row) => isUniversalDiscovery(row) || row.revealed;
const isVisibleInfluence = (row) => isUniversalInfluence(row) || row.revealed;

function npcView(system, npc) {
  return {
    id: npc.id,
    name: npc.name,
    points: npc.points,
    discovery: npc.discovery.filter(isVisibleDiscovery).map((row) => ({ id: row.id, skill: row.skill, dc: currentDc(system, npc, row) })),
    influence: npc.influence.filter(isVisibleInfluence).map((row) => ({ id: row.id, skill: row.skill, lore: row.lore, dc: currentDc(system, npc, row) })),
    known: npc.modifiers.filter(isVisible).map((row) => ({ id: row.id, name: row.name, text: row.playerText })),
    thresholds: npc.thresholds.filter(isVisible).map((row) => ({ id: row.id, points: row.points, text: row.playerText, reached: !!row.reached })),
  };
}

/** The filtered copy. `party` is a list of { id, name }. */
export function buildPanelView({ name, system, party }) {
  return {
    name,
    rounds: { current: system.rounds.current, max: system.rounds.max },
    npcs: system.npcs.map((npc) => npcView(system, npc)),
    counters: system.counters.filter(isVisible).map((row) => ({ id: row.id, name: row.name, value: row.value })),
    party: party.map(({ id, name: pcName }) => ({ id, name: pcName, acted: system.run.acted.includes(id) })),
  };
}

/** The NPC and skill a panel click means, from the copy as it is now. Null if the skill is hidden or the panel has gone. */
export function findPanelRow(view, { npc: npcId, kind, id }) {
  const npc = view?.npcs.find((candidate) => candidate.id === npcId);
  const row = npc?.[kind === "influence" ? "influence" : "discovery"].find((candidate) => candidate.id === id);
  return row ? { npc, row, kind } : null;
}

/** How full an NPC's bar is, from 0 to 100, using only what players can see. Negative points fill it in the negative style. */
export function pointsBar(points, thresholds) {
  const goal = Math.max(0, ...thresholds.map((threshold) => threshold.points));
  const scale = Math.max(goal || DEFAULT_SCALE, Math.abs(points));
  return { percent: Math.round((Math.abs(points) / scale) * 100), negative: points < 0 };
}
