import {
  BULLET_HIT_SIZE,
  type AllyCheckpoint,
  type AllyUnit,
  type Barricade,
  type Bullet,
  type GameMode,
  type GameInput,
  type HitEffect,
  type MapId,
  type MagnetBlock,
  type Player,
  type PlayerId,
  type PowerUp,
  type PowerUpKind,
  type PortalBlock,
  type RicochetBlock,
} from './arenaTypes';
import { isPointInsideObstacle, type Blocker } from './arenaMap';
import { getArenaBounds } from './arenaBounds';
import { isCoopSurvivalMode } from './arenaModes';
import { respawnPlayer } from './arenaPlayers';
import { createWeaponBullets } from './arenaBulletFactory';
import { getMagnetMove } from './arenaMagnets';
import { teleportBullet } from './arenaPortals';
import { bounceBullet, pointInRicochet } from './arenaRicochet';
import { getWeaponConfig } from './arenaWeapons';

export function spawnBullets(
  players: Record<PlayerId, Player>,
  input: GameInput,
  nextId: number,
  mapId: MapId,
): { players: Record<PlayerId, Player>; bullets: Bullet[] } {
  const bullets: Bullet[] = [];
  const nextPlayers = { ...players };

  (Object.keys(players) as PlayerId[]).forEach((id) => {
    const player = players[id];
    if (player.hp <= 0 || !input[id].shoot || player.cooldown > 0 || player.shockTimer > 0) {
      return;
    }

    const weapon = getWeaponConfig(player.weapon, mapId);
    bullets.push(...createWeaponBullets(player, nextId + bullets.length, mapId));
    nextPlayers[id] = { ...player, cooldown: weapon.cooldown, shotsFired: player.shotsFired + 1 };
  });

  return { players: nextPlayers, bullets };
}

export function moveBullets(
  bullets: Bullet[],
  delta: number,
  mapId: MapId,
  barricades: Blocker[],
  mapBoards: Barricade[],
  checkpoints: AllyCheckpoint[],
  ricochets: RicochetBlock[],
  portals: PortalBlock[],
  nextPowerUpId: number,
  magnets: MagnetBlock[] = [],
  mode: GameMode = 'luckyBlocks',
): { bullets: Bullet[]; mapBoards: Barricade[]; checkpoints: AllyCheckpoint[]; powerUps: PowerUp[]; nextPowerUpId: number } {
  const nextBoards = mapBoards.map((board) => ({ ...board }));
  const nextCheckpoints = checkpoints.map((checkpoint) => ({ ...checkpoint }));
  const luckyPowerUps: PowerUp[] = [];
  let powerUpId = nextPowerUpId;
  const moved = bullets
    .map((bullet) => ({
      ...moveBulletByPhysics(bullet, mapId, delta, magnets),
      portalCooldown: Math.max(0, bullet.portalCooldown - delta),
    }))
    .map((bullet) => teleportBullet(bullet, portals))
    .map((bullet) => bounceOrKeepBullet(bullet, ricochets))
    .filter((bullet): bullet is Bullet => Boolean(bullet))
    .filter((bullet) => keepBullet(bullet, mapId, barricades, nextBoards, nextCheckpoints, luckyPowerUps, () => powerUpId++, mode));

  return {
    bullets: moved,
    mapBoards: nextBoards.filter((board) => board.hp > 0),
    checkpoints: nextCheckpoints.filter((checkpoint) => checkpoint.hp > 0),
    powerUps: luckyPowerUps,
    nextPowerUpId: powerUpId,
  };
}

function moveBulletByPhysics(bullet: Bullet, mapId: MapId, delta: number, magnets: MagnetBlock[]): Bullet {
  const weapon = getWeaponConfig(bullet.weapon, mapId);
  const x = bullet.x + bullet.dx * weapon.speed * delta;
  const y = bullet.y + bullet.dy * weapon.speed * delta;
  const magnet = getMagnetMove({ x, y }, mapId, delta, 'bullets', magnets);
  return { ...bullet, x: x + magnet.x, y: y + magnet.y };
}

function bounceOrKeepBullet(bullet: Bullet, ricochets: RicochetBlock[]): Bullet | null {
  const ricochet = pointInRicochet(bullet.x, bullet.y, ricochets);
  return ricochet ? bounceBullet(bullet, ricochet) : bullet;
}

