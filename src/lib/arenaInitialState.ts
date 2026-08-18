import { type GameMode, type GameState, type MapId } from './arenaTypes';
import { createFlags } from './arenaFlags';
import { createGlassCores } from './arenaGlassWars';
import { createLavaMaze, createLavaSurvivalPlayers, isLavaSurvivalMode } from './arenaLavaSurvival';
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
  const effectiveMapId = isLavaSurvivalMode(mode) ? 'lavaMaze' : mapId;
  const blueSpawn = getMapSpawn(effectiveMapId, 'blue');
  const redSpawn = getMapSpawn(effectiveMapId, 'red');
  const customPowerUps = effectiveMapId === 'custom' ? loadCustomPowerUps() : [];
  const players = {
    blue: createPlayer('blue', blueSpawn.x, blueSpawn.y, 1, config.playerHp, config.defaultWeapon),
    red: createPlayer('red', redSpawn.x, redSpawn.y, -1, config.playerHp, config.defaultWeapon),
  };
  const lavaMaze = isLavaSurvivalMode(mode) ? createLavaMaze() : [];

  return {
    mode,
    mapId: effectiveMapId,
    status: 'ready',
    players: isLavaSurvivalMode(mode) ? createLavaSurvivalPlayers(players) : players,
    allies: effectiveMapId === 'custom' ? loadCustomAllies() : [],
    allyCheckpoints: [...(effectiveMapId === 'custom' ? loadCustomAllyCheckpoints() : []), ...createGlassCores(mode, effectiveMapId)],
    zombies: [],
    barricades: [],
    mapBoards: [...lavaMaze, ...(effectiveMapId === 'custom' ? loadCustomBoards() : []), ...createLuckyBlocks(mode, effectiveMapId)],
    movingBlocks: effectiveMapId === 'custom' ? loadCustomMovers() : [],
    lasers: effectiveMapId === 'custom' ? loadCustomLasers() : [],
    codeBlocks: effectiveMapId === 'custom' ? loadCustomCodeBlocks() : [],
    vehicles: effectiveMapId === 'custom' ? loadCustomVehicles() : [],
    tnts: effectiveMapId === 'custom' ? loadCustomTnts() : [],
    ricochetBlocks: effectiveMapId === 'custom' ? loadCustomRicochets() : [],
    portals: effectiveMapId === 'custom' ? loadCustomPortals() : [],
    traps: effectiveMapId === 'custom' ? loadCustomTraps() : [],
    paintTiles: [],
    floorHoles: [],
    timeEchoes: [],
    farArenaActive: false,
    mutation: { id: 'none', seed: 0 },
    activeMutations: [],
    bullets: [],
    grenades: [],
    powerUps: customPowerUps,
    disasters: [],
    flags: createFlags(effectiveMapId),
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
