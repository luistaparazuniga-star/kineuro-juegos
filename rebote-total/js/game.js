import { computeBodyMetrics } from "../../shared/js/bodyMetrics.js";
import { drawSkeleton } from "../../shared/js/renderUtils.js";
import { playBounce, playMiss, playCombo } from "../../shared/js/soundEngine.js";

const DIFFICULTY = {
  easy: { speed: 240, paddleWidthFactor: 0.3, speedGain: 1.025 },
  medium: { speed: 320, paddleWidthFactor: 0.22, speedGain: 1.04 },
  hard: { speed: 400, paddleWidthFactor: 0.17, speedGain: 1.055 },
};

const BALL_RADIUS_FACTOR = 0.02;
const PADDLE_HEIGHT_FACTOR = 0.018;
const COMBO_MILESTONES = [5, 10, 18, 28];

export class Game {
  constructor(settings) {
    this.settings = settings;
    this.diff = DIFFICULTY[settings.difficulty];
    this.score = 0;
    this.bounces = 0;
    this.misses = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.comboMessage = null;
    this.ball = null;
    this.paddleX = 0;
    this.metrics = null;
    this.running = false;
  }

  start() {
    this.running = true;
  }

  stop() {
    this.running = false;
  }

  resetBall() {
    const angle = Math.PI / 2 + (Math.random() - 0.5) * 0.9; // mostly downward
    this.ball = {
      x: this.canvasW / 2,
      y: this.canvasH * 0.12,
      vx: Math.cos(angle) * this.diff.speed,
      vy: Math.sin(angle) * this.diff.speed,
    };
  }

  update(landmarks, dt, canvasW, canvasH) {
    this.canvasW = canvasW;
    this.canvasH = canvasH;
    this.metrics = computeBodyMetrics(landmarks, canvasW, canvasH);
    if (this.comboMessage) {
      this.comboMessage.ttl -= dt;
      if (this.comboMessage.ttl <= 0) this.comboMessage = null;
    }
    if (!this.ball) this.resetBall();

    const paddleHalf = (this.diff.paddleWidthFactor * canvasW) / 2;
    const targetX = this.metrics && this.metrics.shoulderMid ? this.metrics.shoulderMid.x : canvasW / 2;
    this.paddleX = Math.min(Math.max(targetX, paddleHalf), canvasW - paddleHalf);

    if (!this.running) return;

    const r = canvasW * BALL_RADIUS_FACTOR;
    const paddleY = canvasH * 0.88;
    const b = this.ball;
    b.x += b.vx * dt;
    b.y += b.vy * dt;

    if (b.x - r < 0) {
      b.x = r;
      b.vx = Math.abs(b.vx);
    } else if (b.x + r > canvasW) {
      b.x = canvasW - r;
      b.vx = -Math.abs(b.vx);
    }
    if (b.y - r < 0) {
      b.y = r;
      b.vy = Math.abs(b.vy);
    }

    if (b.vy > 0 && b.y + r >= paddleY && b.x >= this.paddleX - paddleHalf && b.x <= this.paddleX + paddleHalf) {
      b.y = paddleY - r;
      b.vy = -Math.abs(b.vy) * this.diff.speedGain;
      b.vx *= this.diff.speedGain;
      this.bounces++;
      this.combo++;
      this.bestCombo = Math.max(this.bestCombo, this.combo);
      this.score += 10 + this.combo * 2;
      playBounce();
      if (COMBO_MILESTONES.includes(this.combo)) {
        playCombo(this.combo);
        this.comboMessage = { text: `¡Combo x${this.combo}!`, ttl: 1.2 };
      }
    } else if (b.y - r > canvasH) {
      this.misses++;
      this.combo = 0;
      playMiss();
      this.resetBall();
    }
  }

  render(ctx, showSkeleton, landmarks) {
    ctx.clearRect(0, 0, this.canvasW, this.canvasH);
    if (showSkeleton && landmarks) drawSkeleton(ctx, landmarks, this.canvasW, this.canvasH);

    const paddleY = this.canvasH * 0.88;
    const paddleHalf = (this.diff.paddleWidthFactor * this.canvasW) / 2;
    const paddleH = this.canvasH * PADDLE_HEIGHT_FACTOR;
    ctx.fillStyle = "#3fd0c9";
    ctx.beginPath();
    ctx.roundRect(this.paddleX - paddleHalf, paddleY - paddleH / 2, paddleHalf * 2, paddleH, paddleH / 2);
    ctx.fill();

    if (this.ball) {
      const r = this.canvasW * BALL_RADIUS_FACTOR;
      ctx.beginPath();
      ctx.arc(this.ball.x, this.ball.y, r, 0, Math.PI * 2);
      ctx.fillStyle = "#ff9f5b";
      ctx.shadowColor = "#ff9f5b";
      ctx.shadowBlur = 14;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  getResults() {
    const total = this.bounces + this.misses;
    return {
      score: this.score,
      accuracy: total > 0 ? Math.round((this.bounces / total) * 100) : 0,
      bounces: this.bounces,
      misses: this.misses,
      bestCombo: this.bestCombo,
    };
  }
}
