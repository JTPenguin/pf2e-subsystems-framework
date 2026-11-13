import { COUNTER_DISPLAYS, DEFAULT_PRESET, DIRECTIONS, DURATIONS, migrateModifier, PRESETS, STATUSES, THRESHOLD_REVEALS } from "./data.js";

const { ArrayField, BooleanField, HTMLField, NumberField, ObjectField, SchemaField, StringField } = foundry.data.fields;

const rowId = () => new StringField({ required: true, blank: false, initial: () => foundry.utils.randomID() });
const text = () => new StringField({ required: true, blank: true, initial: "" });
const flag = (initial = false) => new BooleanField({ required: true, initial });
const int = (initial = 0, options = {}) => new NumberField({ required: true, nullable: false, integer: true, initial, ...options });
const optionalInt = (options = {}) => new NumberField({ required: true, nullable: true, integer: true, initial: null, ...options });
const list = (fields) => new ArrayField(new SchemaField(fields), { required: true, initial: [] });
const choice = (choices, initial) => new StringField({ required: true, blank: false, choices, initial });
const ids = () => new ArrayField(new StringField({ blank: false }), { required: true, initial: [] });

/** A modifier's DC change (spec 14.7). An amount of 0 means none. */
const modifierDcFields = () => ({ amount: int(), allSkills: flag(true), skills: ids() });

const modifierFields = () => ({
  id: rowId(),
  name: text(),
  playerText: text(),
  gmText: text(),
  // Free text; the preset suggests labels (spec 14.7).
  category: text(),
  duration: choice(DURATIONS, "ongoing"),
  active: flag(),
  spent: flag(),
  revealed: flag(),
  decoy: flag(),
  dc: new SchemaField(modifierDcFields()),
  note: text(),
});

/** One shape for a subject's thresholds and a counter's. `dc` is a DC change that applies while the threshold is reached. */
const thresholdFields = () => ({ id: rowId(), points: int(1), playerText: text(), gmText: text(), reveal: choice(THRESHOLD_REVEALS, "hidden"), reached: flag(), dc: int() });

const actionFields = () => ({
  id: rowId(),
  name: text(),
  // What the action is and how players use it, as rich text like an item's: say, its degrees of success. Everyone sees it but its secret blocks.
  description: new HTMLField({ required: true, blank: true, initial: "" }),
  secret: flag(),
  checks: list({ id: rowId(), skill: text(), lore: text(), dc: int(15, { min: 0 }), revealed: flag(), decoy: flag() }),
});

/** One shape for the challenge's counters and a subject's (spec 14.13). */
const counterFields = () => ({
  id: rowId(),
  name: text(),
  value: int(),
  direction: choice(DIRECTIONS, "up"),
  min: optionalInt(),
  max: optionalInt(),
  // Added to the value each time the round advances, on a subject's counter too.
  perRound: int(),
  // One value per party PC, by actor id, each starting from `value` (spec 14.8).
  perPc: flag(),
  valueBy: new ObjectField({ required: true, initial: {} }),
  // A GM-only note per PC, by actor id, such as which Edge Points are duds.
  noteBy: new ObjectField({ required: true, initial: {} }),
  thresholds: list(thresholdFields()),
  // How the panel draws it (spec 14.12).
  display: choice(COUNTER_DISPLAYS, "auto"),
  // Whether the panel lists the revealed thresholds under the counter, and whether it marks them on its bar, steps or track. Each works without the other.
  showThresholdList: flag(true),
  showThresholdMarks: flag(true),
  revealed: flag(),
});

const subjectFields = () => ({
  id: rowId(),
  name: text(),
  // Who or what the subject is, as rich text like an action's description. Players see it but its secret blocks.
  description: new HTMLField({ required: true, blank: true, initial: "" }),
  // Free text, such as Obstacle or Complication; the preset suggests labels, apart from modifier categories (spec 14.6).
  category: text(),
  revealed: flag(),
  // Set and cleared by the GM only (spec 14.13).
  complete: flag(),
  // Zero or more, each a full counter. A subject with none holds only actions.
  counters: list(counterFields()),
  modifiers: list(modifierFields()),
  actions: list(actionFields()),
});

/** The challenge from spec section 14. The challenge's name is the journal entry's name. */
export class ChallengeModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      preset: choice(Object.keys(PRESETS), DEFAULT_PRESET),
      pointsName: text(),
      subjectLabel: text(),
      subjectsLabel: text(),
      noSubjects: text(),
      gmNotes: new HTMLField({ required: true, blank: true, initial: "" }),
      rounds: new SchemaField({
        current: int(0, { min: 0 }),
        // Blank means no limit.
        max: optionalInt({ min: 1 }),
      }),
      // Challenge-level modifier entries (spec 14.7).
      modifiers: list(modifierFields()),
      subjects: list(subjectFields()),
      counters: list(counterFields()),
      // Off: revealing a subject hides the others, so the panel shows one at a time (spec 14.12).
      multipleSubjects: flag(true),
      run: new SchemaField({
        status: choice(STATUSES, "inactive"),
        acted: ids(),
        // The state to go back to on Reset, taken when the run starts. Null when no run has started.
        baseline: new ObjectField({ required: true, nullable: true, initial: null }),
        // One entry per round advance, so undo can bring back the acted markers, the counters' values and the thresholds the advance reached.
        roundHistory: list({ round: int(), acted: ids(), counters: new ObjectField({ required: true, initial: {} }), reached: ids() }),
      }),
    };
  }

  /** A subject saved with the old GM-only stat line keeps its text as the description. A modifier saved with a list of effects gets its DC change and note. */
  static migrateData(source) {
    for (const modifier of [...(source.modifiers ?? []), ...(source.subjects ?? []).flatMap((subject) => subject.modifiers ?? [])]) migrateModifier(modifier);
    for (const subject of source.subjects ?? []) {
      if (typeof subject.statLine !== "string") continue;
      if (subject.statLine && !subject.description) subject.description = `<p>${foundry.utils.escapeHTML(subject.statLine)}</p>`;
      delete subject.statLine;
    }
    return super.migrateData(source);
  }
}
