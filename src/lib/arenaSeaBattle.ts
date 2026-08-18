import type { Bullet, PlayerId, Ship } from './arenaTypes';

const shipHp = 260;

export function createSeaBattleShips(): Ship[] {
  return [
    { id: 'blue-ship', owner: 'blue', x: 9, y: 20, width: 30, height: 24, hp: shipHp, maxHp: shipHp },
    { id: 'red-ship', owner: 'red', x: 61, y: 20, width: 30, height: 24, hp: shipHp, maxHp: shipHp },
  ];
}

export function getSeaBattleSpawn(owner: PlayerId): { x: number; y: number } {
  return owner === 'blue' ? { x: 24, y: 32 } : { x: 76, y: 32 };
}

export function damageShipsWithBullets(ships: Ship[], bullets: Bullet[]): { ships: Ship[]; bullets: Bullet[] } {
  if (ships.length <= 0) {
    return { ships, bullets };
  }

  const nextShips = ships.map((ship) => ({ ...ship }));
  const activeBullets = bullets.filter((bullet) => {
    const ship = nextShips.find((item) => item.owner !== bullet.owner && pointInShip(bullet.x, bullet.y, item));
    if (!ship) {
      return true;
    }

    ship.hp = Math.max(0, ship.hp - bullet.damage);
    return false;
  });

  return { ships: nextShips, bullets: activeBullets };
}

export function getSeaBattleWinner(ships: Ship[]): PlayerId | 'draw' | null {
  const blueShip = ships.find((ship) => ship.owner === 'blue');
  const redShip = ships.find((ship) => ship.owner === 'red');
  const blueDestroyed = !blueShip || blueShip.hp <= 0;
  const redDestroyed = !redShip || redShip.hp <= 0;

  if (blueDestroyed && redDestroyed) return 'draw';
  if (blueDestroyed) return 'red';
  if (redDestroyed) return 'blue';
  return null;
}

function pointInShip(x: number, y: number, ship: Ship): boolean {
  return x >= ship.x && x <= ship.x + ship.width && y >= ship.y && y <= ship.y + ship.height;
}
