import { challengePage, subsystemFor } from "./registry.js";
import { findRollOption, parseRollOption, stampLinkRoll } from "./roll-option.js";

const contextOf = (message) => message.flags?.pf2e?.context;

/** Runs on the client that makes the roll. Gives each chat-link click its own roll id. A reroll copies the context, so it keeps that id. */
function prepareRollMessage(message) {
  const context = contextOf(message);
  if (!findRollOption(context?.options) || context.isReroll) return;
  const options = stampLinkRoll(context.options, foundry.utils.randomID());
  if (options) message.updateSource({ "flags.pf2e.context.options": options });
}

/** A module roll as a chat message carries it, or null for any other message. */
export function rollFromMessage(message) {
  const context = contextOf(message);
  const roll = parseRollOption(findRollOption(context?.options));
  if (!roll) return null;
  const actor = message.actor ?? message.speakerActor ?? null;
  return {
    ...roll,
    messageId: message.id,
    actorId: actor?.id ?? "",
    outcome: context.outcome ?? "",
    dc: context.dc?.value ?? null,
    isReroll: !!context.isReroll,
  };
}

/** The challenge a roll belongs to: its entry, page and subsystem. Null if the challenge has been deleted. */
export function challengeOf(roll) {
  const entry = game.journal.get(roll.challengeId);
  const subsystem = entry ? subsystemFor(entry) : null;
  const page = subsystem ? challengePage(entry) : null;
  return page ? { entry, page, subsystem } : null;
}

/**
 * Only the active GM's client handles arriving rolls (spec section 4).
 * A PF2e reroll deletes the old message and posts a new one with the same roll option, so a reroll has its own card.
 */
function onRollMessage(message) {
  if (!game.user.isActiveGM) return;
  const roll = rollFromMessage(message);
  const found = roll ? challengeOf(roll) : null;
  found?.subsystem.receiveRoll?.(found.page, roll);
}

/**
 * The GM's controls on a module roll's card. They're added to the drawn card on GM clients only, never to the message itself, so players never get them.
 * Foundry calls this hook each time a card is drawn: in the log, a popout and the chat notification.
 */
function onRenderMessage(message, html) {
  if (!game.user.isGM) return;
  const roll = rollFromMessage(message);
  if (!roll) return;
  const found = challengeOf(roll);
  const content = html.querySelector(".message-content");
  if (!content) return;
  if (found) return found.subsystem.renderRollCard?.(found.page, roll, message, content);
  const note = document.createElement("p");
  note.className = "ssm-card ssm-card-note";
  note.textContent = game.i18n.localize("SSM.Card.ChallengeGone");
  content.append(note);
}

/** A challenge that starts, ends or resets changes what its cards' controls can do, so a GM's client redraws the cards on screen. Cards not drawn are drawn fresh later. */
function onChallengeUpdate(page, changed) {
  if (!game.user.isGM || !foundry.utils.hasProperty(changed, "system.run.status")) return;
  const entryId = page.parent?.id;
  const ids = new Set([...document.querySelectorAll(".chat-message[data-message-id]")].map((li) => li.dataset.messageId));
  for (const id of ids) {
    const message = game.messages.get(id);
    if (message && rollFromMessage(message)?.challengeId === entryId) ui.chat.updateMessage(message);
  }
}

export function installRollListener() {
  Hooks.on("preCreateChatMessage", prepareRollMessage);
  Hooks.on("createChatMessage", onRollMessage);
  Hooks.on("renderChatMessageHTML", onRenderMessage);
  Hooks.on("updateJournalEntryPage", onChallengeUpdate);
}
