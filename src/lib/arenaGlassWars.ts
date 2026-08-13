import type { AllyCheckpoint, Barricade, GameMode, PlayerId, Player, MapId } from './arenaTypes';
import { getMapSpawn } from './arenaMap';
import { respawnPlayer } from './arenaPlayers';

const coreSize = 6;

export function createGlassCores(mode: GameMode, mapId: MapId): AllyCheckpoint[] {
  if (mode !== 'glassWars') return [];

  return (['blue', 'red'] as PlayerId[]).map((owner, index) => {
    const spawn = getMapSpawn(mapId, owner);
    const offset = owner === 'blue' ? -8 : 8;
    return {
      id: 900 + index,
      owner,
      role: 'core',
      variant: 'glass',
      hp: 1,
      x: spawn.x + offset - coreSize / 2,
      y: spawn.y - coreSize / 2,
      width: coreSize,
      height: coreSize,
    };
  });
}

export function canRespawnByCore(mode: GameMode, cores: AllyCheckpoint[]): Record<PlayerId, boolean> {
  if (mode !== 'glassWars') {
    return { blue: true, red: true };
  }

  return {
    blue: hasLiveCore(cores, 'blue'),
    red: hasLiveCore(cores, 'red'),
  };
}

export function respawnGlassWarsPlayers(
  players: Record<PlayerId, Player>,
  mode: GameMode,
  mapId: MapId,
  cores: AllyCheckpoint[],
): Record<PlayerId, Player> {
  if (mode !== 'glassWars') return players;

  const canRespawn = canRespawnByCore(mode, cores);
  return {
    blue: players.blue.hp <= 0 && canRespawn.blue ? respawnPlayer(players.blue, mapId) : players.blue,
    red: players.red.hp <= 0 && canRespawn.red ? respawnPlayer(players.red, mapId) : players.red,
  };
}

export function isGlassCoreDestroyed(cores: AllyCheckpoint[], owner: PlayerId): boolean {
  return !hasLiveCore(cores, owner);
}

export function isBuiltBlock(barricade: Barricade): boolean {
  return barricade.variant === 'buildBlock';
}

function hasLiveCore(cores: AllyCheckpoint[], owner: PlayerId): boolean {
  return cores.some((core) => core.role === 'core' && core.owner === owner && core.hp > 0);
}
