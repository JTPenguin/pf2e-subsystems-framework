/*
 * The Influence data's choices, new-row factories and edits. No Foundry document calls, so tools/test.mjs can check them.
 * Sheets edit a plain copy of the source data with these, then save it.
 */

export const STATUSES = ["inactive", "active", "finished"];
export const MODIFIER_KINDS = ["weakness", "resistance", "penalty", "adjustment"];
export const DURATIONS = ["oneTime", "ongoing"];
export const EFFECT_TYPES = ["dc", "points", "counter", "rounds", "note"];
export const QUICK_DC_AMOUNTS = [-5, -2, 2, 5];

/** The value of an Influence skill's `skill` field when it is a Lore; the `lore` field then holds the Lore's name. */
export const LORE = "lore";
/** Discovery checks may use Perception as well as skills. */
export const PERCEPTION = "perception";

/** Discovery skills any challenge offers: always on the panel, with no reveal control. Values are as stored in a row's `skill`, a lowercase PF2e slug. */
export const UNIVERSAL_DISCOVERY = [PERCEPTION, "society"];
export const isUniversalDiscovery = (row) => UNIVERSAL_DISCOVERY.includes(row.skill);

const id = () => foundry.utils.randomID();

export const newEffect = () => ({ id: id(), type: "note", amount: 0, allSkills: true, skills: [], counterId: "", note: "" });
export const newModifier = () => ({
  id: id(), name: "", playerText: "", gmText: "", kind: "weakness", duration: "ongoing",
  active: false, spent: false, revealed: false, decoy: false, effects: [newEffect()],
});
export const newDiscovery = () => ({ id: id(), skill: PERCEPTION, dc: 15, revealed: false, decoy: false });
export const newInfluence = () => ({ id: id(), skill: "diplomacy", lore: "", dc: 15, revealed: false, showDC: false, decoy: false });
export const newThreshold = () => ({ id: id(), points: 1, playerText: "", gmText: "", revealed: false, reached: false });
export const newTrigger = () => ({ id: id(), value: 0, gmNote: "" });
export const newCounter = () => ({ id: id(), name: "", value: 0, min: null, max: null, triggers: [], revealed: false });
export const newNpc = () => ({
  id: id(), name: "", traits: [], actorUuid: null, perception: 0, will: 0, points: 0,
  discovery: [], influence: [], thresholds: [], modifiers: [],
});

const FACTORIES = {
  npcs: newNpc, discovery: newDiscovery, influence: newInfluence, thresholds: newThreshold,
  modifiers: newModifier, effects: newEffect, counters: newCounter, triggers: newTrigger,
};

/** Lists that must keep at least one row. */
const KEEP_ONE = new Set(["npcs", "effects"]);

const getPath = (object, path) => path.split(".").reduce((value, key) => value?.[key], object);

const allEffects = (system) => system.npcs.flatMap((npc) => npc.modifiers.flatMap((modifier) => modifier.effects));

/** A new challenge's data: one NPC, since a challenge needs at least one. */
export const newChallengeSystem = () => ({ npcs: [newNpc()] });

/** Add a new row to the list at listPath, for example "npcs.0.discovery". Returns the row. */
export function addRow(system, listPath) {
  const list = getPath(system, listPath);
  const make = FACTORIES[listPath.split(".").at(-1)];
  if (!Array.isArray(list) || !make) throw new Error(`Not a list: ${listPath}`);
  const row = make();
  list.push(row);
  return row;
}

/** Remove the row at path, for example "npcs.0.discovery.1", and any links to it. Returns false if the row must stay. */
export function removeRow(system, path) {
  const keys = path.split(".");
  const index = Number(keys.pop());
  const listName = keys.at(-1);
  const list = getPath(system, keys.join("."));
  if (!Array.isArray(list) || !list[index]) return false;
  if (KEEP_ONE.has(listName) && list.length === 1) return false;
  const [removed] = list.splice(index, 1);
  if (listName === "discovery" || listName === "influence") {
    for (const effect of allEffects(system)) effect.skills = effect.skills.filter((skill) => skill !== removed.id);
  } else if (listName === "counters") {
    for (const effect of allEffects(system)) if (effect.counterId === removed.id) effect.counterId = "";
  }
  return true;
}

export function setEffectAmount(system, path, amount) {
  const effect = getPath(system, path);
  if (effect) effect.amount = amount;
}

/** Number fields that may be blank. A blank in any other number field keeps the old value. */
const BLANK_ALLOWED = new Set(["counters.*.min", "counters.*.max"]);

const isPlainObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

/** Merge expanded form data, which holds lists as {0: ..., 1: ...}, into the source data. Fields not in the form keep their values. */
export function mergeForm(source, form, path = "") {
  if (Array.isArray(source)) {
    if (Array.isArray(form)) return form;
    if (!isPlainObject(form)) return source;
    return source.map((item, index) => (index in form ? mergeForm(item, form[index], `${path}*.`) : item));
  }
  if (isPlainObject(source) && isPlainObject(form)) {
    const merged = { ...source };
    for (const [key, value] of Object.entries(form)) {
      if (!(key in source)) continue;
      const keyPath = `${path}${key}`;
      if (value === null && typeof source[key] === "number" && !BLANK_ALLOWED.has(keyPath)) continue;
      merged[key] = mergeForm(source[key], value, `${keyPath}.`);
    }
    return merged;
  }
  return form;
}

/** Merge expanded form data into the source's editable parts. Run state never comes from the form. */
export function applyForm(system, form) {
  const { premise, gmNotes, rounds, npcs, counters } = mergeForm(system, form);
  Object.assign(system, { premise, gmNotes, rounds, npcs, counters });
}

/** Keep only the named fields of expanded form data, for example "premise" or "npcs.0.name". */
export function pickFields(form, names) {
  const picked = {};
  for (const name of names) {
    const keys = name.split(".");
    const value = keys.reduce((node, key) => node?.[key], form);
    if (value === undefined) continue;
    let target = picked;
    for (const key of keys.slice(0, -1)) target = target[key] ??= {};
    target[keys.at(-1)] = value;
  }
  return picked;
}

/** A value kept inside a counter's limits. A counter whose minimum is above its maximum has no working limits. */
export function limitCounter({ min, max }, value) {
  if (min !== null && max !== null && min > max) return value;
  if (min !== null && value < min) return min;
  if (max !== null && value > max) return max;
  return value;
}

/** Bring counter values inside their limits. Returns the counters whose minimum is above their maximum; those are left alone. */
export function clampCounters(system) {
  const invalid = [];
  for (const counter of system.counters) {
    const { min, max } = counter;
    if (min !== null && max !== null && min > max) {
      invalid.push(counter);
      continue;
    }
    counter.value = limitCounter(counter, counter.value);
  }
  return invalid;
}

/** The text full-text search looks in. */
export function searchText(system) {
  const parts = [system.premise, system.gmNotes];
  for (const counter of system.counters) parts.push(counter.name, ...counter.triggers.map((trigger) => trigger.gmNote));
  for (const npc of system.npcs) {
    parts.push(npc.name, ...npc.traits);
    for (const threshold of npc.thresholds) parts.push(threshold.playerText, threshold.gmText);
    for (const modifier of npc.modifiers) parts.push(modifier.name, modifier.playerText, modifier.gmText, ...modifier.effects.map((effect) => effect.note));
  }
  return parts.filter(Boolean).join(" ");
}
