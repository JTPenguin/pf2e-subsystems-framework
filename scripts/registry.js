import { MODULE } from "./constants.js";

/**
 * One definition per subsystem. The shared parts read these and know nothing about any one subsystem.
 *
 * Required: id, label (language key), icon, model (page data model), sheet (JournalEntry sheet class).
 * Optional: presets, a list of { id, label, icon } the create button offers, and createSystem(presetId) for a new challenge's data, searchText(system) for full-text search,
 * receiveRoll(page, roll) for a roll as it arrives, from the shared roll listener on the active GM's client.
 * resetCopy(system) puts a new challenge's plain source data back to not started, and returns false if it changed nothing.
 * panel: what the shared panel needs (spec section 4). Leave it out for a subsystem with no panel.
 *   isRunning(system): whether the challenge can be on the panel. Any number can run; one is on the panel at a time.
 *   buildView({ name, system, party }): the filtered copy, holding only what players may see.
 *   template and prepareView(view): the player panel's template and its context, from the filtered copy alone. prepareView may be async.
 *   viewActions: { name: (state, button, event) } for buttons any user can press. They read only the filtered copy, `state.view`.
 */
const definitions = new Map();

export function registerSubsystem(definition) {
  for (const key of ["id", "label", "icon", "model", "sheet"]) {
    if (!definition[key]) throw new Error(`${MODULE} | Subsystem definition is missing "${key}"`);
  }
  const pageType = `${MODULE}.${definition.id}`;
  if (definitions.has(pageType)) throw new Error(`${MODULE} | Subsystem "${definition.id}" is already registered`);
  const entry = { ...definition, pageType, sheetId: `${MODULE}.${definition.sheet.name}` };
  definitions.set(pageType, entry);
  return entry;
}

export const allSubsystems = () => [...definitions.values()];

/** The definition for a page type, or undefined. */
export const subsystemByType = (pageType) => definitions.get(pageType);

/** The page of an entry that holds its challenge data, or undefined. */
export const challengePage = (entry) => entry.pages.find((page) => definitions.has(page.type));

/** The definition for a challenge entry, or undefined. */
export const subsystemFor = (entry) => definitions.get(challengePage(entry)?.type);

/**
 * Removes a sheet change from a challenge entry's update unless it points at `sheetId`, and says whether it did.
 * Configure Sheet can't list the challenge sheet, so saving it, even just for a theme, writes another sheet here.
 */
export function dropSheetChange(changes, sheetId) {
  let dropped = false;
  const core = changes.flags?.core;
  for (const key of ["sheetClass", "-=sheetClass"]) {
    if (core && key in core && core[key] !== sheetId) { delete core[key]; dropped = true; }
    const path = `flags.core.${key}`;
    if (path in changes && changes[path] !== sheetId) { delete changes[path]; dropped = true; }
  }
  return dropped;
}
