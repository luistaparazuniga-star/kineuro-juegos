let ctx = null;

function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function tone(freq, duration, delay = 0, type = "sine", gainPeak = 0.18) {
  const audio = getCtx();
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const start = audio.currentTime + delay;
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(gainPeak, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  osc.connect(gain).connect(audio.destination);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

export function playHit() {
  tone(660, 0.12);
  tone(990, 0.18, 0.06);
}

export function playMiss() {
  tone(180, 0.25, 0, "sine", 0.1);
}

export function playCountdownTick() {
  tone(440, 0.12);
}

export function playGo() {
  tone(523, 0.1);
  tone(784, 0.25, 0.1);
}

export function playFinish() {
  tone(523, 0.15);
  tone(659, 0.15, 0.14);
  tone(784, 0.3, 0.28);
}

export function playFreezeAlert() {
  tone(880, 0.18, 0, "square", 0.12);
  tone(880, 0.18, 0.22, "square", 0.12);
}

export function playMoveCue() {
  tone(392, 0.15, 0, "triangle", 0.14);
}

export function playStableHold() {
  tone(1046, 0.2, 0, "sine", 0.14);
}

export function unlockAudio() {
  getCtx();
}
