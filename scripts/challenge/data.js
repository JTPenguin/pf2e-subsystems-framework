/*
 * The challenge data's choices, new-row factories and edits (spec section 14). No Foundry document calls, so tools/test.mjs can check them.
 * Sheets edit a plain copy of the source data with these, then save it.
 */

export const STATUSES = ["inactive", "active", "finished"];
export const DURATIONS = ["oneTime", "multiUse", "ongoing"];
export const QUICK_DC_AMOUNTS = [-5, -2, 2, 5];
/** A counter counts up towards its thresholds, or down towards them, or both ways from 0 (spec 14.8). */
export const DIRECTIONS = ["up", "down", "both"];
export const BOTH_WAYS = "both";
/** How much of a threshold players see: nothing, its points ("6: ???"), or its points and player text. The GM's eye button steps through them in this order. */
export const THRESHOLD_REVEALS = ["hidden", "points", "full"];
/**
 * How the panel draws a counter (spec 14.12). Auto: a bar with thresholds or a both-ways range, else a number.
 * Steps and Track need a maximum; without one they draw as a bar.
 */
export const COUNTER_DISPLAYS = ["auto", "number", "bar", "steps", "track"];
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
 * Stripe colours come from this palette in category order. Influence's Resistance and Weakness keep the first two.
 */
export const CATEGORY_COLOURS = ["#c0523f", "#6fae6a", "#7a9cc6", "#d1a03c", "#9a72c4", "#4fa8a0", "#c66f9f", "#8f8a5a"];
export const categoryKey = (label) => String(label ?? "").trim().toLowerCase();

export const isVisibleCheck = (check) => !!check.revealed;
export const isDecoyCheck = (check) => !!check.decoy;

const id = () => foundry.utils.randomID();
/** A language key's text. Outside Foundry, as in tools/test.mjs, the key itself. */
const say = (key) => globalThis.game?.i18n?.localize(key) ?? key;

/**
 * A modifier entry does two things, each optional: one DC change (`dc`, amount 0 for none) and a note.
 * Nothing changes points or counters but the GM's own + and − (spec 14.7).
 */
export const newModifierDc = () => ({ amount: 0, allSkills: true, skills: [] });
export const newModifier = () => ({
  id: id(), name: "", playerText: "", gmText: "", category: "", duration: "ongoing",
  active: false, spent: false, revealed: false, decoy: false, dc: newModifierDc(), note: "",
});

/**
 * A modifier saved with the old list of effects: its first DC row becomes its DC change, and its notes join with "; ".
 * Later DC rows are dropped. Changes the modifier in place.
 */
export function migrateModifier(modifier) {
  if (!Array.isArray(modifier?.effects)) return modifier;
  const dcRow = modifier.effects.find((row) => row.type === "dc");
  if (!modifier.dc) modifier.dc = dcRow ? { amount: dcRow.amount ?? 0, allSkills: dcRow.allSkills ?? true, skills: [...(dcRow.skills ?? [])] } : newModifierDc();
  if (modifier.note === undefined) modifier.note = modifier.effects.filter((row) => row.type === "note").map((row) => (row.note ?? "").trim()).filter(Boolean).join("; ");
  delete modifier.effects;
  return modifier;
}
export const newCheck = () => ({ id: id(), skill: "society", lore: "", dc: 15, revealed: true, decoy: false });
/** `dc` is a DC change that applies while the threshold is reached. */
export const newThreshold = () => ({ id: id(), points: 1, playerText: "", gmText: "", reveal: "hidden", reached: false, dc: 0 });
/** A per-PC counter keeps one value per party PC in `valueBy`, starting from `value` (spec 14.8), and a GM-only note per PC in `noteBy`. */
export const newCounter = () => ({ id: id(), name: "", value: 0, direction: "up", min: null, max: null, perRound: 0, perPc: false, valueBy: {}, noteBy: {}, thresholds: [], display: "auto", showThresholdList: true, showThresholdMarks: true, revealed: true });
/** A subject's counter (spec 14.13): named by the challenge's points name, and shown from the start, as its subject decides whether players see it. */
export const newSubjectCounter = (system, fields = {}) => ({ ...newCounter(), name: system?.pointsName ?? "", revealed: true, ...fields });

/** Every counter: the challenge's own, then each subject's. */
export const allCounters = (system) => [...system.counters, ...system.subjects.flatMap((subject) => subject.counters ?? [])];
/** The counter with this id, and the subject that owns it (null for a challenge counter). Null if there is none. */
export function findCounter(system, counterId) {
  const counter = system.counters.find((candidate) => candidate.id === counterId);
  if (counter) return { counter, subject: null };
  for (const subject of system.subjects) {
    const owned = (subject.counters ?? []).find((candidate) => candidate.id === counterId);
    if (owned) return { counter: owned, subject };
  }
  return null;
}

