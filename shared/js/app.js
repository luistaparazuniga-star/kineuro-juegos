import {
  PATIENT_TYPES,
  AVATARS,
  GAMES,
  listProfiles,
  createProfile,
  setActiveProfile,
  getActiveProfile,
  levelForPoints,
  pointsForNextLevel,
  isGameUnlocked,
  allAchievementIds,
  achievementInfo,
} from "./profiles.js";
import { createGameShell } from "./gameShell.js";
import { showScreen } from "./screens.js";

let selectedAvatar = AVATARS[0];
let selectedType = "adulto";

function renderProfileList() {
  const list = document.getElementById("profile-list");
  const profiles = listProfiles();
  list.innerHTML = "";
  for (const p of profiles) {
    const card = document.createElement("button");
    card.className = "profile-card";
    card.innerHTML = `
      <span class="avatar-circle">${p.avatar}</span>
      <span class="name">${p.name}</span>
      <span class="level">Nivel ${levelForPoints(p.points)}</span>
    `;
    card.addEventListener("click", () => {
      setActiveProfile(p.id);
      renderCatalog();
      showScreen("catalog");
    });
    list.appendChild(card);
  }
}

function renderAvatarGrid() {
  const grid = document.getElementById("avatar-grid");
  grid.innerHTML = "";
  for (const avatar of AVATARS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "avatar-option" + (avatar === selectedAvatar ? " selected" : "");
    btn.textContent = avatar;
    btn.addEventListener("click", () => {
      selectedAvatar = avatar;
      renderAvatarGrid();
    });
    grid.appendChild(btn);
  }
}

function renderTypeGroup() {
  const group = document.getElementById("type-group");
  group.innerHTML = "";
  for (const t of PATIENT_TYPES) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "opt" + (t.id === selectedType ? " selected" : "");
    btn.textContent = t.label;
    btn.addEventListener("click", () => {
      selectedType = t.id;
      renderTypeGroup();
    });
    group.appendChild(btn);
  }
}

function openGame(game) {
  const profile = getActiveProfile();
  if (!profile) {
    showScreen("profiles");
    return;
  }
  shell.openGame(game, profile);
}

function renderCatalog() {
  const profile = getActiveProfile();
  if (!profile) {
    showScreen("profiles");
    return;
  }

  const level = levelForPoints(profile.points);
  document.getElementById("active-avatar").textContent = profile.avatar;
  document.getElementById("active-name").textContent = profile.name;
  document.getElementById("active-level").textContent = `Nivel ${level}`;

  const nextThreshold = pointsForNextLevel(profile.points);
  const label = document.getElementById("points-label");
  const fill = document.getElementById("points-bar-fill");
  if (nextThreshold === null) {
    label.textContent = `${profile.points} pts · nivel máximo`;
    fill.style.width = "100%";
  } else {
    label.textContent = `${profile.points} / ${nextThreshold} pts`;
    fill.style.width = `${Math.min(100, (profile.points / nextThreshold) * 100)}%`;
  }

  const grid = document.getElementById("game-grid");
  grid.innerHTML = "";
  for (const game of GAMES) {
    const unlocked = isGameUnlocked(profile, game.id);
    const card = document.createElement(unlocked ? "button" : "div");
    card.className = "game-card" + (unlocked ? "" : " locked");
    card.style.setProperty("--game-color", game.color || "var(--primary)");
    card.innerHTML = `
      <span class="icon">${game.icon}</span>
      <span class="name">${game.name}</span>
      <span class="tagline">${game.tagline}</span>
      ${unlocked ? "" : `<span class="lock-badge">🔒 Nivel ${game.unlockLevel}</span>`}
    `;
    if (unlocked) {
      card.type = "button";
      card.addEventListener("click", () => openGame(game));
    }
    grid.appendChild(card);
  }

  const achGrid = document.getElementById("achievement-grid");
  achGrid.innerHTML = "";
  for (const id of allAchievementIds()) {
    const def = achievementInfo(id);
    const unlocked = profile.achievements.includes(id);
    const chip = document.createElement("div");
    chip.className = "achievement-chip" + (unlocked ? "" : " locked");
    chip.innerHTML = `<span>${def.icon}</span><span>${def.name}</span>`;
    achGrid.appendChild(chip);
  }
}

document.getElementById("btn-new-profile").addEventListener("click", () => {
  selectedAvatar = AVATARS[0];
  selectedType = "adulto";
  document.getElementById("input-name").value = "";
  document.getElementById("input-goal").value = "";
  renderAvatarGrid();
  renderTypeGroup();
  showScreen("create");
});

document.getElementById("btn-cancel-create").addEventListener("click", () => {
  showScreen("profiles");
});

document.getElementById("btn-save-profile").addEventListener("click", () => {
  const name = document.getElementById("input-name").value.trim();
  if (!name) {
    document.getElementById("input-name").focus();
    return;
  }
  const goal = document.getElementById("input-goal").value.trim();
  createProfile({ name, avatar: selectedAvatar, patientType: selectedType, goal: goal || null });
  renderCatalog();
  showScreen("catalog");
});

document.getElementById("btn-switch-profile").addEventListener("click", () => {
  setActiveProfile(null);
  renderProfileList();
  showScreen("profiles");
});

const shell = createGameShell({
  onExit: () => {
    renderCatalog();
    showScreen("catalog");
  },
});

renderProfileList();
const active = getActiveProfile();
if (active) {
  renderCatalog();
  showScreen("catalog");
} else {
  showScreen("profiles");
}
