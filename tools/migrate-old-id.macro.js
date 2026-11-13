// One-off Foundry macro: moves challenges made under the module's old id (pf2e-subsystem-manager)
// to the new one (pf2e-subsystems-framework). Paste into a Script macro and run it as the GM in each
// world that has old challenges. Safe to run twice: the second run finds nothing to do.
//
// What it converts:
// - Challenge pages: type pf2e-subsystem-manager.challenge -> pf2e-subsystems-framework.challenge,
//   in place, so each page keeps its id, data and run state.
// - Challenge folders: the challengeFolder flag moves to the new id.
// It leaves the panel's position and each user's collapsed subjects: they go back to their defaults.

const OLD = "pf2e-subsystem-manager";
const NEW = "pf2e-subsystems-framework";
const OLD_TYPE = `${OLD}.challenge`;
const NEW_TYPE = `${NEW}.challenge`;

if (!game.user.isGM) return ui.notifications.error("Run this macro as the GM.");
if (!game.modules.get(NEW)?.active) return ui.notifications.error(`Turn on the ${NEW} module first.`);

// Entries that failed to load are kept apart from the rest, so check both.
const entries = [...game.journal, ...[...game.journal.invalidDocumentIds].map((id) => game.journal.getInvalid(id))];

let pageCount = 0;
for (const entry of entries) {
  const old = entry._source.pages.filter((page) => page.type === OLD_TYPE);
  if (!old.length) continue;
  // The entry's sheet still names the old id; the module points it at the new sheet on the next reload.
  for (const page of old) {
    try {
      await entry.updateEmbeddedDocuments("JournalEntryPage", [{ _id: page._id, type: NEW_TYPE, system: _replace(page.system) }]);
    } catch (error) {
      // An old page loads as invalid. The server saves the update, then this client fails to apply it to the
      // invalid copy ("reading '_source'"). The reload at the end picks up the saved page.
      if (!String(error?.message).includes("_source")) throw error;
    }
  }
  pageCount += old.length;
  console.log(`${NEW} | Migrated "${entry.name}" (${old.length} page${old.length === 1 ? "" : "s"})`);
}

const folderUpdates = game.folders
  .filter((folder) => folder._source.flags?.[OLD])
  .map((folder) => ({
    _id: folder.id,
    [`flags.${NEW}`]: folder._source.flags[OLD],
    [`flags.${OLD}`]: _del,
  }));
if (folderUpdates.length) await Folder.updateDocuments(folderUpdates);

ui.notifications.info(`Migrated ${pageCount} challenge page(s) and ${folderUpdates.length} folder(s). Reload, then run this again: it should find nothing left.`);
