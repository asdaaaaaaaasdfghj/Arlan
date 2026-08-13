import type { Barricade, Bullet, GameMode, HitEffect, MapId, Player, PlayerId, TntBlock, Zombie } from './arenaTypes';
import { damageBarricades, damagePlayers, damageZombies } from './arenaGrenadeDamage';

const tntDamage = 85;
const tntRadius = 14;
const chainRadius = 18;
const fuseSeconds = 0.55;
const redRespawnSeconds = 6;

export type BlastPoint = { x: number; y: number; owner: PlayerId };

type TntState = {
  tnts: TntBlock[];
  bullets: Bullet[];
  players: Record<PlayerId, Player>;
  zombies: Zombie[];
  barricades: Barricade[];
  mapBoards: Barricade[];
  effects: HitEffect[];
};

export function tickTnts(tnts: TntBlock[], delta: number): TntBlock[] {
  return tnts.map((tnt) => {
    if (tnt.active && tnt.kind === 'gray' && tnt.fuseTimer > 0) {
      return { ...tnt, fuseTimer: Math.max(0, tnt.fuseTimer - delta) };
    }

    if (tnt.active || tnt.kind !== 'red') {
      return tnt;
    }

    const respawnTimer = tnt.respawnTimer - delta;
    return respawnTimer <= 0 ? { ...tnt, active: true, respawnTimer: 0 } : { ...tnt, respawnTimer };
  });
}

export function triggerTnts(
  state: Omit<TntState, 'effects'>,
  mode: GameMode,
  mapId: MapId,
  nextEffectId: number,
): TntState {
  const effects: HitEffect[] = [];
  let nextState: TntState = { ...state, effects };
  const blasts: BlastPoint[] = [];

  const bullets = state.bullets.filter((bullet) => {
    const tnt = nextState.tnts.find((item) => item.active && pointInRect(bullet.x, bullet.y, item));
    if (!tnt) {
      return true;
    }

    if (tnt.kind !== 'gray') {
      nextState = explodeTnt(nextState, tnt, bullet.owner, mode, mapId, nextEffectId + nextState.effects.length);
      blasts.push({ x: centerX(tnt), y: centerY(tnt), owner: bullet.owner });
    }
    return false;
  });

  return triggerTntChain({ ...nextState, bullets }, blasts);
}

export function explodeReadyTnts(
  state: TntState,
  mode: GameMode,
  mapId: MapId,
  nextEffectId: number,
): TntState {
  let nextState = state;
  const readyTnts = nextState.tnts.filter((tnt) => (
    tnt.active && tnt.kind === 'gray' && tnt.fuseTimer === 0 && tnt.fuseOwner
  ));

  readyTnts.forEach((tnt) => {
    const owner = tnt.fuseOwner ?? 'blue';
    nextState = explodeTnt(nextState, tnt, owner, mode, mapId, nextEffectId + nextState.effects.length);
    nextState = triggerTntChain(nextState, [{ x: centerX(tnt), y: centerY(tnt), owner }]);
  });

  return nextState;
}

export function triggerTntChain(state: TntState, blasts: BlastPoint[]): TntState {
  return blasts.reduce((nextState, blast) => igniteNearbyTnts(nextState, blast), state);
}

function igniteNearbyTnts(state: TntState, blast: BlastPoint): TntState {
  return {
    ...state,
    tnts: state.tnts.map((tnt) => {
      const shouldIgnite = tnt.active && tnt.kind === 'gray' && tnt.fuseTimer === 0 && !tnt.fuseOwner;
      return shouldIgnite && distanceToTnt(blast, tnt) <= chainRadius
        ? { ...tnt, fuseTimer: fuseSeconds, fuseOwner: blast.owner }
        : tnt;
    }),
  };
}

function explodeTnt(state: TntState, tnt: TntBlock, owner: PlayerId, mode: GameMode, mapId: MapId, effectId: number): TntState {
  const blast = { id: tnt.id, owner, x: centerX(tnt), y: centerY(tnt), dx: 0, dy: 0, timer: 0 };
  const players = damagePlayers(state.players, blast, mode, mapId, tntDamage, tntRadius);
  const zombieState = damageZombies(state.zombies, players, blast, tntDamage, tntRadius);

  return {
    ...state,
    players: zombieState.players,
    zombies: zombieState.zombies,
    barricades: damageBarricades(state.barricades, blast, tntDamage, tntRadius),
    mapBoards: damageBarricades(state.mapBoards, blast, tntDamage, tntRadius),
    tnts: state.tnts.map((item) => {
      if (item.id !== tnt.id) return item;
      return {
        ...item,
        active: false,
        respawnTimer: item.kind === 'red' ? redRespawnSeconds : 0,
        fuseTimer: 0,
        fuseOwner: null,
      };
    }),
    effects: [...state.effects, { id: effectId, x: blast.x, y: blast.y, kind: 'explosion', age: 0.48 }],
  };
}

function pointInRect(x: number, y: number, rect: TntBlock): boolean {
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}

function centerX(tnt: TntBlock): number { return tnt.x + tnt.width / 2; }

function centerY(tnt: TntBlock): number { return tnt.y + tnt.height / 2; }

function distanceToTnt(blast: BlastPoint, tnt: TntBlock): number {
  return Math.hypot(blast.x - centerX(tnt), blast.y - centerY(tnt));
}
