/**
 * Checks the rules that need no Foundry: the directory rules and the challenge data edits. Uses Node's test runner:
 *
 *   ELECTRON_RUN_AS_NODE=1 ~/foundryvtt/foundryvtt tools/test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ssm-test-"));
process.on("exit", () => fs.rmSync(tmp, { recursive: true, force: true }));

let nextId = 0;
globalThis.foundry = { utils: { randomID: () => `id${++nextId}` } };

const load = async (name) => {
  const target = path.join(tmp, `${name}.mjs`);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const code = fs.readFileSync(path.join(here, "..", "scripts", `${name}.js`), "utf8").replace(/from "(\.\.?\/[^"]+)\.js"/g, 'from "$1.mjs"');
  fs.writeFileSync(target, code);
  return import(pathToFileURL(target).href);
};
await load("constants");
const R = await load("directory-rules");
const D = await load("challenge/data");
const Run = await load("challenge/run");
const O = await load("roll-option");
const V = await load("challenge/panel-view");
const Reg = await load("registry");
const L = await load("roll-listener");
const Spot = await load("panel/spot");

const MODULE = "pf2e-subsystem-manager";
const challenge = (name, folder) => ({ name, folder, pages: [{ type: `${MODULE}.challenge` }] });
const ordinary = (name, folder) => ({ name, folder, pages: [{ type: "text" }] });
const folder = (id, flagged, parent) => ({ id, folder: parent, flags: flagged ? { [MODULE]: { challengeFolder: true } } : {} });
const node = (f, entries = [], children = []) => ({ folder: f, entries, children });

const flagged = folder("c1", true);
const normal = folder("n1", false);
const tree = () => ({
  root: true,
  entries: [challenge("root-c"), ordinary("root-o")],
  children: [
    node(flagged, [challenge("in-c"), ordinary("o-in-c")]),
    node(normal, [ordinary("in-n"), challenge("c-in-n")]),
  ],
});
const names = (n) => n.entries.map((e) => e.name);

test("Subsystems tab keeps challenges and challenge folders", () => {
  const t = R.pruneTree(tree(), true);
  assert.deepEqual(t.children.map((c) => c.folder.id), ["c1"]);
  assert.deepEqual(names(t.children[0]), ["in-c"]);
});

test("a challenge in a normal folder shows at the Subsystems root", () => {
  assert.deepEqual(names(R.pruneTree(tree(), true)), ["root-c", "c-in-n"]);
});

test("Journal tab keeps ordinary content, and rescues an ordinary entry from a challenge folder", () => {
  const t = R.pruneTree(tree(), false);
  assert.deepEqual(t.children.map((c) => c.folder.id), ["n1"]);
  assert.deepEqual(names(t.children[0]), ["in-n"]);
  assert.deepEqual(names(t), ["root-o", "o-in-c"]);
});

test("stray entries respect the sort order", () => {
  const compare = (a, b) => b.name.localeCompare(a.name);
  assert.deepEqual(names(R.pruneTree(tree(), true, compare)), ["root-c", "c-in-n"].sort().reverse());
});

test("a challenge folder inside a normal folder moves to the root", () => {
  const inner = folder("c2", true, normal);
  const root = { entries: [], children: [node(normal, [], [node(inner, [challenge("deep")])])] };
  const t = R.pruneTree(root, true);
  assert.deepEqual(t.children.map((c) => c.folder.id), ["c2"]);
  assert.deepEqual(names(t.children[0]), ["deep"]);
});

test("pruning leaves the original tree alone", () => {
  const t = tree();
  R.pruneTree(t, true);
  assert.equal(t.entries.length, 2);
  assert.equal(t.children.length, 2);
});

test("the Running filter lists matching challenges from every folder, sorted, with no folders", () => {
  const t = R.flattenTree(R.pruneTree(tree(), true), (e) => e.name !== "root-c", (a, b) => a.name.localeCompare(b.name));
  assert.deepEqual(names(t), ["c-in-n", "in-c"]);
  assert.deepEqual(t.children, []);
});

test("drops are refused in both directions", () => {
  assert.equal(R.dropAllowed(true, true, flagged), true);
  assert.equal(R.dropAllowed(true, true, null), true);
  assert.equal(R.dropAllowed(false, false, normal), true);
  assert.equal(R.dropAllowed(false, true, flagged), false, "ordinary entry into a challenge folder");
  assert.equal(R.dropAllowed(false, true, null), false, "ordinary entry into the Subsystems root");
  assert.equal(R.dropAllowed(true, false, normal), false, "challenge into a normal folder");
  assert.equal(R.dropAllowed(true, false, null), false, "challenge into the Journal root");
  assert.equal(R.dropAllowed(true, true, normal), false, "next to a stray whose folder is normal");
});

test("the round bar fills one segment per round played, and stays within the maximum", () => {
  const filled = (current, max) => V.roundSegments(current, max).map((segment) => (segment.filled ? 1 : 0)).join("");
  assert.equal(filled(3, 5), "11100");
  assert.equal(filled(1, 1), "1");
  assert.equal(filled(7, 5), "11111");
  assert.equal(filled(0, 3), "000");
  assert.equal(filled(2, 0), "");
});

test("the bar copes with negative points and falls back to 10 with no goal", () => {
  assert.deepEqual(V.pointsBar(5, 0), { percent: 50, negative: false });
  assert.deepEqual(V.pointsBar(4, 8), { percent: 50, negative: false });
  assert.deepEqual(V.pointsBar(12, 8), { percent: 100, negative: false });
  assert.deepEqual(V.pointsBar(-3, 0), { percent: 30, negative: true });
  assert.deepEqual(V.pointsBar(-20, 0), { percent: 100, negative: true });
  assert.deepEqual(V.pointsBar(0, 0), { percent: 0, negative: false });
});

test("every change type has an English string", () => {
  const changes = [
    { type: "dc", amount: -2, all: false, skills: [{ skill: "diplomacy", lore: "" }] },
    { type: "dc", amount: -2, all: true, skills: [] },
    { type: "points", amount: 1 }, { type: "points", amount: 3 },
    { type: "rounds", amount: 1 }, { type: "rounds", amount: 3 },
    { type: "counter", amount: -1, counter: "" },
  ];
  const texts = changes.map((change) => V.changeText(change, enText));
  for (const text of texts) assert.ok(text && !text.includes("{") && !text.includes("undefined"), text);
  assert.equal(texts.at(-1), "−1 Unnamed counter");
});

test("a dragged panel stays wholly on screen", () => {
  const screen = { width: 1000, height: 800 };
  const size = { width: 300, height: 200 };
  assert.deepEqual(Spot.clampSpot({ left: 900, top: 700 }, size, screen), { left: 700, top: 600 });
  assert.deepEqual(Spot.clampSpot({ left: -50, top: -10 }, size, screen), { left: 0, top: 0 });
  assert.deepEqual(Spot.clampSpot({ left: 120, top: 40 }, size, screen), { left: 120, top: 40 });
});

test("a panel bigger than the screen keeps its top-left corner visible", () => {
  assert.deepEqual(Spot.clampSpot({ left: 50, top: 50 }, { width: 1200, height: 900 }, { width: 1000, height: 800 }), { left: 0, top: 0 });
});

test("only a spot with two numbers counts as saved", () => {
  assert.deepEqual(Spot.readSpot({ left: 10, top: 20 }), { left: 10, top: 20 });
  for (const value of [undefined, null, {}, { left: 10 }, { left: "10", top: 20 }, { left: NaN, top: 0 }]) assert.equal(Spot.readSpot(value), null);
});

test("a resized panel stays between the smallest size and the room it has", () => {
  const room = { width: 800, height: 600 };
  assert.deepEqual(Spot.clampSize({ width: 400, height: 300 }, room), { width: 400, height: 300 });
  assert.deepEqual(Spot.clampSize({ width: 50, height: 20 }, room), Spot.MIN_SIZE);
  assert.deepEqual(Spot.clampSize({ width: 2000, height: 900 }, room), room);
});

test("a resized panel keeps the smallest size when the room is smaller", () => {
  assert.deepEqual(Spot.clampSize({ width: 300, height: 200 }, { width: 100, height: 50 }), Spot.MIN_SIZE);
});

test("only a size with two numbers counts as saved", () => {
  assert.deepEqual(Spot.readSize({ left: 1, top: 2, width: 300, height: 200 }), { width: 300, height: 200 });
  for (const value of [undefined, null, { left: 1, top: 2 }, { width: 300 }, { width: "300", height: 200 }, { width: 300, height: Infinity }]) assert.equal(Spot.readSize(value), null);
});

test("a player's hover holds the player text only, even if GM text is passed in", () => {
  assert.equal(V.cardTooltip({ playerText: "likes praise", gmText: GM_SECRET, isGM: false }, tipText), '<p class="ssm-panel-tip-line">likes praise</p>');
  assert.equal(V.cardTooltip({ playerText: "", gmText: GM_SECRET, isGM: false }, tipText), "");
  assert.equal(V.cardTooltip({ playerText: "  ", isGM: false }, tipText), "");
});

test("a GM's hover has the player text unlabelled, then GM Only over the GM text, and is empty with neither", () => {
  const gmLine = '<p class="ssm-panel-tip-line"><strong class="ssm-panel-tip-label">GM Only</strong>she is lying</p>';
  assert.equal(V.cardTooltip({ playerText: "likes praise", gmText: "she is lying", isGM: true }, tipText), '<p class="ssm-panel-tip-line">likes praise</p>' + gmLine);
  assert.equal(V.cardTooltip({ playerText: "", gmText: "she is lying", isGM: true }, tipText), gmLine);
  assert.equal(V.cardTooltip({ playerText: "likes praise", gmText: undefined, isGM: true }, tipText), '<p class="ssm-panel-tip-line">likes praise</p>');
  assert.equal(V.cardTooltip({ playerText: "", gmText: "", isGM: true }, tipText), "");
});

test("a hover escapes its text, so it can't add markup", () => {
  const tip = V.cardTooltip({ playerText: '<img src=x onerror="alert(1)">', gmText: "<b>bold</b> & co", isGM: true }, tipText);
  assert.ok(!tip.includes("<img") && !tip.includes("<b>"), tip);
  assert.ok(tip.includes("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;") && tip.includes("&lt;b&gt;bold&lt;/b&gt; &amp; co"), tip);
});

test("a challenge's update drops a sheet change away from its sheet and keeps the rest", () => {
  const ours = `${MODULE}.InfluenceSheet`;
  const nested = { name: "x", flags: { core: { sheetClass: "core.JournalEntrySheet" } } };
  assert.equal(Reg.dropSheetChange(nested, ours), true);
  assert.deepEqual(nested, { name: "x", flags: { core: {} } });
  const dotted = { "flags.core.sheetClass": "", "flags.core.-=sheetClass": null };
  assert.equal(Reg.dropSheetChange(dotted, ours), true);
  assert.deepEqual(dotted, {});
  const repair = { "flags.core.sheetClass": ours, flags: { core: { sheetClass: ours } } };
  assert.equal(Reg.dropSheetChange(repair, ours), false);
  assert.deepEqual(repair, { "flags.core.sheetClass": ours, flags: { core: { sheetClass: ours } } });
  assert.equal(Reg.dropSheetChange({ name: "y" }, ours), false);
});

/* Shared stand-ins */

const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#x27;" })[c]);
const tipText = { escape: escapeHTML, gmLabel: "GM Only" };
/** Stand-ins for Foundry's localisation, using the English strings. */
const EN = JSON.parse(fs.readFileSync(path.join(here, "..", "lang", "en.json"), "utf8"));
const enText = {
  format: (key, data) => key.split(".").reduce((node, part) => node?.[part], EN).replace(/\{(\w+)\}/g, (_, name) => data[name]),
  list: (items) => new Intl.ListFormat("en", { type: "conjunction" }).format(items),
  label: (skill) => (skill.skill === "lore" ? skill.lore : skill.skill[0].toUpperCase() + skill.skill.slice(1)),
  points: "Influence Points",
};

test("only this module's page types count as challenge types", () => {
  assert.equal(R.isChallengeType(`${MODULE}.challenge`), true);
  assert.equal(R.isChallengeType("text"), false);
  assert.equal(R.isChallengeType(undefined), false);
});

/* The challenge data (spec section 14) */

