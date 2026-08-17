import type { Bullet, GameMode, MapId, Player, PlayerId, RoundMutation, RoundMutationId } from './arenaTypes';
import type { PlayerMechanics } from './arenaPlayers';

const mutationIds: Exclude<RoundMutationId, 'none'>[] = ['speedRush', 'slipperyArena', 'bigBullets', 'rapidFire', 'tinyPlayers'];

export function createRoundMutation(enabled: boolean, mode: GameMode, mapId: MapId): RoundMutation {
  if (!enabled || mode === 'miniGames') return { id: 'none', seed: 0 };
  const seed = Math.floor(Math.random() * 100000);
  return { id: mutationIds[(seed + mode.length + mapId.length) % mutationIds.length], seed };
}

export function applyMutationToMechanics(mechanics: PlayerMechanics, mutation: RoundMutation): PlayerMechanics {
  if (mutation.id === 'speedRush') return { ...mechanics, speedMultiplier: 1.28 };
  if (mutation.id === 'slipperyArena') return { ...mechanics, forceIce: true, speedMultiplier: 0.94 };
  if (mutation.id === 'tinyPlayers') return { ...mechanics, speedMultiplier: 1.16 };
  return mechanics;
}

export function applyMutationToBullets(bullets: Bullet[], mutation: RoundMutation): Bullet[] {
  if (mutation.id !== 'bigBullets') return bullets;
  return bullets.map((bullet) => ({ ...bullet, size: bullet.size * 1.85, damage: Math.round(bullet.damage * 1.12) }));
}

export function applyMutationToCooldowns(players: Record<PlayerId, Player>, mutation: RoundMutation): Record<PlayerId, Player> {
  if (mutation.id !== 'rapidFire') return players;
  return {
    blue: { ...players.blue, cooldown: players.blue.cooldown * 0.46 },
    red: { ...players.red, cooldown: players.red.cooldown * 0.46 },
  };
}

export function getMutationScale(mutation: RoundMutation): number {
  return mutation.id === 'tinyPlayers' ? 0.72 : 1;
}

export function getMutationName(mutation: RoundMutation, language: string): string {
  const ru: Record<RoundMutationId, string> = {
    none: 'Без мутации',
    speedRush: 'Скоростной раунд',
    slipperyArena: 'Скользкая арена',
    bigBullets: 'Огромные пули',
    rapidFire: 'Быстрая стрельба',
    tinyPlayers: 'Мелкие бойцы',
  };
  const en: Record<RoundMutationId, string> = {
    none: 'No mutation',
    speedRush: 'Speed rush',
    slipperyArena: 'Slippery arena',
    bigBullets: 'Big bullets',
    rapidFire: 'Rapid fire',
    tinyPlayers: 'Tiny fighters',
  };
  return (language === 'ru' ? ru : en)[mutation.id];
}

export function getMutationDescription(mutation: RoundMutation, language: string): string {
  const ru: Record<RoundMutationId, string> = {
    none: '',
    speedRush: 'все бегают быстрее',
    slipperyArena: 'вся карта как лёд',
    bigBullets: 'пули крупнее и больнее',
    rapidFire: 'перезарядка почти в два раза быстрее',
    tinyPlayers: 'игроки меньше и чуть быстрее',
  };
  const en: Record<RoundMutationId, string> = {
    none: '',
    speedRush: 'everyone moves faster',
    slipperyArena: 'the whole arena feels like ice',
    bigBullets: 'bullets are larger and meaner',
    rapidFire: 'reloads are almost twice as fast',
    tinyPlayers: 'fighters are smaller and a little quicker',
  };
  return (language === 'ru' ? ru : en)[mutation.id];
}
