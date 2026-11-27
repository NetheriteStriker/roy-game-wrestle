/**
 * Core PRD constants, difficulty tiers, abilities, and achievement definitions
 * for Demolisher Challenge (Home Display: Demolisher Battles).
 */

export const PLAYER_BASE_HP = 2000;
export const ROUND_WIN_COINS = 100;
export const LEVEL_PASS_COINS = 700;
export const ROUNDS_PER_LEVEL = 10;
export const LEVELS_PER_PRIX = 4;
export const ROUND_CLEAR_ATTACK_BONUS = 50;

export const PUNCHING_TARGET_COINS = 50;
export const DEMOLISHER_RUN_WIN_COINS = 150;
export const AERIAL_BATTLE_WIN_COINS = 150;

export const DIFFICULTIES = [
  {
    id: 'easy',
    name: 'Easy',
    enemyHp: 1000,
    enemyDamage: 100,
    aiAggression: 0.65,
    color: '#22c55e',
    tagline: 'Warmup Circuit'
  },
  {
    id: 'moderate',
    name: 'Moderate',
    enemyHp: 2000,
    enemyDamage: 200,
    aiAggression: 0.80,
    color: '#38bdf8',
    tagline: 'Contender Bracket'
  },
  {
    id: 'hard',
    name: 'Hard',
    enemyHp: 3000,
    enemyDamage: 300,
    aiAggression: 0.95,
    color: '#facc15',
    tagline: 'Main Event'
  },
  {
    id: 'intense',
    name: 'Intense',
    enemyHp: 4000,
    enemyDamage: 400,
    aiAggression: 1.10,
    color: '#fb923c',
    tagline: 'Steel Cage Tier'
  },
  {
    id: 'extreme',
    name: 'Extreme',
    enemyHp: 5000,
    enemyDamage: 500,
    aiAggression: 1.25,
    color: '#f43f5e',
    tagline: 'Hardcore Division'
  },
  {
    id: 'impossible',
    name: 'Impossible',
    enemyHp: 6000,
    enemyDamage: 600,
    aiAggression: 1.45,
    color: '#c084fc',
    tagline: 'Mythic Championship'
  }
];

export const DIFFICULTY_MAP = Object.fromEntries(DIFFICULTIES.map((d) => [d.id, d]));

export const ABILITIES = [
  {
    id: 'gauntlet',
    name: 'Gauntlet',
    unlockLevel: 1,
    keyLabel: 'PASSIVE',
    description: 'Armored power gauntlets boost standard punch damage (+100 Left / +125 Right / +45 Bullet).'
  },
  {
    id: 'brickThrow',
    name: 'Brick Throw',
    unlockLevel: 2,
    keyLabel: 'U',
    description: 'Hurls a heavy spinning brick projectile across the ring.'
  },
  {
    id: 'flight',
    name: 'Flight',
    unlockLevel: 3,
    keyLabel: 'F',
    description: 'Toggles aerial flight; steer mid-air with Arrow Keys to evade low strikes.'
  },
  {
    id: 'bulletPunch',
    name: 'Bullet Punch',
    unlockLevel: 4,
    keyLabel: 'R + LMB',
    description: 'Activates rapid-fire punch flurry mode with rapid Left Mouse Clicks.'
  }
];

export const ACHIEVEMENTS = [
  {
    id: 'punches_100',
    title: 'Heavy Hands',
    description: 'Land 100 Punches',
    target: 100,
    statKey: 'punchesLanded',
    icon: '🥊',
    category: 'Combat'
  },
  {
    id: 'punches_500',
    title: 'Fist Fury',
    description: 'Land 500 Punches',
    target: 500,
    statKey: 'punchesLanded',
    icon: '💥',
    category: 'Combat'
  },
  {
    id: 'punches_1000',
    title: 'Demolisher Knuckles',
    description: 'Land 1,000 Punches',
    target: 1000,
    statKey: 'punchesLanded',
    icon: '⚡',
    category: 'Combat'
  },
  {
    id: 'kicks_100',
    title: 'Boot Camp',
    description: 'Land 100 Kicks',
    target: 100,
    statKey: 'kicksLanded',
    icon: '🥾',
    category: 'Combat'
  },
  {
    id: 'kicks_500',
    title: 'Thunder Boots',
    description: 'Land 500 Kicks',
    target: 500,
    statKey: 'kicksLanded',
    icon: '🌪️',
    category: 'Combat'
  },
  {
    id: 'kicks_1000',
    title: 'Apex Striker',
    description: 'Land 1,000 Kicks',
    target: 1000,
    statKey: 'kicksLanded',
    icon: '🔥',
    category: 'Combat'
  },
  {
    id: 'grabs_10',
    title: 'Ring Tactician',
    description: 'Successfully Grab 10 Opponents',
    target: 10,
    statKey: 'grabsLanded',
    icon: '🤼',
    category: 'Combat'
  },
  {
    id: 'spin_10s',
    title: 'Cyclone Stunt',
    description: 'Spin (T) Continuously for 10 Full Seconds During a Battle',
    target: 1,
    statKey: null,
    icon: '🌀',
    category: 'Skill & Stunt'
  },
  {
    id: 'level_no_kick',
    title: 'Hands Only',
    description: 'Complete an Entire Level Without Using a Kick Attack',
    target: 1,
    statKey: null,
    icon: '✋',
    category: 'Skill & Stunt'
  },
  {
    id: 'level_flawless',
    title: 'Untouchable Reign',
    description: 'Complete an Entire Level Without Losing a Single Round',
    target: 1,
    statKey: null,
    icon: '🛡️',
    category: 'Skill & Stunt'
  },
  {
    id: 'grand_prix_4',
    title: 'Dynasty Champion',
    description: 'Complete 4 Distinct Grand Prix Tournaments',
    target: 4,
    statKey: 'grandPrixCompleted',
    icon: '🏆',
    category: 'Progression'
  }
];

export const CONTROLS_REFERENCE = [
  { key: 'Arrow Keys', action: 'Move / Aerial Steering' },
  { key: 'J / Space', action: 'Jump (evades ground attacks)' },
  { key: 'D', action: 'Duck (evades high attacks)' },
  { key: 'S', action: 'Sidestep (lateral evasion)' },
  { key: 'T', action: 'Spin (Turn in place)' },
  { key: 'Left Click', action: 'Left Punch' },
  { key: 'Right Click', action: 'Right Punch' },
  { key: 'K', action: 'Kick' },
  { key: 'G', action: 'Grab opponent' },
  { key: 'P', action: 'Throw grabbed opponent' },
  { key: 'U', action: 'Brick Throw (Unlock Lvl 2)' },
  { key: 'F', action: 'Toggle Flight (Unlock Lvl 3)' },
  { key: 'R + Left Click', action: 'Bullet Punch Flurry (Unlock Lvl 4)' }
];
