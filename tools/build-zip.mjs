/**
 * Build the zip to share with friends: dist/pf2e-subsystems-framework-<version>.zip. Unzip it into Data/modules. Needs `zip` and `unzip` on the machine.
 *
 *   ELECTRON_RUN_AS_NODE=1 ~/foundryvtt/foundryvtt tools/build-zip.mjs
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "module.json"), "utf8"));
const CONTENTS = ["module.json", "LICENSE", "scripts", "styles", "templates", "lang", "packs"];

// The Example Challenges compendium is built from examples/ first, so the zip always holds the current examples.
execFileSync(process.execPath, [path.join(root, "tools", "build-pack.mjs")], { stdio: "inherit", env: process.env });

const output = path.join(root, "dist", `${manifest.id}-${manifest.version}.zip`);
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.rmSync(output, { force: true });

// A temporary copy gives the zip its top folder, whatever this repository's folder is called.
const staging = fs.mkdtempSync(path.join(os.tmpdir(), "psf-zip-"));
try {
  for (const name of CONTENTS) fs.cpSync(path.join(root, name), path.join(staging, manifest.id, name), { recursive: true });
  execFileSync("zip", ["-rqX", output, manifest.id], { cwd: staging, stdio: "inherit" });
} finally {
  fs.rmSync(staging, { recursive: true, force: true });
}

// Every file the manifest names must be in the zip, or the module fails to load after install.
const listed = new Set(execFileSync("unzip", ["-Z1", output], { encoding: "utf8" }).split("\n").filter(Boolean));
const needed = ["module.json", ...manifest.esmodules, ...manifest.styles, ...manifest.languages.map((language) => language.path), ...(manifest.packs ?? []).map((pack) => `${pack.path}/CURRENT`)];
const missing = needed.filter((file) => !listed.has(`${manifest.id}/${file}`));
if (missing.length) {
  console.error(`Missing from the zip: ${missing.join(", ")}`);
  process.exit(1);
}
console.log(`OK: ${path.relative(root, output)} (${listed.size} entries)`);
