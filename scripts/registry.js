import { MODULE } from "./constants.js";

/**
 * One definition per subsystem. The shared parts read these and know nothing about any one subsystem.
 *
 * Required: id, label (language key), icon, model (page data model), sheet (JournalEntry sheet class).
 * Optional: createSystem() for a new challenge's data, searchText(system) for full-text search,
 * receiveRoll(page, roll) for a roll as it arrives, from the shared roll listener on the active GM's client.
 * renderRollCard(page, roll, message, content) adds the GM's controls to the drawn `.message-content` of one of its rolls' chat cards. It runs on GM clients only.
 * resetCopy(system) puts a new challenge's plain source data back to not started, and returns false if it changed nothing.
 * panel: what the shared panel needs (spec section 4). Leave it out for a subsystem with no panel.
 *   isRunning(system): whether the challenge can stay on the panel.
 *   buildView({ name, system, party }): the filtered copy, holding only what players may see.
 *   template and prepareView(view): the player panel's template and its context, from the filtered copy alone.
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
