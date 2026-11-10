/*
 * Where a dragged panel sits. A spot is the panel's top-left corner in screen pixels.
 * Foundry's own Draggable needs an Application, and the panel isn't one, so the frame does its own small drag.
 */

/** Keep a panel of the given size wholly on screen. A panel bigger than the screen keeps its top-left corner visible. */
export function clampSpot(spot, size, screen) {
  const fit = (value, room) => Math.min(Math.max(0, value), Math.max(0, room));
  return { left: fit(spot.left, screen.width - size.width), top: fit(spot.top, screen.height - size.height) };
}

/** A saved spot, or null if the value isn't one. */
export function readSpot(value) {
  return Number.isFinite(value?.left) && Number.isFinite(value?.top) ? { left: value.left, top: value.top } : null;
}
