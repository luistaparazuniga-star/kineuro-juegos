import { LANDMARK } from "./landmarks.js";
import { playFreezeAlert, playMoveCue, playStableHold, playMiss } from "./sound.js";

const DIFFICULTY = {
  easy: { moveMin: 2.5, moveMax: 4, freezeDuration: 2.0, tolerance: 0.07 },
  medium: { moveMin: 2, moveMax: 3.5, freezeDuration: 3.0, tolerance: 0.045 },
  hard: { moveMin: 1.5, moveMax: 3, freezeDuration: 4.0, tolerance: 0.03 },
};

const TRACKED = [
  LANDMARK.NOSE,
  LANDMARK.LEFT_WRIST,
  LANDMARK.RIGHT_WRIST,
  LANDMARK.LEFT_SHOULDER,
  LANDMARK.RIGHT_SHOULDER,
  LANDMARK.LEFT_HIP,
  LANDMARK.RIGHT_HIP,
];

const BONE_PAIRS = [
  [LANDMARK.LEFT_SHOULDER, LANDMARK.LEFT_ELBOW],
  [LANDMARK.LEFT_ELBOW, LANDMARK.LEFT_WRIST],
  [LANDMARK.RIGHT_SHOULDER, LANDMARK.RIGHT_ELBOW],
  [LANDMARK.RIGHT_ELBOW, LANDMARK.RIGHT_WRIST],
  [LANDMARK.LEFT_SHOULDER, LANDMARK.RIGHT_SHOULDER],
  [LANDMARK.LEFT_SHOULDER, LANDMARK.LEFT_HIP],
  [LANDMARK.RIGHT_SHOULDER, LANDMARK.RIGHT_HIP],
];

const SAMPLE_WINDOW = 6;

export class StatueGame {
  constructor(settings, onPhaseChange) {
    this.settings = settings;
    this.diff = DIFFICULTY[settings.difficulty];
    this.onPhaseChange = onPhaseChange || (() => {});
    this.score = 0;
    this.successes = 0;
    this.breaks = 0;
    this.streak = 0;
    this.maxStreak = 0;
    this.stabilitySamples = [];
    this.canvasW = 0;
    this.canvasH = 0;
    this.scale = 100;
    this.running = false;
    this.phase = "move";
    this.phaseTimer = 0;
    this.lastPositions = null;
    this.movementSamples = [];
    this.currentStability = 1;
  }

  start() {
    this.running = true;
    this.enterMove();
  }

  stop() {
    this.running = false;
  }

  enterMove() {
    this.phase = "move";
    this.phaseTimer = this.diff.moveMin + Math.random() * (this.diff.moveMax - this.diff.moveMin);
    playMoveCue();
    this.onPhaseChange("move");
  }

  enterFreeze() {
    this.phase = "freeze";
    this.phaseTimer = this.diff.freezeDuration;
    this.lastPositions = null;
    this.movementSamples = [];
    this.currentStability = 1;
    playFreezeAlert();
    this.onPhaseChange("freeze");
  }

  resolveFreeze(success) {
    if (success) {
      this.successes++;
      this.streak++;
      this.maxStreak = Math.max(this.maxStreak, this.streak);
      const bonus = Math.round(this.diff.freezeDuration * 15) + this.streak * 5;
      this.score += bonus;
      playStableHold();
    } else {
      this.breaks++;
      this.streak = 0;
      playMiss();
    }
    const avgMovement =
      this.movementSamples.length > 0
        ? this.movementSamples.reduce((a, b) => a + b, 0) / this.movementSamples.length
        : 0;
    const stability = Math.max(0, Math.min(1, 1 - avgMovement / this.diff.tolerance));
    this.stabilitySamples.push(stability);
    this.enterMove();
  }

