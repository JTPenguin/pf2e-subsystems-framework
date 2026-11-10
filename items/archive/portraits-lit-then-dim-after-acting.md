---
title: "Character portraits lit by default, dimmed once they've acted"
kind: feature
status: done
waits_on: none
priority: 🔽
added: 2026-11-09
updated: 2026-11-09
outcome: "Panel portraits are now lit by default and dim (greyscale, 0.35 opacity) once the PC has acted; they light again on Next round. Checked live as GM and by the static tests."
source: "Justin's request, 2026-11-09; dim style picked in interview, 2026-11-09"
---
# Character portraits lit by default, dimmed once they've acted

On the player panel, every PC portrait starts lit. A portrait dims once that PC has acted this round, and lights again when the round moves on.

This reverses the current default, where a portrait not yet acted is dimmed (see [[round-counter-with-avatars]]).

**Dim style:** greyscale plus lower opacity.

**Next step:** flip the lit/dim styling on `.ssm-panel-pc`, and check it through a round as the GM marks PCs acted and then moves to the next round.
