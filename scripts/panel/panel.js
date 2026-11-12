import { ACTIVE_SETTING, MODULE, POSITION_SETTING, SPOT_SETTING, TAB } from "../constants.js";
import { allSubsystems, subsystemByType } from "../registry.js";
import { panelState, schedulePublish } from "./activation.js";
import { clampSize, clampSpot, readSize, readSpot } from "./spot.js";

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
let resize = null;
let swallowClick = false;
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

function savedEntry() {
  return game.settings.get(MODULE, SPOT_SETTING)?.[game.userId];
}

function savedSpot() {
  return readSpot(savedEntry());
}

/** A resized panel's size. Only a placed panel has one: resizing places the panel where it is. */
function savedSize() {
  return readSize(savedEntry());
}

/** Save a spot, with a size if the panel has one, or clear both. */
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
function placeAt(spot, size = savedSize()) {
  if (element.parentElement !== document.body) document.body.append(element);
  element.classList.add("moved");
  applySize(size);
  const rect = element.getBoundingClientRect();
  const { left, top } = clampSpot(spot, rect, { width: window.innerWidth, height: window.innerHeight });
  element.style.left = `${left}px`;
  element.style.top = `${top}px`;
}

/** The UI scale the CSS applies to the panel, so screen pixels can become the panel's own. */
function uiScale() {
  return Number.parseFloat(getComputedStyle(document.body).getPropertyValue("--ui-scale")) || 1;
}

/** Give the panel a fixed size, kept within the screen, or let its content size it again. The content wraps to the width and scrolls past the height. */
function applySize(size) {
  element.classList.toggle("sized", !!size);
  if (!size) {
    element.style.width = element.style.height = "";
    return;
  }
  const scale = uiScale();
  const { width, height } = clampSize(size, { width: window.innerWidth / scale, height: window.innerHeight / scale });
  element.style.width = `${width}px`;
  element.style.height = `${height}px`;
}

/** Show the panel at its saved spot, or at the world setting's place if this user hasn't dragged it. */
function applySpot() {
  // Mid-drag, the pointer decides where it is.
  if (!element || drag?.moved || resize) return;
  const spot = savedSpot();
  if (spot) return placeAt(spot);
  applySize(null);
  element.classList.remove("moved");
  element.style.left = element.style.top = "";
  const parent = document.getElementById("ui-top");
  if (parent && element.parentElement !== parent) parent.append(element);
}

/*
 * A header control marked data-drag-click is a click and a drag handle in one: a press that moves past the wobble drags the panel,
 * and the click that follows the release is swallowed. Other controls in the header only click.
 */
function onDragStart(event) {
  if (event.button !== 0 || !event.target.closest(".ssm-panel-head")) return;
  const control = event.target.closest("button, a, input");
  if (control && !control.matches("[data-drag-click]")) return;
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
  // A release over a drag-click control still clicks it, so the next click does nothing. It comes straight after the release; the timer clears the flag if no click comes.
  swallowClick = true;
  setTimeout(() => (swallowClick = false));
  const rect = element.getBoundingClientRect();
  // A resized panel keeps its size where it is dropped.
  saveSpot({ left: Math.round(rect.left), top: Math.round(rect.top), ...savedSize() });
}

/*
 * The corner handle resizes the panel from its bottom-right corner, and the top-left corner stays put.
 * A panel still at its starting place is placed where it is first, so it doesn't grow out from the centre.
 */
function onResizeStart(event) {
  if (event.button !== 0 || !event.target.closest(".ssm-panel-resize")) return;
  event.preventDefault();
  event.stopPropagation();
  const rect = element.getBoundingClientRect();
  const size = { width: element.offsetWidth, height: element.offsetHeight };
  placeAt({ left: rect.left, top: rect.top }, size);
  const placed = element.getBoundingClientRect();
  resize = { x: event.clientX, y: event.clientY, left: placed.left, top: placed.top, ...size };
  element.classList.add("resizing");
}

function onResizeMove(event) {
  if (!resize) return;
  if (event.buttons === 0) return onResizeEnd();
  if (!element) return;
  // The bottom-right corner follows the pointer, but doesn't leave the screen.
  const scale = uiScale();
  const room = { width: (window.innerWidth - resize.left) / scale, height: (window.innerHeight - resize.top) / scale };
  const size = clampSize({ width: resize.width + (event.clientX - resize.x) / scale, height: resize.height + (event.clientY - resize.y) / scale }, room);
  element.style.width = `${size.width}px`;
  element.style.height = `${size.height}px`;
}