const RUN = () => ({ status: "inactive", acted: [], baseline: null, roundHistory: [], roundsAdded: 0, appliedRolls: [], receivedRolls: [] });
/** A new challenge from a preset, with the fields the data model would add. Language keys stand in for their text. */
const system = (preset = "influence") => ({ ...D.newChallengeSystem(preset), premise: "<p>Banquet</p>", gmNotes: "", counters: [], run: RUN() });
/** An Influence challenge whose NPC has 1 point, thresholds at 2 and 5, a Society check on Influence, and a counter at 3. */
const runSystem = () => {
  const s = system();
  const subject = s.subjects[0];
  subject.points = 1;
  subject.actions[1].checks.push(D.newCheck());
  subject.thresholds.push({ ...D.newThreshold(), points: 2 }, { ...D.newThreshold(), points: 5 });
  s.counters.push({ ...D.newCounter(), name: "Suspicion", value: 3 });
  return s;
};
const running = () => {
  const s = runSystem();
  Run.startRun(s);
  return s;
};
const sub = (s) => s.subjects[0];
const discover = (s) => sub(s).actions[0];
const influence = (s) => sub(s).actions[1];
/** The Society check on Influence: the one check that isn't always shown. */
const society = (s) => influence(s).checks.at(-1);
const rollOf = (s, over = {}) => ({ rollId: "r1", challengeId: "c1", subjectId: sub(s).id, actionId: influence(s).id, checkId: society(s).id, messageId: "m1", actorId: "a1", outcome: "success", dc: null, isReroll: false, ...over });
const discoverRoll = (s, over = {}) => rollOf(s, { actionId: discover(s).id, checkId: discover(s).checks[0].id, ...over });
const effectOf = (type, amount, over = {}) => ({ ...D.newEffect(), type, amount, ...over });

test("a preset fills in the names, the rounds and the first subject", () => {
  const blank = D.newChallengeSystem();
  assert.deepEqual([blank.preset, blank.rounds.max, blank.subjects.length], ["victory", null, 1]);
  assert.deepEqual(blank.subjects[0].actions.map((action) => action.checks.length), [0]);
  assert.deepEqual(D.OUTCOMES.map((outcome) => blank.subjects[0].actions[0].outcomes[outcome].map((row) => row.amount)), [[2], [1], [], [-1]]);
  assert.equal(blank.subjects[0].revealed, false);
  const s = system();
  assert.deepEqual([s.preset, s.rounds.max, s.pointsName], ["influence", 6, "SSM.Preset.influence.Points"]);
  assert.equal(sub(s).revealed, true);
  assert.deepEqual([discover(s).secret, influence(s).secret], [true, false]);
  assert.deepEqual(discover(s).checks.map((row) => [row.skill, row.always]), [["perception", true]]);
  assert.deepEqual(influence(s).checks.map((row) => [row.skill, row.always, row.dc]), [["deception", true, 15], ["diplomacy", true, 15], ["intimidation", true, 15]]);
  assert.deepEqual(D.OUTCOMES.map((outcome) => discover(s).outcomes[outcome].map((row) => row.type)), [["note"], ["note"], ["note"], ["note"]]);
  assert.equal(D.newChallengeSystem("nonsense").preset, "victory");
});

test("addRow picks the right row for each list, and a new subject follows the preset", () => {
  const s = system();
  assert.ok("always" in D.addRow(s, "subjects.0.actions.1.checks"));
  assert.ok("reached" in D.addRow(s, "subjects.0.thresholds"));
  assert.equal(D.addRow(s, "subjects.0.modifiers").effects.length, 1, "a new modifier starts with one effect");
  assert.equal(D.addRow(s, "subjects.0.modifiers.0.effects").type, "note");
  assert.deepEqual(D.addRow(s, "subjects.0.actions").checks, []);
  assert.equal(D.addRow(s, "subjects.0.actions.0.outcomes.failure").type, "points");
  assert.deepEqual(D.addRow(s, "counters").thresholds, []);
  assert.ok("dc" in D.addRow(s, "counters.0.thresholds"));
  assert.equal(D.addRow(s, "subjects").actions.length, 2, "an Influence challenge's new subject has Discover and Influence");
  assert.equal(D.addRow(system("victory"), "subjects").actions.length, 1);
  assert.throws(() => D.addRow(s, "rounds"));
  const ids = [D.newSubject(s).id, D.newEffect().id, D.newCounter().id, D.newAction().id];
  assert.equal(new Set(ids).size, ids.length);
});

test("the last subject and the last effect can't be removed", () => {
  const s = system();
  assert.equal(D.removeRow(s, "subjects.0"), false);
  D.addRow(s, "subjects.0.modifiers");
  assert.equal(D.removeRow(s, "subjects.0.modifiers.0.effects.0"), false);
  D.addRow(s, "subjects");
  assert.equal(D.removeRow(s, "subjects.1"), true);
  assert.equal(s.subjects.length, 1);
  assert.equal(D.removeRow(s, "subjects.0.actions.0.outcomes.success.0"), true, "an outcome row can be empty");
});

test("removing a check, an action or a counter clears the links to it", () => {
  const s = system();
  const kept = D.addRow(s, "subjects.0.actions.0.checks");
  const gone = D.addRow(s, "subjects.0.actions.1.checks");
  const counter = D.addRow(s, "counters");
  const m = D.addRow(s, "subjects.0.modifiers");
  m.effects[0].skills = [kept.id, gone.id, influence(s).checks[0].id];
  m.effects[0].counterId = counter.id;
  influence(s).outcomes.success[0].counterId = counter.id;
  D.removeRow(s, `subjects.0.actions.1.checks.${influence(s).checks.length - 1}`);
  assert.deepEqual(m.effects[0].skills, [kept.id, influence(s).checks[0].id]);
  const outcome = influence(s).outcomes.success[0];
  D.removeRow(s, "counters.0");
  assert.deepEqual([m.effects[0].counterId, outcome.counterId], ["", ""]);
  D.removeRow(s, "subjects.0.actions.1");
  assert.deepEqual(m.effects[0].skills, [kept.id], "an action takes its checks' links with it");
});

test("mergeForm: numbered form rows merge into lists, and absent fields survive", () => {
  const s = system();
  const m = D.addRow(s, "subjects.0.modifiers");
  Object.assign(m.effects[0], { type: "dc", note: "kept", skills: ["a"] });
  const merged = D.mergeForm(s, { subjects: { 0: { name: "Vance", modifiers: { 0: { name: "Art", effects: { 0: { amount: -2, skills: ["b", "c"] } } } } } } });
  assert.equal(merged.subjects[0].name, "Vance");
  assert.deepEqual([merged.subjects[0].modifiers[0].effects[0].amount, merged.subjects[0].modifiers[0].effects[0].note], [-2, "kept"]);
  assert.deepEqual(merged.subjects[0].modifiers[0].effects[0].skills, ["b", "c"]);
  assert.equal(Array.isArray(merged.subjects), true);
  assert.equal(merged.subjects[0].actions[1].checks[0].always, true, "a form with no Always shown field keeps the old value");
});

test("mergeForm: blank numbers keep their value, except limits, the round maximum and a goal", () => {
  const s = system();
  sub(s).goal = 4;
  const c = D.addRow(s, "counters");
  Object.assign(c, { min: 1, max: 5 });
  const merged = D.mergeForm(s, { rounds: { max: null, current: null }, subjects: { 0: { goal: null, points: null, actions: { 1: { checks: { 0: { dc: null } } } } } }, counters: { 0: { min: null, value: null, perRound: null } } });
  assert.deepEqual([merged.rounds.max, merged.rounds.current], [null, 0]);
  assert.deepEqual([merged.subjects[0].goal, merged.subjects[0].points, merged.subjects[0].actions[1].checks[0].dc], [null, 0, 15]);
  assert.deepEqual([merged.counters[0].min, merged.counters[0].max, merged.counters[0].value, merged.counters[0].perRound], [null, 5, 0, 0]);
  assert.equal(D.mergeForm(D.newAction(), { maxPoints: 3 }).maxPoints, 3);
  assert.equal(D.mergeForm({ ...D.newAction(), maxPoints: 3 }, { maxPoints: null }).maxPoints, null);
});

test("clampTracks limits counter values and subject points, per PC too, and reports impossible limits", () => {
  const s = system();
  Object.assign(D.addRow(s, "counters"), { value: 9, max: 5 });
  Object.assign(D.addRow(s, "counters"), { value: -3, min: 0, perPc: true, valueBy: { a1: -5, a2: 2 } });
  Object.assign(D.addRow(s, "counters"), { value: 4, min: 8, max: 2 });
  Object.assign(sub(s), { points: 60, min: -50, max: 50, pointsBy: { a1: -70 } });
  const invalid = D.clampTracks(s);
  assert.deepEqual(s.counters.map((c) => c.value), [5, 0, 4]);
  assert.deepEqual(s.counters[1].valueBy, { a1: 0, a2: 2 });
  assert.deepEqual([sub(s).points, sub(s).pointsBy], [50, { a1: -50 }]);
  assert.equal(invalid.length, 1);
});

test("pickFields keeps named fields at their nested paths", () => {
  const form = { premise: "p", gmNotes: "", rounds: { max: 3 }, counters: { 0: { value: 2, name: "x" } } };
  assert.deepEqual(D.pickFields(form, ["premise", "gmNotes", "counters.0.value", "missing.field"]), { premise: "p", gmNotes: "", counters: { 0: { value: 2 } } });
});

test("applyForm changes the editable parts and never the run state or the preset", () => {
  const s = running();
  Run.changePoints(s, sub(s).id, 2);
  D.applyForm(s, { rounds: { max: 9 }, pointsName: "Favour", preset: "victory", run: { status: "finished" } });
  assert.deepEqual([s.rounds.max, s.pointsName, s.preset, s.run.status, sub(s).points], [9, "Favour", "influence", "active", 3]);
});

test("searchText covers the challenge's text", () => {
  const s = system();
  Object.assign(sub(s), { name: "Vance", statLine: "Perception +12" });
  Object.assign(D.addRow(s, "subjects.0.thresholds"), { gmText: "secret ending" });
  Object.assign(D.addRow(s, "counters"), { name: "Suspicion", thresholds: [{ ...D.newThreshold(), gmText: "guards arrive" }] });
  influence(s).name = "Sway";
  const text = D.searchText(s);
  for (const word of ["Banquet", "Vance", "Perception +12", "secret ending", "Suspicion", "guards arrive", "Sway"]) assert.ok(text.includes(word), word);
});

/* The modifier and action windows */

const modifierSystem = () => {
  const s = system();
  const modifier = D.addRow(s, "subjects.0.modifiers");
  Object.assign(modifier, { name: "Flattery", playerText: "He likes praise" });
  return { s, subject: sub(s), modifier };
};

test("a window saves only the fields the GM changed, and keeps them over an update from elsewhere", () => {
  const { modifier } = modifierSystem();
  const draft = structuredClone(modifier);
  draft.name = "Praise";
  draft.effects[0].note = "He softens";
  assert.deepEqual(Object.keys(D.entryChanges(modifier, draft, D.MODIFIER_FIELDS)).sort(), ["effects", "name"]);
  assert.deepEqual(D.entryChanges(modifier, structuredClone(modifier), D.MODIFIER_FIELDS), {});
  const latest = { ...structuredClone(modifier), active: true, playerText: "Changed elsewhere" };
  const rebased = D.rebaseEntry(latest, D.entryChanges(modifier, { ...structuredClone(modifier), name: "Praise" }, D.MODIFIER_FIELDS));
  assert.deepEqual([rebased.name, rebased.active, rebased.playerText, rebased.id], ["Praise", true, "Changed elsewhere", modifier.id]);
});

test("saving a modifier writes its changes, leaves run changes alone, and drops dead links", () => {
  const { s, subject, modifier } = modifierSystem();
  modifier.active = true;
  const kept = influence(s).checks[0].id;
  const effects = [effectOf("dc", 2, { allSkills: false, skills: [kept, "gone"] }), effectOf("counter", 1, { counterId: "gone" })];
  assert.equal(D.saveModifier(s, subject.id, modifier.id, { name: "Praise", effects }), true);
  const saved = D.findModifier(s, subject.id, modifier.id);
  assert.deepEqual([saved.name, saved.active, saved.playerText], ["Praise", true, "He likes praise"]);
  assert.deepEqual([saved.effects[0].skills, saved.effects[1].counterId], [[kept], ""]);
  D.removeRow(s, "subjects.0.modifiers.0");
  assert.equal(D.saveModifier(s, subject.id, modifier.id, { name: "x" }), false);
});

