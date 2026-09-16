import { LANDMARK, estimatePalm } from "../../shared/js/landmarks.js";
import { playHit, playMiss, playCombo } from "../../shared/js/soundEngine.js";

const DIFFICULTY = {
  easy: { radiusFactor: 0.36, lifespan: 4.5, gap: 0.4, minDist: 0.8, maxDist: 1.5 },
  medium: { radiusFactor: 0.27, lifespan: 3.2, gap: 0.3, minDist: 1.0, maxDist: 1.9 },
  hard: { radiusFactor: 0.19, lifespan: 2.3, gap: 0.2, minDist: 1.2, maxDist: 2.3 },
};

const BONE_PAIRS = [
  [LANDMARK.LEFT_SHOULDER, LANDMARK.LEFT_ELBOW],
  [LANDMARK.LEFT_ELBOW, LANDMARK.LEFT_WRIST],
  [LANDMARK.RIGHT_SHOULDER, LANDMARK.RIGHT_ELBOW],
  [LANDMARK.RIGHT_ELBOW, LANDMARK.RIGHT_WRIST],
  [LANDMARK.LEFT_SHOULDER, LANDMARK.RIGHT_SHOULDER],
  [LANDMARK.LEFT_SHOULDER, LANDMARK.LEFT_HIP],
  [LANDMARK.RIGHT_SHOULDER, LANDMARK.RIGHT_HIP],
];

