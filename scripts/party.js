/** A PC's portrait for the panel (the actor's image). Null if there is none. */
export function pcImage(actor) {
  return actor.img || null;
}

/** The party's real PCs, as PF2e counts them: no NPCs, familiars, eidolons or minions. Empty when there's no party. */
export function partyPCs() {
  const isPC = (actor) => actor.alliance === "party" && actor.isOfType("character") && !["eidolon", "minion"].some((trait) => actor.system.traits?.value?.includes(trait));
  return (game.actors.party?.members ?? []).filter(isPC);
}

/**
 * Who takes part in a challenge: the party's PCs, then the actors the GM added to it, such as an NPC ally.
 * Each gets a portrait, an acted mark and a per-PC value. An added actor that no longer exists is left out.
 */
export function participants(system) {
  const pcs = partyPCs();
  const added = (system?.participants ?? []).map((id) => game.actors.get(id)).filter((actor) => actor && !pcs.includes(actor));
  return [...pcs, ...added];
}