/** Set a GM-only note for one PC on a per-PC counter, such as which Edge Points are duds. An empty note removes it. Returns false if nothing changed. */
export function setCounterNote(system, counterId, actorId, note) {
  const counter = findCounter(system, counterId)?.counter;
  if (!counter?.perPc || !actorId) return false;
  const text = String(note ?? "").trim();
  const notes = { ...(counter.noteBy ?? {}) };
  if ((notes[actorId] ?? "") === text) return false;
  if (text) notes[actorId] = text;
  else delete notes[actorId];
  counter.noteBy = notes;
}

export const newAction = () => ({ id: id(), name: "", description: "", secret: false, checks: [] });

/** A subject with no counters. Complete is the GM's alone (spec 14.13). Its category is free text, as a modifier's is, from its own suggestions. */
const blankSubject = () => ({ id: id(), name: "", description: "", category: "", revealed: false, complete: false, counters: [], modifiers: [], actions: [] });
/** A subject with one counter named by the points name, as most presets make them. */
const pointsSubject = (system, counter = {}) => ({ ...blankSubject(), counters: [newSubjectCounter(system, counter)] });

/**
 * A preset is a starting template: its names, its counters, and the subjects it can add. After creation everything can be edited.
 * `names` holds language keys; they are written into the challenge as text when it is made.
 * `subject(system)` makes a new subject; its counters take the challenge's points name. `categories` and `subjectCategories` are language keys for the suggested modifier and subject categories.
 * `counters()` and `rounds` are a new challenge's counters and round maximum. `gmNotes` is a language key, or a list of them, one paragraph each.
 */
/** A new check with its skill set. */
const checkFor = (skill) => ({ ...newCheck(), skill });
const threshold = (points, key, { dc = 0, reveal = "points" } = {}) => ({ ...newThreshold(), points, dc, reveal, playerText: say(`${key}.Player`), gmText: say(`${key}.Gm`) });

const INF = "SSM.Preset.infiltration";
const CHASE = "SSM.Preset.chase";
/** A chase's counter: an obstacle number on a track, shown. The GM sets the maximum to the number of obstacles (spec 14.11). */
const chaseCounter = (name, value, perRound) => ({ ...newCounter(), name: say(`${CHASE}.${name}`), value, min: 0, max: 6, perRound, display: "track", revealed: true });
const PREP = "SSM.Preset.preparation";
const REP = "SSM.Preset.reputation";
/** GM Core's Reputation tiers, as points on a both-ways track. Ignored, −4 to 4, has no threshold: no tier ticked means Ignored. */
const REPUTATION_TIERS = [30, 15, 5, -5, -15, -30];
const RES = "SSM.Preset.research";

/** One preparation activity (GM Core, Preparation Activities). */
const preparationActivity = (key, { secret = false, skills }) => ({ ...newAction(), name: say(`${PREP}.${key}.Name`), description: say(`${PREP}.${key}.Description`), secret, checks: skills.map(checkFor) });