const HAND_COLOR = { left: "#5bc8ff", right: "#ff9f5b" };
const COMBO_MILESTONES = [3, 5, 8, 12, 18, 25];

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
    this.spawnTimer = 0.6;
    this.canvasW = 0;
    this.canvasH = 0;
    this.scale = 100;
    this.shoulderMid = null;
    this.wristPx = { left: null, right: null };
    this.reach = { left: 0, right: 0 };
    this.particles = [];
    this.popups = [];
    this.flashAlpha = 0;
    this.running = false;
  }

  start() {
    this.running = true;
  }

  stop() {
    this.running = false;
  }

  armsInPlay() {
    if (this.settings.arm === "both") return ["left", "right"];
    return [this.settings.arm];
  }

  update(landmarks, dt, canvasW, canvasH) {
    this.canvasW = canvasW;
    this.canvasH = canvasH;

    if (landmarks) {
      const px = (p) => (p ? { x: p.x * canvasW, y: p.y * canvasH } : null);
      const ls = landmarks[LANDMARK.LEFT_SHOULDER];
      const rs = landmarks[LANDMARK.RIGHT_SHOULDER];
      const lh = landmarks[LANDMARK.LEFT_HIP];
      const rh = landmarks[LANDMARK.RIGHT_HIP];

      if (ls && rs) {
        const shoulderMidPx = {
          x: ((ls.x + rs.x) / 2) * canvasW,
          y: ((ls.y + rs.y) / 2) * canvasH,
        };
        this.shoulderMid = shoulderMidPx;

        const shoulderWidth = Math.hypot((ls.x - rs.x) * canvasW, (ls.y - rs.y) * canvasH);
        let torsoHeight = shoulderWidth * 1.4;
        if (lh && rh) {
          const hipMidPx = { x: ((lh.x + rh.x) / 2) * canvasW, y: ((lh.y + rh.y) / 2) * canvasH };
          torsoHeight = Math.hypot(shoulderMidPx.x - hipMidPx.x, shoulderMidPx.y - hipMidPx.y);
        }
        this.scale = Math.max(shoulderWidth, torsoHeight, 40);
      }

      // Pose models only report the wrist joint, so the raw dot floats a
      // hand's length away from where players expect their palm to be.
      // Extrapolating a bit past the wrist along the forearm closes that gap.
      const leftPalm = estimatePalm(landmarks, LANDMARK.LEFT_WRIST, LANDMARK.LEFT_ELBOW);
      const rightPalm = estimatePalm(landmarks, LANDMARK.RIGHT_WRIST, LANDMARK.RIGHT_ELBOW);
      if (leftPalm) this.wristPx.left = px(leftPalm);
      if (rightPalm) this.wristPx.right = px(rightPalm);

      for (const side of this.armsInPlay()) {
        const wrist = this.wristPx[side];
        if (wrist && this.shoulderMid) {
          const d = Math.hypot(wrist.x - this.shoulderMid.x, wrist.y - this.shoulderMid.y);
          const ratio = Math.min(1, d / (this.scale * 2.6));
          if (ratio > this.reach[side]) this.reach[side] = ratio;
        }
      }
    }

    this.updateParticles(dt);
    this.updatePopups(dt);
    if (this.flashAlpha > 0) this.flashAlpha = Math.max(0, this.flashAlpha - dt * 3);

    if (!this.running) return;

    if (this.target) {
      this.target.life -= dt;
      const wrist = this.wristPx[this.target.side];
      if (wrist) {
        const d = Math.hypot(wrist.x - this.target.x, wrist.y - this.target.y);
        const handRadius = this.scale * 0.16;
        if (d <= this.target.r + handRadius) {
          this.registerHit(this.target);
          this.target = null;
          this.spawnTimer = this.diff.gap;
        }
      }
      if (this.target && this.target.life <= 0) {
        this.misses++;
        this.combo = 0;
        this.comboMessage = null;
        playMiss();
        this.target = null;
        this.spawnTimer = this.diff.gap;
      }
    } else {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0 && this.shoulderMid) {
        this.spawnTarget();
      }
    }
  }

  registerHit(target) {
    this.hits++;
    this.combo++;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    const comboMultiplier = 1 + Math.min(this.combo, 10) * 0.08;
    const gained = Math.round((Math.max(10, Math.round(target.life * 20) + 10)) * comboMultiplier);
    this.score += gained;
    this.spawnParticles(target.x, target.y, HAND_COLOR[target.side]);
    this.spawnPopup(target.x, target.y, `+${gained}`);
    this.flashAlpha = 0.18;
    playHit();
    if (COMBO_MILESTONES.includes(this.combo)) {
      playCombo(this.combo);
      this.comboMessage = { text: `¡Combo x${this.combo}!`, ttl: 1.4 };
    }
  }

  spawnParticles(x, y, color) {
    for (let i = 0; i < 14; i++) {
      const angle = (Math.PI * 2 * i) / 14 + Math.random() * 0.3;
      const speed = this.scale * (0.6 + Math.random() * 0.8);
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.5 + Math.random() * 0.3,
        maxLife: 0.8,
        color,
      });
    }
  }

  updateParticles(dt) {
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += this.scale * 0.6 * dt;
      p.life -= dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
  }

  spawnPopup(x, y, text) {
    this.popups.push({ x, y, text, life: 0.9, maxLife: 0.9 });
  }

  updatePopups(dt) {
    for (const p of this.popups) {
      p.y -= this.scale * 0.35 * dt;
      p.life -= dt;
    }
    this.popups = this.popups.filter((p) => p.life > 0);
    if (this.comboMessage) {
      this.comboMessage.ttl -= dt;
      if (this.comboMessage.ttl <= 0) this.comboMessage = null;
    }
  }

  spawnTarget() {
    const arms = this.armsInPlay();
    const side = arms[Math.floor(Math.random() * arms.length)];
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.15;
    const dist = this.scale * (this.diff.minDist + Math.random() * (this.diff.maxDist - this.diff.minDist));
    const dirX = side === "left" ? -1 : 1;
    let x = this.shoulderMid.x + dirX * Math.abs(Math.sin(angle)) * dist * 0.9;
    let y = this.shoulderMid.y + Math.cos(angle) * dist;

    const margin = this.scale * this.diff.radiusFactor + 10;
    x = Math.min(Math.max(x, margin), this.canvasW - margin);
    y = Math.min(Math.max(y, margin), this.canvasH - margin);

    this.target = {
      x,
      y,
      r: this.scale * this.diff.radiusFactor,
      life: this.diff.lifespan,
      maxLife: this.diff.lifespan,
      side,
    };
  }

  render(ctx, showSkeleton, landmarks) {
    ctx.clearRect(0, 0, this.canvasW, this.canvasH);

    if (showSkeleton && landmarks) {
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

    for (const side of this.armsInPlay()) {
      const wrist = this.wristPx[side];
      if (!wrist) continue;
      ctx.beginPath();
      ctx.arc(wrist.x, wrist.y, this.scale * 0.14, 0, Math.PI * 2);
      ctx.fillStyle = HAND_COLOR[side] + "cc";
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();
    }

    if (this.target) {
      const t = this.target;
      const progress = t.life / t.maxLife;
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
      ctx.fillStyle = HAND_COLOR[t.side] + "33";
      ctx.fill();

      drawStar(ctx, t.x, t.y, t.r * 0.8, HAND_COLOR[t.side]);

      ctx.beginPath();
      ctx.arc(t.x, t.y, t.r + 8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 5;
      ctx.stroke();
    }

    for (const p of this.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4 * alpha + 1, 0, Math.PI * 2);
      ctx.fillStyle = p.color + Math.round(alpha * 255).toString(16).padStart(2, "0");
      ctx.fill();
    }

    for (const p of this.popups) {
      const alpha = Math.max(0, p.life / p.maxLife);
      drawMirroredText(ctx, p.text, p.x, p.y, `bold ${Math.round(this.scale * 0.22)}px sans-serif`, `rgba(255,255,255,${alpha})`);
    }

    if (this.flashAlpha > 0) {
      ctx.fillStyle = `rgba(255,255,255,${this.flashAlpha})`;
      ctx.fillRect(0, 0, this.canvasW, this.canvasH);
    }
  }

  getResults() {
    const arms = this.armsInPlay();
    const avgReach = arms.reduce((sum, s) => sum + this.reach[s], 0) / arms.length;
    const total = this.hits + this.misses;
    return {
      score: this.score,
      hits: this.hits,
      misses: this.misses,
      accuracy: total > 0 ? Math.round((this.hits / total) * 100) : 0,
      reach: Math.round(avgReach * 100),
      bestCombo: this.bestCombo,
    };
  }
}

function drawMirroredText(ctx, text, x, y, font, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(-1, 1);
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

function drawStar(ctx, cx, cy, r, color) {
  const spikes = 5;
  const outerR = r;
  const innerR = r * 0.5;
  let rot = (Math.PI / 2) * 3;
  const step = Math.PI / spikes;
  ctx.beginPath();
  ctx.moveTo(cx, cy - outerR);
  for (let i = 0; i < spikes; i++) {
    let x = cx + Math.cos(rot) * outerR;
    let y = cy + Math.sin(rot) * outerR;
    ctx.lineTo(x, y);
    rot += step;
    x = cx + Math.cos(rot) * innerR;
    y = cy + Math.sin(rot) * innerR;
    ctx.lineTo(x, y);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerR);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 18;
  ctx.fill();
  ctx.shadowBlur = 0;
}
