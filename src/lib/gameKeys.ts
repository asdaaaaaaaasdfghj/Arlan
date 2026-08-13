import type { PlayerId, PlayerInput, WeaponId } from './arenaTypes';

export type KeyBinding = {
  player: PlayerId;
  key: keyof PlayerInput;
};

export type PlayerControls = Record<keyof PlayerInput, string>;
export type ControlBindings = Record<PlayerId, PlayerControls>;

export const defaultControlBindings: ControlBindings = {
  blue: {
    up: 'KeyW',
    down: 'KeyS',
    left: 'KeyA',
    right: 'KeyD',
    shoot: 'Space',
    build: 'KeyE',
    grenade: 'KeyQ',
    enterVehicle: 'KeyF',
  },
  red: {
    up: 'ArrowUp',
    down: 'ArrowDown',
    left: 'ArrowLeft',
    right: 'ArrowRight',
    shoot: 'Enter',
    build: 'ShiftRight',
    grenade: 'Slash',
    enterVehicle: 'Quote',
  },
};

export function normalizeControlBindings(value: Partial<Record<PlayerId, Partial<PlayerControls>>> | undefined): ControlBindings {
  const redEnterVehicle = value?.red?.enterVehicle === 'ShiftLeft' ? 'Quote' : value?.red?.enterVehicle;

  return {
    blue: { ...defaultControlBindings.blue, ...value?.blue },
    red: { ...defaultControlBindings.red, ...value?.red, enterVehicle: redEnterVehicle ?? defaultControlBindings.red.enterVehicle },
  };
}

export const weaponKeyMap: Record<string, { player: PlayerId; weapon: WeaponId }> = {
  Digit1: { player: 'blue', weapon: 'blaster' },
  Digit2: { player: 'blue', weapon: 'railgun' },
  Digit3: { player: 'blue', weapon: 'shotgun' },
  Digit4: { player: 'blue', weapon: 'custom4' },
  Digit5: { player: 'blue', weapon: 'custom5' },
  Digit6: { player: 'red', weapon: 'custom4' },
  Digit7: { player: 'red', weapon: 'custom5' },
  Digit8: { player: 'red', weapon: 'blaster' },
  Digit9: { player: 'red', weapon: 'railgun' },
  Digit0: { player: 'red', weapon: 'shotgun' },
};

export function createKeyMap(controls: ControlBindings): Record<string, KeyBinding> {
  const entries = (Object.keys(controls) as PlayerId[]).flatMap((player) => (
    (Object.keys(controls[player]) as Array<keyof PlayerInput>).map((key) => [
      controls[player][key],
      { player, key },
    ] as const)
  ));

  return Object.fromEntries(entries);
}
