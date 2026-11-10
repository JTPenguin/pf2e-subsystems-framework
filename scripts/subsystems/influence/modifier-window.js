import { MODULE } from "../../constants.js";
import { skillLabel } from "./skill-label.js";
import { writeChallenge } from "./state.js";
import { addRow, DURATIONS, EFFECT_TYPES, findModifier, mergeForm, modifierChanges, MODIFIER_KINDS, QUICK_DC_AMOUNTS, rebaseModifier, removeRow, saveModifier, setEffectAmount } from "./data.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const loc = (key) => game.i18n.localize(key);
const labels = (values, prefix) => Object.fromEntries(values.map((value) => [value, loc(`SSM.Influence.${prefix}.${value}`)]));

/**
 * The window for one modifier (spec section 6). It edits a copy and saves it through the page's write queue, so the sheet
 * and the panel redraw as for any other change. It sits in the page's apps: an update from elsewhere redraws it, keeping
 * the GM's unsaved edits, and deleting the page closes it.
 */
export class ModifierWindow extends HandlebarsApplicationMixin(ApplicationV2) {
  /** Open the window for a modifier, or bring its open window to the front. */
  static open(page, npcId, modifierId) {
    const id = `ssm-modifier-${page.id}-${modifierId}`;
    const existing = foundry.applications.instances.get(id);
    if (existing) return existing.render({ force: true });
    if (!findModifier(page.system, npcId, modifierId)) return null;
    // The window takes the challenge sheet's theme, so the two look alike.
    const theme = page.parent?.sheet?.options.classes.filter((name) => name === "themed" || name.startsWith("theme-")) ?? [];
    return new ModifierWindow({ id, page, npcId, modifierId, classes: theme }).render({ force: true });
  }

  static DEFAULT_OPTIONS = {
    tag: "form",
    classes: ["ssm-modifier-window"],
    position: { width: 640, height: "auto" },
    window: { resizable: true, icon: "fa-solid fa-sliders" },
    form: { handler: ModifierWindow.#onSave, submitOnChange: false, closeOnSubmit: true },
    actions: {
      addEffect: ModifierWindow.#onAddEffect,
      removeEffect: ModifierWindow.#onRemoveEffect,
      quickDc: ModifierWindow.#onQuickDc,
    },
  };

  static PARTS = {
    form: { template: `modules/${MODULE}/templates/influence-modifier.hbs` },
  };

  /** The modifier as last loaded from the page. */
  #base;

  /** The copy being edited. */
  #draft;

  /** The field that had focus before a redraw, and its selection. */
  #focus = null;

  constructor({ page, npcId, modifierId, ...options }) {
    super(options);
    this.page = page;
    this.npcId = npcId;
    this.modifierId = modifierId;
    this.#base = structuredClone(this.#latest());
    this.#draft = structuredClone(this.#base);
  }

  #latest() {
    return findModifier(this.page.toObject().system, this.npcId, this.modifierId);
  }

  get title() {
    return game.i18n.format("SSM.Influence.EditModifierTitle", { name: this.#draft.name || loc("SSM.Influence.UnnamedEntry") });
  }

  /** Copy what's in the form into the draft. */
  #readForm() {
    if (!this.form) return;
    const form = foundry.utils.expandObject(new foundry.applications.ux.FormDataExtended(this.form).object);
    this.#draft = mergeForm(this.#draft, form);
  }

  /** A modifier deleted elsewhere closes its window. */
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
    const active = this.element?.contains(document.activeElement) ? document.activeElement : null;
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
    const latest = findModifier(system, this.npcId, this.modifierId);
    if (options.renderContext && latest) {
      this.#readForm();
      if (JSON.stringify(latest) !== JSON.stringify(this.#base)) {
        this.#draft = rebaseModifier(latest, modifierChanges(this.#base, this.#draft));
        this.#base = structuredClone(latest);
      }
    }
    const npc = system.npcs.find((candidate) => candidate.id === this.npcId);
    const skillOptions = Object.fromEntries([...npc.discovery, ...npc.influence].map((row) => [row.id, skillLabel(row)]));
    const modifier = this.#draft;
    return Object.assign(context, {
      modifier,
      effects: modifier.effects.map((effect, e) => ({
        ...effect,
        path: `effects.${e}`,
        canRemove: modifier.effects.length > 1,
        isDc: effect.type === "dc",
        isCounter: effect.type === "counter",
        isNote: effect.type === "note",
        hasAmount: effect.type !== "note",
        skillOptions,
      })),
      quickDcAmounts: QUICK_DC_AMOUNTS.map((amount) => ({ amount, label: amount > 0 ? `+${amount}` : `${amount}`.replace("-", "−") })),
      choices: {
        kinds: labels(MODIFIER_KINDS, "Kind"),
        durations: labels(DURATIONS, "Duration"),
        effects: labels(EFFECT_TYPES, "Effect"),
        counters: { "": loc("SSM.Influence.ChooseCounter"), ...Object.fromEntries(system.counters.map((c) => [c.id, c.name || loc("SSM.Influence.UnnamedCounter")])) },
      },
    });
  }

  /** An effect's type and its All skills box change which fields it shows. */
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

  static #onAddEffect() {
    return this.#edit((draft) => addRow(draft, "effects"));
  }

  static #onRemoveEffect(event, target) {
    return this.#edit((draft) => removeRow(draft, target.dataset.path));
  }

  static #onQuickDc(event, target) {
    return this.#edit((draft) => setEffectAmount(draft, target.dataset.path, Number(target.dataset.amount)));
  }

  static async #onSave() {
    this.#readForm();
    const changes = modifierChanges(this.#base, this.#draft);
    if (!Object.keys(changes).length) return;
    const saved = await writeChallenge(this.page, (system) => saveModifier(system, this.npcId, this.modifierId, changes));
    if (saved === false) ui.notifications.warn("SSM.Influence.ModifierGone", { localize: true });
  }
}