test("the windows' rows use the shared row edits on the entry alone", () => {
  const { modifier } = modifierSystem();
  const draft = structuredClone(modifier);
  D.addRow(draft, "effects");
  D.setEffectAmount(draft, "effects.1", 5);
  assert.equal(D.removeRow(draft, "effects.0"), true);
  assert.equal(D.removeRow(draft, "effects.0"), false, "a modifier keeps one effect");
  const merged = D.mergeForm(draft, { name: "Praise", effects: { 0: { amount: null, note: "x" } } });
  assert.deepEqual([merged.name, merged.effects[0].amount, merged.effects[0].note], ["Praise", 5, "x"]);
  const action = D.newAction();
  assert.equal(action.description, "", "a new action has an empty description");
  D.addRow(action, "outcomes.failure");
  assert.equal(action.outcomes.failure.length, 1);
  assert.equal(D.removeRow(action, "outcomes.failure.0"), true);
});

test("saving an action writes the window's fields, keeps its checks and what it has given, and drops dead counters", () => {
  const s = system();
  const counter = D.addRow(s, "counters");
  const action = influence(s);
  action.given = 2;
  const outcomes = { ...structuredClone(action.outcomes), failure: [effectOf("counter", 1, { counterId: counter.id }), effectOf("counter", 1, { counterId: "gone" })] };
  assert.equal(D.saveAction(s, sub(s).id, action.id, { name: "Sway", description: "Spend an action\nto sway", maxPoints: 4, outcomes, given: 99, checks: [] }), true);
  assert.deepEqual([action.name, action.description, action.maxPoints, action.given, action.checks.length], ["Sway", "Spend an action\nto sway", 4, 2, 3]);
  assert.match(D.searchText(s), /to sway/);
  assert.deepEqual(action.outcomes.failure.map((row) => row.counterId), [counter.id, ""]);
  assert.equal(D.saveAction(s, sub(s).id, "gone", { name: "x" }), false);
});

/* Rolls */

test("roll option round trip, and only our options parse", () => {
  const data = { challengeId: "Cc1", subjectId: "Ss1", actionId: "Aa1", checkId: "Ee1", rollId: "Rr1" };
  assert.deepEqual(O.parseRollOption(O.buildRollOption(data)), data);
  assert.equal(O.parseRollOption("ssm:skill:diplomacy"), null);
  assert.equal(O.parseRollOption("ssm:roll:a:b:c"), null);
  assert.equal(O.findRollOption(["check", O.buildRollOption(data)]), O.buildRollOption(data));
  assert.equal(O.findRollOption(undefined), null);
});

test("each click of one chat link gets its own roll id; a direct roll is left alone", () => {
  const link = O.buildRollOption({ challengeId: "c", subjectId: "s", actionId: "a", checkId: "e", rollId: O.LINK_ROLL_ID });
  const first = O.stampLinkRoll(["x", link], "one");
  const second = O.stampLinkRoll(["x", link], "two");
  assert.deepEqual([O.parseRollOption(first[1]).rollId, O.parseRollOption(second[1]).rollId, first[0]], ["one", "two", "x"]);
  assert.equal(O.stampLinkRoll(first, "three"), null);
});

test("a roll's card gives the roll's identity, outcome, DC and reroll state; other messages give nothing", () => {
  const option = O.buildRollOption({ challengeId: "c", subjectId: "s", actionId: "a", checkId: "e", rollId: "r" });
  const message = (context) => ({ id: "m1", actor: { id: "a1" }, flags: { pf2e: { context } } });
  assert.deepEqual(L.rollFromMessage(message({ options: ["x", option], outcome: "success", dc: { value: 18 }, isReroll: true })), {
    challengeId: "c", subjectId: "s", actionId: "a", checkId: "e", rollId: "r", messageId: "m1", actorId: "a1", outcome: "success", dc: 18, isReroll: true,
  });
  assert.equal(L.rollFromMessage(message({ options: ["x"] })), null);
  assert.equal(L.rollFromMessage({ flags: {} }), null);
});

test("a Lore slug has one -lore ending", () => {
  const sluggify = (t) => t.toLowerCase().replace(/\s+/g, "-");
  assert.equal(Run.loreSlug("Warfare", sluggify), "warfare-lore");
  assert.equal(Run.loreSlug("Warfare Lore", sluggify), "warfare-lore");
});

test("rolls need a running challenge and a check that is on the roll's action", () => {
  const s = runSystem();
  assert.equal(Run.receiveRoll(s, rollOf(s)), false);
  Run.startRun(s);
  assert.equal(Run.receiveRoll(s, rollOf(s, { checkId: "gone" })), false);
  assert.equal(Run.receiveRoll(s, rollOf(s, { subjectId: "gone" })), false);
  assert.equal(Run.receiveRoll(s, rollOf(s, { actionId: discover(s).id })), false, "an Influence check isn't a Discover check");
  assert.deepEqual(s.run.acted, []);
});

test("a new roll marks the PC acted once, and a reroll doesn't mark them again", () => {
  const s = running();
  Run.receiveRoll(s, rollOf(s));
  Run.receiveRoll(s, rollOf(s, { rollId: "r2" }));
  assert.deepEqual(s.run.acted, ["a1"]);
  s.run.acted = [];
  assert.equal(Run.receiveRoll(s, rollOf(s, { isReroll: true })), false);
  assert.deepEqual(s.run.acted, []);
});

test("Apply does the outcome row: points, and the thresholds they reach", () => {
  const s = running();
  const applied = Run.applyRoll(s, rollOf(s));
  assert.deepEqual([applied.changes, applied.notes, applied.capped, applied.triggers], [[{ type: "points", amount: 1 }], [], false, []]);
  assert.equal(sub(s).points, 2);
  assert.deepEqual(sub(s).thresholds.map((t) => t.reached), [true, false]);
  Run.applyRoll(s, rollOf(s, { rollId: "r2", outcome: "criticalSuccess" }));
  Run.applyRoll(s, rollOf(s, { rollId: "r3", outcome: "criticalFailure" }));
  Run.applyRoll(s, rollOf(s, { rollId: "r4", outcome: "failure" }));
  assert.equal(sub(s).points, 3);
  assert.deepEqual(s.run.appliedRolls, ["r1", "r2", "r3", "r4"]);
});

test("Apply works once per roll, and a reroll of an applied roll can't be applied", () => {
  const s = running();
  Run.applyRoll(s, rollOf(s));
  assert.equal(Run.applyBlock(s, rollOf(s)), "applied");
  assert.equal(Run.applyRoll(s, rollOf(s)), false);
  const reroll = rollOf(s, { isReroll: true, messageId: "m2", outcome: "criticalSuccess" });
  assert.equal(Run.applyBlock(s, reroll), "rerollAfterApply");
  assert.equal(Run.applyRoll(s, reroll), false);
  assert.equal(sub(s).points, 2);
});

test("a reroll of a roll that wasn't applied applies from its own card", () => {
  const s = running();
  assert.equal(Run.applyBlock(s, rollOf(s, { isReroll: true })), "");
  Run.applyRoll(s, rollOf(s, { isReroll: true, outcome: "criticalSuccess" }));
  assert.equal(sub(s).points, 3);
});

test("Apply needs a running challenge and a check that still exists", () => {
  const s = runSystem();
  assert.equal(Run.applyBlock(s, rollOf(s)), "notRunning");
  Run.startRun(s);
  assert.equal(Run.applyBlock(s, rollOf(s, { checkId: "gone" })), "gone");
  assert.equal(Run.applyBlock(s, rollOf(s, { subjectId: "gone" })), "gone");
  assert.equal(Run.applyBlock(s, rollOf(s, { actionId: "gone" })), "gone");
  Run.endRun(s);
  assert.equal(Run.applyBlock(s, rollOf(s)), "notRunning");
  assert.equal(Run.applyRoll(s, rollOf(s)), false);
  assert.equal(sub(s).points, 1);
});

test("an outcome row of notes plans no changes, and an empty or unknown row plans nothing", () => {
  const s = running();
  const plan = Run.outcomePlan(s, discoverRoll(s, { outcome: "criticalSuccess" }));
  assert.deepEqual([plan.changes, plan.notes], [[], ["SSM.Preset.influence.Reminder.criticalSuccess"]]);
  assert.deepEqual(Run.outcomePlan(s, rollOf(s, { outcome: "failure" })), { outcome: "failure", changes: [], notes: [], capped: false });
  assert.deepEqual(Run.outcomePlan(s, rollOf(s, { outcome: "" })), { outcome: "", changes: [], notes: [], capped: false });
  assert.equal(Run.outcomePlan(s, rollOf(s, { checkId: "gone" })), null);
});

test("an outcome row can change a counter and the rounds, name its counter, and skip a missing counter or a zero", () => {
  const s = running();
  const counter = s.counters[0];
  counter.thresholds.push({ ...D.newThreshold(), points: 5, gmText: "Guards" });
  influence(s).outcomes.failure = [effectOf("counter", 2, { counterId: counter.id }), effectOf("counter", 1, { counterId: "gone" }), effectOf("rounds", -1), effectOf("points", 0), effectOf("note", 0, { note: "They notice" })];
  const applied = Run.applyRoll(s, rollOf(s, { outcome: "failure" }));
  assert.deepEqual(applied.changes, [{ type: "counter", amount: 2, counterId: counter.id, counter: "Suspicion" }, { type: "rounds", amount: -1 }]);
  assert.deepEqual(applied.notes, ["They notice"]);
  assert.deepEqual(applied.triggers, [{ counter: "Suspicion", value: 5, note: "Guards" }]);
  assert.deepEqual([counter.value, s.rounds.max, sub(s).points], [5, 5, 1]);
});

test("an action's maximum caps the gains it gives in total, and losses never count", () => {
  const s = running();
  const action = influence(s);
  action.maxPoints = 3;
  Run.applyRoll(s, rollOf(s, { rollId: "r1", outcome: "criticalSuccess" }));
  assert.deepEqual([sub(s).points, action.given], [3, 2]);
  Run.applyRoll(s, rollOf(s, { rollId: "r2", outcome: "criticalFailure" }));
  assert.deepEqual([sub(s).points, action.given], [2, 2]);
  const plan = Run.outcomePlan(s, rollOf(s, { rollId: "r3", outcome: "criticalSuccess" }));
  assert.deepEqual([plan.changes, plan.capped], [[{ type: "points", amount: 1 }], true]);
  Run.applyRoll(s, rollOf(s, { rollId: "r3", outcome: "criticalSuccess" }));
  const spent = Run.outcomePlan(s, rollOf(s, { rollId: "r4" }));
  assert.deepEqual([spent.changes, spent.capped, sub(s).points], [[], true, 3]);
  const counter = s.counters[0];
  action.given = 0;
  action.outcomes.success = [effectOf("counter", 5, { counterId: counter.id })];
  Run.applyRoll(s, rollOf(s, { rollId: "r5" }));
  assert.equal(counter.value, 6, "a counter gain is capped too");
});

/* Tracks: goals, direction, individual subjects */

test("reaching the goal marks a subject Complete, and only the GM clears it", () => {
  const s = running();
  sub(s).goal = 3;
  Run.changePoints(s, sub(s).id, 1);
  assert.equal(sub(s).complete, false);
  Run.changePoints(s, sub(s).id, 1);
  assert.equal(sub(s).complete, true);
  Run.changePoints(s, sub(s).id, -2);
  assert.equal(sub(s).complete, true, "dropping points never clears it");
  Run.toggleComplete(s, sub(s).id);
  assert.equal(sub(s).complete, false);
  Run.toggleComplete(s, sub(s).id);
  assert.equal(sub(s).complete, true);
  assert.equal(Run.toggleComplete(s, "gone"), false);
});

