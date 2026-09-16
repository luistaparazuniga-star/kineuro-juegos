import { computeBodyMetrics } from "../../shared/js/bodyMetrics.js";
import { drawSkeleton, drawMirroredText, drawProgressRing } from "../../shared/js/renderUtils.js";
import { playJump, playLand, playMiss, playCombo } from "../../shared/js/soundEngine.js";

const DIFFICULTY = {
  easy: { cueInterval: 3.4, windowDuration: 1.5, jumpThreshold: 0.09 },
  medium: { cueInterval: 2.7, windowDuration: 1.15, jumpThreshold: 0.11 },
  hard: { cueInterval: 2.1, windowDuration: 0.9, jumpThreshold: 0.13 },
};

const COMBO_MILESTONES = [3, 5, 8, 12];
const BASELINE_ALPHA = 0.06;

export class Game {
  constructor(settings) {
    this.settings = settings;
    this.diff = DIFFICULTY[settings.difficulty];
    this.score = 0;
    this.jumps = 0;
    this.misses = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.comboMessage = null;
    this.phase = "wait"; // wait | window
    this.phaseTimer = this.diff.cueInterval;
    this.baselineY = null;
    this.metrics = null;
    this.flash = 0;
    this.running = false;
  }

  start() {
    this.running = true;
  }

  stop() {
    this.running = false;
  }

  enterWindow() {
    this.phase = "window";
    this.phaseTimer = this.diff.windowDuration;
    this.jumped = false;
  }

  enterWait() {
    this.phase = "wait";
    this.phaseTimer = this.diff.cueInterval;
  }

  update(landmarks, dt, canvasW, canvasH) {
    this.canvasW = canvasW;
    this.canvasH = canvasH;
    this.metrics = computeBodyMetrics(landmarks, canvasW, canvasH);
    if (this.comboMessage) {
      this.comboMessage.ttl -= dt;
      if (this.comboMessage.ttl <= 0) this.comboMessage = null;
    }
    if (this.flash > 0) this.flash -= dt * 3;

    if (!this.metrics || !this.metrics.shoulderMid) return;

    const y = this.metrics.shoulderMid.y;
    if (this.baselineY === null) this.baselineY = y;

    if (!this.running) return;

    this.phaseTimer -= dt;

    if (this.phase === "wait") {
      // Only drift the baseline while we're not expecting a jump, so a held
      // crouch or a slow camera shift doesn't get mistaken for "standing".
      this.baselineY += (y - this.baselineY) * BASELINE_ALPHA;
      if (this.phaseTimer <= 0) this.enterWindow();
      return;
    }

    // phase === "window"
    const rise = this.baselineY - y; // positive when the player is higher up
    if (!this.jumped && rise > this.metrics.scale * this.diff.jumpThreshold) {
      this.jumped = true;
      this.jumps++;
      this.combo++;
      this.bestCombo = Math.max(this.bestCombo, this.combo);
      this.score += 25 + this.combo * 5;
      this.flash = 0.25;
      playJump();
      if (COMBO_MILESTONES.includes(this.combo)) {
        playCombo(this.combo);
        this.comboMessage = { text: `¡Combo x${this.combo}!`, ttl: 1.2 };
      }
    }
    if (this.phaseTimer <= 0) {
      if (!this.jumped) {
        this.misses++;
        this.combo = 0;
        playMiss();
      } else {
        playLand();
      }
      this.enterWait();
    }
  }

  render(ctx, showSkeleton, landmarks) {
    ctx.clearRect(0, 0, this.canvasW, this.canvasH);
    if (showSkeleton && landmarks) drawSkeleton(ctx, landmarks, this.canvasW, this.canvasH);

    if (!this.metrics || !this.metrics.shoulderMid) return;
    const { shoulderMid, scale } = this.metrics;

    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(0, this.baselineY);
    ctx.lineTo(this.canvasW, this.baselineY);
    ctx.stroke();
    ctx.setLineDash([]);

    const dotColor = this.flash > 0 ? "#4ade80" : "#3fd0c9";
    ctx.beginPath();
    ctx.arc(shoulderMid.x, shoulderMid.y, scale * 0.12, 0, Math.PI * 2);
    ctx.fillStyle = dotColor + "cc";
    ctx.fill();

    if (this.running && this.phase === "window") {
      const progress = Math.max(0, this.phaseTimer / this.diff.windowDuration);
      drawProgressRing(ctx, shoulderMid.x, shoulderMid.y, scale * 0.6, progress, "#facc15");
      drawMirroredText(ctx, "¡SALTÁ!", shoulderMid.x, shoulderMid.y - scale * 1.2, `bold ${Math.round(scale * 0.4)}px sans-serif`, "#facc15");
    }

    if (this.flash > 0) {
      ctx.fillStyle = `rgba(74,222,128,${this.flash})`;
      ctx.fillRect(0, 0, this.canvasW, this.canvasH);
    }
  }

  getResults() {
    const total = this.jumps + this.misses;
    return {
      score: this.score,
      accuracy: total > 0 ? Math.round((this.jumps / total) * 100) : 0,
      jumps: this.jumps,
      misses: this.misses,
      bestCombo: this.bestCombo,
    };
  }
}
