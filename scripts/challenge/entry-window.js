import { MODULE } from "../constants.js";
import { actionName, skillKeyLabel, skillLabel } from "./skill-label.js";
import { writeChallenge } from "./state.js";
import { CategoryAutocomplete } from "./category-autocomplete.js";
import { ACTION_FIELDS, addRow, BOTH_WAYS, categoryOrder, challengeSkillKeys, COUNTER_DISPLAYS, COUNTER_FIELDS, DIRECTIONS, DURATIONS, entryChanges, findAction, findCounterEntry, findModifier, findSubject, LORE, mergeForm, MODIFIER_FIELDS, PERCEPTION, QUICK_DC_AMOUNTS, rebaseEntry, removeRow, SAVES, saveAction, saveCounter, saveModifier, saveSubject, setDcAmount, SUBJECT_FIELDS, subjectCategoryOrder, THRESHOLD_REVEALS } from "./data.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const loc = (key) => game.i18n.localize(key);
const labels = (values, prefix) => Object.fromEntries(values.map((value) => [value, loc(`SSM.Challenge.${prefix}.${value}`)]));

/** A description as a toggled editor shows it until it opens: enriched, secret blocks and all, since only the GM edits. */
const enrichDescription = (html, page) => foundry.applications.ux.TextEditor.implementation.enrichHTML(html, { relativeTo: page, secrets: true });

/** The skills a check can roll: Perception, the saves (spec 14.8), the skills, then Lore. */
function checkSkillChoices() {
  const skills = Object.fromEntries(Object.entries(CONFIG.PF2E.skills).map(([slug, skill]) => [slug, loc(skill.label)]));
  const saves = Object.fromEntries(SAVES.map((slug) => [slug, loc(CONFIG.PF2E.saves[slug])]));
  return { [PERCEPTION]: loc("PF2E.PerceptionLabel"), ...saves, ...skills, [LORE]: loc("SSM.Challenge.Lore") };
}

/**
 * A window for one entry of a challenge: a modifier, subject, action or counter (spec sections 6, 14.4 and 14.7).
 * A challenge-level modifier or counter has an empty subject id; a subject's window passes the subject's id as both ids. It edits a copy and saves it through
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
    this.#draft = structuredClone(this.#base);
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
    return this.#editAndSave((draft) => addRow(draft, target.dataset.list));
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
    await this.#save();
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

/** The window for one modifier entry. */
export class ModifierWindow extends EntryWindow {
  static ENTRY = { key: "modifier", find: findModifier, fields: MODIFIER_FIELDS, save: saveModifier, titleKey: "SSM.Challenge.EditModifierTitle", unnamed: "SSM.Challenge.UnnamedEntry", goneKey: "SSM.Challenge.ModifierGone" };

  static PARTS = { form: { template: `modules/${MODULE}/templates/challenge-modifier.hbs` } };

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

  _entryContext(system, subject, modifier) {
    // A subject's entry picks its checks: a check's name alone can repeat across actions, so each is listed with its action.
    // A challenge-level entry (no subject) picks skills, matching that skill on any subject (spec 14.7).
    const skillOptions = subject
      ? Object.fromEntries(subject.actions.flatMap((action) => action.checks.map((row) => [row.id, `${actionName(action)}: ${skillLabel(row)}`])))
      : Object.fromEntries(challengeSkillKeys(system).map((key) => [key, skillKeyLabel(system, key)]));
    return {
      modifier,
      challengeLevel: !subject,
      skillOptions,
      quickDcAmounts: QUICK_DC_AMOUNTS.map((amount) => ({ amount, label: amount > 0 ? `+${amount}` : `${amount}`.replace("-", "−") })),
      choices: { durations: labels(DURATIONS, "Duration") },
    };
  }
}

/** The window for one subject: its name, category, Revealed and description. */
export class SubjectWindow extends EntryWindow {
  static ENTRY = { key: "subject", find: findSubject, fields: SUBJECT_FIELDS, save: saveSubject, titleKey: "SSM.Challenge.EditSubjectTitle", unnamed: "SSM.Challenge.Subject", goneKey: "SSM.Challenge.EntryGone" };

  static DEFAULT_OPTIONS = { window: { icon: "fa-solid fa-user" } };

  static PARTS = { form: { template: `modules/${MODULE}/templates/challenge-subject.hbs` } };

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

  static DEFAULT_OPTIONS = { window: { icon: "fa-solid fa-dice-d20" } };

  static PARTS = { form: { template: `modules/${MODULE}/templates/challenge-action.hbs` } };

  async _entryContext(system, subject, action) {
    return {
      action,
      descriptionHtml: await enrichDescription(action.description, this.page),
      checks: action.checks.map((row, i) => ({ ...row, path: `checks.${i}`, isLore: row.skill === LORE })),
      choices: { skills: checkSkillChoices() },
    };
  }
}

/** The window for one counter, the challenge's or a subject's: its fields and its thresholds. */
export class CounterWindow extends EntryWindow {
  static ENTRY = { key: "counter", find: findCounterEntry, fields: COUNTER_FIELDS, save: saveCounter, titleKey: "SSM.Challenge.EditCounterTitle", unnamed: "SSM.Challenge.UnnamedCounter", goneKey: "SSM.Challenge.EntryGone" };

  static DEFAULT_OPTIONS = { window: { icon: "fa-solid fa-gauge" } };

  static PARTS = { form: { template: `modules/${MODULE}/templates/challenge-counter.hbs` } };

  _saveWarning({ min, max }) {
    return min !== null && max !== null && min > max ? "SSM.Challenge.TrackLimits" : null;
  }

  _entryContext(system, subject, counter) {
    // A both-ways track's Reached follows its value, so its checkbox is left out.
    const followsValue = counter.direction === BOTH_WAYS;
    return {
      counter,
      thresholds: counter.thresholds.map((row, i) => ({ ...row, path: `thresholds.${i}`, followsValue })),
      choices: {
        thresholdReveals: labels(THRESHOLD_REVEALS, "ThresholdReveal"),
        // Display styles only (spec 14.12); the Revealed checkbox beside the list controls visibility.
        displays: labels(COUNTER_DISPLAYS, "Display"),
        directions: labels(DIRECTIONS, "Direction"),
      },
    };
  }
}
