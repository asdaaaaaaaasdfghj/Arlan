import type { Player, PlayerId, Zombie } from './arenaTypes';

const conversionChance = 0.16;
const convertedZombieHp = 38;

export function spawnSecretZombies(
  before: Record<PlayerId, Player>,
  after: Record<PlayerId, Player>,
  zombies: Zombie[],
  nextZombieId: number,
  enabled: boolean,
): { zombies: Zombie[]; nextZombieId: number } {
  if (!enabled) {
    return { zombies, nextZombieId };
  }

  let id = nextZombieId;
  const spawned: Zombie[] = [];
  (Object.keys(after) as PlayerId[]).forEach((playerId) => {
    if (after[playerId].deathCount <= before[playerId].deathCount || Math.random() > conversionChance) {
      return;
    }

    spawned.push({
      id,
      x: after[playerId].lastDeathX,
      y: after[playerId].lastDeathY,
      hp: convertedZombieHp,
    });
    id += 1;
  });

  return { zombies: [...zombies, ...spawned], nextZombieId: id };
}
