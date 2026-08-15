import { isBlockedPlayerPosition, type Blocker } from './arenaMap';
import { getArenaBounds } from './arenaBounds';
import type { GameState, MapId } from './arenaTypes';

type Point = {
  x: number;
  y: number;
};

type Cell = {
  col: number;
  row: number;
};

const pathCellSize = 5.2;
const directions: Cell[] = [
  { col: 1, row: 0 },
  { col: -1, row: 0 },
  { col: 0, row: 1 },
  { col: 0, row: -1 },
];

export function findBotMoveTarget(game: GameState, from: Point, to: Point): Point {
  return findBotMoveTargetWithBlockers(game.mapId, from, to, [
    ...game.barricades,
    ...game.mapBoards,
    ...game.movingBlocks,
    ...game.tnts.filter((tnt) => tnt.active),
    ...game.ricochetBlocks,
  ]);
}

export function findBotMoveTargetWithBlockers(mapId: MapId, from: Point, to: Point, blockers: Blocker[]): Point {
  const grid = createGrid(mapId);
  const start = pointToCell(from, grid);
  const goal = pointToCell(to, grid);
  const queue: Cell[] = [start];
  const visited = new Set([cellKey(start)]);
  const cameFrom = new Map<string, Cell>();

  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    if (sameCell(current, goal)) {
      return cellToPoint(firstStep(start, current, cameFrom), grid);
    }

    directions.forEach((direction) => {
      const next = { col: current.col + direction.col, row: current.row + direction.row };
      const key = cellKey(next);

      if (visited.has(key) || isBlockedCell(mapId, next, grid, blockers)) {
        return;
      }

      visited.add(key);
      cameFrom.set(key, current);
      queue.push(next);
    });
  }

  return to;
}

function firstStep(start: Cell, goal: Cell, cameFrom: Map<string, Cell>): Cell {
  let current = goal;
  let previous = cameFrom.get(cellKey(current));

  while (previous && !sameCell(previous, start)) {
    current = previous;
    previous = cameFrom.get(cellKey(current));
  }

  return current;
}

function isBlockedCell(mapId: MapId, cell: Cell, grid: PathGrid, blockers: Blocker[]): boolean {
  if (cell.col < 0 || cell.col >= grid.cols || cell.row < 0 || cell.row >= grid.rows) {
    return true;
  }

  const point = cellToPoint(cell, grid);
  return isBlockedPlayerPosition(point.x, point.y, mapId, blockers);
}

function pointToCell(point: Point, grid: PathGrid): Cell {
  return {
    col: clamp(Math.floor(point.x / grid.cellWidth), 0, grid.cols - 1),
    row: clamp(Math.floor(point.y / grid.cellHeight), 0, grid.rows - 1),
  };
}

function cellToPoint(cell: Cell, grid: PathGrid): Point {
  return {
    x: cell.col * grid.cellWidth + grid.cellWidth / 2,
    y: cell.row * grid.cellHeight + grid.cellHeight / 2,
  };
}

type PathGrid = {
  cols: number;
  rows: number;
  cellWidth: number;
  cellHeight: number;
};

function createGrid(mapId: MapId): PathGrid {
  const bounds = getArenaBounds(mapId);
  const cols = Math.max(20, Math.ceil(bounds.width / pathCellSize));
  const rows = Math.max(12, Math.ceil(bounds.height / pathCellSize));
  return {
    cols,
    rows,
    cellWidth: bounds.width / cols,
    cellHeight: bounds.height / rows,
  };
}

function cellKey(cell: Cell): string {
  return `${cell.col}:${cell.row}`;
}

function sameCell(first: Cell, second: Cell): boolean {
  return first.col === second.col && first.row === second.row;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
