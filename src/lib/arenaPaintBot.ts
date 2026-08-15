import { getArenaBounds } from './arenaBounds';
import { findBotMoveTarget } from './arenaBotPath';
import { paintCellSize } from './arenaPaint';
import type { GameState, PaintTile, PlayerInput } from './arenaTypes';
import type { BotDifficulty } from './gameSettings';

const emptyInput: PlayerInput = {
  up: false,
  down: false,
  left: false,
  right: false,
  shoot: false,
  build: false,
  grenade: false,
  enterVehicle: false,
};

const searchByDifficulty: Record<BotDifficulty, { radius: number; distancePenalty: number }> = {
  easy: { radius: 34, distancePenalty: 0.42 },
  newbie: { radius: 44, distancePenalty: 0.36 },
  normal: { radius: 54, distancePenalty: 0.3 },
  hard: { radius: 74, distancePenalty: 0.22 },
  veryHard: { radius: 94, distancePenalty: 0.14 },
  ultra: { radius: 120, distancePenalty: 0.08 },
};

export function createPaintBotInput(game: GameState, difficulty: BotDifficulty): PlayerInput {
  const red = game.players.red;
  if (red.hp <= 0) return { ...emptyInput };

  const target = choosePaintTarget(game, difficulty);
  if (!target) return { ...emptyInput };

  const moveTarget = findBotMoveTarget(game, red, target);
  const dx = moveTarget.x - red.x;
  const dy = moveTarget.y - red.y;
  const blueDistance = Math.hypot(game.players.blue.x - red.x, game.players.blue.y - red.y);

  const attackPulse = Math.sin(game.elapsedTime * 9 + red.x * 0.17) > 1 - getShootChance(difficulty) * 2;

  return {
    up: dy < -1.5,
    down: dy > 1.5,
    left: dx < -1.5,
    right: dx > 1.5,
    shoot: blueDistance < 16 && attackPulse,
    build: false,
    grenade: false,
    enterVehicle: false,
  };
}

function choosePaintTarget(game: GameState, difficulty: BotDifficulty): { x: number; y: number } | null {
  const red = game.players.red;
  const bounds = getArenaBounds(game.mapId);
  const cols = Math.ceil(bounds.width / paintCellSize);
  const rows = Math.ceil(bounds.height / paintCellSize);
  const painted = new Map((game.paintTiles ?? []).map((tile) => [tile.id, tile]));
  const profile = searchByDifficulty[difficulty];
  const timeBucket = Math.floor(game.elapsedTime / 1.7);
  const stride = cols * rows > 2500 ? 2 : 1;
  let best: { x: number; y: number; value: number } | null = null;

  for (let row = 0; row < rows; row += stride) {
    for (let col = 0; col < cols; col += stride) {
      const tile = painted.get(`${col}:${row}`);
      if (tile?.owner === 'red') continue;

      const x = col * paintCellSize + paintCellSize / 2;
      const y = row * paintCellSize + paintCellSize / 2;
      const distance = Math.hypot(x - red.x, y - red.y);
      const tooFarPenalty = distance > profile.radius ? (distance - profile.radius) * 0.55 : 0;
      const blueDistance = Math.hypot(x - game.players.blue.x, y - game.players.blue.y);
      const repaintBonus = tile?.owner === 'blue' ? 26 : 12;
      const frontierBonus = countNearbyNonRed(col, row, painted) * 3.5;
      const contestBonus = blueDistance < getContestRange(difficulty) ? getContestBonus(difficulty) : 0;
      const stableWander = Math.sin(timeBucket * 2.1 + col * 0.73 + row * 1.11) * 2.5;
      const value = repaintBonus + frontierBonus + contestBonus + stableWander - distance * profile.distancePenalty - tooFarPenalty;

      if (!best || value > best.value) {
        best = { x, y, value };
      }
    }
  }

  return best ?? chooseFallbackTarget(game.paintTiles ?? [], red.x, red.y, bounds.width, bounds.height);
}

function chooseFallbackTarget(tiles: PaintTile[], redX: number, redY: number, width: number, height: number): { x: number; y: number } {
  const blueTiles = tiles.filter((tile) => tile.owner === 'blue');
  const nearest = blueTiles.reduce<PaintTile | null>((best, tile) => {
    if (!best) return tile;
    const bestDistance = Math.hypot(best.x + best.width / 2 - redX, best.y + best.height / 2 - redY);
    const distance = Math.hypot(tile.x + tile.width / 2 - redX, tile.y + tile.height / 2 - redY);
    return distance < bestDistance ? tile : best;
  }, null);

  if (nearest) return { x: nearest.x + nearest.width / 2, y: nearest.y + nearest.height / 2 };
  return redX < width / 2 ? { x: width * 0.75, y: height * 0.5 } : { x: width * 0.25, y: height * 0.5 };
}

function countNearbyNonRed(col: number, row: number, painted: Map<string, PaintTile>): number {
  const offsets = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  return offsets.filter(([dx, dy]) => painted.get(`${col + dx}:${row + dy}`)?.owner !== 'red').length;
}

function getShootChance(difficulty: BotDifficulty): number {
  if (difficulty === 'ultra') return 0.82;
  if (difficulty === 'veryHard') return 0.66;
  if (difficulty === 'hard') return 0.5;
  if (difficulty === 'normal') return 0.24;
  if (difficulty === 'newbie') return 0.14;
  return 0.08;
}

function getContestRange(difficulty: BotDifficulty): number {
  if (difficulty === 'ultra') return 34;
  if (difficulty === 'veryHard') return 28;
  if (difficulty === 'hard') return 22;
  return 18;
}

function getContestBonus(difficulty: BotDifficulty): number {
  if (difficulty === 'ultra') return 24;
  if (difficulty === 'veryHard') return 18;
  if (difficulty === 'hard') return 12;
  return 8;
}
