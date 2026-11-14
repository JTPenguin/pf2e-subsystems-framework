/**
 * Build the Example Challenges compendium (packs/examples) from the import files in examples/. Each file becomes one journal entry with
 * its challenge page. Ids come from the file name, so a rebuild keeps them. Needs classic-level: Foundry ships it, and the release
 * workflow installs it from npm.
 *
 *   ELECTRON_RUN_AS_NODE=1 ~/foundryvtt/foundryvtt tools/build-pack.mjs
 */
import crypto from "node:crypto";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(root, "examples");
const target = path.join(root, "packs", "examples");
const PAGE_TYPE = "pf2e-subsystems-framework.challenge";
const SHEET = "pf2e-subsystems-framework.ChallengeSheet";

/** classic-level from npm if installed, else Foundry's own copy. */
function classicLevel() {
  const places = [path.join(root, "package.json"), path.join(process.env.HOME ?? "", "foundryvtt/resources/app/node_modules/")];
  for (const place of places) {
    try { return createRequire(place)("classic-level").ClassicLevel; } catch { /* try the next */ }
  }
  throw new Error("classic-level not found. Run `npm install --no-save classic-level`, or run this with Foundry's Electron.");
}

/** A 16-character Foundry id from a seed, so the same file always gets the same id. */
const idFrom = (seed) => crypto.createHash("sha256").update(seed).digest("base64").replace(/[^A-Za-z0-9]/g, "").slice(0, 16);

const files = fs.readdirSync(source).filter((name) => name.endsWith(".json")).sort();
if (!files.length) throw new Error(`No examples in ${source}`);

// Check each file the way the traps in docs/challenge-format.md describe, before it goes in the pack.
const entries = files.map((file, index) => {
  const doc = JSON.parse(fs.readFileSync(path.join(source, file), "utf8"));
  const page = doc.pages?.[0];
  const problems = [];
  if (doc.flags?.core?.sheetClass !== SHEET) problems.push("missing flags.core.sheetClass");
  if (doc.pages?.length !== 1 || page?.type !== PAGE_TYPE) problems.push("needs exactly one challenge page");
  if (page?.system?.run) problems.push("has a run block");
  const ids = JSON.stringify(page?.system ?? {}).match(/"id":"[^"]+"/g) ?? [];
  const duplicate = ids.find((entry, i) => ids.indexOf(entry) !== i);
  if (duplicate) problems.push(`duplicate ${duplicate}`);
  if (problems.length) throw new Error(`${file}: ${problems.join("; ")}`);

  const slug = file.replace(/\.json$/, "");
  const entryId = idFrom(`entry:${slug}`);
  const pageId = idFrom(`page:${slug}`);
  const stats = { coreVersion: "14.370", systemId: "pf2e", systemVersion: "8.7.0", createdTime: null, modifiedTime: null, lastModifiedBy: null, compendiumSource: null, duplicateSource: null, exportSource: null };
  return {
    entry: { _id: entryId, name: doc.name, pages: [pageId], folder: null, categories: [], sort: (index + 1) * 100000, ownership: { default: 0 }, flags: doc.flags, _stats: stats },
    page: { _id: pageId, name: page.name ?? doc.name, type: PAGE_TYPE, system: page.system, title: { show: true, level: 1 }, sort: 0, ownership: { default: -1 }, flags: page.flags ?? {}, _stats: stats },
  };
});

fs.rmSync(target, { recursive: true, force: true });
fs.mkdirSync(target, { recursive: true });
const ClassicLevel = classicLevel();
const db = new ClassicLevel(target, { keyEncoding: "utf8", valueEncoding: "json" });
await db.open();
const batch = db.batch();
for (const { entry, page } of entries) {
  batch.put(`!journal!${entry._id}`, entry);
  batch.put(`!journal.pages!${entry._id}.${page._id}`, page);
}
await batch.write();
await db.compactRange("\x00", "\xff");
await db.close();
// The lock file is only for an open database; leave it out of the zip.
fs.rmSync(path.join(target, "LOCK"), { force: true });
console.log(`OK: ${path.relative(root, target)} (${entries.length} challenges)`);
