import { CHASE_TYPES, DEFAULT_PRESET, DIRECTIONS, DURATIONS, EFFECT_TYPES, OUTCOMES, PRESETS, STATUSES, THRESHOLD_REVEALS } from "./data.js";

const { ArrayField, BooleanField, HTMLField, NumberField, ObjectField, SchemaField, StringField } = foundry.data.fields;

const rowId = () => new StringField({ required: true, blank: false, initial: () => foundry.utils.randomID() });
const text = () => new StringField({ required: true, blank: true, initial: "" });
const flag = (initial = false) => new BooleanField({ required: true, initial });
const int = (initial = 0, options = {}) => new NumberField({ required: true, nullable: false, integer: true, initial, ...options });
const optionalInt = (options = {}) => new NumberField({ required: true, nullable: true, integer: true, initial: null, ...options });
const list = (fields) => new ArrayField(new SchemaField(fields), { required: true, initial: [] });
const choice = (choices, initial) => new StringField({ required: true, blank: false, choices, initial });
const ids = () => new ArrayField(new StringField({ blank: false }), { required: true, initial: [] });

/** One shape for a modifier's effects and an outcome table's rows. */
const effectFields = () => ({
  id: rowId(),
  type: choice(EFFECT_TYPES, "note"),
  amount: int(),
  allSkills: flag(true),
  skills: ids(),
  counterId: text(),
  note: text(),
});

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
  // A one-time entry's other effects have been applied, so Apply can't repeat them.
  applied: flag(),
  effects: list(effectFields()),
});

/** One shape for a subject's thresholds and a counter's. `dc` is a DC change that applies while the threshold is reached. */
const thresholdFields = () => ({ id: rowId(), points: int(1), playerText: text(), gmText: text(), reveal: choice(THRESHOLD_REVEALS, "hidden"), reached: flag(), dc: int() });

const actionFields = () => ({
  id: rowId(),
  name: text(),
  // What the action is and how players use it. Plain text that everyone sees.
  description: text(),
  secret: flag(),
  // The most points this action can give in total, and how many it has given.
  maxPoints: optionalInt({ min: 0 }),
  given: int(),
  checks: list({ id: rowId(), skill: text(), lore: text(), dc: int(15, { min: 0 }), revealed: flag(), decoy: flag(), always: flag() }),
  outcomes: new SchemaField(Object.fromEntries(OUTCOMES.map((outcome) => [outcome, list(effectFields())]))),
});

const subjectFields = () => ({
  id: rowId(),
  name: text(),
  statLine: text(),
  revealed: flag(),
  tracksPoints: flag(true),
  individual: flag(),
  points: int(),
  // An individual subject's points, by actor id.
  pointsBy: new ObjectField({ required: true, initial: {} }),
  direction: choice(DIRECTIONS, "up"),
  // Optional limits on the points, for each PC's points on an individual subject too.
  min: optionalInt(),
  max: optionalInt(),
  goal: optionalInt(),
  complete: flag(),
  // The PCs who have reached an individual subject's goal, by actor id.
  completeBy: ids(),
  thresholds: list(thresholdFields()),
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
      premise: new HTMLField({ required: true, blank: true, initial: "" }),
      gmNotes: new HTMLField({ required: true, blank: true, initial: "" }),
      rounds: new SchemaField({
        current: int(0, { min: 0 }),
        // Blank means no limit.
        max: optionalInt({ min: 1 }),
      }),
      // Challenge-level modifier entries (spec 14.7).
      modifiers: list(modifierFields()),
      subjects: list(subjectFields()),
      counters: list({
        id: rowId(),
        name: text(),
        value: int(),
        direction: choice(DIRECTIONS, "up"),
        min: optionalInt(),
        max: optionalInt(),
        // Added to the value each time the round advances.
        perRound: int(),
        // One value per party PC, by actor id, each starting from `value` (spec 14.8).
        perPc: flag(),
        valueBy: new ObjectField({ required: true, initial: {} }),
        // A GM-only note per PC, by actor id, such as which Edge Points are duds.
        noteBy: new ObjectField({ required: true, initial: {} }),
        thresholds: list(thresholdFields()),
        revealed: flag(),
      }),
      // A chase's type and the counter that is the other side (items/chase-subsystem.md). Unused by other presets.
      chase: new SchemaField({ type: choice(CHASE_TYPES, "chaseDown"), counterId: text() }),
      run: new SchemaField({
        status: choice(STATUSES, "inactive"),
        acted: ids(),
        // The state to go back to on Reset, taken when the run starts. Null when no run has started.
        baseline: new ObjectField({ required: true, nullable: true, initial: null }),
        // One entry per round advance, so undo can bring back the acted markers, the counters' values and the thresholds the advance reached.
        roundHistory: list({ round: int(), acted: ids(), counters: new ObjectField({ required: true, initial: {} }), reached: ids() }),
        // The net change Rounds effects have made to the maximum. Reset takes it back off.
        roundsAdded: int(),
        // The rolls applied from their chat cards. A reroll keeps its roll's id, so this also stops a reroll counting twice.
        appliedRolls: ids(),
        // The rolls whose arrival the active GM handled, which spent their one-time DC entries. Apply doesn't spend them again.
        receivedRolls: ids(),
        // A running chase's last-seen position, the round it got there, the round, and how it ended, so each notice comes once.
        chase: new ObjectField({ required: true, nullable: true, initial: null }),
      }),
    };
  }
}
