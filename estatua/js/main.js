import { StatueGame } from "./game.js";
import { getActiveProfile } from "../../shared/js/profiles.js";
import { getPatientPreset, personalizedIntro } from "../../shared/js/patientPresets.js";
import { createGameShell } from "../../shared/js/gameShell.js";

const activeProfile = getActiveProfile();
if (!activeProfile) {
  window.location.href = "../";
}

const preset = getPatientPreset(activeProfile?.patientType);
const settings = { difficulty: preset.difficulty, duration: 120, skeleton: true };

function wireOptionGroup(id, key) {
  const group = document.getElementById(id);
  group.querySelectorAll(".opt").forEach((btn) => {
    btn.classList.toggle("selected", btn.dataset.value === String(settings[key]));
    btn.addEventListener("click", () => {
      group.querySelectorAll(".opt").forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");
      const value = btn.dataset.value;
      settings[key] = key === "duration" ? Number(value) : value;
    });
  });
}

wireOptionGroup("difficulty-group", "difficulty");
wireOptionGroup("duration-group", "duration");

document.getElementById("skeleton-toggle").addEventListener("change", (e) => {
  settings.skeleton = e.target.checked;
});

const introTip = document.getElementById("intro-tip");
const tipText = personalizedIntro(activeProfile);
if (tipText) {
  introTip.textContent = tipText;
  introTip.classList.remove("hidden");
}

const cameraWrap = document.getElementById("camera-wrap");
const phaseBanner = document.getElementById("phase-banner");

function onPhaseChange(phase) {
  cameraWrap.classList.remove("phase-move", "phase-freeze");
  cameraWrap.classList.add(phase === "freeze" ? "phase-freeze" : "phase-move");
  phaseBanner.classList.remove("hidden", "move", "freeze");
  phaseBanner.classList.add(phase);
  phaseBanner.innerHTML = `<span>${phase === "freeze" ? "¡Quieto!" : "¡Moveté!"}</span>`;
}

const hudScore = document.getElementById("hud-score");
const hudStreak = document.getElementById("hud-streak");
const hudTime = document.getElementById("hud-time");

function updateHud(game, timeLeft) {
  hudScore.textContent = game.score;
  hudStreak.textContent = game.streak;
  const t = Math.max(0, Math.ceil(timeLeft));
  const m = Math.floor(t / 60);
  const s = t % 60;
  hudTime.textContent = `${m}:${String(s).padStart(2, "0")}`;
}

function showResults(res) {
  document.getElementById("res-score").textContent = res.score;
  document.getElementById("res-accuracy").textContent = `${res.accuracy}%`;
  document.getElementById("res-streak").textContent = res.maxStreak;
  document.getElementById("res-stability").textContent = `${res.stability}%`;
  clearPhaseUI();
}

function clearPhaseUI() {
  phaseBanner.classList.add("hidden");
  cameraWrap.classList.remove("phase-move", "phase-freeze");
}

createGameShell({
  gameId: "estatua",
  profile: activeProfile,
  settings,
  musicMood: preset.mood,
  createGame: (s) => new StatueGame(s, onPhaseChange),
  updateHud,
  showResults,
  onQuit: clearPhaseUI,
});
