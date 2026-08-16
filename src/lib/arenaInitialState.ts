import { type GameMode, type GameState, type MapId } from './arenaTypes';
import { createFlags } from './arenaFlags';
import { createGlassCores } from './arenaGlassWars';
import { createLuckyBlocks } from './arenaLuckyBlocks';
import { getMapSpawn } from './arenaMap';
import { modeConfigs } from './arenaModes';
import { createPlayer } from './arenaPlayers';
import {
  loadCustomAllies,
  loadCustomAllyCheckpoints,
  loadCustomBoards,
  loadCustomCodeBlocks,
  loadCustomLasers,
  loadCustomMovers,
  loadCustomPortals,
  loadCustomPowerUps,
  loadCustomRicochets,
  loadCustomTnts,
  loadCustomTraps,
  loadCustomVehicles,
} from './customMap';

export function createInitialGame(mode: GameMode = 'duel', mapId: MapId = 'crossfire'): GameState {
  const config = modeConfigs[mode];
  const blueSpawn = getMapSpawn(mapId, 'blue');
  const redSpawn = getMapSpawn(mapId, 'red');
  const customPowerUps = mapId === 'custom' ? loadCustomPowerUps() : [];

  return {
    mode,
    mapId,
    status: 'ready',
    players: {
      blue: createPlayer('blue', blueSpawn.x, blueSpawn.y, 1, config.playerHp, config.defaultWeapon),
      red: createPlayer('red', redSpawn.x, redSpawn.y, -1, config.playerHp, config.defaultWeapon),
    },
    allies: mapId === 'custom' ? loadCustomAllies() : [],
    allyCheckpoints: [...(mapId === 'custom' ? loadCustomAllyCheckpoints() : []), ...createGlassCores(mode, mapId)],
    zombies: [],
    barricades: [],
    mapBoards: [...(mapId === 'custom' ? loadCustomBoards() : []), ...createLuckyBlocks(mode, mapId)],
    movingBlocks: mapId === 'custom' ? loadCustomMovers() : [],
    lasers: mapId === 'custom' ? loadCustomLasers() : [],
    codeBlocks: mapId === 'custom' ? loadCustomCodeBlocks() : [],
    vehicles: mapId === 'custom' ? loadCustomVehicles() : [],
    tnts: mapId === 'custom' ? loadCustomTnts() : [],
    ricochetBlocks: mapId === 'custom' ? loadCustomRicochets() : [],
    portals: mapId === 'custom' ? loadCustomPortals() : [],
    traps: mapId === 'custom' ? loadCustomTraps() : [],
    paintTiles: [],
    floorHoles: [],
    timeEchoes: [],
    bullets: [],
    grenades: [],
    powerUps: customPowerUps,
    disasters: [],
    flags: createFlags(mapId),
    hitEffects: [],
    timeLeft: config.roundSeconds,
    elapsedTime: 0,
    nextBulletId: 1,
    nextGrenadeId: 1,
    nextZombieId: 1,
    nextBarricadeId: 1,
    nextPowerUpId: customPowerUps.length + 1,
    nextDisasterId: 1,
    nextEffectId: 1,
    powerUpTimer: 3,
    zombieTimer: 1,
    disasterTimer: 0.7,
    winner: null,
  };
}
