/**
 * Banner framing model (shared by the homepage hero and the admin editor).
 *
 * The photo is cover-fitted in the frame, then `object-position: x% y%` picks
 * which part overflows, and `transform: scale(zoom)` zooms around the same
 * x% y% point (`transform-origin`). So x/y are a focal point in percent.
 */

export const MIN_ZOOM = 100;
export const MAX_ZOOM = 200;

export function clampPercent(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(value)));
}

/** How far a cover-fitted image extends past the frame on each axis, in px. */
export function coverOverflow(
  frameWidth: number,
  frameHeight: number,
  imageWidth: number,
  imageHeight: number
) {
  const scale = Math.max(frameWidth / imageWidth, frameHeight / imageHeight);
  return {
    x: Math.max(0, imageWidth * scale - frameWidth),
    y: Math.max(0, imageHeight * scale - frameHeight),
  };
}

/**
 * New focal position (percent, unclamped) after dragging the picture by
 * `deltaPx` along one axis. Dragging right/down moves the picture right/down,
 * so the focal percent decreases.
 *
 * Content shift per percent is (frame * (z - 1) + z * overflow) / 100 px:
 * the first term comes from moving the zoom origin, the second from
 * object-position moving the scaled image.
 */
export function positionAfterDrag(
  startPercent: number,
  deltaPx: number,
  framePx: number,
  overflowPx: number,
  zoom: number
) {
  const z = zoom / 100;
  const pxPerPercent = (framePx * (z - 1) + z * overflowPx) / 100;
  if (pxPerPercent < 0.01) return startPercent;
  return startPercent - deltaPx / pxPerPercent;
}
