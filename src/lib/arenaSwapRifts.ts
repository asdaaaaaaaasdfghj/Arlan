import type { MapId, Player, PlayerId } from './arenaTypes';
import { loadCustomSwapRifts } from './customMap';

const swapCooldown = 1.15;

export function tickSwapRifts(players: Record<PlayerId, Player>, mapId: MapId, rifts = loadCustomSwapRifts()): Record<PlayerId, Player> {
  if (mapId !== 'custom' || players.blue.hp <= 0 || players.red.hp <= 0) {
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
