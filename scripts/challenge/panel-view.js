/*
 * What players may see of a challenge. No Foundry calls, so tools/test.mjs can check it.
 * Every entry is built field by field: a new field on the data can't reach players until it is added here.
 */

import { BOTH_WAYS, groupByCategory, isVisibleCheck, skillKey } from "./data.js";
import { chaseCounterOf, chaseStatus, counterValueOf, currentDc, currentObstacle, isChase, isComplete, pointsOf } from "./run.js";

/** Scale for a bar when the track has no goal and no thresholds. */
const DEFAULT_SCALE = 10;

const isVisible = (row) => row.revealed;
const visibleChecks = (subject) => subject.actions.flatMap((action) => action.checks.filter(isVisibleCheck));
/** Every check players can see: the visible checks of revealed subjects. */
const allVisibleChecks = (system) => system.subjects.filter(isVisible).flatMap(visibleChecks);

/** A skill as players may see it: its name fields only, never its id or DC. */
const skillName = (row) => ({ skill: row.skill, lore: row.lore });

/**
 * What one effect does, in terms players may see, or null if it shows nothing. A DC change shows as a DC change ("−2 to DCs vs Diplomacy"),
 * with the amount only, so no DC number appears. A check players can't see is left out without a trace,
 * and a change that covers only hidden checks shows nothing.
 * A counter players can't see hides the whole effect. Notes are the GM's words, so they never show.
 */
function changeView(system, subject, effect) {
  if (!effect.amount) return null;
  if (effect.type === "dc") {
    if (effect.allSkills) return { type: "dc", amount: effect.amount, all: true, skills: [] };
    // A challenge-level entry (no subject) names skills, so it shows the skills of any check players can see (spec 14.7).
    const rows = subject ? visibleChecks(subject).filter((row) => effect.skills.includes(row.id)) : allVisibleChecks(system).filter((row) => effect.skills.includes(skillKey(row)));
    if (!rows.length) return null;
    // Two actions can share a skill: name it once.
    const shown = [...new Map(rows.map((row) => [`${row.skill}:${row.lore}`, skillName(row)])).values()];
    return { type: "dc", amount: effect.amount, all: false, skills: shown };
  }
  if (effect.type === "points") return subject ? { type: "points", amount: effect.amount } : null;
  if (effect.type === "rounds") return { type: "rounds", amount: effect.amount };
  if (effect.type === "counter") {
    const counter = system.counters.find((candidate) => candidate.id === effect.counterId);
    return counter && isVisible(counter) ? { type: "counter", amount: effect.amount, counter: counter.name } : null;
  }
  return null;
}

/** A revealed modifier entry, as a card on the panel. `group` is its category: the label and the stripe colour. `subject` is null for a challenge-level entry. */
const modifierView = (system, subject, row, group) => ({
  id: row.id,
  name: row.name,
  text: row.playerText,
  category: group.label,
  colour: group.colour,
  duration: row.duration,
  active: !!row.active,
  spent: !!row.spent,
  // A one-time entry with a DC change is applied before it is spent: its other effects have happened, its DC change hasn't.
  applied: !!row.applied,
  changes: row.effects.map((effect) => changeView(system, subject, effect)).filter(Boolean),
});

/** "Influence Points" for any amount but one, "Influence Point" for one. Names are English and end in "s" when plural. */
export function pointsText(name, amount) {
  return Math.abs(amount) === 1 && /[^s]s$/i.test(name) ? name.slice(0, -1) : name;
}

/**
 * One change as text, such as "−2 to DCs vs Diplomacy" or "−1 Influence Point".
 * `format(key, data)` and `list(items)` are Foundry's localisation, `label(skill)` names a skill and `points` is the challenge's points name, so tools/test.mjs can pass stand-ins.
 */
