/*
 * The challenge data's choices, new-row factories and edits (spec section 14). No Foundry document calls, so tools/test.mjs can check them.
 * Sheets edit a plain copy of the source data with these, then save it.
 */

export const STATUSES = ["inactive", "active", "finished"];
export const DURATIONS = ["oneTime", "ongoing"];
/** What a modifier entry can do. */
export const EFFECT_TYPES = ["dc", "points", "counter", "rounds", "note"];
/** What a row of an action's outcome table can do. A DC change belongs to modifiers and thresholds. */
export const OUTCOME_EFFECT_TYPES = ["points", "counter", "rounds", "note"];
export const OUTCOMES = ["criticalSuccess", "success", "failure", "criticalFailure"];
export const QUICK_DC_AMOUNTS = [-5, -2, 2, 5];
/** A track counts up towards its thresholds and goal, or down towards them, or both ways from 0 (spec 14.8). */
export const DIRECTIONS = ["up", "down", "both"];
export const BOTH_WAYS = "both";
/** How much of a threshold players see: nothing, its points ("6: ???"), or its points and player text. The GM's eye button steps through them in this order. */
export const THRESHOLD_REVEALS = ["hidden", "points", "full"];
export const nextThresholdReveal = (reveal) => THRESHOLD_REVEALS[(THRESHOLD_REVEALS.indexOf(reveal) + 1) % THRESHOLD_REVEALS.length];

/** The value of a check's `skill` field when it is a Lore; the `lore` field then holds the Lore's name. */
export const LORE = "lore";
export const PERCEPTION = "perception";
/** Saving throws a check row can roll, as PF2e names them (spec 14.8). */
export const SAVES = ["fortitude", "reflex", "will"];

/** A check's skill as one key, used to match a challenge-level DC change: the skill, or "lore:" and the Lore's name in lower case. */
export const skillKey = (check) => (check.skill === LORE ? `lore:${(check.lore || "").trim().toLowerCase()}` : check.skill);

/**
 * Modifier categories (spec 14.7). A category is free text; two labels that differ only in case or spaces are one category.
 * Stripe colours come from this palette in category order. Influence's Resistance, Weakness and Other keep the first three.
 */
export const CATEGORY_COLOURS = ["#c0523f", "#6fae6a", "#7a9cc6", "#d1a03c", "#9a72c4", "#4fa8a0", "#c66f9f", "#8f8a5a"];
export const categoryKey = (label) => String(label ?? "").trim().toLowerCase();

/** A check players always see: no reveal control, and never a decoy, whatever its flag says. */
export const isAlwaysShown = (check) => !!check.always;
export const isVisibleCheck = (check) => isAlwaysShown(check) || !!check.revealed;
export const isDecoyCheck = (check) => !!check.decoy && !isAlwaysShown(check);

const id = () => foundry.utils.randomID();
/** A language key's text. Outside Foundry, as in tools/test.mjs, the key itself. */
const say = (key) => globalThis.game?.i18n?.localize(key) ?? key;

export const newEffect = () => ({ id: id(), type: "note", amount: 0, allSkills: true, skills: [], counterId: "", note: "" });
const effect = (type, amount = 0, note = "") => ({ ...newEffect(), type, amount, note });
export const newOutcomeEffect = () => effect("points", 1);
export const newModifier = () => ({
  id: id(), name: "", playerText: "", gmText: "", category: "", duration: "ongoing",
  active: false, spent: false, revealed: false, decoy: false, effects: [newEffect()],
});
export const newCheck = () => ({ id: id(), skill: "society", lore: "", dc: 15, revealed: false, decoy: false, always: false });
/** `dc` is a DC change that applies while the threshold is reached. */
export const newThreshold = () => ({ id: id(), points: 1, playerText: "", gmText: "", reveal: "hidden", reached: false, dc: 0 });
/** A per-PC counter keeps one value per party PC in `valueBy`, starting from `value` (spec 14.8). */
export const newCounter = () => ({ id: id(), name: "", value: 0, direction: "up", min: null, max: null, perRound: 0, perPc: false, valueBy: {}, thresholds: [], revealed: false });

/** GM Core's accumulating rolls: +2, +1, 0, −1 points. */
const accumulating = () => ({ criticalSuccess: [effect("points", 2)], success: [effect("points", 1)], failure: [], criticalFailure: [effect("points", -1)] });
export const newAction = () => ({ id: id(), name: "", description: "", secret: false, maxPoints: null, given: 0, checks: [], outcomes: accumulating() });

const blankSubject = () => ({
  id: id(), name: "", statLine: "", revealed: false, tracksPoints: true, individual: false,
  points: 0, pointsBy: {}, direction: "up", min: null, max: null, goal: null, complete: false, completeBy: [],
  thresholds: [], modifiers: [], actions: [],
});

