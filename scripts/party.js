/** The party's real PCs, as PF2e counts them: no NPCs, familiars, eidolons or minions. Empty when there's no party. */
export function partyPCs() {
  const isPC = (actor) => actor.alliance === "party" && actor.isOfType("character") && !["eidolon", "minion"].some((trait) => actor.system.traits?.value?.includes(trait));
  return (game.actors.party?.members ?? []).filter(isPC);
}
