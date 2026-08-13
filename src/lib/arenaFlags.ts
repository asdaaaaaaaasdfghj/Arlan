import { getMapSpawn } from './arenaMap';
import { loadCustomFlags } from './customMap';
import type { FlagState, GameState, MapId, PlayerId } from './arenaTypes';

const CAPTURE_DISTANCE = 6;

export function createFlags(mapId: MapId): Record<PlayerId, FlagState> {
  const custom = mapId === 'custom' ? loadCustomFlags() : [];
  const blueBase = custom[0] ? center(custom[0]) : getMapSpawn(mapId, 'blue');
  const redBase = custom[1] ? center(custom[1]) : getMapSpawn(mapId, 'red');

  return {
    blue: createFlag('blue', blueBase.x, blueBase.y),
    red: createFlag('red', redBase.x, redBase.y),
  };
}

export function tickFlags(state: GameState): Pick<GameState, 'players' | 'flags'> {
  if (state.mode !== 'captureFlag') {
    return { players: state.players, flags: state.flags };
  }

  let flags = resetDeadCarriers(followCarriers(state.flags, state.players), state.players);
  let players = state.players;

  (Object.keys(players) as PlayerId[]).forEach((id) => {
    const player = players[id];
    const enemyId = id === 'blue' ? 'red' : 'blue';
    const enemyFlag = flags[enemyId];
    const homeFlag = flags[id];

    if (!enemyFlag.carrier && distance(player.x, player.y, enemyFlag.x, enemyFlag.y) < CAPTURE_DISTANCE) {
      flags = { ...flags, [enemyId]: { ...enemyFlag, carrier: id } };
    }

    if (enemyFlag.carrier === id && !homeFlag.carrier && distance(player.x, player.y, homeFlag.baseX, homeFlag.baseY) < CAPTURE_DISTANCE) {
      players = { ...players, [id]: { ...player, score: player.score + 1 } };
      flags = { ...flags, [enemyId]: resetFlag(enemyFlag) };
    }
  });

  return { players, flags };
}

function resetDeadCarriers(
  flags: Record<PlayerId, FlagState>,
  players: GameState['players'],
): Record<PlayerId, FlagState> {
  return {
    blue: flags.blue.carrier && players[flags.blue.carrier].hp <= 0 ? resetFlag(flags.blue) : flags.blue,
    red: flags.red.carrier && players[flags.red.carrier].hp <= 0 ? resetFlag(flags.red) : flags.red,
  };
}

function createFlag(owner: PlayerId, x: number, y: number): FlagState {
  return { owner, baseX: x, baseY: y, x, y, carrier: null };
}

function followCarriers(flags: Record<PlayerId, FlagState>, players: GameState['players']): Record<PlayerId, FlagState> {
  return {
    blue: followCarrier(flags.blue, players),
    red: followCarrier(flags.red, players),
  };
}

function followCarrier(flag: FlagState, players: GameState['players']): FlagState {
  return flag.carrier ? { ...flag, x: players[flag.carrier].x, y: players[flag.carrier].y } : flag;
}

function resetFlag(flag: FlagState): FlagState {
  return { ...flag, x: flag.baseX, y: flag.baseY, carrier: null };
}

function center(rect: { x: number; y: number; width: number; height: number }) {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

function distance(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}
