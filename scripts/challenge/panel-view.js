/*
 * What players may see of a challenge. No Foundry calls, so tools/test.mjs can check it.
 * Every entry is built field by field: a new field on the data can't reach players until it is added here.
 */

import { actionKey, counterValueText, BOTH_WAYS, groupByCategory, isVisibleCheck, skillKey, sortChecks } from "./data.js";
import { counterValueOf, currentDc, rollBonuses, usedModifierIds } from "./run.js";

/** Scale for a bar when the counter has no maximum and no thresholds. */
const DEFAULT_SCALE = 10;

const isVisible = (row) => row.revealed;
const visibleChecks = (subject) => subject.actions.flatMap((action) => action.checks.filter(isVisibleCheck));
/** Every check players can see: the visible checks of revealed subjects. */
const allVisibleChecks = (system) => system.subjects.filter(isVisible).flatMap(visibleChecks);

/** A skill as players may see it: its name fields only, never its id or DC. */
const skillName = (row) => ({ skill: row.skill, lore: row.lore });

/**
 * The checks a modifier applies to, in terms players may see: { all, actions, skills }, or null if it covers only checks they can't see.
 * `actions` are the names of the listed actions with a check players can see; `skills` the listed skills of visible checks outside those actions.
 * One target, under `dc`, names the checks for both its DC change and its roll bonus. A check or action players can't see is left out without a trace.
 */
function targetView(system, subject, dc) {
  if (dc.all) return { all: true, actions: [], skills: [] };
  // A challenge-level entry (no subject) names actions by name, so it matches them on any revealed subject (spec 14.7). Both name skills by key.
  const listed = dc.actions ?? [];
  const actions = (subject ? [subject] : system.subjects.filter(isVisible)).flatMap((row) => row.actions)
    .filter((action) => listed.includes(subject ? action.id : actionKey(action)) && action.checks.some(isVisibleCheck));
  const inActions = new Set(actions.flatMap((action) => action.checks.map((row) => row.id)));
  const rows = (subject ? visibleChecks(subject) : allVisibleChecks(system)).filter((row) => dc.skills.includes(skillKey(row)) && !inActions.has(row.id));
  if (!actions.length && !rows.length) return null;
  // Two subjects can share an action name, and two actions a skill: name each once.
  return {
    all: false,
    actions: [...new Map(actions.map((action) => [actionKey(action) || action.id, action.name])).values()],
    skills: [...new Map(rows.map((row) => [`${row.skill}:${row.lore}`, skillName(row)])).values()],
  };
}

/**
 * What a modifier does, in terms players may see. A DC change shows as a DC change ("−2 to DCs vs Diplomacy"), with the amount only,
 * so no DC number appears. A roll bonus shows with its type ("+1 circumstance to Diplomacy checks"); it is in the player's roll breakdown anyway.
 * A change that covers only hidden checks shows nothing. Notes are the GM's words, so they never show.
 */
function changeViews(system, subject, row) {
  const target = row.dc ? targetView(system, subject, row.dc) : null;
  if (!target) return [];
  return [
    row.dc.amount ? { type: "dc", amount: row.dc.amount, ...target } : null,
    row.roll?.amount ? { type: "roll", amount: row.roll.amount, rollType: row.roll.type, ...target } : null,
  ].filter(Boolean);
}

/** A revealed modifier entry, as a card on the panel. `group` is its category: the label and the stripe colour. `subject` is null for a challenge-level entry. */
const modifierView = (system, subject, row, group) => ({
  id: row.id,
  name: row.name,
  // Everyone sees the description but its GM text.
  description: withoutSecrets(row.description),
  category: group.label,
  colour: group.colour,
  duration: row.duration,
  active: !!row.active,
  spent: !!row.spent,
  changes: changeViews(system, subject, row),
});

/** A roll bonus's amount with its type, such as "+1 circumstance" or, untyped, "+1". `format` is Foundry's localisation. */
export const rollBonusText = (amount, type, format) => format(`SSM.Challenge.RollBonus.${type}`, { amount: amount > 0 ? `+${amount}` : `−${-amount}` });

/**
 * One change as text, such as "−2 to DCs vs Diplomacy" or "+1 circumstance to Diplomacy checks".
 * `format(key, data)` and `list(items)` are Foundry's localisation and `label(skill)` names a skill, so tools/test.mjs can pass stand-ins.
 */
