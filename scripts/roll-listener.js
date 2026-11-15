import { MODULE } from "./constants.js";
import { challengePage, subsystemFor } from "./registry.js";
import { findRollOption, parseRollOption, parseUsedOption, stampLinkRoll } from "./roll-option.js";

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
    // The modifier entries the roll used, or null for a chat link's roll.
    used: parseUsedOption(context.options),
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
 * Only the active GM's client handles arriving rolls (spec section 4). It stores what changed the roll's DC on the message, before the roll
 * spends anything, and the card shows it as a line (renderDcChanges). Otherwise the roll card is PF2e's own.
 * A PF2e reroll deletes the old message and posts a new one with the same roll option, marked as a reroll. It gets the line too.
 */
function onRollMessage(message) {
  if (!game.user.isActiveGM) return;
  const roll = rollFromMessage(message);
  const found = roll ? challengeOf(roll) : null;
  if (!found) return;
  const changes = found.subsystem.rollDcChanges?.(found.page, roll) ?? [];
  if (changes.length) message.setFlag(MODULE, "dcChanges", changes);
  found.subsystem.receiveRoll?.(found.page, roll);
}

/** An amount with its sign and a real minus: "+2", "−2". */
export const signedAmount = (amount) => (amount < 0 ? `−${-amount}` : `+${amount}`);

/**
 * The changes one viewer may see, as the line's parts: [{ text, hidden }]. Players get only what they may see; the GM gets everything,
 * with what players don't see marked hidden. Each change shows with its own amount, even when they cancel out (Justin, 2026-11-15).
 */
export const dcChangeParts = (changes, isGM) => (Array.isArray(changes) ? changes : [])
  .filter((change) => isGM || !change.hidden)
  .map((change) => ({ text: `${change.name} ${signedAmount(change.amount)}`, hidden: !!change.hidden }));

/** The line under the degree of success: "DC: Old Soldier −2, Suspicion 4 +2". No DC number, so it gives nothing away. */
function renderDcChanges(message, html) {
  const parts = dcChangeParts(message.getFlag(MODULE, "dcChanges"), game.user.isGM);
  if (!parts.length || !message.isContentVisible) return;
  const line = document.createElement("div");
  line.className = "ssm-dc-changes";
  const [before, after] = game.i18n.localize("SSM.Challenge.DcChanges").split("{changes}");
  line.append(before ?? "");
  parts.forEach((part, index) => {
    if (index) line.append(", ");
    const span = document.createElement("span");
    span.textContent = part.text;
    if (part.hidden) {
      span.classList.add("hidden-change");
      span.dataset.tooltip = game.i18n.localize("SSM.Challenge.DcChangesHidden");
    }
    line.append(span);
  });
  line.append(after ?? "");
  const anchor = html.querySelector(".target-dc-result") ?? html.querySelector(".dice-roll");
  if (anchor) anchor.after(line);
  else html.querySelector(".message-content")?.append(line);
}

export function installRollListener() {
  Hooks.on("preCreateChatMessage", prepareRollMessage);
  Hooks.on("createChatMessage", onRollMessage);
  Hooks.on("renderChatMessageHTML", renderDcChanges);
}