export const PRESETS = {
  victory: {
    id: "victory",
    label: "SSM.Preset.victory.Label",
    icon: "fa-solid fa-trophy",
    names: { pointsName: "SSM.Preset.victory.Points", subjectLabel: "SSM.Preset.victory.Subject", subjectsLabel: "SSM.Preset.victory.Subjects", noSubjects: "SSM.Preset.victory.NoSubjects" },
    categories: ["SSM.Preset.victory.Category.modifier"],
    subject: (system) => ({ ...pointsSubject(system), actions: [{ ...newAction(), name: say("SSM.Preset.victory.Check") }] }),
  },
  influence: {
    id: "influence",
    label: "SSM.Preset.influence.Label",
    icon: "fa-solid fa-comments",
    names: { pointsName: "SSM.Preset.influence.Points", subjectLabel: "SSM.Preset.influence.Subject", subjectsLabel: "SSM.Preset.influence.Subjects", noSubjects: "SSM.Preset.influence.NoSubjects" },
    categories: ["SSM.Preset.influence.Category.resistance", "SSM.Preset.influence.Category.weakness"],
    rounds: 6,
    subject: (system) => ({
      ...pointsSubject(system),
      revealed: true,
      actions: [
        { ...newAction(), name: say("SSM.Preset.influence.Discover"), secret: true, checks: [checkFor(PERCEPTION)] },
        { ...newAction(), name: say("SSM.Preset.influence.Influence"), checks: ["deception", "diplomacy", "intimidation"].map(checkFor) },
      ],
    }),
  },
  /** GM Core's Infiltration. Obstacles earn Infiltration Points; failures add to the party's Awareness Points; Edge Points are per PC. */
  infiltration: {
    id: "infiltration",
    label: `${INF}.Label`,
    icon: "fa-solid fa-user-secret",
    names: { pointsName: `${INF}.Points`, subjectLabel: `${INF}.Subject`, subjectsLabel: `${INF}.Subjects`, noSubjects: `${INF}.NoSubjects` },
    categories: [`${INF}.Category.opportunity`, `${INF}.Category.complication`],
    // Complications and opportunities are obstacles the GM recategorises and trims (GM notes).
    subjectCategories: [`${INF}.SubjectCategory.obstacle`, `${INF}.SubjectCategory.complication`, `${INF}.SubjectCategory.opportunity`],
    gmNotes: ["Obstacles", "Awareness", "Edge", "Complication", "Opportunity"].map((key) => `${INF}.GmNotes.${key}`),
    counters: () => [
      {
        ...newCounter(), name: say(`${INF}.Awareness`), min: 0, perRound: 1, revealed: true,
        thresholds: [
          threshold(5, `${INF}.Threshold.5`, { dc: 1 }),
          threshold(10, `${INF}.Threshold.10`),
          // With the 5's +1, a total of +2.
          threshold(15, `${INF}.Threshold.15`, { dc: 1 }),
          threshold(20, `${INF}.Threshold.20`),
        ],
      },
      { ...newCounter(), name: say(`${INF}.Edge`), min: 0, perPc: true, revealed: true },
    ],
    subject: (system) => ({ ...pointsSubject(system, { max: 2 }), actions: [{ ...newAction(), name: say(`${INF}.Overcome`) }] }),
    // The first obstacle starts on the panel; the GM reveals the rest in turn.
    firstSubject: { revealed: true },
  },
  /**
   * GM Core's Chases. Obstacles are subjects in order, each with a Chase Points counter from 0 to its target.
   * The party and the other side are counters holding their obstacle numbers, drawn as tracks. The other side moves +1 each round;
   * the GM moves the party when it clears an obstacle. One obstacle shows at a time. No other chase logic (spec 14.11).
   */
  chase: {
    id: "chase",
    label: `${CHASE}.Label`,
    icon: "fa-solid fa-person-running",
    names: { pointsName: `${CHASE}.Points`, subjectLabel: `${CHASE}.Subject`, subjectsLabel: `${CHASE}.Subjects`, noSubjects: `${CHASE}.NoSubjects` },
    categories: [],
    gmNotes: ["Obstacles", "Tracks", "Running", "Variants"].map((key) => `${CHASE}.GmNotes.${key}`),
    counters: () => [chaseCounter("Party", 1, 0), chaseCounter("Quarry", 2, 1)],
    multipleSubjects: false,
    // GM Core: about one fewer CP than the party's size. The GM edits it per obstacle.
    subject: (system) => ({ ...pointsSubject(system, { min: 0, max: 3 }), actions: [{ ...newAction(), name: say(`${CHASE}.Overcome`) }] }),
    // The first obstacle starts on the panel; the GM reveals the rest in turn.
    firstSubject: { revealed: true },
  },
  /**
   * GM Core's Reputation. Each faction is a subject with no actions and one both-ways Reputation Points counter, −50 to +50,
   * with the tiers as thresholds that tick and untick as the value moves. Campaign-long: no rounds. The GM gives favors and disservices with + and −.
   */
  reputation: {
    id: "reputation",
    label: `${REP}.Label`,
    icon: "fa-solid fa-handshake",
    names: { pointsName: `${REP}.Points`, subjectLabel: `${REP}.Subject`, subjectsLabel: `${REP}.Subjects`, noSubjects: `${REP}.NoSubjects` },
    categories: [],
    gmNotes: ["Factions", "Changing", "Running"].map((key) => `${REP}.GmNotes.${key}`),
    // A maximum of 0: no rounds.
    rounds: 0,
    subject: (system) => ({
      ...pointsSubject(system, {
        direction: BOTH_WAYS, min: -50, max: 50,
        thresholds: REPUTATION_TIERS.map((points) => threshold(points, `${REP}.Threshold.${points}`, { reveal: "full" })),
      }),
      revealed: true,
    }),
  },
  /**
   * GM Core's Research. Research Points are one pool for the party; the GM adds the stat block's thresholds to it. Days counts +1 each round,
   * and its thresholds are the timed events, hidden until the GM reveals them. Each library area is a subject with one Research action and
   * an RP Gathered counter up to its Maximum RP. Rolls change nothing: the GM adds to the area and the pool by hand (Justin, 2026-11-13).
   */
  research: {
    id: "research",
    label: `${RES}.Label`,
    icon: "fa-solid fa-book-open",
    names: { pointsName: `${RES}.Points`, subjectLabel: `${RES}.Subject`, subjectsLabel: `${RES}.Subjects`, noSubjects: `${RES}.NoSubjects` },
    categories: [],
    gmNotes: ["Library", "Rolling", "Thresholds", "Time"].map((key) => `${RES}.GmNotes.${key}`),
    counters: () => [
      { ...newCounter(), name: say(`${RES}.Points`), min: 0, revealed: true },
      // Round 1 is day 1. A number, not a bar: a bar's scale would show players where the hidden events sit.
      { ...newCounter(), name: say(`${RES}.Days`), value: 1, min: 0, perRound: 1, display: "number", revealed: true },
    ],
    // GM Core's sample areas allow 5, 10 and 15 RP; the GM sets each area's maximum.
    subject: (system) => ({
      ...pointsSubject(system, { name: say(`${RES}.Gathered`), min: 0, max: 5, display: "bar" }),
      revealed: true,
      actions: [{ ...newAction(), name: say(`${RES}.Research`) }],
    }),
  },
  /**
   * GM Core's preparation for an infiltration, run first as its own challenge. Its Edge and Awareness Points are typed into the infiltration by hand.
   * A dud or cursed Edge Point still adds to Edge, as the PC thinks it worked; the GM notes say so.
   */
  preparation: {
    id: "preparation",
    label: `${PREP}.Label`,
    icon: "fa-solid fa-scroll",
    names: { pointsName: `${INF}.Edge`, subjectLabel: `${PREP}.Subject`, subjectsLabel: `${PREP}.Subjects`, noSubjects: `${PREP}.NoSubjects` },
    // No suggestions: an empty heading would sit under the six activities on the panel.
    categories: [],
    gmNotes: ["Intro", "Points", "Notes", "Handover"].map((key) => `${PREP}.GmNotes.${key}`),
    counters: () => [
      { ...newCounter(), name: say(`${INF}.Edge`), min: 0, perPc: true, revealed: true },
      // Hidden: the bribes and rumours that reached the opposition. It carries into the infiltration.
      { ...newCounter(), name: say(`${INF}.Awareness`), min: 0, revealed: false },
    ],
    subject: () => ({
      ...blankSubject(), name: say(`${PREP}.Subject`), revealed: true,
      actions: [
        preparationActivity("BribeContact", { secret: true, skills: ["deception", "diplomacy"] }),
        preparationActivity("ForgeDocuments", { secret: true, skills: ["society"] }),
        preparationActivity("GainContact", { skills: ["diplomacy", "society"] }),
        preparationActivity("Gossip", { secret: true, skills: ["diplomacy"] }),
        preparationActivity("ScoutLocation", { secret: true, skills: [PERCEPTION, "society", "stealth"] }),
        preparationActivity("SecureDisguises", { skills: ["crafting", "deception", "performance", "society"] }),
      ],
    }),
  },
};
export const DEFAULT_PRESET = "victory";
const presetOf = (system) => PRESETS[system?.preset] ?? PRESETS[DEFAULT_PRESET];