export function changeText(change, { format, list, label }) {
  // A listed action reads "Discover checks"; an unnamed one gets the sheet's stand-in name.
  const actionText = (name) => format("SSM.Panel.Change.actionChecks", { action: name || format("SSM.Challenge.UnnamedAction", {}) });
  // Skills in check order: Perception, saves, skills, Lores.
  const skills = sortChecks(change.skills, label);
  const targets = (skillText) => list([...(change.actions ?? []).map(actionText), ...skills.map(skillText)]);
  if (change.type === "roll") {
    const bonus = rollBonusText(change.amount, change.rollType, format);
    if (change.all) return format("SSM.Panel.Change.rollAll", { bonus });
    // Skills alone read "Diplomacy and Deception checks"; beside an action, each skill names its checks.
    const skillChecks = (skill) => format("SSM.Panel.Change.skillChecks", { skill });
    const text = change.actions?.length ? targets((skill) => skillChecks(label(skill))) : skillChecks(list(skills.map(label)));
    return format("SSM.Panel.Change.roll", { bonus, targets: text });
  }
  const amount = change.amount > 0 ? `+${change.amount}` : `−${-change.amount}`;
  if (change.all) return format("SSM.Panel.Change.dcAll", { amount });
  return format("SSM.Panel.Change.dc", { amount, targets: targets(label) });
}

/** A threshold's points as the panel prints them: a real minus sign, and on a both-ways track a + on positives, so −30 and +30 line up. */
const pointsLabel = (points, direction) => (points < 0 ? `−${-points}` : direction === BOTH_WAYS && points > 0 ? `+${points}` : String(points));

/**
 * The thresholds players may see. An up counter lists them in the order it reaches them; a down counter and a both-ways track list them highest first,
 * so a both-ways list reads from the best tier down (Justin, 2026-11-13). A points-only threshold shows as "6: ???": its name and description stay out of the copy.
 * A fully revealed one has its name and its description without GM text.
 */
function thresholdViews(rows, direction) {
  const order = direction === "down" || direction === BOTH_WAYS ? (a, b) => b.points - a.points : (a, b) => a.points - b.points;
  return rows.filter((row) => row.reveal === "points" || row.reveal === "full").sort(order).map((row) => ({
    id: row.id, points: row.points, label: pointsLabel(row.points, direction),
    name: row.reveal === "full" ? row.name : "", description: row.reveal === "full" ? withoutSecrets(row.description) : "", textHidden: row.reveal === "points", reached: !!row.reached,
  }));
}

/** The revealed entries of a list as cards, grouped by category: the blank category first, then category order (spec 14.7). */
const cards = (system, subject, rows) => groupByCategory(system, rows.filter(isVisible)).flatMap((group) => group.rows.map((row) => modifierView(system, subject, row, group)));

/**
 * A subject's modifiers as the panel's sections (spec 14.7): the blank category first, with no heading, then each labelled category.
 * A category shows only when one of its entries is revealed, so a hidden entry's category label stays out of the copy.
 */
const cardGroups = (system, subject) => groupByCategory(system, subject.modifiers.filter(isVisible))
  .map((group) => ({ label: group.label, colour: group.colour, cards: group.rows.map((row) => modifierView(system, subject, row, group)) }));

/**
 * A both-ways bar's range (spec 14.8): the minimum to the maximum when both are set; otherwise, on each side of 0, the furthest threshold, hidden or not, else 10.
 */
function bothWaysRange({ min = null, max = null, thresholds }) {
  if (min !== null && max !== null && min < 0 && max > 0) return { lo: min, hi: max };
  const points = thresholds.map((row) => row.points);
  return { lo: Math.min(...points.filter((n) => n < 0), 0) || -DEFAULT_SCALE, hi: Math.max(...points.filter((n) => n > 0), 0) || DEFAULT_SCALE };
}

/**
 * A bar's scale. A counter that counts up scales to its maximum or its highest threshold, hidden or not: Justin accepts that players can work out the target from the bar.
 * A counter that counts down scales to the value it started the run with. Zero means no scale, and the bar falls back to 10.
 * Only this number goes in the copy, never a hidden threshold's text or id.
 */
function trackScale({ direction, thresholds, max = null }, value, startValue) {
  if (direction === "down") return Math.max(0, startValue ?? value);
  return Math.max(0, max ?? 0, ...thresholds.map((row) => row.points));
}

