// Every screen in the single-page app (profile picker, catalog, and the
// generic game start/play/results screens) lives in the same document, so
// there has to be exactly one function deciding which one is visible —
// otherwise the profile picker and a game's camera view could both end up
// "active" at once.
const SCREEN_IDS = {
  profiles: "screen-profiles",
  create: "screen-create",
  catalog: "screen-catalog",
  start: "screen-start",
  game: "screen-game",
  results: "screen-results",
};

export function showScreen(name) {
  for (const key of Object.keys(SCREEN_IDS)) {
    const el = document.getElementById(SCREEN_IDS[key]);
    if (el) el.classList.toggle("active", key === name);
  }
}
