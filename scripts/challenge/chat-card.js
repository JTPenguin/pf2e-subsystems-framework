import { MODULE } from "../constants.js";
import { challengeOf, rollFromMessage } from "../roll-listener.js";
import { pointsText } from "./panel-view.js";
import { subjectName } from "./skill-label.js";
import { applyBlock, OUTCOMES, outcomePlan, undoBlock } from "./run.js";
import { announceTriggers, applyChallengeRoll, undoChallengeApply } from "./state.js";

/*
 * The GM's controls on a challenge's roll cards (spec section 14.8): one button per degree of success whose outcome row changes something,
 * with the rolled degree highlighted and its notes shown as reminders. They're drawn on GM clients only. The roll message itself holds
 * nothing but the `applied` flag, so players see the plain PF2e roll.
 * Each Apply posts an applied-result card, whispered to GMs, with an Undo button that reverses exactly what that Apply did.
 */

/** Set on a roll message once a result is applied: the degree applied. It locks every button on the card, for every GM and after a reload. */
export const APPLIED_FLAG = "applied";

/** Set on an applied-result card: { challengeId, rollMessageId, record, undone }. */
export const RESULT_FLAG = "result";

const loc = (key) => game.i18n.localize(key);
const signed = (n) => (n > 0 ? `+${n}` : `${n}`.replace("-", "−"));
const escape = (text) => foundry.utils.escapeHTML(String(text ?? ""));

/** Messages being applied or undone on this client, so a double click can't start a second write before the first lands. */
const working = new Set();

function note(text) {
  const line = document.createElement("p");
  line.className = "ssm-card-note";
  line.textContent = text;
  return line;
}

const pointsLabel = (system, amount) => pointsText(system.pointsName || loc("SSM.Challenge.Points"), amount);
const roundsLabel = (amount) => game.i18n.format(`SSM.Panel.Change.rounds.${Math.abs(amount) === 1 ? "one" : "other"}`, { amount: signed(amount) });

/** What one degree's row will do, as text: "+1 Influence Point, +2 Awareness". */
function planText(system, plan) {
  const one = (change) => {
    if (change.type === "points") return `${signed(change.amount)} ${pointsLabel(system, change.amount)}`;
    if (change.type === "counter") return `${signed(change.amount)} ${change.counter || loc("SSM.Challenge.UnnamedCounter")}`;
    return roundsLabel(change.amount);
  };
  return plan.changes.map(one).join(", ");
}

/** A degree button's tooltip: each effect and note of its row, and whether the action's maximum cut it short. */
function planTooltip(system, plan) {
  const lines = [planText(system, plan), ...plan.notes];
  if (plan.capped) lines.push(loc("SSM.Card.Capped"));
  return lines.filter(Boolean).map(escape).join("<br>");
}

/** What an Apply actually changed, as the result card says it: "+1 Influence Point (Vessa), +1 Awareness". */
function recordText(system, record) {
  const one = (change) => {
    if (change.type === "points") {
      const index = system.subjects.findIndex((subject) => subject.id === change.subjectId);
      const subject = system.subjects[index];
      const name = subject ? subjectName(subject, index, system.subjectLabel) : "";
      return `${signed(change.amount)} ${pointsLabel(system, change.amount)}${name ? ` (${name})` : ""}`;
    }
    if (change.type === "counter") {
      const counter = system.counters.find((candidate) => candidate.id === change.counterId);
      return `${signed(change.amount)} ${counter?.name || loc("SSM.Challenge.UnnamedCounter")}`;
    }
    return roundsLabel(change.amount);
  };
  return record.changes.map(one).join(", ") || loc("SSM.Card.Result.NoChange");
}

/** Post the applied-result card, whispered to GMs only, since it can name hidden subjects and counters. */
function postResultCard(found, rollMessage, roll, record) {
  const { entry, page } = found;
  const actor = game.actors.get(roll.actorId)?.name ?? rollMessage.speaker?.alias ?? "";
  const degree = loc(`SSM.Challenge.Outcome.${record.outcome}`);
  const heading = game.i18n.format(actor ? "SSM.Card.Result.Heading" : "SSM.Card.Result.HeadingNoActor", { actor, degree });
  const content = `<div class="ssm-result"><p><strong>${escape(entry.name)}</strong></p><p>${escape(heading)}</p><p class="ssm-result-changes">${escape(recordText(page.system, record))}</p></div>`;
  return ChatMessage.create({
    content,
    speaker: { alias: entry.name },
    whisper: game.users.filter((user) => user.isGM).map((user) => user.id),
    flags: { [MODULE]: { [RESULT_FLAG]: { challengeId: entry.id, rollMessageId: rollMessage.id, record, undone: false } } },
  });
}

