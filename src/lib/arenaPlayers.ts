import {
  PLAYER_SPEED,
  type GameInput,
  type MapId,
  type MagnetBlock,
  type Obstacle,
  type Player,
  type PlayerId,
  type PlayerInput,
  type WeaponId,
  type ConveyorBlock,
  type VehicleBlock,
} from './arenaTypes';
import { getMapSpawn, isBlockedPlayerPosition, type Blocker } from './arenaMap';
import { getArenaBounds } from './arenaBounds';
import { getMagnetMove } from './arenaMagnets';
import { loadCustomConveyors, loadCustomMagnets, loadCustomTerrain, loadCustomVehicles } from './customMap';

const conveyorSpeed = 20;

export type PlayerMechanics = {
  water: Obstacle[];
  ice: Obstacle[];
  conveyors: ConveyorBlock[];
  magnets: MagnetBlock[];
  vehicles: VehicleBlock[];
  forceIce?: boolean;
  speedMultiplier?: number;
};

export function createPlayer(
  id: PlayerId,
  x: number,
  y: number,
  facingX: number,
  hp = 100,
  weapon: WeaponId = 'blaster',
): Player {
  return {
    id,
    x,
    y,
    hp,
    score: 0,
    facingX,
    facingY: 0,
    slideX: 0,
    slideY: 0,
    cooldown: 0,
    buildCooldown: 0,
    grenadeCooldown: 0,
    speedBoost: 0,
    weapon,
    shotsFired: 0,
    selfGrenadeDeaths: 0,
    deathCount: 0,
    lastDeathX: x,
    lastDeathY: y,
    poisonTimer: 0,
    burnTimer: 0,
    shockTimer: 0,
    acidTimer: 0,
    snareTimer: 0,
    portalCooldown: 0,
    vehicleKind: null,
  };
}

export function updatePlayers(
  players: Record<PlayerId, Player>,
  input: GameInput,
  delta: number,
  mapId: MapId,
  barricades: Blocker[],
  mechanics: PlayerMechanics = loadPlayerMechanics(mapId),
): Record<PlayerId, Player> {
  return {
    blue: updatePlayer(players.blue, input.blue, delta, mapId, barricades, mechanics),
    red: updatePlayer(players.red, input.red, delta, mapId, barricades, mechanics),
  };
}

export function respawnPlayer(player: Player, mapId: MapId): Player {
  const spawn = getMapSpawn(mapId, player.id);
  return {
    ...player,
    hp: 100,
    speedBoost: 0,
    slideX: 0,
    slideY: 0,
    poisonTimer: 0,
    burnTimer: 0,
    shockTimer: 0,
    acidTimer: 0,
    snareTimer: 0,
    portalCooldown: 0,
    vehicleKind: null,
    x: spawn.x,
    y: spawn.y,
    deathCount: player.deathCount + 1,
    lastDeathX: player.x,
    lastDeathY: player.y,
  };
}

