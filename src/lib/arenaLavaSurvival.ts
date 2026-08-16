import { ARENA_HEIGHT, type Barricade, type GameState, type Player, type PlayerId } from './arenaTypes';

export const lavaMazeWidth = 168;
const mazeCols = 18;
const mazeRows = 7;
const mazeOriginX = 8;
const mazeOriginY = 5;
const mazeWidth = lavaMazeWidth - 16;
const mazeHeight = ARENA_HEIGHT - 10;
const wallWidth = 2.3;
const mazeWallHp = 48;
const lavaDelay = 4;
const lavaSpeed = 2.05;
const exitX = lavaMazeWidth - 7;

export function isLavaSurvivalMode(mode: GameState['mode']): boolean {
  return mode === 'lavaSurvival';
}

export function createLavaMaze(seed = Math.random()): Barricade[] {
  const random = createRandom(seed);
  const cells = carveMaze(random);
  return mazeToWalls(cells, random);
}

export function createLavaSurvivalPlayers(players: Record<PlayerId, Player>): Record<PlayerId, Player> {
  return {
    blue: { ...players.blue, x: 8, y: 20, facingX: 1, facingY: 0 },
    red: { ...players.red, x: 8, y: 44, facingX: 1, facingY: 0 },
  };
}

export function tickLavaSurvival(state: GameState, players: Record<PlayerId, Player>, delta: number): Record<PlayerId, Player> {
  if (!isLavaSurvivalMode(state.mode)) return players;

  const front = getLavaFront(state.elapsedTime);
  return {
    blue: tickRunner(players.blue, front, delta),
    red: tickRunner(players.red, front, delta),
  };
}

export function getLavaFront(elapsedTime: number): number {
  return Math.min(lavaMazeWidth + 8, -7 + Math.max(0, elapsedTime - lavaDelay) * lavaSpeed);
}

export function getLavaExitX(): number {
  return exitX;
}

function tickRunner(player: Player, lavaFront: number, delta: number): Player {
  if (player.score >= 1 || player.hp <= 0) return player;

  const escaped = player.x >= exitX;
  const burning = player.x < lavaFront;
  return {
    ...player,
    score: escaped ? 1 : player.score,
    hp: burning ? Math.max(0, player.hp - 86 * delta) : player.hp,
    burnTimer: burning ? Math.max(player.burnTimer, 1.2) : player.burnTimer,
    speedBoost: escaped ? Math.max(player.speedBoost, 1.5) : player.speedBoost,
  };
}

function createMazeWall(id: number, x: number, y: number, width: number, height: number): Barricade {
  return { id, x, y, width, height, hp: mazeWallHp, variant: 'board' };
}

type MazeCell = {
  col: number;
  row: number;
  visited: boolean;
  walls: { north: boolean; east: boolean; south: boolean; west: boolean };
};

function carveMaze(random: () => number): MazeCell[][] {
  const cells = Array.from({ length: mazeRows }, (_, row) => (
    Array.from({ length: mazeCols }, (_, col) => ({
      col,
      row,
      visited: false,
      walls: { north: true, east: true, south: true, west: true },
    }))
  ));
  const stack: MazeCell[] = [cells[3][0]];
  cells[3][0].visited = true;

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const next = shuffle(neighbors(current, cells).filter((cell) => !cell.visited), random)[0];
    if (!next) {
      stack.pop();
      continue;
    }

    removeWall(current, next);
    next.visited = true;
    stack.push(next);
  }

  addExtraLoops(cells, random);
  return cells;
}

function mazeToWalls(cells: MazeCell[][], random: () => number): Barricade[] {
  const cellW = mazeWidth / mazeCols;
  const cellH = mazeHeight / mazeRows;
  const walls: Barricade[] = [];
  let id = 7000;

  walls.push(createMazeWall(id++, mazeOriginX, mazeOriginY - wallWidth / 2, mazeWidth, wallWidth));
  walls.push(createMazeWall(id++, mazeOriginX, mazeOriginY + mazeHeight - wallWidth / 2, mazeWidth, wallWidth));

  cells.flat().forEach((cell) => {
    const x = mazeOriginX + cell.col * cellW;
    const y = mazeOriginY + cell.row * cellH;
    if (cell.col > 0 && cell.walls.west) {
      walls.push(createMazeWall(id++, x - wallWidth / 2, y, wallWidth, cellH));
    }
    if (cell.row > 0 && cell.walls.north) {
      walls.push(createMazeWall(id++, x, y - wallWidth / 2, cellW, wallWidth));
    }
  });

  return walls.concat(createBrokenColumns(id, random));
}

function createBrokenColumns(startId: number, random: () => number): Barricade[] {
  return Array.from({ length: 10 }, (_, index) => {
    const x = mazeOriginX + 18 + random() * (mazeWidth - 36);
    const y = mazeOriginY + 5 + random() * (mazeHeight - 10);
    return createMazeWall(startId + index, x, y, 3.4 + random() * 3, 2.4 + random() * 5);
  });
}

function neighbors(cell: MazeCell, cells: MazeCell[][]): MazeCell[] {
  return [
    cells[cell.row - 1]?.[cell.col],
    cells[cell.row]?.[cell.col + 1],
    cells[cell.row + 1]?.[cell.col],
    cells[cell.row]?.[cell.col - 1],
  ].filter((item): item is MazeCell => Boolean(item));
}

function removeWall(first: MazeCell, second: MazeCell) {
  if (second.col > first.col) {
    first.walls.east = false;
    second.walls.west = false;
  } else if (second.col < first.col) {
    first.walls.west = false;
    second.walls.east = false;
  } else if (second.row > first.row) {
    first.walls.south = false;
    second.walls.north = false;
  } else {
    first.walls.north = false;
    second.walls.south = false;
  }
}

function addExtraLoops(cells: MazeCell[][], random: () => number) {
  for (let count = 0; count < 16; count += 1) {
    const cell = cells[Math.floor(random() * mazeRows)][Math.floor(random() * mazeCols)];
    const next = shuffle(neighbors(cell, cells), random)[0];
    if (next) removeWall(cell, next);
  }
}

function shuffle<T>(items: T[], random: () => number): T[] {
  return [...items].sort(() => random() - 0.5);
}

function createRandom(seed: number): () => number {
  let value = Math.floor(seed * 1000000) || 9173;
  return () => {
    value = (value * 48271) % 2147483647;
    return value / 2147483647;
  };
}
