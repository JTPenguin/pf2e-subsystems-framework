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
const Run = await load("subsystems/influence/run");
const O = await load("roll-option");

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

const runSystem = () => {
  const s = system();
  s.run = { status: "inactive", acted: [], log: [], baseline: null, roundHistory: [], pending: [], appliedRolls: [] };
  s.npcs[0].points = 1;
  s.npcs[0].influence.push(D.newInfluence());
  s.npcs[0].discovery.push(D.newDiscovery());
  s.npcs[0].thresholds.push({ ...D.newThreshold(), points: 2 }, { ...D.newThreshold(), points: 5 });
  s.counters.push({ ...D.newCounter(), value: 3 });
  return s;
};
const rollOf = (s, over = {}) => ({ rollId: "r1", kind: "influence", npcId: s.npcs[0].id, entryId: s.npcs[0].influence[0].id, messageId: "m1", actorId: "a1", actorName: "Ezren", total: 18, outcome: "success", isReroll: false, ...over });

test("suggested points follow the spec, and an unknown outcome suggests nothing", () => {
  assert.deepEqual(["criticalSuccess", "success", "failure", "criticalFailure"].map(Run.suggestedPoints), [2, 1, 0, -1]);
  assert.equal(Run.suggestedPoints(""), 0);
});

test("roll option round trip, and only our options parse", () => {
  const data = { kind: "discover", challengeId: "Cc1", npcId: "Nn1", entryId: "Ee1", rollId: "Rr1" };
  assert.deepEqual(O.parseRollOption(O.buildRollOption(data)), data);
  assert.equal(O.parseRollOption("ssm:skill:diplomacy"), null);
  assert.equal(O.parseRollOption("ssm:roll:influence:a:b"), null);
  assert.equal(O.findRollOption(["check", O.buildRollOption(data)]), O.buildRollOption(data));
  assert.equal(O.findRollOption(undefined), null);
});

test("each click of one chat link gets its own roll id; a direct roll is left alone", () => {
  const link = O.buildRollOption({ kind: "influence", challengeId: "c", npcId: "n", entryId: "e", rollId: O.LINK_ROLL_ID });
  const first = O.stampLinkRoll(["x", link], "one");
  const second = O.stampLinkRoll(["x", link], "two");
  assert.equal(O.parseRollOption(first[1]).rollId, "one");
  assert.equal(O.parseRollOption(second[1]).rollId, "two");
  assert.equal(first[0], "x");
  assert.equal(O.stampLinkRoll(first, "three"), null);
});

test("a Lore slug has one -lore ending", () => {
  const sluggify = (t) => t.toLowerCase().replace(/\s+/g, "-");
  assert.equal(Run.loreSlug("Warfare", sluggify), "warfare-lore");
  assert.equal(Run.loreSlug("Warfare Lore", sluggify), "warfare-lore");
});

test("rolls need a running challenge and a known skill", () => {
  const s = runSystem();
  assert.equal(Run.receiveRoll(s, rollOf(s)), false);
  Run.startRun(s);
  assert.equal(Run.receiveRoll(s, rollOf(s, { entryId: "gone" })), false);
  assert.equal(Run.receiveRoll(s, rollOf(s, { npcId: "gone" })), false);
  assert.equal(s.run.pending.length, 0);
});

test("a new roll is pending and marks the PC acted once", () => {
  const s = runSystem();
  Run.startRun(s);
  assert.equal(Run.receiveRoll(s, rollOf(s)), "added");
  assert.equal(Run.receiveRoll(s, rollOf(s, { rollId: "r2" })), "added");
  assert.equal(s.run.pending.length, 2);
  assert.deepEqual(s.run.acted, ["a1"]);
});

test("a reroll replaces only its own pending item, in place", () => {
  const s = runSystem();
  Run.startRun(s);
  Run.receiveRoll(s, rollOf(s));
  Run.receiveRoll(s, rollOf(s, { rollId: "r2", actorId: "a2" }));
  assert.equal(Run.receiveRoll(s, rollOf(s, { isReroll: true, messageId: "m9", total: 25, outcome: "criticalSuccess" })), "replaced");
  assert.equal(s.run.pending.length, 2);
  assert.deepEqual([s.run.pending[0].messageId, s.run.pending[0].outcome, s.run.pending[1].rollId], ["m9", "criticalSuccess", "r2"]);
});

