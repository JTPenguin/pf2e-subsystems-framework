import { MODULE } from "../constants.js";
import { actionName, skillKeyLabel, skillLabel } from "./skill-label.js";
import { writeChallenge } from "./state.js";
import { addRow, categoryKey, categoryOrder, challengeSkillKeys, DURATIONS, EFFECT_TYPES, entryChanges, findModifier, mergeForm, MODIFIER_FIELDS, QUICK_DC_AMOUNTS, rebaseEntry, removeRow, saveModifier, setEffectAmount } from "./data.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const loc = (key) => game.i18n.localize(key);
const labels = (values, prefix) => Object.fromEntries(values.map((value) => [value, loc(`SSM.Challenge.${prefix}.${value}`)]));

/** What an effect row shows, by its type: a DC change or a note. */
const effectView = (effect, path, canRemove) => ({ ...effect, path, canRemove, isDc: effect.type === "dc", isNote: effect.type === "note" });

/**
 * A window for one modifier entry of a subject or of the challenge itself (spec sections 6, 14.4 and 14.7).
 * A challenge-level modifier has an empty subject id. It edits a copy and saves it through
 * the page's write queue, so the sheet and the panel redraw as for any other change. It sits in the page's apps: an update from
 * elsewhere redraws it, keeping the GM's unsaved edits, and deleting the entry closes it.
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
    classes: ["ssm-modifier-window"],
    position: { width: 640, height: "auto" },
    window: { resizable: true, icon: "fa-solid fa-sliders" },
    form: { handler: EntryWindow.#onSave, submitOnChange: false, closeOnSubmit: true },
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
    return Object.assign(context, this._entryContext(system, subject, this.#draft));
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

  static #onAddRow(event, target) {
    return this.#edit((draft) => addRow(draft, target.dataset.list));
  }

  static #onRemoveRow(event, target) {
    return this.#edit((draft) => removeRow(draft, target.dataset.path));
  }

  static #onQuickDc(event, target) {
    return this.#edit((draft) => setEffectAmount(draft, target.dataset.path, Number(target.dataset.amount)));
  }

  static async #onSave() {
    this.#readForm();
    const changes = entryChanges(this.#base, this.#draft, this.#entry.fields);
    if (!Object.keys(changes).length) return;
    const saved = await writeChallenge(this.page, (system) => this.#entry.save(system, this.subjectId, this.entryId, changes));
    if (saved === false) ui.notifications.warn(this.#entry.goneKey, { localize: true });
  }
}

/** The window for one modifier entry. */
export class ModifierWindow extends EntryWindow {
  static ENTRY = { key: "modifier", find: findModifier, fields: MODIFIER_FIELDS, save: saveModifier, titleKey: "SSM.Challenge.EditModifierTitle", unnamed: "SSM.Challenge.UnnamedEntry", goneKey: "SSM.Challenge.ModifierGone" };

  static PARTS = { form: { template: `modules/${MODULE}/templates/challenge-modifier.hbs` } };

  /** Foundry's suggestion menu for the category field, as its tag fields use it. */
  #autocomplete = new foundry.applications.ux.Autocomplete.implementation({ onSelect: (identifier) => this.#chooseCategory(identifier) });

  /** Ends the category field's listeners when the window redraws or closes. */
  #listeners = null;

  get #categoryInput() {
    return this.form?.querySelector('input[name="category"]') ?? null;
  }

  #dismissCategories() {
    if (ui.autocomplete === this.#autocomplete) this.#autocomplete.dismiss();
  }

  /** Offer the preset's suggestions and every category in use that contain what the GM has typed; all of them when the field is empty. */
  #refreshCategories() {
    const input = this.#categoryInput;
    if (!input) return this.#dismissCategories();
    const typed = categoryKey(input.value);
    const entries = categoryOrder(this.page.toObject().system)
      .filter((category) => category.key.includes(typed) && category.key !== typed)
      .map((category) => ({ label: category.label, identifier: category.label }));
    if (entries.length) this.#autocomplete.activate(input, entries);
    else this.#dismissCategories();
  }

  #chooseCategory(label) {
    const input = this.#categoryInput;
    if (input) input.value = label;
  }

  async _onRender(context, options) {
    this.#dismissCategories();
    this.#listeners?.abort();
    this.#listeners = new AbortController();
    await super._onRender(context, options);
    const input = this.#categoryInput;
    if (!input) return;
    const signal = this.#listeners.signal;
    const refresh = () => this.#refreshCategories();
    for (const type of ["click", "focus", "input"]) input.addEventListener(type, refresh, { signal });
    // A click outside the field and the menu closes the menu, as on Foundry's tag fields.
    input.ownerDocument.body.addEventListener("click", (event) => {
      if (event.target === input || this.#autocomplete.element?.contains(event.target)) return;
      this.#dismissCategories();
    }, { signal });
    // A redraw that puts focus back in the field reopens its menu.
    if (input.ownerDocument.activeElement === input) refresh();
  }

  _onClose(options) {
    this.#dismissCategories();
    this.#listeners?.abort();
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
      // The preset's suggestions and every category in use, offered as the GM types.
      effects: modifier.effects.map((effect, e) => ({ ...effectView(effect, `effects.${e}`, modifier.effects.length > 1), skillOptions })),
      quickDcAmounts: QUICK_DC_AMOUNTS.map((amount) => ({ amount, label: amount > 0 ? `+${amount}` : `${amount}`.replace("-", "−") })),
      choices: { durations: labels(DURATIONS, "Duration"), effects: labels(EFFECT_TYPES, "Effect") },
    };
  }
}
