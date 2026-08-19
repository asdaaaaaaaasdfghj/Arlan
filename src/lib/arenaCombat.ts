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
import { isCoopSurvivalMode, isGlassWarsMode } from './arenaModes';
import { respawnPlayer } from './arenaPlayers';
import { createWeaponBullets } from './arenaBulletFactory';
import { getMagnetMove } from './arenaMagnets';
import { teleportBullet } from './arenaPortals';
import { bounceBullet, pointInRicochet } from './arenaRicochet';
import { getWeaponConfig } from './arenaWeapons';

type TrackedBullet = Bullet & {
  previousX: number;
  previousY: number;
};

type BulletHit =
  | { kind: 'solid' }
  | { kind: 'barricade'; item: Barricade }
  | { kind: 'board'; item: Barricade }
  | { kind: 'checkpoint'; item: AllyCheckpoint };

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
  destructibleBarricades: Barricade[],
  mapBoards: Barricade[],
  checkpoints: AllyCheckpoint[],
  ricochets: RicochetBlock[],
  portals: PortalBlock[],
  nextPowerUpId: number,
  magnets: MagnetBlock[] = [],
  mode: GameMode = 'luckyBlocks',
): { bullets: Bullet[]; barricades: Barricade[]; mapBoards: Barricade[]; checkpoints: AllyCheckpoint[]; powerUps: PowerUp[]; nextPowerUpId: number } {
  const nextBarricades = destructibleBarricades.map((barricade) => ({ ...barricade }));
  const nextBoards = mapBoards.map((board) => ({ ...board }));
  const nextCheckpoints = checkpoints.map((checkpoint) => ({ ...checkpoint }));
  const luckyPowerUps: PowerUp[] = [];
  let powerUpId = nextPowerUpId;
  const moved = bullets
    .map((bullet) => trackBulletMove(bullet, mapId, delta, magnets))
    .map((bullet) => trackPortalMove(bullet, portals))
    .map((bullet) => trackRicochetMove(bullet, ricochets))
    .filter((bullet): bullet is TrackedBullet => Boolean(bullet))
    .filter((bullet) => keepBullet(bullet, mapId, barricades, nextBarricades, nextBoards, nextCheckpoints, luckyPowerUps, () => powerUpId++, mode));

  return {
    bullets: moved,
    barricades: nextBarricades.filter((barricade) => barricade.hp > 0),
    mapBoards: nextBoards.filter((board) => board.hp > 0),
    checkpoints: nextCheckpoints.filter((checkpoint) => checkpoint.hp > 0),
    powerUps: luckyPowerUps,
    nextPowerUpId: powerUpId,
  };
}

function trackBulletMove(bullet: Bullet, mapId: MapId, delta: number, magnets: MagnetBlock[]): TrackedBullet {
  const moved = moveBulletByPhysics(bullet, mapId, delta, magnets);
  return {
    ...moved,
    portalCooldown: Math.max(0, bullet.portalCooldown - delta),
    previousX: bullet.x,
    previousY: bullet.y,
  };
}

function moveBulletByPhysics(bullet: Bullet, mapId: MapId, delta: number, magnets: MagnetBlock[]): Bullet {
  const weapon = getWeaponConfig(bullet.weapon, mapId);
  const x = bullet.x + bullet.dx * weapon.speed * delta;
  const y = bullet.y + bullet.dy * weapon.speed * delta;
  const magnet = getMagnetMove({ x, y }, mapId, delta, 'bullets', magnets);
  return { ...bullet, x: x + magnet.x, y: y + magnet.y };
}

function trackPortalMove(bullet: TrackedBullet, portals: PortalBlock[]): TrackedBullet {
  const teleported = teleportBullet(bullet, portals);
  if (teleported.x !== bullet.x || teleported.y !== bullet.y) {
    return { ...teleported, previousX: teleported.x, previousY: teleported.y };
  }

  return { ...teleported, previousX: bullet.previousX, previousY: bullet.previousY };
}

function trackRicochetMove(bullet: TrackedBullet, ricochets: RicochetBlock[]): TrackedBullet | null {
  const bounced = bounceOrKeepBullet(bullet, ricochets);
  return bounced ? { ...bounced, previousX: bounced.x, previousY: bounced.y } : null;
}

function bounceOrKeepBullet(bullet: Bullet, ricochets: RicochetBlock[]): Bullet | null {
  const ricochet = pointInRicochet(bullet.x, bullet.y, ricochets);
  return ricochet ? bounceBullet(bullet, ricochet) : bullet;
}

function keepBullet(
  bullet: TrackedBullet,
  mapId: MapId,
  barricades: Blocker[],
  destructibleBarricades: Barricade[],
  boards: Barricade[],
  checkpoints: AllyCheckpoint[],
  powerUps: PowerUp[],
  takePowerUpId: () => number,
  mode: GameMode,
): boolean {
  const hit = findBulletHit(bullet, mapId, barricades, destructibleBarricades, boards, checkpoints);
  if (!hit) return true;

  if (hit.kind === 'barricade' || hit.kind === 'board' || hit.kind === 'checkpoint') {
    hit.item.hp -= bullet.damage;
    if (hit.kind === 'board' && hit.item.hp <= 0 && hit.item.variant === 'lucky') {
      powerUps.push(...createLuckyDrops(hit.item, takePowerUpId, mode));
    }
  }

  return false;
}

function findBulletHit(
  bullet: TrackedBullet,
  mapId: MapId,
  barricades: Blocker[],
  destructibleBarricades: Barricade[],
  boards: Barricade[],
  checkpoints: AllyCheckpoint[],
): BulletHit | null {
  const bounds = getArenaBounds(mapId);
  const distance = Math.hypot(bullet.x - bullet.previousX, bullet.y - bullet.previousY);
  const steps = Math.max(1, Math.ceil(distance / 1.2));

  for (let step = 0; step <= steps; step += 1) {
    const progress = step / steps;
    const x = bullet.previousX + (bullet.x - bullet.previousX) * progress;
    const y = bullet.previousY + (bullet.y - bullet.previousY) * progress;

    if (x <= 0 || x >= bounds.width || y <= 0 || y >= bounds.height) return { kind: 'solid' };
    if (isPointInsideObstacle(x, y, mapId, barricades)) return { kind: 'solid' };

    const barricade = destructibleBarricades.find((item) => item.hp > 0 && pointInRect(x, y, item));
    if (barricade) return { kind: 'barricade', item: barricade };

    const board = boards.find((item) => item.hp > 0 && pointInRect(x, y, item));
    if (board) return { kind: 'board', item: board };

    const checkpoint = checkpoints.find((item) => pointInRect(x, y, item));
    if (checkpoint) return { kind: 'checkpoint', item: checkpoint };
  }

  return null;
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
      score: hp <= 0 && shouldScorePlayerKill(mode, targetId, canRespawn) ? nextPlayers[bullet.owner].score + 1 : nextPlayers[bullet.owner].score,
    };
    return false;
  });

  return { players: nextPlayers, allies: nextAllies, bullets: activeBullets, effects };
}

function shouldScorePlayerKill(mode: GameMode, targetId: PlayerId, canRespawn: Record<PlayerId, boolean>): boolean {
  return !isGlassWarsMode(mode) || !canRespawn[targetId];
}

function pointInRect(x: number, y: number, rect: Barricade): boolean {
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}
