---
title: "Fade hidden items and brighten revealed items in the GM window"
kind: feature
status: done
waits_on: none
priority: 🔽
blocked_by: []
source: "Justin's request, 2026-11-10; details from Justin's interview, 2026-11-10"
added: 2026-11-10
updated: 2026-11-10
outcome: "Hidden skills, thresholds, modifiers and counters are faded with no fill; revealed ones get a brighter fill per theme; the light-theme eye icon is dark red. Built together with on-off-indicator-stripe-only-when-on; checked live in both themes."
---
# Fade hidden items and brighten revealed items in the GM window

Hidden items should look faded. Revealed items should look brighter.

**Decision (Justin, 2026-11-10):** fading means hidden, and nothing else. Off is shown only by the missing color stripe (see [[on-off-indicator-stripe-only-when-on]]), so the two signals never overlap.

This changes the styling from [[hidden-vs-revealed-styling]] (archived, done 2026-11-09), which made hidden items plain and revealed items solid. The GM window defaults to the light parchment theme, so check both themes.

**Done when:** on a live challenge, hidden and revealed skills, thresholds and modifiers are easy to tell apart in the light and dark themes.