test("a track that counts down reaches its thresholds and goal as it falls", () => {
  const s = running();
  Object.assign(sub(s), { direction: "down", points: 6, goal: 0 });
  sub(s).thresholds = [{ ...D.newThreshold(), points: 4 }, { ...D.newThreshold(), points: 2 }];
  Run.changePoints(s, sub(s).id, 1);
  assert.deepEqual(sub(s).thresholds.map((t) => t.reached), [false, false], "moving away reaches nothing");
  Run.changePoints(s, sub(s).id, -3);
  assert.deepEqual(sub(s).thresholds.map((t) => t.reached), [true, false]);
  Run.changePoints(s, sub(s).id, -4);
  assert.deepEqual([sub(s).thresholds[1].reached, sub(s).complete], [true, true]);
  assert.equal(Run.hasReached("down", 2, 2), true);
  assert.equal(Run.hasReached("up", 1, 2), false);
});

test("an individual subject keeps points per PC, starting from the subject's own, and each PC completes alone", () => {
  const s = running();
  Object.assign(sub(s), { individual: true, points: 0, goal: 2 });
  Run.applyRoll(s, rollOf(s, { rollId: "r1", actorId: "a1", outcome: "criticalSuccess" }));
  Run.applyRoll(s, rollOf(s, { rollId: "r2", actorId: "a2" }));
  assert.deepEqual([Run.pointsOf(sub(s), "a1"), Run.pointsOf(sub(s), "a2"), Run.pointsOf(sub(s), "a3"), sub(s).points], [2, 1, 0, 0]);
  assert.deepEqual(sub(s).completeBy, ["a1"]);
  assert.equal(Run.isComplete(sub(s), ["a1", "a2"]), false);
  Run.changePoints(s, sub(s).id, 1, "a2");
  assert.equal(Run.isComplete(sub(s), ["a1", "a2"]), true);
  assert.equal(Run.isComplete(sub(s), []), false, "an empty party completes nothing");
  assert.equal(Run.changePoints(s, sub(s).id, 1), false, "with no PC named, nothing changes");
  assert.deepEqual(Run.outcomePlan(s, rollOf(s, { rollId: "r3", actorId: "" })).changes, []);
  Run.toggleComplete(s, sub(s).id, "a1");
  assert.deepEqual(sub(s).completeBy, ["a2"]);
  Run.toggleComplete(s, sub(s).id, "a1");
  assert.deepEqual(sub(s).completeBy, ["a2", "a1"]);
});

test("a subject that tracks no points takes none", () => {
  const s = running();
  sub(s).tracksPoints = false;
  assert.equal(Run.changePoints(s, sub(s).id, 2), false);
  assert.deepEqual(Run.outcomePlan(s, rollOf(s)).changes, []);
  assert.equal(sub(s).points, 1);
});

test("the Reached tag toggles a threshold both ways on a subject or a counter, and a track moving back never clears it", () => {
  const s = runSystem();
  const subject = sub(s);
  const t = subject.thresholds[0];
  Run.changePoints(s, subject.id, t.points);
  assert.equal(t.reached, true);
  Run.toggleReached(s, subject.id, t.id);
  assert.equal(t.reached, false);
  Run.toggleReached(s, subject.id, t.id);
  Run.changePoints(s, subject.id, -t.points);
  assert.equal(t.reached, true);
  assert.equal(Run.toggleReached(s, subject.id, "gone"), false);
  assert.equal(Run.toggleReached(s, "gone", t.id), false);
  const counter = s.counters[0];
  const ct = D.addRow(s, "counters.0.thresholds");
  Run.toggleReached(s, counter.id, ct.id);
  assert.equal(ct.reached, true);
  Run.cycleThresholdReveal(s, counter.id, ct.id);
  assert.equal(ct.reveal, "points");
});

test("the threshold reveal cycle finds the threshold by its owner, so two subjects can share threshold ids", () => {
  const s = runSystem();
  const second = D.addRow(s, "subjects");
  second.thresholds = structuredClone(sub(s).thresholds);
  const id = second.thresholds[0].id;
  Run.cycleThresholdReveal(s, second.id, id);
  Run.cycleThresholdReveal(s, second.id, id);
  assert.deepEqual([sub(s).thresholds[0].reveal, second.thresholds[0].reveal], ["hidden", "full"]);
  Run.cycleThresholdReveal(s, second.id, id);
  assert.equal(second.thresholds[0].reveal, "hidden");
  assert.equal(Run.cycleThresholdReveal(s, second.id, "gone"), false);
});

/* Rounds, reveal and reset */

test("rounds advance to the maximum, clear markers, and undo brings them back", () => {
  const s = runSystem();
  s.rounds.max = 2;
  assert.equal(Run.advanceRound(s), false);
  Run.startRun(s);
  assert.equal(s.rounds.current, 1);
  s.run.acted = ["a1"];
  assert.deepEqual(Run.advanceRound(s), { triggers: [] });
  assert.deepEqual([s.rounds.current, s.run.acted], [2, []]);
  assert.equal(Run.advanceRound(s), false);
  Run.undoRound(s);
  assert.deepEqual([s.rounds.current, s.run.acted], [1, ["a1"]]);
  assert.equal(Run.undoRound(s), false);
});

test("a blank round maximum means no limit, and a Rounds effect then changes nothing", () => {
  const s = running();
  s.rounds.max = null;
  for (let i = 0; i < 20; i++) Run.advanceRound(s);
  assert.equal(s.rounds.current, 21);
  const m = { ...D.newModifier(), active: true, effects: [effectOf("rounds", 2)] };
  sub(s).modifiers.push(m);
  Run.applyModifier(s, sub(s).id, m.id);
  Run.resetRun(s);
  assert.deepEqual([s.rounds.max, s.rounds.current], [null, 0]);
});

test("a counter's change each round is added on Next round, and Previous round takes it and its thresholds back", () => {
  const s = running();
  const counter = s.counters[0];
  Object.assign(counter, { perRound: 1, thresholds: [{ ...D.newThreshold(), points: 4, gmText: "Guards", dc: 1 }] });
  assert.deepEqual(Run.advanceRound(s).triggers, [{ counter: "Suspicion", value: 4, note: "Guards" }]);
  assert.deepEqual([counter.value, counter.thresholds[0].reached, Run.currentDc(s, sub(s), society(s))], [4, true, 16]);
  Run.advanceRound(s);
  assert.equal(counter.value, 5);
  Run.undoRound(s);
  assert.deepEqual([counter.value, counter.thresholds[0].reached], [4, true], "the second advance reached nothing, so it clears nothing");
  Run.undoRound(s);
  assert.deepEqual([counter.value, counter.thresholds[0].reached], [3, false]);
  Object.assign(counter, { value: 5, max: 5 });
  Run.advanceRound(s);
  Run.changeCounter(s, counter.id, -2);
  Run.undoRound(s);
  assert.equal(counter.value, 3, "a counter at its limit didn't move, so undo leaves it alone");
});

test("reveal toggles and undoes, for subjects, checks, modifiers and counters", () => {
  const s = runSystem();
  const modifier = D.addRow(s, "subjects.0.modifiers");
  for (const row of [society(s), s.counters[0], modifier]) {
    Run.toggleReveal(s, row.id);
    assert.equal(row.revealed, true);
    Run.toggleReveal(s, row.id);
    assert.equal(row.revealed, false);
  }
  Run.toggleReveal(s, sub(s).id);
  assert.equal(sub(s).revealed, false, "an Influence NPC starts revealed");
  assert.equal(Run.toggleReveal(s, "gone"), false);
});

test("the acted marker toggles", () => {
  const s = runSystem();
  Run.toggleActed(s, "a1");
  assert.deepEqual(s.run.acted, ["a1"]);
  Run.toggleActed(s, "a1");
  assert.deepEqual(s.run.acted, []);
});

test("end keeps the final state; reset returns to how the run started", () => {
  const s = runSystem();
  const subject = sub(s);
  discover(s).checks.push({ ...D.newCheck(), revealed: true });
  subject.goal = 4;
  s.counters[0].thresholds.push({ ...D.newThreshold(), points: 5, reveal: "points" });
  Run.startRun(s);
  assert.equal(Run.startRun(s), false);
  Run.changePoints(s, subject.id, 4);
  Run.toggleReveal(s, society(s).id);
  Run.toggleReveal(s, discover(s).checks[1].id);
  Run.toggleReveal(s, subject.id);
  society(s).dc = 22;
  Run.changeCounter(s, s.counters[0].id, 6);
  Run.cycleThresholdReveal(s, s.counters[0].id, s.counters[0].thresholds[0].id);
  Run.receiveRoll(s, rollOf(s));
  Run.applyRoll(s, rollOf(s, { rollId: "r2" }));
  Run.advanceRound(s);
  Run.endRun(s);
  assert.deepEqual([s.run.status, subject.points, subject.complete, influence(s).given], ["finished", 6, true, 1]);
  Run.resetRun(s);
  assert.equal(s.run.status, "inactive");
  assert.deepEqual([s.rounds.current, subject.points, subject.complete, subject.revealed, influence(s).given, s.counters[0].value], [0, 1, false, true, 0, 3]);
  assert.deepEqual(subject.thresholds.map((t) => t.reached), [false, false]);
  assert.deepEqual([s.counters[0].thresholds[0].reached, s.counters[0].thresholds[0].reveal], [false, "points"]);
  assert.deepEqual([society(s).revealed, discover(s).checks[1].revealed, society(s).dc], [false, true, 22]);
  for (const list of ["acted", "roundHistory", "appliedRolls", "receivedRolls"]) assert.deepEqual(s.run[list], [], list);
  assert.equal(s.run.baseline, null);
  assert.equal(Run.resetRun(s), false);
});

test("reset clears per-PC points and marks", () => {
  const s = runSystem();
  Object.assign(sub(s), { individual: true, points: 0, goal: 1 });
  Run.startRun(s);
  Run.applyRoll(s, rollOf(s));
  assert.deepEqual([sub(s).pointsBy, sub(s).completeBy], [{ a1: 1 }, ["a1"]]);
  Run.resetRun(s);
  assert.deepEqual([sub(s).pointsBy, sub(s).completeBy], [{}, []]);
});

test("rows, subjects and counters added during a run go back to hidden and unreached on reset, and keep their place", () => {
  const s = running();
  const late = [D.addRow(s, "subjects.0.actions.0.checks"), D.addRow(s, "subjects.0.actions.1.checks"), D.addRow(s, "subjects.0.modifiers")];
  for (const row of late) row.revealed = true;
  Object.assign(late[2], { active: true, spent: true });
  Object.assign(D.addRow(s, "subjects.0.thresholds"), { reveal: "full", reached: true });
  const subject = D.addRow(s, "subjects");
  Object.assign(subject, { points: 3, complete: true });
  subject.thresholds.push({ ...D.newThreshold(), reached: true });
  const counter = D.addRow(s, "counters");
  counter.value = 2;
  counter.thresholds.push({ ...D.newThreshold(), points: 4 });
  Run.changeCounter(s, counter.id, 3);
  Run.toggleReveal(s, counter.id);
  Run.resetRun(s);
  assert.deepEqual(late.map((row) => row.revealed), [false, false, false]);
  assert.deepEqual([late[2].active, late[2].spent], [false, false]);
  assert.deepEqual([sub(s).thresholds.at(-1).reveal, sub(s).thresholds.at(-1).reached], ["hidden", false]);
  assert.deepEqual([subject.points, subject.complete, subject.revealed, subject.thresholds[0].reached], [3, false, false, false], "a new subject has no start points to go back to");
  assert.deepEqual([counter.value, counter.revealed, counter.thresholds[0].reached], [2, false, false]);
  assert.equal(influence(s).checks.at(-1).id, late[1].id);
});

test("a copy of a running challenge goes back to its start values; one that never started reports no change", () => {
  const s = running();
  Run.changePoints(s, sub(s).id, 3);
  assert.notEqual(Run.resetRun(s), false);
  assert.deepEqual([s.run.status, sub(s).points], ["inactive", 1]);
  assert.equal(Run.resetRun(runSystem()), false);
});

/* DCs and modifier entries */

const addModifier = (s, over = {}, effects = [{}]) => {
  const m = { ...D.newModifier(), active: true, name: "Entry", ...over };
  m.effects = effects.map((row) => ({ ...D.newEffect(), ...row }));
  sub(s).modifiers.push(m);
  return m;
};
const dcOf = (s, row = society(s)) => Run.currentDc(s, sub(s), row);
const dcEffect = (amount, over = {}) => ({ type: "dc", amount, ...over });
const rollAt = (s, rollId, dc, over = {}) => rollOf(s, { rollId, dc, ...over });