/**
 * A preset is a starting template: its names, and what a new subject holds. After creation everything can be edited.
 * `names` holds language keys; they are written into the challenge as text when it is made.
 */
export const PRESETS = {
  victory: {
    id: "victory",
    label: "SSM.Preset.victory.Label",
    icon: "fa-solid fa-trophy",
    names: { pointsName: "SSM.Preset.victory.Points", subjectLabel: "SSM.Preset.victory.Subject" },
    categories: ["SSM.Preset.victory.Category.modifier"],
    subject: () => ({ ...blankSubject(), actions: [{ ...newAction(), name: say("SSM.Preset.victory.Check") }] }),
  },
  influence: {
    id: "influence",
    label: "SSM.Preset.influence.Label",
    icon: "fa-solid fa-comments",
    names: { pointsName: "SSM.Preset.influence.Points", subjectLabel: "SSM.Preset.influence.Subject" },
    categories: ["SSM.Preset.influence.Category.resistance", "SSM.Preset.influence.Category.weakness", "SSM.Preset.influence.Category.other"],
    subject: () => {
      const always = (skill) => ({ ...newCheck(), skill, always: true });
      const reminder = (outcome) => [effect("note", 0, say(`SSM.Preset.influence.Reminder.${outcome}`))];
      return {
        ...blankSubject(),
        revealed: true,
        actions: [
          { ...newAction(), name: say("SSM.Preset.influence.Discover"), secret: true, checks: [always(PERCEPTION)], outcomes: Object.fromEntries(OUTCOMES.map((outcome) => [outcome, reminder(outcome)])) },
          { ...newAction(), name: say("SSM.Preset.influence.Influence"), checks: ["deception", "diplomacy", "intimidation"].map(always) },
        ],
      };
    },
  },
};
export const DEFAULT_PRESET = "victory";
const presetOf = (system) => PRESETS[system?.preset] ?? PRESETS[DEFAULT_PRESET];

/** The preset's suggested categories, as text. */
export const suggestedCategories = (system) => (presetOf(system).categories ?? []).map((key) => say(key));

/** Every modifier entry: the challenge's own, then each subject's. */
export const allModifiers = (system) => [...(system.modifiers ?? []), ...system.subjects.flatMap((subject) => subject.modifiers)];

/**
 * The categories in order (spec 14.7): the preset's suggestions, then other labels in order of first use. Each is { key, label, colour }.
 * A blank category is left out: it groups first, with no heading and no colour.
 */
export function categoryOrder(system) {
  const order = new Map();
  for (const label of [...suggestedCategories(system), ...allModifiers(system).map((modifier) => modifier.category)]) {
    const key = categoryKey(label);
    if (key && !order.has(key)) order.set(key, String(label).trim());
  }
  return [...order].map(([key, label], index) => ({ key, label, colour: CATEGORY_COLOURS[index % CATEGORY_COLOURS.length] }));
}

/**
 * Rows grouped by category: the blank category first, with no heading, then the labelled ones in category order (spec 14.7). Each group is { key, label, colour, rows }.
 * A group with no rows is left out, except: `withSuggestions` keeps the preset's suggested categories, as the Edit tab does,
 * and `keep` (a list of category labels) keeps those, as the panel does for a subject's categories.
 */
export function groupByCategory(system, rows, { withSuggestions = false, keep = [] } = {}) {
  const kept = new Set([...(withSuggestions ? suggestedCategories(system) : []), ...keep].map(categoryKey));
  const groups = categoryOrder(system).map((category) => ({ ...category, rows: rows.filter((row) => categoryKey(row.category) === category.key) }));
  const blank = { key: "", label: "", colour: "", rows: rows.filter((row) => !categoryKey(row.category)) };
  return [blank, ...groups].filter((group) => group.rows.length || (group.key && kept.has(group.key)));
}

/** Move a subject one place up (−1) or down (+1) in the challenge's order (spec 14.8). Returns false at either end. */
export function moveSubject(system, subjectId, delta) {
  const from = system.subjects.findIndex((subject) => subject.id === subjectId);
  const to = from + delta;
  if (from < 0 || to < 0 || to >= system.subjects.length) return false;
  const [subject] = system.subjects.splice(from, 1);
  system.subjects.splice(to, 0, subject);
}

/** A new subject as the challenge's preset makes it. */
export const newSubject = (system) => presetOf(system).subject();

