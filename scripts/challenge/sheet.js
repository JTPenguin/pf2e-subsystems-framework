import { MODULE } from "../constants.js";
import { challengePage } from "../registry.js";
import { hidePanel, panelState, takePanel } from "../panel/activation.js";
import { partyPCs } from "../party.js";
import { actionName, skillKeyLabel, skillLabel, subjectName } from "./skill-label.js";
import { announceTriggers, writeChallenge } from "./state.js";
import { advanceRound, applyModifier, canAdvanceRound, canApplyModifier, canUndoRound, changeCounter, changePoints, counterValueOf, currentDc, cycleThresholdReveal, endRun, isComplete, pointsOf, resetRun, restoreModifier, startRun, toggleActed, toggleComplete, toggleModifier, toggleReached, toggleReveal, undoRound } from "./run.js";
import { LINK_ROLL_ID } from "../roll-option.js";
import { rollCheck, rollTarget } from "./roll.js";
import { addRow, applyForm, COUNTER_DISPLAYS, HIDDEN_DISPLAY, setCounterNote, subjectTemplates, BOTH_WAYS, clampTracks, DIRECTIONS, EDITABLE, groupByCategory, isAlwaysShown, isDecoyCheck, limitTrack, LORE, moveSubject, OUTCOMES, PERCEPTION, nextThresholdReveal, pickFields, removeRow, SAVES, THRESHOLD_REVEALS } from "./data.js";
import { ActionWindow, ModifierWindow } from "./entry-window.js";

const { DocumentSheetV2, HandlebarsApplicationMixin } = foundry.applications.api;

const CHALLENGE_TAB = "challenge";
const loc = (key) => game.i18n.localize(key);
/** The eye button's look for each step of a threshold's reveal. */
const THRESHOLD_EYE = { hidden: { icon: "fa-eye-slash", pressed: "false" }, points: { icon: "fa-eye-low-vision", pressed: "mixed" }, full: { icon: "fa-eye", pressed: "true" } };

/** The user flag holding which subjects this user has collapsed on the sheet, by subject id (spec 14.8). */
const COLLAPSED_FLAG = "collapsedSubjects";
const isCollapsed = (subjectId) => !!game.user.getFlag(MODULE, COLLAPSED_FLAG)?.[subjectId];

/**
 * Modifier views as the GM window's sections, by category (spec 14.7): the blank category first, with no heading,
 * then the preset's suggestions, then other labels in order of first use. Each has a key, a heading, its stripe colour and its rows.
 * On the Edit tab (`forEdit`) the suggested categories and the blank one always show, as each holds an Add button.
 */
function modifierGroups(system, views, forEdit = false) {
  const groups = groupByCategory(system, views, { withSuggestions: forEdit });
  if (forEdit && !groups.some((group) => !group.key)) groups.unshift({ key: "", label: "", colour: "", rows: [] });
  return groups.map((group) => ({ ...group, heading: group.label, stripe: group.colour ? `--ssm-cat: ${group.colour}` : "", canAdd: forEdit }));
}
const labels = (values, prefix) => Object.fromEntries(values.map((value) => [value, loc(`SSM.Challenge.${prefix}.${value}`)]));

