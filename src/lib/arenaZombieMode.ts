import type { GameInput, GameState, Player, PlayerId } from './arenaTypes';
import { buildArenaBlocks, buildBarricades } from './arenaBarricades';
import { isGlassWarsMode, isZombieMode, modeConfigs } from './arenaModes';
import { spawnZombie, tickZombies } from './arenaZombies';
import { applyZombieHits } from './arenaZombieHits';

export function buildZombieModeBarricades(
  state: GameState,
  players: Record<PlayerId, Player>,
  input: GameInput,
): { players: Record<PlayerId, Player>; barricades: GameState['barricades']; nextBarricadeId: number } {
  if (isGlassWarsMode(state.mode)) {
    const result = buildArenaBlocks(players, input, state.barricades, state.mapBoards, state.mapId, state.nextBarricadeId);
    return { players: result.players, barricades: result.barricades, nextBarricadeId: result.nextId };
  }

  if (!isZombieMode(state.mode)) {
    return { players, barricades: [], nextBarricadeId: state.nextBarricadeId };
  }

  const result = buildBarricades(players, input, state.barricades, state.mapBoards, state.mapId, state.nextBarricadeId);
  return { players: result.players, barricades: result.barricades, nextBarricadeId: result.nextId };
}

export function updateZombieMode(
  state: GameState,
  players: Record<PlayerId, Player>,
  bullets: GameState['bullets'],
  barricades: GameState['barricades'],
  nextEffectId: number,
  delta: number,
): Pick<GameState, 'players' | 'zombies' | 'barricades' | 'bullets' | 'nextZombieId' | 'zombieTimer'> & {
  effects: GameState['hitEffects'];
} {
  if (!isZombieMode(state.mode) && state.zombies.length === 0) {
    return { players, zombies: [], barricades, bullets, nextZombieId: state.nextZombieId, zombieTimer: 0, effects: [] };
  }

  const timer = state.zombieTimer - delta;
  const shouldSpawn = isZombieMode(state.mode) && timer <= 0;
  const zombies = shouldSpawn ? [...state.zombies, spawnZombie(state.nextZombieId, state.mode, state.mapId)] : state.zombies;
  const zombieHits = applyZombieHits(zombies, bullets, players, nextEffectId);
  const blockers = [
    ...barricades,
    ...state.mapBoards,
    ...state.movingBlocks,
    ...state.tnts.filter((tnt) => tnt.active),
    ...state.ricochetBlocks,
  ];
  const zombieTick = tickZombies(zombieHits.zombies, zombieHits.players, barricades, blockers, state.mode, state.mapId, delta);

  return {
    players: zombieTick.players,
    zombies: zombieTick.zombies,
    barricades: zombieTick.barricades,
    bullets: zombieHits.bullets,
    nextZombieId: shouldSpawn ? state.nextZombieId + 1 : state.nextZombieId,
    zombieTimer: shouldSpawn ? modeConfigs[state.mode].zombieSpawnSeconds ?? 1.3 : timer,
    effects: zombieHits.effects,
  };
}
