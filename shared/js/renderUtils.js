import { BONE_PAIRS } from "./landmarks.js";

// The camera feed and its overlay canvas are mirrored together via CSS
// (transform: scaleX(-1)) so the player sees themselves like in a mirror.
// Anything drawn as text on that canvas would come out backwards unless we
// flip it back locally around its own draw point.
export function drawMirroredText(ctx, text, x, y, font, color, align = "center") {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(-1, 1);
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

export function drawSkeleton(ctx, landmarks, canvasW, canvasH, color = "rgba(255,255,255,0.35)") {
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  for (const [a, b] of BONE_PAIRS) {
    const p1 = landmarks[a];
    const p2 = landmarks[b];
    if (!p1 || !p2) continue;
    ctx.beginPath();
    ctx.moveTo(p1.x * canvasW, p1.y * canvasH);
    ctx.lineTo(p2.x * canvasW, p2.y * canvasH);
    ctx.stroke();
  }
}

export function drawMarker(ctx, point, radius, color) {
  if (!point) return;
  ctx.beginPath();
  ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#ffffff";
  ctx.stroke();
}

export function drawProgressRing(ctx, x, y, r, progress, color) {
  ctx.beginPath();
  ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
  ctx.strokeStyle = color;
  ctx.lineWidth = 5;
  ctx.stroke();
}
