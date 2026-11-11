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
const V = await load("subsystems/influence/panel-view");
const Reg = await load("registry");
const L = await load("roll-listener");
const Spot = await load("panel/spot");

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
  const s = { premise: "<p>Banquet</p>", gmNotes: "", rounds: { current: 0, max: 6, length: "" }, npcs: [{ ...D.newNpc(), discovery: [], influence: [] }], counters: [], run: { status: "inactive", acted: [] } };
  return s;
};

test("addRow picks the right row for each list", () => {
  const s = system();
  assert.ok("revealed" in D.addRow(s, "npcs.0.influence"));
  assert.ok(!("showDC" in D.addRow(s, "npcs.0.influence")));
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
  const merged = D.mergeForm(s, { npcs: { 0: { name: "Vance", modifiers: { 0: { name: "Art", effects: { 0: { amount: -2, skills: ["b", "c"] } } } } } } });
  assert.equal(merged.npcs[0].name, "Vance");
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

/* The modifier window */

const modifierSystem = () => {
  const s = system();
  const npc = s.npcs[0];
  const modifier = D.addRow(s, "npcs.0.modifiers");
  Object.assign(modifier, { name: "Flattery", playerText: "He likes praise" });
  return { s, npc, modifier };
};

test("the modifier window saves only the fields the GM changed", () => {
  const { modifier } = modifierSystem();
  const draft = structuredClone(modifier);
  draft.name = "Praise";
  draft.effects[0].note = "He softens";
  assert.deepEqual(Object.keys(D.modifierChanges(modifier, draft)).sort(), ["effects", "name"]);
  assert.deepEqual(D.modifierChanges(modifier, structuredClone(modifier)), {});
});

test("an update from elsewhere keeps the window's unsaved edits on top of the latest modifier", () => {
  const { modifier } = modifierSystem();
  const draft = { ...structuredClone(modifier), name: "Praise" };
  const latest = { ...structuredClone(modifier), active: true, playerText: "Changed elsewhere" };
  const rebased = D.rebaseModifier(latest, D.modifierChanges(modifier, draft));
  assert.deepEqual([rebased.name, rebased.active, rebased.playerText, rebased.id], ["Praise", true, "Changed elsewhere", modifier.id]);
});

test("saving a modifier writes its changes and leaves run changes made since alone", () => {
  const { s, npc, modifier } = modifierSystem();
  modifier.active = true;
  assert.equal(D.saveModifier(s, npc.id, modifier.id, { name: "Praise", effects: [{ ...D.newEffect(), type: "points", amount: 1 }] }), true);
  const saved = D.findModifier(s, npc.id, modifier.id);
  assert.deepEqual([saved.name, saved.active, saved.playerText, saved.effects[0].type], ["Praise", true, "He likes praise", "points"]);
});

test("saving a modifier drops links to skills and counters deleted while the window was open", () => {
  const { s, npc, modifier } = modifierSystem();
  const kept = D.addRow(s, "npcs.0.influence").id;
  const effects = [{ ...D.newEffect(), type: "dc", allSkills: false, skills: [kept, "gone"] }, { ...D.newEffect(), type: "counter", counterId: "gone" }];
  D.saveModifier(s, npc.id, modifier.id, { effects });
  const saved = D.findModifier(s, npc.id, modifier.id);
  assert.deepEqual(saved.effects[0].skills, [kept]);
  assert.equal(saved.effects[1].counterId, "");
});

test("saving a deleted modifier changes nothing", () => {
  const { s, npc, modifier } = modifierSystem();
  D.removeRow(s, "npcs.0.modifiers.0");
  assert.equal(D.saveModifier(s, npc.id, modifier.id, { name: "Praise" }), false);
  assert.equal(D.findModifier(s, npc.id, modifier.id), undefined);
});

test("the window's effect rows use the shared row edits on the modifier alone", () => {
  const { modifier } = modifierSystem();
  const draft = structuredClone(modifier);
  D.addRow(draft, "effects");
  assert.equal(draft.effects.length, 2);
  D.setEffectAmount(draft, "effects.1", 5);
  assert.equal(draft.effects[1].amount, 5);
  assert.equal(D.removeRow(draft, "effects.0"), true);
  assert.equal(D.removeRow(draft, "effects.0"), false, "a modifier keeps one effect");
  const merged = D.mergeForm(draft, { name: "Praise", effects: { 0: { amount: null, note: "x" } } });
  assert.deepEqual([merged.name, merged.effects[0].amount, merged.effects[0].note], ["Praise", 5, "x"]);
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
  s.run = { status: "inactive", acted: [], baseline: null, roundHistory: [], appliedRolls: [], receivedRolls: [] };
  s.npcs[0].points = 1;
  s.npcs[0].influence.push(D.newInfluence());
  s.npcs[0].discovery.push(D.newDiscovery());
  s.npcs[0].thresholds.push({ ...D.newThreshold(), points: 2 }, { ...D.newThreshold(), points: 5 });
  s.counters.push({ ...D.newCounter(), value: 3 });
  return s;
};
const rollOf = (s, over = {}) => ({ rollId: "r1", kind: "influence", npcId: s.npcs[0].id, entryId: s.npcs[0].influence[0].id, messageId: "m1", actorId: "a1", outcome: "success", dc: null, isReroll: false, ...over });

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

test("a roll's card gives the roll's identity, outcome, DC and reroll state; other messages give nothing", () => {
  const option = O.buildRollOption({ kind: "influence", challengeId: "c", npcId: "n", entryId: "e", rollId: "r" });
  const message = (context) => ({ id: "m1", actor: { id: "a1" }, flags: { pf2e: { context } } });
  assert.deepEqual(L.rollFromMessage(message({ options: ["x", option], outcome: "success", dc: { value: 18 }, isReroll: true })), {
    kind: "influence", challengeId: "c", npcId: "n", entryId: "e", rollId: "r", messageId: "m1", actorId: "a1", outcome: "success", dc: 18, isReroll: true,
  });
  assert.equal(L.rollFromMessage(message({ options: ["x"] })), null);
  assert.equal(L.rollFromMessage({ flags: {} }), null);
});

test("a Lore slug has one -lore ending", () => {
  const sluggify = (t) => t.toLowerCase().replace(/\s+/g, "-");
  assert.equal(Run.loreSlug("Warfare", sluggify), "warfare-lore");
  assert.equal(Run.loreSlug("Warfare Lore", sluggify), "warfare-lore");
});

test("rolls need a running challenge and a known skill of their kind", () => {
  const s = runSystem();
  assert.equal(Run.receiveRoll(s, rollOf(s)), false);
  Run.startRun(s);
  assert.equal(Run.receiveRoll(s, rollOf(s, { entryId: "gone" })), false);
  assert.equal(Run.receiveRoll(s, rollOf(s, { npcId: "gone" })), false);
  assert.equal(Run.receiveRoll(s, rollOf(s, { kind: "discover" })), false, "an Influence row isn't a Discovery row");
  assert.deepEqual(s.run.acted, []);
});

test("a new roll marks the PC acted once, and a reroll doesn't mark them again", () => {
  const s = runSystem();
  Run.startRun(s);
  Run.receiveRoll(s, rollOf(s));
  Run.receiveRoll(s, rollOf(s, { rollId: "r2" }));
  assert.deepEqual(s.run.acted, ["a1"]);
  s.run.acted = [];
  assert.equal(Run.receiveRoll(s, rollOf(s, { isReroll: true })), false);
  assert.deepEqual(s.run.acted, []);
});

test("Apply adds the suggested points and marks thresholds", () => {
  const s = runSystem();
  Run.startRun(s);
  assert.deepEqual(Run.applyRoll(s, rollOf(s)), { points: 1 });
  assert.equal(s.npcs[0].points, 2);
  assert.deepEqual(s.npcs[0].thresholds.map((t) => t.reached), [true, false]);
  Run.applyRoll(s, rollOf(s, { rollId: "r2", outcome: "criticalSuccess" }));
  Run.applyRoll(s, rollOf(s, { rollId: "r3", outcome: "criticalFailure" }));
  assert.equal(s.npcs[0].points, 3);
  assert.deepEqual(s.run.appliedRolls, ["r1", "r2", "r3"]);
});

test("Apply works once per roll", () => {
  const s = runSystem();
  Run.startRun(s);
  Run.applyRoll(s, rollOf(s));
  assert.equal(Run.applyBlock(s, rollOf(s)), "applied");
  assert.equal(Run.applyRoll(s, rollOf(s)), false);
  assert.equal(s.npcs[0].points, 2);
});

test("a reroll of an applied roll can't be applied; the GM changes points by hand", () => {
  const s = runSystem();
  Run.startRun(s);
  Run.applyRoll(s, rollOf(s));
  const reroll = rollOf(s, { isReroll: true, messageId: "m2", outcome: "criticalSuccess" });
  assert.equal(Run.applyBlock(s, reroll), "rerollAfterApply");
  assert.equal(Run.applyRoll(s, reroll), false);
  assert.equal(s.npcs[0].points, 2);
});

test("a reroll of a roll that wasn't applied applies from its own card", () => {
  const s = runSystem();
  Run.startRun(s);
  assert.equal(Run.applyBlock(s, rollOf(s, { isReroll: true })), "");
  Run.applyRoll(s, rollOf(s, { isReroll: true, outcome: "criticalSuccess" }));
  assert.equal(s.npcs[0].points, 3);
});

test("Apply needs a running challenge and an Influence skill that still exists", () => {
  const s = runSystem();
  assert.equal(Run.applyBlock(s, rollOf(s)), "notRunning");
  Run.startRun(s);
  assert.equal(Run.applyBlock(s, rollOf(s, { entryId: "gone" })), "gone");
  assert.equal(Run.applyBlock(s, rollOf(s, { npcId: "gone" })), "gone");
  assert.equal(Run.applyBlock(s, rollOf(s, { kind: "discover", entryId: s.npcs[0].discovery[0].id })), "gone", "Discover has no Apply");
  Run.endRun(s);
  assert.equal(Run.applyBlock(s, rollOf(s)), "notRunning");
  assert.equal(Run.applyRoll(s, rollOf(s)), false);
  assert.equal(s.npcs[0].points, 1);
});

test("a Discover roll changes no points", () => {
  const s = runSystem();
  Run.startRun(s);
  Run.receiveRoll(s, rollOf(s, { kind: "discover", entryId: s.npcs[0].discovery[0].id, outcome: "criticalSuccess" }));
  assert.equal(s.npcs[0].points, 1);
  assert.deepEqual(s.run.appliedRolls, []);
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
  Run.toggleReveal(s, row.id);
  assert.equal(row.revealed, true);
  Run.toggleReveal(s, row.id);
  assert.equal(row.revealed, false);
  Run.toggleReveal(s, s.counters[0].id);
  assert.equal(s.counters[0].revealed, true);
  assert.equal(Run.toggleReveal(s, "gone"), false);
});

test("the Reached tag toggles a threshold both ways, and dropping points never clears it", () => {
  const s = runSystem();
  const npc = s.npcs[0];
  const t = npc.thresholds[0];
  Run.changePoints(s, npc.id, t.points);
  assert.equal(t.reached, true);
  Run.toggleReached(s, npc.id, t.id);
  assert.equal(t.reached, false);
  Run.toggleReached(s, npc.id, t.id);
  assert.equal(t.reached, true);
  Run.changePoints(s, npc.id, -t.points);
  assert.equal(t.reached, true);
  assert.equal(Run.toggleReached(s, npc.id, "gone"), false);
  assert.equal(Run.toggleReached(s, "gone", t.id), false);
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
  Run.toggleReveal(s, s.npcs[0].influence[0].id);
  Run.toggleReveal(s, s.npcs[0].discovery[0].id);
  s.npcs[0].influence[0].dc = 22;
  s.counters[0].value = 9;
  Run.receiveRoll(s, rollOf(s));
  Run.applyRoll(s, rollOf(s, { rollId: "r2", outcome: "failure" }));
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
  for (const list of ["acted", "roundHistory", "appliedRolls", "receivedRolls"]) assert.deepEqual(s.run[list], [], list);
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

test("applyForm changes the editable parts and never run state", () => {
  const s = runSystem();
  Run.startRun(s);
  Run.changePoints(s, s.npcs[0].id, 2);
  D.applyForm(s, { rounds: { max: 9 }, run: { status: "finished" } });
  assert.equal(s.rounds.max, 9);
  assert.equal(s.run.status, "active");
  assert.equal(s.npcs[0].points, 3);
});

/* Modifiers and counters. */

const running = () => {
  const s = runSystem();
  s.npcs[0].influence.push({ ...D.newInfluence(), skill: "society", dc: 20 });
  Run.startRun(s);
  return s;
};
const addModifier = (s, over = {}, effects = [{}]) => {
  const m = { ...D.newModifier(), active: true, name: "Entry", ...over };
  m.effects = effects.map((effect) => ({ ...D.newEffect(), ...effect }));
  s.npcs[0].modifiers.push(m);
  return m;
};
const dcOf = (s, row = s.npcs[0].influence[0]) => Run.currentDc(s, s.npcs[0], row);
const dcEffect = (amount, over = {}) => ({ type: "dc", amount, ...over });
const npcId = (s) => s.npcs[0].id;
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

test("a DC change on chosen skills matches only those skills, and the DC can't go below 0", () => {
  const s = running();
  const [first, second] = s.npcs[0].influence;
  addModifier(s, {}, [dcEffect(5, { allSkills: false, skills: [second.id] })]);
  assert.equal(dcOf(s, first), 15);
  assert.equal(dcOf(s, second), 25);
  addModifier(s, {}, [dcEffect(-99)]);
  assert.equal(dcOf(s, first), 0);
});

test("a one-time DC change is spent when its Influence roll arrives, and Apply doesn't spend again", () => {
  const s = running();
  const m = addModifier(s, { duration: "oneTime" }, [dcEffect(-2)]);
  const other = addModifier(s, { duration: "oneTime", active: false }, [dcEffect(-2)]);
  Run.receiveRoll(s, rollAt(s, "r1", 13));
  assert.equal(m.spent, true);
  assert.equal(dcOf(s), 15);
  other.active = true;
  Run.applyRoll(s, rollAt(s, "r1", 13));
  assert.equal(other.spent, false, "a received roll's Apply leaves a newer entry alone, even at the same DC");
  assert.equal(s.npcs[0].points, 2);
});

test("two arriving rolls at a one-time DC: the first spends it, and the next check is at the normal DC", () => {
  const s = running();
  const m = addModifier(s, { duration: "oneTime" }, [dcEffect(-2)]);
  Run.receiveRoll(s, rollAt(s, "r1", dcOf(s)));
  assert.equal(m.spent, true);
  assert.equal(dcOf(s), 15, "the second PC rolls at the normal DC");
  Run.receiveRoll(s, rollAt(s, "r2", dcOf(s), { actorId: "a2" }));
  Run.applyRoll(s, rollAt(s, "r1", 13));
  Run.applyRoll(s, rollAt(s, "r2", 15));
  assert.equal(s.npcs[0].points, 3);
});

test("changing another DC entry between the roll and Apply still leaves the one-time entry spent", () => {
  const s = running();
  const m = addModifier(s, { duration: "oneTime" }, [dcEffect(-2)]);
  Run.receiveRoll(s, rollAt(s, "r1", 13));
  addModifier(s, {}, [dcEffect(3)]);
  Run.applyRoll(s, rollAt(s, "r1", 13));
  assert.equal(m.spent, true);
});

test("an ongoing DC change is never spent", () => {
  const s = running();
  const m = addModifier(s, {}, [dcEffect(-2)]);
  Run.applyRoll(s, rollAt(s, "r1", 13));
  assert.equal(m.spent, false);
  assert.equal(dcOf(s), 13);
});

test("rolls that arrived with no active GM spend at Apply: the first applied spends it, and the second still gets its points", () => {
  const s = running();
  const m = addModifier(s, { duration: "oneTime" }, [dcEffect(-2)]);
  Run.applyRoll(s, rollAt(s, "r2", 13));
  assert.equal(m.spent, true);
  Run.applyRoll(s, rollAt(s, "r1", 13));
  assert.equal(m.spent, true);
  assert.equal(s.npcs[0].points, 3);
});

test("a roll and its reroll spend a one-time entry once, and Apply doesn't spend it again after Restore", () => {
  const s = running();
  const m = addModifier(s, { duration: "oneTime" }, [dcEffect(-2)]);
  Run.receiveRoll(s, rollAt(s, "r1", 13));
  Run.receiveRoll(s, rollAt(s, "r1", 13, { isReroll: true }));
  assert.equal(m.spent, true);
  Run.restoreModifier(s, npcId(s), m.id);
  Run.applyRoll(s, rollAt(s, "r1", 13, { isReroll: true, outcome: "criticalSuccess" }));
  assert.equal(m.spent, false, "the roll was received, so its Apply spends nothing");
  assert.equal(s.npcs[0].points, 3);
});

test("Apply after the entry was turned off doesn't spend it", () => {
  const s = running();
  const m = addModifier(s, { duration: "oneTime" }, [dcEffect(-2)]);
  Run.toggleModifier(s, npcId(s), m.id);
  Run.applyRoll(s, rollAt(s, "r1", 13));
  assert.equal(m.spent, false);
  Run.toggleModifier(s, npcId(s), m.id);
  assert.equal(dcOf(s), 13, "on again, it applies to the next check");
});

test("a roll at another DC leaves one-time entries alone, and still gets its points", () => {
  const s = running();
  const m = addModifier(s, { duration: "oneTime" }, [dcEffect(-2)]);
  Run.applyRoll(s, rollAt(s, "r1", 15));
  assert.equal(m.spent, false);
  assert.equal(s.npcs[0].points, 2);
});

test("a Discover check spends a matching one-time entry when it arrives", () => {
  const s = running();
  const row = s.npcs[0].discovery[0];
  const m = addModifier(s, { duration: "oneTime" }, [dcEffect(2, { allSkills: false, skills: [row.id] })]);
  Run.receiveRoll(s, rollAt(s, "r1", 15, { kind: "discover", entryId: row.id }));
  assert.equal(m.spent, false, "this roll's DC didn't include it");
  Run.receiveRoll(s, rollAt(s, "r2", 17, { kind: "discover", entryId: row.id, isReroll: true }));
  assert.equal(m.spent, false, "a reroll spends nothing");
  Run.receiveRoll(s, rollAt(s, "r3", 17, { kind: "discover", entryId: row.id }));
  assert.equal(m.spent, true);
});

test("Apply does each effect, and ongoing entries can repeat", () => {
  const s = running();
  s.counters[0].name = "Suspicion";
  const m = addModifier(s, {}, [{ type: "points", amount: 2 }, { type: "counter", amount: -1, counterId: s.counters[0].id }, { type: "rounds", amount: 1 }, { type: "note", note: "She leaves" }]);
  Run.applyModifier(s, npcId(s), m.id);
  assert.deepEqual([s.npcs[0].points, s.counters[0].value, s.rounds.max], [3, 2, 7]);
  assert.equal(m.spent, false);
  Run.applyModifier(s, npcId(s), m.id);
  assert.equal(s.npcs[0].points, 5);
});

test("Apply needs the run active and the entry on", () => {
  const s = running();
  const m = addModifier(s, { active: false }, [{ type: "points", amount: 2 }]);
  assert.equal(Run.applyModifier(s, npcId(s), m.id), false);
  m.active = true;
  Run.endRun(s);
  assert.equal(Run.applyModifier(s, npcId(s), m.id), false);
  assert.equal(Run.toggleModifier(s, npcId(s), m.id), false);
  assert.equal(s.npcs[0].points, 1);
});

test("a one-time entry applies once, is spent, and restores", () => {
  const s = running();
  const m = addModifier(s, { duration: "oneTime" }, [{ type: "points", amount: 2 }]);
  Run.applyModifier(s, npcId(s), m.id);
  assert.equal(m.spent, true);
  assert.equal(Run.applyModifier(s, npcId(s), m.id), false);
  assert.equal(Run.toggleModifier(s, npcId(s), m.id), false, "a spent entry needs Restore");
  assert.equal(s.npcs[0].points, 3);
  Run.restoreModifier(s, npcId(s), m.id);
  assert.deepEqual([m.spent, m.applied, m.active, s.npcs[0].points], [false, false, true, 3]);
  assert.equal(Run.restoreModifier(s, npcId(s), m.id), false);
});

test("a one-time entry with both kinds applies once and is spent by its check", () => {
  const s = running();
  const m = addModifier(s, { duration: "oneTime" }, [dcEffect(-2), { type: "points", amount: 1 }]);
  Run.applyModifier(s, npcId(s), m.id);
  assert.deepEqual([m.applied, m.spent], [true, false]);
  assert.equal(Run.applyModifier(s, npcId(s), m.id), false);
  assert.equal(dcOf(s), 13, "the DC change still waits for its check");
  Run.applyRoll(s, rollAt(s, "r1", 13));
  assert.equal(m.spent, true);
  assert.equal(dcOf(s), 15);
});

test("removing rounds never goes below the current round, and undo stays in step", () => {
  const s = running();
  s.rounds.max = 3;
  Run.advanceRound(s);
  const m = addModifier(s, {}, [{ type: "rounds", amount: -9 }]);
  Run.applyModifier(s, npcId(s), m.id);
  assert.deepEqual([s.rounds.current, s.rounds.max], [2, 2]);
  Run.undoRound(s);
  assert.deepEqual([s.rounds.current, s.rounds.max], [1, 2]);
  assert.equal(Run.advanceRound(s), undefined);
  assert.equal(Run.advanceRound(s), false, "the shorter clock holds");
});

test("counters stop at their limits, and a counter at its limit does not move", () => {
  const s = running();
  Object.assign(s.counters[0], { value: 4, min: 0, max: 5 });
  Run.changeCounter(s, s.counters[0].id, 1);
  assert.equal(s.counters[0].value, 5);
  assert.equal(Run.changeCounter(s, s.counters[0].id, 1), false);
  assert.equal(s.counters[0].value, 5);
  const m = addModifier(s, {}, [{ type: "counter", amount: -99, counterId: s.counters[0].id }]);
  Run.applyModifier(s, npcId(s), m.id);
  assert.equal(s.counters[0].value, 0);
});

test("a trigger fires on reaching or passing it, in either direction, and not when leaving it", () => {
  const s = running();
  const c = s.counters[0];
  Object.assign(c, { name: "Suspicion", value: 0, triggers: [{ ...D.newTrigger(), value: 2, gmNote: "Guards" }, { ...D.newTrigger(), value: 4, gmNote: "" }] });
  assert.deepEqual(Run.changeCounter(s, c.id, 1).triggers, []);
  assert.deepEqual(Run.changeCounter(s, c.id, 1).triggers, [{ counter: "Suspicion", value: 2, note: "Guards" }]);
  assert.deepEqual(Run.changeCounter(s, c.id, 1).triggers, [], "moving off a trigger is not reaching it");
  assert.equal(Run.changeCounter(s, c.id, 3).triggers.length, 1);
  assert.equal(Run.changeCounter(s, c.id, -4).triggers.length, 2);
});

test("a Rounds effect, counter change and modifier state all go back on reset", () => {
  const s = running();
  const startMax = s.rounds.max;
  const c = s.counters[0];
  const wasOn = addModifier(s, { duration: "oneTime" }, [{ type: "rounds", amount: 2 }]);
  const wasOff = addModifier(s, { active: false }, [dcEffect(2)]);
  s.run.baseline = (() => { s.run.status = "inactive"; Run.startRun(s); return s.run.baseline; })();
  Run.applyModifier(s, npcId(s), wasOn.id);
  Run.toggleModifier(s, npcId(s), wasOff.id);
  Run.changeCounter(s, c.id, 2);
  assert.equal(s.rounds.max, startMax + 2);
  Run.resetRun(s);
  assert.deepEqual([wasOn.active, wasOn.spent, wasOn.applied, wasOff.active], [true, false, false, false]);
  assert.deepEqual([s.rounds.max, c.value, s.run.roundsAdded], [startMax, 3, 0]);
});

test("a hand edit of the maximum during a run survives reset", () => {
  const s = running();
  const m = addModifier(s, {}, [{ type: "rounds", amount: 1 }]);
  Run.applyModifier(s, npcId(s), m.id);
  s.rounds.max = 10;
  Run.resetRun(s);
  assert.equal(s.rounds.max, 9);
});

test("reset clears entries and counters added during the run", () => {
  const s = running();
  const late = addModifier(s, { spent: true }, [dcEffect(2)]);
  const counter = D.addRow(s, "counters");
  counter.value = 2;
  Run.changeCounter(s, counter.id, 3);
  Run.toggleReveal(s, counter.id);
  Run.resetRun(s);
  assert.deepEqual([late.active, late.spent], [false, false]);
  assert.deepEqual([counter.value, counter.revealed], [2, false]);
});

test("revealing a decoy on an influence row reveals it", () => {
  const s = running();
  const row = s.npcs[0].influence[0];
  row.decoy = true;
  Run.toggleReveal(s, row.id);
  assert.equal(row.revealed, true);
});

test("every kind of row added during a run goes back to hidden on reset", () => {
  const s = running();
  const late = [D.addRow(s, "npcs.0.discovery"), D.addRow(s, "npcs.0.influence"), addModifier(s, {}, [dcEffect(2)])];
  for (const row of late) row.revealed = true;
  const threshold = D.addRow(s, "npcs.0.thresholds");
  threshold.reveal = "full";
  Run.resetRun(s);
  assert.deepEqual(late.map((row) => row.revealed), [false, false, false]);
  assert.equal(threshold.reveal, "hidden");
  assert.ok(!("revealed" in threshold), "a threshold gets no old-style flag");
});

test("a row revealed before the run stays revealed on reset", () => {
  const s = runSystem();
  s.npcs[0].influence[0].revealed = true;
  Run.startRun(s);
  Run.resetRun(s);
  assert.equal(s.npcs[0].influence[0].revealed, true);
});

test("an ongoing entry isn't spent when a roll arrives", () => {
  const s = running();
  const m = addModifier(s, { duration: "oneTime" }, [dcEffect(-2)]);
  m.duration = "ongoing";
  Run.receiveRoll(s, rollAt(s, "r1", 13));
  assert.equal(m.spent, false);
});

/* The filtered copy */

const GM_SECRET = "GMSECRET";
/** A challenge with one entry of every kind, none revealed, and GM-only text in every GM field. */
const secretSystem = () => {
  const s = runSystem();
  s.premise = `<p>${GM_SECRET} premise</p>`;
  s.gmNotes = `<p>${GM_SECRET} notes</p>`;
  const npc = s.npcs[0];
  npc.name = "Lady Vance";
  npc.perception = 77;
  npc.will = 88;
  npc.thresholds = [{ ...D.newThreshold(), points: 8, playerText: "she offers an introduction", gmText: `${GM_SECRET} threshold` }];
  npc.modifiers = [{ ...D.newModifier(), name: "Flattery", playerText: "likes praise", gmText: `${GM_SECRET} modifier`, effects: [{ ...D.newEffect(), note: `${GM_SECRET} effect` }] }];
  s.counters = [{ ...D.newCounter(), name: "Suspicion", value: 3, min: -111, max: 222, triggers: [{ ...D.newTrigger(), value: 5, gmNote: `${GM_SECRET} trigger` }] }];
  Run.startRun(s);
  return s;
};
const viewOf = (s, party = []) => V.buildPanelView({ name: "Banquet", system: s, party });
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
  const npc = s.npcs[0];
  for (const row of [...npc.discovery, ...npc.influence, ...npc.modifiers, ...s.counters]) row.revealed = true;
  for (const row of npc.thresholds) row.reveal = "full";
};
const assertNoSecrets = (view) => {
  const { keys } = scan(view);
  for (const key of ["decoy", "gmText", "gmNote", "gmNotes", "premise", "perception", "will", "revealed", "effects", "triggers", "min", "log", "pending", "baseline"]) assert.ok(!keys.has(key), `key ${key} must not appear`);
  assert.ok(!JSON.stringify(view).includes(GM_SECRET), "GM text must not appear");
};

test("the copy shows only the defaults before anything is revealed", () => {
  const s = secretSystem();
  s.npcs[0].points = 2;
  const view = viewOf(s);
  assert.equal(view.name, "Banquet");
  assert.deepEqual(view.rounds, { current: 1, max: 6 });
  assert.equal(view.npcs[0].name, "Lady Vance");
  assert.equal(view.npcs[0].points, 2);
  assert.equal(view.npcs[0].discovery.length, 1);
  assert.deepEqual([view.npcs[0].influence, view.npcs[0].known, view.npcs[0].thresholds, view.counters], [[], [], [], []]);
  assertNoSecrets(view);
  assert.ok(!JSON.stringify(view).includes("Flattery"));
  assert.ok(!JSON.stringify(view).includes("Suspicion"));
  assert.ok(!JSON.stringify(view).includes("introduction"));
});

test("hidden skills put no id or DC in the copy", () => {
  const s = secretSystem();
  const row = s.npcs[0].influence[0];
  row.dc = 987;
  const text = JSON.stringify(viewOf(s));
  assert.ok(!text.includes("987"));
  assert.ok(!text.includes(row.id));
});

test("revealing each kind of entry adds it, and only its player fields", () => {
  const s = secretSystem();
  revealAll(s);
  const view = viewOf(s);
  const npc = s.npcs[0];
  assert.deepEqual(view.npcs[0].influence, [{ id: npc.influence[0].id, skill: "society", lore: "", dc: 15 }]);
  assert.deepEqual(view.npcs[0].known, [{ id: npc.modifiers[0].id, name: "Flattery", text: "likes praise", kind: "weakness", duration: "ongoing", active: false, spent: false, applied: false, changes: [] }]);
  assert.deepEqual(view.npcs[0].thresholds, [{ id: npc.thresholds[0].id, points: 8, text: "she offers an introduction", textHidden: false, reached: false }]);
  assert.deepEqual(view.counters, [{ id: s.counters[0].id, name: "Suspicion", value: 3 }]);
  assertNoSecrets(view);
});

test("the panel lists revealed entries as resistances, weaknesses, then Other, each in stored order", () => {
  const s = secretSystem();
  const base = s.npcs[0].modifiers[0];
  const make = (kind, name) => ({ ...structuredClone(base), id: `${kind}-${name}`, kind, name, revealed: true });
  s.npcs[0].modifiers = [make("weakness", "w1"), make("other", "o1"), make("resistance", "r1"), make("weakness", "w2"), make("resistance", "r2")];
  const known = viewOf(s).npcs[0].known;
  assert.deepEqual(known.map((card) => `${card.kind}:${card.name}`), ["resistance:r1", "resistance:r2", "weakness:w1", "weakness:w2", "other:o1"]);
});

test("hiding an entry again takes it back out", () => {
  const s = secretSystem();
  const row = s.npcs[0].influence[0];
  Run.toggleReveal(s, row.id);
  assert.equal(viewOf(s).npcs[0].influence.length, 1);
  Run.toggleReveal(s, row.id);
  assert.equal(viewOf(s).npcs[0].influence.length, 0);
});

test("a reached threshold is marked, and a threshold with no player text never falls back to GM text", () => {
  const s = secretSystem();
  revealAll(s);
  s.npcs[0].thresholds[0].playerText = "";
  Run.changePoints(s, s.npcs[0].id, 8);
  const [threshold] = viewOf(s).npcs[0].thresholds;
  assert.equal(threshold.reached, true);
  assert.equal(threshold.text, "");
  assertNoSecrets(viewOf(s));
});

test("a revealed decoy can't be told from a true entry, at any depth", () => {
  const twin = (decoy) => {
    const s = secretSystem();
    revealAll(s);
    const npc = s.npcs[0];
    for (const row of [...npc.discovery, ...npc.influence, ...npc.modifiers]) row.decoy = decoy;
    return s;
  };
  const withIds = (s) => {
    const ids = [...s.npcs[0].discovery, ...s.npcs[0].influence, ...s.npcs[0].thresholds, ...s.npcs[0].modifiers, ...s.counters, ...s.npcs].map((row) => row.id);
    return ids.reduce((text, id, n) => text.replaceAll(id, `ID${n}`), JSON.stringify(viewOf(s)));
  };
  assert.equal(withIds(twin(true)), withIds(twin(false)));
  const decoyView = viewOf(twin(true));
  assert.ok(!scan(decoyView).keys.has("decoy"));
  assert.ok(![...scan(decoyView).values].some((value) => /decoy/i.test(String(value))));
  assertNoSecrets(decoyView);
});

test("an unrevealed decoy is left out, including a non-universal Discovery skill", () => {
  const s = secretSystem();
  const npc = s.npcs[0];
  const planted = { ...D.newDiscovery(), skill: "occultism", decoy: true, dc: 654 };
  npc.discovery.push(planted);
  npc.influence[0].decoy = true;
  npc.modifiers[0].decoy = true;
  let view = viewOf(s);
  assert.deepEqual(view.npcs[0].discovery.map((row) => row.id), [npc.discovery[0].id]);
  assert.deepEqual([view.npcs[0].influence, view.npcs[0].known], [[], []]);
  assert.ok(!JSON.stringify(view).includes("654"));
  planted.revealed = true;
  view = viewOf(s);
  assert.deepEqual(view.npcs[0].discovery.map((row) => row.id), [npc.discovery[0].id, planted.id]);
});

test("the only universal Discovery skill is Perception, matched as stored", () => {
  assert.deepEqual(D.UNIVERSAL_DISCOVERY, ["perception"]);
  assert.equal(D.isUniversalDiscovery({ skill: D.PERCEPTION }), true);
  assert.equal(D.isUniversalDiscovery({ skill: "society" }), false);
  assert.equal(D.isUniversalDiscovery({ skill: "occultism" }), false);
  assert.equal(D.isUniversalDiscovery({ skill: "" }), false);
});

test("the universal Discovery skill is always in the copy, with its DC, revealed or not", () => {
  const s = secretSystem();
  const npc = s.npcs[0];
  npc.discovery = [{ ...D.newDiscovery(), skill: "perception", dc: 15 }, { ...D.newDiscovery(), skill: "society", dc: 17 }];
  assert.deepEqual(viewOf(s).npcs[0].discovery.map((row) => [row.skill, row.dc]), [["perception", 15]]);
  npc.discovery[1].revealed = true;
  assert.deepEqual(viewOf(s).npcs[0].discovery.map((row) => [row.skill, row.dc]), [["perception", 15], ["society", 17]]);
});

test("a non-universal Discovery skill is absent, DC included, until revealed", () => {
  const s = secretSystem();
  const row = { ...D.newDiscovery(), skill: "arcana", dc: 876 };
  s.npcs[0].discovery.push(row);
  const hidden = JSON.stringify(viewOf(s));
  assert.ok(!hidden.includes("876"));
  assert.ok(!hidden.includes(row.id));
  assert.ok(!hidden.includes("arcana"));
  Run.toggleReveal(s, row.id);
  assert.deepEqual(viewOf(s).npcs[0].discovery.at(-1), { id: row.id, skill: "arcana", lore: "", dc: 876 });
  Run.toggleReveal(s, row.id);
  assert.ok(!JSON.stringify(viewOf(s)).includes(row.id));
});

test("a decoy on a universal skill shows from the start, with no decoy marker", () => {
  const s = secretSystem();
  s.npcs[0].discovery = [{ ...D.newDiscovery(), skill: "perception", decoy: true }];
  const view = viewOf(s);
  assert.deepEqual(view.npcs[0].discovery.map((row) => row.skill), ["perception"]);
  assert.ok(!scan(view).keys.has("decoy"));
});

test("reset hides a non-universal Discovery skill unless it was revealed before Start", () => {
  const s = runSystem();
  const before = { ...D.newDiscovery(), skill: "arcana", revealed: true };
  const during = { ...D.newDiscovery(), skill: "occultism" };
  s.npcs[0].discovery.push(before, during);
  Run.startRun(s);
  Run.toggleReveal(s, during.id);
  Run.toggleReveal(s, before.id);
  Run.resetRun(s);
  assert.deepEqual([before.revealed, during.revealed], [true, false]);
});

test("a visible skill carries its current DC for the roll, and no show-DC flag", () => {
  const s = secretSystem();
  const row = s.npcs[0].influence[0];
  row.revealed = true;
  row.dc = 20;
  assert.equal(viewOf(s).npcs[0].influence[0].dc, 20);
  row.showDC = true;
  assert.ok(!("showDC" in viewOf(s).npcs[0].influence[0]));
  addModifier(s, { active: true }, [dcEffect(-2)]);
  assert.equal(viewOf(s).npcs[0].influence[0].dc, 18);
});

test("a panel click finds the skill in the right NPC's column, by kind", () => {
  const s = secretSystem();
  s.npcs.push({ ...D.newNpc(), name: "Lord Ostrov" });
  const [first, second] = s.npcs;
  first.influence[0].revealed = true;
  second.influence = [{ ...D.newInfluence(), revealed: true }];
  second.discovery = [{ ...D.newDiscovery() }];
  const view = viewOf(s);
  const find = (npc, kind, id) => V.findPanelRow(view, { npc: npc.id, kind, id });
  assert.equal(find(first, "influence", first.influence[0].id).npc.name, "Lady Vance");
  assert.equal(find(second, "influence", second.influence[0].id).npc.name, "Lord Ostrov");
  assert.equal(find(second, "discover", second.discovery[0].id).kind, "discover");
  assert.equal(find(first, "influence", second.influence[0].id), null);
});

test("a panel click on a hidden skill or a gone panel finds nothing", () => {
  const s = secretSystem();
  const row = s.npcs[0].influence[0];
  assert.equal(V.findPanelRow(viewOf(s), { npc: s.npcs[0].id, kind: "influence", id: row.id }), null);
  assert.equal(V.findPanelRow(null, { npc: s.npcs[0].id, kind: "influence", id: row.id }), null);
  assert.equal(V.findPanelRow(undefined, {}), null);
});

test("a panel click uses the copy's current DC, one-time entry included", () => {
  const s = secretSystem();
  const npc = s.npcs[0];
  const row = npc.influence[0];
  row.revealed = true;
  row.dc = 20;
  npc.modifiers[0] = { ...npc.modifiers[0], duration: "oneTime", active: true, effects: [{ ...D.newEffect(), type: "dc", amount: -2 }] };
  assert.equal(V.findPanelRow(viewOf(s), { npc: npc.id, kind: "influence", id: row.id }).row.dc, 18);
});

test("party markers show who has acted, and an empty party is fine", () => {
  const s = secretSystem();
  s.run.acted = ["a1"];
  assert.deepEqual(viewOf(s, [{ id: "a1", name: "Ezren", img: "tokens/ezren.webp" }, { id: "a2", name: "Amiri", img: "tokens/amiri.webp" }]).party, [
    { id: "a1", name: "Ezren", img: "tokens/ezren.webp", acted: true },
    { id: "a2", name: "Amiri", img: "tokens/amiri.webp", acted: false },
  ]);
  assert.deepEqual(viewOf(s).party, []);
});

test("a PC with no image gets the default icon", () => {
  const s = secretSystem();
  for (const img of [undefined, null, ""]) assert.equal(viewOf(s, [{ id: "a1", name: "Ezren", img }]).party[0].img, V.DEFAULT_PC_IMAGE);
});

test("the round bar fills one segment per round played, and stays within the maximum", () => {
  const filled = (current, max) => V.roundSegments(current, max).map((segment) => (segment.filled ? 1 : 0)).join("");
  assert.equal(filled(3, 5), "11100");
  assert.equal(filled(1, 1), "1");
  assert.equal(filled(7, 5), "11111");
  assert.equal(filled(0, 3), "000");
  assert.equal(filled(2, 0), "");
});

test("the copy is the same when nothing players see has changed", () => {
  const s = secretSystem();
  const before = JSON.stringify(viewOf(s));
  Run.toggleModifier(s, s.npcs[0].id, s.npcs[0].modifiers[0].id);
  s.npcs[0].modifiers[0].gmText = "changed";
  assert.equal(JSON.stringify(viewOf(s)), before);
});

test("the bar copes with negative points and falls back to 10 with no goal", () => {
  assert.deepEqual(V.pointsBar(5, 0), { percent: 50, negative: false });
  assert.deepEqual(V.pointsBar(4, 8), { percent: 50, negative: false });
  assert.deepEqual(V.pointsBar(12, 8), { percent: 100, negative: false });
  assert.deepEqual(V.pointsBar(-3, 0), { percent: 30, negative: true });
  assert.deepEqual(V.pointsBar(-20, 0), { percent: 100, negative: true });
  assert.deepEqual(V.pointsBar(0, 0), { percent: 0, negative: false });
});

test("the bar scales to the highest threshold, hidden or not, and the copy carries only that number", () => {
  const s = secretSystem();
  const npc = s.npcs[0];
  const hidden = { ...D.newThreshold(), points: 12, playerText: "HIDDENGOAL" };
  npc.thresholds.push(hidden);
  npc.points = 3;
  const view = viewOf(s);
  assert.equal(view.npcs[0].goal, 12);
  assert.deepEqual(view.npcs[0].thresholds, []);
  const text = JSON.stringify(view);
  assert.ok(!text.includes("HIDDENGOAL") && !text.includes(hidden.id), "a hidden threshold's text and id stay out");
  assert.deepEqual(V.pointsBar(view.npcs[0].points, view.npcs[0].goal), { percent: 25, negative: false });
  npc.thresholds = [];
  assert.equal(viewOf(s).npcs[0].goal, 0);
});

test("revealed thresholds are listed in points order", () => {
  const s = secretSystem();
  const npc = s.npcs[0];
  npc.thresholds = [{ ...D.newThreshold(), points: 9, reveal: "full" }, { ...D.newThreshold(), points: 3, reveal: "points" }, { ...D.newThreshold(), points: 6 }];
  assert.deepEqual(viewOf(s).npcs[0].thresholds.map((t) => t.points), [3, 9]);
});

test("a points-only threshold shows its points and no text; full shows both", () => {
  const s = secretSystem();
  const npc = s.npcs[0];
  const t = npc.thresholds[0];
  Run.cycleThresholdReveal(s, npc.id, t.id);
  assert.equal(t.reveal, "points");
  let view = viewOf(s);
  assert.deepEqual(view.npcs[0].thresholds, [{ id: t.id, points: 8, text: "", textHidden: true, reached: false }]);
  assert.ok(!JSON.stringify(view).includes("introduction"));
  assertNoSecrets(view);
  Run.cycleThresholdReveal(s, npc.id, t.id);
  assert.equal(t.reveal, "full");
  view = viewOf(s);
  assert.deepEqual(view.npcs[0].thresholds, [{ id: t.id, points: 8, text: "she offers an introduction", textHidden: false, reached: false }]);
  Run.cycleThresholdReveal(s, npc.id, t.id);
  assert.equal(t.reveal, "hidden");
  assert.deepEqual(viewOf(s).npcs[0].thresholds, []);
});

test("the threshold reveal cycle finds the threshold by NPC, so two NPCs can share threshold ids", () => {
  const s = runSystem();
  const other = D.addRow(s, "npcs");
  const [first] = s.npcs[0].thresholds;
  other.thresholds.push({ ...D.newThreshold(), id: first.id, points: 4 });
  Run.cycleThresholdReveal(s, other.id, first.id);
  assert.deepEqual([first.reveal, other.thresholds[0].reveal], ["hidden", "points"]);
  assert.equal(Run.cycleThresholdReveal(s, other.id, "gone"), false);
  assert.equal(Run.cycleThresholdReveal(s, "gone", first.id), false);
  assert.equal(Run.toggleReveal(s, first.id), false, "the old one-flag toggle leaves thresholds alone");
});

test("an old penalty or adjustment loads as Other; other kinds are kept", () => {
  assert.deepEqual(D.MODIFIER_KINDS, ["resistance", "weakness", "other"]);
  assert.deepEqual(D.migrateModifier({ name: "Straight talk", kind: "penalty" }), { name: "Straight talk", kind: "other" });
  assert.deepEqual(D.migrateModifier({ name: "Bribe", kind: "adjustment" }), { name: "Bribe", kind: "other" });
  for (const kind of D.MODIFIER_KINDS) assert.equal(D.migrateModifier({ kind }).kind, kind);
  assert.equal(D.migrateModifier(null), null);
  assert.equal(D.isOtherModifier({ kind: "other" }), true);
  assert.equal(D.isOtherModifier({ kind: "weakness" }), false);
});

test("an old threshold's revealed flag loads as the three-step reveal", () => {
  assert.deepEqual(D.migrateThreshold({ points: 6, revealed: true }), { points: 6, reveal: "full" });
  assert.deepEqual(D.migrateThreshold({ points: 6, revealed: false }), { points: 6, reveal: "hidden" });
  assert.deepEqual(D.migrateThreshold({ points: 6, reveal: "points", revealed: true }), { points: 6, reveal: "points" });
  assert.deepEqual(D.migrateThreshold({ points: 6, reveal: "points" }), { points: 6, reveal: "points" });
  assert.deepEqual(D.nextThresholdReveal("hidden"), "points");
  assert.deepEqual(D.nextThresholdReveal("full"), "hidden");
});

test("reset keeps a threshold's reveal from the start of the run, old-style baselines included", () => {
  const s = runSystem();
  const [a, b] = s.npcs[0].thresholds;
  a.reveal = "points";
  Run.startRun(s);
  Run.cycleThresholdReveal(s, s.npcs[0].id, a.id);
  Run.cycleThresholdReveal(s, s.npcs[0].id, b.id);
  // A run started before this change saved `revealed` for thresholds.
  s.run.baseline.npcs[s.npcs[0].id].rows[b.id] = { revealed: true, reached: false };
  Run.resetRun(s);
  assert.deepEqual([a.reveal, b.reveal], ["points", "full"]);
  assert.ok(!("revealed" in b));
});

test("a copy of a running challenge goes back to its start values and keeps its authored content", () => {
  const s = running();
  const [npc] = s.npcs;
  npc.name = "Lady Vance";
  Run.changePoints(s, npc.id, 4);
  Run.toggleReveal(s, npc.influence[0].id);
  Run.receiveRoll(s, rollOf(s));
  Run.applyRoll(s, rollOf(s, { rollId: "r2", outcome: "failure" }));
  Run.resetRun(s);
  assert.deepEqual([s.run.status, s.run.appliedRolls, s.run.baseline, s.run.acted], ["inactive", [], null, []]);
  assert.deepEqual([npc.name, npc.points, npc.influence[0].revealed, npc.influence.length], ["Lady Vance", 1, false, 2]);
  assert.equal(npc.thresholds.some((threshold) => threshold.reached), false);
});

test("resetting a challenge that never started reports no change", () => {
  assert.equal(Run.resetRun(runSystem()), false);
});

for (const [label, baseline] of [["empty", {}], ["null lists", { round: 2, npcs: null, counters: null }], ["null rows", { round: 2, npcs: { any: { points: 1, rows: null } }, counters: {} }], ["not an object", "broken"]]) {
  test(`reset always ends at not started with a damaged baseline: ${label}`, () => {
    const s = running();
    const [npc] = s.npcs;
    if (baseline.npcs?.any) baseline.npcs[npc.id] = baseline.npcs.any;
    s.run.baseline = baseline;
    Run.toggleReveal(s, npc.influence[0].id);
    assert.notEqual(Run.resetRun(s), false);
    assert.deepEqual([s.run.status, s.run.baseline], ["inactive", null]);
    assert.ok(Number.isInteger(s.rounds.current));
    assert.ok(Number.isInteger(npc.points));
    assert.equal(npc.influence[0].revealed, false);
  });
}

test("a form with no Revealed field keeps a Discovery row's old value", () => {
  const s = system();
  const row = { ...D.newDiscovery(), revealed: true, decoy: true };
  s.npcs[0].discovery.push(row);
  D.applyForm(s, { npcs: { 0: { discovery: { 0: { skill: "perception", dc: 21, decoy: false } } } } });
  assert.deepEqual([s.npcs[0].discovery[0].dc, s.npcs[0].discovery[0].decoy, s.npcs[0].discovery[0].revealed, s.npcs[0].discovery[0].id], [21, false, true, row.id]);
});

test("a Discovery row can be a Lore with a name, and is never universal", () => {
  const s = system();
  const row = D.addRow(s, "npcs.0.discovery");
  assert.equal(row.lore, "");
  D.applyForm(s, { npcs: { 0: { discovery: { [s.npcs[0].discovery.length - 1]: { skill: "lore", lore: "Warfare" } } } } });
  const saved = s.npcs[0].discovery.at(-1);
  assert.deepEqual([saved.skill, saved.lore, saved.id], ["lore", "Warfare", row.id]);
  assert.equal(D.isUniversalDiscovery(saved), false);
  assert.equal(D.isUniversalRow(saved), false);
});

test("the panel copy gives a revealed Discovery Lore its name, and a hidden one nothing", () => {
  const s = secretSystem();
  const row = { ...D.newDiscovery(), skill: "lore", lore: "Warfare", dc: 321 };
  s.npcs[0].discovery.push(row);
  assert.ok(!JSON.stringify(viewOf(s)).includes("Warfare"));
  row.revealed = true;
  assert.deepEqual(viewOf(s).npcs[0].discovery.at(-1), { id: row.id, skill: "lore", lore: "Warfare", dc: 321 });
});

test("the universal Influence skills are Deception, Diplomacy and Intimidation, matched as stored", () => {
  assert.deepEqual(D.UNIVERSAL_INFLUENCE, ["deception", "diplomacy", "intimidation"]);
  for (const skill of D.UNIVERSAL_INFLUENCE) assert.equal(D.isUniversalInfluence({ skill }), true);
  for (const skill of ["society", "lore", "performance", "perception", ""]) assert.equal(D.isUniversalInfluence({ skill }), false);
  assert.equal(D.isUniversalRow({ skill: "perception" }), true);
  assert.equal(D.isUniversalRow({ skill: "intimidation" }), true);
  assert.equal(D.isUniversalRow({ skill: "arcana" }), false);
});

test("a new NPC starts with the universal rows at the default DC, and a new row is not universal", () => {
  const npc = D.newNpc();
  assert.deepEqual(npc.discovery.map((row) => [row.skill, row.dc, row.revealed, row.decoy]), [["perception", 15, false, false]]);
  assert.deepEqual(npc.influence.map((row) => [row.skill, row.dc, row.revealed, row.decoy]), [["deception", 15, false, false], ["diplomacy", 15, false, false], ["intimidation", 15, false, false]]);
  assert.equal(new Set([...npc.discovery, ...npc.influence].map((row) => row.id)).size, 4);
  assert.equal(D.isUniversalInfluence(D.newInfluence()), false);
  assert.equal(D.isUniversalDiscovery(D.newDiscovery()), true);
  assert.deepEqual(D.newChallengeSystem().npcs[0].influence.length, 3);
});

test("universal Influence skills are always in the copy, with their DCs; others wait to be revealed", () => {
  const s = secretSystem();
  const npc = s.npcs[0];
  npc.influence = [{ ...D.newInfluence(), skill: "deception", dc: 14 }, { ...D.newInfluence(), skill: "diplomacy", dc: 15 }, { ...D.newInfluence(), skill: "society", dc: 321 }];
  assert.deepEqual(viewOf(s).npcs[0].influence.map((row) => [row.skill, row.dc]), [["deception", 14], ["diplomacy", 15]]);
  assert.ok(!JSON.stringify(viewOf(s)).includes("321"));
  npc.influence[2].revealed = true;
  assert.deepEqual(viewOf(s).npcs[0].influence.map((row) => row.skill), ["deception", "diplomacy", "society"]);
});

test("a decoy flag on a universal row of either kind is ignored: no marker in the copy", () => {
  const s = secretSystem();
  const npc = s.npcs[0];
  npc.influence = [{ ...D.newInfluence(), skill: "intimidation", decoy: true }, { ...D.newInfluence(), skill: "society", decoy: true }];
  npc.discovery = [{ ...D.newDiscovery(), skill: "perception", decoy: true }];
  const view = viewOf(s);
  assert.deepEqual(view.npcs[0].influence.map((row) => row.skill), ["intimidation"]);
  assert.deepEqual(view.npcs[0].discovery.map((row) => row.skill), ["perception"]);
  assert.ok(!scan(view).keys.has("decoy"));
  Run.toggleReveal(s, npc.influence[0].id);
  assert.equal(npc.influence[0].revealed, true);
  Run.toggleReveal(s, npc.discovery[0].id);
  assert.equal(npc.discovery[0].revealed, true);
  Run.toggleReveal(s, npc.influence[1].id);
  assert.equal(npc.influence[1].revealed, true);
});

/* Modifier cards on the panel */

/** Stand-ins for Foundry's localisation, using the English strings. */
const EN = JSON.parse(fs.readFileSync(path.join(here, "..", "lang", "en.json"), "utf8"));
const enText = {
  format: (key, data) => key.split(".").reduce((node, part) => node?.[part], EN).replace(/\{(\w+)\}/g, (_, name) => data[name]),
  list: (items) => new Intl.ListFormat("en", { type: "conjunction" }).format(items),
  label: (skill) => (skill.skill === "lore" ? skill.lore : skill.skill[0].toUpperCase() + skill.skill.slice(1)),
};
/** A revealed modifier on the secret system's NPC, with these effects. Returns the system, the NPC and the card texts. */
const cardOf = (effects, over = {}) => {
  const s = secretSystem();
  const npc = s.npcs[0];
  npc.modifiers = [{ ...D.newModifier(), name: "Flattery", playerText: "likes praise", revealed: true, effects: effects.map((effect) => ({ ...D.newEffect(), ...effect })), ...over }];
  const view = viewOf(s);
  const card = view.npcs[0].known[0];
  return { s, npc, view, card, texts: card.changes.map((change) => V.changeText(change, enText)) };
};
const diplomacy = (s) => s.npcs[0].influence.find((row) => row.skill === "diplomacy");

test("a card's DC change reads as a DC change, with no DC number", () => {
  const s = secretSystem();
  s.npcs[0].influence.push({ ...D.newInfluence(), skill: "diplomacy", dc: 23 });
  const id = diplomacy(s).id;
  s.npcs[0].modifiers = [{ ...D.newModifier(), revealed: true, effects: [{ ...D.newEffect(), type: "dc", amount: -2, allSkills: false, skills: [id] }, { ...D.newEffect(), type: "dc", amount: 5, allSkills: true }] }];
  const view = viewOf(s);
  const texts = view.npcs[0].known[0].changes.map((change) => V.changeText(change, enText));
  assert.deepEqual(texts, ["−2 to DCs vs Diplomacy", "+5 to all DCs"]);
  assert.ok(!texts.join(" ").match(/\b(23|21|28)\b/));
  assert.ok(!JSON.stringify(view.npcs[0].known).includes("23"));
  assert.ok(!scan(view.npcs[0].known).keys.has("dc"));
});

test("a card names Influence Points, rounds and a revealed counter, singular and plural", () => {
  const { texts } = cardOf([{ type: "points", amount: -1 }, { type: "points", amount: 2 }, { type: "rounds", amount: 1 }, { type: "rounds", amount: -2 }]);
  assert.deepEqual(texts, ["−1 Influence Point", "+2 Influence Points", "+1 round", "−2 rounds"]);
  const { s, npc } = cardOf([]);
  npc.modifiers[0].effects = [{ ...D.newEffect(), type: "counter", amount: 1, counterId: s.counters[0].id }];
  assert.deepEqual(viewOf(s).npcs[0].known[0].changes, [], "a hidden counter shows nothing");
  s.counters[0].revealed = true;
  assert.equal(V.changeText(viewOf(s).npcs[0].known[0].changes[0], enText), "+1 Suspicion");
});

test("a card never names a hidden skill row, decoy or not", () => {
  const { s, npc } = cardOf([]);
  const hidden = { ...D.newInfluence(), skill: "society", lore: "", decoy: true };
  const hiddenLore = { ...D.newDiscovery(), skill: "lore", lore: "Secret Cult" };
  npc.influence.push(hidden);
  npc.discovery.push(hiddenLore);
  const dip = { ...D.newInfluence(), skill: "diplomacy" };
  npc.influence.push(dip);
  npc.modifiers[0].effects = [
    { ...D.newEffect(), type: "dc", amount: -2, allSkills: false, skills: [dip.id, hidden.id] },
    { ...D.newEffect(), type: "dc", amount: -1, allSkills: false, skills: [hiddenLore.id] },
  ];
  let view = viewOf(s);
  let texts = view.npcs[0].known[0].changes.map((change) => V.changeText(change, enText));
  assert.deepEqual(texts, ["−2 to DCs vs Diplomacy"], "hidden skills leave no trace, and a change on hidden skills only shows nothing");
  const known = JSON.stringify(view.npcs[0].known);
  for (const secret of ["Secret Cult", hidden.id, hiddenLore.id, dip.id]) assert.ok(!known.includes(secret), `${secret} must not appear`);
  assert.ok(!scan(view.npcs[0].known).values.has("society"));
  assertNoSecrets(view);
  hiddenLore.revealed = true;
  view = viewOf(s);
  texts = view.npcs[0].known[0].changes.map((change) => V.changeText(change, enText));
  assert.deepEqual(texts, ["−2 to DCs vs Diplomacy", "−1 to DCs vs Secret Cult"]);
});

test("a card leaves out an unrevealed counter, a note, a zero change and a removed skill", () => {
  const { s, npc } = cardOf([]);
  s.counters[0].name = "Hidden Grudge";
  npc.modifiers[0].effects = [
    { ...D.newEffect(), type: "counter", amount: 2, counterId: s.counters[0].id },
    { ...D.newEffect(), type: "counter", amount: 2, counterId: "gone" },
    { ...D.newEffect(), type: "note", note: `${GM_SECRET} note` },
    { ...D.newEffect(), type: "points", amount: 0 },
    { ...D.newEffect(), type: "dc", amount: 0, allSkills: true },
    { ...D.newEffect(), type: "dc", amount: -2, allSkills: false, skills: ["gone"] },
  ];
  const view = viewOf(s);
  assert.deepEqual(view.npcs[0].known[0].changes, []);
  assert.ok(!JSON.stringify(view).includes("Hidden Grudge"));
  assert.ok(!JSON.stringify(view).includes(s.counters[0].id));
  assertNoSecrets(view);
});

test("a card carries kind, duration and state, and a revealed decoy looks like any other", () => {
  const { s, npc, card } = cardOf([], { kind: "other", duration: "oneTime", active: true, decoy: true });
  assert.deepEqual([card.kind, card.duration, card.active, card.spent], ["other", "oneTime", true, false]);
  assert.ok(!scan(viewOf(s)).keys.has("decoy"));
  npc.modifiers[0].spent = true;
  assert.equal(viewOf(s).npcs[0].known[0].spent, true);
  npc.modifiers[0].revealed = false;
  assert.deepEqual(viewOf(s).npcs[0].known, []);
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

test("a DC change on a Discovery and an Influence row with the same skill names it once", () => {
  const { s, npc } = cardOf([]);
  const discover = { ...D.newDiscovery(), skill: "diplomacy", revealed: true };
  const influence = { ...D.newInfluence(), skill: "diplomacy" };
  npc.discovery.push(discover);
  npc.influence.push(influence);
  npc.modifiers[0].effects = [{ ...D.newEffect(), type: "dc", amount: -2, allSkills: false, skills: [discover.id, influence.id] }];
  assert.deepEqual(viewOf(s).npcs[0].known[0].changes.map((change) => V.changeText(change, enText)), ["−2 to DCs vs Diplomacy"]);
});

test("a DC change on several visible skills lists them", () => {
  const { s, npc } = cardOf([]);
  const dip = { ...D.newInfluence(), skill: "diplomacy" };
  const dec = { ...D.newInfluence(), skill: "deception" };
  npc.influence.push(dip, dec);
  npc.modifiers[0].effects = [{ ...D.newEffect(), type: "dc", amount: -2, allSkills: false, skills: [dip.id, dec.id] }];
  assert.deepEqual(viewOf(s).npcs[0].known[0].changes.map((change) => V.changeText(change, enText)), ["−2 to DCs vs Diplomacy and Deception"]);
});

test("applying a one-time points entry spends its card", () => {
  const { s, npc } = cardOf([{ type: "points", amount: 1 }], { duration: "oneTime", active: true });
  assert.equal(Run.applyModifier(s, npc.id, npc.modifiers[0].id).triggers.length, 0);
  const card = viewOf(s).npcs[0].known[0];
  assert.deepEqual([card.spent, card.applied], [true, true]);
});

test("applying a one-time entry with a DC change marks it applied but not spent, until its check arrives", () => {
  const { s, npc } = cardOf([{ type: "points", amount: 1 }], { duration: "oneTime", active: true });
  npc.modifiers[0].effects.push({ ...D.newEffect(), type: "dc", amount: -2, allSkills: true });
  Run.applyModifier(s, npc.id, npc.modifiers[0].id);
  const card = viewOf(s).npcs[0].known[0];
  assert.deepEqual([card.spent, card.applied, card.active], [false, true, true]);
  assert.deepEqual(card.changes.map((change) => change.type), ["points", "dc"]);
});

/* Dragging the panel */

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

/* Resizing the panel */

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

/* A panel card's hover */

const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#x27;" })[c]);
const tipText = { escape: escapeHTML, gmLabel: "GM Only" };

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

test("a revealed card in the copy carries its player text but no GM text", () => {
  const s = secretSystem();
  revealAll(s);
  const view = viewOf(s);
  assert.equal(view.npcs[0].known[0].text, "likes praise");
  assertNoSecrets(view);
});

/* Keeping the challenge sheet */

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