function subjectView(system, subject, party) {
  const view = {
    id: subject.id,
    // Its place in the GM's order, for a stand-in name such as "Obstacle 3".
    index: system.subjects.indexOf(subject),
    name: subject.name,
    // Everyone sees the description but its GM text.
    description: withoutSecrets(subject.description),
    complete: !!subject.complete,
    // The subject's revealed counters, drawn in its column (spec 14.13).
    counters: (subject.counters ?? []).filter(isVisible).map((counter) => counterView(system, counter, party)),
    // An action with no check players can see is left out whole. The DC is in the copy for the roll; the panel never shows it.
    // So are the roll bonuses and the entries the roll uses; a hidden entry's bonus has no name, so its name stays the GM's.
    actions: subject.actions.map((action) => ({
      id: action.id,
      name: action.name,
      description: withoutSecrets(action.description),
      secret: !!action.secret,
      checks: action.checks.filter(isVisibleCheck).map((row) => ({ id: row.id, skill: row.skill, lore: row.lore, dc: currentDc(system, subject, row), bonuses: rollBonuses(system, subject, row), used: usedModifierIds(system, subject, row) })),
    })).filter((action) => action.checks.length),
    // By category: the blank one first, then the preset's suggestions, then others by first use; each keeps the GM's order.
    modifierGroups: cardGroups(system, subject),
  };
  return view;
}

/**
 * How the panel draws a counter (spec 14.12): "number", "bar", "steps" or "track". Auto is a bar with thresholds or a both-ways range, else a number.
 * Steps and Track need a maximum, and Steps a one-way counter; otherwise they draw as a bar. A per-PC counter keeps its per-PC rows.
 */
export function counterDisplay(counter) {
  if (counter.perPc) return "perPc";
  const both = counter.direction === BOTH_WAYS;
  const display = counter.display ?? "auto";
  if (display === "auto") return counter.thresholds.length > 0 || both ? "bar" : "number";
  if (display === "steps" && (both || counter.max === null)) return "bar";
  if (display === "track" && counter.max === null) return "bar";
  return display;
}

/**
 * The slots of a Steps or Track counter: one per whole number from the minimum (0 when unset, or −maximum for both ways) to the maximum.
 * Steps fill every slot above the minimum up to the value; a Track marks only the value's slot. A revealed threshold marks its slot.
 * Too many slots to draw (over 40) gives none, and the panel falls back to a bar.
 */
export function counterSlots(counter, value, display, thresholds) {
  const hi = counter.max;
  const lo = counter.min ?? (counter.direction === BOTH_WAYS ? -hi : 0);
  if (hi === null || hi <= lo || hi - lo > 40) return null;
  const at = Math.max(lo, Math.min(hi, value));
  const marks = new Map(thresholds.map((row) => [row.points, row]));
  const from = display === "steps" ? lo + 1 : lo;
  return Array.from({ length: hi - from + 1 }, (_, i) => {
    const number = from + i;
    const threshold = marks.get(number);
    return { number, filled: display === "steps" ? number <= at : number === at, threshold: !!threshold, reached: !!threshold?.reached };
  });
}

/**
 * A revealed counter, the challenge's or a subject's. One with thresholds is a full track: a bar and its visible thresholds. A per-PC counter has a value per party PC and no thresholds.
 * Revealed thresholds mark the display (`marks`: each one's points and whether it is reached, nothing else) and fill the list under it (`thresholds`).
 * Each is empty when the counter turns it off, so what players don't see stays out of the copy.
 */
function counterView(system, counter, party) {
  const start = system.run.baseline?.counters?.[counter.id]?.value;
  const perPc = !!counter.perPc;
  const shown = perPc ? [] : thresholdViews(counter.thresholds, counter.direction);
  const marks = counter.showThresholdMarks === false ? [] : shown.map((row) => ({ points: row.points, reached: row.reached }));
  const thresholds = counter.showThresholdList === false ? [] : shown;
  let display = counterDisplay(counter);
  const slots = display === "steps" || display === "track" ? counterSlots(counter, counter.value, display, marks) : null;
  if (!slots && (display === "steps" || display === "track")) display = "bar";
  return {
    id: counter.id,
    name: counter.name,
    value: counter.value,
    text: counterValueText(counter, counter.value),
    display,
    slots,
    perPc,
    pcs: perPc ? party.map((pc) => ({ id: pc.id, value: counterValueOf(counter, pc.id), text: counterValueText(counter, counterValueOf(counter, pc.id)) })) : [],
    scale: trackScale(counter, counter.value, start),
    range: counter.direction === BOTH_WAYS ? bothWaysRange(counter) : null,
    marks,
    thresholds,
  };
}

/** Shown for a PC with no usable image. */
export const DEFAULT_PC_IMAGE = "icons/svg/mystery-man.svg";

/** The round bar's segments: one per round, the first `current` filled. `current` is held within 0 to `max`. No maximum gives no segments. */
export function roundSegments(current, max) {
  const total = Math.max(0, Math.floor(max) || 0);
  const filled = Math.min(total, Math.max(0, Math.floor(current) || 0));
  return Array.from({ length: total }, (_, index) => ({ filled: index < filled }));
}

