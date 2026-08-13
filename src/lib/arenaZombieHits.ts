import {
  type Bullet,
  type HitEffect,
  type Player,
  type PlayerId,
  type Zombie,
} from './arenaTypes';

const ZOMBIE_HIT_SIZE = 4.6;

export function applyZombieHits(
  zombies: Zombie[],
  bullets: Bullet[],
  players: Record<PlayerId, Player>,
  nextEffectId: number,
): { zombies: Zombie[]; bullets: Bullet[]; players: Record<PlayerId, Player>; effects: HitEffect[] } {
  const nextZombies = [...zombies];
  const nextPlayers = { ...players };
  const effects: HitEffect[] = [];
  const activeBullets = bullets.filter((bullet) => {
    const index = nextZombies.findIndex((zombie) => (
      Math.hypot(bullet.x - zombie.x, bullet.y - zombie.y) < ZOMBIE_HIT_SIZE + bullet.size / 10
    ));

    if (index < 0) {
      return true;
    }

    const zombie = nextZombies[index];
    effects.push({ id: nextEffectId + effects.length, x: zombie.x, y: zombie.y, kind: 'zombie', age: 0.32 });
    const hp = zombie.hp - bullet.damage;
    if (hp <= 0) {
      nextZombies.splice(index, 1);
      nextPlayers[bullet.owner] = {
        ...nextPlayers[bullet.owner],
        score: nextPlayers[bullet.owner].score + 1,
      };
    } else {
      nextZombies[index] = { ...zombie, hp };
    }

    return false;
  });

  return { zombies: nextZombies, bullets: activeBullets, players: nextPlayers, effects };
}
