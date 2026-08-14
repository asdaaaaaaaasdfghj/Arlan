import type { GameState, WeaponId } from './arenaTypes';

export const miniGameDuration = 30;

export type MiniGameRule = {
  id: string;
  name: string;
  description: string;
  weapon: WeaponId;
  sword: boolean;
};

export const miniGameRules: MiniGameRule[] = [
  { id: 'blaster', name: 'Blaster Tag', description: 'Classic chase round.', weapon: 'blaster', sword: false },
  { id: 'rail', name: 'Rail Panic', description: 'Railguns only.', weapon: 'railgun', sword: false },
  { id: 'shotgun', name: 'Shotgun Room', description: 'Close-range chaos.', weapon: 'shotgun', sword: false },
  { id: 'flame', name: 'Fire Walk', description: 'Flamethrowers only.', weapon: 'flamethrower', sword: false },
  { id: 'swords', name: 'Sword Dash', description: 'No guns, only blades.', weapon: 'blaster', sword: true },
  { id: 'grenades', name: 'Grenade Sprint', description: 'Fast grenades, keep moving.', weapon: 'blaster', sword: false },
  { id: 'termos', name: 'Termos Storm', description: 'All directions, no mercy.', weapon: 'termos', sword: false },
  { id: 'rail2', name: 'Laser Hall', description: 'Another railgun burst.', weapon: 'railgun', sword: false },
  { id: 'flame2', name: 'Hot Finale Prep', description: 'Burn paths open.', weapon: 'flamethrower', sword: false },
  { id: 'final', name: 'Final Blaster', description: 'Last 30 seconds decides it.', weapon: 'blaster', sword: false },
];

export function isMiniGamesMode(stateOrMode: GameState | GameState['mode']): boolean {
  return typeof stateOrMode === 'string' ? stateOrMode === 'miniGames' : stateOrMode.mode === 'miniGames';
}

export function getMiniGameIndex(elapsedTime: number): number {
  return Math.min(miniGameRules.length - 1, Math.max(0, Math.floor(elapsedTime / miniGameDuration)));
}

export function getMiniGameRule(state: GameState): MiniGameRule {
  return miniGameRules[getMiniGameIndex(state.elapsedTime)];
}

export function getMiniGameWeapon(state: GameState): WeaponId {
  return getMiniGameRule(state).weapon;
}

export function lockMiniGameWeapons(state: GameState): GameState['players'] {
  if (!isMiniGamesMode(state)) return state.players;
  const weapon = getMiniGameWeapon(state);
  return {
    blue: { ...state.players.blue, weapon },
    red: { ...state.players.red, weapon },
  };
}
