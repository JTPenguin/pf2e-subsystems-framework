---
title: "Make subsystem mechanics generic so every subsystem reuses them"
kind: feature
status: ready
waits_on: Claude
blocked_by: []
source: "Justin's list of items, 2026-11-11"
added: 2026-11-11
updated: 2026-11-11
---
# Make subsystem mechanics generic so every subsystem reuses them

Every subsystem should share one set of code. Do not write bespoke mechanics for each subsystem.

**Example:** Influence has Discover and Influence as its main actions, and each uses a set of skills. Infiltration has actions such as Forge a Document. These should run on the same underlying code.

This applies to the existing Influence subsystem and to [[chase-subsystem]], [[research-subsystem]] and [[infiltration-subsystem]]. Build the shared parts first, then move Influence onto them.

**Done when:** the four subsystems use one shared action and skill mechanic. Influence still works as before in Foundry. Check it with a live Influence challenge.
