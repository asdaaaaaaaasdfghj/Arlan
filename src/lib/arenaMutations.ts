import type { Bullet, GameMode, MapId, Player, PlayerId, RoundMutation, RoundMutationId } from './arenaTypes';
import type { PlayerMechanics } from './arenaPlayers';

const mutationIds: Exclude<RoundMutationId, 'none' | 'slipperyArena' | 'bigBullets'>[] = ['speedRush', 'rapidFire', 'tinyPlayers'];
const mutationInterval = 15;
const maxStackedMutations = 12;

export function createRoundMutation(enabled: boolean, mode: GameMode, mapId: MapId): RoundMutation {
  if (!enabled || mode === 'miniGames' || mode === 'mutationStorm') return { id: 'none', seed: 0 };
  const seed = Math.floor(Math.random() * 100000);
  return { id: mutationIds[(seed + mode.length + mapId.length) % mutationIds.length], seed };
}

export function tickStackedMutations(mode: GameMode, elapsedTime: number, activeMutations: RoundMutation[]): {
  mutation: RoundMutation;
  activeMutations: RoundMutation[];
} {
  if (mode !== 'mutationStorm') {
    return { mutation: activeMutations[activeMutations.length - 1] ?? { id: 'none', seed: 0 }, activeMutations };
  }

  const targetCount = Math.min(maxStackedMutations, Math.floor(elapsedTime / mutationInterval) + 1);
  if (activeMutations.length >= targetCount) {
    return { mutation: activeMutations[activeMutations.length - 1] ?? { id: 'none', seed: 0 }, activeMutations };
  }

  const nextMutations = [...activeMutations];
  while (nextMutations.length < targetCount) {
    const seed = 3000 + nextMutations.length * 811;
    nextMutations.push({ id: mutationIds[(seed + nextMutations.length) % mutationIds.length], seed });
  }

  return {
    mutation: nextMutations[nextMutations.length - 1] ?? { id: 'none', seed: 0 },
    activeMutations: nextMutations,
  };
}

export function applyMutationToMechanics(mechanics: PlayerMechanics, mutation: RoundMutation | RoundMutation[]): PlayerMechanics {
  return toMutationList(mutation).reduce((next, item) => {
    if (item.id === 'speedRush') return { ...next, speedMultiplier: (next.speedMultiplier ?? 1) * 1.18 };
    if (item.id === 'slipperyArena') return { ...next, speedMultiplier: (next.speedMultiplier ?? 1) * 0.94 };
    if (item.id === 'tinyPlayers') return { ...next, speedMultiplier: (next.speedMultiplier ?? 1) * 1.08 };
    return next;
  }, mechanics);
}

export function applyMutationToBullets(bullets: Bullet[], mutation: RoundMutation | RoundMutation[]): Bullet[] {
  if (!toMutationList(mutation).some((item) => item.id === 'bigBullets')) return bullets;
  return bullets;
}

export function applyMutationToCooldowns(players: Record<PlayerId, Player>, mutation: RoundMutation | RoundMutation[]): Record<PlayerId, Player> {
  const rapidCount = toMutationList(mutation).filter((item) => item.id === 'rapidFire').length;
  if (rapidCount <= 0) return players;
  const multiplier = Math.max(0.16, 0.72 ** rapidCount);
  return {
    blue: { ...players.blue, cooldown: players.blue.cooldown * multiplier },
    red: { ...players.red, cooldown: players.red.cooldown * multiplier },
  };
}

export function getMutationScale(mutation: RoundMutation | RoundMutation[]): number {
  const tinyCount = toMutationList(mutation).filter((item) => item.id === 'tinyPlayers').length;
  return Math.max(0.5, 0.82 ** tinyCount);
}

export function getMutationCountText(mutations: RoundMutation[], language: string): string {
  if (mutations.length <= 0) return '';
  return language === 'ru' ? `Активно: ${mutations.length}` : `Active: ${mutations.length}`;
}

function toMutationList(mutation: RoundMutation | RoundMutation[]): RoundMutation[] {
  return Array.isArray(mutation) ? mutation : mutation.id === 'none' ? [] : [mutation];
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
