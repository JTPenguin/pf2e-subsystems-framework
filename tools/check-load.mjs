/**
 * Load every script the way Foundry does (the full import graph), with stand-ins for Foundry's globals, and report the
 * first error. Catches what a syntax check misses: clashing names, missing exports, bad import paths. Also reports import cycles.
 *
 *   ELECTRON_RUN_AS_NODE=1 ~/foundryvtt/foundryvtt tools/check-load.mjs
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..", "scripts");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ssm-load-"));

const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((f) => (f.isDirectory() ? walk(path.join(dir, f.name)) : f.name.endsWith(".js") ? [path.join(dir, f.name)] : []));
const files = walk(root);
const importPattern = /from "(\.\.?\/[^"]+)\.js"/g;
const graph = {};
for (const file of files) {
  const rel = path.relative(root, file);
  const source = fs.readFileSync(file, "utf8");
  graph[rel.replace(/\.js$/, "")] = [...source.matchAll(importPattern)].map((m) => path.join(path.dirname(rel), m[1]));
  const target = path.join(tmp, rel.replace(/\.js$/, ".mjs"));
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, source.replace(importPattern, 'from "$1.mjs"'));
}

class Base {}
const field = class {};
globalThis.foundry = {
  abstract: { TypeDataModel: Base },
  data: { fields: new Proxy({}, { get: () => field }) },
  applications: { api: { DocumentSheetV2: Base, HandlebarsApplicationMixin: (B) => class extends B {} } },
  utils: {},
};
globalThis.Hooks = { on() {}, once() {} };
globalThis.CONST = { DOCUMENT_OWNERSHIP_LEVELS: { OWNER: 3 } };

const cycles = new Set();
const visit = (node, trail) => {
  if (trail.includes(node)) return cycles.add([...trail.slice(trail.indexOf(node)), node].join(" -> "));
  for (const next of graph[node] ?? []) visit(next, [...trail, node]);
};
for (const node of Object.keys(graph)) visit(node, []);
if (cycles.size) {
  console.log(`IMPORT CYCLES (${cycles.size}):`);
  for (const c of cycles) console.log(`  ${c}`);
  process.exitCode = 1;
}

// Every language key the code and template use must exist.
const lang = JSON.parse(fs.readFileSync(path.join(here, "..", "lang", "en.json"), "utf8"));
const hasKey = (key) => key.split(".").reduce((v, k) => v?.[k], lang) !== undefined;
const text = [...files, ...fs.readdirSync(path.join(here, "..", "templates")).map((f) => path.join(here, "..", "templates", f))].map((f) => fs.readFileSync(f, "utf8")).join("\n");
const missing = [...new Set([...text.matchAll(/"(SSM(?:\.\w+)+)"/g)].map((m) => m[1]))].filter((key) => !hasKey(key));
if (missing.length) {
  console.log(`MISSING LANGUAGE KEYS: ${missing.join(", ")}`);
  process.exitCode = 1;
}

try {
  await import(pathToFileURL(path.join(tmp, "module.mjs")).href);
  console.log("OK: every script loads");
} catch (err) {
  console.log(`LOAD ERROR: ${err.constructor.name}: ${err.message}`);
  process.exitCode = 1;
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
