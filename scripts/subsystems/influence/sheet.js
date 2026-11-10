import { MODULE } from "../../constants.js";
import { challengePage } from "../../registry.js";
import { hidePanel, panelBlockedBy, panelState, showPanel } from "../../panel/activation.js";
import { partyPCs } from "../../party.js";
import { skillLabel } from "./skill-label.js";
import { announceTriggers, writeChallenge } from "./state.js";
import { advanceRound, applyModifier, canApplyModifier, changeCounter, changePoints, currentDc, cycleThresholdReveal, endRun, resetRun, restoreModifier, startRun, toggleActed, toggleModifier, toggleReached, toggleReveal, undoRound } from "./run.js";
import { LINK_ROLL_ID } from "../../roll-option.js";
import { rollCheck, rollTarget } from "./roll.js";
import { addRow, applyForm, clampCounters, DURATIONS, EFFECT_TYPES, isUniversalDiscovery, isUniversalInfluence, limitCounter, LORE, MODIFIER_KINDS, PERCEPTION, nextThresholdReveal, QUICK_DC_AMOUNTS, pickFields, removeRow, setEffectAmount, THRESHOLD_REVEALS } from "./data.js";

const { DocumentSheetV2, HandlebarsApplicationMixin } = foundry.applications.api;

const CHALLENGE_TAB = "challenge";
const loc = (key) => game.i18n.localize(key);
/** The eye button's look for each step of a threshold's reveal. */
const THRESHOLD_EYE = { hidden: { icon: "fa-eye-slash", pressed: "false" }, points: { icon: "fa-eye-low-vision", pressed: "mixed" }, full: { icon: "fa-eye", pressed: "true" } };

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
      showPanel: InfluenceSheet.#onShowPanel,
      hidePanel: InfluenceSheet.#onHidePanel,
      resetRun: InfluenceSheet.#onResetRun,
      advanceRound: InfluenceSheet.#onAdvanceRound,
      undoRound: InfluenceSheet.#onUndoRound,
      changePoints: InfluenceSheet.#onChangePoints,
      changeCounter: InfluenceSheet.#onChangeCounter,
      toggleModifier: InfluenceSheet.#onToggleModifier,
      applyModifier: InfluenceSheet.#onApplyModifier,
      restoreModifier: InfluenceSheet.#onRestoreModifier,
      toggleReached: InfluenceSheet.#onToggleReached,
      toggleReveal: InfluenceSheet.#onToggleReveal,
      cycleThresholdReveal: InfluenceSheet.#onCycleThresholdReveal,
      toggleActed: InfluenceSheet.#onToggleActed,
      rollSkill: InfluenceSheet.#onRollSkill,
      postLink: InfluenceSheet.#onPostLink,
    },
  };

  static PARTS = {
    form: { template: `modules/${MODULE}/templates/influence-sheet.hbs`, scrollable: [".ssm-body"] },
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
    const perception = { [PERCEPTION]: loc("PF2E.PerceptionLabel"), ...skills, [LORE]: loc("SSM.Influence.Lore") };
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
        discovery: npc.discovery.map((row, i) => ({ ...row, path: `${path}.discovery.${i}`, isLore: row.skill === LORE, universal: isUniversalDiscovery(row) })),
        influence: npc.influence.map((row, i) => ({ ...row, path: `${path}.influence.${i}`, isLore: row.skill === LORE, universal: isUniversalInfluence(row) })),
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
        thresholdReveals: labels(THRESHOLD_REVEALS, "ThresholdReveal"),
      },
    });
  }

  get #currentMode() {
    return this.#mode ?? (this.page.system.run.status === "inactive" ? "edit" : "run");
  }

  /** The PCs on the party's roster, as PF2e counts them, plus the actor of a selected token. */
  get #rollableActors() {
    const actors = partyPCs();
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
    const canChange = active && canRun;
    const panel = panelState();
    const onPanel = panel.id === this.document.id;
    const rollRows = (npc, rows, kind) => rows.map((row) => {
      const dc = currentDc(system, npc, row);
      const label = skillLabel(row);
      const universal = kind === "discover" ? isUniversalDiscovery(row) : isUniversalInfluence(row);
      // The chip shows the name and current DC. The tooltip adds the base DC and whether the row is a decoy.
      const tooltip = [loc("SSM.Influence.RollFor"), game.i18n.format("SSM.Influence.BaseDc", { dc: row.dc })];
      if (row.decoy && !universal) tooltip.push(loc("SSM.Influence.Decoy"));
      return {
        ...row, kind, npcId: npc.id, label, universal, currentDc: dc, dcChanged: dc !== row.dc, dcUp: dc > row.dc,
        shown: universal || row.revealed,
        rollLabel: game.i18n.format("SSM.Influence.RollSkill", { skill: label, dc }),
        postLabel: game.i18n.format("SSM.Influence.PostSkill", { skill: label }),
        tooltip: tooltip.join(". "),
      };
    });
    return {
      canRun,
      rollable: active && canRun,
      canStart: status === "inactive",
      canEnd: active,
      canReset: status !== "inactive",
      canHidePanel: active && onPanel && !panel.hidden,
      canShowPanel: active && (!onPanel || !!panel.hidden),
      roundLabel: active || status === "finished" ? game.i18n.format("SSM.Influence.Round", system.rounds) : loc("SSM.Influence.NotStarted"),
      roundLength: system.rounds.length,
      canAdvance: active && system.rounds.current < system.rounds.max,
      canUndoRound: active && system.run.roundHistory.length > 0,
      party: [...new Set([...actors.map((actor) => actor.id), ...system.run.acted])].map((id) => {
        const actor = game.actors.get(id);
        return { id, name: actor?.name ?? id, acted: system.run.acted.includes(id) };
      }),
      actors: actors.map((actor) => ({ id: actor.id, name: actor.name, selected: actor === selected })),
      npcs: system.npcs.map((npc, n) => ({
        id: npc.id,
        name: npc.name || `${loc("SSM.Influence.NPC")} ${n + 1}`,
        points: npc.points,
        discovery: rollRows(npc, npc.discovery, "discover"),
        influence: rollRows(npc, npc.influence, "influence"),
        thresholds: npc.thresholds.map((row) => ({
          ...row, text: row.playerText || row.gmText, canChange,
          textShown: row.reveal === "full",
          revealIcon: THRESHOLD_EYE[row.reveal]?.icon ?? THRESHOLD_EYE.hidden.icon,
          revealPressed: THRESHOLD_EYE[row.reveal]?.pressed ?? "false",
          revealTooltip: game.i18n.format("SSM.Influence.ThresholdReveal.Tooltip", { now: loc(`SSM.Influence.ThresholdReveal.${row.reveal}`), next: loc(`SSM.Influence.ThresholdReveal.${nextThresholdReveal(row.reveal)}`) }),
          reachedTooltip: loc(row.reached ? "SSM.Influence.ReachedClear" : "SSM.Influence.ReachedSet"),
        })),
        modifiers: npc.modifiers.map((row) => this.#modifierView(system, npc, row, canChange)),
      })),
      counters: system.counters.map((counter) => ({
        ...counter,
        label: counter.name || loc("SSM.Influence.UnnamedCounter"),
        rangeLabel: counter.min === null && counter.max === null ? "" : `(${counter.min ?? "−∞"} to ${counter.max ?? "∞"})`,
        canAdd: canChange && limitCounter(counter, counter.value + 1) !== counter.value,
        canRemove: canChange && limitCounter(counter, counter.value - 1) !== counter.value,
      })),
    };
  }

  /** One modifier entry as Run mode shows it. */
  #modifierView(system, npc, row, canChange) {
    const state = row.spent ? "spent" : row.active ? "on" : "off";
    const label = row.name || loc("SSM.Influence.UnnamedEntry");
    return {
      ...row,
      label,
      npc,
      kindLabel: loc(`SSM.Influence.Kind.${row.kind}`),
      durationLabel: loc(`SSM.Influence.Duration.${row.duration}`),
      stateClass: state,
      pressed: state === "on",
      stateTooltip: loc(`SSM.Influence.StateClick.${state}`),
      stateLabel: loc(`SSM.Influence.State.${state}`),
      hasApply: row.effects.some((effect) => effect.type !== "dc"),
      canApply: canChange && canApplyModifier(row),
      canChange,
      effectsText: row.effects.map((effect) => this.#effectText(system, npc, effect)).join("; "),
    };
  }

  #effectText(system, npc, effect) {
    const amount = effect.amount > 0 ? `+${effect.amount}` : `${effect.amount}`.replace("-", "−");
    const rows = [...npc.discovery, ...npc.influence].filter((row) => effect.skills.includes(row.id));
    const skills = effect.allSkills ? loc("SSM.Influence.AllSkills") : rows.map(skillLabel).join(", ");
    const counter = system.counters.find((candidate) => candidate.id === effect.counterId);
    const counterName = counter ? counter.name || loc("SSM.Influence.UnnamedCounter") : loc("SSM.Influence.ChooseCounter");
    return game.i18n.format(`SSM.Influence.EffectText.${effect.type}`, { amount, skills, counter: counterName, note: effect.note });
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
  async #run(change) {
    if (!game.user.isActiveGM) return;
    announceTriggers(await writeChallenge(this.page, change));
  }

  /** Only one challenge can be active. Warns and returns true if another one holds the panel. */
  #panelBlocked() {
    const other = panelBlockedBy(this.document);
    if (other) ui.notifications.warn(game.i18n.format("SSM.Panel.Blocked", { name: other.name }));
    return !!other;
  }

  static async #onStartRun() {
    if (!game.user.isActiveGM || this.#panelBlocked()) return;
    await this.#run(startRun);
    return showPanel(this.document);
  }

  static #onShowPanel() {
    if (!this.#panelBlocked()) return showPanel(this.document);
  }

  static #onHidePanel() {
    return hidePanel();
  }

  static async #onEndRun() {
    const yes = await foundry.applications.api.DialogV2.confirm({
      window: { title: "SSM.Influence.EndTitle" },
      content: `<p>${loc("SSM.Influence.EndConfirm")}</p>`,
      rejectClose: false,
    });
    if (yes) return this.#run(endRun);
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

  static #onChangeCounter(event, target) {
    return this.#run((system) => changeCounter(system, target.dataset.id, Number(target.dataset.delta)));
  }

  static #onToggleModifier(event, target) {
    return this.#run((system) => toggleModifier(system, target.dataset.npc, target.dataset.id));
  }

  static #onApplyModifier(event, target) {
    return this.#run((system) => applyModifier(system, target.dataset.npc, target.dataset.id));
  }

  static #onRestoreModifier(event, target) {
    return this.#run((system) => restoreModifier(system, target.dataset.npc, target.dataset.id));
  }

  static #onToggleReached(event, target) {
    return this.#run((system) => toggleReached(system, target.dataset.npc, target.dataset.id));
  }

  static #onToggleReveal(event, target) {
    return this.#run((system) => toggleReveal(system, target.dataset.id));
  }

  static #onCycleThresholdReveal(event, target) {
    return this.#run((system) => cycleThresholdReveal(system, target.dataset.npc, target.dataset.id));
  }

  static #onToggleActed(event, target) {
    return this.#run((system) => toggleActed(system, target.dataset.id));
  }

  /* -------------------------------------------- */

  /** The NPC and skill row a roll button belongs to, plus what a roll needs from them. */
  #rollTarget(target) {
    const { npc: npcId, kind, id } = target.dataset;
    const { system } = this.page;
    const npc = system.npcs.find((candidate) => candidate.id === npcId);
    const row = npc?.[kind === "influence" ? "influence" : "discovery"].find((candidate) => candidate.id === id);
    if (!row) return null;
    return rollTarget({ challengeId: this.document.id, npc, row, kind, dc: currentDc(system, npc, row) });
  }

  static async #onRollSkill(event, target) {
    if (!game.user.isActiveGM || this.page.system.run.status !== "active") return;
    const roll = this.#rollTarget(target);
    if (!roll) return;
    const actor = this.#selectedActor();
    if (!actor) return ui.notifications.warn("SSM.Influence.NoPCSelected", { localize: true });
    return rollCheck(actor, roll, { event, messageMode: "public" });
  }

  static #onPostLink(event, target) {
    if (!game.user.isActiveGM || this.page.system.run.status !== "active") return;
    const roll = this.#rollTarget(target);
    if (!roll) return;
    const params = [roll.slug, `dc:${roll.dc}`, "showDC:gm", `options:${roll.option(LINK_ROLL_ID)}`];
    const heading = game.i18n.format(`SSM.Influence.RollLabel.${roll.kind}`, { npc: roll.npcLabel });
    const content = `<p><strong>${foundry.utils.escapeHTML(heading)}</strong></p><p>@Check[${params.join("|")}]</p>`;
    return ChatMessage.create({ content }, { messageMode: "public" });
  }
}
