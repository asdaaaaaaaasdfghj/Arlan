import { type GameInput, type GameState, type PlayerId, type WeaponId } from './arenaTypes';
import { tickAllies } from './arenaAllies';
import { tickCodeBlocks } from './arenaCodeBlocks';
import { applyBulletHits, moveBullets, spawnBullets } from './arenaCombat';
import { tickDisasters } from './arenaDisasters';
import { tickFloorModes } from './arenaFloorModes';
import { tickFlags } from './arenaFlags';
import { canRespawnByCore } from './arenaGlassWars';
import { spawnGrenades, tickGrenades } from './arenaGrenades';
export { createInitialGame } from './arenaInitialState';
import { tickKingHill } from './arenaKingHill';
import { tickLavaSurvival } from './arenaLavaSurvival';
import { tickLasers } from './arenaLasers';
import { tickLuckyBlocks } from './arenaLuckyBlocks';
import { applySwordAttacks } from './arenaMelee';
import { getMiniGameRule, isMiniGamesMode, lockMiniGameWeapons } from './arenaMiniGames';
import { moveBarricadesFromMovingBlocks, pushPlayersFromMovingBlocks, tickMovingBlocks } from './arenaMovingBlocks';
import { applyMutationToBullets, applyMutationToCooldowns, applyMutationToMechanics, tickStackedMutations } from './arenaMutations';
import { isFlameMode, isSwordMode, modeConfigs } from './arenaModes';
import { tickPaintBattle } from './arenaPaint';
import { teleportPlayers } from './arenaPortals';
import { tickPowerUps } from './arenaPowerUps';
import { updatePlayers } from './arenaPlayers';
import { findWinner } from './arenaRules';
import { damageShipsWithBullets } from './arenaSeaBattle';
import { spawnSecretZombies } from './arenaSecretZombies';
import { getModeSwapRifts, tickSwapRifts } from './arenaSwapRifts';
import { isSurvivalGrace, lockSurvivalWeapons } from './arenaSurvivalMode';
import { applyTimeParadoxHits, hasFarArenaBreach, tickTimeEchoes } from './arenaTimeDuel';
import { explodeReadyTnts, tickTnts, triggerTntChain, triggerTnts } from './arenaTnt';
import { tickTraps } from './arenaTraps';
import { isCustomOnlyWeapon } from './arenaWeapons';
import { buildZombieModeBarricades, updateZombieMode } from './arenaZombieMode';
import { loadCustomConveyors, loadCustomMagnets, loadCustomSolidDecorations, loadCustomSwapRifts, loadCustomTerrain, loadCustomVehicles } from './customMap';
import { getArenaBounds } from './arenaBounds';
import { getMapObstacles } from './arenaMap';
export * from './arenaTypes';

export function startGame(state: GameState): GameState {
  return { ...state, status: 'playing', winner: null };
}

