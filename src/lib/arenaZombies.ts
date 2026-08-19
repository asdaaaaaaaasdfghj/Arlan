import {
  type Barricade,
  type GameMode,
  type MapId,
  type Player,
  type PlayerId,
  type Zombie,
  type ZombieKind,
} from './arenaTypes';
import { isBlockedZombiePosition } from './arenaMap';
import { getArenaBounds } from './arenaBounds';
import type { Blocker } from './arenaMap';
import { isCoopSurvivalMode, modeConfigs } from './arenaModes';
import { respawnPlayer } from './arenaPlayers';
import { isHiddenInGrass, loadCustomZombieSpawns } from './customMap';

const ZOMBIE_ATTACK_SIZE = 5.2;

export function tickZombies(
  zombies: Zombie[],
  players: Record<PlayerId, Player>,
  barricades: Barricade[],
  blockers: Blocker[],
  mode: GameMode,
  mapId: MapId,
  delta: number,
): { players: Record<PlayerId, Player>; zombies: Zombie[]; barricades: Barricade[] } {
  const moved = zombies.map((zombie) => moveZombie(zombie, players, blockers, mode, mapId, delta));
  return applyZombieAttacks(players, moved, barricades, mode, mapId, delta);
}

export function spawnZombie(nextId: number, mode: GameMode, mapId: MapId): Zombie {
  const kind = rollZombieKind(mode, nextId);
  const hp = getZombieHp(kind, mode);
  const custom = mapId === 'custom' ? pickCustomZombieSpawn() : null;
  if (custom) {
    return { id: nextId, x: custom.x, y: custom.y, hp, kind };
  }

  const bounds = getArenaBounds(mapId);
  const vertical = Math.random() > 0.5;
  const x = vertical ? (Math.random() > 0.5 ? 4 : bounds.width - 4) : randomInArena(4, bounds.width - 4);
  const y = vertical ? randomInArena(4, bounds.height - 4) : Math.random() > 0.5 ? 4 : bounds.height - 4;

  return { id: nextId, x, y, hp, kind };
}

function pickCustomZombieSpawn(): { x: number; y: number } | null {
  const spawns = loadCustomZombieSpawns();
  const spawn = spawns[Math.floor(Math.random() * spawns.length)];
  return spawn ? { x: spawn.x + spawn.width / 2, y: spawn.y + spawn.height / 2 } : null;
}

function moveZombie(
  zombie: Zombie,
  players: Record<PlayerId, Player>,
  barricades: Blocker[],
  mode: GameMode,
  mapId: MapId,
  delta: number,
): Zombie {
  const target = getNearestPlayer(zombie, players, mapId);
  if (!target) {
    return zombie;
  }

  const x = target.x - zombie.x;
  const y = target.y - zombie.y;
  const length = Math.hypot(x, y) || 1;
  const speed = getZombieSpeed(zombie, mode);
  const wantedX = zombie.x + (x / length) * speed * delta;
  const wantedY = zombie.y + (y / length) * speed * delta;
  const nextX = isBlockedZombiePosition(wantedX, zombie.y, mapId, barricades) ? zombie.x : wantedX;
  const nextY = isBlockedZombiePosition(nextX, wantedY, mapId, barricades) ? zombie.y : wantedY;

  return {
    ...zombie,
    x: nextX,
    y: nextY,
  };
}

function applyZombieAttacks(
  players: Record<PlayerId, Player>,
  zombies: Zombie[],
  barricades: Barricade[],
  mode: GameMode,
  mapId: MapId,
  delta: number,
): { players: Record<PlayerId, Player>; zombies: Zombie[]; barricades: Barricade[] } {
  const nextPlayers = { ...players };
  let nextBarricades = [...barricades];

  zombies.forEach((zombie) => {
    const barricadeIndex = nextBarricades.findIndex((barricade) => zombieTouchesBarricade(zombie, barricade));
    if (barricadeIndex >= 0) {
      const barricade = nextBarricades[barricadeIndex];
      const hp = barricade.hp - getZombieBarricadeDamage(zombie, mode) * delta;
      nextBarricades = hp <= 0
        ? nextBarricades.filter((item) => item.id !== barricade.id)
        : nextBarricades.map((item) => (item.id === barricade.id ? { ...item, hp } : item));
      return;
    }

    (Object.keys(nextPlayers) as PlayerId[]).forEach((id) => {
      const player = nextPlayers[id];
      if (player.hp <= 0) {
        return;
      }

      const hit = Math.hypot(zombie.x - player.x, zombie.y - player.y) < ZOMBIE_ATTACK_SIZE;
      if (!hit) return;

      const hp = player.hp - getZombieDamage(zombie, mode) * delta;
      nextPlayers[id] = hp <= 0 && !isCoopSurvivalMode(mode)
        ? respawnPlayer(player, mapId)
        : applyZombieStatus(zombie, { ...player, hp: Math.max(0, hp) }, delta);
    });
  });

  return { players: nextPlayers, zombies, barricades: nextBarricades };
}

