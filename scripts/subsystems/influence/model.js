import { DURATIONS, EFFECT_TYPES, MODIFIER_KINDS, STATUSES } from "./data.js";

const { ArrayField, BooleanField, DocumentUUIDField, HTMLField, NumberField, ObjectField, SchemaField, StringField } = foundry.data.fields;

const rowId = () => new StringField({ required: true, blank: false, initial: () => foundry.utils.randomID() });
const text = () => new StringField({ required: true, blank: true, initial: "" });
const flag = () => new BooleanField({ required: true, initial: false });
const int = (initial = 0, options = {}) => new NumberField({ required: true, nullable: false, integer: true, initial, ...options });
const optionalInt = () => new NumberField({ required: true, nullable: true, integer: true, initial: null });
const dc = () => int(15, { min: 0 });
const list = (fields) => new ArrayField(new SchemaField(fields), { required: true, initial: [] });
const choice = (choices, initial) => new StringField({ required: true, blank: false, choices, initial });

const effectFields = () => ({
  id: rowId(),
  type: choice(EFFECT_TYPES, "note"),
  amount: int(),
  allSkills: new BooleanField({ required: true, initial: true }),
  skills: new ArrayField(new StringField({ blank: false }), { required: true, initial: [] }),
  counterId: text(),
  note: text(),
});

const modifierFields = () => ({
  id: rowId(),
  name: text(),
  playerText: text(),
  gmText: text(),
  kind: choice(MODIFIER_KINDS, "weakness"),
  duration: choice(DURATIONS, "ongoing"),
  active: flag(),
  spent: flag(),
  revealed: flag(),
  decoy: flag(),
  // A one-time entry's other effects have been applied, so Apply can't repeat them.
  applied: flag(),
  effects: list(effectFields()),
});

const ids = () => new ArrayField(new StringField({ blank: false }), { required: true, initial: [] });

const npcFields = () => ({
  id: rowId(),
  name: text(),
  traits: new ArrayField(new StringField({ blank: false }), { required: true, initial: [] }),
  actorUuid: new DocumentUUIDField({ type: "Actor", required: true, nullable: true, initial: null }),
  perception: int(),
  will: int(),
  points: int(),
  discovery: list({ id: rowId(), skill: text(), dc: dc(), revealed: flag(), decoy: flag() }),
  influence: list({ id: rowId(), skill: text(), lore: text(), dc: dc(), revealed: flag(), decoy: flag() }),
  thresholds: list({ id: rowId(), points: int(1), playerText: text(), gmText: text(), revealed: flag(), reached: flag() }),
  modifiers: list(modifierFields()),
});

/** The full Influence challenge from spec section 5. The challenge's name is the journal entry's name. */
export class InfluenceModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      premise: new HTMLField({ required: true, blank: true, initial: "" }),
      gmNotes: new HTMLField({ required: true, blank: true, initial: "" }),
      rounds: new SchemaField({
        current: int(0, { min: 0 }),
        max: int(6, { min: 1 }),
        length: text(),
      }),
      npcs: list(npcFields()),
      counters: list({
        id: rowId(),
        name: text(),
        value: int(),
        min: optionalInt(),
        max: optionalInt(),
        triggers: list({ id: rowId(), value: int(), gmNote: text() }),
        revealed: flag(),
      }),
      run: new SchemaField({
        status: choice(STATUSES, "inactive"),
        acted: ids(),
        log: list({ id: rowId(), at: int(), round: int(), type: text(), text: text() }),
        // The state to go back to on Reset, taken when the run starts. Null when no run has started.
        baseline: new ObjectField({ required: true, nullable: true, initial: null }),
        // One entry per round advance, so undo can bring back the acted markers.
        roundHistory: list({ round: int(), acted: ids() }),
        // The net change Rounds effects have made to the maximum. Reset takes it back off.
        roundsAdded: int(),
        // Results waiting for the GM. Stored here so they survive a reload.
        pending: list({
          id: rowId(), rollId: text(), messageId: text(), kind: text(), npcId: text(), entryId: text(),
          actorId: text(), actorName: text(), total: optionalInt(), outcome: text(), round: int(),
          // The DC the roll used, the current DC when it arrived, and the one-time entries it will spend when confirmed.
          dc: optionalInt(), expectedDc: optionalInt(), claims: ids(),
        }),
        // The rolls already applied, so a later reroll of one can be recognised.
        appliedRolls: ids(),
      }),
    };
  }
}
