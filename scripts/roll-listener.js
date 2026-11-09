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

/** Only the active GM's client handles results (spec section 4). A reroll also deletes the old message; nothing here listens for deletes. */
function onRollMessage(message) {
  if (!game.user.isActiveGM) return;
  const context = contextOf(message);
  const roll = parseRollOption(findRollOption(context?.options));
  if (!roll) return;
  const entry = game.journal.get(roll.challengeId);
  if (!entry) return;
  const actor = message.actor ?? message.speakerActor ?? null;
  subsystemFor(entry)?.receiveRoll?.(challengePage(entry), {
    ...roll,
    messageId: message.id,
    actorId: actor?.id ?? "",
    actorName: actor?.name ?? message.speaker?.alias ?? "",
    total: message.rolls[0]?.total ?? null,
    outcome: context.outcome ?? "",
    isReroll: !!context.isReroll,
  });
}

export function installRollListener() {
  Hooks.on("preCreateChatMessage", prepareRollMessage);
  Hooks.on("createChatMessage", onRollMessage);
}
