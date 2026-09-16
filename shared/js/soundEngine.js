// Small synthesized audio toolkit shared by every game: no external audio
// files (nothing to fetch, nothing licensed), just oscillators/noise driven
// by the Web Audio API. Keeping this in one place means every new minigame
// gets background music and a richer sound palette for free.

let ctx = null;
let musicGain = null;
let musicState = null;
let musicTimer = null;

function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

export function unlockAudio() {
  getCtx();
}

export function tone(freq, duration, delay = 0, type = "sine", gainPeak = 0.18, destination) {
  const audio = getCtx();
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const start = audio.currentTime + delay;
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(gainPeak, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  osc.connect(gain).connect(destination || audio.destination);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

export function noiseBurst(duration, delay = 0, gainPeak = 0.15, destination) {
  const audio = getCtx();
  const bufferSize = Math.max(1, Math.floor(audio.sampleRate * duration));
  const buffer = audio.createBuffer(1, bufferSize, audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  const src = audio.createBufferSource();
  src.buffer = buffer;
  const gain = audio.createGain();
  const start = audio.currentTime + delay;
  gain.gain.setValueAtTime(gainPeak, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  src.connect(gain).connect(destination || audio.destination);
  src.start(start);
}

// --- Common cues shared by every game screen -----------------------------

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

export function playAchievement() {
  tone(523, 0.14);
  tone(659, 0.14, 0.12);
  tone(784, 0.14, 0.24);
  tone(1046, 0.3, 0.36);
}

// --- Gameplay building blocks games can mix and match --------------------

export function playHit() {
  tone(660, 0.12);
  tone(990, 0.18, 0.06);
}

export function playMiss() {
  tone(180, 0.25, 0, "sine", 0.1);
}

export function playCombo(streak) {
  const freq = Math.min(660 * (1 + streak * 0.08), 1600);
  tone(freq, 0.14, 0, "triangle", 0.16);
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

export function playWhoosh() {
  noiseBurst(0.25, 0, 0.08);
}

export function playImpact() {
  noiseBurst(0.12, 0, 0.2);
  tone(120, 0.2, 0, "sine", 0.15);
}

export function playJump() {
  tone(300, 0.1);
  tone(500, 0.15, 0.05);
}

export function playLand() {
  tone(220, 0.12, 0, "sine", 0.12);
}

export function playKick() {
  noiseBurst(0.08, 0, 0.12);
  tone(200, 0.15, 0, "square", 0.1);
}

export function playBounce() {
  tone(440, 0.08, 0, "triangle", 0.15);
}

export function playBeamHit() {
  noiseBurst(0.2, 0, 0.18);
  tone(90, 0.25, 0, "sawtooth", 0.12);
}

// --- Ambient background music --------------------------------------------

const CHORD_PROGRESSIONS = {
  calm: [
    [261.6, 329.6, 392.0],
    [220.0, 277.2, 329.6],
    [246.9, 311.1, 392.0],
    [196.0, 246.9, 293.7],
  ],
  upbeat: [
    [293.7, 369.9, 440.0],
    [261.6, 329.6, 392.0],
    [349.2, 440.0, 523.3],
    [392.0, 493.9, 587.3],
  ],
};

export function startAmbientMusic(mood = "calm") {
  stopAmbientMusic();
  const audio = getCtx();
  musicGain = audio.createGain();
  musicGain.gain.value = 0;
  musicGain.connect(audio.destination);
  musicGain.gain.linearRampToValueAtTime(0.055, audio.currentTime + 1.2);

  const chords = CHORD_PROGRESSIONS[mood] || CHORD_PROGRESSIONS.calm;
  let chordIndex = 0;
  musicState = { stopped: false };
  const state = musicState;
  const gainRef = musicGain;

  function scheduleChord() {
    if (state.stopped) return;
    const chord = chords[chordIndex % chords.length];
    chordIndex++;
    const noteDuration = 1.9;
    chord.forEach((freq, i) => {
      tone(freq, noteDuration, i * 0.05, "sine", 0.5, gainRef);
      tone(freq * 2, noteDuration * 0.55, 0.3 + i * 0.05, "triangle", 0.18, gainRef);
    });
    musicTimer = setTimeout(scheduleChord, 2000);
  }
  scheduleChord();
}

export function stopAmbientMusic() {
  if (musicTimer) {
    clearTimeout(musicTimer);
    musicTimer = null;
  }
  if (musicState) musicState.stopped = true;
  if (musicGain) {
    const audio = getCtx();
    const gainRef = musicGain;
    gainRef.gain.linearRampToValueAtTime(0, audio.currentTime + 0.6);
    setTimeout(() => {
      try {
        gainRef.disconnect();
      } catch {
        /* already disconnected */
      }
    }, 800);
    musicGain = null;
  }
}
