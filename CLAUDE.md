# PF2e Subsystem Manager

A Foundry VTT module (v14, PF2e) for running PF2e subsystems from sheets, with a player panel over the canvas. Shared privately with friends' tables. The design is in `docs/spec.md`.

## Checks

- Node isn't installed; Foundry's Electron runs JavaScript: `ELECTRON_RUN_AS_NODE=1 ~/foundryvtt/foundryvtt <script>`.
- Start or stop Foundry for a live check: `foundry-ctl start|stop|restart|status`. Tell Justin before `stop` or `restart`: players may be connected.
- Check Foundry and PF2e APIs against the installed code in `~/foundryvtt/resources/app` and `~/.local/share/FoundryVTT/Data/systems/pf2e`.

Shared rules are in `~/.claude/CLAUDE.md`.
