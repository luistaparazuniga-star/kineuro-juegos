import { computeBodyMetrics } from "../../shared/js/bodyMetrics.js";
import { drawSkeleton, drawMarker, drawMirroredText, drawProgressRing } from "../../shared/js/renderUtils.js";
import { playHit, playMiss, playCombo, playAchievement } from "../../shared/js/soundEngine.js";

const DIFFICULTY = {
  easy: { count: 3, radiusFactor: 0.3, roundTime: 9, minDist: 0.8, maxDist: 1.5 },
  medium: { count: 4, radiusFactor: 0.25, roundTime: 7, minDist: 0.9, maxDist: 1.8 },
  hard: { count: 5, radiusFactor: 0.2, roundTime: 6, minDist: 1.0, maxDist: 2.1 },
};

const HAND_COLOR = { left: "#5bc8ff", right: "#ff9f5b" };
const WRONG_TOUCH_COOLDOWN = 0.6;

export class Game {
  constructor(settings) {
    this.settings = settings;
    this.diff = DIFFICULTY[settings.difficulty];
    this.score = 0;
    this.sequences = 0;
    this.mistakes = 0;
    this.combo = 0;
    this.comboMessage = null;
    this.targets = [];
    this.expected = 1;
    this.roundTimer = 0;
    this.wrongCooldown = 0;
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
    if (this.wrongCooldown > 0) this.wrongCooldown -= dt;

    if (!this.running || !this.metrics || !this.metrics.shoulderMid) return;

    if (this.targets.length === 0) {
      this.spawnRound();
      return;
    }

    this.roundTimer -= dt;
    if (this.roundTimer <= 0) {
      this.mistakes++;
      playMiss();
      this.combo = 0;
      this.spawnRound();
      return;
    }

    const hands = [this.metrics.leftPalm, this.metrics.rightPalm];
    for (const hand of hands) {
      if (!hand) continue;
      for (const t of this.targets) {
        if (t.hit) continue;
        const d = Math.hypot(hand.x - t.x, hand.y - t.y);
        if (d > t.r + this.metrics.scale * 0.16) continue;
        if (t.number === this.expected) {
          t.hit = true;
          this.score += 20 + this.expected * 5;
          this.expected++;
          this.combo++;
          playHit();
          if (this.expected > this.targets.length) {
            this.sequences++;
            this.score += 40;
            this.combo >= 2 ? playCombo(this.combo) : playAchievement();
            this.comboMessage = { text: `¡Secuencia ${this.sequences} completa!`, ttl: 1.2 };
            this.targets = [];
          }
        } else if (this.wrongCooldown <= 0) {
          this.mistakes++;
          this.combo = 0;
          this.wrongCooldown = WRONG_TOUCH_COOLDOWN;
          playMiss();
        }
      }
    }
  }

  spawnRound() {
    const n = this.diff.count;
    const center = this.metrics.shoulderMid;
    const scale = this.metrics.scale;
    const positions = [];
    let attempts = 0;
    while (positions.length < n && attempts < 200) {
      attempts++;
      const angle = Math.random() * Math.PI * 2;
      const dist = scale * (this.diff.minDist + Math.random() * (this.diff.maxDist - this.diff.minDist));
      const r = scale * this.diff.radiusFactor;
      const margin = r + 10;
      const rawX = center.x + Math.cos(angle) * dist;
      const rawY = center.y + Math.sin(angle) * dist * 0.8;
      const x = Math.min(Math.max(rawX, margin), this.canvasW - margin);
      const y = Math.min(Math.max(rawY, margin), this.canvasH - margin);
      const tooClose = positions.some((p) => Math.hypot(p.x - x, p.y - y) < r * 2.4);
      if (!tooClose) positions.push({ x, y, r });
    }
    this.targets = positions.map((p, i) => ({ ...p, number: i + 1, hit: false }));
    // shuffle displayed numbers so they aren't laid out in reading order
    const numbers = this.targets.map((t) => t.number);
    for (let i = numbers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
    }
    this.targets.forEach((t, i) => (t.number = numbers[i]));
    this.expected = 1;
    this.roundTimer = this.diff.roundTime;
  }

  render(ctx, showSkeleton, landmarks) {
    const canvasW = ctx.canvas.width;
    const canvasH = ctx.canvas.height;
    ctx.clearRect(0, 0, canvasW, canvasH);

    if (showSkeleton && landmarks) drawSkeleton(ctx, landmarks, canvasW, canvasH);

    if (this.metrics) {
      drawMarker(ctx, this.metrics.leftPalm, this.metrics.scale * 0.14, HAND_COLOR.left + "cc");
      drawMarker(ctx, this.metrics.rightPalm, this.metrics.scale * 0.14, HAND_COLOR.right + "cc");
    }

    const scale = this.metrics ? this.metrics.scale : 100;
    for (const t of this.targets) {
      const done = t.hit;
      const isNext = !done && t.number === this.expected;
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
      ctx.fillStyle = done ? "rgba(74,222,128,0.15)" : isNext ? "rgba(63,208,201,0.3)" : "rgba(255,255,255,0.12)";
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = done ? "#4ade80" : isNext ? "#3fd0c9" : "rgba(255,255,255,0.4)";
      ctx.stroke();
      drawMirroredText(ctx, String(t.number), t.x, t.y, `bold ${Math.round(t.r * 0.9)}px sans-serif`, done ? "#4ade80" : "#fff");
    }

    if (this.running && this.targets.length > 0 && this.metrics && this.metrics.shoulderMid) {
      const progress = Math.max(0, this.roundTimer / this.diff.roundTime);
      drawProgressRing(ctx, this.metrics.shoulderMid.x, this.metrics.shoulderMid.y, scale * 0.5, progress, "rgba(255,255,255,0.6)");
    }
  }

  getResults() {
    const total = this.sequences * (this.targets.length || this.diff.count) + this.mistakes;
    return {
      score: this.score,
      accuracy: total > 0 ? Math.round(((total - this.mistakes) / total) * 100) : 0,
      sequences: this.sequences,
      mistakes: this.mistakes,
    };
  }
}