function rollZombieKind(mode: GameMode, seed: number): ZombieKind {
  const roll = Math.random();
  if (mode === 'swarmNight') {
    if (roll < 0.46) return 'runner';
    if (roll < 0.58) return 'spitter';
    return 'walker';
  }

  if (mode === 'nightmare') {
    if (roll < 0.34) return 'brute';
    if (roll < 0.58) return 'spitter';
    if (roll < 0.76) return 'runner';
    return 'walker';
  }

  if (mode === 'fortress') {
    if (roll < 0.42) return 'brute';
    if (roll < 0.58) return 'spitter';
    return seed % 4 === 0 ? 'runner' : 'walker';
  }

  if (roll < 0.18) return 'runner';
  if (roll < 0.3) return 'spitter';
  if (roll < 0.4) return 'brute';
  return 'walker';
}

function getZombieHp(kind: ZombieKind, mode: GameMode): number {
  const base = modeConfigs[mode].zombieHp ?? 42;
  if (kind === 'runner') return Math.max(18, base * 0.62);
  if (kind === 'brute') return base * 2.35;
  if (kind === 'spitter') return base * 0.9;
  return base;
}

function getZombieSpeed(zombie: Zombie, mode: GameMode): number {
  const base = modeConfigs[mode].zombieSpeed ?? 13;
  if (zombie.kind === 'runner') return base * 1.55;
  if (zombie.kind === 'brute') return base * 0.66;
  return base;
}

function getZombieDamage(zombie: Zombie, mode: GameMode): number {
  const base = modeConfigs[mode].zombieDamage ?? 18;
  if (zombie.kind === 'runner') return base * 0.72;
  if (zombie.kind === 'brute') return base * 1.75;
  if (zombie.kind === 'spitter') return base * 0.84;
  return base;
}

function getZombieBarricadeDamage(zombie: Zombie, mode: GameMode): number {
  const base = modeConfigs[mode].barricadeDamage ?? 24;
  if (zombie.kind === 'brute') return base * 2.1;
  if (zombie.kind === 'runner') return base * 0.68;
  return base;
}

function applyZombieStatus(zombie: Zombie, player: Player, delta: number): Player {
  if (zombie.kind !== 'spitter') {
    return player;
  }

  return {
    ...player,
    acidTimer: Math.max(player.acidTimer, 1.4),
    poisonTimer: Math.max(player.poisonTimer, 0.85 + delta),
  };
}

function zombieTouchesBarricade(zombie: Zombie, barricade: Barricade): boolean {
  const closestX = clamp(zombie.x, barricade.x, barricade.x + barricade.width);
  const closestY = clamp(zombie.y, barricade.y, barricade.y + barricade.height);
  return Math.hypot(zombie.x - closestX, zombie.y - closestY) < ZOMBIE_ATTACK_SIZE;
}

function getNearestPlayer(zombie: Zombie, players: Record<PlayerId, Player>, mapId: MapId): Player | null {
  const alivePlayers = (Object.keys(players) as PlayerId[])
    .map((id) => players[id])
    .filter((player) => player.hp > 0 && canSeePlayer(zombie, player, mapId));

  return alivePlayers.reduce<Player | null>((nearest, player) => {
    if (!nearest) {
      return player;
    }

    const nearestDistance = Math.hypot(zombie.x - nearest.x, zombie.y - nearest.y);
    const playerDistance = Math.hypot(zombie.x - player.x, zombie.y - player.y);
    return playerDistance < nearestDistance ? player : nearest;
  }, null);
}

function canSeePlayer(zombie: Zombie, player: Player, mapId: MapId): boolean {
  if (mapId !== 'custom' || !isHiddenInGrass(player.x, player.y)) {
    return true;
  }

  return Math.hypot(zombie.x - player.x, zombie.y - player.y) <= 9;
}

function randomInArena(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
