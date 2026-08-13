import {
  PLAYER_SIZE,
  ZOMBIE_SIZE,
  type MapId,
  type Obstacle,
} from './arenaTypes';
import { arenaMaps, mapNames, mapOrder, mapSpawns, type SpawnPoint } from './arenaMapData';
import { loadCustomMap, loadCustomSolidDecorations } from './customMap';
import { getArenaBounds } from './arenaBounds';

const PLAYER_RADIUS = PLAYER_SIZE / 2;
const ZOMBIE_RADIUS = ZOMBIE_SIZE / 2;

export type Blocker = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export { mapNames, mapOrder };

export function getMapObstacles(mapId: MapId): Obstacle[] {
  if (mapId === 'custom') {
    return loadCustomMap();
  }

  return arenaMaps[mapId];
}

export function getMapSpawn(mapId: MapId, player: 'blue' | 'red'): SpawnPoint {
  if (mapId === 'custom') {
    const bounds = getArenaBounds(mapId);
    return {
      x: player === 'blue' ? 12 : bounds.width - 12,
      y: bounds.height / 2,
    };
  }

  return mapSpawns[mapId][player];
}

export function isBlockedPlayerPosition(
  x: number,
  y: number,
  mapId: MapId,
  barricades: Blocker[] = [],
): boolean {
  const bounds = getArenaBounds(mapId);
  if (x < 4 || x > bounds.width - 4 || y < 4 || y > bounds.height - 4) {
    return true;
  }

  return getBlockers(mapId, barricades).some((obstacle) => circleHitsRect(x, y, PLAYER_RADIUS, obstacle));
}

export function isBlockedZombiePosition(
  x: number,
  y: number,
  mapId: MapId,
  barricades: Blocker[] = [],
): boolean {
  const bounds = getArenaBounds(mapId);
  if (x < 3 || x > bounds.width - 3 || y < 3 || y > bounds.height - 3) {
    return true;
  }

  return getBlockers(mapId, barricades).some((obstacle) => circleHitsRect(x, y, ZOMBIE_RADIUS, obstacle));
}

export function isPointInsideObstacle(
  x: number,
  y: number,
  mapId: MapId,
  barricades: Blocker[] = [],
): boolean {
  return getBlockers(mapId, barricades).some((obstacle) => (
    x >= obstacle.x
    && x <= obstacle.x + obstacle.width
    && y >= obstacle.y
    && y <= obstacle.y + obstacle.height
  ));
}

export function rectOverlapsBlockers(rect: Blocker, mapId: MapId, barricades: Blocker[] = []): boolean {
  return getBlockers(mapId, barricades).some((obstacle) => rectanglesOverlap(rect, obstacle));
}

function getBlockers(mapId: MapId, barricades: Blocker[]): Blocker[] {
  const solidDecorations = mapId === 'custom' ? loadCustomSolidDecorations() : [];
  return [...getMapObstacles(mapId), ...solidDecorations, ...barricades];
}

function circleHitsRect(x: number, y: number, radius: number, obstacle: Blocker): boolean {
  const closestX = clamp(x, obstacle.x, obstacle.x + obstacle.width);
  const closestY = clamp(y, obstacle.y, obstacle.y + obstacle.height);

  return Math.hypot(x - closestX, y - closestY) < radius;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function rectanglesOverlap(first: Blocker, second: Blocker): boolean {
  return (
    first.x < second.x + second.width
    && first.x + first.width > second.x
    && first.y < second.y + second.height
    && first.y + first.height > second.y
  );
}