/** An opening tag of GM-only text: PF2e's GM Text Block or GM Text Inline (`data-visibility="gm"`), or a Foundry secret block. */
const GM_ONLY_OPENING = /<([a-z][a-z0-9]*)\b(?=[^>]*\bdata-visibility=["']gm["']|[^>]*\bclass=["'][^"']*\bsecret\b)[^>]*>/i;

/**
 * Rich text without its GM-only parts: PF2e's GM text and Foundry's secret blocks. The copy reaches players' clients, so they must not be in it.
 * Each part ends at its own closing tag, counting nested tags of the same name, so a GM Text Block holding a div is removed whole.
 */
export function withoutSecrets(html) {
  let text = String(html ?? "");
  for (let match = text.match(GM_ONLY_OPENING); match; match = text.match(GM_ONLY_OPENING)) {
    const tag = new RegExp(`<(/?)${match[1]}\\b[^>]*>`, "gi");
    tag.lastIndex = match.index + match[0].length;
    let depth = 1;
    let end = text.length;
    for (let next = tag.exec(text); next; next = tag.exec(text)) {
      depth += next[1] ? -1 : 1;
      if (depth === 0) { end = next.index + next[0].length; break; }
    }
    text = text.slice(0, match.index) + text.slice(end);
  }
  return text.trim();
}

/** The filtered copy. `party` is a list of { id, name, img }. Only revealed subjects and counters go in. */
export function buildPanelView({ name, system, party }) {
  return {
    name,
    pointsName: system.pointsName,
    subjectLabel: system.subjectLabel,
    rounds: { current: system.rounds.current, max: system.rounds.max },
    // Challenge-level entries, for the strip above the subject columns (spec 14.7).
    modifiers: cards(system, null, system.modifiers ?? []),
    subjects: system.subjects.filter(isVisible).map((subject) => subjectView(system, subject, party)),
    counters: system.counters.filter(isVisible).map((counter) => counterView(system, counter, party)),
    party: party.map(({ id, name: pcName, img }) => ({ id, name: pcName, img: img || DEFAULT_PC_IMAGE, acted: system.run.acted.includes(id) })),
  };
}

/** The subject, action and check a panel click means, from the copy as it is now. Null if the check is hidden or the panel has gone. */
export function findPanelRow(view, { subject: subjectId, act: actionId, id }) {
  const subject = view?.subjects.find((candidate) => candidate.id === subjectId);
  const action = subject?.actions.find((candidate) => candidate.id === actionId);
  const row = action?.checks.find((candidate) => candidate.id === id);
  return row ? { subject, action, row } : null;
}

/** How full a bar is, from 0 to 100, against its scale. Negative points fill it in the negative style. */
export function pointsBar(points, scale) {
  const full = Math.max(scale || DEFAULT_SCALE, Math.abs(points));
  return { percent: Math.round((Math.abs(points) / full) * 100), negative: points < 0 };
}

/**
 * A both-ways bar (spec 14.8): it spans `lo` to `hi`, with a mark at 0 (`zero`, as a percentage from the left), filled from 0 to the value
 * (`left` and `width`, as percentages). A value past the range widens it.
 */
/** Where a point lands on a both-ways bar, as a percentage from the left: the range from `lo` to `hi`, widened to take in 0 and the value. */
const bothWaysAt = (value, { lo, hi }) => {
  const from = Math.min(lo, 0, value);
  const span = Math.max(hi, 0, value) - from || 1;
  return (n) => Math.round(((Math.max(from, Math.min(from + span, n)) - from) / span) * 1000) / 10;
};

export function bothWaysBar(value, range) {
  const at = bothWaysAt(value, range);
  return { both: true, zero: at(0), left: at(Math.min(0, value)), width: Math.round((at(Math.max(0, value)) - at(Math.min(0, value))) * 10) / 10, negative: value < 0 };
}

/**
 * A bar's threshold ticks (spec 14.12): one per mark, at `left` percent from the bar's start, on the same scale as the fill.
 * `track` is the counter's copy: its `range` for a both-ways bar, else its `scale`. A plain bar fills by size, so a tick sits at its points' size, held at the end.
 */
export function barTicks(marks, value, track) {
  const full = Math.max(track.scale || DEFAULT_SCALE, Math.abs(value));
  const at = track.range ? bothWaysAt(value, track.range) : (n) => Math.round(Math.min(1, Math.abs(n) / full) * 1000) / 10;
  return marks.map((mark) => ({ points: mark.points, reached: mark.reached, left: at(mark.points) }));
}
