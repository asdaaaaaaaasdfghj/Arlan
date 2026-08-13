import {
  PLAYER_SIZE,
  type Barricade,
  type GameInput,
  type GameMode,
  type Grenade,
  type HitEffect,
  type MapId,
  type MagnetBlock,
  type Player,
  type PlayerId,
  type Zombie,
} from './arenaTypes';
import { modeConfigs } from './arenaModes';
import { damageBarricades, damagePlayers, damageZombies } from './arenaGrenadeDamage';
import { getMagnetMove } from './arenaMagnets';
import { getArenaBounds } from './arenaBounds';
import type { BlastPoint } from './arenaTnt';

const GRENADE_SPEED = 32;
const GRENADE_TIMER = 1.15;
const EXPLOSION_RADIUS = 13;

type ExplosionState = {
  players: Record<PlayerId, Player>;
  zombies: Zombie[];
  barricades: Barricade[];
  grenades: Grenade[];
  effects: HitEffect[];
  blasts: BlastPoint[];
};

export function spawnGrenades(
  players: Record<PlayerId, Player>,
  input: GameInput,
  mode: GameMode,
  nextId: number,
): { players: Record<PlayerId, Player>; grenades: Grenade[] } {
  const grenades: Grenade[] = [];
  const nextPlayers = { ...players };

  (Object.keys(players) as PlayerId[]).forEach((id) => {
    const player = players[id];
    if (player.hp <= 0 || !input[id].grenade || player.grenadeCooldown > 0) {
      return;
    }

    grenades.push({
      id: nextId + grenades.length,
      owner: id,
      x: player.x + player.facingX * PLAYER_SIZE,
      y: player.y + player.facingY * PLAYER_SIZE,
      dx: player.facingX,
      dy: player.facingY,
      timer: GRENADE_TIMER,
    });
    nextPlayers[id] = { ...player, grenadeCooldown: modeConfigs[mode].grenadeCooldown };
  });

  return { players: nextPlayers, grenades };
}

export function tickGrenades(
  grenades: Grenade[],
  players: Record<PlayerId, Player>,
  zombies: Zombie[],
  barricades: Barricade[],
  mode: GameMode,
  mapId: MapId,
  nextEffectId: number,
  delta: number,
  magnets: MagnetBlock[] = [],
) {
  const moved = grenades.map((grenade) => moveGrenade(grenade, mapId, delta, magnets));
  const exploding = moved.filter((grenade) => grenade.timer <= 0);
  const activeGrenades = moved.filter((grenade) => grenade.timer > 0);

  return exploding.reduce((state, grenade, index) => (
    explodeGrenade(grenade, state, mode, mapId, nextEffectId + index)
  ), { players, zombies, barricades, grenades: activeGrenades, effects: [] as HitEffect[], blasts: [] as BlastPoint[] });
}

function moveGrenade(grenade: Grenade, mapId: MapId, delta: number, magnets: MagnetBlock[]): Grenade {
  const nextX = grenade.x + grenade.dx * GRENADE_SPEED * delta;
  const nextY = grenade.y + grenade.dy * GRENADE_SPEED * delta;
  const magnet = getMagnetMove({ x: nextX, y: nextY }, mapId, delta, 'grenades', magnets);
  const movedX = nextX + magnet.x;
  const movedY = nextY + magnet.y;
  const bounds = getArenaBounds(mapId);
  const hitBoundary = movedX <= 2 || movedX >= bounds.width - 2 || movedY <= 2 || movedY >= bounds.height - 2;

  return {
    ...grenade,
    x: clamp(movedX, 2, bounds.width - 2),
    y: clamp(movedY, 2, bounds.height - 2),
    timer: hitBoundary ? 0 : grenade.timer - delta,
  };
}

function explodeGrenade(
  grenade: Grenade,
  state: ExplosionState,
  mode: GameMode,
  mapId: MapId,
  effectId: number,
) {
  const damage = modeConfigs[mode].grenadeDamage;
  const players = damagePlayers(state.players, grenade, mode, mapId, damage, EXPLOSION_RADIUS);
  const zombieState = damageZombies(state.zombies, players, grenade, damage, EXPLOSION_RADIUS);

  return {
    players: zombieState.players,
    zombies: zombieState.zombies,
    barricades: damageBarricades(state.barricades, grenade, damage, EXPLOSION_RADIUS),
    grenades: state.grenades,
    effects: [...state.effects, { id: effectId, x: grenade.x, y: grenade.y, kind: 'explosion' as const, age: 0.42 }],
    blasts: [...state.blasts, { x: grenade.x, y: grenade.y, owner: grenade.owner }],
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
