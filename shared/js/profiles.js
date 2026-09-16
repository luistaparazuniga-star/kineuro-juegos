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

// Every game runs inside the same single-page shell (see shared/js/app.js and
// shared/js/gameShell.js). This metadata is what lets one generic start/HUD/
// results screen serve all of them without duplicating markup per game:
//   - modulePath/className: where to dynamically import the Game class from.
//   - extraFields: start-screen options beyond the shared difficulty/duration/
//     skeleton controls (only Atrapa las Estrellas needs one, for arm choice).
//   - hudFields: live `game.<key>` properties to show during play, in
//     addition to score (always first) and time (always last).
//   - resultFields: `getResults()` keys to show on the results screen, in
//     addition to score (always first). `wide` spans the full grid row.
//   - hasPhaseUI: Estatua drives an extra "¡Quieto!/¡Moveté!" banner and a
//     pulsing camera border; every other game ignores that hook.
export const GAMES = [
  {
    id: "atrapa-estrellas",
    name: "Atrapa las Estrellas",
    path: "atrapa-estrellas/",
    modulePath: "atrapa-estrellas/js/game.js",
    className: "Game",
    icon: "⭐",
    color: "#ffcb47",
    tagline: "Alcance de brazo y hombro",
    unlockLevel: 1,
    hint: "Mové tu mano para alcanzar las estrellas que aparecen en pantalla. Usá el celular o tablet como espejo: la cámara sigue tus movimientos.",
    footerNote: "Recomendado: apoyá el dispositivo a 1.5–2 m de distancia, a la altura del pecho, en un lugar bien iluminado.",
    extraFields: [
      {
        id: "arm",
        label: "¿Qué brazo vas a ejercitar?",
        default: "both",
        options: [
          { value: "left", label: "Izquierdo" },
          { value: "both", label: "Ambos" },
          { value: "right", label: "Derecho" },
        ],
      },
    ],
    hudFields: [{ key: "hits", label: "Aciertos" }],
    resultFields: [
      { key: "accuracy", label: "Precisión", suffix: "%" },
      { key: "hits", label: "Aciertos" },
      { key: "misses", label: "Fallos" },
      { key: "bestCombo", label: "Mejor combo" },
      { key: "reach", label: "Amplitud de movimiento alcanzada (respecto a tu cuerpo)", suffix: "%", wide: true },
    ],
  },
  {
    id: "topos-traviesos",
    name: "Topos Traviesos",
    path: "topos-traviesos/",
    modulePath: "topos-traviesos/js/game.js",
    className: "Game",
    icon: "🐹",
    color: "#d99a6c",
    tagline: "Reflejos y control de impulsos",
    unlockLevel: 1,
    hint: "Golpeá los topos 🐹 apenas aparezcan. ¡Cuidado! A veces aparece una bomba 💣: si la tocás, perdés puntos.",
    footerNote: "Recomendado: apoyá el dispositivo a 1.5–2 m de distancia, en un lugar bien iluminado.",
    hudFields: [{ key: "hits", label: "Topos" }],
    resultFields: [
      { key: "accuracy", label: "Precisión", suffix: "%" },
      { key: "hits", label: "Topos atrapados" },
      { key: "bombsHit", label: "Bombas tocadas" },
      { key: "bestCombo", label: "Mejor combo", wide: true },
    ],
  },
  {
    id: "secuencia-veloz",
    name: "Secuencia Veloz",
    path: "secuencia-veloz/",
    modulePath: "secuencia-veloz/js/game.js",
    className: "Game",
    icon: "🔢",
    color: "#5bc8ff",
    tagline: "Atención y coordinación en orden",
    unlockLevel: 2,
    hint: "Van a aparecer números en pantalla. Tocalos en orden (1, 2, 3…) con cualquier mano, lo más rápido posible.",
    footerNote: "Recomendado: apoyá el dispositivo a 1.5–2 m de distancia, en un lugar bien iluminado.",
    hudFields: [{ key: "sequences", label: "Secuencias" }],
    resultFields: [
      { key: "accuracy", label: "Precisión", suffix: "%" },
      { key: "sequences", label: "Secuencias completas" },
      { key: "mistakes", label: "Errores", wide: true },
    ],
  },
  {
    id: "estatua",
    name: "Estatua",
    path: "estatua/",
    modulePath: "estatua/js/game.js",
    className: "StatueGame",
    hasPhaseUI: true,
    icon: "🧍",
    color: "#3fd0c9",
    tagline: "Equilibrio y control postural",
    unlockLevel: 2,
    hint: 'Este juego mide tu control postural: cuando aparezca "¡Quieto!" tenés que congelarte por completo. Cuanto más firme te quedes, mejor puntaje.',
    footerNote: "Recomendado: apoyá el dispositivo a 1.5–2 m de distancia, para que se vea todo tu cuerpo de pie.",
    hudFields: [{ key: "streak", label: "Racha" }],
    resultFields: [
      { key: "accuracy", label: "Precisión", suffix: "%" },
      { key: "maxStreak", label: "Racha máxima" },
      { key: "stability", label: "Estabilidad promedio", suffix: "%", wide: true },
    ],
  },
  {
    id: "derriba-conos",
    name: "Derriba Conos",
    path: "derriba-conos/",
    modulePath: "derriba-conos/js/game.js",
    className: "Game",
    icon: "🚧",
    color: "#ff7849",
    tagline: "Desplazamientos laterales rápidos",
    unlockLevel: 2,
    hint: "Van a aparecer conos a un costado. Movete rápido hacia ese lado para derribarlos antes de que se acabe el tiempo.",
    footerNote: "Recomendado: dejá espacio libre a ambos costados y apoyá el dispositivo a 2 m de distancia.",
    hudFields: [{ key: "knockdowns", label: "Conos" }],
    resultFields: [
      { key: "accuracy", label: "Precisión", suffix: "%" },
      { key: "knockdowns", label: "Conos derribados" },
      { key: "misses", label: "Fallos" },
      { key: "bestCombo", label: "Mejor combo", wide: true },
    ],
  },
  {
    id: "ritmo-activo",
    name: "Ritmo Activo",
    path: "ritmo-activo/",
    modulePath: "ritmo-activo/js/game.js",
    className: "Game",
    icon: "🕺",
    color: "#ff6fb5",
    tagline: "Resistencia y movimiento continuo",
    unlockLevel: 3,
    hint: "Movete de un lado al otro sin parar, cruzando las líneas marcadas. Cada cruce suma una repetición: mantené el ritmo todo el tiempo posible.",
    footerNote: "Recomendado: dejá espacio libre a ambos costados y apoyá el dispositivo a 2 m de distancia.",
    hudFields: [{ key: "reps", label: "Reps" }],
    resultFields: [
      { key: "reps", label: "Repeticiones" },
      { key: "pace", label: "Ritmo (reps/min)" },
      { key: "bestCombo", label: "Mejor racha", wide: true },
    ],
  },
  {
    id: "esquiva-rayos",
    name: "Esquiva Rayos",
    path: "esquiva-rayos/",
    modulePath: "esquiva-rayos/js/game.js",
    className: "Game",
    icon: "⚡",
    color: "#ffe066",
    tagline: "Agilidad y reacción de todo el cuerpo",
    unlockLevel: 3,
    hint: "Van a aparecer rayos horizontales con un hueco. Movete de costado para ubicarte dentro del hueco antes de que el rayo se dispare.",
    footerNote: "Recomendado: dejá espacio libre a los costados y apoyá el dispositivo a 2 m de distancia.",
    hudFields: [{ key: "dodges", label: "Esquivos" }],
    resultFields: [
      { key: "accuracy", label: "Precisión", suffix: "%" },
      { key: "dodges", label: "Rayos esquivados" },
      { key: "hits", label: "Rayos recibidos" },
      { key: "bestCombo", label: "Mejor combo", wide: true },
    ],
  },
  {
    id: "rebote-total",
    name: "Rebote Total",
    path: "rebote-total/",
    modulePath: "rebote-total/js/game.js",
    className: "Game",
    icon: "🏓",
    color: "#4ade80",
    tagline: "Reacción visomotora estilo arcade",
    unlockLevel: 3,
    hint: "Movete de lado a lado para controlar la barra y no dejar caer la pelota. Cada rebote suma puntos y la velocidad va subiendo.",
    footerNote: "Recomendado: dejá espacio libre a ambos costados y apoyá el dispositivo a 2 m de distancia.",
    hudFields: [{ key: "bounces", label: "Rebotes" }],
    resultFields: [
      { key: "accuracy", label: "Precisión", suffix: "%" },
      { key: "bounces", label: "Rebotes" },
      { key: "misses", label: "Pelotas perdidas" },
      { key: "bestCombo", label: "Mejor combo", wide: true },
    ],
  },
  {
    id: "salto-del-canguro",
    name: "Salto del Canguro",
    path: "salto-del-canguro/",
    modulePath: "salto-del-canguro/js/game.js",
    className: "Game",
    icon: "🦘",
    color: "#ffa94d",
    tagline: "Salto y coordinación de piernas",
    unlockLevel: 4,
    hint: 'Cuando aparezca "¡SALTÁ!" tenés que saltar antes de que se acabe el tiempo. Necesitás que se vea tu cuerpo completo, de pie.',
    footerNote: "Recomendado: apoyá el dispositivo a 2–3 m de distancia, para que se vea todo tu cuerpo de pie.",
    hudFields: [{ key: "jumps", label: "Saltos" }],
    resultFields: [
      { key: "accuracy", label: "Precisión", suffix: "%" },
      { key: "jumps", label: "Saltos logrados" },
      { key: "misses", label: "Saltos perdidos" },
      { key: "bestCombo", label: "Mejor combo", wide: true },
    ],
  },
  {
    id: "patada-certera",
    name: "Patada Certera",
    path: "patada-certera/",
    modulePath: "patada-certera/js/game.js",
    className: "Game",
    icon: "🥅",
    color: "#f87171",
    tagline: "Coordinación de piernas y brazos",
    unlockLevel: 4,
    hint: "Los objetivos ✋ arriba se tocan con la mano. Los objetivos 🦵 abajo se activan levantando la rodilla. Necesitás que se vea tu cuerpo completo.",
    footerNote: "Recomendado: apoyá el dispositivo a 2–3 m de distancia, para que se vea todo tu cuerpo de pie.",
    hudFields: [{ key: "hits", label: "Aciertos" }],
    resultFields: [
      { key: "accuracy", label: "Precisión", suffix: "%" },
      { key: "hits", label: "Aciertos" },
      { key: "misses", label: "Fallos" },
      { key: "bestCombo", label: "Mejor combo", wide: true },
    ],
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
