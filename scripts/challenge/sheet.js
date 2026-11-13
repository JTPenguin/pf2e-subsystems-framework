import { MODULE } from "../constants.js";
import { challengePage } from "../registry.js";
import { hidePanel, panelState, takePanel } from "../panel/activation.js";
import { partyPCs } from "../party.js";
import { actionName, skillKeyLabel, skillLabel, subjectName } from "./skill-label.js";
import { announceTriggers, writeChallenge } from "./state.js";
import { advanceRound, canAdvanceRound, hasRounds, canUndoRound, changeCounter, counterValueOf, currentDc, cycleThresholdReveal, endRun, resetRun, restoreModifier, startRun, toggleActed, toggleComplete, toggleModifier, toggleReached, toggleReveal, undoRound } from "./run.js";
import { LINK_ROLL_ID } from "../roll-option.js";
import { rollCheck, rollTarget } from "./roll.js";
import { addRow, allCounters, applyForm, BOTH_WAYS, categoryKey, clampTracks, collapseAllAction, counterMoves, counterValueText, EDITABLE, entryListPath, groupByCategory, isDecoyCheck, moveCounter, moveModifier, moveSubject, nextThresholdReveal, pickFields, removeEntry, setCounterNote, subjectGroups } from "./data.js";
import { ActionWindow, CounterWindow, ModifierWindow, SubjectWindow, ThresholdWindow } from "./entry-window.js";
import { markDescriptionFields } from "./description-field.js";

const { DocumentSheetV2, HandlebarsApplicationMixin } = foundry.applications.api;

const loc = (key) => game.i18n.localize(key);
/** The eye button's look for each step of a threshold's reveal. */
const THRESHOLD_EYE = { hidden: { icon: "fa-eye-slash", pressed: "false" }, points: { icon: "fa-eye-low-vision", pressed: "mixed" }, full: { icon: "fa-eye", pressed: "true" } };

/** The user flag holding which subjects this user has collapsed on the sheet, by subject id (spec 14.8). */
const COLLAPSED_FLAG = "collapsedSubjects";
const isCollapsed = (subjectId) => !!game.user.getFlag(MODULE, COLLAPSED_FLAG)?.[subjectId];

/** The user flag holding which counters this user has collapsed on the sheet, by counter id. Like a subject, a counter starts open. */
const COLLAPSED_COUNTERS_FLAG = "collapsedCounters";
const isCounterCollapsed = (counterId) => !!game.user.getFlag(MODULE, COLLAPSED_COUNTERS_FLAG)?.[counterId];

/** A category bar's collapse-all button, from what it would do. */
const collapseAllView = (action) => !action ? null
  : action === "collapse" ? { icon: "fa-angles-up", label: "SSM.Challenge.CollapseAll" }
  : { icon: "fa-angles-down", label: "SSM.Challenge.ExpandAll" };

/** Each kind of entry's window. */
const WINDOWS = { subjects: SubjectWindow, actions: ActionWindow, counters: CounterWindow, modifiers: ModifierWindow, thresholds: ThresholdWindow };

/** The action cards, modifier rows and threshold rows this user has opened on the sheet, as "pageId:entryId" ("pageId:counterId:thresholdId" for a threshold). Each user's own, kept until the page reloads, as on the panel. */
const openActions = new Set();

/**
 * Modifier views as the GM window's sections, by category (spec 14.7): the blank category first, with no heading,
 * then the preset's suggestions, then other labels in order of first use. Each has a key, a heading, its stripe colour and its rows.
 * A category with no entries is left out: the Modifiers title's + adds entries.
 */
function modifierGroups(system, views) {
  return groupByCategory(system, views).map((group) => ({ ...group, heading: group.label, stripe: group.colour ? `--ssm-cat: ${group.colour}` : "" }));
}

