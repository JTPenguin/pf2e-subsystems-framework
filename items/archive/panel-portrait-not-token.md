---
title: "Player panel shows the token image, not the avatar"
kind: work
status: done
waits_on: none
priority: ⏫
added: 2026-11-09
updated: 2026-11-09
outcome: "Panel PC pictures now use actor.img, cropped cover and top-anchored. Checked with unit tests, load check, and live: computed object-position is 50% 0%, and pcImage returned the portrait while the prototype token was changed in memory to differ."
source: "Justin's bug report, 2026-11-09; fit picked in interview, 2026-11-09"
---
# Player panel shows the token image, not the avatar

The PC pictures on the player panel look like token images. They should be the actor's portrait (`actor.img`).

**Fit:** portraits are often tall, and the panel shows small squares. Fill the square and anchor the image to the top, so the face usually shows (`object-fit: cover; object-position: top`).

**Next step:** find where the panel's `party` list gets `img`, switch it to the actor's portrait, apply the top-anchored crop, and check with a PC whose token and portrait differ.
