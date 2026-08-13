import type { Bullet, Player, PlayerId, PortalBlock } from './arenaTypes';

const portalCooldown = 0.35;

export function teleportPlayers(
  players: Record<PlayerId, Player>,
  portals: PortalBlock[],
): Record<PlayerId, Player> {
  return {
    blue: teleportPlayer(players.blue, portals),
    red: teleportPlayer(players.red, portals),
  };
}

export function teleportBullet(bullet: Bullet, portals: PortalBlock[]): Bullet {
  if (bullet.portalCooldown > 0) {
    return bullet;
  }

  const pair = getPortalPair(bullet.x, bullet.y, portals);
  return pair ? { ...bullet, x: centerX(pair.to), y: centerY(pair.to), portalCooldown } : bullet;
}

function teleportPlayer(player: Player, portals: PortalBlock[]): Player {
  if (player.hp <= 0 || player.portalCooldown > 0) {
    return player;
  }

  const pair = getPortalPair(player.x, player.y, portals);
  return pair ? { ...player, x: centerX(pair.to), y: centerY(pair.to), portalCooldown } : player;
}

function getPortalPair(x: number, y: number, portals: PortalBlock[]) {
  const from = portals.find((portal) => pointInPortal(x, y, portal));
  if (!from) {
    return null;
  }

  const to = portals.find((portal) => portal.kind !== from.kind);
  return to ? { from, to } : null;
}

function pointInPortal(x: number, y: number, portal: PortalBlock): boolean {
  return x >= portal.x && x <= portal.x + portal.width && y >= portal.y && y <= portal.y + portal.height;
}

function centerX(portal: PortalBlock): number { return portal.x + portal.width / 2; }
function centerY(portal: PortalBlock): number { return portal.y + portal.height / 2; }