export function changeText(change, { format, list, label, points }) {
  const amount = change.amount > 0 ? `+${change.amount}` : `−${-change.amount}`;
  const plural = Math.abs(change.amount) === 1 ? "one" : "other";
  const key = "SSM.Panel.Change";
  if (change.type === "dc") {
    if (change.all) return format(`${key}.dcAll`, { amount });
    return format(`${key}.dc`, { amount, skills: list(change.skills.map(label)) });
  }
  if (change.type === "counter") return format(`${key}.counter`, { amount, counter: change.counter || format("SSM.Challenge.UnnamedCounter", {}) });
  if (change.type === "points") return format(`${key}.points`, { amount, points: pointsText(points, change.amount) });
  return format(`${key}.${change.type}.${plural}`, { amount });
}

/**
 * A panel card's hover text as HTML, or "" when there is none, so the card shows no hover.
 * Players get the player text alone. A GM gets the player text, unlabelled, then the GM text under a heading of its own (`gmLabel`).
 * The GM text is never in the shared copy: a GM's client passes it in from the challenge itself, and it is ignored unless `isGM`.
 * `escape` is Foundry's HTML escape, so neither text can add markup.
 */
export function cardTooltip({ playerText, gmText, isGM }, { escape, gmLabel }) {
  const line = (text, label) => `<p class="ssm-panel-tip-line">${label ? `<strong class="ssm-panel-tip-label">${escape(label)}</strong>` : ""}${escape(text)}</p>`;
  const player = String(playerText ?? "").trim();
  if (!isGM) return player ? line(player) : "";
  const gm = String(gmText ?? "").trim();
  return (player ? line(player) : "") + (gm ? line(gm, gmLabel) : "");
}

/** The thresholds players may see, in the order the track reaches them. A points-only threshold shows as "6: ???": its text stays out of the copy. */
function thresholdViews(rows, direction) {
  const order = direction === "down" ? (a, b) => b.points - a.points : (a, b) => a.points - b.points;
  return rows.filter((row) => row.reveal === "points" || row.reveal === "full").sort(order).map((row) => ({
    id: row.id, points: row.points, text: row.reveal === "full" ? row.playerText : "", textHidden: row.reveal === "points", reached: !!row.reached,
  }));
}

/** The revealed entries of a list as cards, grouped by category: the blank category first, then category order (spec 14.7). */
const cards = (system, subject, rows) => groupByCategory(system, rows.filter(isVisible)).flatMap((group) => group.rows.map((row) => modifierView(system, subject, row, group)));

/**
 * A subject's modifiers as the panel's sections (spec 14.7): the blank category first, with no heading, shown only when one of its entries is revealed;
 * then every labelled category the subject has, plus the preset's suggestions, each with its revealed cards, empty when none are.
 * A category's label shows even when all its entries are hidden.
 */
const cardGroups = (system, subject) => groupByCategory(system, subject.modifiers.filter(isVisible), { withSuggestions: true, keep: subject.modifiers.map((row) => row.category) })
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
 * A bar's scale. A track that counts up scales to its goal or its highest threshold, hidden or not: Justin accepts that players can work out the goal from the bar.
 * A track that counts down scales to the value it started the run with. Zero means no scale, and the bar falls back to 10.
 * Only this number goes in the copy, never a hidden threshold's text or id.
 */
function trackScale({ direction, thresholds, goal = null, max = null }, value, startValue) {
  if (direction === "down") return Math.max(0, startValue ?? value);
  return Math.max(0, goal ?? 0, max ?? 0, ...thresholds.map((row) => row.points));
}

