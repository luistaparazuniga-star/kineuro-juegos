const PROFILES_KEY = "kineurog.profiles.v1";
const ACTIVE_KEY = "kineurog.activeProfileId.v1";
const HISTORY_LIMIT = 30;

export const PATIENT_TYPES = [
  { id: "nino", label: "Niño/a" },
  { id: "adulto", label: "Adulto" },
  { id: "adulto_mayor", label: "Adulto mayor" },
  { id: "deportista", label: "Deportista" },
];

export const AVATARS = ["🦊", "🐼", "🐯", "🐧", "🦁", "🐨", "🐸", "🦄"];

export const GAMES = [
  {
    id: "atrapa-estrellas",
    name: "Atrapa las Estrellas",
    path: "atrapa-estrellas/",
    icon: "⭐",
    tagline: "Alcance de brazo y hombro",
    unlockLevel: 1,
  },
  {
    id: "estatua",
    name: "Estatua",
    path: "estatua/",
    icon: "🧍",
    tagline: "Equilibrio y control postural",
    unlockLevel: 2,
  },
];

const LEVEL_THRESHOLDS = [0, 100, 250, 500, 900, 1400, 2000];

const ACHIEVEMENTS = {
  first_session: { name: "Primer paso", icon: "🥇", check: (p) => totalSessions(p) >= 1 },
  ten_sessions: { name: "Constancia", icon: "🔥", check: (p) => totalSessions(p) >= 10 },
  high_accuracy: { name: "Precisión de oro", icon: "🎯", check: (p) => bestAccuracyEver(p) >= 80 },
  two_games: { name: "Explorador", icon: "🧭", check: (p) => Object.keys(p.stats).length >= 2 },
};

function totalSessions(profile) {
  return Object.values(profile.stats).reduce((sum, s) => sum + s.sessionsPlayed, 0);
}

function bestAccuracyEver(profile) {
  return Object.values(profile.stats).reduce((max, s) => Math.max(max, s.bestAccuracy || 0), 0);
}

function uid() {
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function load() {
  try {
    const raw = localStorage.getItem(PROFILES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function save(profiles) {
  try {
    localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
  } catch {
    /* localStorage unavailable (private mode, quota) — session continues without persistence */
  }
}

export function levelForPoints(points) {
  let level = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (points >= LEVEL_THRESHOLDS[i]) level = i + 1;
  }
  return level;
}

export function pointsForNextLevel(points) {
  const next = LEVEL_THRESHOLDS.find((t) => t > points);
  return next === undefined ? null : next;
}

export function listProfiles() {
  return load();
}

export function getProfile(id) {
  return load().find((p) => p.id === id) || null;
}

export function createProfile({ name, avatar, patientType, goal }) {
  const profiles = load();
  const profile = {
    id: uid(),
    name: name.trim(),
    avatar: avatar || AVATARS[0],
    patientType: patientType || "adulto",
    goal: goal || null,
    createdAt: new Date().toISOString(),
    points: 0,
    achievements: [],
    stats: {},
  };
  profiles.push(profile);
  save(profiles);
  setActiveProfile(profile.id);
  return profile;
}

export function deleteProfile(id) {
  const profiles = load().filter((p) => p.id !== id);
  save(profiles);
  if (getActiveProfileId() === id) setActiveProfile(null);
}

export function getActiveProfileId() {
  try {
    return localStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
}

export function setActiveProfile(id) {
  try {
    if (id) localStorage.setItem(ACTIVE_KEY, id);
    else localStorage.removeItem(ACTIVE_KEY);
  } catch {
    /* ignore */
  }
}

export function getActiveProfile() {
  const id = getActiveProfileId();
  return id ? getProfile(id) : null;
}

export function isGameUnlocked(profile, gameId) {
  const game = GAMES.find((g) => g.id === gameId);
  if (!game) return false;
  return levelForPoints(profile.points) >= game.unlockLevel;
}

/**
 * result: { score, accuracy (0-100), extra fields specific to the game (e.g. reach, stability) }
 * Returns { profile, pointsAwarded, newAchievements, leveledUp }
 */
export function recordSession(profileId, gameId, result) {
  const profiles = load();
  const profile = profiles.find((p) => p.id === profileId);
  if (!profile) return null;

  const prevLevel = levelForPoints(profile.points);

  if (!profile.stats[gameId]) {
    profile.stats[gameId] = {
      sessionsPlayed: 0,
      bestScore: 0,
      bestAccuracy: 0,
      lastPlayedAt: null,
      history: [],
    };
  }
  const stat = profile.stats[gameId];
  stat.sessionsPlayed += 1;
  stat.bestScore = Math.max(stat.bestScore, result.score || 0);
  stat.bestAccuracy = Math.max(stat.bestAccuracy, result.accuracy || 0);
  stat.lastPlayedAt = new Date().toISOString();
  stat.history.unshift({ date: stat.lastPlayedAt, ...result });
  stat.history = stat.history.slice(0, HISTORY_LIMIT);

  const pointsAwarded = Math.round((result.accuracy || 0) + (result.score || 0) * 0.2);
  profile.points += pointsAwarded;

  const newAchievements = [];
  for (const [id, def] of Object.entries(ACHIEVEMENTS)) {
    if (!profile.achievements.includes(id) && def.check(profile)) {
      profile.achievements.push(id);
      newAchievements.push({ id, ...def });
    }
  }

  save(profiles);

  return {
    profile,
    pointsAwarded,
    newAchievements,
    leveledUp: levelForPoints(profile.points) > prevLevel,
  };
}

export function achievementInfo(id) {
  return ACHIEVEMENTS[id] ? { id, ...ACHIEVEMENTS[id] } : null;
}

export function allAchievementIds() {
  return Object.keys(ACHIEVEMENTS);
}
