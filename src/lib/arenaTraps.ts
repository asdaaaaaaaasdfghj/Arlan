import type { GameMode, HitEffect, MapId, Player, PlayerId, TrapBlock, TrapKind, Zombie } from './arenaTypes';
import { isCoopSurvivalMode } from './arenaModes';
import { respawnPlayer } from './arenaPlayers';

const trapDamage: Record<TrapKind, number> = {
  spikes: 22,
  lava: 26,
  acid: 12,
  zap: 12,
  poison: 0,
  saw: 34,
  mine: 0,
  bear: 8,
  web: 0,
};
const burnSeconds = 2.8;
const shockSeconds = 1.1;
const snareSeconds = 1.9;
const acidSeconds = 3.4;
const burnDamage = 14;
const acidDamage = 8;
const mineDamage = 88;
const mineRadius = 12;
export const poisonSeconds = 4.2;

export function tickTraps(
  players: Record<PlayerId, Player>,
  zombies: Zombie[],
  traps: TrapBlock[],
  mode: GameMode,
  mapId: MapId,
  elapsed: number,
  delta: number,
  nextEffectId: number,
): { players: Record<PlayerId, Player>; zombies: Zombie[]; traps: TrapBlock[]; effects: HitEffect[]; nextEffectId: number } {
  if (traps.length === 0) return { players, zombies, traps, effects: [], nextEffectId };

  const mines = getTriggeredMines(players, zombies, traps);
  const liveTraps = traps.filter((trap) => !mines.some((mine) => mine.id === trap.id));
  const damagedPlayers = damagePlayers(players, liveTraps, mode, mapId, elapsed, delta);
  const damagedZombies = damageZombies(zombies, liveTraps, elapsed, delta);
  const blastState = explodeMines(damagedPlayers, damagedZombies, mines, mode, mapId);

  return {
    players: blastState.players,
    zombies: blastState.zombies,
    traps: liveTraps,
    effects: mines.map((mine, index) => ({ id: nextEffectId + index, x: mine.x + mine.width / 2, y: mine.y + mine.height / 2, kind: 'explosion', age: 0.35 })),
    nextEffectId: nextEffectId + mines.length,
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
      shock: touch.shock || trap.kind === 'zap' || trap.kind === 'web',
      snare: touch.snare || trap.kind === 'bear',
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
    snareTimer: touch.snare ? snareSeconds : player.snareTimer,
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

function getTriggeredMines(players: Record<PlayerId, Player>, zombies: Zombie[], traps: TrapBlock[]): TrapBlock[] {
  return traps.filter((trap) => {
    if (trap.kind !== 'mine') return false;
    const playerTouched = (Object.keys(players) as PlayerId[]).some((id) => players[id].hp > 0 && pointInTrap(players[id].x, players[id].y, trap));
    const zombieTouched = zombies.some((zombie) => pointInTrap(zombie.x, zombie.y, trap));
    return playerTouched || zombieTouched;
  });
}

function explodeMines(
  players: Record<PlayerId, Player>,
  zombies: Zombie[],
  mines: TrapBlock[],
  mode: GameMode,
  mapId: MapId,
): { players: Record<PlayerId, Player>; zombies: Zombie[] } {
  if (mines.length === 0) return { players, zombies };
  const nextPlayers = { ...players };
  (Object.keys(nextPlayers) as PlayerId[]).forEach((id) => {
    const player = nextPlayers[id];
    const damage = mines.reduce((total, mine) => total + radialDamage(player.x, player.y, mine), 0);
    if (damage <= 0 || player.hp <= 0) return;
    const hp = player.hp - damage;
    nextPlayers[id] = hp <= 0 && !isCoopSurvivalMode(mode)
      ? respawnPlayer(player, mapId)
      : { ...player, hp: Math.max(0, hp) };
  });

  return {
    players: nextPlayers,
    zombies: zombies
      .map((zombie) => ({ ...zombie, hp: zombie.hp - mines.reduce((total, mine) => total + radialDamage(zombie.x, zombie.y, mine), 0) }))
      .filter((zombie) => zombie.hp > 0),
  };
}

function radialDamage(x: number, y: number, mine: TrapBlock): number {
  const centerX = mine.x + mine.width / 2;
  const centerY = mine.y + mine.height / 2;
  const distance = Math.hypot(x - centerX, y - centerY);
  if (distance > mineRadius) return 0;
  return mineDamage * (1 - distance / mineRadius);
}

type TrapTouch = {
  damage: number;
  burn: boolean;
  shock: boolean;
  snare: boolean;
  acid: boolean;
  poison: boolean;
};

const emptyTrapTouch: TrapTouch = {
  damage: 0,
  burn: false,
  shock: false,
  snare: false,
  acid: false,
  poison: false,
};
