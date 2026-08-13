import type { MagnetBlock, MapId } from './arenaTypes';
import { loadCustomMagnets } from './customMap';

type Point = { x: number; y: number };
type MagnetTarget = 'players' | 'bullets' | 'grenades';

export function getMagnetMove(point: Point, mapId: MapId, delta: number, target: MagnetTarget, magnets?: MagnetBlock[]): Point {
  if (mapId !== 'custom') {
    return { x: 0, y: 0 };
  }

  return (magnets ?? loadCustomMagnets())
    .filter((magnet) => affectsTarget(magnet, target))
    .reduce((move, magnet) => addMagnetMove(move, point, magnet, delta), { x: 0, y: 0 });
}

function affectsTarget(magnet: MagnetBlock, target: MagnetTarget): boolean {
  if (target === 'bullets') return magnet.affectBullets;
  if (target === 'grenades') return magnet.affectGrenades;
  return true;
}

function addMagnetMove(move: Point, point: Point, magnet: MagnetBlock, delta: number): Point {
  const centerX = magnet.x + magnet.width / 2;
  const centerY = magnet.y + magnet.height / 2;
  const dx = centerX - point.x;
  const dy = centerY - point.y;
  const distance = Math.hypot(dx, dy);
  if (distance <= 0.1 || distance > magnet.radius) {
    return move;
  }

  const direction = magnet.kind === 'pull' ? 1 : -1;
  const strength = (1 - distance / magnet.radius) * magnet.force * delta * direction;
  return {
    x: move.x + (dx / distance) * strength,
    y: move.y + (dy / distance) * strength,
  };
}
