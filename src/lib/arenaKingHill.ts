import { loadCustomHillZones } from './customMap';
import type { GameMode, MapId, Player, PlayerId } from './arenaTypes';

export const hillZone = {
  x: 50,
  y: 32,
  radius: 11,
};

export function tickKingHill(
  players: Record<PlayerId, Player>,
  mode: GameMode,
  mapId: MapId,
  delta: number,
): Record<PlayerId, Player> {
  if (mode !== 'kingHill') {
    return players;
  }

  const zone = getHillZone(mapId);
  const blueInside = isPlayerInHill(players.blue, zone);
  const redInside = isPlayerInHill(players.red, zone);

  if (blueInside === redInside) {
    return players;
  }

  const scorer: PlayerId = blueInside ? 'blue' : 'red';
  return {
    ...players,
    [scorer]: { ...players[scorer], score: players[scorer].score + delta },
  };
}

function isPlayerInHill(player: Player, zone: typeof hillZone): boolean {
  return player.hp > 0 && Math.hypot(player.x - zone.x, player.y - zone.y) <= zone.radius;
}

export function getHillZone(mapId: MapId): typeof hillZone {
  const custom = mapId === 'custom' ? loadCustomHillZones()[0] : null;
  if (!custom) {
    return hillZone;
  }

  return {
    x: custom.x + custom.width / 2,
    y: custom.y + custom.height / 2,
    radius: Math.max(7, Math.max(custom.width, custom.height) * 1.8),
  };
}
