import { installDirectories } from "./directories.js";
import { isChallengeType } from "./directory-rules.js";
import { allSubsystems, subsystemFor } from "./registry.js";
import { installPanel } from "./panel/panel.js";
import { installRollListener } from "./roll-listener.js";
import { registerInfluence } from "./subsystems/influence/definition.js";

Hooks.once("init", () => {
  registerInfluence();
  const { DocumentSheetConfig } = foundry.applications.apps;
  for (const subsystem of allSubsystems()) {
    CONFIG.JournalEntryPage.dataModels[subsystem.pageType] = subsystem.model;
    // Ordinary journal entries must keep their normal sheet: this one can't be chosen, and only the flag below selects it.
    DocumentSheetConfig.registerSheet(foundry.documents.JournalEntry, "pf2e-subsystem-manager", subsystem.sheet, {
      types: ["base"], makeDefault: false, canBeDefault: false, canConfigure: false, label: subsystem.label,
    });
  }
  installDirectories();
  installRollListener();
  installPanel();
});

/** A duplicate or import of a running challenge must not arrive running: only one can be active, and its rolls' cards belong to the original. */
function resetNewChallenge(entry, subsystem) {
  const { pages } = entry.toObject();
  const page = pages.find((candidate) => candidate.type === subsystem.pageType);
  if (page && subsystem.resetCopy?.(page.system) !== false) entry.updateSource({ pages });
}

/** Point every new challenge at its sheet, however it was created: this flag is what `entry.sheet` reads. */
Hooks.on("preCreateJournalEntry", (entry) => {
  const subsystem = subsystemFor(entry);
  if (!subsystem) return;
  if (!entry.getFlag("core", "sheetClass")) entry.updateSource({ "flags.core.sheetClass": subsystem.sheetId });
  resetNewChallenge(entry, subsystem);
});

/** A challenge page may only arrive with a new entry. Added to an existing one, it would pull that journal out of the Journal tab. */
Hooks.on("preCreateJournalEntryPage", (page) => {
  const entry = page.parent;
  if (!isChallengeType(page.type) || !entry?.collection?.has(entry.id)) return;
  ui.notifications.warn("SSM.PageRefused", { localize: true });
  return false;
});

/** The Create Page dialog lists every page type. */
Hooks.on("renderDialogV2", (dialog, element) => {
  for (const option of element.querySelectorAll('select[name="type"] option')) {
    if (isChallengeType(option.value)) option.remove();
  }
});
