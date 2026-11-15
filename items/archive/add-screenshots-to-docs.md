---
title: "Add screenshots to the README and GM guide"
kind: work
status: done
waits_on: none
blocked_by: []
source: "Justin's words, 2026-11-13: add screenshots to the readme and/or GM guide. Scope settled in an interview, 2026-11-15."
added: 2026-11-13
updated: 2026-11-15
outcome: "Seven screenshots in docs/images/, taken by tools/screenshots.mjs (headless Firefox over WebDriver BiDi) in the subsystem-docs world, and placed in the README and the GM guide with captions."
---
# Add screenshots to the README and GM guide

The README and the GM guide are text only. A GM reading them can't see what the challenge window, the panel or a roll looks like.

## Decisions (interview, 2026-11-15)

| Question | Answer |
|---|---|
| **Documents** | Both. The README gets one hero shot near the top. The GM guide gets a shot in each main section. |
| **Examples shown** | The Toll Captain (Influence) for most shots, plus one chase. |
| **Capture** | Scripted by Claude, so the shots can be retaken after UI changes. |
| **World** | A new world just for screenshots. |
| **Running it** | Ask Justin before each run. Foundry may have players connected, and loading the docs world may need `foundry-ctl restart`. |
| **Format** | PNG at 2x, cropped to the window or panel, compressed. |
| **module.json `media`** | No. The module is installed by manifest URL only, so Foundry's package listing doesn't matter. |

## Shot list

| File | Shows | Goes in |
|---|---|---|
| `hero.png` | The Toll Captain window beside the panel over a scene, GM view. | README, under the intro |
| `challenge-window.png` | The full challenge window: sidebar, GM notes, counters, modifiers, a subject card with its checks. | GM guide, The challenge window |
| `panel-player.png` | The panel over a scene as a player sees it, with some checks, a threshold and a modifier still hidden. | GM guide, The panel |
| `reveal-sheet-vs-panel.png` | The captain's card on the sheet, with its open and crossed-out eyes, beside the player's panel. Replaces the planned GM-panel-vs-player-panel shot: the GM's panel shows only what players see, plus the GM's buttons, so it didn't show what the eyes do. | GM guide, Running a challenge |
| `chat-card.png` | A roll's chat card, as the player sees it, with its "DC:" line naming the modifiers that changed it. The GM's card shows the margin ("Failure by −8"), which gives the DC away. | GM guide, Modifiers |
| `edit-window.png` | A modifier's edit window, with Duration, roll bonus, and the Actions and Checks lists. | GM guide, Modifiers or Fields worth knowing |
| `chase.png` | A chase on the panel: Party and Quarry tracks, one obstacle shown. Example: The Tide Causeway or After the Pickpocket. | GM guide, Creating a challenge (Chase preset) |

Each image gets a one-line caption under it. Image links use relative paths (`docs/images/…` from the README, `images/…` from the guide) so they work on GitHub.

## Setup

- **Docs world.** `subsystem-docs`, made by Justin on 2026-11-15. Only this module and the Pathfinder Beginner Box are enabled; the Beginner Box gives the Landing scene. It holds a Party actor with four PCs (the PF2e iconics from the system's compendium are the quickest), one scene with a plain map behind the panel, one Gamemaster and one test player who owns a PC. The users have no passwords. If they get some, they go in `tools/screenshots.local.json` (gitignored). The Toll Captain and the chase are imported from the Example Challenges compendium.
- **Scene state.** Before each shot the script sets the challenge's state through the module's API or document updates: started, round 2, some entries revealed, one modifier on, one PC acted, a threshold reached. The state is part of the script, so a rerun gives the same picture.
- **Capture script.** `tools/screenshots.mjs`, driving headless Firefox (see Capture method). It logs in, sets the state, crops to each element and saves the PNG at 2x. The player shots log in as the test player in a second user context. The script logs both users out at the end, per the project's CLAUDE.md.
- **Docs stay out of the zip.** `tools/build-zip.mjs` packs only `module.json`, `LICENSE`, `scripts`, `styles`, `templates`, `lang` and `packs`, so the images add nothing to the release. They only add to the git repo, so keep each under about 400 KB. Saved as 256-colour PNGs, the largest (the hero shot) is 387 KB.

## Capture method (checked 2026-11-15)

| Method | Result |
|---|---|
| Foundry's Electron running a custom script | **Doesn't work.** The packaged binary ignores the script argument and boots Foundry itself. |
| Headless Firefox 160 over WebDriver BiDi | **Works.** Use this. |

How the working test ran:

- The script runs on Foundry's Node 24 (`ELECTRON_RUN_AS_NODE=1 ~/foundryvtt/foundryvtt tools/screenshots.mjs`), which has a built-in `WebSocket`, so no npm packages are needed.
- It starts `firefox --headless --no-remote --profile <throwaway dir> --remote-debugging-port 9333`, reads the `WebDriver BiDi listening on ws://…` line from stderr, and connects to `<that url>/session`.
- `browsingContext.setViewport` with `devicePixelRatio: 2` gives 2x shots. `browsingContext.navigate` reached Foundry's join page, and `browsingContext.captureScreenshot` saved a 3200×2000 PNG.
- WebGL2 is available in headless mode on the real GPU, so the game canvas should draw. Not yet checked: a logged-in game page with a scene.
- `captureScreenshot` takes a `clip` (`{type: "element", element}` or a box), so each shot can be cropped to its window or panel. Two shots in one image (GM beside player) are joined with `convert +append`.
- A full 2x screen is 6 MB. Cropped and saved with `convert -strip PNG8:` it was 60 KB, well under the 300 KB cap. `pngquant` isn't installed and isn't needed.
- Two Firefox profiles (or two BiDi user contexts, `browser.createUserContext`) give the GM and the player separate logins at once.

The test script is not in the repo. It was a throwaway in the session's scratchpad.

## Docs changes

- **README:** the hero shot under the first paragraph.
- **GM guide:** each shot in its section, from the table above.
- **For developers** in the README: one line on how to retake the screenshots with `tools/screenshots.mjs`.

## Done when

- Every shot in the list is in `docs/images/` and appears in its section with a caption.
- The links render on GitHub. Check on the pushed branch or with a Markdown preview.
- `tools/screenshots.mjs` reruns cleanly in the docs world and leaves no user logged in.
