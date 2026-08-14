import { getArenaBounds } from './arenaBounds';
import { isBlockedPlayerPosition } from './arenaMap';
import { respawnPlayer } from './arenaPlayers';
import type { FloorHole, GameInput, GameState, MapId, Player, PlayerId } from './arenaTypes';

const floorCellSize = 6;

export function tickFloorModes(state: GameState, input: GameInput): Pick<GameState, 'players' | 'floorHoles'> {
  if (state.mode !== 'spleef' && state.mode !== 'tileRun') {
    return { players: state.players, floorHoles: state.floorHoles ?? [] };
  }

  const holes = new Map((state.floorHoles ?? []).map((hole) => [hole.id, { ...hole, age: hole.age + 1 }]));
  let players = { ...state.players };

  if (state.mode === 'tileRun') {
    (['blue', 'red'] as PlayerId[]).forEach((id) => {
      const player = players[id];
      const cellId = getCellId(player);
      if (player.hp > 0 && !holes.has(cellId)) {
        holes.set(cellId, createHole(player, id, state.mapId));
      }
    });
  }

  if (state.mode === 'spleef') {
    (['blue', 'red'] as PlayerId[]).forEach((id) => {
      if (input[id].shoot) {
        const target = getSpleefTarget(players[id], players[id === 'blue' ? 'red' : 'blue']);
        holes.set(getCellId(target), createHole(target, id, state.mapId));
      }
    });
  }

  (['blue', 'red'] as PlayerId[]).forEach((id) => {
    const player = players[id];
    const hole = holes.get(getCellId(player));
    if (!hole || hole.age < 2 || isBlockedPlayerPosition(player.x, player.y, state.mapId, state.barricades)) return;
    const scorer: PlayerId = id === 'blue' ? 'red' : 'blue';
    players = {
      ...players,
      [id]: respawnPlayer(player, state.mapId),
      [scorer]: { ...players[scorer], score: players[scorer].score + 1 },
    };
  });

  return { players, floorHoles: [...holes.values()].slice(-420) };
}

function getSpleefTarget(player: Player, enemy: Player): Pick<Player, 'x' | 'y'> {
  const dx = enemy.x - player.x;
  const dy = enemy.y - player.y;
  const distance = Math.hypot(dx, dy);
  const facing = Math.hypot(player.facingX, player.facingY) || 1;
  const dot = (dx / (distance || 1)) * (player.facingX / facing) + (dy / (distance || 1)) * (player.facingY / facing);
  if (enemy.hp > 0 && distance < 46 && dot > 0.35) return enemy;
  return { x: player.x + player.facingX * 18, y: player.y + player.facingY * 18 };
}

function createHole(point: Pick<Player, 'x' | 'y'>, owner: PlayerId | null, mapId: MapId): FloorHole {
  const bounds = getArenaBounds(mapId);
  const col = Math.max(0, Math.floor(point.x / floorCellSize));
  const row = Math.max(0, Math.floor(point.y / floorCellSize));
  return {
    id: `${col}:${row}`,
    owner,
    age: 0,
    x: Math.min(bounds.width - floorCellSize, col * floorCellSize),
    y: Math.min(bounds.height - floorCellSize, row * floorCellSize),
    width: floorCellSize,
    height: floorCellSize,
  };
}

function getCellId(point: Pick<Player, 'x' | 'y'>): string {
  return `${Math.floor(point.x / floorCellSize)}:${Math.floor(point.y / floorCellSize)}`;
}
