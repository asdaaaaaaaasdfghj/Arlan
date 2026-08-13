import type { MapId, WeaponId } from './arenaTypes';
import { loadCustomWeapons } from './customMap';

export type WeaponConfig = {
  id: WeaponId;
  name: string;
  cooldown: number;
  damage: number;
  speed: number;
  bullets: number;
  spread: number;
  size: number;
};

export const weaponConfigs: Record<WeaponId, WeaponConfig> = {
  blaster: {
    id: 'blaster',
    name: 'Blaster',
    cooldown: 0.42,
    damage: 16,
    speed: 74,
    bullets: 1,
    spread: 0,
    size: 10,
  },
  railgun: {
    id: 'railgun',
    name: 'Railgun',
    cooldown: 1.1,
    damage: 42,
    speed: 108,
    bullets: 1,
    spread: 0,
    size: 8,
  },
  shotgun: {
    id: 'shotgun',
    name: 'Shotgun',
    cooldown: 0.85,
    damage: 13,
    speed: 60,
    bullets: 3,
    spread: 0.28,
    size: 11,
  },
  custom4: {
    id: 'custom4',
    name: 'Custom 4',
    cooldown: 0.55,
    damage: 20,
    speed: 76,
    bullets: 1,
    spread: 0,
    size: 10,
  },
  custom5: {
    id: 'custom5',
    name: 'Custom 5',
    cooldown: 0.95,
    damage: 12,
    speed: 62,
    bullets: 5,
    spread: 0.22,
    size: 9,
  },
  termos: {
    id: 'termos',
    name: 'WO997 Termos',
    cooldown: 0,
    damage: 10,
    speed: 82,
    bullets: 16,
    spread: 0,
    size: 9,
  },
};

export const weaponOrder: WeaponId[] = ['blaster', 'railgun', 'shotgun'];
export const customWeaponOrder: WeaponId[] = ['blaster', 'railgun', 'shotgun', 'custom4', 'custom5'];

export function getWeaponOrder(mapId: MapId): WeaponId[] {
  return mapId === 'custom' ? customWeaponOrder : weaponOrder;
}

export function isCustomOnlyWeapon(id: WeaponId): boolean {
  return id === 'custom4' || id === 'custom5';
}

export function getWeaponConfig(id: WeaponId, mapId: MapId): WeaponConfig {
  if (mapId !== 'custom' || id === 'termos') {
    return weaponConfigs[id];
  }

  return { ...weaponConfigs[id], ...loadCustomWeapons()[id] };
}