/** The GM sheet. It belongs to the journal entry, whose name is the challenge name; the data lives on the typed page. */
export class ChallengeSheet extends HandlebarsApplicationMixin(DocumentSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["ssm-sheet"],
    viewPermission: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER,
    position: { width: 760, height: 800 },
    window: { resizable: true, icon: "fa-solid fa-trophy" },
    form: { submitOnChange: true, closeOnSubmit: false },
    actions: {
      addEntry: ChallengeSheet.#onAddEntry,
      removeEntry: ChallengeSheet.#onRemoveEntry,
      editEntry: ChallengeSheet.#onEditEntry,
      toggleComplete: ChallengeSheet.#onToggleComplete,
      toggleCollapse: ChallengeSheet.#onToggleCollapse,
      toggleCollapseAll: ChallengeSheet.#onToggleCollapseAll,
      toggleCounter: ChallengeSheet.#onToggleCounter,
      toggleAction: ChallengeSheet.#onToggleAction,
      toggleModifierDetails: ChallengeSheet.#onToggleAction,
      startRun: ChallengeSheet.#onStartRun,
      endRun: ChallengeSheet.#onEndRun,
      showPanel: ChallengeSheet.#onShowPanel,
      hidePanel: ChallengeSheet.#onHidePanel,
      resetRun: ChallengeSheet.#onResetRun,
      nextRound: ChallengeSheet.#onNextRound,
      previousRound: ChallengeSheet.#onPreviousRound,
      changeCounter: ChallengeSheet.#onChangeCounter,
      toggleModifier: ChallengeSheet.#onToggleModifier,
      restoreModifier: ChallengeSheet.#onRestoreModifier,
      toggleReached: ChallengeSheet.#onToggleReached,
      toggleReveal: ChallengeSheet.#onToggleReveal,
      cycleThresholdReveal: ChallengeSheet.#onCycleThresholdReveal,
      toggleActed: ChallengeSheet.#onToggleActed,
      rollSkill: ChallengeSheet.#onRollSkill,
      postLink: ChallengeSheet.#onPostLink,
    },
  };

  static PARTS = {
    form: { template: `modules/${MODULE}/templates/challenge-sheet.hbs`, scrollable: [".ssm-body"] },
  };

  /** Each action's enriched description, by action id, from the last context. */
  #actionHtml = new Map();

  /** Each subject's enriched description, by subject id, from the last context. */
  #subjectHtml = new Map();

  /** Each threshold's and modifier's enriched description, by "ownerId:rowId" (a counter's id, or a subject's, empty for the challenge's own modifiers). */
  #rowHtml = new Map();

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

  /** PF2e's NPC and hazard sheets are always light (parchment), so this sheet is too, unless the GM picked a theme for it. */
  _initializeApplicationOptions(options) {
    options = super._initializeApplicationOptions(options);
    if (!options.classes.includes("themed")) options.classes.push("themed", "theme-light");
    return options;
  }

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

  /** The window the sheet is in: the main one, or its own when detached. */
  get #window() {
    return this.element?.ownerDocument.defaultView ?? window;
  }

  /** True while the user is writing in a text field or an open editor. */
  get #isWriting() {
    const active = this.#window.document.activeElement;
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
      if (this.#window.document.activeElement !== event.target && !this.#pressing) this.#catchUp();
    });
  }

  /**
   * A press ends on release, cancel or the window losing focus. A pointer moving with no button down catches a release that was missed.
   * The listeners go on the sheet's own window: a detached sheet never gets the main window's pointer events.
   */
  #startPress() {
    const win = this.#window;
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
    for (const type of ["pointerup", "pointercancel", "blur"]) win.addEventListener(type, end, { signal });
    win.addEventListener("pointermove", (event) => event.buttons === 0 && end(), { signal });
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
    const subjectLabel = system.subjectLabel || loc("SSM.Challenge.Subject");
    const enrich = (html) => foundry.applications.ux.TextEditor.implementation.enrichHTML(html, { relativeTo: this.document, secrets: true });
    // Each action's and subject's description, enriched, by id.
    this.#actionHtml = new Map();
    for (const action of system.subjects.flatMap((subject) => subject.actions)) this.#actionHtml.set(action.id, action.description ? await enrich(action.description) : "");
    this.#subjectHtml = new Map();
    for (const subject of system.subjects) this.#subjectHtml.set(subject.id, subject.description ? await enrich(subject.description) : "");
    this.#rowHtml = new Map();
    const rowOwners = [
      ...allCounters(system).map((counter) => [counter.id, counter.thresholds]),
      ["", system.modifiers],
      ...system.subjects.map((subject) => [subject.id, subject.modifiers]),
    ];
    for (const [owner, rows] of rowOwners) for (const row of rows) this.#rowHtml.set(`${owner}:${row.id}`, row.description ? await enrich(row.description) : "");
    return Object.assign(context, {
      run: this.#runContext(system),
      name: this.document.name,
      system,
      subjectsLabel: system.subjectsLabel || loc("SSM.Challenge.Subjects"),
      noSubjects: system.noSubjects || loc("SSM.Challenge.NoSubjects"),
      addSubjectLabel: game.i18n.format("SSM.Challenge.AddSubject", { subject: subjectLabel }),
      gmNotesHtml: await enrich(system.gmNotes),
      runActive: system.run.status === "active",
      isGM: game.user.isGM,
    });
  }

  /** The PCs on the party's roster, as PF2e counts them, plus the actor of a selected token. */
  get #rollableActors() {
    const actors = partyPCs();
    const selected = canvas.ready ? canvas.tokens.controlled[0]?.actor : null;
    if (selected?.isOfType("character", "npc") && !actors.includes(selected)) actors.push(selected);
    return actors;
  }

  /** The actor the Roll as choice names. The player panel's GM rolls use it when no token is selected. */
  get rollAsActor() {
    return this.#selectedActor();
  }

  #selectedActor() {
    const actors = this.#rollableActors;
    const controlled = canvas.ready ? canvas.tokens.controlled[0]?.actor : null;
    return actors.find((actor) => actor.id === this.#rollAs) ?? actors.find((actor) => actor === controlled) ?? actors[0] ?? null;
  }

  /** The sheet's view of the challenge: live play, with each entry's edit and delete buttons. */
  #runContext(system) {
    const status = system.run.status;
    const canRun = game.user.isActiveGM;
    const active = status === "active";
    const actors = this.#rollableActors;
    const selected = this.#selectedActor();
    const canChange = active && canRun;
    const panel = panelState();
    const onPanel = panel.id === this.document.id;
    const party = partyPCs();
    const partyIds = party.map((actor) => actor.id);
    const subjectLabel = system.subjectLabel || loc("SSM.Challenge.Subject");
    const signed = (n) => (n > 0 ? `+${n}` : `${n}`.replace("-", "−"));
    const rollRows = (subject, action) => action.checks.map((row) => {
      const dc = currentDc(system, subject, row);
      const label = skillLabel(row);
      // The chip shows the name and current DC. The tooltip adds the base DC and whether the check is a decoy.
      const tooltip = [loc("SSM.Challenge.RollFor"), game.i18n.format("SSM.Challenge.BaseDc", { dc: row.dc })];
      if (isDecoyCheck(row)) tooltip.push(loc("SSM.Challenge.Decoy"));
      return {
        ...row, subjectId: subject.id, actionId: action.id, label, decoy: isDecoyCheck(row), currentDc: dc, dcChanged: dc !== row.dc, dcUp: dc > row.dc,
        shown: row.revealed,
        rollLabel: game.i18n.format("SSM.Challenge.RollSkill", { skill: label, dc }),
        postLabel: game.i18n.format("SSM.Challenge.PostSkill", { skill: label }),
        tooltip: tooltip.join(". "),
      };
    });
    // On a both-ways track Reached follows the value, so the GM can't click it (spec 14.8).
    // A threshold opens to show its description, secret blocks included. With no name it shows just its points.
    const thresholdRows = (rows, ownerId, direction) => rows.map((row) => ({
      ...row, ownerId, canChange: canChange && direction !== BOTH_WAYS,
      textShown: row.reveal === "full",
      descriptionHtml: this.#rowHtml.get(`${ownerId}:${row.id}`) ?? "",
      openKey: `${ownerId}:${row.id}`,
      open: openActions.has(`${this.page.id}:${ownerId}:${row.id}`),
      dcLabel: row.dc ? game.i18n.format("SSM.Challenge.ThresholdDc", { amount: signed(row.dc) }) : "",
      revealIcon: THRESHOLD_EYE[row.reveal]?.icon ?? THRESHOLD_EYE.hidden.icon,
      revealPressed: THRESHOLD_EYE[row.reveal]?.pressed ?? "false",
      revealTooltip: game.i18n.format("SSM.Challenge.ThresholdReveal.Tooltip", { now: loc(`SSM.Challenge.ThresholdReveal.${row.reveal}`), next: loc(`SSM.Challenge.ThresholdReveal.${nextThresholdReveal(row.reveal)}`) }),
      reachedTooltip: loc(direction === BOTH_WAYS ? "SSM.Challenge.ReachedFollows" : row.reached ? "SSM.Challenge.ReachedClear" : "SSM.Challenge.ReachedSet"),
    }));
    // A counter, the challenge's or a subject's, with its + and − and its thresholds. A per-PC counter lists each party PC, and anyone else who has a value, with the party total by its name (spec 14.8).
    const counterRun = (counter, subjectId = "") => {
      const canMove = (value) => {
        const moves = counterMoves(counter, value);
        return { canAdd: canChange && moves.canAdd, canRemove: canChange && moves.canRemove };
      };
      const pcs = !counter.perPc ? [] : [...new Set([...partyIds, ...Object.keys(counter.valueBy ?? {})])].map((id) => {
        const value = counterValueOf(counter, id);
        return { id, name: game.actors.get(id)?.name ?? id, value, valueText: counterValueText(counter, value), note: counter.noteBy?.[id] ?? "", ...canMove(value) };
      });
      return {
        ...counter,
        subjectId,
        label: counter.name || loc("SSM.Challenge.UnnamedCounter"),
        valueText: counterValueText(counter, counter.value),
        perRoundLabel: counter.perRound && !counter.perPc ? game.i18n.format("SSM.Challenge.PerRoundOf", { amount: signed(counter.perRound) }) : "",
        ...canMove(counter.value),
        pcs,
        totalLabel: counter.perPc ? game.i18n.format("SSM.Challenge.PartyTotal", { total: partyIds.reduce((sum, id) => sum + counterValueOf(counter, id), 0) }) : "",
        thresholds: counter.perPc ? [] : thresholdRows(counter.thresholds, counter.id, counter.direction),
        open: !isCounterCollapsed(counter.id),
      };
    };
    return {
      canRun,
      canChange,
      rollable: active && canRun,
      canStart: status === "inactive",
      canEnd: active,
      canReset: status !== "inactive",
      canHidePanel: active && onPanel && !panel.hidden,
      canShowPanel: active && (!onPanel || !!panel.hidden),
      // A maximum of 0 means no rounds: the strip drops the round, its buttons and the acted marks. The Current Round field stays, so the Challenge section doesn't shift when Maximum Rounds changes.
      rounds: hasRounds(system),
      statusLabel: loc(active ? "SSM.Challenge.InProgress" : status === "finished" ? "SSM.Challenge.Finished" : "SSM.Challenge.NotStarted"),
      roundLabel: active || status === "finished" ? game.i18n.format(system.rounds.max === null ? "SSM.Challenge.RoundOpen" : "SSM.Challenge.Round", system.rounds) : loc("SSM.Challenge.NotStarted"),
      canNextRound: canAdvanceRound(system),
      canPreviousRound: canUndoRound(system),
      party: [...new Set([...actors.map((actor) => actor.id), ...system.run.acted])].map((id) => {
        const actor = game.actors.get(id);
        return { id, name: actor?.name ?? id, acted: system.run.acted.includes(id) };
      }),
      actors: actors.map((actor) => ({ id: actor.id, name: actor.name, selected: actor === selected })),
      // The challenge's own entries, in a box above the subjects (spec 14.7).
      challengeModifierGroups: modifierGroups(system, system.modifiers.map((row) => this.#modifierView(system, null, row, canChange))),
      // Subjects by category: the blank one first with no bar, then a red bar per category (spec 14.4).
      subjectGroups: subjectGroups(system, system.subjects.map((subject, n) => ({
        id: subject.id,
        name: subjectName(subject, n, subjectLabel),
        collapsed: isCollapsed(subject.id),
        noDelete: system.subjects.length < 2,
        descriptionHtml: this.#subjectHtml.get(subject.id) ?? "",
        revealed: subject.revealed,
        // Set and cleared by the GM only (spec 14.13).
        complete: subject.complete,
        completeTooltip: loc(subject.complete ? "SSM.Challenge.CompleteClear" : "SSM.Challenge.CompleteSet"),
        counters: subject.counters.map((counter) => counterRun(counter, subject.id)),
        actions: subject.actions.map((action) => ({
          id: action.id,
          subjectId: subject.id,
          label: actionName(action),
          descriptionHtml: this.#actionHtml.get(action.id) ?? "",
          open: openActions.has(`${this.page.id}:${action.id}`),
          secret: action.secret,
          checks: rollRows(subject, action),
        })),
        modifierGroups: modifierGroups(system, subject.modifiers.map((row) => this.#modifierView(system, subject, row, canChange))),
      }))).map((group) => ({ key: group.key, heading: group.label, subjects: group.items, collapseAll: collapseAllView(collapseAllAction(group.items.map((subject) => subject.id), isCollapsed)) })),
      counters: system.counters.map((counter) => counterRun(counter)),
    };
  }

  /** One modifier entry as the sheet shows it. `subject` is null for a challenge-level entry, whose buttons then carry an empty subject id. */
  #modifierView(system, subject, row, canChange) {
    const state = row.spent ? "spent" : row.active ? "on" : "off";
    const label = row.name || loc("SSM.Challenge.UnnamedEntry");
    const effectsText = [row.dc?.amount ? this.#dcText(system, subject, row.dc) : "", row.note].filter(Boolean).join("; ");
    const descriptionHtml = this.#rowHtml.get(`${subject?.id ?? ""}:${row.id}`) ?? "";
    const hasDetails = !!(effectsText || descriptionHtml);
    return {
      ...row,
      label,
      subject,
      subjectId: subject?.id ?? "",
      durationLabel: loc(`SSM.Challenge.Duration.${row.duration}`),
      stateClass: state,
      pressed: state === "on",
      stateTooltip: loc(`SSM.Challenge.StateClick.${state}`),
      stateLabel: loc(`SSM.Challenge.State.${state}`),
      canChange,
      effectsText,
      descriptionHtml,
      hasDetails,
      open: hasDetails && openActions.has(`${this.page.id}:${row.id}`),
    };
  }

  /** A modifier's DC change, as the GM reads it. A challenge-level entry (no subject) names skills by key. */
  #dcText(system, subject, dc) {
    const amount = dc.amount > 0 ? `+${dc.amount}` : `${dc.amount}`.replace("-", "−");
    const named = subject
      ? subject.actions.flatMap((action) => action.checks).filter((row) => dc.skills.includes(row.id)).map(skillLabel)
      : dc.skills.map((key) => skillKeyLabel(system, key));
    const skills = dc.allSkills ? loc("SSM.Challenge.AllSkills") : named.join(", ");
    return game.i18n.format("SSM.Challenge.DcChangeText", { amount, skills });
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
    const invalid = clampTracks(system);
    if (invalid.length) ui.notifications.warn("SSM.Challenge.TrackLimits", { localize: true });
    this.page.validate({ changes: { system: Object.fromEntries(EDITABLE.map((key) => [key, system[key]])) }, clean: true, fallback: false });
    return { name: name?.trim() || this.document.name, fields };
  }

  async _processSubmitData(event, form, { name, fields }, options = {}) {
    return this.#whileSaving(async () => {
      if (name !== this.document.name) await this.document.update({ name });
      // Merge at write time, so the form lands on top of any run change queued before it.
      await writeChallenge(this.page, (system) => {
        applyForm(system, fields);
        clampTracks(system);
      }, options);
      return { updated: this.document };
    });
  }

  /** The Roll-as list isn't challenge data, so it must not save the form. A PC's counter note saves on its own. */
  _onChangeForm(formConfig, event) {
    if (event.target.matches?.("[data-roll-as]")) {
      this.#rollAs = event.target.value;
      return;
    }
    if (event.target.matches?.("[data-pc-note]")) {
      const { counter, actor } = event.target.dataset;
      if (game.user.isGM) this.#whileSaving(() => writeChallenge(this.page, (system) => setCounterNote(system, counter, actor, event.target.value)));
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

  /** Add an entry and open its window (spec section 6). A category's + starts the new modifier or subject in that category. */
  static async #onAddEntry(event, target) {
    const { kind, subject: subjectId = "", category } = target.dataset;
    let added;
    await this.#edit((system) => {
      const list = entryListPath(system, kind, subjectId);
      if (!list) return false;
      added = addRow(system, list, category ? { category } : {});
    });
    if (!added) return;
    // A new threshold shows under its counter, so the counter opens.
    if (kind === "thresholds" && isCounterCollapsed(subjectId)) await game.user.setFlag(MODULE, COLLAPSED_COUNTERS_FLAG, { [subjectId]: false });
    const owner = kind === "subjects" ? added.id : subjectId;
    return WINDOWS[kind]?.open(this.page, owner, added.id);
  }

  /** Delete an entry after the GM confirms, as on a PF2e NPC sheet. */
  static async #onRemoveEntry(event, target) {
    const { kind, subject: subjectId = "", id, name } = target.dataset;
    const yes = await foundry.applications.api.DialogV2.confirm({
      window: { title: "SSM.Challenge.DeleteTitle" },
      content: `<p>${game.i18n.format("SSM.Challenge.DeleteConfirm", { name: foundry.utils.escapeHTML(name || loc("SSM.Challenge.UnnamedEntry")) })}</p>`,
      rejectClose: false,
    });
    if (yes) return this.#edit((system) => removeEntry(system, kind, subjectId, id));
  }

  /** Open an entry's own window. A subject's window takes the subject's id as both ids. */
  static async #onEditEntry(event, target) {
    const { kind, subject: subjectId = "", id } = target.dataset;
    await this.submit();
    return WINDOWS[kind]?.open(this.page, kind === "subjects" ? id : subjectId, id);
  }

  /* -------------------------------------------- */

  /**
   * A subject, modifier or counter drags by its header, and drops beside another of its own group (spec 14.8): a subject or modifier
   * within its category, a counter within its list. Each draggable entry carries data-drag (its kind), data-id, data-group and,
   * for a modifier or counter, data-owner (the owning subject's id, empty for the challenge's own). Only a GM can drag.
   */
  #dragDrop = new foundry.applications.ux.DragDrop({
    dragSelector: ".ssm-subject-card > .ssm-card-head, .ssm-modifier > .ssm-entry, .ssm-counter > .ssm-entry:first-child",
    dropSelector: "[data-drag]",
    permissions: { dragstart: () => game.user.isGM, drop: () => game.user.isGM },
    callbacks: {
      dragstart: this.#onDragStart.bind(this),
      dragover: this.#onDragOver.bind(this),
      dragleave: (event) => this.#clearDropMark(event.currentTarget),
      dragend: () => this.#endDrag(),
      drop: this.#onDrop.bind(this),
    },
  });

  /** The entry being dragged on this sheet: its kind, id and group. */
  #dragging = null;

  /** The element the last press landed on. A drag starts from the header, so this tells whether it began on a control. */
  #pressed = null;

  async _onRender(context, options) {
    await super._onRender(context, options);
    this.#dragDrop.bind(this.element);
    markDescriptionFields(this.element);
    if (!this.element.dataset.ssmHeaderClicks) {
      this.element.dataset.ssmHeaderClicks = "1";
      this.element.addEventListener("click", (event) => this.#onHeaderClick(event));
      this.element.addEventListener("pointerdown", (event) => { this.#pressed = event.target; }, { capture: true });
    }
  }

  /** The lines that open and close on a click outside their controls: a subject's header, an action's line, a modifier's row and a counter's top row. */
  static HEADERS = ".ssm-card-head, .ssm-skill-line, .ssm-modifier > .ssm-entry, .ssm-counter > .ssm-entry:first-child, .ssm-threshold > .ssm-entry";

  /** What a header click or drag must leave alone: controls, skill chips and the row tools. */
  static HEADER_CONTROLS = "button, input, select, textarea, a, .ssm-skill, .ssm-row-tools, prose-mirror";

  /** A click on a header's empty part presses its caret, if it has one: an action, modifier or counter with nothing to show stays still. */
  #onHeaderClick(event) {
    const header = event.target.closest?.(ChallengeSheet.HEADERS);
    if (!header || event.target.closest(ChallengeSheet.HEADER_CONTROLS)) return;
    header.querySelector(":scope > button.ssm-caret")?.click();
  }

  /** Start dragging the header's entry, unless the press began on one of its controls. */
  #onDragStart(event) {
    const entry = event.currentTarget.closest("[data-drag]");
    if (!entry || this.#pressed?.closest?.(ChallengeSheet.HEADER_CONTROLS)) return event.preventDefault();
    const { drag: kind, id, group } = entry.dataset;
    this.#dragging = { kind, id, group };
    event.dataTransfer.setData("text/plain", JSON.stringify({ type: "ssmEntry", kind, pageId: this.page.id, id }));
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setDragImage(entry, 16, 12);
  }

  /** Is this drop target the dragged entry's kind? Entries nest (a subject's card holds its counters and modifiers), so only that kind's target answers. */
  #isDragKind(target) {
    return !!this.#dragging && target.dataset.drag === this.#dragging.kind;
  }

  /** Where a drop on this entry would put the dragged one: before or after it, by the pointer's half. Null if it can't go there. */
  #dropPlace(event) {
    const target = event.currentTarget;
    if (!this.#isDragKind(target) || target.dataset.id === this.#dragging.id || target.dataset.group !== this.#dragging.group) return null;
    const box = target.getBoundingClientRect();
    return event.clientY > box.top + box.height / 2 ? "after" : "before";
  }

  /**
   * Mark where the entry would go, or refuse the drop: another group's entry, or its own. The event bubbles from the innermost entry
   * outwards, so the dragged kind's target stops it there; another kind's target refuses, and an outer target of the right kind may still take it.
   */
  #onDragOver(event) {
    const target = event.currentTarget;
    if (!this.#isDragKind(target)) {
      event.dataTransfer.dropEffect = "none";
      return;
    }
    event.stopPropagation();
    const place = this.#dropPlace(event);
    event.dataTransfer.dropEffect = place ? "move" : "none";
    target.classList.toggle("ssm-drop-before", place === "before");
    target.classList.toggle("ssm-drop-after", place === "after");
  }

  #clearDropMark(target) {
    target?.classList.remove("ssm-drop-before", "ssm-drop-after");
  }

  #endDrag() {
    this.#dragging = null;
    for (const target of this.element?.querySelectorAll(".ssm-drop-before, .ssm-drop-after") ?? []) this.#clearDropMark(target);
  }

  /** Write the new order. It is challenge data, so any GM can. Another kind's target lets the drop bubble on to its own kind's. */
  async #onDrop(event) {
    const target = event.currentTarget;
    if (!this.#isDragKind(target)) return;
    event.stopPropagation();
    const place = this.#dropPlace(event);
    const { kind, id } = this.#dragging;
    this.#endDrag();
    if (!place || !game.user.isGM) return;
    const after = place === "after";
    const { id: targetId, owner = "" } = target.dataset;
    if (kind === "modifiers") return this.#whileSaving(() => writeChallenge(this.page, (system) => moveModifier(system, owner, id, targetId, after)));
    if (kind === "counters") return this.#whileSaving(() => writeChallenge(this.page, (system) => moveCounter(system, owner, id, targetId, after)));
    const ids = this.#source.subjects.map((row) => row.id);
    const from = ids.indexOf(id);
    let index = ids.indexOf(targetId) + (after ? 1 : 0);
    if (from < index) index--;
    await this.#whileSaving(() => writeChallenge(this.page, (system) => moveSubject(system, id, index)));
  }

  /** Collapse a subject to its header row, or open it. The state is this user's own, kept in a user flag (spec 14.8). */
  static async #onToggleCollapse(event, target) {
    const id = target.dataset.id;
    await game.user.setFlag(MODULE, COLLAPSED_FLAG, { [id]: !isCollapsed(id) });
    return this.render();
  }

  /** Collapse a counter to its top row, hiding its thresholds, or open it. The state is this user's own, kept in a user flag, as a subject's is. */
  static async #onToggleCounter(event, target) {
    const id = target.dataset.id;
    await game.user.setFlag(MODULE, COLLAPSED_COUNTERS_FLAG, { [id]: !isCounterCollapsed(id) });
    return this.render();
  }

  /** Collapse a category's subjects when any is open, or expand them when all are collapsed, in one update of the same flag. */
  static async #onToggleCollapseAll(event, target) {
    const key = target.dataset.category ?? "";
    const subjects = this.#source.subjects.filter((subject) => categoryKey(subject.category) === key);
    const collapse = collapseAllAction(subjects.map((subject) => subject.id), isCollapsed) === "collapse";
    await game.user.setFlag(MODULE, COLLAPSED_FLAG, Object.fromEntries(subjects.map((subject) => [subject.id, collapse])));
    return this.render();
  }

  /** Open an action's description, a modifier's details or a threshold's description, or close them. A threshold's id is "counterId:thresholdId". */
  static #onToggleAction(event, target) {
    const key = `${this.page.id}:${target.dataset.id}`;
    if (!openActions.delete(key)) openActions.add(key);
    return this.render();
  }

  /** Only the active GM's client writes run state (spec section 4). */
  async #run(change) {
    if (!game.user.isActiveGM) return;
    announceTriggers(await writeChallenge(this.page, change));
  }

  static async #onStartRun() {
    if (!game.user.isActiveGM) return;
    await this.#run(startRun);
    return takePanel(this.document);
  }

  static #onShowPanel() {
    return takePanel(this.document);
  }

  static #onHidePanel() {
    return hidePanel();
  }

  static async #onEndRun() {
    const yes = await foundry.applications.api.DialogV2.confirm({
      window: { title: "SSM.Challenge.EndTitle" },
      content: `<p>${loc("SSM.Challenge.EndConfirm")}</p>`,
      rejectClose: false,
    });
    if (yes) return this.#run(endRun);
  }

  static async #onResetRun() {
    const yes = await foundry.applications.api.DialogV2.confirm({
      window: { title: "SSM.Challenge.ResetTitle" },
      content: `<p>${loc("SSM.Challenge.ResetConfirm")}</p>`,
      rejectClose: false,
    });
    if (yes) return this.#run(resetRun);
  }

  static #onNextRound() {
    return this.#run(advanceRound);
  }

  static #onPreviousRound() {
    return this.#run(undoRound);
  }

  static #onChangeCounter(event, target) {
    return this.#run((system) => changeCounter(system, target.dataset.id, Number(target.dataset.delta), target.dataset.actor ?? ""));
  }

  static #onToggleModifier(event, target) {
    return this.#run((system) => toggleModifier(system, target.dataset.subject, target.dataset.id));
  }

  static #onRestoreModifier(event, target) {
    return this.#run((system) => restoreModifier(system, target.dataset.subject, target.dataset.id));
  }

  static #onToggleReached(event, target) {
    return this.#run((system) => toggleReached(system, target.dataset.owner, target.dataset.id));
  }

  static #onToggleComplete(event, target) {
    return this.#run((system) => toggleComplete(system, target.dataset.subject));
  }

  static #onToggleReveal(event, target) {
    return this.#run((system) => toggleReveal(system, target.dataset.id));
  }

  static #onCycleThresholdReveal(event, target) {
    return this.#run((system) => cycleThresholdReveal(system, target.dataset.owner, target.dataset.id));
  }

  static #onToggleActed(event, target) {
    return this.#run((system) => toggleActed(system, target.dataset.id));
  }

  /* -------------------------------------------- */

  /** The subject, action and check a roll button belongs to, plus what a roll needs from them. */
  #rollTarget(target) {
    const { subject: subjectId, act: actionId, id } = target.dataset;
    const { system } = this.page;
    const index = system.subjects.findIndex((candidate) => candidate.id === subjectId);
    const subject = system.subjects[index];
    const action = subject?.actions.find((candidate) => candidate.id === actionId);
    const row = action?.checks.find((candidate) => candidate.id === id);
    if (!row) return null;
    return rollTarget({ challengeId: this.document.id, subject, subjectLabel: subjectName(subject, index, system.subjectLabel), action, row, dc: currentDc(system, subject, row) });
  }

  static async #onRollSkill(event, target) {
    if (!game.user.isActiveGM || this.page.system.run.status !== "active") return;
    const roll = this.#rollTarget(target);
    if (!roll) return;
    const actor = this.#selectedActor();
    if (!actor) return ui.notifications.warn("SSM.Challenge.NoPCSelected", { localize: true });
    return rollCheck(actor, roll, { event, messageMode: "public" });
  }

  static #onPostLink(event, target) {
    if (!game.user.isActiveGM || this.page.system.run.status !== "active") return;
    const roll = this.#rollTarget(target);
    if (!roll) return;
    const params = [roll.slug, `dc:${roll.dc}`, "showDC:gm", `options:${roll.option(LINK_ROLL_ID)}`];
    // A secret action's link rolls secret, as the panel and the roll button do.
    if (roll.secret) params.push("traits:secret");
    const content = `<p><strong>${foundry.utils.escapeHTML(roll.label)}</strong></p><p>@Check[${params.join("|")}]</p>`;
    return ChatMessage.create({ content }, { messageMode: "public" });
  }
}

