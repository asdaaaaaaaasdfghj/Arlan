import type { GameMode, MapId, Player, PlayerId, TrapBlock, TrapKind, Zombie } from './arenaTypes';
import { isCoopSurvivalMode } from './arenaModes';
import { respawnPlayer } from './arenaPlayers';

const trapDamage: Record<TrapKind, number> = {
  spikes: 22,
  lava: 26,
  acid: 12,
  zap: 12,
  poison: 0,
  saw: 34,
  mine: 58,
  bear: 28,
  web: 0,
};
const burnSeconds = 2.8;
const shockSeconds = 1.1;
const acidSeconds = 3.4;
const burnDamage = 14;
const acidDamage = 8;
export const poisonSeconds = 4.2;

export function tickTraps(
  players: Record<PlayerId, Player>,
  zombies: Zombie[],
  traps: TrapBlock[],
  mode: GameMode,
  mapId: MapId,
  elapsed: number,
  delta: number,
): { players: Record<PlayerId, Player>; zombies: Zombie[] } {
  if (traps.length === 0) return { players, zombies };

  return {
    players: damagePlayers(players, traps, mode, mapId, elapsed, delta),
    zombies: damageZombies(zombies, traps, elapsed, delta),
  };
}

function damagePlayers(
  players: Record<PlayerId, Player>,
  traps: TrapBlock[],
  mode: GameMode,
  mapId: MapId,
  elapsed: number,
  delta: number,
): Record<PlayerId, Player> {
  const nextPlayers = { ...players };
  const zapActive = isZapActive(elapsed);
  (Object.keys(nextPlayers) as PlayerId[]).forEach((id) => {
    const player = nextPlayers[id];
    if (player.hp <= 0) return;

    const touch = getTrapTouch(player.x, player.y, traps, zapActive);
    const touchedPlayer = applyTrapStatuses(player, touch);
    const damage = (touch.damage + getStatusDamage(touchedPlayer)) * delta;
    nextPlayers[id] = touch.poison ? { ...touchedPlayer, poisonTimer: poisonSeconds } : touchedPlayer;
    if (damage <= 0) return;

    const hp = player.hp - damage;
    const damagedPlayer = { ...nextPlayers[id], hp: Math.max(0, hp) };
    nextPlayers[id] = hp <= 0 && !isCoopSurvivalMode(mode) ? respawnPlayer(player, mapId) : damagedPlayer;
  });
  return nextPlayers;
}

function damageZombies(zombies: Zombie[], traps: TrapBlock[], elapsed: number, delta: number): Zombie[] {
  const zapActive = isZapActive(elapsed);
  return zombies
    .map((zombie) => ({ ...zombie, hp: zombie.hp - getTrapTouch(zombie.x, zombie.y, traps, zapActive).damage * delta }))
    .filter((zombie) => zombie.hp > 0);
}

function getTrapTouch(x: number, y: number, traps: TrapBlock[], zapActive: boolean): TrapTouch {
  return traps.reduce<TrapTouch>((touch, trap) => {
    if (!pointInTrap(x, y, trap)) {
      return touch;
    }

    if (trap.kind === 'zap' && !zapActive) {
      return touch;
    }

    return {
      damage: touch.damage + trapDamage[trap.kind],
      burn: touch.burn || trap.kind === 'lava',
      shock: touch.shock || trap.kind === 'zap' || trap.kind === 'bear' || trap.kind === 'web',
      acid: touch.acid || trap.kind === 'acid',
      poison: touch.poison || trap.kind === 'poison',
    };
  }, emptyTrapTouch);
}

function applyTrapStatuses(player: Player, touch: TrapTouch): Player {
  return {
    ...player,
    burnTimer: touch.burn ? burnSeconds : player.burnTimer,
    shockTimer: touch.shock ? shockSeconds : player.shockTimer,
    acidTimer: touch.acid ? acidSeconds : player.acidTimer,
  };
}

function getStatusDamage(player: Player): number {
  return (player.burnTimer > 0 ? burnDamage : 0) + (player.acidTimer > 0 ? acidDamage : 0);
}

function pointInTrap(x: number, y: number, trap: TrapBlock): boolean {
  return x >= trap.x && x <= trap.x + trap.width && y >= trap.y && y <= trap.y + trap.height;
}

function isZapActive(elapsed: number): boolean {
  return Math.floor(elapsed * 4) % 2 === 0;
}

type TrapTouch = {
  damage: number;
  burn: boolean;
  shock: boolean;
  acid: boolean;
  poison: boolean;
};

const emptyTrapTouch: TrapTouch = {
  damage: 0,
  burn: false,
  shock: false,
  acid: false,
  poison: false,
};