test("current DC adds what's on, and ignores what's off or spent", () => {
  const s = running();
  const on = addModifier(s, {}, [dcEffect(-2)]);
  addModifier(s, { active: false }, [dcEffect(5)]);
  addModifier(s, { spent: true }, [dcEffect(5)]);
  assert.equal(dcOf(s), 13);
  on.active = false;
  assert.equal(dcOf(s), 15);
});

test("a DC change on chosen checks matches only those checks, on any action, and the DC can't go below 0", () => {
  const s = running();
  const perception = discover(s).checks[0];
  addModifier(s, {}, [dcEffect(5, { allSkills: false, skills: [perception.id] })]);
  assert.deepEqual([dcOf(s), dcOf(s, perception)], [15, 20]);
  addModifier(s, {}, [dcEffect(-99)]);
  assert.equal(dcOf(s), 0);
});

test("a reached threshold's DC change applies while it is reached: a subject's to its own checks, a counter's to every check", () => {
  const s = running();
  const other = D.addRow(s, "subjects");
  const otherCheck = other.actions[1].checks[0];
  sub(s).thresholds[0].dc = 2;
  s.counters[0].thresholds.push({ ...D.newThreshold(), points: 4, dc: 1 });
  assert.equal(dcOf(s), 15);
  Run.changePoints(s, sub(s).id, 1);
  assert.deepEqual([dcOf(s), Run.currentDc(s, other, otherCheck)], [17, 15]);
  Run.changeCounter(s, s.counters[0].id, 1);
  assert.deepEqual([dcOf(s), Run.currentDc(s, other, otherCheck)], [18, 16]);
  Run.toggleReached(s, sub(s).id, sub(s).thresholds[0].id);
  assert.equal(dcOf(s), 16);
});

test("a one-time DC change is spent when its roll arrives, and Apply doesn't spend again", () => {
  const s = running();
  const m = addModifier(s, { duration: "oneTime" }, [dcEffect(-2)]);
  const other = addModifier(s, { duration: "oneTime", active: false }, [dcEffect(-2)]);
  Run.receiveRoll(s, rollAt(s, "r1", 13));
  assert.deepEqual([m.spent, dcOf(s)], [true, 15]);
  other.active = true;
  Run.applyRoll(s, rollAt(s, "r1", 13));
  assert.equal(other.spent, false, "a received roll's Apply leaves a newer entry alone, even at the same DC");
  assert.equal(sub(s).points, 2);
});

test("two arriving rolls at a one-time DC: the first spends it, and the next check is at the normal DC", () => {
  const s = running();
  const m = addModifier(s, { duration: "oneTime" }, [dcEffect(-2)]);
  Run.receiveRoll(s, rollAt(s, "r1", dcOf(s)));
  assert.deepEqual([m.spent, dcOf(s)], [true, 15]);
  Run.receiveRoll(s, rollAt(s, "r2", dcOf(s), { actorId: "a2" }));
  Run.applyRoll(s, rollAt(s, "r1", 13));
  Run.applyRoll(s, rollAt(s, "r2", 15));
  assert.equal(sub(s).points, 3);
});

test("an ongoing DC change is never spent, by arrival or Apply", () => {
  const s = running();
  const m = addModifier(s, {}, [dcEffect(-2)]);
  Run.receiveRoll(s, rollAt(s, "r1", 13));
  Run.applyRoll(s, rollAt(s, "r1", 13));
  assert.deepEqual([m.spent, dcOf(s)], [false, 13]);
});

test("rolls that arrived with no active GM spend at Apply: the first applied spends it, and the second still gets its points", () => {
  const s = running();
  const m = addModifier(s, { duration: "oneTime" }, [dcEffect(-2)]);
  Run.applyRoll(s, rollAt(s, "r2", 13));
  assert.equal(m.spent, true);
  Run.applyRoll(s, rollAt(s, "r1", 13));
  assert.equal(sub(s).points, 3);
});

test("a roll and its reroll spend a one-time entry once, and Apply doesn't spend it again after Restore", () => {
  const s = running();
  const m = addModifier(s, { duration: "oneTime" }, [dcEffect(-2)]);
  Run.receiveRoll(s, rollAt(s, "r1", 13));
  Run.receiveRoll(s, rollAt(s, "r1", 13, { isReroll: true }));
  assert.equal(m.spent, true);
  Run.restoreModifier(s, sub(s).id, m.id);
  Run.applyRoll(s, rollAt(s, "r1", 13, { isReroll: true, outcome: "criticalSuccess" }));
  assert.equal(m.spent, false, "the roll was received, so its Apply spends nothing");
  assert.equal(sub(s).points, 3);
});

test("a roll at another DC, or with the entry off, leaves one-time entries alone and still gets its points", () => {
  const s = running();
  const m = addModifier(s, { duration: "oneTime" }, [dcEffect(-2)]);
  Run.applyRoll(s, rollAt(s, "r1", 15));
  assert.deepEqual([m.spent, sub(s).points], [false, 2]);
  Run.toggleModifier(s, sub(s).id, m.id);
  Run.applyRoll(s, rollAt(s, "r2", 13));
  assert.equal(m.spent, false);
  Run.toggleModifier(s, sub(s).id, m.id);
  assert.equal(dcOf(s), 13, "on again, it applies to the next check");
});

test("a secret check spends a matching one-time entry when it arrives", () => {
  const s = running();
  const row = discover(s).checks[0];
  const m = addModifier(s, { duration: "oneTime" }, [dcEffect(2, { allSkills: false, skills: [row.id] })]);
  Run.receiveRoll(s, discoverRoll(s, { rollId: "r1", dc: 15 }));
  assert.equal(m.spent, false, "this roll's DC didn't include it");
  Run.receiveRoll(s, discoverRoll(s, { rollId: "r2", dc: 17, isReroll: true }));
  assert.equal(m.spent, false, "a reroll spends nothing");
  Run.receiveRoll(s, discoverRoll(s, { rollId: "r3", dc: 17 }));
  assert.equal(m.spent, true);
});

test("Apply does each effect of an entry, and ongoing entries can repeat", () => {
  const s = running();
  const m = addModifier(s, {}, [{ type: "points", amount: 2 }, { type: "counter", amount: -1, counterId: s.counters[0].id }, { type: "rounds", amount: 1 }, { type: "note", note: "She leaves" }]);
  Run.applyModifier(s, sub(s).id, m.id);
  assert.deepEqual([sub(s).points, s.counters[0].value, s.rounds.max, m.spent], [3, 2, 7, false]);
  assert.deepEqual(sub(s).thresholds.map((t) => t.reached), [true, false]);
  Run.applyModifier(s, sub(s).id, m.id);
  assert.equal(sub(s).points, 5);
});

test("an entry's points effect on an individual subject changes every party PC's points, and any other PC's who has some", () => {
  const s = running();
  Object.assign(sub(s), { individual: true, points: 0 });
  sub(s).pointsBy = { guest: 4 };
  const m = addModifier(s, {}, [{ type: "points", amount: 2 }]);
  Run.applyModifier(s, sub(s).id, m.id, ["a1", "a2"]);
  assert.deepEqual(sub(s).pointsBy, { guest: 6, a1: 2, a2: 2 });
});

test("an entry's Apply needs the run active and the entry on", () => {
  const s = running();
  const m = addModifier(s, { active: false }, [{ type: "points", amount: 2 }]);
  assert.equal(Run.applyModifier(s, sub(s).id, m.id), false);
  m.active = true;
  Run.endRun(s);
  assert.equal(Run.applyModifier(s, sub(s).id, m.id), false);
  assert.equal(Run.toggleModifier(s, sub(s).id, m.id), false);
  assert.equal(sub(s).points, 1);
});

test("a one-time entry applies once, is spent, and restores", () => {
  const s = running();
  const m = addModifier(s, { duration: "oneTime" }, [{ type: "points", amount: 2 }]);
  Run.applyModifier(s, sub(s).id, m.id);
  assert.equal(m.spent, true);
  assert.equal(Run.applyModifier(s, sub(s).id, m.id), false);
  assert.equal(Run.toggleModifier(s, sub(s).id, m.id), false, "a spent entry needs Restore");
  Run.restoreModifier(s, sub(s).id, m.id);
  assert.deepEqual([m.spent, m.applied, m.active, sub(s).points], [false, false, true, 3]);
  assert.equal(Run.restoreModifier(s, sub(s).id, m.id), false);
});

test("a one-time entry with both kinds applies once and is spent by its check", () => {
  const s = running();
  const m = addModifier(s, { duration: "oneTime" }, [dcEffect(-2), { type: "points", amount: 1 }]);
  Run.applyModifier(s, sub(s).id, m.id);
  assert.deepEqual([m.applied, m.spent], [true, false]);
  assert.equal(Run.applyModifier(s, sub(s).id, m.id), false);
  assert.equal(dcOf(s), 13, "the DC change still waits for its check");
  Run.applyRoll(s, rollAt(s, "r1", 13));
  assert.deepEqual([m.spent, dcOf(s)], [true, 15]);
});

test("removing rounds never goes below the current round, and undo stays in step", () => {
  const s = running();
  s.rounds.max = 3;
  Run.advanceRound(s);
  const m = addModifier(s, {}, [{ type: "rounds", amount: -9 }]);
  Run.applyModifier(s, sub(s).id, m.id);
  assert.deepEqual([s.rounds.current, s.rounds.max], [2, 2]);
  Run.undoRound(s);
  assert.deepEqual([s.rounds.current, s.rounds.max], [1, 2]);
  assert.notEqual(Run.advanceRound(s), false);
  assert.equal(Run.advanceRound(s), false, "the shorter clock holds");
});

test("counters stop at their limits, and a counter at its limit does not move", () => {
  const s = running();
  const c = s.counters[0];
  Object.assign(c, { value: 4, min: 0, max: 5 });
  Run.changeCounter(s, c.id, 1);
  assert.equal(Run.changeCounter(s, c.id, 1), false);
  assert.equal(c.value, 5);
  const m = addModifier(s, {}, [{ type: "counter", amount: -99, counterId: c.id }]);
  Run.applyModifier(s, sub(s).id, m.id);
  assert.equal(c.value, 0);
});

test("a counter threshold gives a notice when the counter reaches or passes it in its direction, once", () => {
  const s = running();
  const c = s.counters[0];
  Object.assign(c, { value: 0, thresholds: [{ ...D.newThreshold(), points: 2, gmText: "Guards" }, { ...D.newThreshold(), points: 4 }] });
  assert.deepEqual(Run.changeCounter(s, c.id, 1).triggers, []);
  assert.deepEqual(Run.changeCounter(s, c.id, 1).triggers, [{ counter: "Suspicion", value: 2, note: "Guards" }]);
  assert.deepEqual(Run.changeCounter(s, c.id, 3).triggers, [{ counter: "Suspicion", value: 4, note: "" }]);
  assert.deepEqual(Run.changeCounter(s, c.id, -5).triggers, [], "moving back reaches nothing");
  assert.deepEqual(Run.changeCounter(s, c.id, 5).triggers, [], "a reached threshold gives no second notice");
  assert.equal(Run.triggerKey({ note: "x" }), "SSM.Challenge.TriggerNotice");
  assert.equal(Run.triggerKey({ note: "" }), "SSM.Challenge.TriggerNoticeBare");
  Object.assign(c, { direction: "down", value: 3, thresholds: [{ ...D.newThreshold(), points: 1 }] });
  assert.equal(Run.changeCounter(s, c.id, -2).triggers.length, 1);
});

test("a Rounds effect, counter change and modifier state all go back on reset, and a hand edit of the maximum survives", () => {
  const s = runSystem();
  const c = s.counters[0];
  const wasOn = addModifier(s, { duration: "oneTime" }, [{ type: "rounds", amount: 2 }]);
  const wasOff = addModifier(s, { active: false }, [dcEffect(2)]);
  Run.startRun(s);
  Run.applyModifier(s, sub(s).id, wasOn.id);
  Run.toggleModifier(s, sub(s).id, wasOff.id);
  Run.changeCounter(s, c.id, 2);
  assert.equal(s.rounds.max, 8);
  s.rounds.max = 11;
  Run.resetRun(s);
  assert.deepEqual([wasOn.active, wasOn.spent, wasOn.applied, wasOff.active], [true, false, false, false]);
  assert.deepEqual([s.rounds.max, c.value, s.run.roundsAdded], [9, 3, 0]);
});