/** The preset's suggested categories, as text. */
export const suggestedCategories = (system) => (presetOf(system).categories ?? []).map((key) => say(key));

/** Every modifier entry: the challenge's own, then each subject's. */
export const allModifiers = (system) => [...(system.modifiers ?? []), ...system.subjects.flatMap((subject) => subject.modifiers)];

/** Labels in order with repeats and blanks left out, two that differ only in case or spaces counting as one. Each is { key, label, colour }. */
function orderLabels(labels) {
  const order = new Map();
  for (const label of labels) {
    const key = categoryKey(label);
    if (key && !order.has(key)) order.set(key, String(label).trim());
  }
  return [...order].map(([key, label], index) => ({ key, label, colour: CATEGORY_COLOURS[index % CATEGORY_COLOURS.length] }));
}

/**
 * The categories in order (spec 14.7): the preset's suggestions, then other labels in order of first use. Each is { key, label, colour }.
 * A blank category is left out: it groups first, with no heading and no colour.
 */
export const categoryOrder = (system) => orderLabels([...suggestedCategories(system), ...allModifiers(system).map((modifier) => modifier.category)]);

/** Subject categories, kept apart from modifier categories (spec 14.6): the preset's suggestions, then those in use on subjects, in order of first use. */
export const subjectCategoryOrder = (system) => orderLabels([...(presetOf(system).subjectCategories ?? []).map((key) => say(key)), ...system.subjects.map((subject) => subject.category)]);

