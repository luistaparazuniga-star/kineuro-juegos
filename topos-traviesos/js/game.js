import { computeBodyMetrics } from "../../shared/js/bodyMetrics.js";
import { drawSkeleton, drawMarker, drawMirroredText, drawProgressRing } from "../../shared/js/renderUtils.js";
import { playHit, playMiss, playImpact, playCombo } from "../../shared/js/soundEngine.js";

const DIFFICULTY = {
  easy: { radiusFactor: 0.34, lifespan: 3.0, gap: 0.5, bombChance: 0.12, minDist: 0.6, maxDist: 1.5 },
  medium: { radiusFactor: 0.28, lifespan: 2.2, gap: 0.35, bombChance: 0.2, minDist: 0.7, maxDist: 1.8 },
  hard: { radiusFactor: 0.22, lifespan: 1.6, gap: 0.25, bombChance: 0.28, minDist: 0.8, maxDist: 2.0 },
};

const HAND_COLOR = { left: "#5bc8ff", right: "#ff9f5b" };
const COMBO_MILESTONES = [3, 5, 8, 12];

export class Game {
  constructor(settings) {
    this.settings = settings;
    this.diff = DIFFICULTY[settings.difficulty];
    this.score = 0;
    this.hits = 0;
    this.misses = 0;
    this.bombsHit = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.comboMessage = null;
    this.target = null;
    this.spawnTimer = 0.5;
    this.metrics = null;
    this.canvasW = 0;
    this.canvasH = 0;
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

    if (!this.running) return;

    if (this.target) {
      this.target.life -= dt;
      const hands = this.metrics ? [this.metrics.leftPalm, this.metrics.rightPalm] : [];
      for (const hand of hands) {
        if (!hand || !this.target) continue;
        const d = Math.hypot(hand.x - this.target.x, hand.y - this.target.y);
        if (d <= this.target.r + this.metrics.scale * 0.16) {
          this.resolveTouch(this.target);
          this.target = null;
          this.spawnTimer = this.diff.gap;
          break;
        }
      }
      if (this.target && this.target.life <= 0) {
        if (this.target.type === "mole") {
          this.misses++;
          this.combo = 0;
          playMiss();
        }
        this.target = null;
        this.spawnTimer = this.diff.gap;
      }
    } else {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0 && this.metrics && this.metrics.shoulderMid) {
        this.spawnTarget();
      }
    }
  }

  resolveTouch(target) {
    if (target.type === "bomb") {
      this.bombsHit++;
      this.combo = 0;
      this.score = Math.max(0, this.score - 15);
      playImpact();
      return;
    }
    this.hits++;
    this.combo++;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    this.score += Math.max(10, Math.round(target.life * 25) + 10);
    playHit();
    if (COMBO_MILESTONES.includes(this.combo)) {
      playCombo(this.combo);
      this.comboMessage = { text: `¡Combo x${this.combo}!`, ttl: 1.2 };
    }
  }

  spawnTarget() {
    const isBomb = Math.random() < this.diff.bombChance;
    const center = this.metrics.shoulderMid;
    const scale = this.metrics.scale;
    const angle = Math.random() * Math.PI * 2;
    const dist = scale * (this.diff.minDist + Math.random() * (this.diff.maxDist - this.diff.minDist));
    const r = scale * this.diff.radiusFactor;
    const margin = r + 10;
    const x = Math.min(Math.max(center.x + Math.cos(angle) * dist, margin), this.canvasW - margin);
    const y = Math.min(Math.max(center.y + Math.sin(angle) * dist * 0.8, margin), this.canvasH - margin);

    this.target = {
      x,
      y,
      r,
      life: this.diff.lifespan,
      maxLife: this.diff.lifespan,
      type: isBomb ? "bomb" : "mole",
    };
  }

  render(ctx, showSkeleton, landmarks) {
    ctx.clearRect(0, 0, this.canvasW, this.canvasH);

    if (showSkeleton && landmarks) drawSkeleton(ctx, landmarks, this.canvasW, this.canvasH);

    if (this.metrics) {
      drawMarker(ctx, this.metrics.leftPalm, this.metrics.scale * 0.14, HAND_COLOR.left + "cc");
      drawMarker(ctx, this.metrics.rightPalm, this.metrics.scale * 0.14, HAND_COLOR.right + "cc");
    }

    if (this.target) {
      const t = this.target;
      const progress = t.life / t.maxLife;
      const color = t.type === "bomb" ? "#f87171" : "#4ade80";
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
      ctx.fillStyle = color + "33";
      ctx.fill();
      drawMirroredText(ctx, t.type === "bomb" ? "💣" : "🐹", t.x, t.y, `${Math.round(t.r * 1.3)}px sans-serif`, "#fff");
      drawProgressRing(ctx, t.x, t.y, t.r + 8, progress, "#ffffff");
    }
  }

  getResults() {
    const total = this.hits + this.misses;
    return {
      score: this.score,
      accuracy: total > 0 ? Math.round((this.hits / total) * 100) : 0,
      hits: this.hits,
      misses: this.misses,
      bombsHit: this.bombsHit,
      bestCombo: this.bestCombo,
    };
  }
}
