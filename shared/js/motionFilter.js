// One Euro Filter (Casiez, Roussel & Vogel, 2012): smooths landmark jitter while
// staying responsive during fast movement, adapting the cutoff to the estimated
// speed of the signal instead of using a fixed smoothing window.

class LowPassFilter {
  constructor() {
    this.s = 0;
    this.initialized = false;
  }

  filter(value, alpha) {
    if (!this.initialized) {
      this.s = value;
      this.initialized = true;
    } else {
      this.s = alpha * value + (1 - alpha) * this.s;
    }
    return this.s;
  }
}

function smoothingFactor(dt, cutoff) {
  const r = 2 * Math.PI * cutoff * dt;
  return r / (r + 1);
}

class OneEuroFilter {
  constructor({ minCutoff = 1.0, beta = 0.3, dCutoff = 1.0 } = {}) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
    this.xFilter = new LowPassFilter();
    this.dxFilter = new LowPassFilter();
    this.lastValue = 0;
    this.lastTime = null;
  }

  filter(value, timestampSec) {
    if (this.lastTime === null) {
      this.lastTime = timestampSec;
      this.lastValue = value;
      this.xFilter.filter(value, 1);
      this.dxFilter.filter(0, 1);
      return value;
    }

    let dt = timestampSec - this.lastTime;
    if (dt <= 0) dt = 1 / 30;
    this.lastTime = timestampSec;

    const dx = (value - this.lastValue) / dt;
    const edx = this.dxFilter.filter(dx, smoothingFactor(dt, this.dCutoff));

    const cutoff = this.minCutoff + this.beta * Math.abs(edx);
    const result = this.xFilter.filter(value, smoothingFactor(dt, cutoff));
    this.lastValue = value;
    return result;
  }
}

// Tuned for normalized (0-1) pose landmark coordinates at ~30 fps:
// low enough minCutoff to kill small jitter while idle, beta high enough
// that a fast swing isn't noticeably delayed.
const DEFAULT_OPTIONS = { minCutoff: 1.0, beta: 0.35, dCutoff: 1.0 };

export class LandmarkSmoother {
  constructor(options = DEFAULT_OPTIONS) {
    this.options = options;
    this.filters = new Map();
  }

  smooth(landmarks, timestampSec) {
    return landmarks.map((lm, i) => {
      let axes = this.filters.get(i);
      if (!axes) {
        axes = { x: new OneEuroFilter(this.options), y: new OneEuroFilter(this.options) };
        this.filters.set(i, axes);
      }
      return {
        ...lm,
        x: axes.x.filter(lm.x, timestampSec),
        y: axes.y.filter(lm.y, timestampSec),
      };
    });
  }

  reset() {
    this.filters.clear();
  }
}
