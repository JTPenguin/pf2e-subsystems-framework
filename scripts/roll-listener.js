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
 * Only the active GM's client handles arriving rolls (spec section 4). The roll card itself is PF2e's own: the module adds nothing to it.
 * A PF2e reroll deletes the old message and posts a new one with the same roll option, marked as a reroll.
 */
function onRollMessage(message) {
  if (!game.user.isActiveGM) return;
  const roll = rollFromMessage(message);
  const found = roll ? challengeOf(roll) : null;
  found?.subsystem.receiveRoll?.(found.page, roll);
}

export function installRollListener() {
  Hooks.on("preCreateChatMessage", prepareRollMessage);
  Hooks.on("createChatMessage", onRollMessage);
}
