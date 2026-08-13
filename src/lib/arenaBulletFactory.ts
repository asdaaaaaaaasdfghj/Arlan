import { PLAYER_SIZE, type Bullet, type MapId, type Player } from './arenaTypes';
import { getWeaponConfig } from './arenaWeapons';

export function createWeaponBullets(player: Player, firstId: number, mapId: MapId): Bullet[] {
  const weapon = getWeaponConfig(player.weapon, mapId);
  return player.weapon === 'termos'
    ? createCircleBullets(player, firstId, weapon.bullets, mapId)
    : createForwardBullets(player, firstId, mapId);
}

function createForwardBullets(player: Player, firstId: number, mapId: MapId): Bullet[] {
  const weapon = getWeaponConfig(player.weapon, mapId);
  const centerAngle = Math.atan2(player.facingY, player.facingX);

  return Array.from({ length: weapon.bullets }, (_, index) => {
    const angle = centerAngle + (index - (weapon.bullets - 1) / 2) * weapon.spread;
    return createBullet(player, firstId + index, angle, mapId);
  });
}

function createCircleBullets(player: Player, firstId: number, count: number, mapId: MapId): Bullet[] {
  return Array.from({ length: count }, (_, index) => (
    createBullet(player, firstId + index, (Math.PI * 2 * index) / count, mapId)
  ));
}

function createBullet(player: Player, id: number, angle: number, mapId: MapId): Bullet {
  const weapon = getWeaponConfig(player.weapon, mapId);
  return {
    id,
    owner: player.id,
    weapon: player.weapon,
    x: player.x + Math.cos(angle) * PLAYER_SIZE,
    y: player.y + Math.sin(angle) * PLAYER_SIZE,
    dx: Math.cos(angle),
    dy: Math.sin(angle),
    damage: weapon.damage,
    size: weapon.size,
    bounces: 0,
    portalCooldown: 0,
  };
}
