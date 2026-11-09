import { MODULE } from "../../constants.js";
import { challengePage } from "../../registry.js";
import { pendingItems, skillLabel } from "./pending-view.js";
import { adjustResult, confirmResult, ignoreResult, writeChallenge } from "./state.js";
import { advanceRound, changePoints, currentDc, endRun, loreSlug, resetRun, startRun, toggleActed, toggleReveal, undoRound } from "./run.js";
import { loreStatistic } from "../../lore-statistic.js";
import { buildRollOption, LINK_ROLL_ID } from "../../roll-option.js";
import { addRow, applyForm, clampCounters, DURATIONS, EFFECT_TYPES, LORE, MODIFIER_KINDS, PERCEPTION, QUICK_DC_AMOUNTS, pickFields, removeRow, setEffectAmount } from "./data.js";

const { DocumentSheetV2, HandlebarsApplicationMixin } = foundry.applications.api;

const CHALLENGE_TAB = "challenge";
const PENDING_TEMPLATE = `modules/${MODULE}/templates/pending-list.hbs`;
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
      setMode: InfluenceSheet.#onSetMode,
      startRun: InfluenceSheet.#onStartRun,
      endRun: InfluenceSheet.#onEndRun,
      resetRun: InfluenceSheet.#onResetRun,
      advanceRound: InfluenceSheet.#onAdvanceRound,
      undoRound: InfluenceSheet.#onUndoRound,
      changePoints: InfluenceSheet.#onChangePoints,
      toggleReveal: InfluenceSheet.#onToggleReveal,
      toggleActed: InfluenceSheet.#onToggleActed,
      rollSkill: InfluenceSheet.#onRollSkill,
      postLink: InfluenceSheet.#onPostLink,
      applyResult: InfluenceSheet.#onApplyResult,
      adjustResult: InfluenceSheet.#onAdjustResult,
      ignoreResult: InfluenceSheet.#onIgnoreResult,
    },
  };

  static PARTS = {
    form: { template: `modules/${MODULE}/templates/influence-sheet.hbs`, scrollable: [".ssm-body"], templates: [PENDING_TEMPLATE] },
  };

  #tab = CHALLENGE_TAB;

  /** Edit or Run. Null until the user picks: a running challenge opens in Run mode. */
  #mode = null;

  /** The id of the actor chosen to roll, or null for the default. */
  #rollAs = null;

  /** Above zero while this sheet is saving, so its own updates can redraw it. */
  #saving = 0;

  /** True when an outside update was held back to protect an open editor, so the form is out of date. */
  #stale = false;

  /** True while a pointer press that began on this sheet is held down. */
  #pressing = false;

  /** Ends the listeners for the current press. */
  #pressEnd = null;

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

  /** True while the user is writing in a text field or an open editor. */
  get #isWriting() {
    const active = document.activeElement;
    const typing = !!this.element?.contains(active) && active.matches("input:not([type=checkbox]), textarea");
    return typing || !!this.element?.querySelector("prose-mirror.active");
  }

  /** An outside update must not redraw the sheet while the user is writing: the redraw would throw the unsaved text away. */
  _canRender(options) {
    // A redraw during a press would replace the button being pressed and lose the click. The end of the press catches up.
    if (options.renderContext && this.#pressing) {
      this.#stale = true;
      return false;
    }
    if (options.renderContext && !this.#saving && this.#isWriting) {
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
    this.element.addEventListener("pointerdown", () => this.#startPress());
    this.element.addEventListener("focusout", (event) => {
      // The window losing focus also fires this, with the field still active: the user is still writing.
      if (document.activeElement !== event.target && !this.#pressing) this.#catchUp();
    });
  }

  /** A press ends on release, cancel or the window losing focus. A pointer moving with no button down catches a release that was missed. */
  #startPress() {
    this.#pressEnd?.abort();
    this.#pressing = true;
    const controller = this.#pressEnd = new AbortController();
    const end = () => {
      controller.abort();
      // Wait a moment: the click comes after the pointer is released, and it must find its button.
      setTimeout(() => {
        if (this.#pressEnd !== controller) return;
        this.#pressing = false;
        this.#catchUp();
      }, 100);
    };
    const { signal } = controller;
    for (const type of ["pointerup", "pointercancel", "blur"]) window.addEventListener(type, end, { signal });
    window.addEventListener("pointermove", (event) => event.buttons === 0 && end(), { signal });
  }

  /** Redraw if an update was held back and nothing is being written or saved. A save in progress redraws the sheet itself. */
  #catchUp() {
    if (this.#stale && !this.#saving && !this.#pressing && !this.#isWriting) this.render();
  }

  async #whileSaving(save) {
    this.#saving++;
    try {
      return await save();
    } finally {
      this.#saving--;
      this.#catchUp();
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
    const mode = this.#currentMode;
    return Object.assign(context, {
      isRun: mode === "run",
      isEdit: mode === "edit",
      run: mode === "run" ? this.#runContext(system) : null,
      pendingTemplate: PENDING_TEMPLATE,
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
      runActive: system.run.status === "active",
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

  get #currentMode() {
    return this.#mode ?? (this.page.system.run.status === "active" ? "run" : "edit");
  }

  /** The PCs on the party's roster, as PF2e counts them, plus the actor of a selected token. */
  get #rollableActors() {
    const isPC = (actor) => actor.alliance === "party" && actor.isOfType("character") && !["eidolon", "minion"].some((trait) => actor.system.traits?.value?.includes(trait));
    const actors = (game.actors.party?.members ?? []).filter(isPC);
    const selected = canvas.ready ? canvas.tokens.controlled[0]?.actor : null;
    if (selected?.isOfType("character", "npc") && !actors.includes(selected)) actors.push(selected);
    return actors;
  }

  #selectedActor() {
    const actors = this.#rollableActors;
    const controlled = canvas.ready ? canvas.tokens.controlled[0]?.actor : null;
    return actors.find((actor) => actor.id === this.#rollAs) ?? actors.find((actor) => actor === controlled) ?? actors[0] ?? null;
  }

  /** The Run-mode view of the challenge. */
  #runContext(system) {
    const status = system.run.status;
    const canRun = game.user.isActiveGM;
    const active = status === "active";
    const actors = this.#rollableActors;
    const selected = this.#selectedActor();
    const rollRows = (npc, rows, kind) => rows.map((row) => ({ ...row, kind, npcId: npc.id, label: skillLabel(row), currentDc: currentDc(npc, row) }));
    return {
      canRun,
      rollable: active && canRun,
      canStart: status === "inactive",
      canEnd: active,
      canReset: status !== "inactive",
      roundLabel: active || status === "finished" ? game.i18n.format("SSM.Influence.Round", system.rounds) : loc("SSM.Influence.NotStarted"),
      roundLength: system.rounds.length,
      canAdvance: active && system.rounds.current < system.rounds.max,
      canUndoRound: active && system.run.roundHistory.length > 0,
      party: [...new Set([...actors.map((actor) => actor.id), ...system.run.acted])].map((id) => {
        const actor = game.actors.get(id);
        return { id, name: actor?.name ?? id, acted: system.run.acted.includes(id) };
      }),
      actors: actors.map((actor) => ({ id: actor.id, name: actor.name, selected: actor === selected })),
      pending: pendingItems(system),
      npcs: system.npcs.map((npc, n) => ({
        id: npc.id,
        name: npc.name || `${loc("SSM.Influence.NPC")} ${n + 1}`,
        points: npc.points,
        discovery: rollRows(npc, npc.discovery, "discover"),
        influence: rollRows(npc, npc.influence, "influence"),
        thresholds: npc.thresholds.map((row) => ({ ...row, label: `${row.points}: ${row.playerText || row.gmText}` })),
        modifiers: npc.modifiers.map((row) => ({ ...row, label: row.name || loc("SSM.Influence.Modifiers") })),
      })),
      counters: system.counters.map((counter) => ({ ...counter, label: counter.name || loc("SSM.Influence.UnnamedCounter") })),
      log: system.run.log.slice().reverse(),
    };
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
    const system = this.#source;
    applyForm(system, fields);
    const invalid = clampCounters(system);
    if (invalid.length) ui.notifications.warn("SSM.Influence.CounterLimits", { localize: true });
    const { premise, gmNotes, rounds, npcs, counters } = system;
    this.page.validate({ changes: { system: { premise, gmNotes, rounds, npcs, counters } }, clean: true, fallback: false });
    return { name: name?.trim() || this.document.name, fields };
  }

  async _processSubmitData(event, form, { name, fields }, options = {}) {
    return this.#whileSaving(async () => {
      if (name !== this.document.name) await this.document.update({ name });
      // Merge at write time, so the form lands on top of any run change queued before it.
      await writeChallenge(this.page, (system) => {
        applyForm(system, fields);
        clampCounters(system);
      }, options);
      return { updated: this.document };
    });
  }

  /** The Roll-as list isn't challenge data, so it must not save the form. */
  _onChangeForm(formConfig, event) {
    if (event.target.matches?.("[data-roll-as]")) {
      this.#rollAs = event.target.value;
      return;
    }
    super._onChangeForm(formConfig, event);
  }

  /** Save what's in the form, then change a copy of the source and save that. */
  async #edit(change) {
    await this.submit();
    await this.#whileSaving(() => writeChallenge(this.page, change));
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

  static async #onSetMode(event, target) {
    if (this.#currentMode === "edit") await this.submit();
    this.#mode = target.dataset.mode;
    return this.render();
  }

  /** Only the active GM's client writes run state (spec section 4). */
  #run(change) {
    if (!game.user.isActiveGM) return;
    return writeChallenge(this.page, change);
  }

  static #onStartRun() {
    return this.#run(startRun);
  }

  static #onEndRun() {
    return this.#run(endRun);
  }

  static async #onResetRun() {
    const yes = await foundry.applications.api.DialogV2.confirm({
      window: { title: "SSM.Influence.ResetTitle" },
      content: `<p>${loc("SSM.Influence.ResetConfirm")}</p>`,
      rejectClose: false,
    });
    if (yes) return this.#run(resetRun);
  }

  static #onAdvanceRound() {
    return this.#run(advanceRound);
  }

  static #onUndoRound() {
    return this.#run(undoRound);
  }

  static #onChangePoints(event, target) {
    return this.#run((system) => changePoints(system, target.dataset.npc, Number(target.dataset.delta)));
  }

  static #onToggleReveal(event, target) {
    return this.#run((system) => toggleReveal(system, target.dataset.id, target.dataset.label));
  }

  static #onToggleActed(event, target) {
    return this.#run((system) => toggleActed(system, target.dataset.id));
  }

  static #onApplyResult(event, target) {
    if (game.user.isActiveGM) return confirmResult(this.page, target.dataset.id);
  }

  static #onAdjustResult(event, target) {
    if (game.user.isActiveGM) return adjustResult(this.page, target.dataset.id);
  }

  static #onIgnoreResult(event, target) {
    if (game.user.isActiveGM) return ignoreResult(this.page, target.dataset.id);
  }

  /* -------------------------------------------- */

  /** The NPC and skill row a roll button belongs to, plus what a roll needs from them. */
  #rollTarget(target) {
    const { npc: npcId, kind, id } = target.dataset;
    const npc = this.page.system.npcs.find((candidate) => candidate.id === npcId);
    const row = npc?.[kind === "influence" ? "influence" : "discovery"].find((candidate) => candidate.id === id);
    if (!row) return null;
    const slug = row.skill === LORE ? loreSlug(row.lore || loc("SSM.Influence.Lore"), game.pf2e.system.sluggify) : row.skill;
    const option = (rollId) => buildRollOption({ kind, challengeId: this.document.id, npcId, entryId: id, rollId });
    const npcLabel = npc.name || loc("SSM.Influence.NPC");
    return { npc, row, slug, kind, option, npcLabel, dc: currentDc(npc, row), showDC: !!row.showDC };
  }

  static async #onRollSkill(event, target) {
    if (!game.user.isActiveGM || this.page.system.run.status !== "active") return;
    const roll = this.#rollTarget(target);
    if (!roll) return;
    const actor = this.#selectedActor();
    if (!actor) return ui.notifications.warn("SSM.Influence.NoPCSelected", { localize: true });
    const statistic = roll.slug === PERCEPTION ? actor.perception : roll.row.skill === LORE ? loreStatistic(actor, roll.slug, skillLabel(roll.row)) : actor.skills?.[roll.slug];
    if (!statistic) return ui.notifications.warn(game.i18n.format("SSM.Influence.MissingSkill", { actor: actor.name, skill: skillLabel(roll.row) }));
    return statistic.roll({
      event,
      // Pass a plain number with no slug or statistic, so PF2e doesn't look for an opposing actor. That would reveal the DC.
      dc: { value: roll.dc, visible: roll.showDC },
      label: game.i18n.format(`SSM.Influence.RollLabel.${roll.kind}`, { npc: roll.npcLabel }),
      extraRollOptions: [roll.option(foundry.utils.randomID())],
      messageMode: "public",
    });
  }

  static #onPostLink(event, target) {
    if (!game.user.isActiveGM || this.page.system.run.status !== "active") return;
    const roll = this.#rollTarget(target);
    if (!roll) return;
    const params = [roll.slug, `dc:${roll.dc}`, `showDC:${roll.showDC ? "all" : "gm"}`, `options:${roll.option(LINK_ROLL_ID)}`];
    const heading = game.i18n.format(`SSM.Influence.RollLabel.${roll.kind}`, { npc: roll.npcLabel });
    const content = `<p><strong>${foundry.utils.escapeHTML(heading)}</strong></p><p>@Check[${params.join("|")}]</p>`;
    return ChatMessage.create({ content }, { messageMode: "public" });
  }
}
