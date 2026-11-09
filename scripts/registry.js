import { MODULE } from "./constants.js";

/**
 * One definition per subsystem. The shared parts read these and know nothing about any one subsystem.
 *
 * Required: id, label (language key), icon, model (page data model), sheet (JournalEntry sheet class).
 * Optional: createSystem() for a new challenge's data, searchText(system) for full-text search,
 * receiveRoll(page, roll) for a roll result from the shared roll listener.
 *
 * Later phases add the filtered-copy builder and panel renderer here (spec section 4).
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

/** The page of an entry that holds its challenge data, or undefined. */
export const challengePage = (entry) => entry.pages.find((page) => definitions.has(page.type));

/** The definition for a challenge entry, or undefined. */
export const subsystemFor = (entry) => definitions.get(challengePage(entry)?.type);
