// PHASE 0 SPIKE. Throwaway test code, to be replaced in Phase 1. See docs/phase-0-results.md.
const MODULE = "pf2e-subsystem-manager";
const TYPE = `${MODULE}.influence`;

const isChallenge = (entry) => entry.pages.some((p) => p.type === TYPE);
const isChallengeFolder = (folder) => folder.getFlag(MODULE, "challengeFolder") === true;

/** Copy a built tree node, keeping only challenge content (or only non-challenge content). */
function pruneTree(node, wantChallenges) {
  return {
    ...node,
    entries: node.entries.filter((e) => isChallenge(e) === wantChallenges),
    children: node.children
      .filter((c) => isChallengeFolder(c.folder) === wantChallenges)
      .map((c) => pruneTree(c, wantChallenges)),
  };
}

class InfluenceModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const { NumberField } = foundry.data.fields;
    return { spikeValue: new NumberField({ initial: 0 }) };
  }
}

function defineDirectories() {
  const { DocumentDirectory } = foundry.applications.sidebar;

  class ChallengeDirectory extends DocumentDirectory {
    static tabName = "subsystems";
    static DEFAULT_OPTIONS = { collection: "JournalEntry" };

    get title() { return "Subsystems"; }

    _canRender(options) {
      if (!game.user.isGM) return false;
      return super._canRender(options);
    }

    async _prepareDirectoryContext(context, options) {
      await super._prepareDirectoryContext(context, options);
      context.tree = pruneTree(context.tree, true);
    }

    _onCreateEntry(event, target) {
      event.stopPropagation();
      const folder = target.closest(".directory-item")?.dataset.folderId ?? null;
      return JournalEntry.implementation.create({ name: `Challenge ${Date.now()}`, folder, pages: [{ name: "Challenge", type: TYPE }] });
    }

    _onCreateFolder(event, target) {
      event.stopPropagation();
      const folder = target.closest(".directory-item")?.dataset.folderId ?? null;
      // FolderConfig saves only its form fields, so flags passed in the create data are lost. Add the flag at creation time.
      const hookId = Hooks.on("preCreateFolder", (doc) => doc.updateSource({ [`flags.${MODULE}.challengeFolder`]: true }));
      return foundry.documents.Folder.implementation.createDialog({ folder, type: "JournalEntry" }).finally(() => Hooks.off("preCreateFolder", hookId));
    }
  }

  class FilteredJournalDirectory extends CONFIG.ui.journal {
    async _prepareDirectoryContext(context, options) {
      await super._prepareDirectoryContext(context, options);
      context.tree = pruneTree(context.tree, false);
    }
  }

  return { ChallengeDirectory, FilteredJournalDirectory };
}

Hooks.once("init", () => {
  CONFIG.JournalEntryPage.dataModels[TYPE] = InfluenceModel;

  const { ChallengeDirectory, FilteredJournalDirectory } = defineDirectories();
  CONFIG.ui.subsystems = ChallengeDirectory;
  CONFIG.ui.journal = FilteredJournalDirectory;

  // Insert after Journal. TABS order sets button order.
  const Sidebar = foundry.applications.sidebar.Sidebar;
  const entries = Object.entries(Sidebar.TABS);
  entries.splice(entries.findIndex(([k]) => k === "journal") + 1, 0,
    ["subsystems", { tooltip: "Subsystems", icon: "fa-solid fa-comments", gmOnly: true }]);
  Sidebar.TABS = Object.fromEntries(entries);
  console.log(`${MODULE} | spike init`);
});

/** Console helpers for the live tests. */
globalThis.SSM_SPIKE = {
  isChallenge,
  isChallengeFolder,
  TYPE,
  mountPanel(parentSelector = "#ui-top", where = "append") {
    document.getElementById("ssm-spike-panel")?.remove();
    const el = document.createElement("section");
    el.id = "ssm-spike-panel";
    el.innerHTML = "<strong>Spike panel</strong><div>Influence: Society, Diplomacy</div>";
    document.querySelector(parentSelector)[where](el);
    return el;
  },
};
