import { MODULE } from "../../constants.js";
import { challengePage } from "../../registry.js";
import { addRow, clampCounters, DURATIONS, EFFECT_TYPES, LORE, mergeForm, MODIFIER_KINDS, PERCEPTION, QUICK_DC_AMOUNTS, pickFields, removeRow, setEffectAmount } from "./data.js";

const { DocumentSheetV2, HandlebarsApplicationMixin } = foundry.applications.api;

const CHALLENGE_TAB = "challenge";
const loc = (key) => game.i18n.localize(key);
const labels = (values, prefix) => Object.fromEntries(values.map((value) => [value, loc(`SSM.Influence.${prefix}.${value}`)]));

/** The GM sheet. It belongs to the journal entry, whose name is the challenge name; the data lives on the typed page. */
export class InfluenceSheet extends HandlebarsApplicationMixin(DocumentSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["ssm-sheet"],
    viewPermission: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER,
    position: { width: 760, height: 800 },
    window: { resizable: true, icon: "fa-solid fa-comments" },
    form: { submitOnChange: true, closeOnSubmit: false },
    actions: {
      selectTab: InfluenceSheet.#onSelectTab,
      addRow: InfluenceSheet.#onAddRow,
      removeRow: InfluenceSheet.#onRemoveRow,
      quickDc: InfluenceSheet.#onQuickDc,
    },
  };

  static PARTS = {
    form: { template: `modules/${MODULE}/templates/influence-sheet.hbs`, scrollable: [".ssm-body"] },
  };

  #tab = CHALLENGE_TAB;

  /** Above zero while this sheet is saving, so its own updates can redraw it. */
  #saving = 0;

  /** True when an outside update was held back to protect an open editor, so the form is out of date. */
  #stale = false;

  get page() {
    return challengePage(this.document);
  }

  get title() {
    return this.document.name;
  }

  get #source() {
    return this.page.toObject().system;
  }

  /* -------------------------------------------- */

  /** An outside update must not redraw the sheet while an editor is open: the redraw would throw the unsaved text away. */
  _canRender(options) {
    if (options.renderContext && !this.#saving && this.element?.querySelector("prose-mirror.active")) {
      this.#stale = true;
      return false;
    }
    const result = super._canRender(options);
    if (result !== false) this.#stale = false;
    return result;
  }

  /** Catch up on anything held back once the editor closes. */
  async _onFirstRender(context, options) {
    await super._onFirstRender(context, options);
    this.element.addEventListener("close", (event) => {
      if (this.#stale && event.target.matches("prose-mirror")) this.render();
    });
  }

  async #whileSaving(save) {
    this.#saving++;
    try {
      return await save();
    } finally {
      this.#saving--;
    }
  }

  /* -------------------------------------------- */

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const system = this.#source;
    if (!system.npcs.some((npc) => npc.id === this.#tab)) this.#tab = CHALLENGE_TAB;

    const skills = Object.fromEntries(Object.entries(CONFIG.PF2E.skills).map(([slug, skill]) => [slug, loc(skill.label)]));
    const perception = { [PERCEPTION]: loc("PF2E.PerceptionLabel"), ...skills };
    const influenceSkills = { ...skills, [LORE]: loc("SSM.Influence.Lore") };
    const counterChoices = { "": loc("SSM.Influence.ChooseCounter"), ...Object.fromEntries(system.counters.map((c) => [c.id, c.name || loc("SSM.Influence.UnnamedCounter")])) };

    const enrich = (html) => foundry.applications.ux.TextEditor.implementation.enrichHTML(html, { relativeTo: this.document, secrets: true });
    const skillLabel = (row) => (row.skill === LORE ? `${row.lore || loc("SSM.Influence.Lore")}` : perception[row.skill] ?? row.skill);

    const npcView = (npc, n) => {
      const path = `npcs.${n}`;
      const skillOptions = Object.fromEntries([...npc.discovery, ...npc.influence].map((row) => [row.id, skillLabel(row)]));
      return {
        ...npc,
        path,
        traitsValue: npc.traits.join(","),
        tabLabel: npc.name || `${loc("SSM.Influence.NPC")} ${n + 1}`,
        canRemove: system.npcs.length > 1,
        discovery: npc.discovery.map((row, i) => ({ ...row, path: `${path}.discovery.${i}` })),
        influence: npc.influence.map((row, i) => ({ ...row, path: `${path}.influence.${i}`, isLore: row.skill === LORE })),
        thresholds: npc.thresholds.map((row, i) => ({ ...row, path: `${path}.thresholds.${i}` })),
        modifiers: npc.modifiers.map((modifier, i) => ({
          ...modifier,
          path: `${path}.modifiers.${i}`,
          listPath: `${path}.modifiers.${i}.effects`,
          effects: modifier.effects.map((effect, e) => ({
            ...effect,
            path: `${path}.modifiers.${i}.effects.${e}`,
            canRemove: modifier.effects.length > 1,
            isDc: effect.type === "dc",
            isCounter: effect.type === "counter",
            isNote: effect.type === "note",
            hasAmount: effect.type !== "note",
            skillOptions,
          })),
        })),
      };
    };

    const npcs = system.npcs.map(npcView);
    return Object.assign(context, {
      name: this.document.name,
      system,
      premiseHtml: await enrich(system.premise),
      gmNotesHtml: await enrich(system.gmNotes),
      counters: system.counters.map((counter, i) => ({
        ...counter,
        path: `counters.${i}`,
        triggers: counter.triggers.map((trigger, t) => ({ ...trigger, path: `counters.${i}.triggers.${t}` })),
      })),
      npcs,
      activeNpc: npcs.find((npc) => npc.id === this.#tab) ?? null,
      onChallengeTab: this.#tab === CHALLENGE_TAB,
      tabs: npcs.map((npc) => ({ id: npc.id, label: npc.tabLabel, active: npc.id === this.#tab })),
      statusLabel: loc(`SSM.Influence.Status.${system.run.status}`),
      quickDcAmounts: QUICK_DC_AMOUNTS.map((amount) => ({ amount, label: amount > 0 ? `+${amount}` : `${amount}`.replace("-", "−") })),
      choices: {
        discovery: perception,
        influence: influenceSkills,
        kinds: labels(MODIFIER_KINDS, "Kind"),
        durations: labels(DURATIONS, "Duration"),
        effects: labels(EFFECT_TYPES, "Effect"),
        counters: counterChoices,
      },
    });
  }

  /* -------------------------------------------- */

  /** The form names follow the data's own paths, so the form can be merged straight into the source. */
  _prepareSubmitData(event, form, formData, updateData) {
    let { name, ...fields } = this._processFormData(event, form, formData);
    // A form behind an outside update would undo it, so save only what the user is writing.
    if (this.#stale) {
      const target = event?.target?.name;
      const open = [...form.querySelectorAll("prose-mirror.active")].map((editor) => editor.name);
      fields = pickFields(fields, [...open, target].filter(Boolean));
      if (target !== "name") name = this.document.name;
    }
    const { premise, gmNotes, rounds, npcs, counters } = mergeForm(this.#source, fields);
    const system = { premise, gmNotes, rounds, npcs, counters };
    const invalid = clampCounters(system);
    if (invalid.length) ui.notifications.warn("SSM.Influence.CounterLimits", { localize: true });
    this.page.validate({ changes: { system }, clean: true, fallback: false });
    return { name: name?.trim() || this.document.name, system };
  }

  async _processSubmitData(event, form, { name, system }, options = {}) {
    return this.#whileSaving(async () => {
      if (name !== this.document.name) await this.document.update({ name });
      const updated = await this.page.update({ system }, options);
      return updated ? { updated: this.document } : {};
    });
  }

  /** Save what's in the form, then change a copy of the source and save that. */
  async #edit(change) {
    await this.submit();
    const system = this.#source;
    if (change(system) === false) return;
    await this.#whileSaving(() => this.page.update({ "system.npcs": system.npcs, "system.counters": system.counters }));
  }

  /* -------------------------------------------- */

  static async #onSelectTab(event, target) {
    await this.submit();
    this.#tab = target.dataset.tab;
    return this.render();
  }

  static async #onAddRow(event, target) {
    const { list } = target.dataset;
    let added;
    await this.#edit((system) => {
      added = addRow(system, list);
    });
    if (list === "npcs") {
      this.#tab = added.id;
      return this.render();
    }
  }

  static #onRemoveRow(event, target) {
    return this.#edit((system) => removeRow(system, target.dataset.path));
  }

  static #onQuickDc(event, target) {
    return this.#edit((system) => setEffectAmount(system, target.dataset.path, Number(target.dataset.amount)));
  }
}
