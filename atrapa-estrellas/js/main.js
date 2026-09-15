import { Game } from "./game.js";
import { playCountdownTick, playGo, playFinish, unlockAudio } from "./sound.js";

const settings = { arm: "both", difficulty: "medium", duration: 120, skeleton: true };

const screens = {
  start: document.getElementById("screen-start"),
  game: document.getElementById("screen-game"),
  results: document.getElementById("screen-results"),
};

function showScreen(name) {
  for (const key of Object.keys(screens)) {
    screens[key].classList.toggle("active", key === name);
  }
}

function wireOptionGroup(id, key) {
  const group = document.getElementById(id);
  group.querySelectorAll(".opt").forEach((btn) => {
    btn.addEventListener("click", () => {
      group.querySelectorAll(".opt").forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");
      const value = btn.dataset.value;
      settings[key] = key === "duration" ? Number(value) : value;
    });
  });
}

wireOptionGroup("arm-group", "arm");
wireOptionGroup("difficulty-group", "difficulty");
wireOptionGroup("duration-group", "duration");

document.getElementById("skeleton-toggle").addEventListener("change", (e) => {
  settings.skeleton = e.target.checked;
});

const video = document.getElementById("video");
const canvas = document.getElementById("overlay");
const ctx = canvas.getContext("2d");
const loadingOverlay = document.getElementById("loading-overlay");
const loadingText = document.getElementById("loading-text");
const countdownEl = document.getElementById("countdown");
const errorText = document.getElementById("camera-error");

const hudScore = document.getElementById("hud-score");
const hudHits = document.getElementById("hud-hits");
const hudTime = document.getElementById("hud-time");

let tracker = null;
let game = null;
let rafId = null;
let timeLeft = 0;
let lastFrameTime = 0;
let sessionState = "idle"; // idle | countdown | playing | done
let stream = null;
let countdownInterval = null;
let countdownTimeout = null;

async function initTrackerOnce() {
  if (tracker) return;
  loadingText.textContent = "Cargando el motor de seguimiento…";
  const { PoseTracker } = await import("./poseTracker.js");
  tracker = new PoseTracker();
  await tracker.init();
}

async function startCamera() {
  loadingText.textContent = "Activando la cámara…";
  stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
    audio: false,
  });
  video.srcObject = stream;
  await video.play();
  await new Promise((resolve) => {
    if (video.readyState >= 2) return resolve();
    video.onloadedmetadata = () => resolve();
  });
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
}

function stopCamera() {
  if (stream) {
    stream.getTracks().forEach((t) => t.stop());
    stream = null;
  }
}

async function beginSession() {
  errorText.textContent = "";
  unlockAudio();
  showScreen("game");
  loadingOverlay.classList.remove("hidden");
  sessionState = "idle";

  try {
    await startCamera();
  } catch (err) {
    loadingOverlay.classList.add("hidden");
    errorText.textContent = "No se pudo acceder a la cámara. Revisa los permisos e inténtalo de nuevo.";
    showScreen("start");
    stopCamera();
    return;
  }

  try {
    await initTrackerOnce();
  } catch (err) {
    loadingOverlay.classList.add("hidden");
    errorText.textContent = "No se pudo cargar el motor de seguimiento. Revisa tu conexión a internet e inténtalo de nuevo.";
    showScreen("start");
    stopCamera();
    return;
  }

  loadingOverlay.classList.add("hidden");
  game = new Game(settings);
  timeLeft = settings.duration;
  updateHud();
  runCountdown();
}

function runCountdown() {
  sessionState = "countdown";
  let n = 3;
  countdownEl.classList.remove("hidden");
  countdownEl.textContent = n;
  playCountdownTick();
  countdownInterval = setInterval(() => {
    n -= 1;
    if (n > 0) {
      countdownEl.textContent = n;
      playCountdownTick();
    } else {
      clearInterval(countdownInterval);
      countdownInterval = null;
      countdownEl.textContent = "¡Ya!";
      playGo();
      countdownTimeout = setTimeout(() => {
        countdownTimeout = null;
        countdownEl.classList.add("hidden");
        sessionState = "playing";
        game.start();
        lastFrameTime = performance.now();
        loop();
      }, 500);
    }
  }, 700);
}

function loop() {
  if (sessionState !== "playing") return;
  const now = performance.now();
  const dt = Math.min(0.05, (now - lastFrameTime) / 1000);
  lastFrameTime = now;

  const landmarks = tracker.detect(video);
  game.update(landmarks, dt, canvas.width, canvas.height);
  game.render(ctx, settings.skeleton, landmarks);

  timeLeft -= dt;
  updateHud();

  if (timeLeft <= 0) {
    finishSession();
    return;
  }

  rafId = requestAnimationFrame(loop);
}

function updateHud() {
  hudScore.textContent = game.score;
  hudHits.textContent = game.hits;
  const t = Math.max(0, Math.ceil(timeLeft));
  const m = Math.floor(t / 60);
  const s = t % 60;
  hudTime.textContent = `${m}:${String(s).padStart(2, "0")}`;
}

function finishSession() {
  sessionState = "done";
  if (rafId) cancelAnimationFrame(rafId);
  game.stop();
  playFinish();
  stopCamera();

  const res = game.getResults();
  document.getElementById("res-score").textContent = res.score;
  document.getElementById("res-accuracy").textContent = `${res.accuracy}%`;
  document.getElementById("res-hits").textContent = res.hits;
  document.getElementById("res-misses").textContent = res.misses;
  document.getElementById("res-reach").textContent = `${res.reach}%`;

  showScreen("results");
}

function quitSession() {
  sessionState = "idle";
  if (rafId) cancelAnimationFrame(rafId);
  if (countdownInterval) clearInterval(countdownInterval);
  if (countdownTimeout) clearTimeout(countdownTimeout);
  countdownInterval = null;
  countdownTimeout = null;
  if (game) game.stop();
  stopCamera();
  countdownEl.classList.add("hidden");
  showScreen("start");
}

document.getElementById("btn-start").addEventListener("click", beginSession);
document.getElementById("btn-quit").addEventListener("click", quitSession);
document.getElementById("btn-again").addEventListener("click", beginSession);
document.getElementById("btn-menu").addEventListener("click", () => showScreen("start"));

if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
  errorText.textContent = "Este navegador no soporta acceso a la cámara. Usa Chrome o Safari actualizado.";
  document.getElementById("btn-start").disabled = true;
}