async function applyFromCard(event, message, outcome) {
  event.preventDefault();
  event.stopPropagation();
  if (!game.user.isActiveGM || working.has(message.id) || message.getFlag(MODULE, APPLIED_FLAG)) return;
  const roll = rollFromMessage(message);
  const found = roll ? challengeOf(roll) : null;
  // The challenge was deleted since the card was drawn. Redraw it, so it shows the note instead of the buttons.
  if (!found) return ui.chat.updateMessage(message);
  working.add(message.id);
  for (const button of event.currentTarget.parentElement.querySelectorAll("button")) button.disabled = true;
  try {
    const result = await applyChallengeRoll(found.page, roll, outcome);
    if (result === false) {
      const reason = applyBlock(found.page.system, roll) || "applied";
      ui.notifications.warn(`SSM.Card.Blocked.${reason}`, { localize: true });
      ui.chat.updateMessage(message);
      return;
    }
    announceTriggers(result);
    await message.setFlag(MODULE, APPLIED_FLAG, outcome);
    await postResultCard(found, message, roll, result.record);
  } catch (error) {
    console.error(`${MODULE} | Could not apply a roll`, error);
    ui.chat.updateMessage(message);
  } finally {
    working.delete(message.id);
  }
}

/** The degree buttons, in order from critical success to critical failure, and the lines that explain them. */
function degreeControls(page, roll, message, plans) {
  const applied = message.getFlag(MODULE, APPLIED_FLAG) || "";
  const reason = applied ? "applied" : applyBlock(page.system, roll);
  const rows = plans.filter((plan) => plan.changes.length);
  if (!rows.length) return [];
  const group = document.createElement("div");
  group.className = "ssm-card-degrees";
  for (const plan of rows) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "ssm-card-apply";
    button.classList.toggle("ssm-card-rolled", plan.outcome === roll.outcome);
    button.classList.toggle("ssm-card-chosen", plan.outcome === applied);
    button.textContent = game.i18n.format("SSM.Card.ApplyDegree", { degree: loc(`SSM.Challenge.Outcome.${plan.outcome}`), changes: planText(page.system, plan) });
    button.dataset.tooltipHtml = planTooltip(page.system, plan);
    button.setAttribute("aria-pressed", String(plan.outcome === applied));
    button.disabled = !!reason || !game.user.isActiveGM;
    button.addEventListener("click", (event) => applyFromCard(event, message, plan.outcome));
    group.append(button);
  }
  const parts = [group];
  if (applied) parts.push(note(OUTCOMES.includes(applied) ? game.i18n.format("SSM.Card.AppliedDegree", { degree: loc(`SSM.Challenge.Outcome.${applied}`) }) : loc("SSM.Card.Blocked.applied")));
  else if (reason) parts.push(note(loc(`SSM.Card.Blocked.${reason}`)));
  else if (!game.user.isActiveGM) parts.push(note(loc("SSM.Card.NotActiveGM")));
  return parts;
}

/** Add the GM's lines to a drawn roll card. `content` is the card's `.message-content`. */
export function renderChallengeCard(page, roll, message, content) {
  if (!roll.outcome) return;
  const plans = OUTCOMES.map((outcome) => outcomePlan(page.system, roll, outcome));
  const rolled = plans[OUTCOMES.indexOf(roll.outcome)] ?? null;
  const parts = plans[0] === null ? [note(loc("SSM.Card.Blocked.gone"))] : [...degreeControls(page, roll, message, plans), ...(rolled?.notes ?? []).map(note)];
  if (rolled?.capped && !message.getFlag(MODULE, APPLIED_FLAG)) parts.push(note(loc("SSM.Card.Capped")));
  if (!parts.length) return;
  const box = document.createElement("div");
  box.className = "ssm-card";
  box.append(...parts);
  content.append(box);
}

async function undoFromCard(event, page, message) {
  event.preventDefault();
  event.stopPropagation();
  const result = message.getFlag(MODULE, RESULT_FLAG);
  if (!game.user.isActiveGM || !result || result.undone || working.has(message.id)) return;
  working.add(message.id);
  event.currentTarget.disabled = true;
  try {
    const undone = await undoChallengeApply(page, result.record);
    if (undone === false) {
      ui.notifications.warn(`SSM.Card.UndoBlocked.${undoBlock(page.system, result.record) || "notApplied"}`, { localize: true });
      ui.chat.updateMessage(message);
      return;
    }
    await message.setFlag(MODULE, RESULT_FLAG, { ...result, undone: true });
    // The roll card's buttons unlock, so the GM can pick again.
    await game.messages.get(result.rollMessageId)?.unsetFlag(MODULE, APPLIED_FLAG);
  } catch (error) {
    console.error(`${MODULE} | Could not undo a result`, error);
    ui.chat.updateMessage(message);
  } finally {
    working.delete(message.id);
  }
}

/** Add the Undo button to a drawn applied-result card. It runs on GM clients only: players never get the card. */
export function renderResultCard(page, message, content) {
  const result = message.getFlag(MODULE, RESULT_FLAG);
  if (!result) return;
  const reason = result.undone ? "" : undoBlock(page.system, result.record);
  const box = document.createElement("div");
  box.className = "ssm-card";
  const button = document.createElement("button");
  button.type = "button";
  button.className = "ssm-card-undo";
  button.innerHTML = `<i class="fa-solid fa-rotate-left" inert></i> ${escape(loc(result.undone ? "SSM.Card.Undone" : "SSM.Card.Undo"))}`;
  button.disabled = result.undone || !!reason || !game.user.isActiveGM;
  button.addEventListener("click", (event) => undoFromCard(event, page, message));
  box.append(button);
  if (!result.undone && reason) box.append(note(loc(`SSM.Card.UndoBlocked.${reason}`)));
  else if (!result.undone && !game.user.isActiveGM) box.append(note(loc("SSM.Card.NotActiveGM")));
  content.append(box);
}
