# PF2e Subsystems Framework

A Foundry VTT module (v14, PF2e) for running PF2e subsystems from sheets, with a player panel over the canvas. Released on GitHub with a manifest URL. The design is in `docs/dev/spec.md`; user docs are `README.md` and `docs/`.

## Checks

- Node isn't installed; Foundry's Electron runs JavaScript: `ELECTRON_RUN_AS_NODE=1 ~/foundryvtt/foundryvtt <script>`.
- Start or stop Foundry for a live check: `foundry-ctl start|stop|restart|status`. Tell Justin before `stop` or `restart`: players may be connected.
- Log out of Foundry (Gamemaster and any test player) when a live check is done. A user left logged in holds the seat, and the next session can't take it without a restart.
- Check Foundry and PF2e APIs against the installed code in `~/foundryvtt/resources/app` and `~/.local/share/FoundryVTT/Data/systems/pf2e`.

## Docs and releases

- User docs: `README.md`, `docs/gm-guide.md` and `docs/challenge-format.md`. A change to the data model or the sheet updates them in the same change.
- Releases: the steps are at the top of `.github/workflows/release.yml`. A version tag builds the zip and publishes the GitHub release.

## Work tracking

Bugs and features live in `items/`, tracked as `~/.claude/CLAUDE.md` describes. Check the folder: `python3 "/home/justin/Projects/Character Art Pipeline/infra/items.py" --dir=items check`.

Shared rules are in `~/.claude/CLAUDE.md`.
