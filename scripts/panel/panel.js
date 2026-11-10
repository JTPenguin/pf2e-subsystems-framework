import { ACTIVE_SETTING, MODULE, POSITION_SETTING, SPOT_SETTING } from "../constants.js";
import { allSubsystems, subsystemByType } from "../registry.js";
import { panelState, schedulePublish } from "./activation.js";
import { clampSpot, readSpot } from "./spot.js";

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
let drag = null;
let resizeObserver = null;

function removePanel() {
  resizeObserver?.disconnect();
  resizeObserver = null;
  element?.remove();
  element = null;
  drawn = null;
}

function applyPosition() {
  if (element) element.dataset.position = game.settings.get(MODULE, POSITION_SETTING);
}

/* A dragged panel. The spot is saved per browser, keyed by user, so a GM and a player sharing a browser keep their own. */

function savedSpot() {
  return readSpot(game.settings.get(MODULE, SPOT_SETTING)?.[game.userId]);
}

async function saveSpot(spot) {
  const spots = { ...game.settings.get(MODULE, SPOT_SETTING) };
  if (spot) spots[game.userId] = spot;
  else delete spots[game.userId];
  await game.settings.set(MODULE, SPOT_SETTING, spots);
}

/**
 * Put the panel's top-left corner at a screen spot, kept on screen.
 * A dragged panel moves to the body: inside #ui-middle it would shift whenever the sidebar opens or closes. The CSS scales it as #ui-middle would.
 */
function placeAt(spot) {
  if (element.parentElement !== document.body) document.body.append(element);
  element.classList.add("moved");
  const rect = element.getBoundingClientRect();
  const { left, top } = clampSpot(spot, rect, { width: window.innerWidth, height: window.innerHeight });
  element.style.left = `${left}px`;
  element.style.top = `${top}px`;
}

/** Show the panel at its saved spot, or at the world setting's place if this user hasn't dragged it. */
function applySpot() {
  // Mid-drag, the pointer decides where it is.
  if (!element || drag?.moved) return;
  const spot = savedSpot();
  if (spot) return placeAt(spot);
  element.classList.remove("moved");
  element.style.left = element.style.top = "";
  const parent = document.getElementById("ui-top");
  if (parent && element.parentElement !== parent) parent.append(element);
}

function onDragStart(event) {
  if (event.button !== 0 || !event.target.closest(".ssm-panel-head") || event.target.closest("button, a, input")) return;
  event.preventDefault();
  const rect = element.getBoundingClientRect();
  drag = { x: event.clientX, y: event.clientY, left: rect.left, top: rect.top, moved: false };
}

function onDragMove(event) {
  if (!drag) return;
  // A lost pointerup leaves no button held: end the drag rather than follow the pointer.
  if (event.buttons === 0) return onDragEnd();
  const dx = event.clientX - drag.x;
  const dy = event.clientY - drag.y;
  // A small wobble is a click, not a drag.
  if (!drag.moved && Math.hypot(dx, dy) < 4) return;
  drag.moved = true;
  element?.classList.add("dragging");
  if (element) placeAt({ left: drag.left + dx, top: drag.top + dy });
}

function onDragEnd() {
  if (!drag) return;
  const { moved } = drag;
  drag = null;
  if (!element) return;
  element.classList.remove("dragging");
  if (!moved) return;
  const rect = element.getBoundingClientRect();
  saveSpot({ left: Math.round(rect.left), top: Math.round(rect.top) });
}

/** The header holds the frame's reset button, so it comes back with every redraw. It shows only once the panel is dragged. */
function addResetButton() {
  const head = element.querySelector(".ssm-panel-head");
  if (!head) return;
  const label = game.i18n.localize("SSM.Panel.ResetPosition");
  const button = document.createElement("button");
  button.type = "button";
  button.className = "ssm-panel-reset";
  button.dataset.action = "resetPanelSpot";
  button.dataset.tooltip = label;
  button.setAttribute("aria-label", label);
  button.innerHTML = '<i class="fa-solid fa-arrows-to-dot" inert></i>';
  head.append(button);
}

function onClick(event) {
  const target = event.target.closest("[data-action]");
  if (!target || target.disabled) return;
  if (target.dataset.action === "resetPanelSpot") return saveSpot(null);
  const state = panelState();
  const panel = subsystemByType(state.type)?.panel;
  panel?.viewActions?.[target.dataset.action]?.(state, target, event);
}

function mountPanel() {
  const parent = document.getElementById("ui-top");
  if (!parent) return null;
  if (element && [parent, document.body].includes(element.parentElement)) return element;
  resizeObserver?.disconnect();
  element?.remove();
  element = document.createElement("section");
  element.id = "ssm-panel";
  element.className = "ssm-panel";
  element.addEventListener("click", onClick);
  element.addEventListener("pointerdown", (event) => {
    pressing = true;
    onDragStart(event);
  });
  // The panel's width follows the screen's, and changes after the resize event, so a size change keeps it on screen too.
  resizeObserver = new ResizeObserver(() => applySpot());
  resizeObserver.observe(element);
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
  addResetButton();
  // New content can change the panel's size, so a dragged panel is kept on screen again.
  applySpot();
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
  window.addEventListener("pointermove", onDragMove);
  for (const type of ["pointerup", "pointercancel", "blur"]) {
    window.addEventListener(type, onDragEnd);
    window.addEventListener(type, onPressEnd);
  }
  window.addEventListener("resize", applySpot);
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
  game.settings.register(MODULE, SPOT_SETTING, { scope: "client", config: false, type: Object, default: {}, onChange: applySpot });
  installHooks();
}
