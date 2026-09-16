import { computeBodyMetrics } from "../../shared/js/bodyMetrics.js";
import { drawSkeleton, drawMirroredText } from "../../shared/js/renderUtils.js";
import { playBeamHit, playWhoosh, playCombo } from "../../shared/js/soundEngine.js";

const DIFFICULTY = {
  easy: { telegraph: 1.7, gapWidth: 0.48, cooldown: 0.7 },
  medium: { telegraph: 1.3, gapWidth: 0.36, cooldown: 0.55 },
  hard: { telegraph: 1.0, gapWidth: 0.26, cooldown: 0.4 },
};

const RESOLVED_FLASH = 0.35;
const COMBO_MILESTONES = [3, 5, 8, 12];

export class Game {
  constructor(settings) {
    this.settings = settings;
    this.diff = DIFFICULTY[settings.difficulty];
    this.score = 0;
    this.dodges = 0;
    this.hits = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.comboMessage = null;
    this.phase = "cooldown";
    this.phaseTimer = 0.6;
    this.gapX = 0.5;
    this.lastOutcome = null;
    this.metrics = null;
    this.running = false;
  }

  start() {
    this.running = true;
  }

  stop() {
    this.running = false;
  }

  spawnBeam() {
    this.phase = "telegraph";
    this.phaseTimer = this.diff.telegraph;
    this.gapX = 0.22 + Math.random() * 0.56;
    playWhoosh();
  }

  update(landmarks, dt, canvasW, canvasH) {
    this.canvasW = canvasW;
    this.canvasH = canvasH;
    this.metrics = computeBodyMetrics(landmarks, canvasW, canvasH);
    this.hitLineY = canvasH * 0.52;
    if (this.comboMessage) {
      this.comboMessage.ttl -= dt;
      if (this.comboMessage.ttl <= 0) this.comboMessage = null;
    }

    if (!this.running) return;

    this.phaseTimer -= dt;

    if (this.phase === "cooldown") {
      if (this.phaseTimer <= 0) this.spawnBeam();
      return;
    }

    if (this.phase === "telegraph") {
      if (this.phaseTimer <= 0) this.resolveBeam();
      return;
    }

    if (this.phase === "resolved" && this.phaseTimer <= 0) {
      this.phase = "cooldown";
      this.phaseTimer = this.diff.cooldown;
    }
  }

  resolveBeam() {
    const gapPx = this.gapX * this.canvasW;
    const halfWidth = (this.diff.gapWidth * this.canvasW) / 2;
    const playerX = this.metrics && this.metrics.shoulderMid ? this.metrics.shoulderMid.x : null;
    const dodged = playerX !== null && Math.abs(playerX - gapPx) <= halfWidth;

    if (dodged) {
      this.dodges++;
      this.combo++;
      this.bestCombo = Math.max(this.bestCombo, this.combo);
      this.score += 20 + this.combo * 5;
      this.lastOutcome = "dodge";
      if (COMBO_MILESTONES.includes(this.combo)) {
        playCombo(this.combo);
        this.comboMessage = { text: `¡Combo x${this.combo}!`, ttl: 1.2 };
      }
    } else {
      this.hits++;
      this.combo = 0;
      this.lastOutcome = "hit";
      playBeamHit();
    }
    this.phase = "resolved";
    this.phaseTimer = RESOLVED_FLASH;
  }

  render(ctx, showSkeleton, landmarks) {
    ctx.clearRect(0, 0, this.canvasW, this.canvasH);
    if (showSkeleton && landmarks) drawSkeleton(ctx, landmarks, this.canvasW, this.canvasH);

    const gapPx = this.gapX * this.canvasW;
    const halfWidth = (this.diff.gapWidth * this.canvasW) / 2;
    const beamHeight = this.canvasH * 0.07;
    const y0 = this.hitLineY - beamHeight / 2;

    if (this.phase !== "cooldown") {
      const isFiring = this.phase === "resolved";
      const alpha = this.phase === "telegraph" ? 0.35 + 0.15 * Math.sin(performance.now() / 90) : 0.85;
      const color = isFiring ? (this.lastOutcome === "hit" ? "#f87171" : "#4ade80") : "#f87171";
      ctx.fillStyle = hexWithAlpha(color, alpha);
      ctx.fillRect(0, y0, Math.max(0, gapPx - halfWidth), beamHeight);
      ctx.fillRect(gapPx + halfWidth, y0, this.canvasW - (gapPx + halfWidth), beamHeight);
    }

    if (this.metrics && this.metrics.shoulderMid) {
      ctx.strokeStyle = "rgba(255,255,255,0.4)";
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(this.metrics.shoulderMid.x, 0);
      ctx.lineTo(this.metrics.shoulderMid.x, this.canvasH);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.beginPath();
      ctx.arc(this.metrics.shoulderMid.x, this.metrics.shoulderMid.y, this.metrics.scale * 0.14, 0, Math.PI * 2);
      ctx.fillStyle = "#3fd0c9cc";
      ctx.fill();
    }

    if (this.phase === "resolved") {
      const msg = this.lastOutcome === "hit" ? "¡Uy!" : "¡Esquivado!";
      drawMirroredText(ctx, msg, this.canvasW / 2, this.hitLineY - beamHeight, `bold ${Math.round(this.canvasH * 0.05)}px sans-serif`, this.lastOutcome === "hit" ? "#f87171" : "#4ade80");
    }
  }

  getResults() {
    const total = this.dodges + this.hits;
    return {
      score: this.score,
      accuracy: total > 0 ? Math.round((this.dodges / total) * 100) : 0,
      dodges: this.dodges,
      hits: this.hits,
      bestCombo: this.bestCombo,
    };
  }
}

function hexWithAlpha(hex, alpha) {
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .padStart(2, "0");
  return hex + a;
}