export function tickGame(state: GameState, input: GameInput, delta: number, secretZombies = false): GameState {
  if (state.status !== 'playing') return state;
  const elapsedTime = state.elapsedTime + delta;
  const existingMutations = state.activeMutations ?? [];
  const mutationState = tickStackedMutations(state.mode, elapsedTime, state.mode === 'mutationStorm' ? existingMutations : [state.mutation].filter((mutation) => mutation.id !== 'none'));
  const activeMutations = state.mode === 'mutationStorm' ? mutationState.activeMutations : mutationState.activeMutations.slice(0, 1);
  const luckyBlocks = tickLuckyBlocks(state.mode, state.mapBoards, state.elapsedTime, elapsedTime, state.nextBarricadeId);
  const movingBlocks = tickMovingBlocks(state.movingBlocks, elapsedTime);
  const pushedBarricades = moveBarricadesFromMovingBlocks(state.barricades, movingBlocks, state.mapId);
  const pushedMapBoards = moveBarricadesFromMovingBlocks(luckyBlocks.mapBoards, movingBlocks, state.mapId);
  const tnts = tickTnts(state.tnts, delta);
  const mechanics = state.mapId === 'custom'
    ? {
      water: loadCustomTerrain('water'),
      ice: loadCustomTerrain('ice'),
      conveyors: loadCustomConveyors(),
      magnets: loadCustomMagnets(),
      swapRifts: loadCustomSwapRifts(),
      vehicles: state.vehicles ?? loadCustomVehicles(),
    }
    : { water: [], ice: [], conveyors: [], magnets: [], swapRifts: getModeSwapRifts(state.mode, state.mapId), vehicles: [] };
  const activeTnts = tnts.filter((tnt) => tnt.active);
  const mutatedMechanics = applyMutationToMechanics(mechanics, activeMutations);
  const blockers = [...pushedBarricades, ...pushedMapBoards, ...movingBlocks, ...(state.lasers ?? []), ...activeTnts, ...state.ricochetBlocks, ...state.allyCheckpoints];
  const movedPlayers = updatePlayers(state.players, input, delta, state.mapId, blockers, mutatedMechanics);
  const players = tickSwapRifts(teleportPlayers(pushPlayersFromMovingBlocks(movedPlayers, movingBlocks), state.portals), mechanics.swapRifts);
  const movedState = { ...state, barricades: pushedBarricades, mapBoards: pushedMapBoards, movingBlocks, elapsedTime };
  const building = buildZombieModeBarricades(movedState, players, input);
  const miniGameRule = getMiniGameRule(state);
  const lockedPlayers = isMiniGamesMode(state) ? lockMiniGameWeapons({ ...state, players: building.players }) : building.players;
  const combatInput = isSurvivalGrace(state.mode, elapsedTime) ? lockSurvivalWeapons(input) : input;
  const swordActive = isSwordMode(state.mode) || (isMiniGamesMode(state) && miniGameRule.sword);
  const swordState = swordActive
    ? applySwordAttacks(lockedPlayers, combatInput, state.mapId, state.nextEffectId)
    : { players: lockedPlayers, effects: [] };
  const throwing = swordActive
    ? { players: swordState.players, grenades: [] }
    : spawnGrenades(swordState.players, combatInput, state.mode, state.nextGrenadeId);
  const shooting = swordActive
    ? { players: throwing.players, bullets: [] }
    : spawnBullets(throwing.players, combatInput, state.nextBulletId, state.mapId);
  const mutatedShooting = {
    players: applyMutationToCooldowns(shooting.players, activeMutations),
    bullets: applyMutationToBullets(shooting.bullets, activeMutations),
  };
  const allyBlockers = [...building.barricades, ...pushedMapBoards, ...movingBlocks, ...(state.lasers ?? []), ...activeTnts, ...state.ricochetBlocks, ...state.allyCheckpoints];
  const allyState = tickAllies(
    state.allies,
    state.allyCheckpoints,
    mutatedShooting.players,
    state.zombies,
    allyBlockers,
    state.mapId,
    delta,
    state.nextBulletId + mutatedShooting.bullets.length,
  );
  const moved = moveBullets(
    [...state.bullets, ...mutatedShooting.bullets, ...allyState.bullets],
    delta,
    state.mapId,
    [...movingBlocks, ...(state.lasers ?? [])],
    building.barricades,
    pushedMapBoards,
    state.allyCheckpoints,
    state.ricochetBlocks,
    state.portals,
    state.nextPowerUpId,
    mechanics.magnets,
    state.mode,
  );
  const glassRespawns = canRespawnByCore(state.mode, moved.checkpoints);
  const shipState = damageShipsWithBullets(state.ships ?? [], moved.bullets);
  const timeEchoes = tickTimeEchoes(state, mutatedShooting.players, elapsedTime, delta, state.portals);
  const farArenaActive = state.farArenaActive || hasFarArenaBreach({ ...state, players: mutatedShooting.players, timeEchoes }, getArenaBounds(state.mapId));
  const paradoxState = applyTimeParadoxHits(mutatedShooting.players, shipState.bullets, timeEchoes, state.nextEffectId + swordState.effects.length);
  const oldEffects = ageHitEffects(state.hitEffects, delta);
  const tntState = triggerTnts({
    tnts,
    bullets: paradoxState.bullets,
    players: paradoxState.players,
    zombies: state.zombies,
    barricades: moved.barricades,
    mapBoards: moved.mapBoards,
  }, state.mode, state.mapId, state.nextEffectId);
  const afterDuelHits = applyBulletHits(
    tntState.players,
    allyState.allies,
    tntState.bullets,
    state.mode,
    state.mapId,
    state.nextEffectId + swordState.effects.length + paradoxState.effects.length + tntState.effects.length,
    glassRespawns,
  );
  const zombieState = updateZombieMode(
    { ...movedState, zombies: tntState.zombies, mapBoards: tntState.mapBoards, tnts: tntState.tnts },
    afterDuelHits.players,
    afterDuelHits.bullets,
    tntState.barricades,
    state.nextEffectId + swordState.effects.length + paradoxState.effects.length + tntState.effects.length + afterDuelHits.effects.length,
    delta,
  );
  const grenadeState = tickGrenades(
    [...state.grenades, ...throwing.grenades],
    zombieState.players,
    zombieState.zombies,
    zombieState.barricades,
    state.mode,
    state.mapId,
    state.nextEffectId + swordState.effects.length + paradoxState.effects.length + tntState.effects.length + afterDuelHits.effects.length + zombieState.effects.length,
    delta,
    mechanics.magnets,
    glassRespawns,
  );
  const chainState = triggerTntChain({
    tnts: tntState.tnts,
    bullets: zombieState.bullets,
    players: grenadeState.players,
    zombies: grenadeState.zombies,
    barricades: grenadeState.barricades,
    mapBoards: tntState.mapBoards,
    effects: [],
  }, grenadeState.blasts);
  const fuseEffectId = state.nextEffectId + swordState.effects.length + paradoxState.effects.length + tntState.effects.length + afterDuelHits.effects.length + zombieState.effects.length + grenadeState.effects.length;
  const fuseState = explodeReadyTnts(chainState, state.mode, state.mapId, fuseEffectId);
  const laserBlockers = [
    ...getMapObstacles(state.mapId),
    ...(state.mapId === 'custom' ? loadCustomSolidDecorations() : []),
    ...fuseState.mapBoards,
    ...movingBlocks,
    ...fuseState.tnts.filter((tnt) => tnt.active),
    ...state.ricochetBlocks,
    ...state.allyCheckpoints,
    ...grenadeState.barricades,
  ];
  const laserState = tickLasers(fuseState.players, fuseState.zombies, state.lasers ?? [], delta, laserBlockers);
  const codeState = tickCodeBlocks({
    players: laserState.players,
    zombies: laserState.zombies,
    barricades: fuseState.barricades,
    mapBoards: fuseState.mapBoards,
    codeBlocks: state.codeBlocks ?? [],
    nextZombieId: zombieState.nextZombieId,
    nextBarricadeId: Math.max(building.nextBarricadeId, luckyBlocks.nextId),
    nextEffectId: fuseEffectId + fuseState.effects.length,
  }, delta);
  const trapState = tickTraps(codeState.players, codeState.zombies, state.traps, state.mode, state.mapId, elapsedTime, delta, codeState.nextEffectId);
  const disasterState = tickDisasters({ ...state, players: trapState.players }, delta);
  const floorState = tickFloorModes({ ...state, players: disasterState.players, floorHoles: state.floorHoles ?? [] }, input);
  const config = modeConfigs[state.mode];
  const timeLeft = config.noTimer ? state.timeLeft : Math.max(0, state.timeLeft - delta);
  const flagState = tickFlags({ ...state, players: floorState.players });
  const scoredPlayers = tickKingHill(flagState.players, state.mode, state.mapId, delta);
  const lavaPlayers = tickLavaSurvival({ ...state, elapsedTime }, scoredPlayers, delta);
  const paintState = tickPaintBattle({ ...state, players: lavaPlayers, paintTiles: state.paintTiles ?? [] });
  const secretState = spawnSecretZombies(state.players, paintState.players, trapState.zombies, codeState.nextZombieId, secretZombies);
  const secretHappened = secretState.nextZombieId > codeState.nextZombieId;
  const winner = secretHappened ? null : findWinner(paintState.players, timeLeft, state.mode, { ...state, allyCheckpoints: moved.checkpoints, paintTiles: paintState.paintTiles, ships: shipState.ships });
  const powerUps = tickPowerUps(
    paintState.players,
    codeState.barricades,
    [...state.powerUps, ...moved.powerUps],
    moved.nextPowerUpId,
    state.powerUpTimer,
    delta,
  );
  const hitEffects = [...oldEffects, ...swordState.effects, ...paradoxState.effects, ...tntState.effects, ...afterDuelHits.effects, ...zombieState.effects, ...grenadeState.effects, ...fuseState.effects, ...codeState.hitEffects, ...trapState.effects];
  return {
    ...state,
    players: powerUps.players,
    allies: afterDuelHits.allies,
    allyCheckpoints: moved.checkpoints,
    zombies: secretState.zombies,
    barricades: powerUps.barricades,
    mapBoards: fuseState.mapBoards,
    movingBlocks,
    lasers: state.lasers ?? [],
    codeBlocks: codeState.codeBlocks,
    vehicles: state.vehicles ?? [],
    tnts: fuseState.tnts,
    ricochetBlocks: state.ricochetBlocks,
    portals: state.portals,
    traps: trapState.traps,
    paintTiles: paintState.paintTiles,
    floorHoles: floorState.floorHoles,
    ships: shipState.ships,
    timeEchoes,
    farArenaActive,
    mutation: mutationState.mutation,
    activeMutations,
    bullets: fuseState.bullets,
    grenades: grenadeState.grenades,
    powerUps: powerUps.powerUps,
    disasters: disasterState.disasters,
    flags: flagState.flags,
    hitEffects,
    nextBulletId: state.nextBulletId + mutatedShooting.bullets.length + allyState.bullets.length,
    nextGrenadeId: state.nextGrenadeId + throwing.grenades.length,
    nextZombieId: secretState.nextZombieId,
    nextBarricadeId: Math.max(codeState.nextBarricadeId, building.nextBarricadeId, luckyBlocks.nextId),
    nextPowerUpId: powerUps.nextId,
    nextDisasterId: disasterState.nextId,
    nextEffectId: trapState.nextEffectId,
    powerUpTimer: powerUps.timer,
    zombieTimer: zombieState.zombieTimer,
    disasterTimer: disasterState.timer,
    timeLeft,
    elapsedTime,
    winner,
    status: winner ? 'finished' : 'playing',
  };
}

export function changeWeapon(state: GameState, playerId: PlayerId, weapon: WeaponId): GameState {
  if (isSwordMode(state.mode)) return state;
  if (isMiniGamesMode(state)) return state;
  if (isFlameMode(state.mode) && weapon !== 'flamethrower') return state;
  if (state.mode === 'railDuel' && weapon !== 'termos') return state;
  if (isCustomOnlyWeapon(weapon) && state.mapId !== 'custom') return state;

  return {
    ...state,
    players: { ...state.players, [playerId]: { ...state.players[playerId], weapon } },
  };
}

function ageHitEffects(effects: GameState['hitEffects'], delta: number): GameState['hitEffects'] {
  return effects
    .map((effect) => ({ ...effect, age: effect.age - delta }))
    .filter((effect) => effect.age > 0);
}
