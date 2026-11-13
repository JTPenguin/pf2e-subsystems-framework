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
// Letters only, so no id can look like a DC or point value in a test that searches a view for a number.
globalThis.foundry = { utils: { randomID: () => `id${String(++nextId).replace(/\d/g, (d) => "abcdefghij"[d])}` } };

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

const MODULE = "pf2e-subsystems-framework";
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
    { type: "dc", amount: 2, all: true, skills: [] },
  ];
  const texts = changes.map((change) => V.changeText(change, enText));
  for (const text of texts) assert.ok(text && !text.includes("{") && !text.includes("undefined"), text);
  assert.deepEqual(texts, ["−2 to DCs vs Diplomacy", "+2 to all DCs"]);
});

test("a modifier has one DC change and a note, both empty to start", () => {
  const m = D.newModifier();
  assert.deepEqual([m.dc, m.note], [{ amount: 0, allSkills: true, skills: [] }, ""]);
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

test("a challenge with repeated ids gets unique ones, the same on every run, and a copied subject's DC change follows its own check", () => {
  const subject = (id) => ({
    id, counters: [{ id: "cnt", thresholds: [{ id: "thr" }] }],
    actions: [{ id: "act", checks: [{ id: "chk" }, { id: "other" }] }],
    modifiers: [{ id: "mod", dc: { amount: -2, allSkills: false, skills: ["chk", "other"] } }],
  });
  const build = () => ({ counters: [{ id: "cnt", thresholds: [] }], modifiers: [], subjects: [subject("sergei"), subject("ireena")] });
  const source = D.dedupeIds(build());
  const ids = [];
  const walk = (value) => { if (Array.isArray(value)) value.forEach(walk); else if (value && typeof value === "object") { if (typeof value.id === "string") ids.push(value.id); Object.values(value).forEach(walk); } };
  walk(source);
  assert.equal(new Set(ids).size, ids.length, "every id is unique");
  assert.equal(source.counters[0].id, "cnt", "the first holder keeps its id");
  assert.deepEqual(source.subjects[0].modifiers[0].dc.skills, ["chk", "other"], "the first subject's DC change is untouched");
  const copy = source.subjects[1];
  assert.deepEqual(copy.modifiers[0].dc.skills, copy.actions[0].checks.map((check) => check.id), "the copy's DC change names the copy's own checks");
  assert.deepEqual(D.dedupeIds(build()), source, "the same ids on every run");
  assert.deepEqual(D.dedupeIds(structuredClone(source)), source, "unique ids are left alone");
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

/** Stand-ins for Foundry's localisation, using the English strings. */
const EN = JSON.parse(fs.readFileSync(path.join(here, "..", "lang", "en.json"), "utf8"));
const enText = {
  format: (key, data) => key.split(".").reduce((node, part) => node?.[part], EN).replace(/\{(\w+)\}/g, (_, name) => data[name]),
  list: (items) => new Intl.ListFormat("en", { type: "conjunction" }).format(items),
  label: (skill) => (skill.skill === "lore" ? skill.lore : skill.skill[0].toUpperCase() + skill.skill.slice(1)),
};

test("only this module's page types count as challenge types", () => {
  assert.equal(R.isChallengeType(`${MODULE}.challenge`), true);
  assert.equal(R.isChallengeType("text"), false);
  assert.equal(R.isChallengeType(undefined), false);
});

/* The challenge data (spec section 14) */

const RUN = () => ({ status: "inactive", acted: [], baseline: null, roundHistory: [] });
/** A new challenge from a preset, with the fields the data model would add. Language keys stand in for their text. */
const system = (preset = "influence") => ({ ...D.newChallengeSystem(preset), gmNotes: "", counters: [], run: RUN() });
/** An Influence challenge whose NPC's counter has 1 point and thresholds at 2 and 5, a Society check on Influence, and a challenge counter at 3. */
const runSystem = () => {
  const s = system();
  const subject = s.subjects[0];
  subject.counters[0].value = 1;
  subject.actions[1].checks.push({ ...D.newCheck(), revealed: false });
  subject.counters[0].thresholds.push({ ...D.newThreshold(), points: 2 }, { ...D.newThreshold(), points: 5 });
  s.counters.push({ ...D.newCounter(), revealed: false, name: "Suspicion", value: 3 });
  return s;
};
const running = () => {
  const s = runSystem();
  Run.startRun(s);
  return s;
};
const sub = (s) => s.subjects[0];
/** The first subject's own counter: the Influence Points the preset gives it. */
const pts = (s) => sub(s).counters[0];
const changePts = (s, delta) => Run.changeCounter(s, pts(s).id, delta);
const discover = (s) => sub(s).actions[0];
const influence = (s) => sub(s).actions[1];
/** The last check on Influence. */
const society = (s) => influence(s).checks.at(-1);
const rollOf = (s, over = {}) => ({ rollId: "r1", challengeId: "c1", subjectId: sub(s).id, actionId: influence(s).id, checkId: society(s).id, messageId: "m1", actorId: "a1", dc: null, isReroll: false, ...over });
const discoverRoll = (s, over = {}) => rollOf(s, { actionId: discover(s).id, checkId: discover(s).checks[0].id, ...over });
/** A modifier's DC change, as fields to spread onto it. */
const withDc = (amount, over = {}) => ({ dc: { ...D.newModifierDc(), amount, ...over } });

test("a preset fills in the names, the rounds and the first subject", () => {
  const blank = D.newChallengeSystem();
  assert.deepEqual([blank.preset, blank.rounds.max, blank.subjects.length], ["victory", null, 1]);
  assert.deepEqual(blank.subjects[0].actions.map((action) => action.checks.length), [0]);
  assert.deepEqual(Object.keys(blank.subjects[0].actions[0]).sort(), ["checks", "description", "id", "name", "secret"], "an action has no outcome table or maximum points");
  assert.equal(blank.subjects[0].revealed, false);
  const s = system();
  assert.deepEqual([s.preset, s.rounds.max, s.pointsName], ["influence", 6, "SSM.Preset.influence.Points"]);
  assert.equal(sub(s).revealed, true);
  assert.deepEqual(sub(s).counters.map((row) => [row.name, row.value, row.min, row.max, row.revealed, row.thresholds.length]), [["SSM.Preset.influence.Points", 0, null, null, true, 0]], "an NPC has one Influence Points counter");
  assert.deepEqual(blank.subjects[0].counters.map((row) => row.name), ["SSM.Preset.victory.Points"]);
  assert.deepEqual([discover(s).secret, influence(s).secret], [true, false]);
  assert.deepEqual(discover(s).checks.map((row) => [row.skill, row.revealed]), [["perception", true]]);
  assert.deepEqual(influence(s).checks.map((row) => [row.skill, row.revealed, row.dc]), [["deception", true, 15], ["diplomacy", true, 15], ["intimidation", true, 15]]);
  assert.equal(D.newChallengeSystem("nonsense").preset, "victory");
});

test("addRow picks the right row for each list, and a new subject follows the preset", () => {
  const s = system();
  assert.equal(D.addRow(s, "subjects.0.actions.1.checks").revealed, true, "a new check starts revealed");
  assert.ok("reached" in D.addRow(s, "subjects.0.counters.0.thresholds"));
  const own = D.addRow(s, "subjects.0.counters");
  assert.deepEqual([own.name, own.revealed, own.perRound, own.thresholds], ["SSM.Preset.influence.Points", true, 0, []], "a subject's new counter takes the points name and starts shown");
  assert.deepEqual(D.addRow(s, "subjects.0.modifiers").dc.amount, 0, "a new modifier starts with no DC change");
  assert.equal(D.addRow(s, "subjects.0.modifiers", { category: "Leverage" }).category, "Leverage", "a category's + starts the modifier in that category");
  assert.equal(D.addRow(s, "modifiers").category, "", "the section's + leaves the category blank");
  assert.deepEqual(D.addRow(s, "subjects.0.actions").checks, []);
  assert.deepEqual(D.addRow(s, "counters").thresholds, []);
  assert.ok("dc" in D.addRow(s, "counters.0.thresholds"));
  assert.equal(D.addRow(s, "subjects").actions.length, 2, "an Influence challenge's new subject has Discover and Influence");
  assert.equal(D.addRow(system("victory"), "subjects").actions.length, 1);
  assert.throws(() => D.addRow(s, "rounds"));
  const ids = [D.newSubject(s).id, D.newModifier().id, D.newCounter().id, D.newAction().id];
  assert.equal(new Set(ids).size, ids.length);
});

test("the last subject can't be removed", () => {
  const s = system();
  assert.equal(D.removeRow(s, "subjects.0"), false);
  D.addRow(s, "subjects");
  assert.equal(D.removeRow(s, "subjects.1"), true);
  assert.equal(s.subjects.length, 1);
});

test("removing a check or an action clears the links to it", () => {
  const s = system();
  const kept = D.addRow(s, "subjects.0.actions.0.checks");
  const gone = D.addRow(s, "subjects.0.actions.1.checks");
  const m = D.addRow(s, "subjects.0.modifiers");
  m.dc.skills = [kept.id, gone.id, influence(s).checks[0].id];
  D.removeRow(s, `subjects.0.actions.1.checks.${influence(s).checks.length - 1}`);
  assert.deepEqual(m.dc.skills, [kept.id, influence(s).checks[0].id]);
  D.removeRow(s, "subjects.0.actions.1");
  assert.deepEqual(m.dc.skills, [kept.id], "an action takes its checks' links with it");
});

test("mergeForm: numbered form rows merge into lists, and absent fields survive", () => {
  const s = system();
  const m = D.addRow(s, "subjects.0.modifiers");
  Object.assign(m, { note: "kept", dc: { amount: 0, allSkills: false, skills: ["a"] } });
  const merged = D.mergeForm(s, { subjects: { 0: { name: "Vance", modifiers: { 0: { name: "Art", dc: { amount: -2, skills: ["b", "c"] } } } } } });
  assert.equal(merged.subjects[0].name, "Vance");
  assert.deepEqual([merged.subjects[0].modifiers[0].dc.amount, merged.subjects[0].modifiers[0].dc.allSkills, merged.subjects[0].modifiers[0].note], [-2, false, "kept"]);
  assert.deepEqual(merged.subjects[0].modifiers[0].dc.skills, ["b", "c"]);
  assert.equal(Array.isArray(merged.subjects), true);
  assert.equal(merged.subjects[0].actions[1].checks[0].revealed, true, "a form with no Revealed field keeps the old value");
});

test("mergeForm: blank numbers keep their value, except limits and the round maximum", () => {
  const s = system();
  Object.assign(pts(s), { max: 4, value: 2 });
  const c = D.addRow(s, "counters");
  Object.assign(c, { min: 1, max: 5 });
  const merged = D.mergeForm(s, { rounds: { max: null, current: null }, subjects: { 0: { counters: { 0: { max: null, value: null } }, actions: { 1: { checks: { 0: { dc: null } } } } } }, counters: { 0: { min: null, value: null, perRound: null } } });
  assert.deepEqual([merged.rounds.max, merged.rounds.current], [null, 0]);
  assert.deepEqual([merged.subjects[0].counters[0].max, merged.subjects[0].counters[0].value, merged.subjects[0].actions[1].checks[0].dc], [null, 2, 15]);
  assert.deepEqual([merged.counters[0].min, merged.counters[0].max, merged.counters[0].value, merged.counters[0].perRound], [null, 5, 0, 0]);
});

test("clampTracks limits every counter's values, a subject's too, per PC too, and reports impossible limits", () => {
  const s = system();
  Object.assign(D.addRow(s, "counters"), { value: 9, max: 5 });
  Object.assign(D.addRow(s, "counters"), { value: -3, min: 0, perPc: true, valueBy: { a1: -5, a2: 2 } });
  Object.assign(D.addRow(s, "counters"), { value: 4, min: 8, max: 2 });
  Object.assign(pts(s), { value: 60, min: -50, max: 50, perPc: true, valueBy: { a1: -70 } });
  const invalid = D.clampTracks(s);
  assert.deepEqual(s.counters.map((c) => c.value), [5, 0, 4]);
  assert.deepEqual(s.counters[1].valueBy, { a1: 0, a2: 2 });
  assert.deepEqual([pts(s).value, pts(s).valueBy], [50, { a1: -50 }]);
  assert.equal(invalid.length, 1);
});

test("pickFields keeps named fields at their nested paths", () => {
  const form = { gmNotes: "", rounds: { max: 3 }, counters: { 0: { value: 2, name: "x" } } };
  assert.deepEqual(D.pickFields(form, ["gmNotes", "counters.0.value", "missing.field"]), { gmNotes: "", counters: { 0: { value: 2 } } });
});

test("applyForm changes the editable parts and never the run state or the preset", () => {
  const s = running();
  changePts(s, 2);
  D.applyForm(s, { rounds: { max: 9 }, pointsName: "Favour", preset: "victory", run: { status: "finished" } });
  assert.deepEqual([s.rounds.max, s.pointsName, s.preset, s.run.status, pts(s).value], [9, "Favour", "influence", "active", 3]);
});

test("searchText covers the challenge's text", () => {
  const s = system();
  s.gmNotes = "<p>Banquet</p>";
  Object.assign(sub(s), { name: "Vance", description: "<p>Perception +12</p>" });
  Object.assign(D.addRow(s, "subjects.0.counters.0.thresholds"), { name: "Ending", description: "<p>secret ending</p>" });
  Object.assign(D.addRow(s, "counters"), { name: "Suspicion", thresholds: [{ ...D.newThreshold(), name: "guards arrive" }] });
  influence(s).name = "Sway";
  const text = D.searchText(s);
  for (const word of ["Banquet", "Vance", "Perception +12", "Ending", "secret ending", "Suspicion", "guards arrive", "Sway"]) assert.ok(text.includes(word), word);
});

/* The modifier and action windows */

const modifierSystem = () => {
  const s = system();
  const modifier = D.addRow(s, "subjects.0.modifiers");
  Object.assign(modifier, { name: "Flattery", description: "<p>He likes praise</p>" });
  return { s, subject: sub(s), modifier };
};

test("a window saves only the fields the GM changed, and keeps them over an update from elsewhere", () => {
  const { modifier } = modifierSystem();
  const draft = structuredClone(modifier);
  draft.name = "Praise";
  draft.note = "He softens";
  draft.dc.amount = 2;
  assert.deepEqual(Object.keys(D.entryChanges(modifier, draft, D.MODIFIER_FIELDS)).sort(), ["dc", "name", "note"]);
  assert.deepEqual(D.entryChanges(modifier, structuredClone(modifier), D.MODIFIER_FIELDS), {});
  const latest = { ...structuredClone(modifier), active: true, description: "Changed elsewhere" };
  const rebased = D.rebaseEntry(latest, D.entryChanges(modifier, { ...structuredClone(modifier), name: "Praise" }, D.MODIFIER_FIELDS));
  assert.deepEqual([rebased.name, rebased.active, rebased.description, rebased.id], ["Praise", true, "Changed elsewhere", modifier.id]);
});

test("saving a modifier writes its changes, leaves run changes alone, and drops dead links", () => {
  const { s, subject, modifier } = modifierSystem();
  modifier.active = true;
  const kept = influence(s).checks[0].id;
  assert.equal(D.saveModifier(s, subject.id, modifier.id, { name: "Praise", ...withDc(2, { allSkills: false, skills: [kept, "gone"] }), note: "softens" }), true);
  const saved = D.findModifier(s, subject.id, modifier.id);
  assert.deepEqual([saved.name, saved.active, saved.description], ["Praise", true, "<p>He likes praise</p>"]);
  assert.deepEqual([saved.dc.amount, saved.dc.skills, saved.note], [2, [kept], "softens"]);
  D.removeRow(s, "subjects.0.modifiers.0");
  assert.equal(D.saveModifier(s, subject.id, modifier.id, { name: "x" }), false);
});

test("the subject window saves its fields, moves a recategorised subject and reveals one at a time", () => {
  const s = system("chase");
  const [first] = s.subjects;
  const second = D.addRow(s, "subjects");
  const third = D.addRow(s, "subjects");
  assert.equal(D.saveSubject(s, second.id, second.id, { name: "Gate", category: "  Obstacle " }), true);
  assert.deepEqual([second.name, second.category], ["Gate", "Obstacle"]);
  assert.deepEqual(s.subjects.map((subject) => subject.id), [first.id, third.id, second.id], "a new category moves it to its group");
  assert.equal(D.saveSubject(s, third.id, third.id, { revealed: true }), true);
  assert.deepEqual(s.subjects.map((subject) => subject.revealed), [false, true, false], "a chase shows one subject at a time");
  D.removeRow(s, "subjects.2");
  assert.equal(D.saveSubject(s, second.id, second.id, { name: "x" }), false);
});

test("the action window saves its checks and drops links to checks it removed", () => {
  const { s, subject, modifier } = modifierSystem();
  const action = influence(s);
  const [kept, gone] = action.checks;
  Object.assign(modifier, withDc(2, { allSkills: false, skills: [kept.id, gone.id] }));
  assert.equal(D.saveAction(s, subject.id, action.id, { name: "Sway", secret: true, checks: [kept] }), true);
  assert.deepEqual([action.name, action.secret, action.checks.length], ["Sway", true, 1]);
  assert.deepEqual(modifier.dc.skills, [kept.id]);
  assert.equal(D.saveAction(s, subject.id, "nope", { name: "x" }), false);
});

test("a threshold is added to and removed from its counter by the counter's id, the challenge's or a subject's, and never on a per-PC counter", () => {
  const s = runSystem();
  assert.equal(D.entryListPath(s, "thresholds", s.counters[0].id), "counters.0.thresholds");
  assert.equal(D.entryListPath(s, "thresholds", pts(s).id), "subjects.0.counters.0.thresholds");
  assert.equal(D.entryListPath(s, "thresholds", "gone"), null);
  const row = D.addRow(s, D.entryListPath(s, "thresholds", pts(s).id));
  assert.deepEqual([row.name, row.description, row.reveal], ["", "", "hidden"]);
  assert.equal(D.findThreshold(s, pts(s).id, row.id), row);
  assert.equal(D.findThreshold(s, s.counters[0].id, row.id), undefined, "found only under its own counter");
  assert.equal(D.removeEntry(s, "thresholds", pts(s).id, row.id), true);
  assert.ok(!pts(s).thresholds.includes(row));
  s.counters[0].perPc = true;
  assert.equal(D.entryListPath(s, "thresholds", s.counters[0].id), null, "a per-PC counter has no thresholds");
});

test("the threshold window saves its fields onto the threshold, trimming the name, and reports a threshold that is gone", () => {
  const s = runSystem();
  const row = D.addRow(s, "counters.0.thresholds");
  const changes = { name: "  Guards arrive ", points: 4, reveal: "full", dc: 1, reached: true, description: "<p>They come</p>", id: "not saved" };
  assert.equal(D.saveThreshold(s, s.counters[0].id, row.id, changes), true);
  assert.deepEqual([row.name, row.points, row.reveal, row.dc, row.reached, row.description, row.id !== "not saved"], ["Guards arrive", 4, "full", 1, true, "<p>They come</p>", true]);
  assert.equal(D.saveThreshold(s, s.counters[0].id, "gone", { name: "x" }), false);
});

test("the counter window saves a challenge or subject counter and keeps its value in its limits", () => {
  const s = runSystem();
  assert.equal(D.saveCounter(s, "", s.counters[0].id, { max: 2, thresholds: [D.newThreshold()] }), true);
  assert.deepEqual([s.counters[0].value, s.counters[0].thresholds.length], [2, 0], "thresholds have their own window, so the counter window never saves them");
  assert.equal(D.saveCounter(s, sub(s).id, pts(s).id, { name: "Trust", min: null }), true);
  assert.equal(pts(s).name, "Trust");
  assert.deepEqual(D.mergeForm({ min: 0, max: 5 }, { min: null, max: null }), { min: null, max: null }, "the window can blank a limit");
});

test("the sheet's delete buttons remove an entry by its id, wherever it now sits", () => {
  const { s, subject, modifier } = modifierSystem();
  const challengeCounter = D.addRow(s, "counters");
  assert.deepEqual([D.entryListPath(s, "actions", subject.id), D.entryListPath(s, "counters", ""), D.entryListPath(s, "actions", "")], ["subjects.0.actions", "counters", null]);
  assert.equal(D.removeEntry(s, "modifiers", subject.id, modifier.id), true);
  assert.equal(D.removeEntry(s, "counters", "", challengeCounter.id), true);
  assert.equal(D.removeEntry(s, "actions", subject.id, discover(s).id), true);
  assert.deepEqual([subject.modifiers.length, s.counters.length, subject.actions.length], [0, 0, 1]);
  assert.equal(D.removeEntry(s, "subjects", "", subject.id), false, "the last subject stays");
  assert.equal(D.removeEntry(s, "counters", "", "gone"), false);
});

test("the windows' rows use the shared row edits on the entry alone", () => {
  const { modifier } = modifierSystem();
  const draft = structuredClone(modifier);
  D.setDcAmount(draft, "", 5);
  const merged = D.mergeForm(draft, { name: "Praise", dc: { amount: null }, note: "x" });
  assert.deepEqual([merged.name, merged.dc.amount, merged.note], ["Praise", 5, "x"], "a blank amount keeps the old one");
  const action = D.newAction();
  assert.equal(action.description, "", "a new action has an empty description");
});

test("the Edit tab's form writes an action's name, description and Secret and keeps its checks", () => {
  const s = system();
  const action = influence(s);
  const a = sub(s).actions.indexOf(action);
  D.applyForm(s, { subjects: { 0: { actions: { [a]: { name: "Sway", description: "Spend an action\nto sway", secret: true } } } } });
  const saved = sub(s).actions[a];
  assert.deepEqual([saved.name, saved.description, saved.secret, saved.checks.length], ["Sway", "Spend an action\nto sway", true, 3]);
  assert.match(D.searchText(s), /to sway/);
});

test("an action's description reaches the panel copy without its secret blocks", () => {
  const s = system();
  sub(s).revealed = true;
  influence(s).description = '<p>Sway them.</p><section class="secret" id="secret-x"><p>They hate flattery.</p></section><p><strong>Success</strong> +1</p>';
  const view = V.buildPanelView({ name: "c", system: s, party: [] });
  const copy = view.subjects[0].actions.find((action) => action.id === influence(s).id);
  assert.equal(copy.description, "<p>Sway them.</p><p><strong>Success</strong> +1</p>");
  assert.doesNotMatch(JSON.stringify(view), /flattery/);
  assert.equal(V.withoutSecrets(""), "");
});

test("a subject's description reaches the panel copy without its secret blocks", () => {
  const s = system();
  sub(s).revealed = true;
  assert.equal(sub(system()).description, "", "a new subject has an empty description");
  sub(s).description = '<p>A <em>proud</em> noble.</p><section class="secret" id="secret-y"><p>Owes the guild.</p></section>';
  const view = V.buildPanelView({ name: "c", system: s, party: [] });
  assert.equal(view.subjects[0].description, "<p>A <em>proud</em> noble.</p>");
  assert.doesNotMatch(JSON.stringify(view), /guild/);
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

test("a roll's message gives the roll's identity, DC and reroll state; other messages give nothing", () => {
  const option = O.buildRollOption({ challengeId: "c", subjectId: "s", actionId: "a", checkId: "e", rollId: "r" });
  const message = (context) => ({ id: "m1", actor: { id: "a1" }, flags: { pf2e: { context } } });
  assert.deepEqual(L.rollFromMessage(message({ options: ["x", option], outcome: "success", dc: { value: 18 }, isReroll: true })), {
    challengeId: "c", subjectId: "s", actionId: "a", checkId: "e", rollId: "r", messageId: "m1", actorId: "a1", dc: 18, isReroll: true,
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

test("a roll changes no points and no counter: the GM changes every value by hand", () => {
  const s = running();
  const before = structuredClone([s.subjects, s.counters, s.rounds]);
  Run.receiveRoll(s, rollOf(s));
  Run.receiveRoll(s, discoverRoll(s, { rollId: "r2", actorId: "a2" }));
  assert.deepEqual(structuredClone([s.subjects, s.counters, s.rounds]), before);
  assert.deepEqual(s.run.acted, ["a1", "a2"]);
  for (const name of ["applyRoll", "outcomePlan", "applyBlock", "undoApply", "undoBlock", "applyModifier", "canApplyModifier"]) assert.equal(Run[name], undefined, name);
});

/* Subject counters (spec 14.13) */

test("Complete is the GM's alone: a subject's counter reaching its maximum sets nothing", () => {
  const s = running();
  pts(s).max = 2;
  changePts(s, 5);
  assert.deepEqual([pts(s).value, sub(s).complete], [2, false]);
  Run.toggleComplete(s, sub(s).id);
  assert.equal(sub(s).complete, true);
  changePts(s, -2);
  assert.equal(sub(s).complete, true, "dropping points never clears it");
  Run.toggleComplete(s, sub(s).id);
  assert.equal(sub(s).complete, false);
  assert.equal(Run.toggleComplete(s, "gone"), false);
});

test("a subject's counter that counts down reaches its thresholds as it falls", () => {
  const s = running();
  Object.assign(pts(s), { direction: "down", value: 6, thresholds: [{ ...D.newThreshold(), points: 4 }, { ...D.newThreshold(), points: 2 }] });
  changePts(s, 1);
  assert.deepEqual(pts(s).thresholds.map((t) => t.reached), [false, false], "moving away reaches nothing");
  changePts(s, -3);
  assert.deepEqual(pts(s).thresholds.map((t) => t.reached), [true, false]);
  const { triggers } = changePts(s, -2);
  assert.deepEqual([pts(s).thresholds[1].reached, triggers.map((row) => row.value)], [true, [2]], "the GM gets a notice, as for a challenge counter");
  assert.equal(Run.hasReached("down", 2, 2), true);
  assert.equal(Run.hasReached("up", 1, 2), false);
});

test("a subject can hold several counters, a per-PC one among them, or none", () => {
  const s = running();
  const edge = Object.assign(D.addRow(s, "subjects.0.counters"), { name: "Rapport", perPc: true });
  Run.changeCounter(s, edge.id, 2, "a1");
  assert.deepEqual([Run.counterValueOf(edge, "a1"), Run.counterValueOf(edge, "a2"), pts(s).value], [2, 0, 1]);
  assert.equal(Run.changeCounter(s, edge.id, 1), false, "with no PC named, nothing changes");
  sub(s).counters = [];
  assert.equal(Run.changeCounter(s, pts(running()).id, 1), false, "an id from another challenge finds nothing");
  assert.equal(Run.changeCounter(s, sub(s).id, 1), false, "a subject is not a counter");
});

test("a subject's counter takes its change each round on Next round, with notices, and Previous round takes it back", () => {
  const s = running();
  pts(s).perRound = 2;
  const { triggers } = Run.advanceRound(s);
  assert.deepEqual([pts(s).value, pts(s).thresholds.map((t) => t.reached), triggers.map((row) => row.value)], [3, [true, false], [2]]);
  Run.undoRound(s);
  assert.deepEqual([pts(s).value, pts(s).thresholds.map((t) => t.reached)], [1, [false, false]]);
  Object.assign(pts(s), { perPc: true, valueBy: { a1: 4 } });
  Run.advanceRound(s);
  assert.deepEqual([pts(s).value, pts(s).valueBy], [1, { a1: 4 }], "a per-PC counter has no change each round");
});

test("the Reached tag toggles a threshold both ways on a subject's counter or a challenge counter, and a counter moving back never clears it", () => {
  const s = running();
  const t = pts(s).thresholds[0];
  changePts(s, t.points);
  assert.equal(t.reached, true);
  Run.toggleReached(s, pts(s).id, t.id);
  assert.equal(t.reached, false);
  Run.toggleReached(s, pts(s).id, t.id);
  changePts(s, -t.points);
  assert.equal(t.reached, true);
  assert.equal(Run.toggleReached(s, pts(s).id, "gone"), false);
  assert.equal(Run.toggleReached(s, "gone", t.id), false);
  const counter = s.counters[0];
  const ct = D.addRow(s, "counters.0.thresholds");
  Run.toggleReached(s, counter.id, ct.id);
  assert.equal(ct.reached, true);
  Run.cycleThresholdReveal(s, counter.id, ct.id);
  assert.equal(ct.reveal, "points");
});

test("the threshold reveal cycle finds the threshold by its counter, so two subjects can share threshold ids", () => {
  const s = runSystem();
  const second = D.addRow(s, "subjects");
  second.counters[0].thresholds = structuredClone(pts(s).thresholds);
  const owner = second.counters[0].id;
  const id = second.counters[0].thresholds[0].id;
  Run.cycleThresholdReveal(s, owner, id);
  Run.cycleThresholdReveal(s, owner, id);
  assert.deepEqual([pts(s).thresholds[0].reveal, second.counters[0].thresholds[0].reveal], ["hidden", "full"]);
  Run.cycleThresholdReveal(s, owner, id);
  assert.equal(second.counters[0].thresholds[0].reveal, "hidden");
  assert.equal(Run.cycleThresholdReveal(s, owner, "gone"), false);
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

test("a blank round maximum means no limit", () => {
  const s = running();
  s.rounds.max = null;
  for (let i = 0; i < 20; i++) Run.advanceRound(s);
  assert.equal(s.rounds.current, 21);
  Run.resetRun(s);
  assert.deepEqual([s.rounds.max, s.rounds.current], [null, 0]);
});

test("a round maximum of 0 means no rounds: Start leaves the round at 0 and Next round does nothing; Reputation starts that way", () => {
  const s = runSystem();
  s.rounds.max = 0;
  Run.startRun(s);
  assert.deepEqual([Run.hasRounds(s), s.rounds.current, Run.canAdvanceRound(s), Run.advanceRound(s), Run.canUndoRound(s)], [false, 0, false, false, false]);
  assert.equal(D.newChallengeSystem("reputation").rounds.max, 0);
  assert.equal(D.newChallengeSystem("victory").rounds.max, null, "other presets keep rounds");
  assert.equal(D.mergeForm(s, { rounds: { max: 0 } }).rounds.max, 0, "the sheet can set 0");
  D.applyForm(s, { rounds: { max: 5 } });
  assert.deepEqual([s.rounds.max, s.rounds.current, Run.canAdvanceRound(s)], [5, 1, true], "rounds turned back on mid-run start at round 1");
  D.applyForm(s, { rounds: { max: null } });
  assert.equal(s.rounds.current, 1, "a later change leaves the round alone");
  const idle = runSystem();
  idle.rounds.max = 0;
  D.applyForm(idle, { rounds: { max: 5 } });
  assert.equal(idle.rounds.current, 0, "a challenge not yet started keeps round 0 until Start");
});

test("a counter's change each round is added on Next round, and Previous round takes it and its thresholds back", () => {
  const s = running();
  const counter = s.counters[0];
  Object.assign(counter, { perRound: 1, thresholds: [{ ...D.newThreshold(), points: 4, name: "Guards", dc: 1 }] });
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
  s.counters[0].thresholds.push({ ...D.newThreshold(), points: 5, reveal: "points" });
  Run.startRun(s);
  assert.equal(Run.startRun(s), false);
  changePts(s, 4);
  Run.toggleComplete(s, subject.id);
  Run.toggleReveal(s, pts(s).id);
  Run.toggleReveal(s, society(s).id);
  Run.toggleReveal(s, discover(s).checks[1].id);
  Run.toggleReveal(s, subject.id);
  society(s).dc = 22;
  Run.changeCounter(s, s.counters[0].id, 6);
  Run.cycleThresholdReveal(s, s.counters[0].id, s.counters[0].thresholds[0].id);
  Run.receiveRoll(s, rollOf(s));
  changePts(s, 1);
  Run.advanceRound(s);
  Run.endRun(s);
  assert.deepEqual([s.run.status, pts(s).value, subject.complete, pts(s).revealed], ["finished", 6, true, false]);
  Run.resetRun(s);
  assert.equal(s.run.status, "inactive");
  assert.deepEqual([s.rounds.current, pts(s).value, pts(s).revealed, subject.complete, subject.revealed, s.counters[0].value], [0, 1, true, false, true, 3]);
  assert.deepEqual(pts(s).thresholds.map((t) => t.reached), [false, false]);
  assert.deepEqual([s.counters[0].thresholds[0].reached, s.counters[0].thresholds[0].reveal], [false, "points"]);
  assert.deepEqual([society(s).revealed, discover(s).checks[1].revealed, society(s).dc], [false, true, 22]);
  for (const list of ["acted", "roundHistory"]) assert.deepEqual(s.run[list], [], list);
  assert.equal(s.run.baseline, null);
  assert.equal(Run.resetRun(s), false);
});

test("reset clears a subject's per-PC counter", () => {
  const s = runSystem();
  Object.assign(pts(s), { perPc: true, value: 0 });
  Run.startRun(s);
  Run.changeCounter(s, pts(s).id, 1, "a1");
  assert.deepEqual(pts(s).valueBy, { a1: 1 });
  Run.resetRun(s);
  assert.deepEqual(pts(s).valueBy, {});
});

test("rows, subjects and counters added during a run go back to hidden and unreached on reset, and keep their place", () => {
  const s = running();
  const late = [D.addRow(s, "subjects.0.actions.0.checks"), D.addRow(s, "subjects.0.actions.1.checks"), D.addRow(s, "subjects.0.modifiers")];
  for (const row of late) row.revealed = true;
  Object.assign(late[2], { active: true, spent: true });
  Object.assign(D.addRow(s, "subjects.0.counters.0.thresholds"), { reveal: "full", reached: true });
  const subject = D.addRow(s, "subjects");
  subject.complete = true;
  subject.counters[0].value = 3;
  subject.counters[0].thresholds.push({ ...D.newThreshold(), reached: true });
  const counter = D.addRow(s, "counters");
  counter.value = 2;
  counter.revealed = false;
  counter.thresholds.push({ ...D.newThreshold(), points: 4 });
  Run.changeCounter(s, counter.id, 3);
  Run.toggleReveal(s, counter.id);
  Run.resetRun(s);
  assert.deepEqual(late.map((row) => row.revealed), [false, false, false]);
  assert.deepEqual([late[2].active, late[2].spent], [false, false]);
  assert.deepEqual([pts(s).thresholds.at(-1).reveal, pts(s).thresholds.at(-1).reached], ["hidden", false]);
  assert.deepEqual([subject.counters[0].value, subject.complete, subject.revealed, subject.counters[0].thresholds[0].reached], [3, false, false, false], "a new subject's counter has no start value to go back to");
  assert.deepEqual([counter.value, counter.revealed, counter.thresholds[0].reached], [2, false, false]);
  assert.equal(influence(s).checks.at(-1).id, late[1].id);
});

test("a copy of a running challenge goes back to its start values; one that never started reports no change", () => {
  const s = running();
  changePts(s, 3);
  assert.notEqual(Run.resetRun(s), false);
  assert.deepEqual([s.run.status, pts(s).value], ["inactive", 1]);
  assert.equal(Run.resetRun(runSystem()), false);
});

/* DCs and modifier entries */

const addModifier = (s, over = {}, fields = {}) => {
  const m = { ...D.newModifier(), active: true, name: "Entry", ...over, ...fields };
  sub(s).modifiers.push(m);
  return m;
};
const dcOf = (s, row = society(s)) => Run.currentDc(s, sub(s), row);
const dcEffect = withDc;
const rollAt = (s, rollId, dc, over = {}) => rollOf(s, { rollId, dc, ...over });

test("current DC adds what's on, and ignores what's off or spent", () => {
  const s = running();
  const on = addModifier(s, {}, dcEffect(-2));
  addModifier(s, { active: false }, dcEffect(5));
  addModifier(s, { spent: true }, dcEffect(5));
  assert.equal(dcOf(s), 13);
  on.active = false;
  assert.equal(dcOf(s), 15);
});

test("a DC change on chosen checks matches only those checks, on any action, and the DC can't go below 0", () => {
  const s = running();
  const perception = discover(s).checks[0];
  addModifier(s, {}, dcEffect(5, { allSkills: false, skills: [perception.id] }));
  assert.deepEqual([dcOf(s), dcOf(s, perception)], [15, 20]);
  addModifier(s, {}, dcEffect(-99));
  assert.equal(dcOf(s), 0);
});

test("a reached threshold's DC change applies while it is reached: a subject counter's to its own subject's checks, a challenge counter's to every check", () => {
  const s = running();
  const other = D.addRow(s, "subjects");
  const otherCheck = other.actions[1].checks[0];
  pts(s).thresholds[0].dc = 2;
  s.counters[0].thresholds.push({ ...D.newThreshold(), points: 4, dc: 1 });
  assert.equal(dcOf(s), 15);
  changePts(s, 1);
  assert.deepEqual([dcOf(s), Run.currentDc(s, other, otherCheck)], [17, 15]);
  Run.changeCounter(s, s.counters[0].id, 1);
  assert.deepEqual([dcOf(s), Run.currentDc(s, other, otherCheck)], [18, 16]);
  Run.toggleReached(s, pts(s).id, pts(s).thresholds[0].id);
  assert.equal(dcOf(s), 16);
});

test("a one-time DC change is spent when its roll arrives, and leaves a newer entry alone", () => {
  const s = running();
  const m = addModifier(s, { duration: "oneTime" }, dcEffect(-2));
  const other = addModifier(s, { duration: "oneTime", active: false }, dcEffect(-2));
  Run.receiveRoll(s, rollAt(s, "r1", 13));
  assert.deepEqual([m.spent, other.spent, dcOf(s)], [true, false, 15]);
});

test("two arriving rolls at a one-time DC: the first spends it, and the next check is at the normal DC", () => {
  const s = running();
  const m = addModifier(s, { duration: "oneTime" }, dcEffect(-2));
  Run.receiveRoll(s, rollAt(s, "r1", dcOf(s)));
  assert.deepEqual([m.spent, dcOf(s)], [true, 15]);
  Run.receiveRoll(s, rollAt(s, "r2", dcOf(s), { actorId: "a2" }));
  assert.deepEqual([m.spent, dcOf(s)], [true, 15]);
});

test("a multi-use DC change turns Off when its roll arrives, is never spent, and works again once turned On", () => {
  const s = running();
  const m = addModifier(s, { duration: "multiUse" }, dcEffect(-2));
  Run.receiveRoll(s, rollAt(s, "r1", 13));
  assert.deepEqual([m.active, m.spent, dcOf(s)], [false, false, 15]);
  m.active = true;
  Run.receiveRoll(s, rollAt(s, "r2", 13, { actorId: "a2" }));
  assert.deepEqual([m.active, m.spent, dcOf(s)], [false, false, 15]);
});

test("an ongoing DC change is never spent by an arriving roll", () => {
  const s = running();
  const m = addModifier(s, {}, dcEffect(-2));
  Run.receiveRoll(s, rollAt(s, "r1", 13));
  assert.deepEqual([m.spent, dcOf(s)], [false, 13]);
});

test("a reroll spends nothing, so a restored entry stays usable", () => {
  const s = running();
  const m = addModifier(s, { duration: "oneTime" }, dcEffect(-2));
  Run.receiveRoll(s, rollAt(s, "r1", 13));
  assert.equal(m.spent, true);
  Run.restoreModifier(s, sub(s).id, m.id);
  Run.receiveRoll(s, rollAt(s, "r1", 13, { isReroll: true }));
  assert.equal(m.spent, false);
});

test("a roll at another DC, or with the entry off, leaves one-time entries alone", () => {
  const s = running();
  const m = addModifier(s, { duration: "oneTime" }, dcEffect(-2));
  Run.receiveRoll(s, rollAt(s, "r1", 15));
  assert.equal(m.spent, false);
  Run.toggleModifier(s, sub(s).id, m.id);
  Run.receiveRoll(s, rollAt(s, "r2", 13));
  assert.equal(m.spent, false);
  Run.toggleModifier(s, sub(s).id, m.id);
  assert.equal(dcOf(s), 13, "on again, it applies to the next check");
});

test("a secret check spends a matching one-time entry when it arrives", () => {
  const s = running();
  const row = discover(s).checks[0];
  const m = addModifier(s, { duration: "oneTime" }, dcEffect(2, { allSkills: false, skills: [row.id] }));
  Run.receiveRoll(s, discoverRoll(s, { rollId: "r1", dc: 15 }));
  assert.equal(m.spent, false, "this roll's DC didn't include it");
  Run.receiveRoll(s, discoverRoll(s, { rollId: "r2", dc: 17, isReroll: true }));
  assert.equal(m.spent, false, "a reroll spends nothing");
  Run.receiveRoll(s, discoverRoll(s, { rollId: "r3", dc: 17 }));
  assert.equal(m.spent, true);
});

test("an entry toggles only while the run is active, and a spent entry needs Restore", () => {
  const s = running();
  const m = addModifier(s, { duration: "oneTime" }, dcEffect(-2));
  Run.receiveRoll(s, rollAt(s, "r1", 13));
  assert.equal(Run.toggleModifier(s, sub(s).id, m.id), false, "a spent entry needs Restore");
  Run.restoreModifier(s, sub(s).id, m.id);
  assert.deepEqual([m.spent, m.active], [false, true]);
  assert.equal(Run.restoreModifier(s, sub(s).id, m.id), false);
  Run.endRun(s);
  assert.equal(Run.toggleModifier(s, sub(s).id, m.id), false);
});

test("counters stop at their limits, and a counter at its limit does not move", () => {
  const s = running();
  const c = s.counters[0];
  Object.assign(c, { value: 4, min: 0, max: 5 });
  Run.changeCounter(s, c.id, 1);
  assert.equal(Run.changeCounter(s, c.id, 1), false);
  assert.equal(c.value, 5);
  Run.changeCounter(s, c.id, -99);
  assert.equal(c.value, 0);
});

test("a counter threshold gives a notice when the counter reaches or passes it in its direction, once", () => {
  const s = running();
  const c = s.counters[0];
  Object.assign(c, { value: 0, thresholds: [{ ...D.newThreshold(), points: 2, name: "Guards", description: "<p>not in the notice</p>" }, { ...D.newThreshold(), points: 4 }] });
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

test("a counter change and modifier state go back on reset, and a hand edit of the maximum survives", () => {
  const s = runSystem();
  const c = s.counters[0];
  const wasOn = addModifier(s, { duration: "oneTime" }, dcEffect(-2));
  const wasOff = addModifier(s, { active: false }, dcEffect(2));
  Run.startRun(s);
  Run.receiveRoll(s, rollAt(s, "r1", 15));
  Run.toggleModifier(s, sub(s).id, wasOff.id);
  Run.changeCounter(s, c.id, 2);
  s.rounds.max = 11;
  Run.resetRun(s);
  assert.deepEqual([wasOn.active, wasOn.spent, wasOff.active], [true, false, false]);
  assert.deepEqual([s.rounds.max, c.value], [11, 3]);
});

/* The filtered copy */

const GM_SECRET = "GMSECRET";
/** A running challenge with one entry of every kind, none revealed, and GM-only text in every GM field. */
const secretSystem = () => {
  const s = runSystem();
  s.gmNotes = `<p>${GM_SECRET} notes</p>`;
  const subject = sub(s);
  Object.assign(subject, { name: "Lady Vance", description: `<p>A noble.</p><section class="secret" id="secret-v"><p>${GM_SECRET} stats</p></section>` });
  subject.counters[0].thresholds = [{ ...D.newThreshold(), points: 8, dc: 3, name: "Introduction", description: `<p>she offers an introduction</p><section class="secret" id="secret-a"><p>${GM_SECRET} threshold</p></section>` }];
  subject.modifiers = [{ ...D.newModifier(), name: "Flattery", description: `<p>likes praise</p><section class="secret" id="secret-b"><p>${GM_SECRET} modifier</p></section>`, note: `${GM_SECRET} effect` }];
  s.counters = [{ ...D.newCounter(), revealed: false, name: "Suspicion", value: 3, min: -111, max: 222, perRound: 1, thresholds: [{ ...D.newThreshold(), points: 5, name: "the guards stir", description: `<section class="secret" id="secret-c"><p>${GM_SECRET} counter threshold</p></section>` }] }];
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
  }
  for (const counter of D.allCounters(s)) {
    counter.revealed = true;
    for (const row of counter.thresholds) row.reveal = "full";
  }
};
const assertNoSecrets = (view) => {
  const { keys } = scan(view);
  for (const key of ["decoy", "gmNotes", "revealed", "note", "min", "perRound", "direction", "baseline", "run", "preset"]) assert.ok(!keys.has(key), `key ${key} must not appear`);
  assert.ok(!JSON.stringify(view).includes(GM_SECRET), "GM text must not appear");
};

test("the copy shows only the defaults before anything is revealed", () => {
  const s = secretSystem();
  pts(s).value = 2;
  const view = viewOf(s);
  assert.deepEqual([view.name, view.pointsName, view.subjectLabel], ["Banquet", "SSM.Preset.influence.Points", "SSM.Preset.influence.Subject"]);
  assert.deepEqual(view.rounds, { current: 1, max: 6 });
  const [subject] = view.subjects;
  assert.deepEqual([subject.name, subject.complete], ["Lady Vance", false]);
  assert.deepEqual(subject.counters, [{ id: pts(s).id, name: "SSM.Preset.influence.Points", value: 2, text: "2", display: "bar", slots: null, perPc: false, pcs: [], scale: 8, range: null, marks: [], thresholds: [] }], "a subject's counter starts shown; its hidden threshold sets only the scale");
  assert.deepEqual(subject.actions.map((action) => [action.name, action.secret, action.checks.map((row) => row.skill)]), [
    ["SSM.Preset.influence.Discover", true, ["perception"]],
    ["SSM.Preset.influence.Influence", false, ["deception", "diplomacy", "intimidation"]],
  ]);
  assert.deepEqual([known(subject), view.counters], [[], []]);
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
  secretAction.checks.push({ ...D.newCheck(), revealed: false, dc: 654 });
  const text = JSON.stringify(viewOf(s));
  for (const part of ["987", "654", society(s).id, "Bribe", secretAction.id]) assert.ok(!text.includes(part), part);
});

test("revealing each kind of entry adds it, and only its player fields", () => {
  const s = secretSystem();
  revealAll(s);
  const view = viewOf(s);
  const subject = sub(s);
  assert.deepEqual(view.subjects[0].actions[1].checks.at(-1), { id: society(s).id, skill: "society", lore: "", dc: 15 });
  assert.deepEqual(known(view.subjects[0]), [{ id: subject.modifiers[0].id, name: "Flattery", description: "<p>likes praise</p>", category: "", colour: "", duration: "ongoing", active: false, spent: false, changes: [] }]);
  assert.deepEqual(view.subjects[0].counters[0].thresholds, [{ id: pts(s).thresholds[0].id, points: 8, label: "8", name: "Introduction", description: "<p>she offers an introduction</p>", textHidden: false, reached: false }]);
  assert.deepEqual(view.counters, [{ id: s.counters[0].id, name: "Suspicion", value: 3, text: "3/222", perPc: false, pcs: [], display: "bar", slots: null, scale: 222, range: null, marks: [{ points: 5, reached: false }], thresholds: [{ id: s.counters[0].thresholds[0].id, points: 5, label: "5", name: "the guards stir", description: "", textHidden: false, reached: false }] }]);
  assertNoSecrets(view);
  Run.toggleReveal(s, society(s).id);
  assert.equal(viewOf(s).subjects[0].actions[1].checks.length, 3, "hiding an entry again takes it back out");
});

test("a visible check carries its current DC for the roll, thresholds and one-time entries included", () => {
  const s = secretSystem();
  revealAll(s);
  sub(s).modifiers.push({ ...D.newModifier(), active: true, duration: "oneTime", ...withDc(-2) });
  pts(s).thresholds[0].reached = true;
  const view = viewOf(s);
  const found = V.findPanelRow(view, { subject: sub(s).id, act: influence(s).id, id: society(s).id });
  assert.deepEqual([found.row.dc, found.action.secret, found.subject.name], [16, false, "Lady Vance"]);
  assert.equal(V.findPanelRow(view, { subject: sub(s).id, act: discover(s).id, id: society(s).id }), null, "a check is found on its own action");
  Run.toggleReveal(s, society(s).id);
  assert.equal(V.findPanelRow(viewOf(s), { subject: sub(s).id, act: influence(s).id, id: society(s).id }), null);
  assert.equal(V.findPanelRow(null, { subject: "x", act: "y", id: "z" }), null);
});

test("a revealed decoy can't be told from a true entry, at any depth, and a decoy flag on a revealed check shows as a decoy to the GM", () => {
  const twin = (decoy) => {
    const s = secretSystem();
    revealAll(s);
    for (const row of [...sub(s).actions.flatMap((action) => action.checks), ...sub(s).modifiers]) row.decoy = decoy;
    return s;
  };
  const withIds = (s) => {
    const rows = [...s.subjects, ...sub(s).actions, ...sub(s).actions.flatMap((action) => action.checks), ...sub(s).modifiers, ...D.allCounters(s), ...D.allCounters(s).flatMap((c) => c.thresholds)];
    return rows.map((row) => row.id).reduce((text, id, n) => text.replaceAll(id, `ID${n}`), JSON.stringify(viewOf(s)));
  };
  assert.equal(withIds(twin(true)), withIds(twin(false)));
  const decoyView = viewOf(twin(true));
  assert.ok(![...scan(decoyView).values].some((value) => /decoy/i.test(String(value))));
  assertNoSecrets(decoyView);
  assert.equal(D.isDecoyCheck({ decoy: true, revealed: true }), true);
  assert.equal(D.isDecoyCheck({ decoy: false, revealed: true }), false);
});

test("an unrevealed decoy is left out, and a preset check is revealed from the start with its DC", () => {
  const s = secretSystem();
  const planted = { ...D.newCheck(), revealed: false, skill: "occultism", decoy: true, dc: 654 };
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
  const lore = { ...D.newCheck(), revealed: false, skill: "lore", lore: "Warfare Lore" };
  influence(s).checks.push(lore);
  assert.ok(!JSON.stringify(viewOf(s)).includes("Warfare"));
  lore.revealed = true;
  assert.deepEqual(viewOf(s).subjects[0].actions[1].checks.at(-1), { id: lore.id, skill: "lore", lore: "Warfare Lore", dc: 15 });
});

const R_ = "SSM.Preset.influence.Category.resistance";
const W_ = "SSM.Preset.influence.Category.weakness";
const O_ = "Other"; // no longer a suggestion: a label typed by hand

test("the panel groups cards by category: the blank one first, then the preset's suggestions in order, then others by first use; each keeps stored order", () => {
  const s = secretSystem();
  const base = sub(s).modifiers[0];
  const make = (category, name) => ({ ...structuredClone(base), id: `${category}-${name}`, category, name, revealed: true });
  sub(s).modifiers = [make(W_, "w1"), make("Opportunity", "op1"), make("", "b1"), make(O_, "o1"), make(R_, "r1"), make(` ${W_.toUpperCase()} `, "w2"), make("Complication", "c1"), make("opportunity", "op2"), make(R_, "r2")];
  const cards = known(viewOf(s).subjects[0]);
  assert.deepEqual(cards.map((card) => card.name), ["b1", "r1", "r2", "w1", "w2", "op1", "op2", "o1", "c1"]);
  assert.deepEqual(cards.map((card) => card.category), ["", R_, R_, W_, W_, "Opportunity", "Opportunity", O_, "Complication"]);
});

test("the panel shows a category, blank or labelled, only when one of its entries is revealed", () => {
  const s = secretSystem();
  const base = sub(s).modifiers[0];
  const make = (category, name, revealed) => ({ ...structuredClone(base), id: name, category, name, revealed });
  sub(s).modifiers = [make("", "b1", false), make(W_, "w1", true), make("Opportunity", "op1", false)];
  const groups = () => viewOf(s).subjects[0].modifierGroups.map((group) => [group.label, group.cards.map((card) => card.name)]);
  assert.deepEqual(groups(), [[W_, ["w1"]]], "neither the preset's suggestions nor a category with only hidden entries shows");
  sub(s).modifiers[0].revealed = true;
  assert.deepEqual(groups()[0], ["", ["b1"]]);
  assert.ok(!JSON.stringify(viewOf(s).subjects[0].modifierGroups).includes("Opportunity"), "a category with nothing revealed leaves no label in the copy");
  assert.ok(!JSON.stringify(viewOf(s)).includes("op1"), "a hidden entry's name stays out");
  sub(s).modifiers[2].revealed = true;
  assert.deepEqual(groups(), [["", ["b1"]], [W_, ["w1"]], ["Opportunity", ["op1"]]], "revealing an entry brings its category back");
});

test("each category's stripe takes the next palette colour; Influence's two keep today's colours; a blank category has none", () => {
  const s = system();
  sub(s).modifiers = [{ ...D.newModifier(), category: "Opportunity" }, { ...D.newModifier(), category: W_ }];
  s.modifiers = [{ ...D.newModifier(), category: "Lucky" }];
  const order = D.categoryOrder(s);
  assert.deepEqual(order.map((row) => row.label), [R_, W_, "Lucky", "Opportunity"], "the challenge's own entries count first, then each subject's");
  assert.deepEqual(order.map((row) => row.colour), ["#c0523f", "#6fae6a", D.CATEGORY_COLOURS[2], D.CATEGORY_COLOURS[3]]);
  assert.deepEqual(D.categoryOrder(system("victory")).map((row) => row.label), ["SSM.Preset.victory.Category.modifier"]);
  const groups = D.groupByCategory(s, sub(s).modifiers, { withSuggestions: true });
  assert.deepEqual(groups.map((group) => [group.label, group.rows.length]), [[R_, 0], [W_, 1], ["Opportunity", 1]], "the Edit tab keeps the suggestions even when empty");
  assert.deepEqual(D.groupByCategory(s, sub(s).modifiers).map((group) => group.label), [W_, "Opportunity"]);
  sub(s).modifiers.push({ ...D.newModifier(), category: "" });
  assert.deepEqual(D.groupByCategory(s, sub(s).modifiers).map((group) => group.label), ["", W_, "Opportunity"], "the blank category groups first");
});

test("thresholds show in the order the track reaches them; points-only shows no name or description; a secret block never reaches players", () => {
  const s = secretSystem();
  const make = (points, reveal, name = "") => ({ ...D.newThreshold(), points, reveal, name, description: `<p>${name}</p><section class="secret" id="secret-t"><p>${GM_SECRET} t</p></section>` });
  pts(s).thresholds = [make(8, "full", "eight"), make(2, "points", "two"), make(5, "hidden", "five"), make(4, "full")];
  changePts(s, 3);
  assert.deepEqual(viewOf(s).subjects[0].counters[0].thresholds.map((row) => [row.points, row.name, row.description, row.textHidden, row.reached]), [[2, "", "", true, true], [4, "", "<p></p>", false, true], [8, "eight", "<p>eight</p>", false, false]]);
  assertNoSecrets(viewOf(s));
  pts(s).direction = "down";
  assert.deepEqual(viewOf(s).subjects[0].counters[0].thresholds.map((row) => row.points), [8, 4, 2]);
});

test("a bar scales to the maximum or the highest threshold, hidden or not; a counter that counts down scales to its start", () => {
  const s = secretSystem();
  const scale = () => viewOf(s).subjects[0].counters[0].scale;
  assert.equal(scale(), 8);
  pts(s).max = 12;
  assert.equal(scale(), 12);
  pts(s).thresholds = [];
  pts(s).max = null;
  assert.equal(scale(), 0, "no scale: the bar falls back to 10");
  const down = runSystem();
  Object.assign(pts(down), { direction: "down", value: 6 });
  Run.startRun(down);
  changePts(down, -4);
  const [counter] = viewOf(down).subjects[0].counters;
  assert.deepEqual([counter.scale, counter.value], [6, 2]);
});

test("a subject shows only its revealed counters, a per-PC one as a row per party PC, and none when it has none", () => {
  const s = secretSystem();
  const rapport = Object.assign(D.addRow(s, "subjects.0.counters"), { name: "Rapport", perPc: true, thresholds: [{ ...D.newThreshold(), reveal: "full", name: "never shown" }] });
  Run.changeCounter(s, rapport.id, 2, "a1");
  Run.changeCounter(s, rapport.id, 1, "stranger");
  let view = viewOf(s, PARTY).subjects[0];
  assert.deepEqual(view.counters.map((row) => row.name), ["SSM.Preset.influence.Points", "Rapport"]);
  assert.deepEqual([view.counters[1].display, view.counters[1].pcs, view.counters[1].thresholds], ["perPc", [{ id: "a1", value: 2, text: "2" }, { id: "a2", value: 0, text: "0" }], []]);
  Run.toggleReveal(s, pts(s).id);
  view = viewOf(s, PARTY).subjects[0];
  assert.deepEqual(view.counters.map((row) => row.name), ["Rapport"], "hiding a subject's counter takes it out");
  assert.ok(!JSON.stringify(viewOf(s, PARTY)).includes(pts(s).id));
  sub(s).counters = [];
  assert.deepEqual(viewOf(s, PARTY).subjects[0].counters, []);
  assertNoSecrets(viewOf(s, PARTY));
});

test("a revealed counter with no thresholds is a plain number; hidden counter thresholds stay out", () => {
  const s = secretSystem();
  s.counters[0].revealed = true;
  let [counter] = viewOf(s).counters;
  assert.deepEqual([counter.display, counter.thresholds], ["bar", []]);
  assert.ok(!JSON.stringify(viewOf(s)).includes("guards"));
  s.counters[0].thresholds = [];
  s.counters[0].max = null;
  [counter] = viewOf(s).counters;
  assert.deepEqual(counter, { id: s.counters[0].id, name: "Suspicion", value: 3, text: "3", perPc: false, pcs: [], display: "number", slots: null, scale: 0, range: null, marks: [], thresholds: [] });
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
  sub(s).modifiers[0].description += '<section class="secret" id="secret-n"><p>new GM text</p></section>';
  society(s).dc = 30;
  s.gmNotes = "changed";
  Run.receiveRoll(s, rollOf(s, { actorId: "" }));
  assert.equal(JSON.stringify(viewOf(s, PARTY)), before);
  changePts(s, 1);
  assert.notEqual(JSON.stringify(viewOf(s, PARTY)), before);
});

/* Modifier cards on the panel */

/** A revealed modifier on the secret system's subject, with these fields (its DC change and note). Returns the system and the card's texts. */
const cardOf = (fields, over = {}) => {
  const s = secretSystem();
  s.pointsName = "Influence Points";
  sub(s).modifiers = [{ ...D.newModifier(), name: "Flattery", revealed: true, ...over, ...fields(s) }];
  const [card] = known(viewOf(s).subjects[0]);
  return { s, card, texts: card.changes.map((change) => V.changeText(change, enText)) };
};

test("a card's DC change reads as a DC change, with no DC number, and lists the visible checks it names once each", () => {
  assert.deepEqual(cardOf(() => dcEffect(-2)).texts, ["−2 to all DCs"]);
  const chosen = cardOf((s) => {
    discover(s).checks.push({ ...D.newCheck(), skill: "diplomacy", revealed: true });
    return dcEffect(2, { allSkills: false, skills: [influence(s).checks[1].id, discover(s).checks[1].id, influence(s).checks[0].id, society(s).id] });
  });
  assert.deepEqual(chosen.texts, ["+2 to DCs vs Diplomacy and Deception"]);
  assert.ok(!JSON.stringify(chosen.card).includes("15"));
});

test("a card leaves out a hidden check, a note, a zero change and a removed check", () => {
  const { card } = cardOf((s) => ({ ...dcEffect(2, { allSkills: false, skills: [society(s).id, "gone"] }), note: `${GM_SECRET} note` }));
  assert.deepEqual(card.changes, []);
  assertNoSecrets(card);
  assert.deepEqual(cardOf(() => dcEffect(0)).card.changes, []);
});

test("a card carries category, colour, duration and state, its description and no secret block", () => {
  const { s, card } = cardOf(() => dcEffect(-2), { category: R_, duration: "oneTime", active: true, decoy: true, description: `<p>likes praise</p><section class="secret" id="secret-g"><p>${GM_SECRET} gm</p></section>` });
  assert.deepEqual([card.category, card.colour, card.duration, card.active, card.spent, card.description], [R_, "#c0523f", "oneTime", true, false, "<p>likes praise</p>"]);
  assertNoSecrets(card);
  Run.receiveRoll(s, rollAt(s, "r1", 13));
  assert.equal(known(viewOf(s).subjects[0])[0].spent, true);
});

/* Challenge-level modifiers (spec 14.7) */

const challengeMod = (s, over = {}, fields = {}) => {
  const row = { ...D.newModifier(), name: "Over Here!", active: true, ...over, ...fields };
  s.modifiers.push(row);
  return row;
};
/** A second subject with a Diplomacy check and a Warfare Lore check. */
const addSecondSubject = (s) => {
  const other = D.addRow(s, "subjects");
  other.actions[1].checks.push({ ...D.newCheck(), revealed: false, skill: "lore", lore: "Warfare Lore", dc: 20 });
  return other;
};

test("a challenge-level DC change hits every check in the challenge, filtered by skill name on any subject", () => {
  const s = running();
  const other = addSecondSubject(s);
  const lore = other.actions[1].checks.at(-1);
  const diplomacy = (subject) => subject.actions[1].checks.find((row) => row.skill === "diplomacy");
  challengeMod(s, {}, dcEffect(-2));
  assert.deepEqual([dcOf(s), Run.currentDc(s, other, lore)], [13, 18], "All skills reaches both subjects");
  Object.assign(s.modifiers[0], dcEffect(-2, { allSkills: false, skills: ["diplomacy", "lore:warfare lore"] }));
  assert.deepEqual([Run.currentDc(s, sub(s), diplomacy(sub(s))), Run.currentDc(s, other, diplomacy(other)), Run.currentDc(s, other, lore), dcOf(s)], [13, 13, 18, 15]);
  assert.deepEqual(D.challengeSkillKeys(s).sort(), ["deception", "diplomacy", "intimidation", "lore:warfare lore", "perception", "society"]);
});

test("a one-time challenge-level DC change is spent by the next matching check anywhere", () => {
  const s = running();
  const other = addSecondSubject(s);
  const row = challengeMod(s, { duration: "oneTime" }, dcEffect(2, { allSkills: false, skills: ["diplomacy"] }));
  Run.receiveRoll(s, rollAt(s, "r1", 15));
  assert.equal(row.spent, false, "a Society roll doesn't match");
  const check = other.actions[1].checks.find((c) => c.skill === "diplomacy");
  Run.receiveRoll(s, { ...rollOf(s), rollId: "r2", subjectId: other.id, actionId: other.actions[1].id, checkId: check.id, dc: 17 });
  assert.equal(row.spent, true);
  assert.equal(Run.currentDc(s, other, check), 15);
});

test("a challenge-level entry toggles, reveals, restores and resets like a subject's", () => {
  const s = running();
  const row = challengeMod(s, { duration: "oneTime" }, dcEffect(-2));
  Run.receiveRoll(s, rollAt(s, "r1", 13));
  assert.equal(row.spent, true);
  Run.restoreModifier(s, "", row.id);
  assert.equal(row.spent, false);
  Run.toggleModifier(s, "", row.id);
  Run.toggleReveal(s, row.id);
  assert.deepEqual([row.active, row.revealed], [false, true]);
  Run.resetRun(s);
  assert.deepEqual([row.active, row.spent, row.revealed], [false, false, false], "entries added during the run go back to hidden and off");
});

test("saving a challenge-level entry keeps skill names that exist", () => {
  const s = system();
  const row = challengeMod(s);
  D.saveModifier(s, "", row.id, { category: "  Opportunity ", note: "x", ...dcEffect(0, { allSkills: false, skills: ["diplomacy", "athletics"] }) });
  assert.deepEqual([row.category, row.note, row.dc.skills], ["Opportunity", "x", ["diplomacy"]]);
  assert.equal(D.findModifier(s, "", row.id), row);
  assert.ok(D.searchText(s).includes("Opportunity"));
});

test("the panel shows revealed challenge-level entries in their own list, by category, with skill names and no hidden checks or GM text", () => {
  const s = secretSystem();
  challengeMod(s, { category: "Opportunity", description: `<p>a distraction</p><section class="secret" id="secret-h"><p>${GM_SECRET} challenge</p></section>` }, { ...dcEffect(-2, { allSkills: false, skills: ["society", "diplomacy"] }), note: "x" });
  assert.deepEqual(viewOf(s).modifiers, [], "hidden until revealed");
  s.modifiers[0].revealed = true;
  const [card] = viewOf(s).modifiers;
  assert.deepEqual([card.name, card.category, card.description], ["Over Here!", "Opportunity", "<p>a distraction</p>"]);
  assert.deepEqual(card.changes.map((change) => V.changeText(change, enText)), ["−2 to DCs vs Diplomacy"], "Society is hidden, and a note shows nothing");
  assertNoSecrets(viewOf(s));
});

/* Per-PC counters, subject limits and order (spec 14.8) */

test("a per-PC counter: a hand change moves one PC's value inside the limits; no change each round", () => {
  const s = running();
  const counter = Object.assign(s.counters[0], { perPc: true, value: 0, max: 2, perRound: 1 });
  Run.changeCounter(s, counter.id, 1, "a1");
  Run.changeCounter(s, counter.id, 5, "a2");
  Run.changeCounter(s, counter.id, 1, "a1");
  assert.deepEqual(counter.valueBy, { a1: 2, a2: 2 });
  assert.equal(Run.changeCounter(s, counter.id, 1, "a1"), false, "a PC at the limit doesn't move");
  Run.advanceRound(s);
  assert.deepEqual([counter.value, counter.valueBy], [0, { a1: 2, a2: 2 }]);
  assert.equal(Run.changeCounter(s, counter.id, 1), false, "a hand change needs a PC");
  Run.resetRun(s);
  assert.deepEqual(counter.valueBy, {});
});

test("+ and − are off at the limit they would pass, on the sheet and the panel alike", () => {
  assert.deepEqual(D.counterMoves({ min: 0, max: 3 }, 0), { canAdd: true, canRemove: false });
  assert.deepEqual(D.counterMoves({ min: 0, max: 3 }, 3), { canAdd: false, canRemove: true });
  assert.deepEqual(D.counterMoves({ min: null, max: null }, -5), { canAdd: true, canRemove: true }, "no limits, both work");
  assert.deepEqual(D.counterMoves({ min: 5, max: 2 }, 3), { canAdd: true, canRemove: true }, "broken limits limit nothing");
});

test("a per-PC counter shows a row per party PC on the panel, and no thresholds", () => {
  const s = secretSystem();
  Object.assign(s.counters[0], { perPc: true, revealed: true, value: 1, valueBy: { a1: 3 } });
  const [counter] = viewOf(s, PARTY).counters;
  assert.deepEqual([counter.perPc, counter.display, counter.pcs, counter.thresholds], [true, "perPc", [{ id: "a1", value: 3, text: "3/222" }, { id: "a2", value: 1, text: "1/222" }], []]);
});

test("a subject's counter stays inside its limits, per PC too", () => {
  const s = running();
  Object.assign(pts(s), { min: 0, max: 4 });
  changePts(s, 9);
  assert.equal(pts(s).value, 4);
  assert.equal(changePts(s, 1), false);
  changePts(s, -9);
  assert.equal(pts(s).value, 0);
  pts(s).perPc = true;
  Run.changeCounter(s, pts(s).id, -3, "a1");
  assert.equal(Run.counterValueOf(pts(s), "a1"), 0);
});

test("a subject moves to an index in the order, and not past either end", () => {
  const s = system();
  const [a, b, c] = [sub(s), D.addRow(s, "subjects"), D.addRow(s, "subjects")];
  assert.equal(D.moveSubject(s, a.id, 0), false, "already there");
  assert.equal(D.moveSubject(s, a.id, 3), false, "past the end");
  assert.equal(D.moveSubject(s, a.id, -1), false, "before the start");
  assert.equal(D.moveSubject(s, "nobody", 0), false);
  D.moveSubject(s, a.id, 2);
  assert.deepEqual(s.subjects.map((row) => row.id), [b.id, c.id, a.id], "down to the end");
  D.moveSubject(s, a.id, 1);
  assert.deepEqual(s.subjects.map((row) => row.id), [b.id, a.id, c.id], "up one");
  D.moveSubject(s, c.id, 0);
  assert.deepEqual(s.subjects.map((row) => row.id), [c.id, b.id, a.id], "up to the start");
});

/* Both-ways tracks (spec 14.8) */

const reputation = () => {
  const s = running();
  Object.assign(pts(s), { direction: "both", min: -50, max: 50, value: 0 });
  pts(s).thresholds = [-30, -5, 0, 5, 15].map((points) => ({ ...D.newThreshold(), points }));
  return s;
};
const reachedOf = (s) => pts(s).thresholds.filter((row) => row.reached).map((row) => row.points);

test("a both-ways counter reaches thresholds above 0 by rising and below 0 by falling, never one at 0", () => {
  const s = reputation();
  changePts(s, 6);
  assert.deepEqual(reachedOf(s), [5]);
  changePts(s, -12);
  assert.deepEqual(reachedOf(s), [-5], "Reached follows the value: 5 clears, −5 is reached");
  changePts(s, -100);
  assert.deepEqual([pts(s).value, reachedOf(s)], [-50, [-30, -5]]);
  assert.equal(Run.hasReached("both", 0, 0), false);
});

test("Reached on a both-ways track can't be set by hand, follows a form edit, and its DC change lasts only while reached", () => {
  const s = reputation();
  pts(s).thresholds[3].dc = 2;
  assert.equal(Run.toggleReached(s, pts(s).id, pts(s).thresholds[3].id), false);
  pts(s).value = 7;
  Run.syncBothWays(s);
  assert.deepEqual(reachedOf(s), [5]);
  assert.equal(dcOf(s), 17);
  changePts(s, -3);
  assert.equal(dcOf(s), 15);
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
  const view = () => viewOf(s).subjects[0].counters[0];
  assert.deepEqual(view().range, { lo: -50, hi: 50 });
  assert.deepEqual(V.bothWaysBar(25, view().range), { both: true, zero: 50, left: 50, width: 25, negative: false });
  assert.deepEqual(V.bothWaysBar(-10, view().range), { both: true, zero: 50, left: 40, width: 10, negative: true });
  Object.assign(pts(s), { min: null, max: null });
  assert.deepEqual(view().range, { lo: -30, hi: 15 });
  pts(s).thresholds = [];
  assert.deepEqual(view().range, { lo: -10, hi: 10 });
  assert.equal(viewOf(running()).subjects[0].counters[0].range, null);
});

/* Infiltration and its preparation (items/archive/infiltration-subsystem.md) */

const presetSystem = (preset) => ({ ...D.newChallengeSystem(preset), gmNotes: "", run: RUN() });
/** No preset action has an outcome table: rolls change nothing, so the GM changes values by hand. */
/** A subject's counters as [name, value, min, max, revealed]. */
const countersOf = (subject) => subject.counters.map((row) => [row.name, row.value, row.min, row.max, row.revealed]);
const assertBareAction = (action) => assert.deepEqual(Object.keys(action).sort(), ["checks", "description", "id", "name", "secret"]);

test("the Infiltration preset: Awareness Points with GM Core's tiers, per-PC Edge Points, and a revealed first obstacle", () => {
  const s = presetSystem("infiltration");
  const [ap, ep] = s.counters;
  assert.deepEqual([s.pointsName, s.subjectLabel, s.rounds.max], ["SSM.Preset.infiltration.Points", "SSM.Preset.infiltration.Subject", null]);
  assert.deepEqual([ap.perRound, ap.min, ap.revealed, ap.perPc], [1, 0, true, false]);
  assert.deepEqual(ap.thresholds.map((row) => [row.points, row.dc, row.reveal]), [[5, 1, "points"], [10, 0, "points"], [15, 1, "points"], [20, 0, "points"]]);
  assert.deepEqual([ep.perPc, ep.min, ep.revealed], [true, 0, true]);
  const [obstacle] = s.subjects;
  assert.equal(obstacle.revealed, true);
  assert.deepEqual(countersOf(obstacle), [["SSM.Preset.infiltration.Points", 0, null, 2, true]], "an obstacle's Infiltration Points run to its maximum, 2");
  assertBareAction(obstacle.actions[0]);
  assert.deepEqual(D.suggestedCategories(s), ["SSM.Preset.infiltration.Category.opportunity", "SSM.Preset.infiltration.Category.complication"]);
});

test("an infiltration's new subjects are obstacles with a blank category, later ones hidden", () => {
  const s = presetSystem("infiltration");
  const obstacle = D.addRow(s, "subjects");
  assert.deepEqual([obstacle.revealed, obstacle.counters.length, obstacle.category], [false, 1, ""]);
  assertBareAction(obstacle.actions[0]);
  assert.equal(D.addRow(system(), "subjects").category, "", "every preset's new subject has a category field");
  assert.equal(D.newChallengeSystem("infiltration").gmNotes, ["Obstacles", "Awareness", "Edge", "Complication", "Opportunity"].map((key) => `<p>SSM.Preset.infiltration.GmNotes.${key}</p>`).join(""), "the GM notes say how to use the module for an infiltration");
});

test("subject categories suggest the preset's, then those in use, apart from modifier categories", () => {
  const s = presetSystem("infiltration");
  const keys = ["obstacle", "complication", "opportunity"].map((key) => `SSM.Preset.infiltration.SubjectCategory.${key}`);
  assert.deepEqual(D.subjectCategoryOrder(s).map((row) => row.label), keys);
  D.addRow(s, "subjects", { category: "Guard Post" });
  D.addRow(s, "subjects", { category: " guard post " });
  D.addRow(s, "subjects.0.modifiers", { category: "Leverage" });
  assert.deepEqual(D.subjectCategoryOrder(s).map((row) => row.label), [...keys, "Guard Post"], "repeats count once; modifier categories stay out");
  assert.ok(!D.categoryOrder(s).some((row) => row.label === "Guard Post"), "subject categories stay out of modifier categories");
  assert.deepEqual(D.subjectCategoryOrder(system()).map((row) => row.label), [], "a preset with no subject categories suggests none");
});

test("subjects group by category, blank first, and the stored order follows (spec 14.4)", () => {
  const s = presetSystem("infiltration");
  const [first] = s.subjects;
  const opp = D.addRow(s, "subjects", { category: "SSM.Preset.infiltration.SubjectCategory.opportunity" });
  const post = D.addRow(s, "subjects", { category: "Guard Post" });
  const obstacle = D.addRow(s, "subjects", { category: "SSM.Preset.infiltration.SubjectCategory.obstacle" });
  const blank = D.addRow(s, "subjects");
  assert.deepEqual(D.subjectGroups(s).map((group) => [group.label, group.items.map((row) => row.id)]), [
    ["", [first.id, blank.id]],
    ["SSM.Preset.infiltration.SubjectCategory.obstacle", [obstacle.id]],
    ["SSM.Preset.infiltration.SubjectCategory.opportunity", [opp.id]],
    ["Guard Post", [post.id]],
  ], "blank first, then the preset's order, then others; empty categories left out");
  D.sortSubjects(s);
  assert.deepEqual(s.subjects.map((row) => row.id), [first.id, blank.id, obstacle.id, opp.id, post.id]);
  const views = s.subjects.map((row) => row.id);
  assert.deepEqual(D.subjectGroups(s, views)[0].items, [first.id, blank.id], "groups any list in step with the subjects");
});

test("a category's collapse-all collapses when any subject is open, and expands when all are collapsed (spec 14.8)", () => {
  const collapsed = new Set(["a", "b"]);
  const is = (id) => collapsed.has(id);
  assert.equal(D.collapseAllAction([], is), null, "no subjects, no toggle");
  assert.equal(D.collapseAllAction(["a", "b"], is), "expand");
  assert.equal(D.collapseAllAction(["a", "b", "c"], is), "collapse");
  assert.equal(D.collapseAllAction(["c"], is), "collapse");
});

test("a subject whose category changes moves to the end of its new group", () => {
  const s = presetSystem("infiltration");
  const obstacle = "SSM.Preset.infiltration.SubjectCategory.obstacle";
  const a = D.addRow(s, "subjects", { category: obstacle });
  D.sortSubjects(s);
  const [first] = s.subjects;
  D.applyForm(s, { subjects: { 0: { category: ` ${obstacle.toLowerCase()} ` } } });
  assert.deepEqual(s.subjects.map((row) => row.id), [a.id, first.id], "joins the end of the group, matched by case and spaces");
  D.applyForm(s, { subjects: { 0: { name: "Gate" } } });
  assert.deepEqual(s.subjects.map((row) => row.id), [a.id, first.id], "other edits keep the order");
});

test("a subject moves only within its category", () => {
  const s = system();
  const [a] = s.subjects;
  const b = D.addRow(s, "subjects", { category: "Hard" });
  const c = D.addRow(s, "subjects", { category: "Hard" });
  const d = D.addRow(s, "subjects", { category: "Hard" });
  assert.equal(D.moveSubject(s, a.id, 1), false, "can't move into the next category");
  assert.equal(D.moveSubject(s, b.id, 0), false, "can't move into the blank category");
  D.moveSubject(s, b.id, 3);
  assert.deepEqual(s.subjects.map((row) => row.id), [a.id, c.id, d.id, b.id], "to the end of its own group");
  D.moveSubject(s, b.id, 1);
  assert.deepEqual(s.subjects.map((row) => row.id), [a.id, b.id, c.id, d.id], "to the start of its own group");
});

test("a modifier moves beside another in its category, never into another category or list, and the categories keep their order", () => {
  const s = system();
  const [a, x, b, c] = ["Hard", "Easy", "Hard", "Hard"].map((category) => D.addRow(s, "modifiers", { category }));
  const ids = () => s.modifiers.map((row) => row.id);
  const order = () => D.categoryOrder(s).map((category) => category.key);
  const before = order();
  assert.equal(D.moveModifier(s, "", a.id, x.id), false, "another category");
  assert.equal(D.moveModifier(s, "", a.id, a.id, true), false, "onto itself");
  assert.equal(D.moveModifier(s, "", a.id, "nobody"), false);
  D.moveModifier(s, "", c.id, a.id);
  assert.deepEqual(ids(), [c.id, a.id, b.id, x.id], "up to the start of its group, the list put in grouped order");
  assert.equal(D.moveModifier(s, "", a.id, b.id), false, "already just before it");
  D.moveModifier(s, "", c.id, b.id, true);
  assert.deepEqual(ids(), [a.id, b.id, c.id, x.id], "down to the end of its group");
  assert.deepEqual(order(), before, "Hard, used first, stays before Easy");
  const own = D.addRow(s, "subjects.0.modifiers", { category: "Hard" });
  assert.equal(D.moveModifier(s, sub(s).id, own.id, a.id), false, "not into the challenge's list");
  assert.equal(D.moveModifier(s, "", a.id, own.id), false, "not into a subject's list");
});

test("a counter moves beside another in its own list only", () => {
  const s = system();
  const [a, b, c] = [1, 2, 3].map(() => D.addRow(s, "counters"));
  const ids = () => s.counters.map((row) => row.id);
  assert.equal(D.moveCounter(s, "", b.id, a.id, true), false, "already just after it");
  D.moveCounter(s, "", a.id, c.id, true);
  assert.deepEqual(ids(), [b.id, c.id, a.id]);
  D.moveCounter(s, "", a.id, b.id);
  assert.deepEqual(ids(), [a.id, b.id, c.id]);
  const subject = sub(s);
  const [p, q] = [1, 2].map(() => D.addRow(s, "subjects.0.counters"));
  const own = () => subject.counters.map((row) => row.id);
  const before = own();
  assert.equal(D.moveCounter(s, subject.id, p.id, a.id), false, "not into the challenge's list");
  assert.equal(D.moveCounter(s, "", a.id, p.id), false, "not into a subject's list");
  D.moveCounter(s, subject.id, q.id, p.id);
  assert.deepEqual(own(), [...before.slice(0, -2), q.id, p.id], "within the subject's list");
});

test("Awareness Points rise each round and by hand, and their tiers raise every DC by 1, then 2 in total", () => {
  const s = presetSystem("infiltration");
  const [ap] = s.counters;
  const obstacle = s.subjects[0];
  obstacle.actions[0].checks.push({ ...D.newCheck(), revealed: false, skill: "stealth", dc: 20 });
  Run.startRun(s);
  ap.value = 4;
  Run.advanceRound(s);
  assert.equal(ap.value, 5);
  assert.equal(ap.thresholds[0].reached, true);
  assert.equal(Run.currentDc(s, obstacle, obstacle.actions[0].checks[0]), 21);
  Run.changeCounter(s, ap.id, 10);
  assert.equal(ap.value, 15);
  assert.equal(Run.currentDc(s, obstacle, obstacle.actions[0].checks[0]), 22);
});

test("the Preparation preset: one revealed subject with GM Core's six activities, secret where the rules say", () => {
  const s = presetSystem("preparation");
  const [ep, ap] = s.counters;
  assert.deepEqual([ep.perPc, ep.revealed, ap.perPc, ap.revealed], [true, true, false, false]);
  const [prep] = s.subjects;
  assert.deepEqual([prep.revealed, prep.counters, s.subjects.length], [true, [], 1]);
  const named = (key) => prep.actions.find((action) => action.name === `SSM.Preset.preparation.${key}.Name`);
  assert.deepEqual(prep.actions.map((action) => [action.name.split(".")[3], action.secret, action.checks.map((row) => row.skill).join(" ")]), [
    ["BribeContact", true, "deception diplomacy"],
    ["ForgeDocuments", true, "society"],
    ["GainContact", false, "diplomacy society"],
    ["Gossip", true, "diplomacy"],
    ["ScoutLocation", true, "perception society stealth"],
    ["SecureDisguises", false, "crafting deception performance society"],
  ]);
  assert.ok(prep.actions.every((action) => action.checks.every((row) => row.revealed)));
  prep.actions.forEach(assertBareAction);
  assert.equal(named("ForgeDocuments").description, "SSM.Preset.preparation.ForgeDocuments.Description");
});

test("the Preparation preset's GM notes say how to use the module, and every key is in the language file", () => {
  const keys = ["Intro", "Points", "Notes", "Handover"].map((key) => `GmNotes.${key}`);
  assert.equal(D.newChallengeSystem("preparation").gmNotes, keys.map((key) => `<p>SSM.Preset.preparation.${key}</p>`).join(""));
  const prep = EN.SSM.Preset.preparation;
  for (const key of keys) assert.ok(key.split(".").reduce((node, part) => node?.[part], prep), key);
});

test("a per-PC counter's GM note: set, cleared when empty, only on a per-PC counter, and put back by Reset", () => {
  const s = presetSystem("infiltration");
  const [ap, ep] = s.counters;
  assert.equal(D.setCounterNote(s, ap.id, "a1", "x"), false, "a shared counter has no PC notes");
  D.setCounterNote(s, ep.id, "a1", "  1 dud (forged papers) ");
  assert.deepEqual(ep.noteBy, { a1: "1 dud (forged papers)" });
  assert.equal(D.setCounterNote(s, ep.id, "a1", "1 dud (forged papers)"), false, "no change");
  Run.startRun(s);
  D.setCounterNote(s, ep.id, "a2", "paperwork only");
  D.setCounterNote(s, ep.id, "a1", "");
  assert.deepEqual(ep.noteBy, { a2: "paperwork only" });
  Run.resetRun(s);
  assert.deepEqual(ep.noteBy, { a1: "1 dud (forged papers)" });
  assert.ok(!JSON.stringify(viewOf(s, PARTY)).includes("dud"), "the panel never sees a note");
});

/* Chase (items/chase-subsystem.md, spec 14.11): data only */

test("the Chase preset: Party and Quarry counters on tracks, one obstacle at a time, and obstacles whose Chase Points run from 0 to 3", () => {
  const s = presetSystem("chase");
  assert.deepEqual([s.pointsName, s.subjectLabel, s.rounds.max, s.multipleSubjects], ["SSM.Preset.chase.Points", "SSM.Preset.chase.Subject", null, false]);
  assert.deepEqual(s.counters.map((row) => [row.name, row.value, row.perRound, row.min, row.max, row.display, row.revealed]), [
    ["SSM.Preset.chase.Party", 1, 0, 0, 6, "track", true],
    ["SSM.Preset.chase.Quarry", 2, 1, 0, 6, "track", true],
  ]);
  assert.equal(s.chase, undefined, "no chase-only data");
  const [first] = s.subjects;
  assert.equal(first.revealed, true);
  assert.deepEqual(countersOf(first), [["SSM.Preset.chase.Points", 0, 0, 3, true]]);
  assertBareAction(first.actions[0]);
  assert.equal(D.addRow(s, "subjects").revealed, false, "later obstacles start hidden");
  assert.equal(D.newChallengeSystem("chase").gmNotes, ["Obstacles", "Tracks", "Running", "Variants"].map((key) => `<p>SSM.Preset.chase.GmNotes.${key}</p>`).join(""), "the GM notes say how to set up and run a chase with the module");
  assert.equal(D.newChallengeSystem("influence").multipleSubjects, undefined, "other presets keep the model's default, on");
  Run.startRun(s);
  assert.equal(Run.changeCounter(s, first.counters[0].id, -1), false);
  assert.equal(first.counters[0].value, 0);
});

/* Reputation (items/reputation-subsystem.md): data only */

test("the Reputation preset: revealed factions with no actions, each with a both-ways counter from −50 to +50 and GM Core's tiers shown in full", () => {
  const s = presetSystem("reputation");
  assert.deepEqual([s.pointsName, s.subjectLabel, s.rounds.max, s.counters, s.multipleSubjects], ["SSM.Preset.reputation.Points", "SSM.Preset.reputation.Subject", 0, [], undefined]);
  assert.deepEqual(D.suggestedCategories(s), []);
  const [first] = s.subjects;
  const second = D.addRow(s, "subjects");
  for (const faction of [first, second]) {
    assert.equal(faction.revealed, true, "every faction starts revealed");
    assert.deepEqual(faction.actions, [], "nothing is rolled");
    assert.deepEqual(countersOf(faction), [["SSM.Preset.reputation.Points", 0, -50, 50, true]]);
  }
  const counter = first.counters[0];
  assert.equal(counter.direction, "both");
  assert.deepEqual(counter.thresholds.map((row) => [row.points, row.reveal, row.dc, row.name, V.withoutSecrets(row.description)]), [30, 15, 5, -5, -15, -30].map((points) => [points, "full", 0, `SSM.Preset.reputation.Threshold.${points}.Name`, ""]), "the GM guidance is a secret block");
  assert.ok(counter.thresholds.every((row, i) => row.description.includes(`SSM.Preset.reputation.Threshold.${[30, 15, 5, -5, -15, -30][i]}.Description`)));
  assert.equal(D.newChallengeSystem("reputation").gmNotes, ["Factions", "Changing", "Running"].map((key) => `<p>SSM.Preset.reputation.GmNotes.${key}</p>`).join(""));
  const rep = EN.SSM.Preset.reputation;
  for (const points of [30, 15, 5, -5, -15, -30]) assert.ok(rep.Threshold[points].Name && rep.Threshold[points].Description, `tier ${points} has its texts`);
  for (const key of ["Factions", "Changing", "Running"]) assert.ok(rep.GmNotes[key], `GM note ${key}`);

  Run.startRun(s);
  const reached = () => counter.thresholds.filter((row) => row.reached).map((row) => row.points);
  for (let i = 0; i < 16; i++) Run.changeCounter(s, counter.id, 1);
  assert.deepEqual(reached(), [15, 5], "Admired: the highest ticked tier");
  Run.changeCounter(s, counter.id, -5);
  assert.deepEqual(reached(), [5], "back down to Liked");
  for (let i = 0; i < 80; i++) Run.changeCounter(s, counter.id, -1);
  assert.deepEqual([counter.value, reached()], [-50, [-5, -15, -30]], "held at −50, Hunted");
  const view = viewOf(s).subjects[0].counters[0];
  // Highest first, so the list reads from Revered down; the points carry a sign so they line up.
  assert.deepEqual([view.range, view.thresholds.map((row) => [row.points, row.label, row.reached, row.textHidden])], [{ lo: -50, hi: 50 }, [[30, "+30", false, false], [15, "+15", false, false], [5, "+5", false, false], [-5, "−5", true, false], [-15, "−15", true, false], [-30, "−30", true, false]]]);
});

/* Research (items/research-subsystem.md): data only */

test("the Research preset: a Research Points pool, Days at 1 going up each round, and revealed library areas with a Research action and RP Gathered up to 5", () => {
  const s = presetSystem("research");
  assert.deepEqual([s.pointsName, s.subjectLabel, s.rounds.max, s.multipleSubjects], ["SSM.Preset.research.Points", "SSM.Preset.research.Subject", null, undefined]);
  assert.deepEqual(D.suggestedCategories(s), []);
  assert.deepEqual(s.counters.map((row) => [row.name, row.value, row.perRound, row.min, row.max, row.thresholds.length, row.revealed]), [
    ["SSM.Preset.research.Points", 0, 0, 0, null, 0, true],
    ["SSM.Preset.research.Days", 1, 1, 0, null, 0, true],
  ]);
  const [first] = s.subjects;
  const second = D.addRow(s, "subjects");
  for (const area of [first, second]) {
    assert.equal(area.revealed, true, "every area starts revealed");
    assert.deepEqual(area.actions.map((action) => [action.name, action.secret, action.checks]), [["SSM.Preset.research.Research", false, []]]);
    assert.deepEqual(countersOf(area), [["SSM.Preset.research.Gathered", 0, 0, 5, true]]);
    assert.equal(area.counters[0].display, "bar");
  }
  assert.equal(D.newChallengeSystem("research").gmNotes, ["Library", "Rolling", "Thresholds", "Time"].map((key) => `<p>SSM.Preset.research.GmNotes.${key}</p>`).join(""));
  const res = EN.SSM.Preset.research;
  for (const key of ["Label", "Points", "Subject", "Subjects", "NoSubjects", "Research", "Gathered", "Days"]) assert.ok(res[key], key);
  for (const key of ["Library", "Rolling", "Thresholds", "Time"]) assert.ok(res.GmNotes[key], `GM note ${key}`);

  // A timed event on day 3, added by the GM: hidden from players until revealed.
  const [rp, days] = s.counters;
  const event = D.addRow(s, "counters.1.thresholds", { points: 3 });
  assert.equal(event.reveal, "hidden");
  Run.startRun(s);
  Run.advanceRound(s);
  assert.equal(days.value, 2);
  Run.advanceRound(s);
  assert.deepEqual([days.value, event.reached], [3, true], "the third day's event");
  assert.equal(rp.value, 0, "rounds don't add Research Points");
  assert.equal(viewOf(s).counters[1].thresholds.length, 0, "players get no hidden event");
  assert.equal(days.display, "number", "no bar whose end gives the event away");
  const gathered = first.counters[0];
  for (let i = 0; i < 7; i++) Run.changeCounter(s, gathered.id, 1);
  assert.equal(gathered.value, 5, "an area gives no more than its Maximum RP");
});

test("Start marks the thresholds a counter's starting value already meets, with their notices; Reset clears them", () => {
  const s = presetSystem("research");
  const [rp, days] = s.counters;
  const dayOne = D.addRow(s, "counters.1.thresholds", { points: 1, name: "Agents confront the party" });
  const dayThree = D.addRow(s, "counters.1.thresholds", { points: 3 });
  const rpFive = D.addRow(s, "counters.0.thresholds", { points: 5 });
  const area = s.subjects[0].counters[0];
  area.value = 2;
  const areaTwo = D.addRow(s, "subjects.0.counters.0.thresholds", { points: 2 });
  const result = Run.startRun(s);
  assert.deepEqual(result.triggers, [
    { counter: "SSM.Preset.research.Days", value: 1, note: "Agents confront the party" },
    { counter: "SSM.Preset.research.Gathered", value: 2, note: "" },
  ]);
  assert.deepEqual([dayOne.reached, dayThree.reached, rpFive.reached, areaTwo.reached], [true, false, false, true]);
  assert.equal(Run.startRun(s), false, "already running");
  Run.advanceRound(s);
  Run.advanceRound(s);
  assert.equal(dayThree.reached, true);
  Run.resetRun(s);
  assert.deepEqual([dayOne.reached, dayThree.reached, areaTwo.reached, days.value, rp.value], [false, false, false, 1, 0], "back to before Start");
});

/* Allow multiple subjects (spec 14.12) */

test("without Allow multiple subjects, revealing a subject hides the others, from the eye button or the Edit tab; hiding reveals nothing", () => {
  const s = presetSystem("chase");
  D.addRow(s, "subjects");
  D.addRow(s, "subjects");
  const [a, b] = s.subjects;
  Run.toggleReveal(s, b.id);
  assert.deepEqual(s.subjects.map((row) => row.revealed), [false, true, false]);
  Run.toggleReveal(s, b.id);
  assert.deepEqual(s.subjects.map((row) => row.revealed), [false, false, false]);
  D.applyForm(s, { subjects: { 2: { revealed: true } } });
  assert.deepEqual(s.subjects.map((row) => row.revealed), [false, false, true]);
  D.applyForm(s, { subjects: { 0: { name: "Market" } } });
  assert.deepEqual([s.subjects[0].name, s.subjects[2].revealed], ["Market", true], "an edit that reveals nothing hides nothing");
  Run.toggleReveal(s, s.counters[0].id);
  assert.equal(s.subjects[2].revealed, true, "a counter's eye leaves subjects alone");
  D.applyForm(s, { multipleSubjects: true });
  Run.toggleReveal(s, a.id);
  assert.deepEqual(s.subjects.map((row) => row.revealed), [true, false, true]);
  assert.deepEqual(viewOf(s).subjects.map((row) => [row.name, row.index]), [["Market", 0], ["", 2]], "the panel keeps each subject's place for its stand-in name");
});

/* Counter displays (spec 14.12) */

test("a counter's display: Auto keeps today's rule; Steps and Track need a maximum and a fitting range, else a bar", () => {
  const counter = (extra) => ({ ...D.newCounter(), ...extra });
  const show = (extra) => V.counterDisplay(counter(extra));
  assert.deepEqual([show({}), show({ thresholds: [D.newThreshold()] }), show({ direction: "both" }), show({ perPc: true, display: "track" })], ["number", "bar", "bar", "perPc"]);
  assert.deepEqual([show({ display: "number", thresholds: [D.newThreshold()] }), show({ display: "bar" })], ["number", "bar"]);
  assert.deepEqual([show({ display: "steps" }), show({ display: "steps", max: 5 }), show({ display: "steps", max: 5, direction: "both" })], ["bar", "steps", "bar"]);
  assert.deepEqual([show({ display: "track" }), show({ display: "track", max: 5, direction: "both" })], ["bar", "track"]);
});

test("Steps fill up to the value, a Track marks one slot; revealed thresholds mark their slot; too many slots fall back to a bar", () => {
  const s = presetSystem("influence");
  s.counters = [{ ...D.newCounter(), name: "Alarm", value: 2, max: 4, display: "steps", revealed: true, thresholds: [{ ...D.newThreshold(), points: 3, reveal: "points" }, { ...D.newThreshold(), points: 4, reveal: "hidden" }] }];
  let [row] = viewOf(s).counters;
  assert.equal(row.display, "steps");
  assert.deepEqual(row.slots.map((slot) => [slot.number, slot.filled, slot.threshold]), [[1, true, false], [2, true, false], [3, false, true], [4, false, false]], "a hidden threshold leaves no mark");
  s.counters[0].display = "track";
  [row] = viewOf(s).counters;
  assert.deepEqual(row.slots.map((slot) => [slot.number, slot.filled]), [[0, false], [1, false], [2, true], [3, false], [4, false]]);
  s.counters[0].value = 9;
  assert.equal(viewOf(s).counters[0].slots.at(-1).filled, true, "a value past the end sits on the last slot");
  Object.assign(s.counters[0], { direction: "both", min: null, max: 2, value: -1 });
  assert.deepEqual(viewOf(s).counters[0].slots.map((slot) => [slot.number, slot.filled]), [[-2, false], [-1, true], [0, false], [1, false], [2, false]]);
  Object.assign(s.counters[0], { direction: "up", min: 0, max: 100 });
  assert.deepEqual([viewOf(s).counters[0].display, viewOf(s).counters[0].slots], ["bar", null]);
});

test("with its thresholds list off, a counter keeps its marks but sends no list or threshold text to players", () => {
  const s = presetSystem("influence");
  assert.equal(D.newCounter().showThresholdList, true, "the list is on by default");
  assert.ok(D.COUNTER_FIELDS.includes("showThresholdList"), "the counter window saves it");
  s.counters = [{ ...D.newCounter(), name: "Alarm", value: 2, max: 4, display: "steps", revealed: true, showThresholdList: false, thresholds: [
    { ...D.newThreshold(), points: 3, reveal: "full", name: "guards come", reached: false },
    { ...D.newThreshold(), points: 1, reveal: "points", reached: true },
    { ...D.newThreshold(), points: 4, reveal: "hidden", name: "lockdown" },
  ] }];
  let [row] = viewOf(s).counters;
  assert.deepEqual([row.thresholds, row.marks], [[], [{ points: 1, reached: true }, { points: 3, reached: false }]]);
  assert.deepEqual(row.slots.filter((slot) => slot.threshold).map((slot) => [slot.number, slot.reached]), [[1, true], [3, false]], "the marks still show on Steps");
  assert.doesNotMatch(JSON.stringify(viewOf(s)), /guards come|lockdown/);
  s.counters[0].showThresholdList = true;
  assert.deepEqual(viewOf(s).counters[0].thresholds.map((t) => [t.points, t.name]), [[1, ""], [3, "guards come"]], "on, the list is as before");
  delete s.counters[0].showThresholdList;
  assert.equal(viewOf(s).counters[0].thresholds.length, 2, "a counter saved before the setting shows its list");
});

test("with its display marks off, a counter keeps its list but marks nothing on its display", () => {
  const s = presetSystem("influence");
  assert.equal(D.newCounter().showThresholdMarks, true, "marks are on by default");
  assert.ok(D.COUNTER_FIELDS.includes("showThresholdMarks"), "the counter window saves it");
  s.counters = [{ ...D.newCounter(), name: "Alarm", value: 2, max: 4, display: "steps", revealed: true, showThresholdMarks: false, thresholds: [{ ...D.newThreshold(), points: 3, reveal: "full", name: "guards come" }] }];
  let [row] = viewOf(s).counters;
  assert.deepEqual([row.marks, row.slots.some((slot) => slot.threshold), row.thresholds.map((t) => t.name)], [[], false, ["guards come"]]);
  s.counters[0].showThresholdList = false;
  [row] = viewOf(s).counters;
  assert.deepEqual([row.marks, row.thresholds], [[], []], "both off: nothing of the threshold reaches players");
  assert.doesNotMatch(JSON.stringify(viewOf(s)), /guards come/);
  delete s.counters[0].showThresholdMarks;
  assert.equal(viewOf(s).counters[0].marks.length, 1, "a counter saved before the setting keeps its marks");
});

test("a bar's threshold ticks sit on the fill's scale, on plain and both-ways bars", () => {
  const marks = [{ points: 5, reached: true }, { points: 10, reached: false }];
  assert.deepEqual(V.barTicks(marks, 2, { scale: 10, range: null }).map((t) => [t.left, t.reached]), [[50, true], [100, false]]);
  assert.deepEqual(V.barTicks(marks, 20, { scale: 10, range: null }).map((t) => t.left), [25, 50], "a value past the scale widens it, as the fill does");
  assert.deepEqual(V.barTicks(marks, 0, { scale: 0, range: null }).map((t) => t.left), [50, 100], "no scale falls back to 10");
  assert.deepEqual(V.barTicks([{ points: -5, reached: false }, { points: 5, reached: true }, { points: 90, reached: false }], 0, { range: { lo: -10, hi: 10 } }).map((t) => t.left), [25, 75, 100], "both ways: on the range, held at the ends");
  const s = reputation();
  const [row] = viewOf(s).subjects[0].counters;
  assert.deepEqual(V.barTicks(row.marks, row.value, row).map((t) => t.left), row.marks.map((m) => V.bothWaysBar(m.points, row.range).left + (m.points > 0 ? V.bothWaysBar(m.points, row.range).width : 0)), "a tick lands where a fill to its points would end");
});

test("the Edit tab sets a counter's style and its visibility separately, and the eye button shows the style picked", () => {
  const s = presetSystem("chase");
  const party = () => s.counters[0];
  D.applyForm(s, { counters: { 0: { revealed: false } } });
  assert.deepEqual([party().revealed, party().display], [false, "track"], "hiding keeps the style");
  D.applyForm(s, { counters: { 0: { display: "steps", revealed: false } } });
  assert.deepEqual([party().revealed, party().display], [false, "steps"], "a style can be picked while hidden");
  Run.toggleReveal(s, party().id);
  assert.deepEqual([party().revealed, party().display], [true, "steps"], "the eye button shows the style picked in Edit");
  D.applyForm(s, { counters: { 0: { display: "bar", revealed: true } } });
  assert.deepEqual([party().revealed, party().display], [true, "bar"]);
  assert.ok(!D.COUNTER_DISPLAYS.includes("hidden"), "Hidden is not a style");
});
