import { BULLET_HIT_SIZE, type AllyCheckpoint, type AllyUnit, type Bullet, type GameState, type Player, type PlayerId, type Zombie } from './arenaTypes';
import { isBlockedPlayerPosition, isPointInsideObstacle, type Blocker } from './arenaMap';

const allyHp = 55;
const allyRespawnSeconds = 3.5;
const allyRange = 46;
const allyCooldown = 0.85;
const allySpeed = 18;
const allyStopDistance = 24;

type Target = { x: number; y: number; hp: number; owner: PlayerId | 'zombie' };

export function tickAllies(
  allies: AllyUnit[],
  checkpoints: AllyCheckpoint[],
  players: Record<PlayerId, Player>,
  zombies: Zombie[],
  blockers: Blocker[],
  mapId: GameState['mapId'],
  delta: number,
  nextBulletId: number,
): { allies: AllyUnit[]; bullets: Bullet[] } {
  const bullets: Bullet[] = [];
  const aliveAllies = allies.filter((ally) => ally.hp > 0);
  const nextAllies = allies.map((ally) => {
    if (ally.hp <= 0) {
      return respawnOrWait(ally, checkpoints, delta);
    }

    const target = findTarget(ally, players, zombies, aliveAllies);
    const cooldown = Math.max(0, ally.cooldown - delta);
    if (!target) {
      return { ...ally, cooldown };
    }

    const dx = target.x - ally.x;
    const dy = target.y - ally.y;
    const length = Math.hypot(dx, dy) || 1;
    const visible = hasLineOfSight(ally, target, blockers, mapId);
    const ready = cooldown <= 0;
    const moved = moveAlly(ally, target, blockers, mapId, delta);
    if (ready && visible && length <= allyRange) {
      bullets.push(createAllyBullet(moved, dx / length, dy / length, nextBulletId + bullets.length));
    }

    return { ...moved, facingX: dx / length, facingY: dy / length, cooldown: ready && visible && length <= allyRange ? allyCooldown : cooldown };
  });

  return { allies: nextAllies, bullets };
}

export function damageAllies(
  allies: AllyUnit[],
  bullets: Bullet[],
  players: Record<PlayerId, Player>,
  nextEffectId: number,
): Pick<GameState, 'allies' | 'players' | 'bullets' | 'hitEffects'> {
  const nextPlayers = { ...players };
  const nextAllies = allies.map((ally) => ({ ...ally }));
  const effects: GameState['hitEffects'] = [];
  const activeBullets = bullets.filter((bullet) => {
    const target = nextAllies.find((ally) => (
      ally.owner !== bullet.owner
      && ally.hp > 0
      && Math.hypot(bullet.x - ally.x, bullet.y - ally.y) < BULLET_HIT_SIZE + bullet.size / 10
    ));
    if (!target) {
      return true;
    }

    target.hp = Math.max(0, target.hp - bullet.damage);
    target.respawnTimer = target.hp <= 0 ? allyRespawnSeconds : target.respawnTimer;
    nextPlayers[bullet.owner] = {
      ...nextPlayers[bullet.owner],
      score: target.hp <= 0 ? nextPlayers[bullet.owner].score + 1 : nextPlayers[bullet.owner].score,
    };
    effects.push({ id: nextEffectId + effects.length, x: target.x, y: target.y, kind: 'player', age: 0.32 });
    return false;
  });

  return { allies: nextAllies, players: nextPlayers, bullets: activeBullets, hitEffects: effects };
}

function respawnOrWait(ally: AllyUnit, checkpoints: AllyCheckpoint[], delta: number): AllyUnit {
  const respawnTimer = Math.max(0, ally.respawnTimer - delta);
  const checkpoint = checkpoints.find((item) => item.id === ally.checkpointId && item.hp > 0);
  if (!checkpoint || respawnTimer > 0) {
    return { ...ally, respawnTimer };
  }

  return {
    ...ally,
    hp: allyHp,
    x: checkpoint.x + checkpoint.width / 2,
    y: checkpoint.y + checkpoint.height / 2,
    cooldown: 0.35,
    respawnTimer: 0,
  };
}

function findTarget(
  ally: AllyUnit,
  players: Record<PlayerId, Player>,
  zombies: Zombie[],
  allies: AllyUnit[],
): Target | null {
  const targets: Target[] = [
    ...Object.values(players).map((player) => ({ x: player.x, y: player.y, hp: player.hp, owner: player.id })),
    ...zombies.map((zombie) => ({ x: zombie.x, y: zombie.y, hp: zombie.hp, owner: 'zombie' as const })),
    ...allies,
  ].filter((target) => target.owner !== ally.owner && target.hp > 0);

  return targets
    .sort((a, b) => Math.hypot(a.x - ally.x, a.y - ally.y) - Math.hypot(b.x - ally.x, b.y - ally.y))[0] ?? null;
}

function moveAlly(
  ally: AllyUnit,
  target: Target,
  blockers: Blocker[],
  mapId: GameState['mapId'],
  delta: number,
): AllyUnit {
  const dx = target.x - ally.x;
  const dy = target.y - ally.y;
  const distance = Math.hypot(dx, dy) || 1;
  if (distance <= allyStopDistance) {
    return ally;
  }

  const stepX = (dx / distance) * allySpeed * delta;
  const stepY = (dy / distance) * allySpeed * delta;
  const nextX = isBlockedPlayerPosition(ally.x + stepX, ally.y, mapId, blockers) ? ally.x : ally.x + stepX;
  const nextY = isBlockedPlayerPosition(nextX, ally.y + stepY, mapId, blockers) ? ally.y : ally.y + stepY;
  return { ...ally, x: nextX, y: nextY };
}

function hasLineOfSight(from: AllyUnit, to: Target, blockers: Blocker[], mapId: GameState['mapId']): boolean {
  const steps = 8;
  return Array.from({ length: steps }, (_, index) => (index + 1) / steps).every((progress) => (
    !isPointInsideObstacle(from.x + (to.x - from.x) * progress, from.y + (to.y - from.y) * progress, mapId, blockers)
  ));
}

function createAllyBullet(ally: AllyUnit, dx: number, dy: number, id: number): Bullet {
  return { id, owner: ally.owner, weapon: 'blaster', x: ally.x, y: ally.y, dx, dy, damage: 18, size: 9, bounces: 0, portalCooldown: 0 };
}