test("a reroll after Apply changes nothing but the log", () => {
  const s = runSystem();
  Run.startRun(s);
  Run.receiveRoll(s, rollOf(s));
  Run.applyPending(s, s.run.pending[0].id);
  const points = s.npcs[0].points;
  const logs = s.run.log.length;
  assert.equal(Run.receiveRoll(s, rollOf(s, { isReroll: true, outcome: "criticalSuccess" })), "afterApply");
  assert.equal(s.npcs[0].points, points);
  assert.equal(s.run.pending.length, 0);
  assert.equal(s.run.log.length, logs + 1);
});

test("a reroll of an ignored roll comes back as new, without marking acted again", () => {
  const s = runSystem();
  Run.startRun(s);
  Run.receiveRoll(s, rollOf(s));
  Run.ignorePending(s, s.run.pending[0].id);
  s.run.acted = [];
  assert.equal(Run.receiveRoll(s, rollOf(s, { isReroll: true })), "added");
  assert.equal(s.run.pending.length, 1);
  assert.deepEqual(s.run.acted, []);
});

test("Apply uses the suggestion, Adjust's amount wins, and thresholds are marked", () => {
  const s = runSystem();
  Run.startRun(s);
  Run.receiveRoll(s, rollOf(s));
  Run.applyPending(s, s.run.pending[0].id);
  assert.equal(s.npcs[0].points, 2);
  assert.deepEqual(s.npcs[0].thresholds.map((t) => t.reached), [true, false]);
  Run.receiveRoll(s, rollOf(s, { rollId: "r2" }));
  Run.applyPending(s, s.run.pending[0].id, 5);
  assert.equal(s.npcs[0].points, 7);
  assert.deepEqual(s.npcs[0].thresholds.map((t) => t.reached), [true, true]);
});

test("a reached threshold stays reached when points fall", () => {
  const s = runSystem();
  Run.startRun(s);
  Run.changePoints(s, s.npcs[0].id, 1);
  Run.changePoints(s, s.npcs[0].id, -1);
  assert.equal(s.npcs[0].thresholds[0].reached, true);
});

test("Discover confirms without points; Ignore applies nothing", () => {
  const s = runSystem();
  Run.startRun(s);
  Run.receiveRoll(s, rollOf(s, { kind: "discover", entryId: s.npcs[0].discovery[0].id }));
  Run.applyPending(s, s.run.pending[0].id);
  assert.equal(s.npcs[0].points, 1);
  assert.deepEqual(s.run.appliedRolls, ["r1"]);
  Run.receiveRoll(s, rollOf(s, { rollId: "r2" }));
  Run.ignorePending(s, s.run.pending[0].id);
  assert.equal(s.npcs[0].points, 1);
  assert.equal(s.run.appliedRolls.length, 1);
  assert.equal(Run.ignorePending(s, "gone"), false);
});

test("rounds advance to the maximum, clear markers, and undo brings them back", () => {
  const s = runSystem();
  s.rounds.max = 2;
  assert.equal(Run.advanceRound(s), false);
  Run.startRun(s);
  assert.equal(s.rounds.current, 1);
  s.run.acted = ["a1"];
  Run.advanceRound(s);
  assert.deepEqual([s.rounds.current, s.run.acted], [2, []]);
  assert.equal(Run.advanceRound(s), false);
  Run.undoRound(s);
  assert.deepEqual([s.rounds.current, s.run.acted], [1, ["a1"]]);
  assert.equal(Run.undoRound(s), false);
});