/* The filtered copy */

const GM_SECRET = "GMSECRET";
/** A running challenge with one entry of every kind, none revealed, and GM-only text in every GM field. */
const secretSystem = () => {
  const s = runSystem();
  s.premise = `<p>${GM_SECRET} premise</p>`;
  s.gmNotes = `<p>${GM_SECRET} notes</p>`;
  const subject = sub(s);
  Object.assign(subject, { name: "Lady Vance", statLine: `${GM_SECRET} stats` });
  subject.thresholds = [{ ...D.newThreshold(), points: 8, dc: 3, playerText: "she offers an introduction", gmText: `${GM_SECRET} threshold` }];
  subject.modifiers = [{ ...D.newModifier(), name: "Flattery", playerText: "likes praise", gmText: `${GM_SECRET} modifier`, effects: [{ ...D.newEffect(), note: `${GM_SECRET} effect` }] }];
  influence(s).outcomes.failure = [effectOf("note", 0, { note: `${GM_SECRET} outcome` })];
  s.counters = [{ ...D.newCounter(), name: "Suspicion", value: 3, min: -111, max: 222, perRound: 1, thresholds: [{ ...D.newThreshold(), points: 5, playerText: "the guards stir", gmText: `${GM_SECRET} counter threshold` }] }];
  Run.startRun(s);
  return s;
};
const PARTY = [{ id: "a1", name: "Ezren", img: "ezren.webp" }, { id: "a2", name: "Amiri", img: "" }];
const viewOf = (s, party = []) => V.buildPanelView({ name: "Banquet", system: s, party });
/** A subject's panel cards, section by section, as one list. */
const known = (subject) => subject.modifierGroups.flatMap((group) => group.cards);
/** Every key and every value in a copy, at any depth. */
const scan = (value, found = { keys: new Set(), values: new Set() }) => {
  if (Array.isArray(value)) value.forEach((item) => scan(item, found));
  else if (value && typeof value === "object") for (const [key, item] of Object.entries(value)) {
    found.keys.add(key);
    scan(item, found);
  } else found.values.add(value);
  return found;
};
const revealAll = (s) => {
  for (const subject of s.subjects) {
    for (const row of [...subject.actions.flatMap((action) => action.checks), ...subject.modifiers]) row.revealed = true;
    for (const row of subject.thresholds) row.reveal = "full";
  }
  for (const counter of s.counters) {
    counter.revealed = true;
    for (const row of counter.thresholds) row.reveal = "full";
  }
};
const assertNoSecrets = (view) => {
  const { keys } = scan(view);
  for (const key of ["decoy", "always", "gmText", "gmNotes", "premise", "statLine", "revealed", "effects", "outcomes", "maxPoints", "given", "min", "perRound", "goal", "direction", "pointsBy", "completeBy", "baseline", "run", "preset"]) assert.ok(!keys.has(key), `key ${key} must not appear`);
  assert.ok(!JSON.stringify(view).includes(GM_SECRET), "GM text must not appear");
};

test("the copy shows only the defaults before anything is revealed", () => {
  const s = secretSystem();
  sub(s).points = 2;
  const view = viewOf(s);
  assert.deepEqual([view.name, view.pointsName, view.subjectLabel], ["Banquet", "SSM.Preset.influence.Points", "SSM.Preset.influence.Subject"]);
  assert.deepEqual(view.rounds, { current: 1, max: 6 });
  const [subject] = view.subjects;
  assert.deepEqual([subject.name, subject.points, subject.tracksPoints, subject.individual, subject.complete], ["Lady Vance", 2, true, false, false]);
  assert.deepEqual(subject.actions.map((action) => [action.name, action.secret, action.checks.map((row) => row.skill)]), [
    ["SSM.Preset.influence.Discover", true, ["perception"]],
    ["SSM.Preset.influence.Influence", false, ["deception", "diplomacy", "intimidation"]],
  ]);
  assert.deepEqual([known(subject), subject.thresholds, subject.pcs, view.counters], [[], [], [], []]);
  assertNoSecrets(view);
  for (const word of ["Flattery", "Suspicion", "introduction", "guards"]) assert.ok(!JSON.stringify(view).includes(word), word);
});

test("a hidden subject is not in the copy at all, and revealing it puts it in", () => {
  const s = secretSystem();
  const hidden = D.addRow(s, "subjects");
  Object.assign(hidden, { name: "Lord Ostrov", revealed: false });
  assert.deepEqual(viewOf(s).subjects.map((subject) => subject.name), ["Lady Vance"]);
  assert.ok(!JSON.stringify(viewOf(s)).includes(hidden.id));
  Run.toggleReveal(s, hidden.id);
  assert.deepEqual(viewOf(s).subjects.map((subject) => subject.name), ["Lady Vance", "Lord Ostrov"]);
});

test("hidden checks put no id or DC in the copy, and an action with none visible is left out", () => {
  const s = secretSystem();
  society(s).dc = 987;
  const secretAction = D.addRow(s, "subjects.0.actions");
  secretAction.name = "Bribe";
  secretAction.checks.push({ ...D.newCheck(), dc: 654 });
  const text = JSON.stringify(viewOf(s));
  for (const part of ["987", "654", society(s).id, "Bribe", secretAction.id]) assert.ok(!text.includes(part), part);
});

test("revealing each kind of entry adds it, and only its player fields", () => {
  const s = secretSystem();
  revealAll(s);
  const view = viewOf(s);
  const subject = sub(s);
  assert.deepEqual(view.subjects[0].actions[1].checks.at(-1), { id: society(s).id, skill: "society", lore: "", dc: 15 });
  assert.deepEqual(known(view.subjects[0]), [{ id: subject.modifiers[0].id, name: "Flattery", text: "likes praise", category: "", colour: "", duration: "ongoing", active: false, spent: false, applied: false, changes: [] }]);
  assert.deepEqual(view.subjects[0].thresholds, [{ id: subject.thresholds[0].id, points: 8, text: "she offers an introduction", textHidden: false, reached: false }]);
  assert.deepEqual(view.counters, [{ id: s.counters[0].id, name: "Suspicion", value: 3, perPc: false, pcs: [], track: true, scale: 222, range: null, thresholds: [{ id: s.counters[0].thresholds[0].id, points: 5, text: "the guards stir", textHidden: false, reached: false }] }]);
  assertNoSecrets(view);
  Run.toggleReveal(s, society(s).id);
  assert.equal(viewOf(s).subjects[0].actions[1].checks.length, 3, "hiding an entry again takes it back out");
});

test("a visible check carries its current DC for the roll, thresholds and one-time entries included", () => {
  const s = secretSystem();
  revealAll(s);
  sub(s).modifiers.push({ ...D.newModifier(), active: true, duration: "oneTime", effects: [effectOf("dc", -2)] });
  sub(s).thresholds[0].reached = true;
  const view = viewOf(s);
  const found = V.findPanelRow(view, { subject: sub(s).id, act: influence(s).id, id: society(s).id });
  assert.deepEqual([found.row.dc, found.action.secret, found.subject.name], [16, false, "Lady Vance"]);
  assert.equal(V.findPanelRow(view, { subject: sub(s).id, act: discover(s).id, id: society(s).id }), null, "a check is found on its own action");
  Run.toggleReveal(s, society(s).id);
  assert.equal(V.findPanelRow(viewOf(s), { subject: sub(s).id, act: influence(s).id, id: society(s).id }), null);
  assert.equal(V.findPanelRow(null, { subject: "x", act: "y", id: "z" }), null);
});

test("a revealed decoy can't be told from a true entry, at any depth, and a decoy flag on an always-shown check is ignored", () => {
  const twin = (decoy) => {
    const s = secretSystem();
    revealAll(s);
    for (const row of [...sub(s).actions.flatMap((action) => action.checks), ...sub(s).modifiers]) row.decoy = decoy;
    return s;
  };
  const withIds = (s) => {
    const rows = [...s.subjects, ...sub(s).actions, ...sub(s).actions.flatMap((action) => action.checks), ...sub(s).thresholds, ...sub(s).modifiers, ...s.counters, ...s.counters.flatMap((c) => c.thresholds)];
    return rows.map((row) => row.id).reduce((text, id, n) => text.replaceAll(id, `ID${n}`), JSON.stringify(viewOf(s)));
  };
  assert.equal(withIds(twin(true)), withIds(twin(false)));
  const decoyView = viewOf(twin(true));
  assert.ok(![...scan(decoyView).values].some((value) => /decoy/i.test(String(value))));
  assertNoSecrets(decoyView);
  assert.equal(D.isDecoyCheck({ decoy: true, always: true }), false);
  assert.equal(D.isDecoyCheck({ decoy: true, always: false }), true);
});

test("an unrevealed decoy is left out, and an always-shown check is in from the start with its DC", () => {
  const s = secretSystem();
  const planted = { ...D.newCheck(), skill: "occultism", decoy: true, dc: 654 };
  discover(s).checks.push(planted);
  sub(s).modifiers[0].decoy = true;
  let view = viewOf(s);
  assert.deepEqual(view.subjects[0].actions[0].checks, [{ id: discover(s).checks[0].id, skill: "perception", lore: "", dc: 15 }]);
  assert.deepEqual(known(view.subjects[0]), []);
  assert.ok(!JSON.stringify(view).includes("654"));
  planted.revealed = true;
  view = viewOf(s);
  assert.deepEqual(view.subjects[0].actions[0].checks.map((row) => row.id), [discover(s).checks[0].id, planted.id]);
});

test("the copy gives a revealed Lore check its name, and a hidden one nothing", () => {
  const s = secretSystem();
  const lore = { ...D.newCheck(), skill: "lore", lore: "Warfare Lore" };
  influence(s).checks.push(lore);
  assert.ok(!JSON.stringify(viewOf(s)).includes("Warfare"));
  lore.revealed = true;
  assert.deepEqual(viewOf(s).subjects[0].actions[1].checks.at(-1), { id: lore.id, skill: "lore", lore: "Warfare Lore", dc: 15 });
});

const R_ = "SSM.Preset.influence.Category.resistance";
const W_ = "SSM.Preset.influence.Category.weakness";
const O_ = "SSM.Preset.influence.Category.other";

test("the panel groups cards by category: the blank one first, then the preset's suggestions in order, then others by first use; each keeps stored order", () => {
  const s = secretSystem();
  const base = sub(s).modifiers[0];
  const make = (category, name) => ({ ...structuredClone(base), id: `${category}-${name}`, category, name, revealed: true });
  sub(s).modifiers = [make(W_, "w1"), make("Opportunity", "op1"), make("", "b1"), make(O_, "o1"), make(R_, "r1"), make(` ${W_.toUpperCase()} `, "w2"), make("Complication", "c1"), make("opportunity", "op2"), make(R_, "r2")];
  const cards = known(viewOf(s).subjects[0]);
  assert.deepEqual(cards.map((card) => card.name), ["b1", "r1", "r2", "w1", "w2", "o1", "op1", "op2", "c1"]);
  assert.deepEqual(cards.map((card) => card.category), ["", R_, R_, W_, W_, O_, "Opportunity", "Opportunity", "Complication"]);
});

test("the panel shows every labelled category, empty when nothing in it is revealed; the blank one only when one of its entries is", () => {
  const s = secretSystem();
  const base = sub(s).modifiers[0];
  const make = (category, name, revealed) => ({ ...structuredClone(base), id: name, category, name, revealed });
  sub(s).modifiers = [make("", "b1", false), make(W_, "w1", true), make("Opportunity", "op1", false)];
  const groups = () => viewOf(s).subjects[0].modifierGroups.map((group) => [group.label, group.cards.map((card) => card.name)]);
  assert.deepEqual(groups(), [[R_, []], [W_, ["w1"]], [O_, []], ["Opportunity", []]]);
  sub(s).modifiers[0].revealed = true;
  assert.deepEqual(groups()[0], ["", ["b1"]]);
  assert.ok(!JSON.stringify(viewOf(s)).includes("op1"), "a hidden entry's name stays out; only its category's label shows");
});