function subjectView(system, subject, party) {
  const start = system.run.baseline?.subjects?.[subject.id]?.points;
  const view = {
    id: subject.id,
    // Its place in the GM's order, for a stand-in name such as "Obstacle 3".
    index: system.subjects.indexOf(subject),
    name: subject.name,
    tracksPoints: !!subject.tracksPoints,
    individual: !!subject.individual,
    points: subject.points,
    complete: isComplete(subject, party.map((pc) => pc.id)),
    scale: trackScale(subject, subject.points, start),
    range: subject.direction === BOTH_WAYS ? bothWaysRange(subject) : null,
    // One row per PC on an individual subject. Everyone sees every row.
    pcs: subject.individual ? party.map((pc) => ({ id: pc.id, points: pointsOf(subject, pc.id), complete: subject.complete || subject.completeBy.includes(pc.id) })) : [],
    // An action with no check players can see is left out whole. The DC is in the copy for the roll; the panel never shows it.
    actions: subject.actions.map((action) => ({
      id: action.id,
      name: action.name,
      description: action.description ?? "",
      secret: !!action.secret,
      checks: action.checks.filter(isVisibleCheck).map((row) => ({ id: row.id, skill: row.skill, lore: row.lore, dc: currentDc(system, subject, row) })),
    })).filter((action) => action.checks.length),
    // By category: the blank one first, then the preset's suggestions, then others by first use; each keeps the GM's order.
    modifierGroups: cardGroups(system, subject),
    // An individual subject has a goal only.
    thresholds: subject.individual ? [] : thresholdViews(subject.thresholds, subject.direction),
  };
  return view;
}

/** A revealed counter. One with thresholds is a full track: a bar and its visible thresholds. A per-PC counter has a value per party PC and no thresholds. */
function counterView(system, counter, party) {
  const start = system.run.baseline?.counters?.[counter.id]?.value;
  const perPc = !!counter.perPc;
  return {
    id: counter.id,
    name: counter.name,
    value: counter.value,
    perPc,
    pcs: perPc ? party.map((pc) => ({ id: pc.id, value: counterValueOf(counter, pc.id) })) : [],
    track: !perPc && counter.thresholds.length > 0,
    scale: trackScale(counter, counter.value, start),
    range: counter.direction === BOTH_WAYS ? bothWaysRange(counter) : null,
    thresholds: perPc ? [] : thresholdViews(counter.thresholds, counter.direction),
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

/**
 * A chase's progress track: one slot per obstacle, in order, with the party's and the other side's obstacle numbers.
 * A hidden obstacle's name stays out. The other side shows only while its counter is revealed.
 */
function chaseView(system) {
  const status = chaseStatus(system);
  const counter = chaseCounterOf(system);
  const shown = !!counter?.revealed;
  return {
    type: status.type,
    total: status.total,
    position: status.position,
    other: shown ? status.other : null,
    otherName: shown ? counter.name : "",
    slots: system.subjects.map((subject) => ({ revealed: !!subject.revealed, name: subject.revealed ? subject.name : "", cleared: isComplete(subject) })),
  };
}

/**
 * The subjects on the panel. In a chase it is only the party's current obstacle, and only once it is revealed, so clearing one brings up the next
 * the GM has revealed. Otherwise every revealed subject.
 */
function panelSubjects(system) {
  if (!isChase(system)) return system.subjects.filter(isVisible);
  const current = currentObstacle(system)?.subject;
  return current?.revealed ? [current] : [];
}

/** The filtered copy. `party` is a list of { id, name, img }. Only revealed subjects and counters go in. */
export function buildPanelView({ name, system, party }) {
  const chase = isChase(system) ? chaseView(system) : null;
  // A chase's other side is on its track, not in the counter list.
  const counterShown = (counter) => isVisible(counter) && !(chase && counter.id === system.chase.counterId);
  return {
    name,
    pointsName: system.pointsName,
    subjectLabel: system.subjectLabel,
    rounds: { current: system.rounds.current, max: system.rounds.max },
    // Challenge-level entries, for the strip above the subject columns (spec 14.7).
    modifiers: cards(system, null, system.modifiers ?? []),
    subjects: panelSubjects(system).map((subject) => subjectView(system, subject, party)),
    counters: system.counters.filter(counterShown).map((counter) => counterView(system, counter, party)),
    chase,
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
export function bothWaysBar(value, { lo, hi }) {
  const from = Math.min(lo, 0, value);
  const to = Math.max(hi, 0, value);
  const span = to - from || 1;
  const at = (n) => Math.round(((n - from) / span) * 1000) / 10;
  return { both: true, zero: at(0), left: at(Math.min(0, value)), width: Math.round((at(Math.max(0, value)) - at(Math.min(0, value))) * 10) / 10, negative: value < 0 };
}