/**
 * Rows grouped by category: the blank category first, with no heading, then the labelled ones in category order (spec 14.7). Each group is { key, label, colour, rows }.
 * A group with no rows is left out, except: `withSuggestions` keeps the preset's suggested categories,
 * and `keep` (a list of category labels) keeps those. The panel uses both for a subject's categories.
 */
export function groupByCategory(system, rows, { withSuggestions = false, keep = [] } = {}) {
  const kept = new Set([...(withSuggestions ? suggestedCategories(system) : []), ...keep].map(categoryKey));
  const groups = categoryOrder(system).map((category) => ({ ...category, rows: rows.filter((row) => categoryKey(row.category) === category.key) }));
  const blank = { key: "", label: "", colour: "", rows: rows.filter((row) => !categoryKey(row.category)) };
  return [blank, ...groups].filter((group) => group.rows.length || (group.key && kept.has(group.key)));
}

/**
 * Subjects grouped by category (spec 14.4): the blank category first, then the labelled ones in subject category order, each in stored order.
 * Each group is { key, label, items }. `items` defaults to the subjects; pass a list in step with them, such as their views, to group that.
 * A category with no subjects is left out.
 */
export function subjectGroups(system, items = system.subjects) {
  const groups = [{ key: "", label: "" }, ...subjectCategoryOrder(system)].map(({ key, label }) => ({ key, label, items: [] }));
  const byKey = new Map(groups.map((group) => [group.key, group]));
  items.forEach((item, i) => byKey.get(categoryKey(system.subjects[i].category)).items.push(item));
  return groups.filter((group) => group.items.length);
}

/** What a category's collapse-all toggle does (spec 14.8): collapse its subjects when any is open, else expand them. Null when it has none. */
export function collapseAllAction(subjectIds, isCollapsed) {
  if (!subjectIds.length) return null;
  return subjectIds.some((id) => !isCollapsed(id)) ? "collapse" : "expand";
}

/** Put the stored subjects in grouped order, so the panel's columns follow Run view (spec 14.4). Within a category the order stays. */
export function sortSubjects(system) {
  system.subjects = subjectGroups(system).flatMap((group) => group.items);
}

/**
 * Move a subject to `index` in the challenge's order (spec 14.8), as a drag on the sheet drops it.
 * The index counts the subjects with this one still in place. A subject stays within its category:
 * returns false for an index outside its group, or when it would not move.
 */
export function moveSubject(system, subjectId, index) {
  sortSubjects(system);
  const from = system.subjects.findIndex((subject) => subject.id === subjectId);
  if (from < 0 || index === from || !(index >= 0 && index < system.subjects.length)) return false;
  if (categoryKey(system.subjects[index].category) !== categoryKey(system.subjects[from].category)) return false;
  const [subject] = system.subjects.splice(from, 1);
  system.subjects.splice(index, 0, subject);
}

/** Move the entry `id` in `list` to just before `targetId`, or just after it. Returns false if either is missing or it would not move. */
function moveBeside(list, id, targetId, after) {
  const from = list?.findIndex((row) => row.id === id) ?? -1;
  const to = list?.findIndex((row) => row.id === targetId) ?? -1;
  if (from < 0 || to < 0 || from === to) return false;
  const index = to - (from < to ? 1 : 0) + (after ? 1 : 0);
  if (index === from) return false;
  const [row] = list.splice(from, 1);
  list.splice(index, 0, row);
}

/**
 * Move a modifier next to another of the same list, as a drag on the sheet drops it. `subjectId` is the owning subject's, empty for the challenge's own.
 * A modifier stays within its category: returns false for another category's. The list is put in grouped order first, so the categories
 * keep their order: it follows first use, and a modifier moving past another category's would change it.
 */
export function moveModifier(system, subjectId, modifierId, targetId, after = false) {
  const list = modifierList(system, subjectId);
  const [modifier, target] = [modifierId, targetId].map((id) => list?.find((row) => row.id === id));
  if (!modifier || !target || categoryKey(modifier.category) !== categoryKey(target.category)) return false;
  list.splice(0, list.length, ...groupByCategory(system, list).flatMap((group) => group.rows));
  return moveBeside(list, modifierId, targetId, after);
}

