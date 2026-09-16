import { recordSession } from "./profiles.js";
import { getPatientPreset, personalizedIntro } from "./patientPresets.js";
import { playCountdownTick, playGo, playFinish, unlockAudio, startAmbientMusic, stopAmbientMusic } from "./soundEngine.js";
import { showScreen } from "./screens.js";

const NO_BODY_HINT_DELAY = 1500;

/**
 * One shell instance drives every game in the single-page app: it owns the
 * shared start/play/results DOM (created once in index.html) and swaps in a
 * different game's metadata + Game class each time the player opens one from
 * the catalog. Camera, tracker, countdown, render loop and results all stay
 * generic; only what's declared in each shared/js/profiles.js GAMES entry
 * (hint, extra fields, HUD/result field labels) changes between games.
 *
 * onExit is called whenever the player backs out to the catalog (the "←
 * Catálogo" link, the quit button, or "Volver al menú"); the caller decides
 * what that means (show the catalog screen).
 */
export function createGameShell({ onExit }) {
  // Start screen
  const brandIcon = document.getElementById("game-brand-icon");
  const brandName = document.getElementById("game-brand-name");
  const hintEl = document.getElementById("game-hint");
  const introTip = document.getElementById("intro-tip");
  const extraFieldsEl = document.getElementById("extra-fields");
  const difficultyGroup = document.getElementById("difficulty-group");
  const durationGroup = document.getElementById("duration-group");
  const skeletonToggle = document.getElementById("skeleton-toggle");
  const footerNoteEl = document.getElementById("game-footer-note");
  const backLink = document.getElementById("game-back-link");

  // Game screen
  const video = document.getElementById("video");
  const canvas = document.getElementById("overlay");
  const ctx = canvas.getContext("2d");
  const loadingOverlay = document.getElementById("loading-overlay");
  const loadingText = document.getElementById("loading-text");
  const countdownEl = document.getElementById("countdown");
  const errorText = document.getElementById("camera-error");
  const trackingHint = document.getElementById("tracking-hint");
  const comboBadge = document.getElementById("combo-badge");
  const cameraWrap = document.getElementById("camera-wrap");
  const phaseBanner = document.getElementById("phase-banner");
  const hudScore = document.getElementById("hud-score");
  const hudExtra = document.getElementById("hud-extra");
  const hudTime = document.getElementById("hud-time");

  // Results screen
  const resScore = document.getElementById("res-score");
  const resultsExtra = document.getElementById("results-extra");

  let meta = null;
  let profile = null;
  let preset = null;
  let settings = null;
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
  let hudExtraEls = [];

  function clearPhaseUI() {
    cameraWrap.classList.remove("phase-move", "phase-freeze");
    phaseBanner.classList.add("hidden");
  }

  function onPhaseChange(phase) {
    cameraWrap.classList.remove("phase-move", "phase-freeze");
    cameraWrap.classList.add(phase === "freeze" ? "phase-freeze" : "phase-move");
    phaseBanner.classList.remove("hidden", "move", "freeze");
    phaseBanner.classList.add(phase);
    phaseBanner.innerHTML = `<span>${phase === "freeze" ? "¡Quieto!" : "¡Moveté!"}</span>`;
  }

  function wireOptionGroup(group, key) {
    group.querySelectorAll(".opt").forEach((btn) => {
      btn.classList.toggle("selected", btn.dataset.value === String(settings[key]));
      btn.onclick = () => {
        group.querySelectorAll(".opt").forEach((b) => b.classList.remove("selected"));
        btn.classList.add("selected");
        settings[key] = key === "duration" ? Number(btn.dataset.value) : btn.dataset.value;
      };
    });
  }

  function buildExtraFields() {
    extraFieldsEl.innerHTML = "";
    for (const field of meta.extraFields || []) {
      settings[field.id] = field.default;
      const wrap = document.createElement("div");
      wrap.className = "field";
      const label = document.createElement("label");
      label.textContent = field.label;
      const group = document.createElement("div");
      group.className = "btn-group";
      for (const opt of field.options) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "opt" + (opt.value === field.default ? " selected" : "");
        btn.dataset.value = opt.value;
        btn.textContent = opt.label;
        btn.onclick = () => {
          group.querySelectorAll(".opt").forEach((b) => b.classList.remove("selected"));
          btn.classList.add("selected");
          settings[field.id] = opt.value;
        };
        group.appendChild(btn);
      }
      wrap.appendChild(label);
      wrap.appendChild(group);
      extraFieldsEl.appendChild(wrap);
    }
  }

  function buildHudExtra() {
    hudExtra.innerHTML = "";
    hudExtraEls = (meta.hudFields || []).map((f) => {
      const item = document.createElement("div");
      item.className = "hud-item";
      item.innerHTML = `<span class="hud-label">${f.label}</span><span class="hud-value">0</span>`;
      hudExtra.appendChild(item);
      return { key: f.key, valueEl: item.querySelector(".hud-value") };
    });
  }

  function updateHud() {
    hudScore.textContent = game.score;
    for (const f of hudExtraEls) f.valueEl.textContent = game[f.key];
    const t = Math.max(0, Math.ceil(timeLeft));
    const m = Math.floor(t / 60);
    const s = t % 60;
    hudTime.textContent = `${m}:${String(s).padStart(2, "0")}`;

    if (game.comboMessage) {
      comboBadge.textContent = game.comboMessage.text;
      comboBadge.classList.add("visible");
    } else {
      comboBadge.classList.remove("visible");
    }
  }

  function showResults(res) {
    resScore.textContent = res.score;
    resultsExtra.innerHTML = "";
    for (const f of meta.resultFields || []) {
      const card = document.createElement("div");
      card.className = "result-card" + (f.wide ? " wide" : "");
      const value = res[f.key];
      card.innerHTML = `<span class="result-value">${value}${f.suffix || ""}</span><span class="result-label">${f.label}</span>`;
      resultsExtra.appendChild(card);
    }
    if (meta.hasPhaseUI) clearPhaseUI();
  }

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
    const mod = await import(`/${meta.modulePath}`);
    const GameClass = mod[meta.className] || mod.Game;
    game = new GameClass({ ...settings }, onPhaseChange);
    buildHudExtra();
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
          startAmbientMusic(preset.mood);
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
    updateHud();

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
      recordSession(profile.id, meta.id, res);
    }

    showScreen("results");
  }

  function stopSession() {
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
    clearPhaseUI();
  }

  function quitToStart() {
    stopSession();
    showScreen("start");
  }

  function exitToCatalog() {
    stopSession();
    if (onExit) onExit();
  }

  document.getElementById("btn-start").onclick = beginSession;
  document.getElementById("btn-quit").onclick = exitToCatalog;
  document.getElementById("btn-again").onclick = beginSession;
  document.getElementById("btn-menu").onclick = exitToCatalog;
  if (backLink) {
    backLink.onclick = (e) => {
      e.preventDefault();
      exitToCatalog();
    };
  }

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    errorText.textContent = "Este navegador no soporta acceso a la cámara. Usá Chrome o Safari actualizado.";
    document.getElementById("btn-start").disabled = true;
  }

  /** Opens a game's start screen, populated from its GAMES metadata. */
  function openGame(gameMeta, activeProfile) {
    meta = gameMeta;
    profile = activeProfile;
    preset = getPatientPreset(profile?.patientType);
    settings = { difficulty: preset.difficulty, duration: 120, skeleton: true };

    brandIcon.textContent = meta.icon;
    brandName.textContent = meta.name;
    hintEl.textContent = meta.hint;
    footerNoteEl.textContent = meta.footerNote || "";

    const tip = personalizedIntro(profile);
    if (tip) {
      introTip.textContent = tip;
      introTip.classList.remove("hidden");
    } else {
      introTip.classList.add("hidden");
    }

    buildExtraFields();
    wireOptionGroup(difficultyGroup, "difficulty");
    wireOptionGroup(durationGroup, "duration");
    skeletonToggle.checked = true;
    settings.skeleton = true;
    skeletonToggle.onchange = (e) => {
      settings.skeleton = e.target.checked;
    };

    errorText.textContent = "";
    showScreen("start");
  }

  return { openGame, exitToCatalog };
}
