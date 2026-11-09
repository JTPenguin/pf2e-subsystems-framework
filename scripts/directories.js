import { FOLDER_FLAG, MODULE, TAB } from "./constants.js";
import { allSubsystems, subsystemFor } from "./registry.js";
import { ancestorsToShow, dropAllowed, isChallenge, isChallengeFolder, pruneTree, stripHtml } from "./directory-rules.js";

const loc = (key) => game.i18n.localize(key);

/** Behaviour shared by the Subsystems tab and the filtered Journal tab. */
const FilteredDirectory = (Base, wantChallenges) => class extends Base {
  async _prepareDirectoryContext(context, options) {
    await super._prepareDirectoryContext(context, options);
    const manual = this.collection.sortingMode !== "a";
    const compare = manual ? (a, b) => a.sort - b.sort : (a, b) => a.name.localeCompare(b.name, game.i18n.lang);
    context.tree = pruneTree(context.tree, wantChallenges, compare);
  }

  _matchSearchFolders(query, folderIds, autoExpandIds, options) {
    super._matchSearchFolders(query, folderIds, autoExpandIds, options);
    for (const id of [...folderIds]) {
      if (isChallengeFolder(this.collection.folders.get(id)) !== wantChallenges) {
        folderIds.delete(id);
        autoExpandIds.delete(id);
      }
    }
  }

  /** Core searches the whole collection and opens the folder of every hit, so redo the folders from the hits that belong here. */
  _matchSearchEntries(query, entryIds, folderIds, autoExpandIds, options) {
    const matchedFolders = new Set(folderIds);
    const expanded = new Set(autoExpandIds);
    super._matchSearchEntries(query, entryIds, folderIds, autoExpandIds, options);
    this._addSearchMatches?.(query, entryIds);

    folderIds.clear();
    autoExpandIds.clear();
    for (const id of matchedFolders) folderIds.add(id);
    for (const id of expanded) autoExpandIds.add(id);
    for (const id of [...entryIds]) {
      const entry = this.collection.get(id);
      if (!entry || isChallenge(entry) !== wantChallenges) {
        entryIds.delete(id);
        continue;
      }
      for (const folderId of ancestorsToShow(entry, wantChallenges)) {
        folderIds.add(folderId);
        autoExpandIds.add(folderId);
      }
    }
  }

  async _handleDroppedEntry(target, data) {
    const entry = await this._getDroppedEntryFromData(data);
    if (!entry) return;
    const closest = target?.closest(".directory-item.folder");
    closest?.classList.remove("droptarget");
    const sibling = target?.dataset.entryId ? this.collection.get(target.dataset.entryId) : null;
    const folder = sibling ? sibling.folder : this.collection.folders.get(closest?.dataset.folderId);
    if (!dropAllowed(isChallenge(entry), wantChallenges, folder ?? null)) {
      ui.notifications.warn(wantChallenges ? "SSM.Drop.NotAChallenge" : "SSM.Drop.ChallengeInJournal", { localize: true });
      return;
    }
    return super._handleDroppedEntry(target, data);
  }

  async _handleDroppedFolder(target, data) {
    const folder = await foundry.utils.fromUuid(data.uuid);
    if (folder?.type === "JournalEntry" && !dropAllowed(isChallengeFolder(folder), wantChallenges)) {
      target?.closest(".directory-item.folder")?.classList.remove("droptarget");
      ui.notifications.warn(wantChallenges ? "SSM.Drop.NormalFolder" : "SSM.Drop.ChallengeFolder", { localize: true });
      return;
    }
    return super._handleDroppedFolder(target, data);
  }
};

function defineDirectories() {
  const { DocumentDirectory } = foundry.applications.sidebar;
  const { FolderConfig } = foundry.applications.sheets;

  /** FolderConfig saves only its form fields, so the flag has to be added at submit. */
  class ChallengeFolderConfig extends FolderConfig {
    _processFormData(event, form, formData) {
      const data = super._processFormData(event, form, formData);
      foundry.utils.setProperty(data, `flags.${MODULE}.${FOLDER_FLAG}`, true);
      return data;
    }
  }

  class ChallengeDirectory extends FilteredDirectory(DocumentDirectory, true) {
    static tabName = TAB;
    static DEFAULT_OPTIONS = { collection: "JournalEntry" };

    get title() {
      return loc("SSM.Tab");
    }

    _canRender(options) {
      if (!game.user.isGM) return false;
      return super._canRender(options);
    }

    async _prepareHeaderContext(context, options) {
      await super._prepareHeaderContext(context, options);
      context.searchMode.placeholder = loc("SSM.Search");
    }

    async _onRender(context, options) {
      await super._onRender(context, options);
      const label = this.element.querySelector(".create-entry span");
      if (label) label.textContent = loc("SSM.Create");
    }

    async _onCreateEntry(event, target) {
      event.stopPropagation();
      const folder = target.closest(".directory-item")?.dataset.folderId ?? null;
      // Influence is the only subsystem so far. A second one needs a chooser here.
      const [subsystem] = allSubsystems();
      const entry = await JournalEntry.implementation.create({
        name: loc("SSM.NewChallenge"),
        folder,
        pages: [{ name: loc(subsystem.label), type: subsystem.pageType, system: subsystem.createSystem?.() ?? {} }],
      });
      entry?.sheet.render(true);
      return entry;
    }

    _onCreateFolder(event, target) {
      event.stopPropagation();
      const parent = target.closest(".directory-item")?.dataset.folderId ?? null;
      const FolderClass = foundry.documents.Folder.implementation;
      const document = new FolderClass({ name: FolderClass.defaultName(), sorting: "a", type: "JournalEntry", folder: parent });
      new ChallengeFolderConfig({ document }).render({ force: true });
    }

    /** Core's full-text search doesn't read typed page data. */
    _addSearchMatches(query, entryIds) {
      if (this.collection.searchMode === CONST.DIRECTORY_SEARCH_MODES.NAME) return;
      const clean = foundry.applications.ux.SearchFilter.cleanQuery;
      for (const entry of this.collection) {
        const subsystem = isChallenge(entry) ? subsystemFor(entry) : null;
        const page = subsystem && entry.pages.find((p) => p.type === subsystem.pageType);
        if (page && subsystem.searchText && query.test(clean(stripHtml(subsystem.searchText(page.system))))) entryIds.add(entry.id);
      }
    }
  }

  return { ChallengeDirectory, JournalDirectory: class extends FilteredDirectory(CONFIG.ui.journal, false) {} };
}

export function installDirectories() {
  const { ChallengeDirectory, JournalDirectory } = defineDirectories();
  CONFIG.ui[TAB] = ChallengeDirectory;
  CONFIG.ui.journal = JournalDirectory;

  // TABS order sets button order: put the tab after Journal.
  const { Sidebar } = foundry.applications.sidebar;
  const tabs = Object.entries(Sidebar.TABS);
  tabs.splice(tabs.findIndex(([id]) => id === "journal") + 1, 0, [TAB, { tooltip: "SSM.Tab", icon: "fa-solid fa-comments", gmOnly: true }]);
  Sidebar.TABS = Object.fromEntries(tabs);
}
