# PF2e Subsystems Framework

A Foundry VTT module (v14, PF2e) for running PF2e subsystems from sheets, with a player panel over the canvas. Shared privately with friends' tables. The design is in `docs/spec.md`.

## Checks

- Node isn't installed; Foundry's Electron runs JavaScript: `ELECTRON_RUN_AS_NODE=1 ~/foundryvtt/foundryvtt <script>`.
- Start or stop Foundry for a live check: `foundry-ctl start|stop|restart|status`. Tell Justin before `stop` or `restart`: players may be connected.
- Log out of Foundry (Gamemaster and any test player) when a live check is done. A user left logged in holds the seat, and the next session can't take it without a restart.
- Check Foundry and PF2e APIs against the installed code in `~/foundryvtt/resources/app` and `~/.local/share/FoundryVTT/Data/systems/pf2e`.

## Work tracking

Bugs and features live in `items/`, tracked as `~/.claude/CLAUDE.md` describes. Check the folder: `python3 "/home/justin/Projects/Character Art Pipeline/infra/items.py" --dir=items check`.

Shared rules are in `~/.claude/CLAUDE.md`.
