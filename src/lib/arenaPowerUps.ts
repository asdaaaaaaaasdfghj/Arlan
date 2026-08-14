import {
  BARRICADE_HP,
  SPEED_BOOST_SECONDS,
  type Barricade,
  type Player,
  type PlayerId,
  type PowerUp,
  type PowerUpKind,
} from './arenaTypes';

const POWER_UP_TIMER = 5.5;
const PICKUP_RADIUS = 5.2;
const spawnPoints = [
  { x: 50, y: 12 },
  { x: 18, y: 18 },
  { x: 82, y: 18 },
  { x: 24, y: 52 },
  { x: 76, y: 52 },
  { x: 50, y: 52 },
];

export function tickPowerUps(
  players: Record<PlayerId, Player>,
  barricades: Barricade[],
  powerUps: PowerUp[],
  nextId: number,
  timer: number,
  delta: number,
): {
  players: Record<PlayerId, Player>;
  barricades: Barricade[];
  powerUps: PowerUp[];
  nextId: number;
  timer: number;
} {
  const spawned = spawnPowerUp(powerUps, nextId, timer - delta);
  const picked = collectPowerUps(players, barricades, spawned.powerUps);

  return {
    ...picked,
    nextId: spawned.nextId,
    timer: spawned.timer,
  };
}

function spawnPowerUp(powerUps: PowerUp[], nextId: number, timer: number) {
  if (timer > 0 || powerUps.length >= 3) {
    return { powerUps, nextId, timer };
  }

  const point = spawnPoints[Math.floor(Math.random() * spawnPoints.length)];
  const kinds: PowerUpKind[] = ['heal', 'speed', 'repair'];

  return {
    powerUps: [...powerUps, { id: nextId, kind: kinds[nextId % kinds.length], ...point }],
    nextId: nextId + 1,
    timer: POWER_UP_TIMER,
  };
}

function collectPowerUps(
  players: Record<PlayerId, Player>,
  barricades: Barricade[],
  powerUps: PowerUp[],
) {
  let nextPlayers = { ...players };
  let nextBarricades = [...barricades];
  const remaining = powerUps.filter((powerUp) => {
    const playerId = findCollector(nextPlayers, powerUp);
    if (!playerId) {
      return true;
    }

    const applied = applyPowerUp(nextPlayers[playerId], nextBarricades, powerUp.kind);
    nextPlayers = { ...nextPlayers, [playerId]: applied.player };
    nextBarricades = applied.barricades;
    return false;
  });

  return { players: nextPlayers, barricades: nextBarricades, powerUps: remaining };
}

function findCollector(players: Record<PlayerId, Player>, powerUp: PowerUp): PlayerId | null {
  return (Object.keys(players) as PlayerId[]).find((id) => {
    const player = players[id];
    return player.hp > 0 && Math.hypot(player.x - powerUp.x, player.y - powerUp.y) < PICKUP_RADIUS;
  }) ?? null;
}

function applyPowerUp(player: Player, barricades: Barricade[], kind: PowerUpKind) {
  if (kind === 'heal') {
    return { player: { ...player, hp: Math.min(100, player.hp + 35) }, barricades };
  }

  if (kind === 'superHeal') {
    return { player: { ...player, hp: 100, burnTimer: 0, shockTimer: 0, acidTimer: 0, poisonTimer: 0, snareTimer: 0 }, barricades };
  }

  if (kind === 'speed') {
    return { player: { ...player, speedBoost: SPEED_BOOST_SECONDS }, barricades };
  }

  if (kind === 'overdrive') {
    return { player: { ...player, speedBoost: SPEED_BOOST_SECONDS * 1.5, cooldown: 0, grenadeCooldown: 0 }, barricades };
  }

  if (kind === 'termos') {
    return { player: { ...player, weapon: 'termos' }, barricades };
  }

  if (kind === 'weaponBlaster') {
    return { player: { ...player, weapon: 'blaster', cooldown: 0 }, barricades };
  }

  if (kind === 'weaponRailgun') {
    return { player: { ...player, weapon: 'railgun', cooldown: 0 }, barricades };
  }

  if (kind === 'weaponShotgun') {
    return { player: { ...player, weapon: 'shotgun', cooldown: 0 }, barricades };
  }

  if (kind === 'weaponFlame') {
    return { player: { ...player, weapon: 'flamethrower', cooldown: 0 }, barricades };
  }

  if (kind === 'damage') {
    return { player: { ...player, hp: Math.max(1, player.hp - 38) }, barricades };
  }

  if (kind === 'shock') {
    return { player: { ...player, shockTimer: 2.2 }, barricades };
  }

  if (kind === 'poison') {
    return { player: { ...player, poisonTimer: 4.8 }, barricades };
  }

  if (kind === 'burn') {
    return { player: { ...player, burnTimer: 3.2 }, barricades };
  }

  return {
    player,
    barricades: barricades.map((item) => ({ ...item, hp: Math.min(BARRICADE_HP, item.hp + 90) })),
  };
}
