/** A PC's token picture for the panel: the prototype token's texture, else the actor's portrait. Null if neither is a single image (a wildcard token has no one picture). */
export function pcImage(actor) {
  const usable = (src) => (src && !src.includes("*") ? src : null);
  return usable(actor.prototypeToken?.texture?.src) ?? usable(actor.img);
}

/** The party's real PCs, as PF2e counts them: no NPCs, familiars, eidolons or minions. Empty when there's no party. */
export function partyPCs() {
  const isPC = (actor) => actor.alliance === "party" && actor.isOfType("character") && !["eidolon", "minion"].some((trait) => actor.system.traits?.value?.includes(trait));
  return (game.actors.party?.members ?? []).filter(isPC);
}
