import { ACTIVE_SETTING, MODULE, POSITION_SETTING } from "../constants.js";
import { allSubsystems, subsystemByType } from "../registry.js";
import { panelState, schedulePublish } from "./activation.js";

/*
 * The panel frame every client shares. It draws only from the setting, so players never need the challenge itself.
 * What goes inside comes from the subsystem's `panel` definition.
 */

const POSITIONS = ["center", "left", "right"];
const { renderTemplate } = foundry.applications.handlebars;

let element = null;
let drawn = null;
let drawing = false;
let again = false;
let pressing = false;
let heldBack = false;
let sheetKey = "";

function removePanel() {
  element?.remove();
  element = null;
  drawn = null;
}

function applyPosition() {
  if (element) element.dataset.position = game.settings.get(MODULE, POSITION_SETTING);
}

function onClick(event) {
  const target = event.target.closest("[data-action]");
  if (!target || target.disabled) return;
  const state = panelState();
  const panel = subsystemByType(state.type)?.panel;
  panel?.viewActions?.[target.dataset.action]?.(state, target, event);
}

function mountPanel() {
  const parent = document.getElementById("ui-top");
  if (!parent) return null;
  if (element?.parentElement === parent) return element;
  element?.remove();
  element = document.createElement("section");
  element.id = "ssm-panel";
  element.className = "ssm-panel";
  element.addEventListener("click", onClick);
  element.addEventListener("pointerdown", () => {
    pressing = true;
  });
  drawn = null;
  applyPosition();
  parent.append(element);
  return element;
}

/** Replace the panel's HTML only when it changes, so frequent run writes don't touch what's on screen. */
function setView(html) {
  if (drawn === html) return;
  element.innerHTML = html;
  drawn = html;
}

async function draw() {
  const state = panelState();
  const panel = subsystemByType(state.type)?.panel;
  if (!state.view || state.hidden || !panel) return removePanel();
  const view = await renderTemplate(panel.template, panel.prepareView(state.view));
  // A redraw during a press would replace the button being pressed and lose the click. The release catches up.
  if (pressing) {
    heldBack = true;
    return;
  }
  if (mountPanel()) setView(view);
}

/** Redraw the panel. Calls during a draw run once more afterwards, so the last state is the one on screen. */
async function refreshPanel() {
  if (drawing) {
    again = true;
    return;
  }
  drawing = true;
  try {
    do {
      again = false;
      await draw();
    } while (again);
  } catch (error) {
    console.error(`${MODULE} | Could not draw the panel`, error);
  } finally {
    drawing = false;
  }
}

function onPressEnd() {
  if (!pressing) return;
  // Wait a moment: the click comes after the pointer is released, and it must find its button.
  setTimeout(() => {
    pressing = false;
    if (heldBack) {
      heldBack = false;
      refreshPanel();
    }
  }, 100);
}

/** Open sheets show Start, Hide and Show from the setting, so they redraw when the active challenge or its hidden state changes. */
function refreshSheets() {
  const { id, hidden } = panelState();
  const key = `${id ?? ""}:${!!hidden}`;
  if (key === sheetKey || !game.user.isGM) {
    sheetKey = key;
    return;
  }
  sheetKey = key;
  for (const app of foundry.applications.instances.values()) {
    // The render context tells the sheet this is an outside update, so it won't throw away text being typed.
    if (app.rendered && allSubsystems().some((subsystem) => app instanceof subsystem.sheet)) app.render({ renderContext: "ssmPanel" });
  }
}

function onSettingChange() {
  refreshPanel();
  refreshSheets();
}

function onChallengeChange(entryId) {
  if (entryId !== panelState().id) return;
  schedulePublish();
}

function installHooks() {
  Hooks.on("updateJournalEntryPage", (page) => onChallengeChange(page.parent?.id));
  Hooks.on("deleteJournalEntryPage", (page) => onChallengeChange(page.parent?.id));
  Hooks.on("updateJournalEntry", (entry) => onChallengeChange(entry.id));
  Hooks.on("deleteJournalEntry", (entry) => onChallengeChange(entry.id));
  // The party's roster and names are part of the copy. Most actor updates change nothing, and those cost no write.
  for (const hook of ["createActor", "updateActor", "deleteActor"]) Hooks.on(hook, schedulePublish);
  // A GM arriving may become the active GM, who then checks the setting is still right.
  Hooks.on("userConnected", schedulePublish);
  Hooks.once("ready", () => {
    sheetKey = `${panelState().id ?? ""}:${!!panelState().hidden}`;
    refreshPanel();
    schedulePublish();
  });
  for (const type of ["pointerup", "pointercancel", "blur"]) window.addEventListener(type, onPressEnd);
}

export function installPanel() {
  game.settings.register(MODULE, ACTIVE_SETTING, { scope: "world", config: false, type: Object, default: {}, onChange: onSettingChange });
  game.settings.register(MODULE, POSITION_SETTING, {
    name: "SSM.Panel.PositionName",
    hint: "SSM.Panel.PositionHint",
    scope: "world",
    config: true,
    type: String,
    default: POSITIONS[0],
    choices: Object.fromEntries(POSITIONS.map((position) => [position, `SSM.Panel.Position.${position}`])),
    onChange: applyPosition,
  });
  installHooks();
}