test("reveal toggles and undoes, for skills and counters", () => {
  const s = runSystem();
  const row = s.npcs[0].influence[0];
  Run.toggleReveal(s, row.id, "Diplomacy");
  assert.equal(row.revealed, true);
  Run.toggleReveal(s, row.id, "Diplomacy");
  assert.equal(row.revealed, false);
  Run.toggleReveal(s, s.counters[0].id, "Suspicion");
  assert.equal(s.counters[0].revealed, true);
  assert.equal(Run.toggleReveal(s, "gone", "x"), false);
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
  s.npcs[0].discovery[0].revealed = true;
  s.rounds.current = 0;
  Run.startRun(s);
  assert.equal(Run.startRun(s), false);
  Run.changePoints(s, s.npcs[0].id, 4);
  Run.toggleReveal(s, s.npcs[0].influence[0].id, "x");
  Run.toggleReveal(s, s.npcs[0].discovery[0].id, "x");
  s.npcs[0].influence[0].dc = 22;
  s.counters[0].value = 9;
  Run.receiveRoll(s, rollOf(s));
  Run.advanceRound(s);
  Run.endRun(s);
  assert.equal(s.run.status, "finished");
  assert.equal(s.npcs[0].points, 5);
  Run.resetRun(s);
  assert.equal(s.run.status, "inactive");
  assert.deepEqual([s.rounds.current, s.npcs[0].points, s.counters[0].value], [0, 1, 3]);
  assert.deepEqual(s.npcs[0].thresholds.map((t) => t.reached), [false, false]);
  assert.equal(s.npcs[0].influence[0].revealed, false);
  assert.equal(s.npcs[0].discovery[0].revealed, true);
  assert.equal(s.npcs[0].influence[0].dc, 22, "a DC edit is not run state");
  for (const list of ["log", "pending", "acted", "roundHistory", "appliedRolls"]) assert.deepEqual(s.run[list], [], list);
  assert.equal(s.run.baseline, null);
  assert.equal(Run.resetRun(s), false);
});

test("a row added during a run survives a reset", () => {
  const s = runSystem();
  Run.startRun(s);
  const late = D.addRow(s, "npcs.0.influence");
  late.revealed = true;
  Run.resetRun(s);
  assert.equal(s.npcs[0].influence.at(-1).id, late.id);
});

test("reset clears reached on thresholds added during the run, for old and new NPCs", () => {
  const s = runSystem();
  Run.startRun(s);
  const late = { ...D.addRow(s, "npcs.0.thresholds"), points: 1, reached: true };
  s.npcs[0].thresholds[s.npcs[0].thresholds.length - 1] = late;
  const newNpc = D.addRow(s, "npcs");
  newNpc.points = 3;
  newNpc.thresholds.push({ ...D.newThreshold(), points: 1, reached: true });
  Run.resetRun(s);
  assert.equal(s.npcs[0].thresholds.at(-1).reached, false);
  assert.equal(s.npcs[1].thresholds[0].reached, false);
  assert.equal(s.npcs[1].points, 3, "a new NPC has no start value to go back to");
});

test("after End, a reroll updates a pending item but nothing else gets in", () => {
  const s = runSystem();
  Run.startRun(s);
  Run.receiveRoll(s, rollOf(s));
  Run.receiveRoll(s, rollOf(s, { rollId: "r2" }));
  Run.applyPending(s, s.run.pending[1].id);
  Run.endRun(s);
  assert.equal(Run.receiveRoll(s, rollOf(s, { isReroll: true, outcome: "failure", total: 7 })), "replaced");
  assert.deepEqual([s.run.pending[0].outcome, s.run.pending[0].total], ["failure", 7]);
  assert.equal(Run.receiveRoll(s, rollOf(s, { rollId: "r3" })), false);
  const logs = s.run.log.length;
  assert.equal(Run.receiveRoll(s, rollOf(s, { rollId: "r2", isReroll: true })), false);
  assert.equal(s.run.log.length, logs);
  assert.equal(s.run.pending.length, 1);
});

test("applyForm changes the editable parts and never run state", () => {
  const s = runSystem();
  Run.startRun(s);
  Run.changePoints(s, s.npcs[0].id, 2);
  D.applyForm(s, { rounds: { length: "1 hour" }, run: { status: "finished" } });
  assert.equal(s.rounds.length, "1 hour");
  assert.equal(s.run.status, "active");
  assert.equal(s.npcs[0].points, 3);
});

