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

/*
 * A resized panel's size, in the panel's own CSS pixels (before the UI scale). It is saved next to the spot.
 * The smallest size still shows the header and a line of cards.
 */
export const MIN_SIZE = { width: 240, height: 120 };

/** Keep a size between the smallest size and the room given. Room smaller than the smallest size still gets the smallest size. */
export function clampSize(size, room) {
  const fit = (value, least, most) => Math.max(least, Math.min(value, most));
  return { width: fit(size.width, MIN_SIZE.width, room.width), height: fit(size.height, MIN_SIZE.height, room.height) };
}

/** A saved size, or null if the value holds none. */
export function readSize(value) {
  return Number.isFinite(value?.width) && Number.isFinite(value?.height) ? { width: value.width, height: value.height } : null;
}
