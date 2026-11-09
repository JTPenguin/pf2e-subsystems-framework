/**
 * Checks the rules that need no Foundry: the directory rules and the Influence data edits. Uses Node's test runner:
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
const D = await load("subsystems/influence/data");

const MODULE = "pf2e-subsystem-manager";
const challenge = (name, folder) => ({ name, folder, pages: [{ type: `${MODULE}.influence` }] });
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

test("search opens only ancestors of the tab's kind", () => {
  const outer = folder("c0", true);
  const inner = folder("c1", true, outer);
  assert.deepEqual(R.ancestorsToShow(challenge("x", inner), true), ["c1", "c0"]);
  assert.deepEqual(R.ancestorsToShow(challenge("stray", normal), true), []);
  assert.deepEqual(R.ancestorsToShow(challenge("root"), true), []);
});

const system = () => {
  const s = { premise: "<p>Banquet</p>", gmNotes: "", rounds: { current: 0, max: 6, length: "" }, npcs: [D.newNpc()], counters: [], run: { status: "inactive", acted: [], log: [] } };
  return s;
};

test("addRow picks the right row for each list", () => {
  const s = system();
  assert.ok("showDC" in D.addRow(s, "npcs.0.influence"));
  assert.ok("decoy" in D.addRow(s, "npcs.0.discovery"));
  assert.ok("reached" in D.addRow(s, "npcs.0.thresholds"));
  const m = D.addRow(s, "npcs.0.modifiers");
  assert.equal(m.effects.length, 1, "a new modifier starts with one effect");
  assert.equal(D.addRow(s, "npcs.0.modifiers.0.effects").type, "note");
  assert.deepEqual(D.addRow(s, "counters").triggers, []);
  assert.ok("gmNote" in D.addRow(s, "counters.0.triggers"));
  assert.throws(() => D.addRow(s, "rounds"));
});

test("new rows have unique ids", () => {
  const ids = [D.newNpc().id, D.newEffect().id, D.newCounter().id];
  assert.equal(new Set(ids).size, 3);
});

test("the last NPC and the last effect can't be removed", () => {
  const s = system();
  assert.equal(D.removeRow(s, "npcs.0"), false);
  D.addRow(s, "npcs.0.modifiers");
  assert.equal(D.removeRow(s, "npcs.0.modifiers.0.effects.0"), false);
  D.addRow(s, "npcs");
  assert.equal(D.removeRow(s, "npcs.1"), true);
  assert.equal(s.npcs.length, 1);
});

test("removing a skill or counter clears the links to it", () => {
  const s = system();
  const skill = D.addRow(s, "npcs.0.influence");
  const other = D.addRow(s, "npcs.0.discovery");
  const counter = D.addRow(s, "counters");
  const m = D.addRow(s, "npcs.0.modifiers");
  m.effects[0].skills = [skill.id, other.id];
  m.effects[0].counterId = counter.id;
  D.removeRow(s, "npcs.0.influence.0");
  assert.deepEqual(m.effects[0].skills, [other.id]);
  D.removeRow(s, "counters.0");
  assert.equal(m.effects[0].counterId, "");
});

test("mergeForm: numbered form rows merge into lists, and absent fields survive", () => {
  const s = system();
  const m = D.addRow(s, "npcs.0.modifiers");
  m.effects[0].type = "dc";
  m.effects[0].note = "kept";
  m.effects[0].skills = ["a"];
  const merged = D.mergeForm(s, { npcs: { 0: { name: "Vance", traits: ["human"], modifiers: { 0: { name: "Art", effects: { 0: { amount: -2, skills: ["b", "c"] } } } } } } });
  assert.equal(merged.npcs[0].name, "Vance");
  assert.deepEqual(merged.npcs[0].traits, ["human"]);
  assert.equal(merged.npcs[0].modifiers[0].effects[0].amount, -2);
  assert.equal(merged.npcs[0].modifiers[0].effects[0].note, "kept");
  assert.deepEqual(merged.npcs[0].modifiers[0].effects[0].skills, ["b", "c"]);
  assert.equal(Array.isArray(merged.npcs), true);
});

test("mergeForm: blank numbers keep their value, except counter limits", () => {
  const s = system();
  D.addRow(s, "npcs.0.influence");
  const c = D.addRow(s, "counters");
  c.min = 1;
  c.max = 5;
  const merged = D.mergeForm(s, { rounds: { max: null }, npcs: { 0: { influence: { 0: { dc: null } } } }, counters: { 0: { min: null, value: null } } });
  assert.equal(merged.rounds.max, 6);
  assert.equal(merged.npcs[0].influence[0].dc, 15);
  assert.equal(merged.counters[0].min, null);
  assert.equal(merged.counters[0].max, 5);
  assert.equal(merged.counters[0].value, 0);
});

test("clampCounters limits values and reports impossible limits", () => {
  const s = system();
  Object.assign(D.addRow(s, "counters"), { value: 9, max: 5 });
  Object.assign(D.addRow(s, "counters"), { value: -3, min: 0 });
  Object.assign(D.addRow(s, "counters"), { value: 4, min: 8, max: 2 });
  const invalid = D.clampCounters(s);
  assert.deepEqual(s.counters.map((c) => c.value), [5, 0, 4]);
  assert.equal(invalid.length, 1);
});

test("only this module's page types count as challenge types", () => {
  assert.equal(R.isChallengeType(`${MODULE}.influence`), true);
  assert.equal(R.isChallengeType("text"), false);
  assert.equal(R.isChallengeType(undefined), false);
});

test("pickFields keeps named fields at their nested paths", () => {
  const form = { premise: "p", gmNotes: "", rounds: { max: 3 }, counters: { 0: { value: 2, name: "x" } } };
  assert.deepEqual(D.pickFields(form, ["premise", "gmNotes", "counters.0.value", "missing.field"]), { premise: "p", gmNotes: "", counters: { 0: { value: 2 } } });
});

test("searchText covers the challenge's text", () => {
  const s = system();
  s.npcs[0].name = "Vance";
  Object.assign(D.addRow(s, "npcs.0.thresholds"), { gmText: "secret ending" });
  const text = D.searchText(s);
  for (const word of ["Banquet", "Vance", "secret ending"]) assert.ok(text.includes(word), word);
});
