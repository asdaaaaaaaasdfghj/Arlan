import type { Player, Zombie } from './arenaTypes';
import { isHiddenInGrass } from './customMap';

type BotTarget = Player | Zombie;

export function cannotSeeInGrass(from: Player, to: Player, mapId: string): boolean {
  return mapId === 'custom' && isHiddenInGrass(to.x, to.y) && Math.hypot(from.x - to.x, from.y - to.y) > 12;
}

export function canSeeWhilePoisoned(from: Player, to: BotTarget): boolean {
  return from.poisonTimer <= 0 || Math.hypot(from.x - to.x, from.y - to.y) <= 16;
}
