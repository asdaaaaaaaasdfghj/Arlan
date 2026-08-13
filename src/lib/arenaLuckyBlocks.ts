import type { Barricade, GameMode, MapId } from './arenaTypes';

const luckySpawnSeconds = 4;
const maxLuckyBlocks = 7;
const luckyHp = 55;
const spawnPoints = [
  { x: 47, y: 10 },
  { x: 47, y: 50 },
  { x: 28, y: 19 },
  { x: 66, y: 19 },
  { x: 28, y: 41 },
  { x: 66, y: 41 },
  { x: 47, y: 29 },
];

export function createLuckyBlocks(mode: GameMode, mapId: MapId): Barricade[] {
  if (mode !== 'luckyBlocks') {
    return [];
  }

  return spawnPoints.slice(0, mapId === 'open' ? 5 : 4).map((point, index) => createLuckyBlock(7000 + index, point.x, point.y));
}

export function tickLuckyBlocks(
  mode: GameMode,
  mapBoards: Barricade[],
  previousElapsed: number,
  elapsed: number,
  nextId: number,
): { mapBoards: Barricade[]; nextId: number } {
  if (mode !== 'luckyBlocks') {
    return { mapBoards, nextId };
  }

  const currentLuckyCount = mapBoards.filter((board) => board.variant === 'lucky').length;
  const shouldSpawn = Math.floor(previousElapsed / luckySpawnSeconds) < Math.floor(elapsed / luckySpawnSeconds);
  if (!shouldSpawn || currentLuckyCount >= maxLuckyBlocks) {
    return { mapBoards, nextId };
  }

  const point = spawnPoints[Math.floor(elapsed / luckySpawnSeconds) % spawnPoints.length];
  if (mapBoards.some((board) => board.variant === 'lucky' && Math.hypot(board.x - point.x, board.y - point.y) < 5)) {
    return { mapBoards, nextId };
  }

  const id = Math.max(nextId, 8000 + Math.floor(elapsed / luckySpawnSeconds));
  return { mapBoards: [...mapBoards, createLuckyBlock(id, point.x, point.y)], nextId: id + 1 };
}

function createLuckyBlock(id: number, x: number, y: number): Barricade {
  return { id, x, y, width: 6, height: 6, hp: luckyHp, variant: 'lucky' };
}
