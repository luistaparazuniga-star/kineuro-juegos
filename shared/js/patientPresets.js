// Turns the profile's patient type + free-text goal into something that
// actually changes the session: a recommended difficulty, a background
// music mood, and a short personalized tip shown before starting.

export const PATIENT_PRESETS = {
  nino: {
    label: "Niño/a",
    message: "Sesión pensada para que sea divertida y sin frustraciones.",
    difficulty: "easy",
    mood: "upbeat",
  },
  adulto: {
    label: "Adulto",
    message: "Sesión equilibrada para progresar a tu ritmo.",
    difficulty: "medium",
    mood: "calm",
  },
  adulto_mayor: {
    label: "Adulto mayor",
    message: "Objetivos más grandes y más tiempo para reaccionar, cuidando el equilibrio.",
    difficulty: "easy",
    mood: "calm",
  },
  deportista: {
    label: "Deportista",
    message: "Listo para exigir más: velocidad y precisión al máximo.",
    difficulty: "hard",
    mood: "upbeat",
  },
};

export function getPatientPreset(patientType) {
  return PATIENT_PRESETS[patientType] || PATIENT_PRESETS.adulto;
}

const GOAL_TIPS = [
  { match: /hombro/i, tip: "Recordá mantener el hombro relajado entre repeticiones." },
  { match: /rodilla/i, tip: "Movete con cuidado: priorizá la técnica antes que la velocidad." },
  { match: /cadera|espalda|lumbar/i, tip: "Mantené la espalda erguida durante todo el ejercicio." },
  { match: /equilibrio|tobillo/i, tip: "Si sentís inestabilidad, jugá cerca de una silla o pared." },
  { match: /cuello|cervical/i, tip: "Evitá giros bruscos de cabeza; priorizá movimientos suaves." },
  { match: /mano|muñeca|codo/i, tip: "Hacé pausas si sentís tensión en la muñeca o el codo." },
];

export function goalTip(goal) {
  if (!goal) return null;
  const hit = GOAL_TIPS.find((g) => g.match.test(goal));
  return hit ? hit.tip : null;
}

/** A short line to show on the start screen, personalized for the active profile. */
export function personalizedIntro(profile) {
  if (!profile) return null;
  const preset = getPatientPreset(profile.patientType);
  const tip = goalTip(profile.goal);
  if (profile.goal) {
    return `${preset.message} Enfocado en: "${profile.goal}".${tip ? ` ${tip}` : ""}`;
  }
  return preset.message;
}