/** Move a counter next to another in the same list: the challenge's (`subjectId` empty) or one subject's. Returns false if it would not move. */
export function moveCounter(system, subjectId, counterId, targetId, after = false) {
  const list = subjectId ? subjectById(system, subjectId)?.counters : system.counters;
  return moveBeside(list, counterId, targetId, after);
}

/** A new subject as the challenge's preset makes it. */
export const newSubject = (system) => presetOf(system).subject(system);

/** A new challenge's data: the preset's names, counters and round maximum, and its first subject, since a challenge needs at least one. */
export function newChallengeSystem(presetId = DEFAULT_PRESET) {
  const preset = PRESETS[presetId] ?? PRESETS[DEFAULT_PRESET];
  const system = {
    preset: preset.id,
    pointsName: say(preset.names.pointsName),
    subjectLabel: say(preset.names.subjectLabel),
    subjectsLabel: say(preset.names.subjectsLabel),
    noSubjects: say(preset.names.noSubjects),
    rounds: { current: 0, max: preset.rounds ?? null },
    modifiers: [],
    counters: preset.counters?.() ?? [],
  };
  if (preset.gmNotes) system.gmNotes = [preset.gmNotes].flat().map((key) => `<p>${say(key)}</p>`).join("");
  if (preset.multipleSubjects === false) system.multipleSubjects = false;
  system.subjects = [{ ...newSubject(system), ...(preset.firstSubject ?? {}) }];
  return system;
}

/** New rows by the name of the list they go in. */
const FACTORIES = {
  subjects: newSubject, actions: newAction, checks: newCheck, thresholds: newThreshold,
  modifiers: newModifier, counters: newCounter,
};

/** Lists that must keep at least one row. */
const KEEP_ONE = new Set(["subjects"]);

const getPath = (object, path) => path.split(".").reduce((value, key) => value?.[key], object);

const allChecks = (subject) => subject.actions.flatMap((action) => action.checks);

/** Add a row to the list at listPath, for example "subjects.0.actions.1.checks", and return it. `fields` sets starting values on the new row, for example a modifier's category. */
export function addRow(system, listPath, fields = {}) {
  const list = getPath(system, listPath);
  const make = /^subjects\.\d+\.counters$/.test(listPath) ? newSubjectCounter : FACTORIES[listPath.split(".").at(-1)];
  if (!Array.isArray(list) || !make) throw new Error(`Not a list: ${listPath}`);
  const row = Object.assign(make(system), fields);
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
    for (const modifier of subject?.modifiers ?? []) modifier.dc.skills = modifier.dc.skills.filter((skill) => !gone.includes(skill));
  }
  return true;
}

/** Set the DC change's amount on the modifier at path ("" for the modifier itself, as the modifier window passes). */
export function setDcAmount(modifier, path, amount) {
  const row = path ? getPath(modifier, path) : modifier;
  if (row?.dc) row.dc.amount = amount;
}

/** Number fields that may be blank. A blank in any other number field keeps the old value. */
const BLANK_ALLOWED = new Set(["counters.*.min", "counters.*.max", "rounds.max", "subjects.*.counters.*.min", "subjects.*.counters.*.max", "min", "max"]);

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
export const EDITABLE = ["pointsName", "subjectLabel", "gmNotes", "rounds", "modifiers", "subjects", "counters", "multipleSubjects"];

/**
 * Merge expanded form data into the source's editable parts. Without Allow multiple subjects, a subject the form newly reveals
 * hides the others, as the reveal toggle does (spec 14.12).
 */
export function applyForm(system, form) {
  const shown = new Set(system.subjects.filter((subject) => subject.revealed).map((subject) => subject.id));
  const categories = new Map(system.subjects.map((subject) => [subject.id, categoryKey(subject.category)]));
  const merged = mergeForm(system, form);
  for (const key of EDITABLE) if (key in merged) system[key] = merged[key];
  // A run started with no rounds (maximum 0) sits at round 0. Giving it a maximum mid-run starts the count at round 1, as Start would have.
  if (system.run?.status === "active" && system.rounds.max !== 0 && system.rounds.current < 1) system.rounds.current = 1;
  // A subject whose category changed moves to the end of its new group (spec 14.4).
  const moved = system.subjects.filter((subject) => categories.has(subject.id) && categories.get(subject.id) !== categoryKey(subject.category));
  if (moved.length) system.subjects = [...system.subjects.filter((subject) => !moved.includes(subject)), ...moved];
  sortSubjects(system);
  const newly = system.subjects.find((subject) => subject.revealed && !shown.has(subject.id));
  if (newly) revealOnly(system, newly);
}

