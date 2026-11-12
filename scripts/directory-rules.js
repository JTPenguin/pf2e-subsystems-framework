import { FOLDER_FLAG, MODULE } from "./constants.js";

/*
 * The rules that keep challenges and ordinary journal entries apart. No Foundry calls here, so
 * tools/test.mjs can check them. "wantChallenges" is true for the Subsystems tab and false for the Journal tab.
 */

/** Is this a page type this module owns? */
export const isChallengeType = (type) => Boolean(type?.startsWith(`${MODULE}.`));

/** Any page of a type this module owns makes the entry a challenge, even if its subsystem isn't registered. */
export const isChallenge = (entry) => entry.pages.some((page) => isChallengeType(page.type));

export const isChallengeFolder = (folder) => folder?.flags?.[MODULE]?.[FOLDER_FLAG] === true;

/**
 * Copy a built folder tree for one tab. Entries of the tab's kind that sit in a folder of the other kind
 * can only come from a macro or import; they move to the root so they can't be lost from both tabs.
 * Never filter collection.folders instead: Foundry treats a folder missing from it as foreign, and copies it when dragged.
 */
export function pruneTree(root, wantChallenges, compare) {
  const strayEntries = [];
  const strayFolders = [];
  const entryFits = (entry) => isChallenge(entry) === wantChallenges;
  const folderFits = (node) => isChallengeFolder(node.folder) === wantChallenges;

  /** Search a folder of the other kind for anything that belongs in this tab. */
  const salvage = (node) => {
    strayEntries.push(...node.entries.filter(entryFits));
    for (const child of node.children) {
      if (folderFits(child)) strayFolders.push(keep(child));
      else salvage(child);
    }
  };

  const keep = (node) => {
    const children = [];
    for (const child of node.children) {
      if (folderFits(child)) children.push(keep(child));
      else salvage(child);
    }
    return { ...node, entries: node.entries.filter(entryFits), children };
  };

  const pruned = keep(root);
  pruned.entries = [...pruned.entries, ...strayEntries];
  pruned.children = [...pruned.children, ...strayFolders];
  if (compare && strayEntries.length) pruned.entries.sort(compare);
  return pruned;
}

/**
 * Should a drop go ahead? targetFolder is the folder the entry or folder would land in, or null for the root.
 * An item of the wrong kind is refused anywhere in the tab, even at the root.
 */
export function dropAllowed(itemIsChallenge, wantChallenges, targetFolder = null) {
  if (itemIsChallenge !== wantChallenges) return false;
  return !targetFolder || isChallengeFolder(targetFolder) === wantChallenges;
}

/** The folders to show or open for a matched entry: its ancestors, up to the first of the other kind. */
export function ancestorsToShow(entry, wantChallenges) {
  const ids = [];
  let folder = entry.folder;
  while (folder && isChallengeFolder(folder) === wantChallenges) {
    ids.push(folder.id);
    folder = folder.folder;
  }
  return ids;
}

/** Every entry in the tree that passes `keep`, as one root with no folders. The Running filter lists challenges this way, wherever their folders are. */
export function flattenTree(root, keep, compare) {
  const entries = [];
  const walk = (node) => {
    entries.push(...node.entries.filter(keep));
    node.children.forEach(walk);
  };
  walk(root);
  if (compare) entries.sort(compare);
  return { ...root, entries, children: [] };
}

/** Plain text from rich text, for searching. */
export const stripHtml = (html) => String(html ?? "").replace(/<[^>]*>/g, " ");
