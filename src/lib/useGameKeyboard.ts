import { useEffect, useRef } from 'react';
import type { GameStatus, MapId, PlayerId, PlayerInput, WeaponId } from './arenaTypes';
import { isCustomOnlyWeapon } from './arenaWeapons';
import { createKeyMap, type ControlBindings, weaponKeyMap } from './gameKeys';

type UseGameKeyboardOptions = {
  status: GameStatus;
  mapId: MapId;
  onRestart: () => void;
  onStart: () => void;
  onPress: (player: PlayerId, key: keyof PlayerInput, pressed: boolean) => void;
  onWeaponChange: (player: PlayerId, weapon: WeaponId) => void;
  controls: ControlBindings;
};

export function useGameKeyboard({
  status,
  mapId,
  onRestart,
  onStart,
  onPress,
  onWeaponChange,
  controls,
}: UseGameKeyboardOptions) {
  const restartPressedAtRef = useRef(0);

  useEffect(() => {
    const keyMap = createKeyMap(controls);

    function handleKey(event: KeyboardEvent, pressed: boolean) {
      if (isTypingTarget(event.target)) {
        return;
      }

      const binding = keyMap[event.code];
      if (!binding) {
        return;
      }

      event.preventDefault();
      onPress(binding.player, binding.key, pressed);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (isTypingTarget(event.target)) {
        return;
      }

      if (event.code === 'KeyR' && status !== 'ready') {
        event.preventDefault();
        if (event.repeat) {
          return;
        }

        const now = Date.now();
        if (now - restartPressedAtRef.current < 1300) {
          restartPressedAtRef.current = 0;
          onRestart();
          return;
        }

        restartPressedAtRef.current = now;
        return;
      }

      if (event.code === 'Space' && status === 'ready') {
        onStart();
      }

      const weaponBinding = weaponKeyMap[event.code];
      if (weaponBinding) {
        event.preventDefault();
        if (isCustomOnlyWeapon(weaponBinding.weapon) && mapId !== 'custom') {
          return;
        }

        onWeaponChange(weaponBinding.player, weaponBinding.weapon);
      }

      handleKey(event, true);
    }

    function handleKeyUp(event: KeyboardEvent) {
      if (isTypingTarget(event.target)) {
        return;
      }

      handleKey(event, false);
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [controls, mapId, onPress, onRestart, onStart, onWeaponChange, status]);
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
}