/** Without Allow multiple subjects, revealing `subject` hides every other subject. With it, nothing changes. */
export function revealOnly(system, subject) {
  if (system.multipleSubjects !== false) return;
  for (const other of system.subjects) if (other !== subject) other.revealed = false;
}

/** Keep only the named fields of expanded form data, for example "gmNotes" or "subjects.0.name". */
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

/** A value kept inside a counter's limits (spec 14.8). A track whose minimum is above its maximum has no working limits. */
export function limitTrack({ min = null, max = null }, value) {
  if (min !== null && max !== null && min > max) return value;
  if (min !== null && value < min) return min;
  if (max !== null && value > max) return max;
  return value;
}

/** Whether + and − would move a counter from `value`: each is off at the limit it would pass. The sheet and the panel use it alike. */
export const counterMoves = (counter, value) => ({ canAdd: limitTrack(counter, value + 1) !== value, canRemove: limitTrack(counter, value - 1) !== value });

const limitsBroken = ({ min = null, max = null }) => min !== null && max !== null && min > max;
const limitEach = (track, values) => Object.fromEntries(Object.entries(values ?? {}).map(([key, value]) => [key, limitTrack(track, value)]));

/** Bring every counter's values inside its limits, per PC too, a subject's counters included. Returns the counters whose minimum is above their maximum; those are left alone. */
export function clampTracks(system) {
  const invalid = [];
  for (const counter of allCounters(system)) {
    if (limitsBroken(counter)) invalid.push(counter);
    else Object.assign(counter, { value: limitTrack(counter, counter.value), valueBy: limitEach(counter, counter.valueBy) });
  }
  return invalid;
}

/** The text full-text search looks in. */
export function searchText(system) {
  const parts = [system.gmNotes];
  const thresholds = (rows) => rows.flatMap((row) => [row.playerText, row.gmText]);
  for (const counter of allCounters(system)) parts.push(counter.name, ...thresholds(counter.thresholds));
  for (const modifier of system.modifiers ?? []) parts.push(modifier.name, modifier.category, modifier.playerText, modifier.gmText, modifier.note);
  for (const subject of system.subjects) {
    parts.push(subject.name, subject.description);
    for (const action of subject.actions) parts.push(action.name, action.description);
    for (const modifier of subject.modifiers) parts.push(modifier.name, modifier.category, modifier.playerText, modifier.gmText, modifier.note);
  }
  return parts.filter(Boolean).join(" ");
}

/*
 * A modifier is edited in a window of its own. The window edits a copy of the entry,
 * then saves only what the GM changed onto the latest data.
 */

/** The fields each window edits. The id never changes. */
export const MODIFIER_FIELDS = ["name", "category", "duration", "playerText", "gmText", "active", "spent", "revealed", "decoy", "dc", "note"];

const subjectById = (system, subjectId) => system.subjects.find((subject) => subject.id === subjectId);
/** The modifier list a subject id names. An empty id names the challenge's own list (spec 14.7). */
export const modifierList = (system, subjectId) => (subjectId ? subjectById(system, subjectId)?.modifiers : system.modifiers);
/** The modifier or action with this id on this subject, or on the challenge for an empty subject id. Undefined if there is none. */
export const findModifier = (system, subjectId, modifierId) => modifierList(system, subjectId)?.find((modifier) => modifier.id === modifierId);

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** The edited fields whose values differ between the entry as loaded and the copy being edited. A list counts as one field. */
export function entryChanges(base, draft, fields) {
  const changes = {};
  for (const key of fields) if (!same(base[key], draft[key])) changes[key] = structuredClone(draft[key]);
  return changes;
}

/** A copy of the latest entry with the window's changes on top, so an update from elsewhere keeps the GM's unsaved edits. */
export const rebaseEntry = (latest, changes) => ({ ...structuredClone(latest), ...structuredClone(changes), id: latest.id });

/** The skill keys a challenge-level DC change can name: each skill used by a check anywhere in the challenge. */
export const challengeSkillKeys = (system) => [...new Set(system.subjects.flatMap(allChecks).map(skillKey))];

/**
 * Save the window's changes onto a modifier. Its DC change drops links to checks that no longer exist.
 * A challenge-level entry names skills, not checks (spec 14.7). Returns false if the modifier is gone.
 */