function keepBullet(
  bullet: Bullet,
  mapId: MapId,
  barricades: Blocker[],
  boards: Barricade[],
  checkpoints: AllyCheckpoint[],
  powerUps: PowerUp[],
  takePowerUpId: () => number,
  mode: GameMode,
): boolean {
  const bounds = getArenaBounds(mapId);
  if (bullet.x <= 0 || bullet.x >= bounds.width || bullet.y <= 0 || bullet.y >= bounds.height) {
    return false;
  }

  if (isPointInsideObstacle(bullet.x, bullet.y, mapId, barricades)) {
    return false;
  }

  const board = boards.find((item) => item.hp > 0 && pointInRect(bullet.x, bullet.y, item));
  if (board) {
    board.hp -= bullet.damage;
    if (board.hp <= 0 && board.variant === 'lucky') {
      powerUps.push(...createLuckyDrops(board, takePowerUpId, mode));
    }
    return false;
  }

  const checkpoint = checkpoints.find((item) => pointInRect(bullet.x, bullet.y, item));
  if (checkpoint) {
    checkpoint.hp -= bullet.damage;
    return false;
  }

  return true;
}

function createLuckyDrops(board: Barricade, takePowerUpId: () => number, mode: GameMode): PowerUp[] {
  const roll = Math.random();
  const center = { x: board.x + board.width / 2, y: board.y + board.height / 2 };
  const weaponKinds: PowerUpKind[] = roll < 0.24
    ? ['weaponBlaster', 'speed']
    : roll < 0.48
      ? ['weaponRailgun', 'heal']
      : roll < 0.72
        ? ['weaponShotgun', 'overdrive']
        : roll < 0.9
          ? ['weaponFlame', 'superHeal']
          : ['termos', 'damage'];
  const kinds: PowerUpKind[] = roll < 0.16
    ? ['superHeal']
    : roll < 0.32
      ? ['overdrive']
      : roll < 0.46
        ? ['termos']
        : roll < 0.58
          ? ['heal', 'speed']
          : roll < 0.7
            ? ['repair', 'superHeal']
            : roll < 0.78
              ? ['damage']
              : roll < 0.86
                ? ['shock']
                : roll < 0.94
                  ? ['poison']
                  : ['burn', 'damage'];

  return (mode === 'hungerGames' ? weaponKinds : kinds).map((kind, index) => ({
    id: takePowerUpId(),
    kind,
    x: center.x + (index - (kinds.length - 1) / 2) * 4,
    y: center.y,
  }));
}

export function applyBulletHits(
  players: Record<PlayerId, Player>,
  allies: AllyUnit[],
  bullets: Bullet[],
  mode: GameMode,
  mapId: MapId,
  nextEffectId: number,
  canRespawn: Record<PlayerId, boolean> = { blue: true, red: true },
): { players: Record<PlayerId, Player>; allies: AllyUnit[]; bullets: Bullet[]; effects: HitEffect[] } {
  const nextPlayers = { ...players };
  const nextAllies = allies.map((ally) => ({ ...ally }));
  const effects: HitEffect[] = [];
  const activeBullets = bullets.filter((bullet) => {
    const ally = nextAllies.find((item) => (
      item.owner !== bullet.owner
      && item.hp > 0
      && Math.hypot(bullet.x - item.x, bullet.y - item.y) < BULLET_HIT_SIZE + bullet.size / 10
    ));
    if (ally) {
      ally.hp = Math.max(0, ally.hp - bullet.damage);
      ally.respawnTimer = ally.hp <= 0 ? 3.5 : ally.respawnTimer;
      nextPlayers[bullet.owner] = {
        ...nextPlayers[bullet.owner],
        score: ally.hp <= 0 ? nextPlayers[bullet.owner].score + 1 : nextPlayers[bullet.owner].score,
      };
      effects.push({ id: nextEffectId + effects.length, x: ally.x, y: ally.y, kind: 'player', age: 0.32 });
      return false;
    }

    if (isCoopSurvivalMode(mode)) {
      return true;
    }

    const targetId: PlayerId = bullet.owner === 'blue' ? 'red' : 'blue';
    const target = nextPlayers[targetId];
    const hit = Math.hypot(bullet.x - target.x, bullet.y - target.y) < BULLET_HIT_SIZE + bullet.size / 10;

    if (!hit) {
      return true;
    }

    effects.push({ id: nextEffectId + effects.length, x: target.x, y: target.y, kind: 'player', age: 0.32 });
    const hp = mode === 'quickDraw' ? 0 : target.hp - bullet.damage;
    nextPlayers[targetId] = hp <= 0 && canRespawn[targetId] ? respawnPlayer(target, mapId) : { ...target, hp: Math.max(0, hp) };
    nextPlayers[bullet.owner] = {
      ...nextPlayers[bullet.owner],
      score: hp <= 0 ? nextPlayers[bullet.owner].score + 1 : nextPlayers[bullet.owner].score,
    };
    return false;
  });

  return { players: nextPlayers, allies: nextAllies, bullets: activeBullets, effects };
}

function pointInRect(x: number, y: number, rect: Barricade): boolean {
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}
