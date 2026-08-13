import { isDisasterMode, modeConfigs } from './arenaModes';
import {
  ARENA_HEIGHT,
  ARENA_WIDTH,
  type GameState,
  type NaturalDisaster,
  type PlayerId,
} from './arenaTypes';

const disasterKinds: NaturalDisaster['kind'][] = ['fire', 'storm', 'quake', 'flood'];
const warningSeconds = 1.05;

export function tickDisasters(state: GameState, delta: number): {
  players: GameState['players'];
  disasters: NaturalDisaster[];
  nextId: number;
  timer: number;
} {
  if (!isDisasterMode(state.mode)) {
    return { players: state.players, disasters: [], nextId: state.nextDisasterId, timer: state.disasterTimer };
  }

  const config = modeConfigs[state.mode];
  const aged = state.disasters
    .map((disaster) => ({ ...disaster, age: disaster.age - delta }))
    .filter((disaster) => disaster.age > 0);
  const shouldSpawn = state.disasterTimer <= 0;
  const disasters = shouldSpawn ? [...aged, createDisaster(state.nextDisasterId)] : aged;
  const players = damagePlayers(state.players, disasters, delta);

  return {
    players,
    disasters,
    nextId: state.nextDisasterId + (shouldSpawn ? 1 : 0),
    timer: shouldSpawn ? config.disasterSpawnSeconds ?? 2.2 : state.disasterTimer - delta,
  };
}

function createDisaster(id: number): NaturalDisaster {
  const kind = disasterKinds[id % disasterKinds.length];
  const preset = getPreset(kind);
  const jitterX = ((id * 11) % 9) - 4;
  const jitterY = ((id * 13) % 7) - 3;

  return {
    id,
    kind,
    x: clamp(6 + ((id * 23) % Math.floor(ARENA_WIDTH - preset.width - 12)) + jitterX, 4, ARENA_WIDTH - preset.width - 4),
    y: clamp(5 + ((id * 17) % Math.floor(ARENA_HEIGHT - preset.height - 10)) + jitterY, 4, ARENA_HEIGHT - preset.height - 4),
    width: preset.width,
    height: preset.height,
    age: preset.activeFor + warningSeconds,
    activeAt: preset.activeFor,
    damage: preset.damage,
  };
}

function damagePlayers(
  players: GameState['players'],
  disasters: NaturalDisaster[],
  delta: number,
): GameState['players'] {
  const nextPlayers = { ...players };

  (Object.keys(nextPlayers) as PlayerId[]).forEach((id) => {
    const player = nextPlayers[id];
    if (player.hp <= 0) {
      return;
    }

    const damage = disasters
      .filter((disaster) => disaster.age <= disaster.activeAt)
      .reduce((total, disaster) => (
        pointInRect(player.x, player.y, disaster) ? total + disaster.damage * delta : total
      ), 0);
    nextPlayers[id] = { ...player, hp: Math.max(0, player.hp - damage) };
  });

  return nextPlayers;
}

function getPreset(kind: NaturalDisaster['kind']): {
  width: number;
  height: number;
  activeFor: number;
  damage: number;
} {
  if (kind === 'storm') {
    return { width: 18, height: 18, activeFor: 1.25, damage: 50 };
  }

  if (kind === 'quake') {
    return { width: 30, height: 10, activeFor: 1.9, damage: 26 };
  }

  return kind === 'flood'
    ? { width: 38, height: 12, activeFor: 2.25, damage: 18 }
    : { width: 18, height: 18, activeFor: 2.25, damage: 24 };
}

function pointInRect(x: number, y: number, disaster: NaturalDisaster): boolean {
  return x >= disaster.x && x <= disaster.x + disaster.width && y >= disaster.y && y <= disaster.y + disaster.height;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
