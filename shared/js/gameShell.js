import { recordSession } from "./profiles.js";
import { playCountdownTick, playGo, playFinish, unlockAudio, startAmbientMusic, stopAmbientMusic } from "./soundEngine.js";

const NO_BODY_HINT_DELAY = 1500;

/**
 * Wires up the boilerplate shared by every camera minigame: screen
 * switching, camera lifecycle, pose tracker init, countdown, the render
 * loop, results recording and the "body not detected" hint. Each game only
 * has to supply a small Game class (update/render/getResults/start/stop)
 * and a couple of DOM callbacks for its own HUD/results fields.
 *
 * config:
 *   gameId          - id used for profiles.recordSession
 *   profile         - active profile (or null)
 *   settings        - live settings object, must include .duration and .skeleton
 *   createGame(settings, profile) -> game instance
 *   updateHud(game, timeLeft)     -> update HUD DOM
 *   showResults(results)          -> fill the results screen DOM
 *   musicMood                    - "calm" | "upbeat" (optional, default "calm")
 */
export function createGameShell(config) {
  const { gameId, profile, settings, createGame, updateHud, showResults, musicMood = "calm", onQuit } = config;

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

  const video = document.getElementById("video");
  const canvas = document.getElementById("overlay");
  const ctx = canvas.getContext("2d");
  const loadingOverlay = document.getElementById("loading-overlay");
  const loadingText = document.getElementById("loading-text");
  const countdownEl = document.getElementById("countdown");
  const errorText = document.getElementById("camera-error");
  const trackingHint = document.getElementById("tracking-hint");

  let tracker = null;
  let game = null;
  let rafId = null;
  let timeLeft = 0;
  let lastFrameTime = 0;
  let sessionState = "idle"; // idle | countdown | playing | done
  let stream = null;
  let countdownInterval = null;
  let countdownTimeout = null;
  let lastBodySeenTime = 0;

  async function initTrackerOnce() {
    if (tracker) return;
    loadingText.textContent = "Cargando el motor de seguimiento…";
    const { PoseTracker } = await import("./poseTrackerCore.js");
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
      errorText.textContent = "No se pudo acceder a la cámara. Revisá los permisos e intentalo de nuevo.";
      showScreen("start");
      stopCamera();
      return;
    }

    try {
      await initTrackerOnce();
    } catch (err) {
      loadingOverlay.classList.add("hidden");
      errorText.textContent = "No se pudo cargar el motor de seguimiento. Revisá tu conexión a internet e intentalo de nuevo.";
      showScreen("start");
      stopCamera();
      return;
    }

    loadingOverlay.classList.add("hidden");
    game = createGame(settings, profile);
    timeLeft = settings.duration;
    updateHud(game, timeLeft);
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
          startAmbientMusic(musicMood);
          lastFrameTime = performance.now();
          lastBodySeenTime = lastFrameTime;
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
    if (landmarks) lastBodySeenTime = now;
    trackingHint.classList.toggle("hidden", now - lastBodySeenTime < NO_BODY_HINT_DELAY);

    game.update(landmarks, dt, canvas.width, canvas.height);
    game.render(ctx, settings.skeleton, landmarks);

    timeLeft -= dt;
    updateHud(game, timeLeft);

    if (timeLeft <= 0) {
      finishSession();
      return;
    }

    rafId = requestAnimationFrame(loop);
  }

  function finishSession() {
    sessionState = "done";
    if (rafId) cancelAnimationFrame(rafId);
    game.stop();
    stopAmbientMusic();
    playFinish();
    stopCamera();
    trackingHint.classList.add("hidden");

    const res = game.getResults();
    showResults(res);

    if (profile) {
      recordSession(profile.id, gameId, res);
    }

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
    stopAmbientMusic();
    stopCamera();
    countdownEl.classList.add("hidden");
    trackingHint.classList.add("hidden");
    if (onQuit) onQuit();
    showScreen("start");
  }

  document.getElementById("btn-start").addEventListener("click", beginSession);
  document.getElementById("btn-quit").addEventListener("click", quitSession);
  document.getElementById("btn-again").addEventListener("click", beginSession);
  document.getElementById("btn-menu").addEventListener("click", () => {
    window.location.href = "../";
  });

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    errorText.textContent = "Este navegador no soporta acceso a la cámara. Usá Chrome o Safari actualizado.";
    document.getElementById("btn-start").disabled = true;
  }

  showScreen("start");

  return { showScreen, quitSession, beginSession };
}
