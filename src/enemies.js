/**
 * Enemy roster with varied visual designs and unique combat abilities
 * across all 4 Levels × 10 Rounds.
 */

export const ENEMY_ROSTER = [
  {
    id: 'masked_viper',
    name: 'El Cobra',
    title: 'Venom Luchador',
    skinColor: '#d99b66',
    outfitPrimary: '#16a34a',
    outfitSecondary: '#facc15',
    maskType: 'luchador',
    scale: 0.96,
    cape: false,
    signatureMove: 'highStrike',
    speedFactor: 1.08
  },
  {
    id: 'neon_brawler',
    name: 'Volt Hammer',
    title: 'Neon Bruiser',
    skinColor: '#f1c27d',
    outfitPrimary: '#0284c7',
    outfitSecondary: '#38bdf8',
    maskType: 'visor',
    scale: 1.0,
    cape: false,
    signatureMove: 'chargeRush',
    speedFactor: 1.02
  },
  {
    id: 'spike_jaw',
    name: 'Razor Fang',
    title: 'Alley Punk',
    skinColor: '#e0ac69',
    outfitPrimary: '#be123c',
    outfitSecondary: '#fda4af',
    maskType: 'mohawk',
    scale: 0.98,
    cape: false,
    signatureMove: 'lowSweep',
    speedFactor: 1.1
  },
  {
    id: 'cinder_monk',
    name: 'Ash Tempest',
    title: 'Ring Mystic',
    skinColor: '#c68642',
    outfitPrimary: '#ea580c',
    outfitSecondary: '#fef08a',
    maskType: 'bandana',
    scale: 0.97,
    cape: false,
    signatureMove: 'projectile',
    speedFactor: 1.04
  },
  {
    id: 'granite_bull',
    name: 'Crusher Bull',
    title: 'Iron Horns',
    skinColor: '#8d5524',
    outfitPrimary: '#7c2d12',
    outfitSecondary: '#fbbf24',
    maskType: 'horns',
    scale: 1.1,
    cape: false,
    signatureMove: 'chargeRush',
    speedFactor: 0.92
  },
  {
    id: 'cyber_knight',
    name: 'Chrome Rex',
    title: 'Mecha Enforcer',
    skinColor: '#cbd5e1',
    outfitPrimary: '#475569',
    outfitSecondary: '#22d3ee',
    maskType: 'helmet',
    scale: 1.05,
    cape: false,
    signatureMove: 'projectile',
    speedFactor: 0.98
  },
  {
    id: 'tornado_kid',
    name: 'Whirlwind Kid',
    title: 'Spin Daredevil',
    skinColor: '#ffdbac',
    outfitPrimary: '#9333ea',
    outfitSecondary: '#f472b6',
    maskType: 'spiky',
    scale: 0.94,
    cape: false,
    signatureMove: 'spinLariat',
    speedFactor: 1.14
  },
  {
    id: 'jade_jaguar',
    name: 'Jade Panther',
    title: 'Jungle Striker',
    skinColor: '#a56938',
    outfitPrimary: '#0f766e',
    outfitSecondary: '#a3e635',
    maskType: 'luchador',
    scale: 1.0,
    cape: false,
    signatureMove: 'jumpSlam',
    speedFactor: 1.08
  },
  {
    id: 'frost_warden',
    name: 'Glacier Vex',
    title: 'Subzero Giant',
    skinColor: '#93c5fd',
    outfitPrimary: '#1d4ed8',
    outfitSecondary: '#e0f2fe',
    maskType: 'visor',
    scale: 1.08,
    cape: true,
    signatureMove: 'highStrike',
    speedFactor: 0.96
  },
  {
    id: 'crimson_hawk',
    name: 'Talon Strike',
    title: 'Aerial Ace',
    skinColor: '#e0ac69',
    outfitPrimary: '#dc2626',
    outfitSecondary: '#fde047',
    maskType: 'helmet',
    scale: 0.99,
    cape: true,
    signatureMove: 'jumpSlam',
    speedFactor: 1.12
  },
  {
    id: 'obsidian_ogre',
    name: 'Dread Gorgon',
    title: 'Pit Colossus',
    skinColor: '#6b7280',
    outfitPrimary: '#312e81',
    outfitSecondary: '#f43f5e',
    maskType: 'horns',
    scale: 1.12,
    cape: false,
    signatureMove: 'spinLariat',
    speedFactor: 0.91
  },
  {
    id: 'gold_emperor',
    name: 'Aurum Rex',
    title: 'Gilded Heel',
    skinColor: '#f1c27d',
    outfitPrimary: '#b45309',
    outfitSecondary: '#fef08a',
    maskType: 'crown',
    scale: 1.05,
    cape: true,
    signatureMove: 'projectile',
    speedFactor: 1.03
  }
];