  update(landmarks, dt, canvasW, canvasH) {
    this.canvasW = canvasW;
    this.canvasH = canvasH;

    let positions = null;
    if (landmarks) {
      const ls = landmarks[LANDMARK.LEFT_SHOULDER];
      const rs = landmarks[LANDMARK.RIGHT_SHOULDER];
      const lh = landmarks[LANDMARK.LEFT_HIP];
      const rh = landmarks[LANDMARK.RIGHT_HIP];

      if (ls && rs) {
        const shoulderWidth = Math.hypot((ls.x - rs.x) * canvasW, (ls.y - rs.y) * canvasH);
        let torsoHeight = shoulderWidth * 1.4;
        if (lh && rh) {
          const midS = { x: ((ls.x + rs.x) / 2) * canvasW, y: ((ls.y + rs.y) / 2) * canvasH };
          const midH = { x: ((lh.x + rh.x) / 2) * canvasW, y: ((lh.y + rh.y) / 2) * canvasH };
          torsoHeight = Math.hypot(midS.x - midH.x, midS.y - midH.y);
        }
        this.scale = Math.max(shoulderWidth, torsoHeight, 40);
      }

      positions = {};
      for (const id of TRACKED) {
        const lm = landmarks[id];
        if (lm) positions[id] = { x: lm.x * canvasW, y: lm.y * canvasH };
      }
      this.lastLandmarks = landmarks;
    }

    if (!this.running) return;

    this.phaseTimer -= dt;

    if (this.phase === "freeze" && positions) {
      if (this.lastPositions) {
        let totalDelta = 0;
        let count = 0;
        for (const id of TRACKED) {
          const cur = positions[id];
          const prev = this.lastPositions[id];
          if (cur && prev) {
            totalDelta += Math.hypot(cur.x - prev.x, cur.y - prev.y);
            count++;
          }
        }
        if (count > 0) {
          const frameMovement = totalDelta / count / this.scale;
          this.movementSamples.push(frameMovement);
          if (this.movementSamples.length > SAMPLE_WINDOW) this.movementSamples.shift();
          const avg = this.movementSamples.reduce((a, b) => a + b, 0) / this.movementSamples.length;
          this.currentStability = Math.max(0, Math.min(1, 1 - avg / this.diff.tolerance));
          if (avg > this.diff.tolerance && this.movementSamples.length >= 3) {
            this.resolveFreeze(false);
            this.lastPositions = positions;
            return;
          }
        }
      }
      this.lastPositions = positions;
    }

    if (this.phaseTimer <= 0) {
      if (this.phase === "move") {
        this.enterFreeze();
      } else {
        this.resolveFreeze(true);
      }
    }
  }

  render(ctx, showSkeleton, landmarks) {
    ctx.clearRect(0, 0, this.canvasW, this.canvasH);
    if (!landmarks) return;

    if (showSkeleton) {
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.lineWidth = 4;
      for (const [a, b] of BONE_PAIRS) {
        const p1 = landmarks[a];
        const p2 = landmarks[b];
        if (!p1 || !p2) continue;
        ctx.beginPath();
        ctx.moveTo(p1.x * this.canvasW, p1.y * this.canvasH);
        ctx.lineTo(p2.x * this.canvasW, p2.y * this.canvasH);
        ctx.stroke();
      }
    }

    let color = "#3fd0c9";
    if (this.phase === "freeze") {
      if (this.currentStability > 0.66) color = "#4ade80";
      else if (this.currentStability > 0.33) color = "#facc15";
      else color = "#f87171";
    }

    for (const id of TRACKED) {
      const lm = landmarks[id];
      if (!lm) continue;
      ctx.beginPath();
      ctx.arc(lm.x * this.canvasW, lm.y * this.canvasH, this.scale * 0.09, 0, Math.PI * 2);
      ctx.fillStyle = color + "cc";
      ctx.fill();
    }
  }

  getResults() {
    const total = this.successes + this.breaks;
    const avgStability =
      this.stabilitySamples.length > 0
        ? this.stabilitySamples.reduce((a, b) => a + b, 0) / this.stabilitySamples.length
        : 0;
    return {
      score: this.score,
      successes: this.successes,
      breaks: this.breaks,
      maxStreak: this.maxStreak,
      accuracy: total > 0 ? Math.round((this.successes / total) * 100) : 0,
      stability: Math.round(avgStability * 100),
    };
  }
}
