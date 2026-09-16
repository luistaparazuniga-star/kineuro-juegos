import { computeBodyMetrics } from "../../shared/js/bodyMetrics.js";
import { drawSkeleton, drawMirroredText } from "../../shared/js/renderUtils.js";
import { playBounce, playCombo } from "../../shared/js/soundEngine.js";

const DIFFICULTY = {
  easy: { thresholdFactor: 0.05 },
  medium: { thresholdFactor: 0.08 },
  hard: { thresholdFactor: 0.11 },
};

const IDLE_RESET = 4.5;
const COMBO_MILESTONES = [5, 10, 20, 30, 45];

export class Game {
  constructor(settings) {
    this.settings = settings;
    this.diff = DIFFICULTY[settings.difficulty];
    this.score = 0;
    this.reps = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.comboMessage = null;
    this.side = null;
    this.idleTimer = 0;
    this.elapsed = 0;
    this.metrics = null;
    this.running = false;
  }

  start() {
    this.running = true;
  }

  stop() {
    this.running = false;
  }

  update(landmarks, dt, canvasW, canvasH) {
    this.canvasW = canvasW;
    this.canvasH = canvasH;
    this.metrics = computeBodyMetrics(landmarks, canvasW, canvasH);
    if (this.comboMessage) {
      this.comboMessage.ttl -= dt;
      if (this.comboMessage.ttl <= 0) this.comboMessage = null;
    }

    if (!this.running || !this.metrics || !this.metrics.shoulderMid) return;

    this.elapsed += dt;
    this.idleTimer += dt;
    if (this.idleTimer > IDLE_RESET) this.combo = 0;

    const centerX = this.canvasW / 2;
    const dx = this.metrics.shoulderMid.x - centerX;
    const thresholdPx = this.diff.thresholdFactor * this.canvasW;

    if (dx > thresholdPx) {
      if (this.side === "left") this.registerRep();
      this.side = "right";
    } else if (dx < -thresholdPx) {
      if (this.side === "right") this.registerRep();
      this.side = "left";
    }
  }

  registerRep() {
    this.reps++;
    this.combo++;
    this.idleTimer = 0;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    this.score += 8 + Math.min(this.combo, 20);
    playBounce();
    if (COMBO_MILESTONES.includes(this.reps)) {
      playCombo(Math.min(this.combo, 12));
      this.comboMessage = { text: `¡${this.reps} repeticiones!`, ttl: 1.2 };
    }
  }

  render(ctx, showSkeleton, landmarks) {
    ctx.clearRect(0, 0, this.canvasW, this.canvasH);
    if (showSkeleton && landmarks) drawSkeleton(ctx, landmarks, this.canvasW, this.canvasH);

    const centerX = this.canvasW / 2;
    const thresholdPx = this.diff.thresholdFactor * this.canvasW;

    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.setLineDash([6, 10]);
    ctx.beginPath();
    ctx.moveTo(centerX - thresholdPx, 0);
    ctx.lineTo(centerX - thresholdPx, this.canvasH);
    ctx.moveTo(centerX + thresholdPx, 0);
    ctx.lineTo(centerX + thresholdPx, this.canvasH);
    ctx.stroke();
    ctx.setLineDash([]);

    if (this.metrics && this.metrics.shoulderMid) {
      const color = this.side === "left" ? "#5bc8ff" : this.side === "right" ? "#ff9f5b" : "#3fd0c9";
      ctx.beginPath();
      ctx.arc(this.metrics.shoulderMid.x, this.metrics.shoulderMid.y, this.metrics.scale * 0.16, 0, Math.PI * 2);
      ctx.fillStyle = color + "cc";
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();
    }

    drawMirroredText(ctx, `${this.reps}`, this.canvasW / 2, this.canvasH * 0.16, `bold ${Math.round(this.canvasH * 0.09)}px sans-serif`, "rgba(255,255,255,0.9)");
  }

  getResults() {
    const minutes = Math.max(this.elapsed / 60, 1 / 60);
    return {
      score: this.score,
      accuracy: Math.min(100, Math.round(this.reps * 2)),
      reps: this.reps,
      pace: Math.round(this.reps / minutes),
      bestCombo: this.bestCombo,
    };
  }
}
