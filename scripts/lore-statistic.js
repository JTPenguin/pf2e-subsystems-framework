/**
 * The statistic for a Lore check. A PC without the Lore rolls it untrained on Intelligence (spec section 2).
 * PF2e doesn't expose its Statistic class, so this takes it from an existing skill, and builds what prepareSkills builds for a Lore.
 * Returns null for an actor without the Lore that isn't a character.
 */
export function loreStatistic(actor, slug, label) {
  const own = actor.skills?.[slug];
  if (own || !actor.isOfType("character")) return own ?? null;
  const Statistic = actor.skills.diplomacy.constructor;
  return new Statistic(actor, {
    slug,
    label,
    attribute: "int",
    rank: 0,
    lore: true,
    domains: [slug, "int-based", "skill-check", "int-skill-check", "all", "lore-skill-check"],
    check: { type: "skill-check" },
  });
}