test("each category's stripe takes the next palette colour; Influence's three keep today's colours; a blank category has none", () => {
  const s = system();
  sub(s).modifiers = [{ ...D.newModifier(), category: "Opportunity" }, { ...D.newModifier(), category: W_ }];
  s.modifiers = [{ ...D.newModifier(), category: "Lucky" }];
  const order = D.categoryOrder(s);
  assert.deepEqual(order.map((row) => row.label), [R_, W_, O_, "Lucky", "Opportunity"], "the challenge's own entries count first, then each subject's");
  assert.deepEqual(order.map((row) => row.colour), ["#c0523f", "#6fae6a", "#7a9cc6", D.CATEGORY_COLOURS[3], D.CATEGORY_COLOURS[4]]);
  assert.deepEqual(D.categoryOrder(system("victory")).map((row) => row.label), ["SSM.Preset.victory.Category.modifier"]);
  const groups = D.groupByCategory(s, sub(s).modifiers, { withSuggestions: true });
  assert.deepEqual(groups.map((group) => [group.label, group.rows.length]), [[R_, 0], [W_, 1], [O_, 0], ["Opportunity", 1]], "the Edit tab keeps the suggestions even when empty");
  assert.deepEqual(D.groupByCategory(s, sub(s).modifiers).map((group) => group.label), [W_, "Opportunity"]);
  sub(s).modifiers.push({ ...D.newModifier(), category: "" });
  assert.deepEqual(D.groupByCategory(s, sub(s).modifiers).map((group) => group.label), ["", W_, "Opportunity"], "the blank category groups first");
});

test("thresholds show in the order the track reaches them; points-only shows no text; a missing player text never falls back to GM text", () => {
  const s = secretSystem();
  const make = (points, reveal, playerText = "") => ({ ...D.newThreshold(), points, reveal, playerText, gmText: `${GM_SECRET} t` });
  sub(s).thresholds = [make(8, "full", "eight"), make(2, "points", "two"), make(5, "hidden", "five"), make(4, "full")];
  Run.changePoints(s, sub(s).id, 3);
  assert.deepEqual(viewOf(s).subjects[0].thresholds.map((row) => [row.points, row.text, row.textHidden, row.reached]), [[2, "", true, true], [4, "", false, true], [8, "eight", false, false]]);
  assertNoSecrets(viewOf(s));
  sub(s).direction = "down";
  assert.deepEqual(viewOf(s).subjects[0].thresholds.map((row) => row.points), [8, 4, 2]);
});

test("a bar scales to the goal or the highest threshold, hidden or not; a track that counts down scales to its start", () => {
  const s = secretSystem();
  assert.equal(viewOf(s).subjects[0].scale, 8);
  sub(s).goal = 12;
  assert.equal(viewOf(s).subjects[0].scale, 12);
  sub(s).thresholds = [];
  sub(s).goal = null;
  assert.equal(viewOf(s).subjects[0].scale, 0, "no scale: the bar falls back to 10");
  const down = runSystem();
  Object.assign(sub(down), { direction: "down", points: 6 });
  Run.startRun(down);
  Run.changePoints(down, sub(down).id, -4);
  assert.deepEqual([viewOf(down).subjects[0].scale, viewOf(down).subjects[0].points], [6, 2]);
});

test("an individual subject shows one row per party PC, with their points and whether they are done, and no thresholds", () => {
  const s = secretSystem();
  Object.assign(sub(s), { individual: true, points: 0, goal: 2 });
  sub(s).thresholds[0].reveal = "full";
  Run.changePoints(s, sub(s).id, 2, "a1");
  Run.changePoints(s, sub(s).id, 1, "stranger");
  const view = viewOf(s, PARTY).subjects[0];
  assert.deepEqual(view.pcs, [{ id: "a1", points: 2, complete: true }, { id: "a2", points: 0, complete: false }]);
  assert.deepEqual([view.individual, view.complete, view.thresholds, view.scale], [true, false, [], 8]);
  Run.changePoints(s, sub(s).id, 2, "a2");
  assert.equal(viewOf(s, PARTY).subjects[0].complete, true);
  assertNoSecrets(viewOf(s, PARTY));
});

test("a revealed counter with no thresholds is a plain number; hidden counter thresholds stay out", () => {
  const s = secretSystem();
  s.counters[0].revealed = true;
  let [counter] = viewOf(s).counters;
  assert.deepEqual([counter.track, counter.thresholds], [true, []]);
  assert.ok(!JSON.stringify(viewOf(s)).includes("guards"));
  s.counters[0].thresholds = [];
  s.counters[0].max = null;
  [counter] = viewOf(s).counters;
  assert.deepEqual(counter, { id: s.counters[0].id, name: "Suspicion", value: 3, perPc: false, pcs: [], track: false, scale: 0, range: null, thresholds: [] });
});

test("party markers show who has acted, a PC with no image gets the default icon, and an empty party is fine", () => {
  const s = secretSystem();
  Run.toggleActed(s, "a2");
  assert.deepEqual(viewOf(s, PARTY).party, [{ id: "a1", name: "Ezren", img: "ezren.webp", acted: false }, { id: "a2", name: "Amiri", img: V.DEFAULT_PC_IMAGE, acted: true }]);
  assert.deepEqual(viewOf(s).party, []);
});

test("the copy is the same when nothing players see has changed", () => {
  const s = secretSystem();
  const before = JSON.stringify(viewOf(s, PARTY));
  sub(s).modifiers[0].gmText = "new GM text";
  sub(s).statLine = "new stats";
  society(s).dc = 30;
  s.gmNotes = "changed";
  Run.receiveRoll(s, rollOf(s, { actorId: "" }));
  assert.equal(JSON.stringify(viewOf(s, PARTY)), before);
  Run.changePoints(s, sub(s).id, 1);
  assert.notEqual(JSON.stringify(viewOf(s, PARTY)), before);
});

/* Modifier cards on the panel */

/** A revealed modifier on the secret system's subject, with these effects. Returns the system and the card's texts. */
const cardOf = (effects, over = {}) => {
  const s = secretSystem();
  s.pointsName = "Influence Points";
  sub(s).modifiers = [{ ...D.newModifier(), name: "Flattery", revealed: true, ...over, effects: effects(s).map((row) => ({ ...D.newEffect(), ...row })) }];
  const [card] = known(viewOf(s).subjects[0]);
  return { s, card, texts: card.changes.map((change) => V.changeText(change, { ...enText, points: s.pointsName })) };
};

test("a card's DC change reads as a DC change, with no DC number, and lists the visible checks it names once each", () => {
  assert.deepEqual(cardOf(() => [dcEffect(-2)]).texts, ["−2 to all DCs"]);
  const chosen = cardOf((s) => {
    discover(s).checks.push({ ...D.newCheck(), skill: "diplomacy", revealed: true });
    return [dcEffect(2, { allSkills: false, skills: [influence(s).checks[1].id, discover(s).checks[1].id, influence(s).checks[0].id, society(s).id] })];
  });
  assert.deepEqual(chosen.texts, ["+2 to DCs vs Diplomacy and Deception"]);
  assert.ok(!JSON.stringify(chosen.card).includes("15"));
});

test("a card names the challenge's points, rounds and a revealed counter, singular and plural", () => {
  const { texts } = cardOf((s) => {
    s.counters[0].revealed = true;
    return [{ type: "points", amount: -1 }, { type: "points", amount: 2 }, { type: "rounds", amount: 1 }, { type: "rounds", amount: -2 }, { type: "counter", amount: 1, counterId: s.counters[0].id }];
  });
  assert.deepEqual(texts, ["−1 Influence Point", "+2 Influence Points", "+1 round", "−2 rounds", "+1 Suspicion"]);
  assert.equal(V.pointsText("Progress", 1), "Progress");
  assert.equal(V.pointsText("Victory Points", -1), "Victory Point");
});

test("a card leaves out a hidden check, an unrevealed counter, a note, a zero change and a removed check", () => {
  const { card } = cardOf((s) => [
    dcEffect(2, { allSkills: false, skills: [society(s).id, "gone"] }),
    { type: "counter", amount: 1, counterId: s.counters[0].id },
    { type: "note", note: `${GM_SECRET} note` },
    { type: "points", amount: 0 },
  ]);
  assert.deepEqual(card.changes, []);
  assertNoSecrets(card);
});

test("a card carries category, colour, duration and state, its player text and no GM text", () => {
  const { s, card } = cardOf(() => [{ type: "points", amount: 2 }], { category: R_, duration: "oneTime", active: true, decoy: true, playerText: "likes praise", gmText: `${GM_SECRET} gm` });
  assert.deepEqual([card.category, card.colour, card.duration, card.active, card.spent, card.applied, card.text], [R_, "#c0523f", "oneTime", true, false, false, "likes praise"]);
  assertNoSecrets(card);
  Run.applyModifier(s, sub(s).id, sub(s).modifiers[0].id);
  assert.deepEqual([known(viewOf(s).subjects[0])[0].spent, known(viewOf(s).subjects[0])[0].applied], [true, true]);
});

/* Challenge-level modifiers (spec 14.7) */

const challengeMod = (s, over = {}, effects = [{}]) => {
  const row = { ...D.newModifier(), name: "Over Here!", active: true, ...over, effects: effects.map((effect) => ({ ...D.newEffect(), ...effect })) };
  s.modifiers.push(row);
  return row;
};
/** A second subject with a Diplomacy check and a Warfare Lore check. */
const addSecondSubject = (s) => {
  const other = D.addRow(s, "subjects");
  other.actions[1].checks.push({ ...D.newCheck(), skill: "lore", lore: "Warfare Lore", dc: 20 });
  return other;
};

test("a challenge-level DC change hits every check in the challenge, filtered by skill name on any subject", () => {
  const s = running();
  const other = addSecondSubject(s);
  const lore = other.actions[1].checks.at(-1);
  const diplomacy = (subject) => subject.actions[1].checks.find((row) => row.skill === "diplomacy");
  challengeMod(s, {}, [dcEffect(-2)]);
  assert.deepEqual([dcOf(s), Run.currentDc(s, other, lore)], [13, 18], "All skills reaches both subjects");
  s.modifiers[0].effects[0] = { ...D.newEffect(), ...dcEffect(-2, { allSkills: false, skills: ["diplomacy", "lore:warfare lore"] }) };
  assert.deepEqual([Run.currentDc(s, sub(s), diplomacy(sub(s))), Run.currentDc(s, other, diplomacy(other)), Run.currentDc(s, other, lore), dcOf(s)], [13, 13, 18, 15]);
  assert.deepEqual(D.challengeSkillKeys(s).sort(), ["deception", "diplomacy", "intimidation", "lore:warfare lore", "perception", "society"]);
});

test("a one-time challenge-level DC change is spent by the next matching check anywhere", () => {
  const s = running();
  const other = addSecondSubject(s);
  const row = challengeMod(s, { duration: "oneTime" }, [dcEffect(2, { allSkills: false, skills: ["diplomacy"] })]);
  Run.receiveRoll(s, rollAt(s, "r1", 15));
  assert.equal(row.spent, false, "a Society roll doesn't match");
  const check = other.actions[1].checks.find((c) => c.skill === "diplomacy");
  Run.receiveRoll(s, { ...rollOf(s), rollId: "r2", subjectId: other.id, actionId: other.actions[1].id, checkId: check.id, dc: 17 });
  assert.equal(row.spent, true);
  assert.equal(Run.currentDc(s, other, check), 15);
});

test("a challenge-level entry applies counter and rounds effects, never points, and toggles, reveals and resets like a subject's", () => {
  const s = running();
  const row = challengeMod(s, { duration: "oneTime" }, [{ type: "points", amount: 3 }, { type: "counter", amount: 2, counterId: s.counters[0].id }, { type: "rounds", amount: 1 }]);
  assert.equal(Run.canApplyModifier(row, true), true);
  Run.applyModifier(s, "", row.id);
  assert.deepEqual([sub(s).points, s.counters[0].value, s.rounds.max, row.spent], [1, 5, 7, true]);
  const pointsOnly = challengeMod(s, {}, [{ type: "points", amount: 3 }]);
  assert.equal(Run.canApplyModifier(pointsOnly, true), false, "a points effect alone gives Apply nothing to do");
  Run.toggleModifier(s, "", pointsOnly.id);
  Run.toggleReveal(s, pointsOnly.id);
  assert.deepEqual([pointsOnly.active, pointsOnly.revealed], [false, true]);
  Run.resetRun(s);
  assert.deepEqual([row.active, row.spent, row.applied, pointsOnly.revealed], [false, false, false, false], "entries added during the run go back to hidden and off");
});

