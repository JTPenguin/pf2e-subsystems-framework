import { FOLDER_FLAG, MODULE, TAB } from "./constants.js";
import { allSubsystems, subsystemFor } from "./registry.js";
import { ancestorsToShow, dropAllowed, flattenTree, isChallenge, isChallengeFolder, pruneTree, stripHtml } from "./directory-rules.js";
import { hidePanel, runState, takePanel } from "./panel/activation.js";

const loc = (key) => game.i18n.localize(key);

/** Ask which preset a new challenge starts from. Returns its id, or null if the dialog was closed. A subsystem with one preset or none needs no dialog. */
async function choosePreset(subsystem) {
  const presets = subsystem.presets ?? [];
  if (presets.length < 2) return presets[0]?.id ?? undefined;
  return foundry.applications.api.DialogV2.wait({
    window: { title: "SSM.ChoosePreset" },
    content: `<p>${loc("SSM.ChoosePresetHint")}</p>`,
    buttons: presets.map((preset) => ({ action: preset.id, label: preset.label, icon: preset.icon })),
    rejectClose: false,
  });
}

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

  /** The mark on a running challenge's row. A hidden panel's challenge gets the plain running mark. */
  const RUN_MARKS = {
    panel: { icon: "fa-eye", label: "SSM.Running.OnPanel" },
    running: { icon: "fa-play", label: "SSM.Running.Running" },
  };

  class ChallengeDirectory extends FilteredDirectory(DocumentDirectory, true) {
    static tabName = TAB;
    static DEFAULT_OPTIONS = { collection: "JournalEntry", actions: { toggleRunning: ChallengeDirectory.#onToggleRunning } };

    /** The Running filter. Off on each load. */
    #runningOnly = false;

    static #onToggleRunning() {
      this.#runningOnly = !this.#runningOnly;
      return this.render();
    }

    async _prepareDirectoryContext(context, options) {
      await super._prepareDirectoryContext(context, options);
      if (this.#runningOnly) context.tree = flattenTree(context.tree, (entry) => !!runState(entry), (a, b) => a.name.localeCompare(b.name, game.i18n.lang));
    }

    _getEntryContextOptions() {
      const entryOf = (li) => this.collection.get(li.closest("[data-entry-id]").dataset.entryId);
      return [
        {
          label: "SSM.Running.ShowOnPanel",
          icon: "fa-solid fa-eye",
          visible: (li) => game.user.isActiveGM && runState(entryOf(li)) === "running",
          onClick: (event, li) => takePanel(entryOf(li)),
        },
        {
          label: "SSM.Panel.Hide",
          icon: "fa-solid fa-eye-slash",
          visible: (li) => game.user.isActiveGM && runState(entryOf(li)) === "panel",
          onClick: () => hidePanel(),
        },
        ...super._getEntryContextOptions(),
      ];
    }

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
      this.#drawRunningFilter();
      this.#drawRunMarks();
    }

    /** The filter button sits in core's search bar, so it is added here rather than in a template of our own. */
    #drawRunningFilter() {
      const search = this.element.querySelector(".directory-header search");
      if (!search) return;
      let button = search.querySelector(".ssm-running-filter");
      if (!button) {
        button = document.createElement("button");
        button.type = "button";
        button.className = "inline-control icon fa-solid fa-play ssm-running-filter";
        button.dataset.action = "toggleRunning";
        button.dataset.tooltip = loc("SSM.Running.Filter");
        button.setAttribute("aria-label", loc("SSM.Running.Filter"));
        const sort = search.querySelector(".toggle-sort");
        if (sort) sort.before(button);
        else search.append(button);
      }
      button.classList.toggle("active", this.#runningOnly);
      button.setAttribute("aria-pressed", String(this.#runningOnly));
    }

    #drawRunMarks() {
      const list = this.element.querySelector(".directory-list");
      if (!list) return;
      for (const li of list.querySelectorAll(".directory-item.entry[data-entry-id]")) {
        const entry = this.collection.get(li.dataset.entryId);
        const mark = entry && RUN_MARKS[runState(entry)];
        // An empty slot on the other rows keeps every name in line.
        if (!mark) {
          const slot = document.createElement("span");
          slot.className = "ssm-run-mark";
          slot.setAttribute("aria-hidden", "true");
          li.querySelector(".entry-name")?.before(slot);
          continue;
        }
        const icon = document.createElement("i");
        icon.className = `fa-solid ${mark.icon} ssm-run-mark`;
        icon.dataset.tooltip = loc(mark.label);
        icon.setAttribute("aria-label", loc(mark.label));
        icon.setAttribute("role", "img");
        li.querySelector(".entry-name")?.before(icon);
      }
      if (this.#runningOnly && !list.querySelector(".directory-item")) {
        const empty = document.createElement("li");
        empty.className = "ssm-running-none";
        empty.textContent = loc("SSM.Running.None");
        list.append(empty);
      }
    }

    async _onCreateEntry(event, target) {
      event.stopPropagation();
      const folder = target.closest(".directory-item")?.dataset.folderId ?? null;
      const [subsystem] = allSubsystems();
      const preset = await choosePreset(subsystem);
      if (preset === null) return null;
      const entry = await JournalEntry.implementation.create({
        name: loc("SSM.NewChallenge"),
        folder,
        pages: [{ name: loc(subsystem.label), type: subsystem.pageType, system: subsystem.createSystem?.(preset) ?? {} }],
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

/** Starting, ending or resetting a challenge changes its mark in the Subsystems tab. Core redraws the tab only for name, folder and the like. */
function onChallengeUpdate(page, changed) {
  if (game.user.isGM && foundry.utils.hasProperty(changed, "system.run.status")) ui[TAB]?.render();
}

export function installDirectories() {
  Hooks.on("updateJournalEntryPage", onChallengeUpdate);
  const { ChallengeDirectory, JournalDirectory } = defineDirectories();
  CONFIG.ui[TAB] = ChallengeDirectory;
  CONFIG.ui.journal = JournalDirectory;

  // TABS order sets button order: put the tab after Journal.
  const { Sidebar } = foundry.applications.sidebar;
  const tabs = Object.entries(Sidebar.TABS);
  tabs.splice(tabs.findIndex(([id]) => id === "journal") + 1, 0, [TAB, { tooltip: "SSM.Tab", icon: "fa-solid fa-comments", gmOnly: true }]);
  Sidebar.TABS = Object.fromEntries(tabs);
}
