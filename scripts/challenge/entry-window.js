import { MODULE } from "../constants.js";
import { actionKeyLabel, actionName, skillKeyLabel, skillLabel } from "./skill-label.js";
import { writeChallenge } from "./state.js";
import { CategoryAutocomplete } from "./category-autocomplete.js";
import { markDescriptionFields } from "./description-field.js";
import { ACTION_FIELDS, addRow, BOTH_WAYS, categoryOrder, challengeActionKeys, COUNTER_DISPLAYS, COUNTER_FIELDS, DIFFICULTIES, DIRECTIONS, DURATIONS, entryChanges, findAction, findCounter, findCounterEntry, findModifier, findSubject, findThreshold, keySkill, levelCheckFields, levelDc, LORE, mergeForm, modifierSkillKeys, MODIFIER_FIELDS, PERCEPTION, QUICK_DC_AMOUNTS, rebaseEntry, removeRow, ROLL_MODIFIER_TYPES, SAVES, saveAction, saveCounter, saveModifier, saveSubject, saveThreshold, setDcAmount, sortChecks, stepDc, SUBJECT_FIELDS, subjectCategoryOrder, THRESHOLD_FIELDS, THRESHOLD_REVEALS } from "./data.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const loc = (key) => game.i18n.localize(key);
const labels = (values, prefix) => Object.fromEntries(values.map((value) => [value, loc(`SSM.Challenge.${prefix}.${value}`)]));

/** A description as a toggled editor shows it until it opens: enriched, GM text and all, since only the GM edits. */
const enrichDescription = (html, page) => foundry.applications.ux.TextEditor.implementation.enrichHTML(html, { relativeTo: page, secrets: true });

/** The skills a check can roll: Perception, the saves (spec 14.8), the skills, then Lore. */
function checkSkillChoices() {
  const skills = Object.fromEntries(Object.entries(CONFIG.PF2E.skills).map(([slug, skill]) => [slug, loc(skill.label)]));
  const saves = Object.fromEntries(SAVES.map((slug) => [slug, loc(CONFIG.PF2E.saves[slug])]));
  return { [PERCEPTION]: loc("PF2E.PerceptionLabel"), ...saves, ...skills, [LORE]: loc("SSM.Challenge.Lore") };
}

/**
 * A window for one entry of a challenge: a modifier, subject, action, counter or threshold (spec sections 6, 14.4 and 14.7).
 * A challenge-level modifier or counter has an empty subject id; a subject's window passes the subject's id as both ids; a threshold's passes its counter's id. It edits a copy and saves it through
 * the page's write queue, so the sheet and the panel redraw as for any other change. Every change saves at once, as on a Foundry sheet;
 * a description saves from its editor's own button. It sits in the page's apps: an update from elsewhere redraws it, keeping the
 * GM's unsaved edits, and deleting the entry closes it.
 * A subclass sets ENTRY: { key, find, fields, save, titleKey, unnamed, goneKey }, and gives its template's context in _entryContext.
 */
class EntryWindow extends HandlebarsApplicationMixin(ApplicationV2) {
  /** Open the window for an entry, or bring its open window to the front. */
  static open(page, subjectId, entryId) {
    const id = `ssm-${this.ENTRY.key}-${page.id}-${entryId}`;
    const existing = foundry.applications.instances.get(id);
    if (existing) return existing.render({ force: true });
    if (!this.ENTRY.find(page.system, subjectId, entryId)) return null;
    // The window takes the challenge sheet's theme, so the two look alike.
    const theme = page.parent?.sheet?.options.classes.filter((name) => name === "themed" || name.startsWith("theme-")) ?? [];
    return new this({ id, page, subjectId, entryId, classes: theme }).render({ force: true });
  }

  static DEFAULT_OPTIONS = {
    tag: "form",
    classes: ["ssm-modifier-window", "standard-form"],
    position: { width: 640, height: "auto" },
    window: { resizable: true, icon: "fa-solid fa-sliders" },
    form: { handler: EntryWindow.#onSave, submitOnChange: true, closeOnSubmit: false },
    actions: {
      addRow: EntryWindow.#onAddRow,
      removeRow: EntryWindow.#onRemoveRow,
      quickDc: EntryWindow.#onQuickDc,
    },
  };

  /** The entry as last loaded from the page. */
  #base;

  /** The copy being edited. */
  #draft;

  /** The field that had focus before a redraw, and its selection. */
  #focus = null;

  constructor({ page, subjectId, entryId, ...options }) {
    super(options);
    this.page = page;
    this.subjectId = subjectId;
    this.entryId = entryId;
    this.#base = structuredClone(this.#latest());
    this.#draft = this._openDraft(structuredClone(this.#base));
  }

  /** The draft as the window opens with it, for a subclass to arrange. A change here saves with the GM's first edit. */
  _openDraft(draft) {
    return draft;
  }

  get #entry() {
    return this.constructor.ENTRY;
  }

