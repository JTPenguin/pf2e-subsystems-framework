import { categoryKey } from "./data.js";

/**
 * Foundry's suggestion menu on a category field, as its tag fields use it: the suggestions that contain what the GM has typed, all of them when the field is empty.
 * `findInput()` returns the field or null; `categories()` returns the suggestions in order, each { key, label }.
 * Call attach() after each render and detach() on close. Choosing a suggestion fires the field's change event, so a form that saves on change saves it.
 */
export class CategoryAutocomplete {
  #autocomplete = new foundry.applications.ux.Autocomplete.implementation({ onSelect: (label) => this.#choose(label) });

  /** Ends the field's listeners when the window redraws or closes. */
  #listeners = null;

  constructor({ findInput, categories }) {
    this.findInput = findInput;
    this.categories = categories;
  }

  dismiss() {
    if (ui.autocomplete === this.#autocomplete) this.#autocomplete.dismiss();
  }

  #refresh() {
    const input = this.findInput();
    if (!input) return this.dismiss();
    const typed = categoryKey(input.value);
    const entries = this.categories()
      .filter((category) => category.key.includes(typed) && category.key !== typed)
      .map((category) => ({ label: category.label, identifier: category.label }));
    if (entries.length) this.#autocomplete.activate(input, entries);
    else this.dismiss();
  }

  #choose(label) {
    const input = this.findInput();
    if (!input) return;
    input.value = label;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  attach() {
    this.detach();
    this.#listeners = new AbortController();
    const input = this.findInput();
    if (!input) return;
    const signal = this.#listeners.signal;
    const refresh = () => this.#refresh();
    for (const type of ["click", "focus", "input"]) input.addEventListener(type, refresh, { signal });
    // A click outside the field and the menu closes the menu, as on Foundry's tag fields.
    input.ownerDocument.body.addEventListener("click", (event) => {
      if (event.target === input || this.#autocomplete.element?.contains(event.target)) return;
      this.dismiss();
    }, { signal });
    // A redraw that puts focus back in the field reopens its menu.
    if (input.ownerDocument.activeElement === input) refresh();
  }

  detach() {
    this.dismiss();
    this.#listeners?.abort();
    this.#listeners = null;
  }
}
