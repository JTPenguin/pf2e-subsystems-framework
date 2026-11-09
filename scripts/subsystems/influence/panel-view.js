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

/** A skill as players may see it: its name fields only, never its id or DC. */
const skillName = (row) => ({ skill: row.skill, lore: row.lore });

/**
 * What one effect does, in terms players may see, or null if it shows nothing. A DC change becomes the same change to the check
 * (DC −2 is +2 to the check), so no DC appears. A skill row players can't see is left out by name; `more` says some were.
 * A counter players can't see hides the whole effect. Notes are the GM's words, so they never show.
 */
function changeView(system, npc, effect) {
  if (!effect.amount) return null;
  if (effect.type === "dc") {
    if (effect.allSkills) return { type: "check", amount: -effect.amount, all: true, skills: [], more: false };
    const rows = [...npc.discovery.map((row) => [row, isVisibleDiscovery(row)]), ...npc.influence.map((row) => [row, isVisibleInfluence(row)])].filter(([row]) => effect.skills.includes(row.id));
    if (!rows.length) return null;
    // A Discovery and an Influence row can share a skill: name it once.
    const shown = [...new Map(rows.filter(([, visible]) => visible).map(([row]) => [`${row.skill}:${row.lore}`, skillName(row)])).values()];
    return { type: "check", amount: -effect.amount, all: false, skills: shown, more: rows.some(([, visible]) => !visible) };
  }
  if (effect.type === "points" || effect.type === "rounds") return { type: effect.type, amount: effect.amount };
  if (effect.type === "counter") {
    const counter = system.counters.find((candidate) => candidate.id === effect.counterId);
    return counter && isVisible(counter) ? { type: "counter", amount: effect.amount, counter: counter.name } : null;
  }
  return null;
}

/** A revealed weakness, resistance, penalty or adjustment, as a card on the panel. */
const modifierView = (system, npc, row) => ({
  id: row.id,
  name: row.name,
  text: row.playerText,
  kind: row.kind,
  duration: row.duration,
  active: !!row.active,
  spent: !!row.spent,
  // A one-time entry with a DC change is applied before it is spent: its other effects have happened, its DC change hasn't.
  applied: !!row.applied,
  changes: row.effects.map((effect) => changeView(system, npc, effect)).filter(Boolean),
});

/**
 * One change from the copy as text, such as "+2 to Diplomacy" or "−1 Influence Point".
 * `format(key, data)` and `list(items)` are Foundry's localisation, and `label(skill)` names a skill, so tools/test.mjs can pass stand-ins.
 */
export function changeText(change, { format, list, label }) {
  const amount = change.amount > 0 ? `+${change.amount}` : `−${-change.amount}`;
  const plural = Math.abs(change.amount) === 1 ? "one" : "other";
  const key = "SSM.Panel.Change";
  if (change.type === "check") {
    if (change.all) return format(`${key}.checkAll`, { amount });
    if (!change.skills.length) return format(`${key}.checkSome`, { amount });
    const names = change.skills.map(label);
    if (change.more) names.push(format(`${key}.otherChecks`, {}));
    return format(`${key}.check`, { amount, skills: list(names) });
  }
  if (change.type === "counter") return format(`${key}.counter`, { amount, counter: change.counter || format("SSM.Influence.UnnamedCounter", {}) });
  return format(`${key}.${change.type}.${plural}`, { amount });
}

function npcView(system, npc) {
  return {
    id: npc.id,
    name: npc.name,
    points: npc.points,
    discovery: npc.discovery.filter(isVisibleDiscovery).map((row) => ({ id: row.id, skill: row.skill, lore: row.lore, dc: currentDc(system, npc, row) })),
    influence: npc.influence.filter(isVisibleInfluence).map((row) => ({ id: row.id, skill: row.skill, lore: row.lore, dc: currentDc(system, npc, row) })),
    known: npc.modifiers.filter(isVisible).map((row) => modifierView(system, npc, row)),
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
