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

const searchByDifficulty: Record<BotDifficulty, number> = {
  easy: 26,
  normal: 38,
  hard: 54,
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

  return {
    up: dy < -1.5,
    down: dy > 1.5,
    left: dx < -1.5,
    right: dx > 1.5,
    shoot: blueDistance < 18 && Math.random() < getShootChance(difficulty),
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
  const scanRadius = searchByDifficulty[difficulty];
  let best: { x: number; y: number; value: number } | null = null;

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const tile = painted.get(`${col}:${row}`);
      if (tile?.owner === 'red') continue;

      const x = col * paintCellSize + paintCellSize / 2;
      const y = row * paintCellSize + paintCellSize / 2;
      const distance = Math.hypot(x - red.x, y - red.y);
      if (distance > scanRadius) continue;

      const repaintBonus = tile?.owner === 'blue' ? 18 : 8;
      const wander = Math.sin(game.elapsedTime * 1.7 + col * 0.9 + row * 1.3) * 4;
      const value = repaintBonus + wander - distance * 0.34;
      if (!best || value > best.value) {
        best = { x, y, value };
      }
    }
  }

  return best ?? chooseFallbackTarget(game.paintTiles ?? [], bounds.width, bounds.height);
}

function chooseFallbackTarget(tiles: PaintTile[], width: number, height: number): { x: number; y: number } {
  const blueTiles = tiles.filter((tile) => tile.owner === 'blue');
  const tile = blueTiles[Math.floor(Math.random() * Math.max(1, blueTiles.length))];
  if (tile) return { x: tile.x + tile.width / 2, y: tile.y + tile.height / 2 };
  return { x: width * 0.5, y: height * 0.5 };
}

function getShootChance(difficulty: BotDifficulty): number {
  if (difficulty === 'hard') return 0.5;
  if (difficulty === 'normal') return 0.24;
  return 0.08;
}
