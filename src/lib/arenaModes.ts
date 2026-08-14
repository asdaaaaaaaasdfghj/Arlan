import type { GameMode, WeaponId } from './arenaTypes';

export type ModeConfig = {
  id: GameMode;
  name: string;
  description: string;
  roundSeconds: number;
  scoreToWin: number;
  playerHp: number;
  defaultWeapon: WeaponId;
  zombieSpawnSeconds?: number;
  zombieHp?: number;
  zombieSpeed?: number;
  zombieDamage?: number;
  barricadeDamage?: number;
  noTimer?: boolean;
  disasterSpawnSeconds?: number;
  grenadeCooldown: number;
  grenadeDamage: number;
};

export const modeConfigs: Record<GameMode, ModeConfig> = {
  duel: createDuel('duel', 'Duel', 'Classic two-player fight to 5 points.', 60, 5),
  quickDraw: createDuel('quickDraw', 'Quick Draw', 'Fast round. Every hit is lethal, first to 3.', 35, 3),
  blitz: createDuel('blitz', 'Blitz', 'Twenty-five seconds, first to 3. No warmup.', 25, 3),
  tankDuel: createDuel('tankDuel', 'Tank Duel', 'Big health bars and longer trades.', 80, 4, 180),
  railDuel: createDuel('railDuel', 'Rail Duel', 'Railguns only. Slow shots, scary damage.', 55, 4, 100, 'railgun'),
  flameDuel: createDuel('flameDuel', 'Flamethrower Fight', 'Only flamethrowers. Get close and melt the arena.', 55, 5, 115, 'flamethrower'),
  swordDuel: createDuel('swordDuel', 'Sword Fights', 'No guns or grenades. Close in and slash with swords.', 70, 5),
  grenadeMayhem: {
    ...createDuel('grenadeMayhem', 'Grenade Mayhem', 'Fast grenades, loud explosions, first to 5.', 60, 5),
    grenadeCooldown: 1.4,
    grenadeDamage: 72,
  },
  endlessDuel: {
    ...createDuel('endlessDuel', 'Endless Duel', 'No timer. Fight until someone reaches 7 points.', 999, 7),
    noTimer: true,
  },
  kingHill: createDuel('kingHill', 'King of the Hill', 'Hold the center zone alone to score. First to 20.', 90, 20),
  captureFlag: createDuel('captureFlag', 'Capture the Flag', 'Steal the enemy flag and bring it home. First to 3 captures.', 90, 3),
  glassWars: {
    ...createDuel('glassWars', 'Glass Wars', 'Break the enemy glass core, then eliminate them for good.', 120, 1),
    noTimer: true,
  },
  luckyBlocks: createDuel('luckyBlocks', 'Lucky Blocks', 'Break lucky blocks for wild buffs and curses. First to 5.', 75, 5),
  zombies: createZombies('zombies', 'Zombie Rush', 'Build barricades and hold for 60 seconds.', 60, 1.3),
  swarmNight: createZombies('swarmNight', 'Swarm Night', 'Lots of weak zombies rush the arena.', 50, 0.65, 30, 15),
  nightmare: createZombies('nightmare', 'Nightmare', 'Tough zombies hit harder and survive longer.', 75, 1, 70, 17, 26),
  fortress: createZombies('fortress', 'Fortress', 'More time to build, but the siege lasts longer.', 90, 1.15, 48, 12, 16, 14),
  disasters: {
    ...createDuel('disasters', 'Disaster Survival', 'Survive fires, storms, quakes, and floods for 70 seconds.', 70, 0),
    disasterSpawnSeconds: 2.2,
  },
};

export const modeOrder: GameMode[] = [
  'duel',
  'quickDraw',
  'blitz',
  'tankDuel',
  'railDuel',
  'flameDuel',
  'swordDuel',
  'grenadeMayhem',
  'endlessDuel',
  'kingHill',
  'captureFlag',
  'glassWars',
  'luckyBlocks',
  'zombies',
  'swarmNight',
  'nightmare',
  'fortress',
  'disasters',
];

export function isZombieMode(mode: GameMode): boolean {
  return modeConfigs[mode].zombieSpawnSeconds !== undefined;
}

export function isDisasterMode(mode: GameMode): boolean {
  return modeConfigs[mode].disasterSpawnSeconds !== undefined;
}

export function isCoopSurvivalMode(mode: GameMode): boolean {
  return isZombieMode(mode) || isDisasterMode(mode);
}

export function isGlassWarsMode(mode: GameMode): boolean {
  return mode === 'glassWars';
}

export function isSwordMode(mode: GameMode): boolean {
  return mode === 'swordDuel';
}

export function isFlameMode(mode: GameMode): boolean {
  return mode === 'flameDuel';
}

function createDuel(
  id: GameMode,
  name: string,
  description: string,
  roundSeconds: number,
  scoreToWin: number,
  playerHp = 100,
  defaultWeapon: WeaponId = 'blaster',
): ModeConfig {
  return {
    id,
    name,
    description,
    roundSeconds,
    scoreToWin,
    playerHp,
    defaultWeapon,
    grenadeCooldown: 3.2,
    grenadeDamage: 55,
  };
}

function createZombies(
  id: GameMode,
  name: string,
  description: string,
  roundSeconds: number,
  zombieSpawnSeconds: number,
  zombieHp = 42,
  zombieSpeed = 13,
  zombieDamage = 18,
  barricadeDamage = 24,
): ModeConfig {
  return {
    id,
    name,
    description,
    roundSeconds,
    scoreToWin: 0,
    playerHp: 100,
    defaultWeapon: 'blaster',
    zombieSpawnSeconds,
    zombieHp,
    zombieSpeed,
    zombieDamage,
    barricadeDamage,
    grenadeCooldown: 3.2,
    grenadeDamage: 55,
  };
}
