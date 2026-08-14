import { getArenaBounds } from './arenaBounds';
import type { GameState, PaintTile, PlayerId } from './arenaTypes';

const paintCellSize = 4;

export function tickPaintBattle(state: GameState): Pick<GameState, 'paintTiles' | 'players'> {
  if (state.mode !== 'paintBattle') {
    return { paintTiles: state.paintTiles, players: state.players };
  }

  const bounds = getArenaBounds(state.mapId);
  const cols = Math.ceil(bounds.width / paintCellSize);
  const rows = Math.ceil(bounds.height / paintCellSize);
  const tileMap = new Map((state.paintTiles ?? []).map((tile) => [tile.id, tile]));

  (['blue', 'red'] as PlayerId[]).forEach((owner) => {
    const player = state.players[owner];
    if (player.hp <= 0) return;
    const col = clamp(Math.floor(player.x / paintCellSize), 0, cols - 1);
    const row = clamp(Math.floor(player.y / paintCellSize), 0, rows - 1);
    const id = `${col}:${row}`;
    tileMap.set(id, {
      id,
      owner,
      x: col * paintCellSize,
      y: row * paintCellSize,
      width: paintCellSize,
      height: paintCellSize,
    });
  });

  const paintTiles = [...tileMap.values()];
  const scores = getPaintScores(paintTiles, cols * rows);
  return {
    paintTiles,
    players: {
      blue: { ...state.players.blue, score: scores.blue },
      red: { ...state.players.red, score: scores.red },
    },
  };
}

export function getPaintBattleWinner(state: GameState): PlayerId | 'draw' {
  const bounds = getArenaBounds(state.mapId);
  const total = Math.ceil(bounds.width / paintCellSize) * Math.ceil(bounds.height / paintCellSize);
  const scores = getPaintScores(state.paintTiles, total);
  if (scores.blue === scores.red) return 'draw';
  return scores.blue > scores.red ? 'blue' : 'red';
}

function getPaintScores(tiles: PaintTile[], total: number): Record<PlayerId, number> {
  const counts = tiles.reduce<Record<PlayerId, number>>((result, tile) => ({
    ...result,
    [tile.owner]: result[tile.owner] + 1,
  }), { blue: 0, red: 0 });

  return {
    blue: Math.round((counts.blue / total) * 1000) / 10,
    red: Math.round((counts.red / total) * 1000) / 10,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
