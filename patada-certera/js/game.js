import { computeBodyMetrics } from "../../shared/js/bodyMetrics.js";
import { drawSkeleton, drawMirroredText, drawProgressRing } from "../../shared/js/renderUtils.js";
import { playHit, playMiss, playKick, playCombo } from "../../shared/js/soundEngine.js";

const DIFFICULTY = {
  easy: { lifespan: 3.2, radiusFactor: 0.3, kneeThreshold: 0.11, minDist: 0.7, maxDist: 1.4, gap: 0.5 },
  medium: { lifespan: 2.4, radiusFactor: 0.25, kneeThreshold: 0.14, minDist: 0.8, maxDist: 1.7, gap: 0.4 },
  hard: { lifespan: 1.9, radiusFactor: 0.2, kneeThreshold: 0.17, minDist: 0.9, maxDist: 2.0, gap: 0.3 },
};

const BASELINE_ALPHA = 0.05;
const COMBO_MILESTONES = [3, 5, 8, 12];

export class Game {
  constructor(settings) {
    this.settings = settings;
    this.diff = DIFFICULTY[settings.difficulty];
    this.score = 0;
    this.hits = 0;
    this.misses = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.comboMessage = null;
    this.target = null;
    this.spawnTimer = 0.5;
    this.baselineKneeL = null;
    this.baselineKneeR = null;
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

    if (this.metrics) {
      const legRaised = this.target && this.target.type === "bajo";
      if (this.metrics.leftKnee) {
        if (this.baselineKneeL === null) this.baselineKneeL = this.metrics.leftKnee.y;
        else if (!legRaised) this.baselineKneeL += (this.metrics.leftKnee.y - this.baselineKneeL) * BASELINE_ALPHA;
      }
      if (this.metrics.rightKnee) {
        if (this.baselineKneeR === null) this.baselineKneeR = this.metrics.rightKnee.y;
        else if (!legRaised) this.baselineKneeR += (this.metrics.rightKnee.y - this.baselineKneeR) * BASELINE_ALPHA;
      }
    }

    if (!this.running) return;

    if (this.target) {
      this.target.life -= dt;
      const scored = this.target.type === "alto" ? this.checkAlto() : this.checkBajo();
      if (scored) {
        this.registerHit();
        this.target = null;
        this.spawnTimer = this.diff.gap;
      } else if (this.target && this.target.life <= 0) {
        this.misses++;
        this.combo = 0;
        playMiss();
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

  checkAlto() {
    if (!this.metrics) return false;
    const hands = [this.metrics.leftPalm, this.metrics.rightPalm];
    const handRadius = this.metrics.scale * 0.16;
    return hands.some((h) => h && Math.hypot(h.x - this.target.x, h.y - this.target.y) <= this.target.r + handRadius);
  }

  checkBajo() {
    if (!this.metrics) return false;
    const scale = this.metrics.scale;
    const threshold = scale * this.diff.kneeThreshold;
    const liftedLeft = this.metrics.leftKnee && this.baselineKneeL !== null && this.baselineKneeL - this.metrics.leftKnee.y > threshold;
    const liftedRight = this.metrics.rightKnee && this.baselineKneeR !== null && this.baselineKneeR - this.metrics.rightKnee.y > threshold;
    return liftedLeft || liftedRight;
  }

  registerHit() {
    this.hits++;
    this.combo++;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    this.score += Math.max(10, Math.round(this.target.life * 20) + 10);
    playHit();
    if (this.target.type === "bajo") playKick();
    if (COMBO_MILESTONES.includes(this.combo)) {
      playCombo(this.combo);
      this.comboMessage = { text: `¡Combo x${this.combo}!`, ttl: 1.2 };
    }
  }

  spawnTarget() {
    const type = Math.random() < 0.5 ? "alto" : "bajo";
    const scale = this.metrics.scale;
    const r = scale * this.diff.radiusFactor;

    if (type === "alto") {
      const center = this.metrics.shoulderMid;
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.1;
      const dist = scale * (this.diff.minDist + Math.random() * (this.diff.maxDist - this.diff.minDist));
      const margin = r + 10;
      const x = Math.min(Math.max(center.x + Math.cos(angle) * dist, margin), this.canvasW - margin);
      const y = Math.min(Math.max(center.y + Math.sin(angle) * dist, margin), this.canvasH - margin);
      this.target = { x, y, r, life: this.diff.lifespan, maxLife: this.diff.lifespan, type };
    } else {
      const x = this.metrics.hipMid ? this.metrics.hipMid.x : this.metrics.shoulderMid.x;
      const y = this.metrics.hipMid ? this.metrics.hipMid.y : this.metrics.shoulderMid.y + scale;
      this.target = { x, y, r, life: this.diff.lifespan, maxLife: this.diff.lifespan, type };
    }
  }

  render(ctx, showSkeleton, landmarks) {
    ctx.clearRect(0, 0, this.canvasW, this.canvasH);
    if (showSkeleton && landmarks) drawSkeleton(ctx, landmarks, this.canvasW, this.canvasH);

    if (this.metrics) {
      for (const hand of [this.metrics.leftPalm, this.metrics.rightPalm]) {
        if (!hand) continue;
        ctx.beginPath();
        ctx.arc(hand.x, hand.y, this.metrics.scale * 0.14, 0, Math.PI * 2);
        ctx.fillStyle = "#5bc8ffcc";
        ctx.fill();
      }
    }

    if (this.target) {
      const t = this.target;
      const progress = t.life / t.maxLife;
      const color = t.type === "alto" ? "#4ade80" : "#facc15";
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
      ctx.fillStyle = color + "33";
      ctx.fill();
      drawMirroredText(ctx, t.type === "alto" ? "✋" : "🦵", t.x, t.y, `${Math.round(t.r * 1.2)}px sans-serif`, "#fff");
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
      bestCombo: this.bestCombo,
    };
  }
}