/** A new challenge's data: the preset's names and one subject, since a challenge needs at least one. Influence has six rounds; any other has no limit. */
export function newChallengeSystem(presetId = DEFAULT_PRESET) {
  const preset = PRESETS[presetId] ?? PRESETS[DEFAULT_PRESET];
  return {
    preset: preset.id,
    pointsName: say(preset.names.pointsName),
    subjectLabel: say(preset.names.subjectLabel),
    rounds: { current: 0, max: preset.id === "influence" ? 6 : null },
    modifiers: [],
    subjects: [preset.subject()],
  };
}

/** New rows by the name of the list they go in. */
const FACTORIES = {
  subjects: newSubject, actions: newAction, checks: newCheck, thresholds: newThreshold,
  modifiers: newModifier, effects: newEffect, counters: newCounter,
  ...Object.fromEntries(OUTCOMES.map((outcome) => [outcome, newOutcomeEffect])),
};

/** Lists that must keep at least one row. */
const KEEP_ONE = new Set(["subjects", "effects"]);

const getPath = (object, path) => path.split(".").reduce((value, key) => value?.[key], object);

const allChecks = (subject) => subject.actions.flatMap((action) => action.checks);
const outcomeEffects = (action) => OUTCOMES.flatMap((outcome) => action.outcomes?.[outcome] ?? []);
/** Every effect that can name a counter: modifier effects and outcome rows. */
const counterEffects = (system) => [...allModifiers(system).flatMap((modifier) => modifier.effects), ...system.subjects.flatMap((subject) => subject.actions.flatMap(outcomeEffects))];

/** Add a new row to the list at listPath, for example "subjects.0.actions.1.checks". Returns the row. */
export function addRow(system, listPath) {
  const list = getPath(system, listPath);
  const make = FACTORIES[listPath.split(".").at(-1)];
  if (!Array.isArray(list) || !make) throw new Error(`Not a list: ${listPath}`);
  const row = make(system);
  list.push(row);
  return row;
}

/** Remove the row at path, for example "subjects.0.actions.1.checks.2", and any links to it. Returns false if the row must stay. */
export function removeRow(system, path) {
  const keys = path.split(".");
  const index = Number(keys.pop());
  const listName = keys.at(-1);
  const list = getPath(system, keys.join("."));
  if (!Array.isArray(list) || !list[index]) return false;
  if (KEEP_ONE.has(listName) && list.length === 1) return false;
  const [removed] = list.splice(index, 1);
  const gone = listName === "checks" ? [removed.id] : listName === "actions" ? removed.checks.map((check) => check.id) : [];
  if (gone.length) {
    const subject = getPath(system, keys.slice(0, 2).join("."));
    for (const modifier of subject?.modifiers ?? []) for (const row of modifier.effects) row.skills = row.skills.filter((skill) => !gone.includes(skill));
  } else if (listName === "counters") {
    for (const row of counterEffects(system)) if (row.counterId === removed.id) row.counterId = "";
  }
  return true;
}

export function setEffectAmount(system, path, amount) {
  const row = getPath(system, path);
  if (row) row.amount = amount;
}

/** Number fields that may be blank. A blank in any other number field keeps the old value. */
const BLANK_ALLOWED = new Set(["counters.*.min", "counters.*.max", "rounds.max", "subjects.*.goal", "subjects.*.min", "subjects.*.max", "maxPoints"]);

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

/** The parts of the data a form may edit. Run state and the preset never come from a form. */
export const EDITABLE = ["pointsName", "subjectLabel", "premise", "gmNotes", "rounds", "modifiers", "subjects", "counters"];

/** Merge expanded form data into the source's editable parts. */
export function applyForm(system, form) {
  const merged = mergeForm(system, form);
  for (const key of EDITABLE) system[key] = merged[key];
}

/** Keep only the named fields of expanded form data, for example "premise" or "subjects.0.name". */
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

/** A value kept inside a track's limits: a counter's, or a subject's points (spec 14.8). A track whose minimum is above its maximum has no working limits. */
export function limitTrack({ min = null, max = null }, value) {
  if (min !== null && max !== null && min > max) return value;
  if (min !== null && value < min) return min;
  if (max !== null && value > max) return max;
  return value;
}

const limitsBroken = ({ min = null, max = null }) => min !== null && max !== null && min > max;
const limitEach = (track, values) => Object.fromEntries(Object.entries(values ?? {}).map(([key, value]) => [key, limitTrack(track, value)]));

/** Bring counter values and subject points inside their limits, per PC too. Returns the tracks whose minimum is above their maximum; those are left alone. */
export function clampTracks(system) {
  const invalid = [];
  for (const counter of system.counters) {
    if (limitsBroken(counter)) invalid.push(counter);
    else Object.assign(counter, { value: limitTrack(counter, counter.value), valueBy: limitEach(counter, counter.valueBy) });
  }
  for (const subject of system.subjects) {
    if (limitsBroken(subject)) invalid.push(subject);
    else Object.assign(subject, { points: limitTrack(subject, subject.points), pointsBy: limitEach(subject, subject.pointsBy) });
  }
  return invalid;
}