/** The GM sheet. It belongs to the journal entry, whose name is the challenge name; the data lives on the typed page. */
export class ChallengeSheet extends HandlebarsApplicationMixin(DocumentSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["ssm-sheet"],
    viewPermission: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER,
    position: { width: 760, height: 800 },
    window: { resizable: true, icon: "fa-solid fa-trophy" },
    form: { submitOnChange: true, closeOnSubmit: false },
    actions: {
      selectTab: ChallengeSheet.#onSelectTab,
      addRow: ChallengeSheet.#onAddRow,
      removeRow: ChallengeSheet.#onRemoveRow,
      editModifier: ChallengeSheet.#onEditModifier,
      editAction: ChallengeSheet.#onEditAction,
      toggleComplete: ChallengeSheet.#onToggleComplete,
      moveSubject: ChallengeSheet.#onMoveSubject,
      toggleCollapse: ChallengeSheet.#onToggleCollapse,
      setMode: ChallengeSheet.#onSetMode,
      startRun: ChallengeSheet.#onStartRun,
      endRun: ChallengeSheet.#onEndRun,
      showPanel: ChallengeSheet.#onShowPanel,
      hidePanel: ChallengeSheet.#onHidePanel,
      resetRun: ChallengeSheet.#onResetRun,
      nextRound: ChallengeSheet.#onNextRound,
      previousRound: ChallengeSheet.#onPreviousRound,
      changePoints: ChallengeSheet.#onChangePoints,
      changeCounter: ChallengeSheet.#onChangeCounter,
      toggleModifier: ChallengeSheet.#onToggleModifier,
      applyModifier: ChallengeSheet.#onApplyModifier,
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
    if (!system.subjects.some((subject) => subject.id === this.#tab)) this.#tab = CHALLENGE_TAB;

    const skills = Object.fromEntries(Object.entries(CONFIG.PF2E.skills).map(([slug, skill]) => [slug, loc(skill.label)]));
    // Saving throws can be checks too (spec 14.8).
    const saves = Object.fromEntries(SAVES.map((slug) => [slug, loc(CONFIG.PF2E.saves[slug])]));
    const checkSkills = { [PERCEPTION]: loc("PF2E.PerceptionLabel"), ...saves, ...skills, [LORE]: loc("SSM.Challenge.Lore") };
    const subjectLabel = system.subjectLabel || loc("SSM.Challenge.Subject");

    const enrich = (html) => foundry.applications.ux.TextEditor.implementation.enrichHTML(html, { relativeTo: this.document, secrets: true });
    // A both-ways track's Reached follows its value, so its checkbox is left out.
    const thresholds = (rows, path, direction) => rows.map((row, i) => ({ ...row, path: `${path}.thresholds.${i}`, followsValue: direction === BOTH_WAYS }));
    const subjectView = (subject, n) => {
      const path = `subjects.${n}`;
      return {
        ...subject,
        path,
        tabLabel: subjectName(subject, n, subjectLabel),
        canRemove: system.subjects.length > 1,
        canMoveUp: n > 0,
        canMoveDown: n < system.subjects.length - 1,
        bothWays: subject.direction === BOTH_WAYS,
        actions: subject.actions.map((action, a) => ({
          ...action,
          path: `${path}.actions.${a}`,
          label: actionName(action),
          // What each degree of success does, as the action's window sets it.
          outcomeLines: OUTCOMES.map((outcome) => ({ label: loc(`SSM.Challenge.Outcome.${outcome}`), text: action.outcomes[outcome].map((effect) => this.#effectText(system, subject, effect)).join("; ") || loc("SSM.Challenge.OutcomeNothing") })),
          checks: action.checks.map((row, i) => ({ ...row, path: `${path}.actions.${a}.checks.${i}`, isLore: row.skill === LORE })),
        })),
        thresholds: thresholds(subject.thresholds, path, subject.direction),
        // Read-only here: each one is edited in its own window. The suggested categories show even when empty, as each holds an Add button.
        modifierGroups: modifierGroups(system, subject.modifiers.map((modifier, i) => ({ ...this.#modifierView(system, subject, modifier, false), canEdit: true, path: `${path}.modifiers.${i}` })), true),
      };
    };
    const challengeModifierGroups = modifierGroups(system, system.modifiers.map((modifier, i) => ({ ...this.#modifierView(system, null, modifier, false), canEdit: true, path: `modifiers.${i}` })), true);

    const subjects = system.subjects.map(subjectView);
    const mode = this.#currentMode;
    const displayChoices = Object.fromEntries([...COUNTER_DISPLAYS, HIDDEN_DISPLAY].map((key) => [key, loc(`SSM.Challenge.Display.${key}`)]));
    return Object.assign(context, {
      isRun: mode === "run",
      isEdit: mode === "edit",
      run: mode === "run" ? this.#runContext(system) : null,
      name: this.document.name,
      system,
      subjectLabel,
      pointsName: system.pointsName || loc("SSM.Challenge.Points"),
      // One Add button per subject template of the preset; the first is named by the subject label.
      addSubjectButtons: subjectTemplates(system).map(({ id, label }) => ({ id, label: label || game.i18n.format("SSM.Challenge.AddSubject", { subject: subjectLabel }) })),
      removeSubjectLabel: game.i18n.format("SSM.Challenge.RemoveSubject", { subject: subjectLabel }),
      premiseHtml: await enrich(system.premise),
      gmNotesHtml: await enrich(system.gmNotes),
      counters: system.counters.map((counter, i) => ({
        ...counter,
        path: `counters.${i}`,
        // One list for how players see it: Hidden, or a display style (spec 14.12). A per-PC counter has its own rows, so only Shown or Hidden.
        show: counter.revealed ? (counter.perPc ? "auto" : counter.display ?? "auto") : HIDDEN_DISPLAY,
        showChoices: counter.perPc ? { auto: loc("SSM.Challenge.Display.shown"), [HIDDEN_DISPLAY]: loc(`SSM.Challenge.Display.${HIDDEN_DISPLAY}`) } : displayChoices,
        thresholds: thresholds(counter.thresholds, `counters.${i}`, counter.direction),
      })),
      challengeModifierGroups,
      subjects,
      activeSubject: subjects.find((subject) => subject.id === this.#tab) ?? null,
      onChallengeTab: this.#tab === CHALLENGE_TAB,
      tabs: subjects.map((subject) => ({ id: subject.id, label: subject.tabLabel, active: subject.id === this.#tab })),
      runActive: system.run.status === "active",
      choices: {
        skills: checkSkills,
        thresholdReveals: labels(THRESHOLD_REVEALS, "ThresholdReveal"),
        directions: labels(DIRECTIONS, "Direction"),
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

  /** The actor the Roll as choice names. The player panel's GM rolls use it when no token is selected. */
  get rollAsActor() {
    return this.#selectedActor();
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
    const party = partyPCs();
    const partyIds = party.map((actor) => actor.id);
    const subjectLabel = system.subjectLabel || loc("SSM.Challenge.Subject");
    const pointsName = system.pointsName || loc("SSM.Challenge.Points");
    const signed = (n) => (n > 0 ? `+${n}` : `${n}`.replace("-", "−"));
    const rollRows = (subject, action) => action.checks.map((row) => {
      const dc = currentDc(system, subject, row);
      const label = skillLabel(row);
      const always = isAlwaysShown(row);
      // The chip shows the name and current DC. The tooltip adds the base DC and whether the check is a decoy.
      const tooltip = [loc("SSM.Challenge.RollFor"), game.i18n.format("SSM.Challenge.BaseDc", { dc: row.dc })];
      if (isDecoyCheck(row)) tooltip.push(loc("SSM.Challenge.Decoy"));
      return {
        ...row, subjectId: subject.id, actionId: action.id, label, always, decoy: isDecoyCheck(row), currentDc: dc, dcChanged: dc !== row.dc, dcUp: dc > row.dc,
        shown: always || row.revealed,
        rollLabel: game.i18n.format("SSM.Challenge.RollSkill", { skill: label, dc }),
        postLabel: game.i18n.format("SSM.Challenge.PostSkill", { skill: label }),
        tooltip: tooltip.join(". "),
      };
    });
    // On a both-ways track Reached follows the value, so the GM can't click it (spec 14.8).
    const thresholdRows = (rows, ownerId, direction) => rows.map((row) => ({
      ...row, ownerId, canChange: canChange && direction !== BOTH_WAYS,
      textShown: row.reveal === "full",
      dcLabel: row.dc ? game.i18n.format("SSM.Challenge.ThresholdDc", { amount: signed(row.dc) }) : "",
      revealIcon: THRESHOLD_EYE[row.reveal]?.icon ?? THRESHOLD_EYE.hidden.icon,
      revealPressed: THRESHOLD_EYE[row.reveal]?.pressed ?? "false",
      revealTooltip: game.i18n.format("SSM.Challenge.ThresholdReveal.Tooltip", { now: loc(`SSM.Challenge.ThresholdReveal.${row.reveal}`), next: loc(`SSM.Challenge.ThresholdReveal.${nextThresholdReveal(row.reveal)}`) }),
      reachedTooltip: loc(direction === BOTH_WAYS ? "SSM.Challenge.ReachedFollows" : row.reached ? "SSM.Challenge.ReachedClear" : "SSM.Challenge.ReachedSet"),
    }));
    const completeTag = (complete) => ({ complete, tooltip: loc(complete ? "SSM.Challenge.CompleteClear" : "SSM.Challenge.CompleteSet") });
    return {
      canRun,
      canChange,
      rollable: active && canRun,
      canStart: status === "inactive",
      canEnd: active,
      canReset: status !== "inactive",
      canHidePanel: active && onPanel && !panel.hidden,
      canShowPanel: active && (!onPanel || !!panel.hidden),
      roundLabel: active || status === "finished" ? game.i18n.format(system.rounds.max === null ? "SSM.Challenge.RoundOpen" : "SSM.Challenge.Round", system.rounds) : loc("SSM.Challenge.NotStarted"),
      canNextRound: canAdvanceRound(system),
      canPreviousRound: canUndoRound(system),
      party: [...new Set([...actors.map((actor) => actor.id), ...system.run.acted])].map((id) => {
        const actor = game.actors.get(id);
        return { id, name: actor?.name ?? id, acted: system.run.acted.includes(id) };
      }),
      actors: actors.map((actor) => ({ id: actor.id, name: actor.name, selected: actor === selected })),
      pointsName,
      // The challenge's own entries, in a box above the subjects (spec 14.7).
      challengeModifierGroups: modifierGroups(system, system.modifiers.map((row) => this.#modifierView(system, null, row, canChange))),
      subjects: system.subjects.map((subject, n) => ({
        id: subject.id,
        name: subjectName(subject, n, subjectLabel),
        canMoveUp: n > 0,
        canMoveDown: n < system.subjects.length - 1,
        collapsed: isCollapsed(subject.id),
        rangeLabel: rangeLabel(subject),
        statLine: subject.statLine,
        revealed: subject.revealed,
        tracksPoints: subject.tracksPoints,
        individual: subject.individual,
        points: subject.points,
        // A both-ways track has no goal.
        goalLabel: subject.goal === null || subject.direction === BOTH_WAYS ? "" : game.i18n.format("SSM.Challenge.GoalOf", { goal: subject.goal }),
        hasComplete: (subject.goal !== null && subject.direction !== BOTH_WAYS) || subject.complete,
        ...completeTag(isComplete(subject, partyIds)),
        // An individual subject lists each party PC, and anyone else who has points there.
        pcs: !subject.individual ? [] : [...new Set([...partyIds, ...Object.keys(subject.pointsBy ?? {}), ...subject.completeBy])].map((id) => ({
          id, name: game.actors.get(id)?.name ?? id, points: pointsOf(subject, id), ...completeTag(subject.completeBy.includes(id)),
        })),
        actions: subject.actions.map((action) => ({
          id: action.id,
          label: actionName(action),
          description: action.description,
          secret: action.secret,
          maxLabel: action.maxPoints === null ? "" : game.i18n.format("SSM.Challenge.GivenOf", { given: action.given, max: action.maxPoints }),
          checks: rollRows(subject, action),
        })).filter((action) => action.checks.length),
        thresholds: subject.individual ? [] : thresholdRows(subject.thresholds, subject.id, subject.direction),
        modifierGroups: modifierGroups(system, subject.modifiers.map((row) => this.#modifierView(system, subject, row, canChange))),
      })),
      counters: system.counters.map((counter) => {
        const canMove = (value) => ({ canAdd: canChange && limitTrack(counter, value + 1) !== value, canRemove: canChange && limitTrack(counter, value - 1) !== value });
        // A per-PC counter lists each party PC, and anyone else who has a value, with the party total by its name (spec 14.8).
        const pcs = !counter.perPc ? [] : [...new Set([...partyIds, ...Object.keys(counter.valueBy ?? {})])].map((id) => {
          const value = counterValueOf(counter, id);
          return { id, name: game.actors.get(id)?.name ?? id, value, note: counter.noteBy?.[id] ?? "", ...canMove(value) };
        });
        return {
          ...counter,
          label: counter.name || loc("SSM.Challenge.UnnamedCounter"),
          rangeLabel: rangeLabel(counter),
          perRoundLabel: counter.perRound && !counter.perPc ? game.i18n.format("SSM.Challenge.PerRoundOf", { amount: signed(counter.perRound) }) : "",
          ...canMove(counter.value),
          pcs,
          totalLabel: counter.perPc ? game.i18n.format("SSM.Challenge.PartyTotal", { total: partyIds.reduce((sum, id) => sum + counterValueOf(counter, id), 0) }) : "",
          thresholds: counter.perPc ? [] : thresholdRows(counter.thresholds, counter.id, counter.direction),
        };
      }),
    };
  }

  /** One modifier entry as Run mode shows it. `subject` is null for a challenge-level entry, whose buttons then carry an empty subject id. */
  #modifierView(system, subject, row, canChange) {
    const state = row.spent ? "spent" : row.active ? "on" : "off";
    const label = row.name || loc("SSM.Challenge.UnnamedEntry");
    const challengeLevel = !subject;
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
      hasApply: row.effects.some((effect) => effect.type !== "dc" && !(challengeLevel && effect.type === "points")),
      canApply: canChange && canApplyModifier(row, challengeLevel),
      canChange,
      canEdit: game.user.isGM,
      effectsText: row.effects.map((effect) => this.#effectText(system, subject, effect)).join("; "),
    };
  }

  /** One effect of a modifier or an outcome row, as the GM reads it. A challenge-level entry (no subject) names skills by key. */
  #effectText(system, subject, effect) {
    const amount = effect.amount > 0 ? `+${effect.amount}` : `${effect.amount}`.replace("-", "−");
    const named = subject
      ? subject.actions.flatMap((action) => action.checks).filter((row) => effect.skills.includes(row.id)).map(skillLabel)
      : effect.skills.map((key) => skillKeyLabel(system, key));
    const skills = effect.allSkills ? loc("SSM.Challenge.AllSkills") : named.join(", ");
    const counter = system.counters.find((candidate) => candidate.id === effect.counterId);
    const counterName = counter ? counter.name || loc("SSM.Challenge.UnnamedCounter") : loc("SSM.Challenge.ChooseCounter");
    const points = system.pointsName || loc("SSM.Challenge.Points");
    return game.i18n.format(`SSM.Challenge.EffectText.${effect.type}`, { amount, skills, counter: counterName, note: effect.note, points });
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

  static async #onSelectTab(event, target) {
    await this.submit();
    this.#tab = target.dataset.tab;
    return this.render();
  }

  static async #onAddRow(event, target) {
    const { list, category, template } = target.dataset;
    let added;
    await this.#edit((system) => {
      added = addRow(system, list, template);
      if (category) added.category = category;
    });
    if (list === "subjects") {
      this.#tab = added.id;
      return this.render();
    }
    // A new modifier or action opens in its own window, where it is edited.
    const Window = list.endsWith(".modifiers") ? ModifierWindow : list.endsWith(".actions") ? ActionWindow : null;
    // A challenge-level entry has an empty subject id.
    const subjectId = list === "modifiers" ? "" : this.page.system.subjects[Number(list.split(".")[1])]?.id;
    if (Window && subjectId !== undefined) Window.open(this.page, subjectId, added.id);
  }

  static #onRemoveRow(event, target) {
    return this.#edit((system) => removeRow(system, target.dataset.path));
  }

  /** Open a modifier's own window. From the Edit tab, save the form first. In Run mode only a GM edits. */
  static async #onEditModifier(event, target) {
    if (this.#currentMode === "edit") await this.submit();
    else if (!game.user.isGM) return;
    return ModifierWindow.open(this.page, target.dataset.subject, target.dataset.id);
  }

  /** Move a subject up or down the challenge's order, in either mode (spec 14.8). It is challenge data, so any GM can, as in Edit mode. */
  static async #onMoveSubject(event, target) {
    if (!game.user.isGM) return;
    if (this.#currentMode === "edit") await this.submit();
    await this.#whileSaving(() => writeChallenge(this.page, (system) => moveSubject(system, target.dataset.subject, Number(target.dataset.delta))));
  }

  /** Collapse a subject to its header row, or open it. The state is this user's own, kept in a user flag (spec 14.8). */
  static async #onToggleCollapse(event, target) {
    const id = target.dataset.subject;
    await game.user.setFlag(MODULE, COLLAPSED_FLAG, { [id]: !isCollapsed(id) });
    return this.render();
  }

  /** Open an action's own window, from the Edit tab. */
  static async #onEditAction(event, target) {
    await this.submit();
    return ActionWindow.open(this.page, target.dataset.subject, target.dataset.id);
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

  static #onChangePoints(event, target) {
    return this.#run((system) => changePoints(system, target.dataset.subject, Number(target.dataset.delta), target.dataset.actor ?? ""));
  }

  static #onChangeCounter(event, target) {
    return this.#run((system) => changeCounter(system, target.dataset.id, Number(target.dataset.delta), target.dataset.actor ?? ""));
  }

  static #onToggleModifier(event, target) {
    return this.#run((system) => toggleModifier(system, target.dataset.subject, target.dataset.id));
  }

  static #onApplyModifier(event, target) {
    return this.#run((system) => applyModifier(system, target.dataset.subject, target.dataset.id, partyPCs().map((actor) => actor.id)));
  }

  static #onRestoreModifier(event, target) {
    return this.#run((system) => restoreModifier(system, target.dataset.subject, target.dataset.id));
  }

  static #onToggleReached(event, target) {
    return this.#run((system) => toggleReached(system, target.dataset.owner, target.dataset.id));
  }

  static #onToggleComplete(event, target) {
    return this.#run((system) => toggleComplete(system, target.dataset.subject, target.dataset.actor ?? ""));
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

/** A track's limits in words, a counter's or a subject's: "0 to 6", "up to 6", "at least 0", or "" with none. */
function rangeLabel({ min, max }) {
  if (min === null && max === null) return "";
  const key = min === null ? "RangeMax" : max === null ? "RangeMin" : "RangeBoth";
  return `(${game.i18n.format(`SSM.Challenge.${key}`, { min, max })})`;
}
