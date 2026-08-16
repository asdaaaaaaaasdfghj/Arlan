import { BULLET_HIT_SIZE, type Bullet, type GameState, type HitEffect, type Player, type PlayerId, type TimeEcho } from './arenaTypes';

const pastEchoLifetime = 1.8;
const futureEchoLifetime = 0.9;
const echoStepSeconds = 0.25;
const paradoxDamage = 28;

export function isTimeDuelMode(mode: GameState['mode']): boolean {
  return mode === 'timeDuel';
}

export function tickTimeEchoes(state: GameState, players: Record<PlayerId, Player>, elapsedTime: number, delta: number): TimeEcho[] {
  if (!isTimeDuelMode(state.mode)) return [];

  const agedPast = state.timeEchoes
    .filter((echo) => echo.phase === 'past')
    .map((echo) => ({ ...echo, age: echo.age - delta }))
    .filter((echo) => echo.age > 0);
  const shouldRecord = Math.floor(state.elapsedTime / echoStepSeconds) !== Math.floor(elapsedTime / echoStepSeconds);
  const nextPast = shouldRecord ? [...agedPast, ...createPastEchoes(players, elapsedTime)] : agedPast;

  return [...nextPast.slice(-18), ...createFutureEchoes(players, elapsedTime)];
}

export function applyTimeParadoxHits(
  players: Record<PlayerId, Player>,
  bullets: Bullet[],
  echoes: TimeEcho[],
  nextEffectId: number,
): { players: Record<PlayerId, Player>; bullets: Bullet[]; effects: HitEffect[] } {
  if (echoes.length === 0) {
    return { players, bullets, effects: [] };
  }

  const nextPlayers = { ...players };
  const effects: HitEffect[] = [];
  const activeBullets = bullets.filter((bullet) => {
    const echo = echoes.find((item) => (
      item.owner === bullet.owner
      && Math.hypot(bullet.x - item.x, bullet.y - item.y) < BULLET_HIT_SIZE + bullet.size / 10
    ));
    if (!echo) return true;

    const owner = nextPlayers[bullet.owner];
    nextPlayers[bullet.owner] = {
      ...owner,
      hp: Math.max(1, owner.hp - paradoxDamage),
      shockTimer: Math.max(owner.shockTimer, 0.55),
    };
    effects.push({ id: nextEffectId + effects.length, x: echo.x, y: echo.y, kind: 'player', age: 0.32 });
    return false;
  });

  return { players: nextPlayers, bullets: activeBullets, effects };
}

function createPastEchoes(players: Record<PlayerId, Player>, elapsedTime: number): TimeEcho[] {
  return (Object.keys(players) as PlayerId[]).map((id, index) => ({
    id: Math.round(elapsedTime * 1000) * 10 + index,
    owner: id,
    x: players[id].x,
    y: players[id].y,
    facingX: players[id].facingX,
    facingY: players[id].facingY,
    age: pastEchoLifetime,
    phase: 'past',
  }));
}

function createFutureEchoes(players: Record<PlayerId, Player>, elapsedTime: number): TimeEcho[] {
  return (Object.keys(players) as PlayerId[]).flatMap((id, ownerIndex) => [1, 2].map((step) => {
    const player = players[id];
    return {
      id: 900000 + Math.round(elapsedTime * 10) * 10 + ownerIndex * 2 + step,
      owner: id,
      x: player.x + player.facingX * (8 + step * 7),
      y: player.y + player.facingY * (8 + step * 7),
      facingX: player.facingX,
      facingY: player.facingY,
      age: futureEchoLifetime - step * 0.18,
      phase: 'future',
    };
  }));
}
