import { getArenaBounds } from './arenaBounds';
import type { GameMode, MapId, Obstacle, Player, PlayerId } from './arenaTypes';
import { loadCustomSwapRifts } from './customMap';

const swapCooldown = 1.15;

export function getModeSwapRifts(mode: GameMode, mapId: MapId): Obstacle[] {
  if (mode !== 'swapRift') return [];

  const bounds = getArenaBounds(mapId);
  const centerX = bounds.width / 2;
  const centerY = bounds.height / 2;
  return [
    { id: 'mode-swap-center', x: centerX - 4, y: centerY - 4, width: 8, height: 8 },
    { id: 'mode-swap-left', x: Math.max(10, centerX - 30), y: centerY - 16, width: 7, height: 7 },
    { id: 'mode-swap-right', x: Math.min(bounds.width - 17, centerX + 23), y: centerY + 9, width: 7, height: 7 },
  ];
}

export function tickSwapRifts(players: Record<PlayerId, Player>, rifts = loadCustomSwapRifts()): Record<PlayerId, Player> {
  if (rifts.length === 0 || players.blue.hp <= 0 || players.red.hp <= 0) {
    return players;
  }

  const rift = rifts.find((item) => (
    touches(players.blue, item) || touches(players.red, item)
  ));

  if (!rift || players.blue.portalCooldown > 0 || players.red.portalCooldown > 0) {
    return players;
  }

  return {
    blue: swapPlayer(players.blue, players.red),
    red: swapPlayer(players.red, players.blue),
  };
}

function swapPlayer(player: Player, target: Player): Player {
  return {
    ...player,
    x: target.x,
    y: target.y,
    slideX: 0,
    slideY: 0,
    portalCooldown: swapCooldown,
  };
}

function touches(player: Player, rect: { x: number; y: number; width: number; height: number }): boolean {
  return player.x >= rect.x && player.x <= rect.x + rect.width && player.y >= rect.y && player.y <= rect.y + rect.height;
}
