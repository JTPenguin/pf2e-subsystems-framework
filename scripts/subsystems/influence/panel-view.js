/*
 * What players may see of an Influence challenge. No Foundry calls, so tools/test.mjs can check it.
 * Every entry is built field by field: a new field on the data can't reach players until it is added here.
 */

import { isUniversalDiscovery, isUniversalInfluence, MODIFIER_KINDS } from "./data.js";
import { currentDc } from "./run.js";

/** Scale for a bar when the NPC has no thresholds. Every threshold sets the scale, hidden or not: Justin accepts that players can work out the goal from the bar. */
const DEFAULT_SCALE = 10;

const isVisible = (row) => row.revealed;

/** Universal skills always show, decoy or not. Any other shows only once revealed. */
const isVisibleDiscovery = (row) => isUniversalDiscovery(row) || row.revealed;
const isVisibleInfluence = (row) => isUniversalInfluence(row) || row.revealed;

/** A skill as players may see it: its name fields only, never its id or DC. */
const skillName = (row) => ({ skill: row.skill, lore: row.lore });

/**
 * What one effect does, in terms players may see, or null if it shows nothing. A DC change shows as a DC change ("−2 to DCs vs Diplomacy"),
 * with the amount only, so no DC number appears. A skill row players can't see is left out without a trace,
 * and a change that covers only hidden rows shows nothing.
 * A counter players can't see hides the whole effect. Notes are the GM's words, so they never show.
 */
function changeView(system, npc, effect) {
  if (!effect.amount) return null;
  if (effect.type === "dc") {
    if (effect.allSkills) return { type: "dc", amount: effect.amount, all: true, skills: [] };
    const rows = [...npc.discovery.filter(isVisibleDiscovery), ...npc.influence.filter(isVisibleInfluence)].filter((row) => effect.skills.includes(row.id));
    if (!rows.length) return null;
    // A Discovery and an Influence row can share a skill: name it once.
    const shown = [...new Map(rows.map((row) => [`${row.skill}:${row.lore}`, skillName(row)])).values()];
    return { type: "dc", amount: effect.amount, all: false, skills: shown };
  }
  if (effect.type === "points" || effect.type === "rounds") return { type: effect.type, amount: effect.amount };
  if (effect.type === "counter") {
    const counter = system.counters.find((candidate) => candidate.id === effect.counterId);
    return counter && isVisible(counter) ? { type: "counter", amount: effect.amount, counter: counter.name } : null;
  }
  return null;
}

/** A revealed resistance, weakness or Other entry, as a card on the panel. */
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
 * One change from the copy as text, such as "−2 to DCs vs Diplomacy" or "−1 Influence Point".
 * `format(key, data)` and `list(items)` are Foundry's localisation, and `label(skill)` names a skill, so tools/test.mjs can pass stand-ins.
 */
export function changeText(change, { format, list, label }) {
  const amount = change.amount > 0 ? `+${change.amount}` : `−${-change.amount}`;
  const plural = Math.abs(change.amount) === 1 ? "one" : "other";
  const key = "SSM.Panel.Change";
  if (change.type === "dc") {
    if (change.all) return format(`${key}.dcAll`, { amount });
    return format(`${key}.dc`, { amount, skills: list(change.skills.map(label)) });
  }
  if (change.type === "counter") return format(`${key}.counter`, { amount, counter: change.counter || format("SSM.Influence.UnnamedCounter", {}) });
  return format(`${key}.${change.type}.${plural}`, { amount });
}

/**
 * A panel card's hover text as HTML, or "" when there is none, so the card shows no hover.
 * Players get the player text alone. A GM gets the player text and the GM text, each labelled.
 * The GM text is never in the shared copy: a GM's client passes it in from the challenge itself, and it is ignored unless `isGM`.
 * `escape` is Foundry's HTML escape, so neither text can add markup. `labels` are { player, gm }.
 */
export function cardTooltip({ playerText, gmText, isGM }, { escape, labels }) {
  const line = (label, text) => `<p class="ssm-panel-tip-line">${label ? `<strong>${escape(label)}</strong> ` : ""}${escape(text)}</p>`;
  const player = String(playerText ?? "").trim();
  if (!isGM) return player ? line("", player) : "";
  const gm = String(gmText ?? "").trim();
  return (player ? line(labels.player, player) : "") + (gm ? line(labels.gm, gm) : "");
}

function npcView(system, npc) {
  return {
    id: npc.id,
    name: npc.name,
    points: npc.points,
    discovery: npc.discovery.filter(isVisibleDiscovery).map((row) => ({ id: row.id, skill: row.skill, lore: row.lore, dc: currentDc(system, npc, row) })),
    influence: npc.influence.filter(isVisibleInfluence).map((row) => ({ id: row.id, skill: row.skill, lore: row.lore, dc: currentDc(system, npc, row) })),
    // Resistances, then weaknesses, then Other; each keeps the GM's order.
    known: MODIFIER_KINDS.flatMap((kind) => npc.modifiers.filter((row) => isVisible(row) && row.kind === kind).map((row) => modifierView(system, npc, row))),
    // A points-only threshold shows as "6: ???": its text stays out of the copy.
    thresholds: npc.thresholds.filter((row) => row.reveal === "points" || row.reveal === "full").sort((a, b) => a.points - b.points).map((row) => ({
      id: row.id, points: row.points, text: row.reveal === "full" ? row.playerText : "", textHidden: row.reveal === "points", reached: !!row.reached,
    })),
    // The bar's scale: the highest threshold's points, hidden or not. Only this number goes in, never a hidden threshold's text or id.
    goal: Math.max(0, ...npc.thresholds.map((row) => row.points)),
  };
}

/** Shown for a PC with no usable image. */
export const DEFAULT_PC_IMAGE = "icons/svg/mystery-man.svg";

/** The round bar's segments: one per round, the first `current` filled. `current` is held within 0 to `max`. */
export function roundSegments(current, max) {
  const total = Math.max(0, Math.floor(max) || 0);
  const filled = Math.min(total, Math.max(0, Math.floor(current) || 0));
  return Array.from({ length: total }, (_, index) => ({ filled: index < filled }));
}

/** The filtered copy. `party` is a list of { id, name, img }. */
export function buildPanelView({ name, system, party }) {
  return {
    name,
    rounds: { current: system.rounds.current, max: system.rounds.max },
    npcs: system.npcs.map((npc) => npcView(system, npc)),
    counters: system.counters.filter(isVisible).map((row) => ({ id: row.id, name: row.name, value: row.value })),
    party: party.map(({ id, name: pcName, img }) => ({ id, name: pcName, img: img || DEFAULT_PC_IMAGE, acted: system.run.acted.includes(id) })),
  };
}

/** The NPC and skill a panel click means, from the copy as it is now. Null if the skill is hidden or the panel has gone. */
export function findPanelRow(view, { npc: npcId, kind, id }) {
  const npc = view?.npcs.find((candidate) => candidate.id === npcId);
  const row = npc?.[kind === "influence" ? "influence" : "discovery"].find((candidate) => candidate.id === id);
  return row ? { npc, row, kind } : null;
}

/** How full an NPC's bar is, from 0 to 100, scaled to `goal`, the highest threshold. Negative points fill it in the negative style. */
export function pointsBar(points, goal) {
  const scale = Math.max(goal || DEFAULT_SCALE, Math.abs(points));
  return { percent: Math.round((Math.abs(points) / scale) * 100), negative: points < 0 };
}