function updatePlayer(
  player: Player,
  input: PlayerInput,
  delta: number,
  mapId: MapId,
  barricades: Blocker[],
  mechanics: PlayerMechanics,
): Player {
  if (player.hp <= 0) {
    return ageCooldowns(player, delta);
  }

  const xAxis = Number(input.right) - Number(input.left);
  const yAxis = Number(input.down) - Number(input.up);
  const length = Math.hypot(xAxis, yAxis) || 1;
  const vehicle = mapId === 'custom' ? getVehicle(player.x, player.y, mechanics.vehicles) : null;
  const vehicleKind = vehicle ? input.enterVehicle ? vehicle.kind : player.vehicleKind : null;
  const riding = vehicleKind && vehicle?.kind === vehicleKind ? vehicle : null;
  const waterSlow = mapId === 'custom' && !riding && isInRectList(player.x, player.y, mechanics.water) ? 0.58 : 1;
  const onIce = mechanics.forceIce || (mapId === 'custom' && riding?.kind !== 'hover' && isInRectList(player.x, player.y, mechanics.ice));
  const speed = (player.speedBoost > 0 ? PLAYER_SPEED * 1.32 : PLAYER_SPEED) * waterSlow * getVehicleSpeed(riding) * statusSlow(player) * (mechanics.speedMultiplier ?? 1);
  const targetSlideX = xAxis === 0 && yAxis === 0 ? 0 : (xAxis / length) * speed;
  const targetSlideY = xAxis === 0 && yAxis === 0 ? 0 : (yAxis / length) * speed;
  const slideX = onIce ? updateIceSlide(player.slideX, targetSlideX, delta) : targetSlideX;
  const slideY = onIce ? updateIceSlide(player.slideY, targetSlideY, delta) : targetSlideY;
  const wantedX = player.x + slideX * delta;
  const wantedY = player.y + slideY * delta;
  const blockedX = isBlockedPlayerPosition(wantedX, player.y, mapId, barricades);
  const nextX = blockedX ? player.x : wantedX;
  const blockedY = isBlockedPlayerPosition(nextX, wantedY, mapId, barricades);
  const nextY = blockedY ? player.y : wantedY;
  const conveyor = getConveyorMove(nextX, nextY, xAxis, yAxis, mapId, delta, mechanics.conveyors);
  const conveyorX = isBlockedPlayerPosition(nextX + conveyor.x, nextY, mapId, barricades) ? nextX : nextX + conveyor.x;
  const conveyorY = isBlockedPlayerPosition(conveyorX, nextY + conveyor.y, mapId, barricades) ? nextY : nextY + conveyor.y;
  const magnet = getMagnetMove({ x: conveyorX, y: conveyorY }, mapId, delta, 'players', mechanics.magnets);
  const magnetX = isBlockedPlayerPosition(conveyorX + magnet.x, conveyorY, mapId, barricades) ? conveyorX : conveyorX + magnet.x;
  const magnetY = isBlockedPlayerPosition(magnetX, conveyorY + magnet.y, mapId, barricades) ? conveyorY : conveyorY + magnet.y;
  const isMoving = xAxis !== 0 || yAxis !== 0;
  const bounds = getArenaBounds(mapId);

  return {
    ...player,
    x: clamp(magnetX, 4, bounds.width - 4),
    y: clamp(magnetY, 4, bounds.height - 4),
    hp: riding?.kind === 'tank' ? Math.min(100, player.hp + delta * 5) : player.hp,
    vehicleKind: riding?.kind ?? null,
    facingX: isMoving ? xAxis / length : player.facingX,
    facingY: isMoving ? yAxis / length : player.facingY,
    slideX: onIce && !blockedX ? slideX : 0,
    slideY: onIce && !blockedY ? slideY : 0,
    cooldown: Math.max(0, player.cooldown - delta),
    buildCooldown: Math.max(0, player.buildCooldown - delta),
    grenadeCooldown: Math.max(0, player.grenadeCooldown - delta),
    speedBoost: Math.max(0, player.speedBoost - delta),
    poisonTimer: Math.max(0, player.poisonTimer - delta),
    burnTimer: Math.max(0, player.burnTimer - delta),
    shockTimer: Math.max(0, player.shockTimer - delta),
    acidTimer: Math.max(0, player.acidTimer - delta),
    snareTimer: Math.max(0, player.snareTimer - delta),
    portalCooldown: Math.max(0, player.portalCooldown - delta),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function ageCooldowns(player: Player, delta: number): Player {
  return {
    ...player,
    cooldown: Math.max(0, player.cooldown - delta),
    buildCooldown: Math.max(0, player.buildCooldown - delta),
    grenadeCooldown: Math.max(0, player.grenadeCooldown - delta),
    speedBoost: Math.max(0, player.speedBoost - delta),
    poisonTimer: Math.max(0, player.poisonTimer - delta),
    burnTimer: Math.max(0, player.burnTimer - delta),
    shockTimer: Math.max(0, player.shockTimer - delta),
    acidTimer: Math.max(0, player.acidTimer - delta),
    snareTimer: Math.max(0, player.snareTimer - delta),
    portalCooldown: Math.max(0, player.portalCooldown - delta),
  };
}

function statusSlow(player: Player): number {
  if (player.snareTimer > 0) return 0;
  if (player.shockTimer > 0) return 0.42;
  if (player.acidTimer > 0) return 0.72;
  return 1;
}

function loadPlayerMechanics(mapId: MapId): PlayerMechanics {
  return mapId === 'custom'
    ? {
      water: loadCustomTerrain('water'),
      ice: loadCustomTerrain('ice'),
      conveyors: loadCustomConveyors(),
      magnets: loadCustomMagnets(),
      vehicles: loadCustomVehicles(),
    }
    : { water: [], ice: [], conveyors: [], magnets: [], vehicles: [] };
}

function isInRectList(x: number, y: number, rects: Obstacle[]): boolean {
  return rects.some((rect) => x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height);
}

function updateIceSlide(current: number, target: number, delta: number): number {
  if (target !== 0) {
    return current + (target - current) * Math.min(1, delta * 3.4);
  }

  return current * Math.max(0, 1 - delta * 0.72);
}

function getConveyorMove(x: number, y: number, xAxis: number, yAxis: number, mapId: MapId, delta: number, conveyors: ConveyorBlock[]) {
  if (mapId !== 'custom') {
    return { x: 0, y: 0 };
  }

  const conveyor = conveyors.find((item) => (
    x >= item.x && x <= item.x + item.width && y >= item.y && y <= item.y + item.height
  ));
  if (!conveyor) {
    return { x: 0, y: 0 };
  }

  const direction = conveyor.axis === 'x' ? Math.sign(xAxis) : Math.sign(yAxis);
  return conveyor.axis === 'x'
    ? { x: direction * conveyorSpeed * delta, y: 0 }
    : { x: 0, y: direction * conveyorSpeed * delta };
}

function getVehicle(x: number, y: number, vehicles: VehicleBlock[]): VehicleBlock | null {
  return vehicles.find((vehicle) => x >= vehicle.x && x <= vehicle.x + vehicle.width && y >= vehicle.y && y <= vehicle.y + vehicle.height) ?? null;
}

function getVehicleSpeed(vehicle: VehicleBlock | null): number {
  if (vehicle?.kind === 'buggy') return 1.72;
  if (vehicle?.kind === 'hover') return 1.38;
  if (vehicle?.kind === 'tank') return 0.82;
  return 1;
}
