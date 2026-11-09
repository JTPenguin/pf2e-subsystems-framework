import { MODULE } from "../../constants.js";
import { challengeOf, rollFromMessage } from "../../roll-listener.js";
import { applyBlock, suggestedPoints } from "./run.js";
import { applyInfluenceRoll } from "./state.js";

/*
 * The GM's controls on an Influence challenge's roll cards (spec section 8): Apply on an Influence roll, a reminder line on a Discover roll.
 * They're drawn on GM clients only. The message itself holds nothing but the `applied` flag, so players see the plain PF2e roll.
 */

/** Set on a message once its result is applied, so the button stays disabled after a reload and for every GM. */
export const APPLIED_FLAG = "applied";

const loc = (key) => game.i18n.localize(key);
const signed = (n) => (n > 0 ? `+${n}` : `${n}`.replace("-", "−"));

/** Messages being applied on this client, so a double click can't start a second write before the first lands. */
const working = new Set();

function note(text) {
  const line = document.createElement("p");
  line.className = "ssm-card-note";
  line.textContent = text;
  return line;
}

async function applyFromCard(event, message) {
  event.preventDefault();
  event.stopPropagation();
  const button = event.currentTarget;
  if (!game.user.isActiveGM || working.has(message.id) || message.getFlag(MODULE, APPLIED_FLAG)) return;
  const roll = rollFromMessage(message);
  const found = roll ? challengeOf(roll) : null;
  // The challenge was deleted since the card was drawn. Redraw it, so it shows the note instead of the button.
  if (!found) return ui.chat.updateMessage(message);
  working.add(message.id);
  button.disabled = true;
  try {
    const result = await applyInfluenceRoll(found.page, roll);
    if (result === false) {
      const reason = applyBlock(found.page.system, roll) || "applied";
      ui.notifications.warn(`SSM.Card.Blocked.${reason}`, { localize: true });
      if (reason === "applied") await message.setFlag(MODULE, APPLIED_FLAG, true);
      else ui.chat.updateMessage(message);
      return;
    }
    await message.setFlag(MODULE, APPLIED_FLAG, true);
  } catch (error) {
    console.error(`${MODULE} | Could not apply a roll`, error);
    button.disabled = false;
  } finally {
    working.delete(message.id);
  }
}

function influenceControls(page, roll, message) {
  const applied = !!message.getFlag(MODULE, APPLIED_FLAG);
  const reason = applied ? "applied" : applyBlock(page.system, roll);
  const button = document.createElement("button");
  button.type = "button";
  button.className = "ssm-card-apply";
  button.textContent = reason === "applied" ? loc("SSM.Card.Applied") : game.i18n.format("SSM.Card.Apply", { points: signed(suggestedPoints(roll.outcome)) });
  button.disabled = !!reason || !game.user.isActiveGM;
  button.addEventListener("click", (event) => applyFromCard(event, message));
  const parts = [button];
  if (reason && reason !== "applied") parts.push(note(loc(`SSM.Card.Blocked.${reason}`)));
  else if (!reason && !game.user.isActiveGM) parts.push(note(loc("SSM.Card.NotActiveGM")));
  return parts;
}

/** Add the GM's line to a drawn card. `content` is the card's `.message-content`. */
export function renderInfluenceCard(page, roll, message, content) {
  let parts;
  if (roll.kind === "influence") parts = influenceControls(page, roll, message);
  else if (roll.kind === "discover" && roll.outcome) parts = [note(loc(`SSM.Influence.Reminder.${roll.outcome}`))];
  if (!parts) return;
  const box = document.createElement("div");
  box.className = "ssm-card";
  box.append(...parts);
  content.append(box);
}
