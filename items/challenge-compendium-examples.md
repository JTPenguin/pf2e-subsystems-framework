---
title: "Add a compendium of example challenges, one per subsystem and type"
kind: feature
status: ready
waits_on: Claude
priority: 🔽
blocked_by: []
added: 2026-11-13
updated: 2026-11-13
source: "Justin's request, 2026-11-13: a compendium of example challenges with at least one example of each subsystem and/or type, for example the Chase types run down and beat the clock; questions answered by Justin in triage, 2026-11-13"
---
# Add a compendium of example challenges, one per subsystem and type

GMs have no ready examples to copy from. Justin wants example challenges: at least one for each subsystem, and one for each type within a subsystem.

## Decisions (Justin, 2026-11-13)

| Question | Answer |
|---|---|
| Where they live | Both: JSON source files in the repo, and a journal compendium pack built from them and shipped in the module. |
| Content | Written new for this module, using the rules' structure. Not adapted from published adventures, since the module is released publicly. |

## Coverage

One example for each preset: Victory Points, Influence, Infiltration, Preparation, Chase, Reputation and Research. Chase gets one per GM Core chase type. A web search found Chase Down (the PCs pursue), Run Away (the PCs flee) and Beat the Clock (clear every obstacle before the rounds run out). Confirm the list against GM Core before writing.

## Build notes

- Keep the sources as import files in the format of `docs/challenge-format.md`, for example in `examples/`. A GM can also import one over a blank challenge.
- Build the pack at release. Node isn't installed, but Foundry ships `classic-level` in `~/foundryvtt/resources/app/node_modules`, so a script run with `ELECTRON_RUN_AS_NODE=1` can write the LevelDB pack. Add the step to `tools/build-zip.mjs` and `.github/workflows/release.yml`, and add a `packs` entry to `module.json`.
- The `pf2e-influence` and `pf2e-influence-foundry` skills can draft the Influence example.
- Add a short section on the examples to `README.md` or `docs/gm-guide.md`.

## Done when

- Every preset, and every Chase type, has an example.
- The release zip holds the pack, and each example opens and runs in Foundry from the compendium.
- Each source file imports cleanly over a blank challenge.
