import type { GameInput, GameMode } from './arenaTypes';

export const survivalGraceSeconds = 24;

export function isSurvivalGrace(mode: GameMode, elapsedTime: number): boolean {
  return mode === 'craftSurvival' && elapsedTime < survivalGraceSeconds;
}

export function lockSurvivalWeapons(input: GameInput): GameInput {
  return {
    blue: { ...input.blue, shoot: false, grenade: false },
    red: { ...input.red, shoot: false, grenade: false },
  };
}
