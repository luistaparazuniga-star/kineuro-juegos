import { LANDMARK, estimatePalm } from "./landmarks.js";

function toPx(point, canvasW, canvasH) {
  return point ? { x: point.x * canvasW, y: point.y * canvasH } : null;
}

function midPx(a, b, canvasW, canvasH) {
  if (!a || !b) return null;
  return { x: ((a.x + b.x) / 2) * canvasW, y: ((a.y + b.y) / 2) * canvasH };
}

/**
 * Extracts the pixel-space points & body scale every minigame needs from a
 * raw landmarks frame, so each game's own code only deals with gameplay.
 * `scale` approximates the player's torso size in pixels (shoulder width vs.
 * shoulder-to-hip height, whichever is larger) and is the standard yardstick
 * used to size targets/tolerances relative to how close the player is to the
 * camera.
 */
export function computeBodyMetrics(landmarks, canvasW, canvasH) {
  if (!landmarks) return null;

  const ls = landmarks[LANDMARK.LEFT_SHOULDER];
  const rs = landmarks[LANDMARK.RIGHT_SHOULDER];
  const lh = landmarks[LANDMARK.LEFT_HIP];
  const rh = landmarks[LANDMARK.RIGHT_HIP];

  const shoulderMid = midPx(ls, rs, canvasW, canvasH);
  const hipMid = midPx(lh, rh, canvasW, canvasH);

  let scale = 100;
  if (shoulderMid) {
    const shoulderWidth = ls && rs ? Math.hypot((ls.x - rs.x) * canvasW, (ls.y - rs.y) * canvasH) : 0;
    let torsoHeight = shoulderWidth * 1.4;
    if (hipMid) {
      torsoHeight = Math.hypot(shoulderMid.x - hipMid.x, shoulderMid.y - hipMid.y);
    }
    scale = Math.max(shoulderWidth, torsoHeight, 40);
  }

  const leftPalm = toPx(estimatePalm(landmarks, LANDMARK.LEFT_WRIST, LANDMARK.LEFT_ELBOW), canvasW, canvasH);
  const rightPalm = toPx(estimatePalm(landmarks, LANDMARK.RIGHT_WRIST, LANDMARK.RIGHT_ELBOW), canvasW, canvasH);

  return {
    shoulderMid,
    hipMid,
    scale,
    leftPalm,
    rightPalm,
    leftKnee: toPx(landmarks[LANDMARK.LEFT_KNEE], canvasW, canvasH),
    rightKnee: toPx(landmarks[LANDMARK.RIGHT_KNEE], canvasW, canvasH),
    leftAnkle: toPx(landmarks[LANDMARK.LEFT_ANKLE], canvasW, canvasH),
    rightAnkle: toPx(landmarks[LANDMARK.RIGHT_ANKLE], canvasW, canvasH),
    nose: toPx(landmarks[LANDMARK.NOSE], canvasW, canvasH),
  };
}