function onResizeEnd() {
  if (!resize) return;
  resize = null;
  if (!element) return;
  element.classList.remove("resizing");
  const rect = element.getBoundingClientRect();
  saveSpot({ left: Math.round(rect.left), top: Math.round(rect.top), width: Math.round(element.offsetWidth), height: Math.round(element.offsetHeight) });
}

/** The corner handle, like the reset button, comes back with every redraw. It is the panel's last child, so it can stick to the bottom while the content scrolls. */
function addResizeHandle() {
  const handle = document.createElement("div");
  handle.className = "ssm-panel-resize";
  handle.dataset.tooltip = game.i18n.localize("SSM.Panel.Resize");
  handle.setAttribute("aria-hidden", "true");
  element.append(handle);
}

/** The header holds the frame's reset button, so it comes back with every redraw. It shows only once the panel is dragged or resized. */
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

/** The GM's way back to the challenge window: opens it, or brings it to the front. */
function openChallenge(state) {
  if (game.user.isGM) game.journal.get(state.id)?.sheet.render({ force: true });
}

function onClick(event) {
  if (swallowClick) {
    swallowClick = false;
    return;
  }
  const target = event.target.closest("[data-action]");
  if (!target || target.disabled) return;
  if (target.dataset.action === "resetPanelSpot") return saveSpot(null);
  if (target.dataset.action === "openChallenge") return openChallenge(panelState());
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
  // A card made a button with role="button" needs Enter and Space to click it.
  element.addEventListener("keydown", (event) => {
    if ((event.key === "Enter" || event.key === " ") && event.target.matches('[role="button"][data-action]')) {
      event.preventDefault();
      // Foundry's keybindings (Space pauses the game) listen on the window and don't count a focused div as text entry, so they stop here.
      event.stopPropagation();
      event.target.click();
    }
  });
  element.addEventListener("pointerdown", (event) => {
    pressing = true;
    onResizeStart(event);
    if (!resize) onDragStart(event);
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
  // A redraw replaces the cards, so a focused card is focused again by its id.
  const focused = element.contains(document.activeElement) ? document.activeElement.dataset.id : null;
  element.innerHTML = html;
  drawn = html;
  if (focused) element.querySelector(`[role="button"][data-id="${CSS.escape(focused)}"]`)?.focus();
  addResetButton();
  addResizeHandle();
  // New content can change the panel's size, so a dragged panel is kept on screen again.
  applySpot();
}

async function draw() {
  const state = panelState();
  const panel = subsystemByType(state.type)?.panel;
  if (!state.view || state.hidden || !panel) return removePanel();
  // isGM lets a template give the GM controls that players see as plain text.
  const view = await renderTemplate(panel.template, { ...(await panel.prepareView(state.view, state)), isGM: game.user.isGM });
  // A redraw during a press would replace the button being pressed and lose the click. The release catches up.
  if (pressing) {
    heldBack = true;
    return;
  }
  if (mountPanel()) setView(view);
}

/** Redraw the panel. Calls during a draw run once more afterwards, so the last state is the one on screen. */
export async function refreshPanel() {
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

/** Open sheets show Start, Hide and Show from the setting, and the Subsystems tab marks the panel's challenge, so both redraw when it or its hidden state changes. */
function refreshSheets() {
  const { id, hidden } = panelState();
  const key = `${id ?? ""}:${!!hidden}`;
  if (key === sheetKey || !game.user.isGM) {
    sheetKey = key;
    return;
  }
  sheetKey = key;
  // The Subsystems tab marks the challenge on the panel.
  ui[TAB]?.render();
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
  // A GM's panel also reads the challenge (GM text on the cards), and a GM-only change leaves the shared copy as it was, so it redraws here too.
  if (game.user.isGM) refreshPanel();
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
  window.addEventListener("pointermove", onResizeMove);
  for (const type of ["pointerup", "pointercancel", "blur"]) {
    window.addEventListener(type, onDragEnd);
    window.addEventListener(type, onResizeEnd);
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
