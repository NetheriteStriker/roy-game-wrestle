import { ACHIEVEMENTS } from './constants.js';

const SAVE_KEY = 'demolisher_challenge_save_v1';

function defaultSave() {
  return {
    totalCoins: 0,
    stats: {
      punchesLanded: 0,
      kicksLanded: 0,
      grabsLanded: 0,
      grandPrixCompleted: 0,
      maxSpinSeconds: 0,
      completedPrixHistory: []
    },
    unlockedAchievements: {},
    permanentUnlocks: {
      bulletPunch: false
    },
    activePrix: null,
    settings: {
      muted: false
    }
  };
}

let state = loadSave();

export function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return defaultSave();
    const parsed = JSON.parse(raw);
    const base = defaultSave();
    return {
      ...base,
      ...parsed,
      stats: { ...base.stats, ...(parsed.stats || {}) },
      unlockedAchievements: { ...(parsed.unlockedAchievements || {}) },
      permanentUnlocks: { ...base.permanentUnlocks, ...(parsed.permanentUnlocks || {}) },
      settings: { ...base.settings, ...(parsed.settings || {}) }
    };
  } catch {
    return defaultSave();
  }
}

export function getSave() {
  return state;
}

export function persistSave() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {
    // Ignore quota or storage restriction errors cleanly.
  }
}

export function awardCoins(amount) {
  if (!amount || amount <= 0) return state.totalCoins;
  state.totalCoins += Math.floor(amount);
  persistSave();
  return state.totalCoins;
}

export function checkStatAchievements() {
  const newlyUnlocked = [];
  for (const ach of ACHIEVEMENTS) {
    if (!ach.statKey) continue;
    if (state.unlockedAchievements[ach.id]) continue;
    const val = state.stats[ach.statKey] || 0;
    if (val >= ach.target) {
      state.unlockedAchievements[ach.id] = Date.now();
      newlyUnlocked.push(ach);
    }
  }
  if (newlyUnlocked.length > 0) {
    persistSave();
  }
  return newlyUnlocked;
}

export function recordStat(key, delta = 1) {
  state.stats[key] = (state.stats[key] || 0) + delta;
  const unlocked = checkStatAchievements();
  persistSave();
  return unlocked;
}

export function updateMaxSpinSeconds(seconds) {
  if (seconds > (state.stats.maxSpinSeconds || 0)) {
    state.stats.maxSpinSeconds = seconds;
    persistSave();
  }
}

export function unlockAchievement(id) {
  if (state.unlockedAchievements[id]) return null;
  const ach = ACHIEVEMENTS.find((a) => a.id === id);
  if (!ach) return null;
  state.unlockedAchievements[id] = Date.now();
  persistSave();
  return ach;
}

export function saveActivePrix(prix) {
  state.activePrix = prix ? JSON.parse(JSON.stringify(prix)) : null;
  persistSave();
}

export function clearActivePrix() {
  state.activePrix = null;
  persistSave();
}

export function hasActivePrix() {
  return Boolean(state.activePrix);
}

export function unlockPermanentBulletPunch() {
  if (!state.permanentUnlocks.bulletPunch) {
    state.permanentUnlocks.bulletPunch = true;
    persistSave();
  }
}

export function recordCompletedGrandPrix(difficultyId) {
  state.stats.grandPrixCompleted = (state.stats.grandPrixCompleted || 0) + 1;
  state.stats.completedPrixHistory = state.stats.completedPrixHistory || [];
  state.stats.completedPrixHistory.push({
    difficultyId,
    completedAt: Date.now()
  });
  const unlocked = checkStatAchievements();
  persistSave();
  return unlocked;
}

export function setMuted(muted) {
  state.settings.muted = Boolean(muted);
  persistSave();
}

export function isMuted() {
  return Boolean(state.settings.muted);
}

export function getAchievementProgress(ach) {
  const unlockedAt = state.unlockedAchievements[ach.id];
  if (ach.statKey) {
    const val = Math.min(ach.target, state.stats[ach.statKey] || 0);
    return {
      unlocked: Boolean(unlockedAt),
      current: unlockedAt ? ach.target : val,
      target: ach.target
    };
  }
  return {
    unlocked: Boolean(unlockedAt),
    current: unlockedAt ? 1 : 0,
    target: 1
  };
}