/** The text full-text search looks in. */
export function searchText(system) {
  const parts = [system.premise, system.gmNotes];
  const thresholds = (rows) => rows.flatMap((row) => [row.playerText, row.gmText]);
  for (const counter of system.counters) parts.push(counter.name, ...thresholds(counter.thresholds));
  for (const modifier of system.modifiers ?? []) parts.push(modifier.name, modifier.category, modifier.playerText, modifier.gmText, ...modifier.effects.map((row) => row.note));
  for (const subject of system.subjects) {
    parts.push(subject.name, subject.statLine, ...thresholds(subject.thresholds));
    for (const action of subject.actions) parts.push(action.name, action.description, ...outcomeEffects(action).map((row) => row.note));
    for (const modifier of subject.modifiers) parts.push(modifier.name, modifier.category, modifier.playerText, modifier.gmText, ...modifier.effects.map((row) => row.note));
  }
  return parts.filter(Boolean).join(" ");
}

/*
 * A modifier and an action are each edited in a window of their own. The window edits a copy of the entry,
 * then saves only what the GM changed onto the latest data.
 */

/** The fields each window edits. The id never changes. */
export const MODIFIER_FIELDS = ["name", "category", "duration", "playerText", "gmText", "active", "spent", "revealed", "decoy", "effects"];
export const ACTION_FIELDS = ["name", "description", "secret", "maxPoints", "outcomes"];

const subjectById = (system, subjectId) => system.subjects.find((subject) => subject.id === subjectId);
/** The modifier list a subject id names. An empty id names the challenge's own list (spec 14.7). */
export const modifierList = (system, subjectId) => (subjectId ? subjectById(system, subjectId)?.modifiers : system.modifiers);
/** The modifier or action with this id on this subject, or on the challenge for an empty subject id. Undefined if there is none. */
export const findModifier = (system, subjectId, modifierId) => modifierList(system, subjectId)?.find((modifier) => modifier.id === modifierId);
export const findAction = (system, subjectId, actionId) => subjectById(system, subjectId)?.actions.find((action) => action.id === actionId);

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** The edited fields whose values differ between the entry as loaded and the copy being edited. A list counts as one field. */
export function entryChanges(base, draft, fields) {
  const changes = {};
  for (const key of fields) if (!same(base[key], draft[key])) changes[key] = structuredClone(draft[key]);
  return changes;
}

/** A copy of the latest entry with the window's changes on top, so an update from elsewhere keeps the GM's unsaved edits. */
export const rebaseEntry = (latest, changes) => ({ ...structuredClone(latest), ...structuredClone(changes), id: latest.id });

const counterIds = (system) => new Set(system.counters.map((counter) => counter.id));

/** The skill keys a challenge-level DC change can name: each skill used by a check anywhere in the challenge. */
export const challengeSkillKeys = (system) => [...new Set(system.subjects.flatMap(allChecks).map(skillKey))];

/**
 * Save the window's changes onto a modifier. Effects drop links to checks or counters that no longer exist.
 * A challenge-level entry names skills, not checks, and has no points effect (spec 14.7). Returns false if the modifier is gone.
 */
export function saveModifier(system, subjectId, modifierId, changes) {
  const modifier = findModifier(system, subjectId, modifierId);
  if (!modifier) return false;
  for (const key of MODIFIER_FIELDS) if (key in changes) modifier[key] = structuredClone(changes[key]);
  modifier.category = String(modifier.category ?? "").trim();
  const subject = subjectId ? subjectById(system, subjectId) : null;
  const checks = new Set(subject ? allChecks(subject).map((check) => check.id) : challengeSkillKeys(system));
  const counters = counterIds(system);
  for (const row of modifier.effects) {
    if (!subject && row.type === "points") row.type = "note";
    row.skills = row.skills.filter((skill) => checks.has(skill));
    if (row.counterId && !counters.has(row.counterId)) row.counterId = "";
  }
  return true;
}

/** Save the window's changes onto an action. Outcome rows drop links to counters that no longer exist. Returns false if the action is gone. */
export function saveAction(system, subjectId, actionId, changes) {
  const action = findAction(system, subjectId, actionId);
  if (!action) return false;
  for (const key of ACTION_FIELDS) if (key in changes) action[key] = structuredClone(changes[key]);
  const counters = counterIds(system);
  for (const row of outcomeEffects(action)) if (row.counterId && !counters.has(row.counterId)) row.counterId = "";
  return true;
}