export function saveModifier(system, subjectId, modifierId, changes) {
  const modifier = findModifier(system, subjectId, modifierId);
  if (!modifier) return false;
  for (const key of MODIFIER_FIELDS) if (key in changes) modifier[key] = structuredClone(changes[key]);
  modifier.category = String(modifier.category ?? "").trim();
  const subject = subjectId ? subjectById(system, subjectId) : null;
  const checks = new Set(subject ? allChecks(subject).map((check) => check.id) : challengeSkillKeys(system));
  modifier.dc.skills = modifier.dc.skills.filter((skill) => checks.has(skill));
  return true;
}

/** The fields the subject, action and counter windows edit. */
export const SUBJECT_FIELDS = ["name", "category", "revealed", "description"];
export const ACTION_FIELDS = ["name", "secret", "description", "checks"];
export const COUNTER_FIELDS = ["name", "value", "direction", "display", "min", "max", "perRound", "perPc", "revealed", "showThresholdList", "showThresholdMarks", "thresholds"];

/** The subject with this id. The subject window passes it as both ids. */
export const findSubject = (system, subjectId, entryId = subjectId) => subjectById(system, entryId);
export const findAction = (system, subjectId, actionId) => subjectById(system, subjectId)?.actions.find((action) => action.id === actionId);
/** A counter, the challenge's or a subject's, by its id alone. */
export const findCounterEntry = (system, subjectId, counterId) => findCounter(system, counterId)?.counter;

const copyFields = (target, changes, fields) => {
  for (const key of fields) if (key in changes) target[key] = structuredClone(changes[key]);
};

/**
 * Save the subject window's changes. A subject whose category changed moves to the end of its new group (spec 14.4),
 * and one newly revealed hides the others without Allow multiple subjects. Returns false if the subject is gone.
 */
export function saveSubject(system, subjectId, entryId, changes) {
  const subject = findSubject(system, subjectId, entryId);
  if (!subject) return false;
  const wasShown = subject.revealed;
  const before = categoryKey(subject.category);
  copyFields(subject, changes, SUBJECT_FIELDS);
  subject.category = String(subject.category ?? "").trim();
  if (categoryKey(subject.category) !== before) system.subjects = [...system.subjects.filter((other) => other !== subject), subject];
  sortSubjects(system);
  if (subject.revealed && !wasShown) revealOnly(system, subject);
  return true;
}

/** Save the action window's changes. The subject's modifiers drop links to checks the window removed. Returns false if the action is gone. */
export function saveAction(system, subjectId, actionId, changes) {
  const action = findAction(system, subjectId, actionId);
  if (!action) return false;
  copyFields(action, changes, ACTION_FIELDS);
  const subject = subjectById(system, subjectId);
  const checks = new Set(allChecks(subject).map((check) => check.id));
  for (const modifier of subject.modifiers) modifier.dc.skills = modifier.dc.skills.filter((skill) => checks.has(skill));
  return true;
}

/** Save the counter window's changes, then keep its values inside its limits. Returns false if the counter is gone. */
export function saveCounter(system, subjectId, counterId, changes) {
  const counter = findCounterEntry(system, subjectId, counterId);
  if (!counter) return false;
  copyFields(counter, changes, COUNTER_FIELDS);
  clampTracks(system);
  return true;
}

/** The path of a list of entries: "subjects", or a kind ("counters", "actions", "modifiers") on a subject, or on the challenge for an empty subject id. Null if there is none. */
export function entryListPath(system, kind, subjectId) {
  if (kind === "subjects") return "subjects";
  if (!subjectId) return kind === "counters" || kind === "modifiers" ? kind : null;
  const n = system.subjects.findIndex((subject) => subject.id === subjectId);
  return n < 0 ? null : `subjects.${n}.${kind}`;
}

/** Remove an entry by its id, as the sheet's delete buttons do. Returns false if it is gone or must stay. */
export function removeEntry(system, kind, subjectId, entryId) {
  const listPath = entryListPath(system, kind, subjectId);
  const index = listPath ? (getPath(system, listPath) ?? []).findIndex((row) => row.id === entryId) : -1;
  return index >= 0 && removeRow(system, `${listPath}.${index}`);
}

/** A counter's value as text: "3/6" with a maximum, "+12" on a both-ways track, else just the number. */
export function counterValueText(counter, value) {
  if (counter.direction === BOTH_WAYS) return value > 0 ? `+${value}` : `${value}`.replace("-", "\u2212");
  return counter.max === null || counter.max === undefined ? `${value}` : `${value}/${counter.max}`;
}