  #latest() {
    return this.#entry.find(this.page.toObject().system, this.subjectId, this.entryId);
  }

  get title() {
    return game.i18n.format(this.#entry.titleKey, { name: this.#draft.name || loc(this.#entry.unnamed) });
  }

  /** Copy what's in the form into the draft. */
  #readForm() {
    if (!this.form) return;
    const form = foundry.utils.expandObject(new foundry.applications.ux.FormDataExtended(this.form).object);
    this.#draft = mergeForm(this.#draft, form);
  }

  /** An entry deleted elsewhere closes its window. */
  _canRender(options) {
    if (this.rendered && !this.#latest()) {
      this.close();
      return false;
    }
    return super._canRender(options);
  }

  async _onFirstRender(context, options) {
    await super._onFirstRender(context, options);
    this.page.apps[this.id] = this;
  }

  _onClose(options) {
    super._onClose(options);
    delete this.page.apps[this.id];
  }

  /** A redraw for an update from elsewhere keeps the GM's edits and the field they are typing in. */
  async _preRender(context, options) {
    await super._preRender(context, options);
    const focused = this.element?.ownerDocument.activeElement;
    const active = this.element?.contains(focused) ? focused : null;
    this.#focus = active?.name ? { name: active.name, start: active.selectionStart, end: active.selectionEnd } : null;
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    // A saved name stays in the window, so its title follows.
    if (this.window?.title) this.window.title.innerText = this.title;
    markDescriptionFields(this.element);
    const focus = this.#focus;
    const field = focus && this.form.querySelector(`[name="${CSS.escape(focus.name)}"]`);
    if (!field) return;
    field.focus();
    if (focus.start !== null && focus.start !== undefined) field.setSelectionRange?.(focus.start, focus.end);
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const system = this.page.toObject().system;
    const latest = this.#entry.find(system, this.subjectId, this.entryId);
    if (options.renderContext && latest) {
      this.#readForm();
      if (JSON.stringify(latest) !== JSON.stringify(this.#base)) {
        this.#draft = rebaseEntry(latest, entryChanges(this.#base, this.#draft, this.#entry.fields));
        this.#base = structuredClone(latest);
      }
    }
    const subject = system.subjects.find((candidate) => candidate.id === this.subjectId);
    return Object.assign(context, await this._entryContext(system, subject, this.#draft));
  }

  /** A field marked data-redraw changes which fields the window shows. */
  _onChangeForm(formConfig, event) {
    super._onChangeForm(formConfig, event);
    if (event.target.matches?.("[data-redraw]")) this.#edit(() => {});
  }

  /** Change the draft and redraw. */
  #edit(change) {
    this.#readForm();
    change(this.#draft);
    return this.render();
  }

  /** Change the draft and save it. The saved update redraws the window. */
  async #editAndSave(change) {
    this.#readForm();
    change(this.#draft);
    if (!(await this.#save())) this.render();
  }

  static #onAddRow(event, target) {
    return this.#editAndSave((draft) => addRow(draft, target.dataset.list, this._newRowFields(target.dataset.list)));
  }

  /** Fields a new row in this list starts with, beyond its defaults. */
  _newRowFields(list) {
    return {};
  }

  /** Change the draft and save it, for a subclass's own buttons. */
  _editAndSave(change) {
    return this.#editAndSave(change);
  }

  /** The subject this window's entry belongs to, from the page as it is now. */
  get _subject() {
    return this.page.toObject().system.subjects.find((candidate) => candidate.id === this.subjectId) ?? null;
  }

  static #onRemoveRow(event, target) {
    return this.#editAndSave((draft) => removeRow(draft, target.dataset.path));
  }

  static #onQuickDc(event, target) {
    return this.#editAndSave((draft) => setDcAmount(draft, "", Number(target.dataset.amount)));
  }

  /** A language key to warn with on save, or null. */
  _saveWarning(draft) {
    return null;
  }

  static async #onSave() {
    this.#readForm();
    // A blank that kept its old value shows it again; a save that wrote something redraws anyway.
    if (!(await this.#save()) && hasKeptBlank(this.form)) this.render();
  }

  /** Save what differs from the entry as loaded. Returns false if nothing was written. */
  async #save() {
    const warning = this._saveWarning(this.#draft);
    if (warning) ui.notifications.warn(warning, { localize: true });
    const changes = entryChanges(this.#base, this.#draft, this.#entry.fields);
    if (!Object.keys(changes).length) return false;
    const saved = await writeChallenge(this.page, (system) => this.#entry.save(system, this.subjectId, this.entryId, changes));
    if (saved === false) ui.notifications.warn(this.#entry.goneKey, { localize: true });
    return saved !== false;
  }
}

/**
 * Whether the form has a blank number field that keeps its old value on save, so a redraw should show that value again.
 * A field that may stay blank (no limit) has a placeholder; one without a placeholder never saves blank.
 */
export const hasKeptBlank = (form) => [...(form?.querySelectorAll('input[type="number"]:not([placeholder]):not(:disabled)') ?? [])].some((input) => input.value === "");

/** The window for one modifier entry. */
export class ModifierWindow extends EntryWindow {
  static ENTRY = { key: "modifier", find: findModifier, fields: MODIFIER_FIELDS, save: saveModifier, titleKey: "SSM.Challenge.EditModifierTitle", unnamed: "SSM.Challenge.UnnamedEntry", goneKey: "SSM.Challenge.ModifierGone" };

  static DEFAULT_OPTIONS = { actions: { selectAllTargets: ModifierWindow.#onSelectAllTargets } };

  static PARTS = { form: { template: `modules/${MODULE}/templates/challenge-modifier.hbs`, scrollable: [""] } };

  /** The values a target list offers, by its field, as the window last drew them. */
  #targetValues = {};

  /** A list's Select all ticks every option it offers; once all are ticked, it clears them. */
  static #onSelectAllTargets(event, target) {
    const key = target.dataset.field?.split(".").at(-1);
    const values = this.#targetValues[target.dataset.field] ?? [];
    if (!key || !values.length) return;
    return this._editAndSave((draft) => {
      const all = values.every((value) => draft.dc[key].includes(value));
      draft.dc[key] = all ? [] : [...values];
    });
  }

  /** The category field's suggestions: the preset's and every modifier category in use. */
  #categories = new CategoryAutocomplete({
    findInput: () => this.form?.querySelector('input[name="category"]') ?? null,
    categories: () => categoryOrder(this.page.toObject().system),
  });

  async _onRender(context, options) {
    this.#categories.detach();
    await super._onRender(context, options);
    this.#categories.attach();
  }

  _onClose(options) {
    this.#categories.detach();
    super._onClose(options);
  }

  async _entryContext(system, subject, modifier) {
    // Every check of a listed action, added later too. A challenge-level entry names actions by name, matching them on any subject.
    const actions = subject
      ? subject.actions.map((action) => ({ value: action.id, label: actionName(action) }))
      : challengeActionKeys(system).map((key) => ({ value: key, label: actionKeyLabel(system, key) }));
    // Checks are skills, apart from any action: Perception, saves, skills, Lores, each once (spec 14.7).
    const skills = sortChecks(modifierSkillKeys(system, subject), (key) => skillKeyLabel(system, key), keySkill)
      .map((key) => ({ value: key, label: skillKeyLabel(system, key) }));
    const targetList = (field, options, label, hint, empty) => {
      const selected = modifier.dc[field.split(".").at(-1)] ?? [];
      this.#targetValues[field] = options.map((option) => option.value);
      const all = options.length > 0 && options.every((option) => selected.includes(option.value));
      return {
        field, label: loc(label), hint: loc(hint), empty: loc(empty), toggleLabel: loc(all ? "SSM.Challenge.ClearAll" : "SSM.Challenge.SelectAll"),
        options: options.map((option) => ({ ...option, selected: selected.includes(option.value) })),
      };
    };
    return {
      modifier,
      descriptionHtml: await enrichDescription(modifier.description, this.page),
      targetLists: [
        targetList("dc.actions", actions, "SSM.Challenge.AppliesToActions", subject ? "SSM.Challenge.ActionsHint" : "SSM.Challenge.ChallengeActionsHint", "SSM.Challenge.NoActionOptions"),
        targetList("dc.skills", skills, "SSM.Challenge.AppliesToChecks", subject ? "SSM.Challenge.ChecksHint" : "SSM.Challenge.ChallengeChecksHint", "SSM.Challenge.NoCheckOptions"),
      ],
      quickDcAmounts: QUICK_DC_AMOUNTS.map((amount) => ({ amount, label: amount > 0 ? `+${amount}` : `${amount}`.replace("-", "−") })),
      choices: { durations: labels(DURATIONS, "Duration"), rollTypes: labels(ROLL_MODIFIER_TYPES, "RollType") },
    };
  }
}

/** The window for one subject: its name, category, Revealed and description. */
export class SubjectWindow extends EntryWindow {
  static ENTRY = { key: "subject", find: findSubject, fields: SUBJECT_FIELDS, save: saveSubject, titleKey: "SSM.Challenge.EditSubjectTitle", unnamed: "SSM.Challenge.Subject", goneKey: "SSM.Challenge.EntryGone" };

  static DEFAULT_OPTIONS = { window: { icon: "fa-solid fa-user" } };

  static PARTS = { form: { template: `modules/${MODULE}/templates/challenge-subject.hbs`, scrollable: [""] } };

  /** The category field suggests the preset's subject categories and those in use (spec 14.6). */
  #categories = new CategoryAutocomplete({
    findInput: () => this.form?.querySelector('input[name="category"]') ?? null,
    categories: () => subjectCategoryOrder(this.page.toObject().system),
  });

  async _onRender(context, options) {
    this.#categories.detach();
    await super._onRender(context, options);
    this.#categories.attach();
  }

  _onClose(options) {
    this.#categories.detach();
    super._onClose(options);
  }

  async _entryContext(system, subject, draft) {
    return { subject: draft, descriptionHtml: await enrichDescription(draft.description, this.page) };
  }
}

/** The window for one action: its name, Secret, description and checks table. */
export class ActionWindow extends EntryWindow {
  static ENTRY = { key: "action", find: findAction, fields: ACTION_FIELDS, save: saveAction, titleKey: "SSM.Challenge.EditActionTitle", unnamed: "SSM.Challenge.UnnamedAction", goneKey: "SSM.Challenge.EntryGone" };

  // Wider than the other windows, for the checks table's difficulty buttons.
  static DEFAULT_OPTIONS = { position: { width: 720 }, window: { icon: "fa-solid fa-dice-d20" }, actions: { setDifficulty: ActionWindow.#onSetDifficulty } };

  static PARTS = { form: { template: `modules/${MODULE}/templates/challenge-action.hbs`, scrollable: [""] } };

  /**
   * The checks open in check order: Perception, saves, skills, Lores, A–Z within each. They stay put while the window is open,
   * so a check never jumps away from the GM editing it (Justin, 2026-11-15).
   */
  _openDraft(draft) {
    draft.checks = sortChecks(draft.checks ?? [], skillLabel);
    return draft;
  }

  /**
   * The DC field and the difficulty buttons agree as the GM works: typing a DC clears the step and faintly marks a button whose DC it equals;
   * a button takes effect on the first click, since holding focus in the DC field stops its change from redrawing the window under the click.
   */
  async _onRender(context, options) {
    await super._onRender(context, options);
    for (const input of this.form.querySelectorAll("input[data-dc-input]")) {
      input.addEventListener("input", () => {
        const row = input.closest("tr");
        const hidden = row.querySelector("input[data-difficulty-input]");
        if (hidden) hidden.value = "";
        for (const button of row.querySelectorAll("button[data-step]")) {
          button.classList.remove("active");
          button.setAttribute("aria-pressed", "false");
          button.classList.toggle("match", input.value !== "" && button.dataset.dc === String(Number(input.value)));
        }
      });
    }
    for (const button of this.form.querySelectorAll("button[data-step]")) button.addEventListener("mousedown", (event) => event.preventDefault());
  }

  /** A new check under a levelled subject starts at Normal, the level-based DC. */
  _newRowFields(list) {
    return list === "checks" ? levelCheckFields(this._subject?.level ?? null) : {};
  }

  /** A difficulty button sets its check's DC from the subject's level-based DC and remembers the step. */
  static #onSetDifficulty(event, target) {
    const dc = stepDc(this._subject?.level ?? null, target.dataset.step);
    if (dc === null) return;
    const index = Number(target.dataset.index);
    // Show it at once; the save redraws the window the same way.
    const row = target.closest("tr");
    // The form is read back into the draft on every redraw, so it must hold the step too.
    const input = row?.querySelector("input[data-dc-input]");
    if (input) input.value = dc;
    const hidden = row?.querySelector("input[data-difficulty-input]");
    if (hidden) hidden.value = target.dataset.step;
    for (const button of row?.querySelectorAll("button[data-step]") ?? []) {
      const on = button === target;
      button.classList.toggle("active", on);
      button.classList.remove("match");
      button.setAttribute("aria-pressed", String(on));
    }
    return this._editAndSave((draft) => {
      const check = draft.checks[index];
      if (check) Object.assign(check, { dc, difficulty: target.dataset.step });
    });
  }

  async _entryContext(system, subject, action) {
    const level = subject?.level ?? null;
    const base = levelDc(level);
    const steps = (row) => DIFFICULTIES.map((step) => ({
      step,
      label: loc(`SSM.Challenge.Difficulty.${step}.Short`),
      tooltip: base === null ? loc("SSM.Challenge.DifficultyNeedsLevel") : game.i18n.format("SSM.Challenge.DifficultyTooltip", { step: loc(`SSM.Challenge.Difficulty.${step}.Name`), dc: stepDc(level, step) }),
      dc: stepDc(level, step) ?? "",
      active: row.difficulty === step,
      // A typed DC that equals a step's: a faint mark, while the DC stays as typed.
      match: !row.difficulty && base !== null && row.dc === stepDc(level, step),
    }));
    return {
      action,
      descriptionHtml: await enrichDescription(action.description, this.page),
      checks: action.checks.map((row, i) => ({ ...row, path: `checks.${i}`, index: i, isLore: row.skill === LORE, steps: steps(row) })),
      noLevel: base === null,
      levelText: base === null ? loc("SSM.Challenge.DifficultyNeedsLevel") : game.i18n.format("SSM.Challenge.LevelDcText", { level, dc: base }),
      choices: { skills: checkSkillChoices() },
    };
  }
}

/** The window for one counter, the challenge's or a subject's. Its thresholds have windows of their own. */
export class CounterWindow extends EntryWindow {
  static ENTRY = { key: "counter", find: findCounterEntry, fields: COUNTER_FIELDS, save: saveCounter, titleKey: "SSM.Challenge.EditCounterTitle", unnamed: "SSM.Challenge.UnnamedCounter", goneKey: "SSM.Challenge.EntryGone" };

  static DEFAULT_OPTIONS = { window: { icon: "fa-solid fa-gauge" } };

  static PARTS = { form: { template: `modules/${MODULE}/templates/challenge-counter.hbs`, scrollable: [""] } };

  _saveWarning({ min, max }) {
    return min !== null && max !== null && min > max ? "SSM.Challenge.TrackLimits" : null;
  }

  _entryContext(system, subject, counter) {
    return {
      counter,
      choices: {
        // Display styles only (spec 14.12); the Revealed checkbox beside the list controls visibility.
        displays: labels(COUNTER_DISPLAYS, "Display"),
        directions: labels(DIRECTIONS, "Direction"),
      },
    };
  }
}

/** The window for one threshold: its name, points, reveal, DC change, Reached and description. Its "subject" id is its counter's. */
export class ThresholdWindow extends EntryWindow {
  static ENTRY = { key: "threshold", find: findThreshold, fields: THRESHOLD_FIELDS, save: saveThreshold, titleKey: "SSM.Challenge.EditThresholdTitle", unnamed: "SSM.Challenge.UnnamedThreshold", goneKey: "SSM.Challenge.EntryGone" };

  static DEFAULT_OPTIONS = { position: { width: 520 }, window: { icon: "fa-solid fa-flag-checkered" } };

  static PARTS = { form: { template: `modules/${MODULE}/templates/challenge-threshold.hbs`, scrollable: [""] } };

  /** A threshold with no name yet, as a new one, opens with the cursor in its name. */
  async _onFirstRender(context, options) {
    await super._onFirstRender(context, options);
    const name = this.form?.querySelector('input[name="name"]');
    if (name && !name.value) name.focus();
  }

  async _entryContext(system, subject, threshold) {
    // A both-ways track's Reached follows its value, so its checkbox is left out.
    const counter = findCounter(system, this.subjectId)?.counter;
    return {
      threshold,
      followsValue: counter?.direction === BOTH_WAYS,
      descriptionHtml: await enrichDescription(threshold.description, this.page),
      choices: { thresholdReveals: labels(THRESHOLD_REVEALS, "ThresholdReveal") },
    };
  }
}