test("saving a challenge-level entry keeps skill names that exist and turns a points effect into a note", () => {
  const s = system();
  const row = challengeMod(s);
  D.saveModifier(s, "", row.id, { category: "  Opportunity ", effects: [{ ...D.newEffect(), type: "points", amount: 2 }, { ...D.newEffect(), type: "dc", allSkills: false, skills: ["diplomacy", "athletics"] }] });
  assert.deepEqual([row.category, row.effects[0].type, row.effects[1].skills], ["Opportunity", "note", ["diplomacy"]]);
  assert.equal(D.findModifier(s, "", row.id), row);
  assert.ok(D.searchText(s).includes("Opportunity"));
});

test("the panel shows revealed challenge-level entries in their own list, by category, with skill names and no hidden checks or GM text", () => {
  const s = secretSystem();
  challengeMod(s, { category: "Opportunity", gmText: `${GM_SECRET} challenge`, playerText: "a distraction" }, [dcEffect(-2, { allSkills: false, skills: ["society", "diplomacy"] }), { type: "points", amount: 4 }]);
  assert.deepEqual(viewOf(s).modifiers, [], "hidden until revealed");
  s.modifiers[0].revealed = true;
  const [card] = viewOf(s).modifiers;
  assert.deepEqual([card.name, card.category, card.text], ["Over Here!", "Opportunity", "a distraction"]);
  assert.deepEqual(card.changes.map((change) => V.changeText(change, { ...enText, points: "Points" })), ["−2 to DCs vs Diplomacy"], "Society is hidden, and a points effect shows nothing");
  assertNoSecrets(viewOf(s));
});

/* Degree buttons and Undo (spec 14.8) */

test("Apply can use a degree other than the one rolled, and still applies once", () => {
  const s = running();
  const result = Run.applyRoll(s, rollOf(s, { outcome: "failure" }), "criticalSuccess");
  assert.equal(sub(s).points, 3);
  assert.equal(result.record.outcome, "criticalSuccess");
  assert.equal(Run.applyRoll(s, rollOf(s), "success"), false);
  assert.equal(Run.applyRoll(running(), rollOf(s), "nonsense"), false);
});

test("Undo reverses exactly what its Apply did: points, Reached, Complete, a counter, the rounds, the tally and the roll id", () => {
  const s = running();
  sub(s).goal = 3;
  influence(s).maxPoints = 10;
  influence(s).outcomes.criticalSuccess.push(effectOf("counter", 2, { counterId: s.counters[0].id }), effectOf("rounds", 1));
  s.counters[0].thresholds.push({ ...D.newThreshold(), points: 5 });
  const { record } = Run.applyRoll(s, rollOf(s, { outcome: "criticalSuccess" }));
  assert.deepEqual([sub(s).points, sub(s).thresholds[0].reached, sub(s).complete, s.counters[0].value, s.counters[0].thresholds[0].reached, s.rounds.max, influence(s).given], [3, true, true, 5, true, 7, 4]);
  assert.equal(Run.undoApply(s, record), undefined);
  assert.deepEqual([sub(s).points, sub(s).thresholds[0].reached, sub(s).complete, s.counters[0].value, s.counters[0].thresholds[0].reached, s.rounds.max, influence(s).given, s.run.roundsAdded], [1, false, false, 3, false, 6, 0, 0]);
  assert.deepEqual(s.run.appliedRolls, []);
  assert.equal(Run.undoApply(s, record), false, "an undone result can't be undone again");
  assert.equal(Run.undoBlock(s, record), "notApplied");
  assert.ok(Run.applyRoll(s, rollOf(s, { isReroll: true, outcome: "success" })), "a reroll of an undone roll can be applied");
});

test("Undo keeps changes made since, and a Reached or Complete the value is still past", () => {
  const s = running();
  const { record } = Run.applyRoll(s, rollOf(s, { outcome: "success" }));
  assert.equal(sub(s).thresholds[0].reached, true);
  Run.changePoints(s, sub(s).id, 3);
  Run.undoApply(s, record);
  assert.equal(sub(s).points, 4, "the hand change of +3 stays");
  assert.equal(sub(s).thresholds[0].reached, true, "4 is still past the threshold at 2");
});

test("Undo reverses the actual change after limits, and leaves a spent one-time entry spent", () => {
  const s = running();
  sub(s).max = 2;
  const row = addModifier(s, { active: true, duration: "oneTime" }, [dcEffect(-2, { allSkills: true })]);
  Run.receiveRoll(s, rollAt(s, "r1", 13));
  const { record } = Run.applyRoll(s, rollAt(s, "r1", 13, { outcome: "criticalSuccess" }));
  assert.deepEqual([sub(s).points, record.changes[0].amount], [2, 1], "+2 was clamped to +1");
  Run.changePoints(s, sub(s).id, -2);
  Run.undoApply(s, record);
  assert.equal(sub(s).points, -1);
  assert.equal(row.spent, true);
});

test("Undo on an individual subject and a per-PC counter changes only the roller's values, and needs the run active", () => {
  const s = running();
  Object.assign(sub(s), { individual: true, goal: 2 });
  const counter = Object.assign(s.counters[0], { perPc: true, value: 0, valueBy: {} });
  influence(s).outcomes.success.push(effectOf("counter", 1, { counterId: counter.id }));
  const { record } = Run.applyRoll(s, rollOf(s, { outcome: "success" }));
  assert.deepEqual([Run.pointsOf(sub(s), "a1"), sub(s).completeBy, counter.valueBy], [2, ["a1"], { a1: 1 }]);
  Run.changeCounter(s, counter.id, 1, "a2");
  Run.endRun(s);
  assert.equal(Run.undoBlock(s, record), "notRunning");
  s.run.status = "active";
  Run.undoApply(s, record);
  assert.deepEqual([Run.pointsOf(sub(s), "a1"), sub(s).completeBy, counter.valueBy], [1, [], { a1: 0, a2: 1 }]);
});

test("after a reset, an old result can't be undone", () => {
  const s = running();
  const { record } = Run.applyRoll(s, rollOf(s));
  Run.resetRun(s);
  Run.startRun(s);
  assert.equal(Run.undoApply(s, record), false);
});

/* Per-PC counters, subject limits and order (spec 14.8) */

test("a per-PC counter: an outcome changes the roller's value, a modifier everyone's, each inside the limits; no change each round", () => {
  const s = running();
  const counter = Object.assign(s.counters[0], { perPc: true, value: 0, max: 2, perRound: 1 });
  influence(s).outcomes.success.push(effectOf("counter", 1, { counterId: counter.id }));
  Run.applyRoll(s, rollOf(s));
  assert.deepEqual(counter.valueBy, { a1: 1 });
  assert.equal(Run.outcomePlan(s, rollOf(s, { actorId: "" })).changes.length, 1, "with no actor only the points change");
  addModifier(s, { active: true }, [{ type: "counter", amount: 2, counterId: counter.id }]);
  Run.applyModifier(s, sub(s).id, sub(s).modifiers[0].id, ["a1", "a2"]);
  assert.deepEqual(counter.valueBy, { a1: 2, a2: 2 });
  Run.advanceRound(s);
  assert.deepEqual([counter.value, counter.valueBy], [0, { a1: 2, a2: 2 }]);
  assert.equal(Run.changeCounter(s, counter.id, 1), false, "a hand change needs a PC");
  Run.resetRun(s);
  assert.deepEqual(counter.valueBy, {});
});

test("a per-PC counter shows a row per party PC on the panel, and no thresholds", () => {
  const s = secretSystem();
  Object.assign(s.counters[0], { perPc: true, revealed: true, value: 1, valueBy: { a1: 3 } });
  const [counter] = viewOf(s, PARTY).counters;
  assert.deepEqual([counter.perPc, counter.track, counter.pcs, counter.thresholds], [true, false, [{ id: "a1", value: 3 }, { id: "a2", value: 1 }], []]);
});

test("a subject's points stay inside its limits, per PC too", () => {
  const s = running();
  Object.assign(sub(s), { min: 0, max: 4 });
  Run.changePoints(s, sub(s).id, 9);
  assert.equal(sub(s).points, 4);
  assert.equal(Run.changePoints(s, sub(s).id, 1), false);
  Run.changePoints(s, sub(s).id, -9);
  assert.equal(sub(s).points, 0);
  sub(s).individual = true;
  Run.changePoints(s, sub(s).id, -3, "a1");
  assert.equal(Run.pointsOf(sub(s), "a1"), 0);
});

test("subjects move up and down the order, and not past either end", () => {
  const s = system();
  const [a, b] = [sub(s), D.addRow(s, "subjects")];
  assert.equal(D.moveSubject(s, a.id, -1), false);
  D.moveSubject(s, a.id, 1);
  assert.deepEqual(s.subjects.map((row) => row.id), [b.id, a.id]);
  assert.equal(D.moveSubject(s, a.id, 1), false);
});

/* Both-ways tracks (spec 14.8) */

const reputation = () => {
  const s = running();
  Object.assign(sub(s), { direction: "both", min: -50, max: 50, points: 0, goal: 5 });
  sub(s).thresholds = [-30, -5, 0, 5, 15].map((points) => ({ ...D.newThreshold(), points }));
  return s;
};
const reachedOf = (s) => sub(s).thresholds.filter((row) => row.reached).map((row) => row.points);

test("a both-ways track reaches thresholds above 0 by rising and below 0 by falling, never one at 0, and has no goal", () => {
  const s = reputation();
  Run.changePoints(s, sub(s).id, 6);
  assert.deepEqual(reachedOf(s), [5]);
  assert.equal(sub(s).complete, false, "a both-ways track has no goal");
  Run.changePoints(s, sub(s).id, -12);
  assert.deepEqual(reachedOf(s), [-5], "Reached follows the value: 5 clears, −5 is reached");
  Run.changePoints(s, sub(s).id, -100);
  assert.deepEqual([sub(s).points, reachedOf(s)], [-50, [-30, -5]]);
  assert.equal(Run.hasReached("both", 0, 0), false);
});

test("Reached on a both-ways track can't be set by hand, follows a form edit, and its DC change lasts only while reached", () => {
  const s = reputation();
  sub(s).thresholds[3].dc = 2;
  assert.equal(Run.toggleReached(s, sub(s).id, sub(s).thresholds[3].id), false);
  sub(s).points = 7;
  Run.syncBothWays(s);
  assert.deepEqual(reachedOf(s), [5]);
  assert.equal(dcOf(s), 17);
  Run.changePoints(s, sub(s).id, -3);
  assert.equal(dcOf(s), 15);
});

test("Undo on a both-ways track brings Reached back in line with the value", () => {
  const s = reputation();
  influence(s).outcomes.criticalSuccess = [effectOf("points", 6)];
  const { record } = Run.applyRoll(s, rollOf(s, { outcome: "criticalSuccess" }));
  assert.deepEqual(reachedOf(s), [5]);
  Run.undoApply(s, record);
  assert.deepEqual([sub(s).points, reachedOf(s)], [0, []]);
});

test("a both-ways counter follows its value too, gives a notice when it reaches a threshold, and Previous round keeps Reached in line", () => {
  const s = running();
  const counter = Object.assign(s.counters[0], { direction: "both", value: 0, perRound: -3, thresholds: [{ ...D.newThreshold(), points: -2 }] });
  const { triggers } = Run.advanceRound(s);
  assert.deepEqual([counter.value, counter.thresholds[0].reached, triggers.length], [-3, true, 1]);
  Run.undoRound(s);
  assert.deepEqual([counter.value, counter.thresholds[0].reached], [0, false]);
});

test("a both-ways bar spans the limits or the furthest thresholds, with a mark at 0, filled from 0 to the value", () => {
  const s = reputation();
  const view = () => viewOf(s).subjects[0];
  assert.deepEqual(view().range, { lo: -50, hi: 50 });
  assert.deepEqual(V.bothWaysBar(25, view().range), { both: true, zero: 50, left: 50, width: 25, negative: false });
  assert.deepEqual(V.bothWaysBar(-10, view().range), { both: true, zero: 50, left: 40, width: 10, negative: true });
  Object.assign(sub(s), { min: null, max: null });
  assert.deepEqual(view().range, { lo: -30, hi: 15 });
  sub(s).thresholds = [];
  assert.deepEqual(view().range, { lo: -10, hi: 10 });
  assert.equal(viewOf(running()).subjects[0].range, null);
});
