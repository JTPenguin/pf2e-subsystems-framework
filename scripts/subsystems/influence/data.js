/*
 * The Influence data's choices, new-row factories and edits. No Foundry document calls, so tools/test.mjs can check them.
 * Sheets edit a plain copy of the source data with these, then save it.
 */

export const STATUSES = ["inactive", "active", "finished"];
export const MODIFIER_KINDS = ["weakness", "resistance", "penalty", "adjustment"];
export const DURATIONS = ["oneTime", "ongoing"];
export const EFFECT_TYPES = ["dc", "points", "counter", "rounds", "note"];
export const QUICK_DC_AMOUNTS = [-5, -2, 2, 5];
/** How much of a threshold players see: nothing, its points ("6: ???"), or its points and player text. The GM's eye button steps through them in this order. */
export const THRESHOLD_REVEALS = ["hidden", "points", "full"];
export const nextThresholdReveal = (reveal) => THRESHOLD_REVEALS[(THRESHOLD_REVEALS.indexOf(reveal) + 1) % THRESHOLD_REVEALS.length];

/** A threshold saved before the three-step reveal has a `revealed` flag: true becomes "full", false "hidden". Changes the row in place and returns it. */
export function migrateThreshold(row) {
  if (row && typeof row === "object" && "revealed" in row) {
    if (!THRESHOLD_REVEALS.includes(row.reveal)) row.reveal = row.revealed ? "full" : "hidden";
    delete row.revealed;
  }
  return row;
}

/** The value of a Discovery or Influence skill's `skill` field when it is a Lore; the `lore` field then holds the Lore's name. */
export const LORE = "lore";
/** Discovery checks may use Perception as well as skills. */
export const PERCEPTION = "perception";

/** Discovery skills any challenge offers: always on the panel, with no reveal control. Values are as stored in a row's `skill`, a lowercase PF2e slug. */
export const UNIVERSAL_DISCOVERY = [PERCEPTION];
export const isUniversalDiscovery = (row) => UNIVERSAL_DISCOVERY.includes(row.skill);
/** Influence skills any challenge offers, on the same terms. */
export const UNIVERSAL_INFLUENCE = ["deception", "diplomacy", "intimidation"];
export const isUniversalInfluence = (row) => UNIVERSAL_INFLUENCE.includes(row.skill);
/** A universal row of either kind. The skill slugs of the two lists never overlap. Such a row is never a decoy, whatever its flag says. */
export const isUniversalRow = (row) => isUniversalDiscovery(row) || isUniversalInfluence(row);

const id = () => foundry.utils.randomID();

export const newEffect = () => ({ id: id(), type: "note", amount: 0, allSkills: true, skills: [], counterId: "", note: "" });
export const newModifier = () => ({
  id: id(), name: "", playerText: "", gmText: "", kind: "weakness", duration: "ongoing",
  active: false, spent: false, revealed: false, decoy: false, effects: [newEffect()],
});
export const newDiscovery = () => ({ id: id(), skill: PERCEPTION, lore: "", dc: 15, revealed: false, decoy: false });
export const newInfluence = () => ({ id: id(), skill: "society", lore: "", dc: 15, revealed: false, decoy: false });
export const newThreshold = () => ({ id: id(), points: 1, playerText: "", gmText: "", reveal: "hidden", reached: false });
export const newTrigger = () => ({ id: id(), value: 0, gmNote: "" });
export const newCounter = () => ({ id: id(), name: "", value: 0, min: null, max: null, triggers: [], revealed: false });
/** A new NPC starts with a row for each universal skill, at the default DC. The GM can edit or delete them. */
export const newNpc = () => ({
  id: id(), name: "", traits: [], actorUuid: null, perception: 0, will: 0, points: 0,
  discovery: UNIVERSAL_DISCOVERY.map((skill) => ({ ...newDiscovery(), skill })),
  influence: UNIVERSAL_INFLUENCE.map((skill) => ({ ...newInfluence(), skill })),
  thresholds: [], modifiers: [],
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

/* The modifier window edits a copy of one modifier, then saves only what the GM changed onto the latest data. */

/** The fields the modifier window edits. The id never changes. */
export const MODIFIER_FIELDS = ["name", "kind", "duration", "playerText", "gmText", "active", "spent", "revealed", "decoy", "effects"];

/** The modifier with this id on this NPC, or undefined. */
export const findModifier = (system, npcId, modifierId) => system.npcs.find((npc) => npc.id === npcId)?.modifiers.find((modifier) => modifier.id === modifierId);

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** The edited fields whose values differ between the modifier as loaded and the copy being edited. Effects count as one field. */
export function modifierChanges(base, draft) {
  const changes = {};
  for (const key of MODIFIER_FIELDS) if (!same(base[key], draft[key])) changes[key] = structuredClone(draft[key]);
  return changes;
}

/** A copy of the latest modifier with the window's changes on top, so an update from elsewhere keeps the GM's unsaved edits. */
export const rebaseModifier = (latest, changes) => ({ ...structuredClone(latest), ...structuredClone(changes), id: latest.id });

/** Save the window's changes onto a modifier. Effects drop links to skills or counters that no longer exist. Returns false if the modifier is gone. */
export function saveModifier(system, npcId, modifierId, changes) {
  const npc = system.npcs.find((candidate) => candidate.id === npcId);
  const modifier = npc?.modifiers.find((candidate) => candidate.id === modifierId);
  if (!modifier) return false;
  for (const key of MODIFIER_FIELDS) if (key in changes) modifier[key] = structuredClone(changes[key]);
  const skills = new Set([...npc.discovery, ...npc.influence].map((row) => row.id));
  const counters = new Set(system.counters.map((counter) => counter.id));
  for (const effect of modifier.effects) {
    effect.skills = effect.skills.filter((skill) => skills.has(skill));
    if (effect.counterId && !counters.has(effect.counterId)) effect.counterId = "";
  }
  return true;
}
