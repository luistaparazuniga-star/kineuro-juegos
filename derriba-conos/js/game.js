import { computeBodyMetrics } from "../../shared/js/bodyMetrics.js";
import { drawSkeleton, drawMirroredText, drawProgressRing } from "../../shared/js/renderUtils.js";
import { playBounce, playMiss, playCombo } from "../../shared/js/soundEngine.js";

const DIFFICULTY = {
  easy: { timeLimit: 3.2, toleranceFactor: 0.17, gap: 0.5 },
  medium: { timeLimit: 2.4, toleranceFactor: 0.13, gap: 0.4 },
  hard: { timeLimit: 1.8, toleranceFactor: 0.1, gap: 0.3 },
};

const EDGE_MARGIN = 0.14; // fraction of canvas width from each edge
const COMBO_MILESTONES = [3, 5, 8, 12];

export class Game {
  constructor(settings) {
    this.settings = settings;
    this.diff = DIFFICULTY[settings.difficulty];
    this.score = 0;
    this.knockdowns = 0;
    this.misses = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.comboMessage = null;
    this.target = null;
    this.spawnTimer = 0.4;
    this.lastSide = null;
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
    this.coneY = canvasH * 0.5;
    if (this.comboMessage) {
      this.comboMessage.ttl -= dt;
      if (this.comboMessage.ttl <= 0) this.comboMessage = null;
    }

    if (!this.running) return;

    if (this.target) {
      this.target.timer -= dt;
      const playerX = this.metrics && this.metrics.shoulderMid ? this.metrics.shoulderMid.x : null;
      const tolerance = this.diff.toleranceFactor * this.canvasW;
      if (playerX !== null && Math.abs(playerX - this.target.x) <= tolerance) {
        this.knockdowns++;
        this.combo++;
        this.bestCombo = Math.max(this.bestCombo, this.combo);
        const speedBonus = Math.round((this.target.timer / this.diff.timeLimit) * 20);
        this.score += 20 + speedBonus + this.combo * 3;
        playBounce();
        if (COMBO_MILESTONES.includes(this.combo)) {
          playCombo(this.combo);
          this.comboMessage = { text: `¡Combo x${this.combo}!`, ttl: 1.2 };
        }
        this.target = null;
        this.spawnTimer = this.diff.gap;
      } else if (this.target.timer <= 0) {
        this.misses++;
        this.combo = 0;
        playMiss();
        this.target = null;
        this.spawnTimer = this.diff.gap;
      }
    } else {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0 && this.metrics && this.metrics.shoulderMid) {
        this.spawnCone();
      }
    }
  }

  spawnCone() {
    const side = this.lastSide === "left" ? "right" : this.lastSide === "right" ? "left" : Math.random() < 0.5 ? "left" : "right";
    this.lastSide = side;
    const x = side === "left" ? this.canvasW * EDGE_MARGIN : this.canvasW * (1 - EDGE_MARGIN);
    this.target = { side, x, timer: this.diff.timeLimit, maxTime: this.diff.timeLimit };
  }

  render(ctx, showSkeleton, landmarks) {
    ctx.clearRect(0, 0, this.canvasW, this.canvasH);
    if (showSkeleton && landmarks) drawSkeleton(ctx, landmarks, this.canvasW, this.canvasH);

    if (this.target) {
      const t = this.target;
      const progress = Math.max(0, t.timer / t.maxTime);
      drawMirroredText(ctx, "🚧", t.x, this.coneY, `${Math.round(this.canvasW * 0.09)}px sans-serif`, "#fff");
      drawProgressRing(ctx, t.x, this.coneY, this.canvasW * 0.07, progress, "#facc15");
    }

    if (this.metrics && this.metrics.shoulderMid) {
      ctx.beginPath();
      ctx.arc(this.metrics.shoulderMid.x, this.metrics.shoulderMid.y, this.metrics.scale * 0.14, 0, Math.PI * 2);
      ctx.fillStyle = "#3fd0c9cc";
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();
    }
  }

  getResults() {
    const total = this.knockdowns + this.misses;
    return {
      score: this.score,
      accuracy: total > 0 ? Math.round((this.knockdowns / total) * 100) : 0,
      knockdowns: this.knockdowns,
      misses: this.misses,
      bestCombo: this.bestCombo,
    };
  }
}