export const LEVEL_BOSSES = {
  1: {
    id: 'boss_pyro_titan',
    name: 'Pyro Titan',
    title: 'Level 1 Champion',
    skinColor: '#c68642',
    outfitPrimary: '#b91c1c',
    outfitSecondary: '#fb923c',
    maskType: 'horns',
    scale: 1.12,
    cape: true,
    signatureMove: 'highStrike',
    speedFactor: 1.02,
    isBoss: true
  },
  2: {
    id: 'boss_steel_colossus',
    name: 'Steel Colossus',
    title: 'Level 2 Champion',
    skinColor: '#94a3b8',
    outfitPrimary: '#334155',
    outfitSecondary: '#38bdf8',
    maskType: 'helmet',
    scale: 1.15,
    cape: false,
    signatureMove: 'chargeRush',
    speedFactor: 0.98,
    isBoss: true
  },
  3: {
    id: 'boss_sky_valkyrie',
    name: 'Sky Valkyrie',
    title: 'Level 3 Champion',
    skinColor: '#ffdbac',
    outfitPrimary: '#6d28d9',
    outfitSecondary: '#facc15',
    maskType: 'visor',
    scale: 1.05,
    cape: true,
    signatureMove: 'jumpSlam',
    speedFactor: 1.15,
    isBoss: true
  },
  4: {
    id: 'boss_overlord_krag',
    name: 'Overlord Krag',
    title: 'Grand Prix Final Boss',
    skinColor: '#7e22ce',
    outfitPrimary: '#111827',
    outfitSecondary: '#facc15',
    maskType: 'crown',
    scale: 1.18,
    cape: true,
    signatureMove: 'spinLariat',
    speedFactor: 1.08,
    isBoss: true
  }
};

export const DEMOLISHER_TEMPLATE = {
  id: 'demolisher',
  name: 'Demolisher',
  title: 'Returning Legend',
  skinColor: '#f0b884',
  outfitPrimary: '#e11d48',
  outfitSecondary: '#ffd43b',
  maskType: 'spiky',
  scale: 1.03,
  cape: false,
  isPlayer: true
};

/**
 * Returns the enemy configuration for a given level (1..4), round (1..10), and difficulty.
 * Uses exact PRD difficulty base HP and damage per hit.
 */
export function getEnemyForRound(level, round, difficulty) {
  let template;
  if (round === 10 && LEVEL_BOSSES[level]) {
    template = LEVEL_BOSSES[level];
  } else {
    const idx = ((level - 1) * 10 + (round - 1)) % ENEMY_ROSTER.length;
    template = ENEMY_ROSTER[idx];
  }
  return {
    ...template,
    maxHp: difficulty.enemyHp,
    damage: difficulty.enemyDamage,
    aggression: difficulty.aiAggression + (round - 1) * 0.02 + (level - 1) * 0.05
  };
}

export function getRandomEnemy(hp = 1500, damage = 150) {
  const pool = [...ENEMY_ROSTER, ...Object.values(LEVEL_BOSSES)];
  const template = pool[Math.floor(Math.random() * pool.length)];
  return {
    ...template,
    maxHp: hp,
    damage,
    aggression: 1.0
  };
}
