import { isBlockedPlayerPosition } from './arenaMap';
import { getArenaBounds } from './arenaBounds';
import type { AllyUnit, GameState, PlayerId } from './arenaTypes';

export type TeamBotCounts = {
  blue: number;
  red: number;
};

const teamBotHp = 55;
const maxTeamBots = 12;
const blueTeamBotIdStart = 90000;
const redTeamBotIdStart = 91000;

export function addTeamBots(game: GameState, counts: TeamBotCounts): GameState {
  const blueCount = clampCount(counts.blue);
  const redCount = clampCount(counts.red);
  if (blueCount === 0 && redCount === 0) return game;

  return {
    ...game,
    allies: [
      ...game.allies,
      ...createTeamBots('blue', blueCount, blueTeamBotIdStart, game),
      ...createTeamBots('red', redCount, redTeamBotIdStart, game),
    ],
  };
}

export function countTeamBots(game: GameState): number {
  return game.allies.filter(isTeamBot).length;
}

export function isTeamBot(ally: AllyUnit): boolean {
  return ally.id >= blueTeamBotIdStart && ally.id < redTeamBotIdStart + maxTeamBots;
}

function createTeamBots(owner: PlayerId, count: number, idStart: number, game: GameState): AllyUnit[] {
  return Array.from({ length: count }, (_, index) => {
    const point = findFreeSpawnPoint(game, owner, index, count);
    return {
      id: idStart + index,
      owner,
      x: point.x,
      y: point.y,
      hp: teamBotHp,
      cooldown: index * 0.12,
      respawnTimer: 0,
      checkpointId: null,
      facingX: owner === 'blue' ? 1 : -1,
      facingY: 0,
    };
  });
}

function findFreeSpawnPoint(game: GameState, owner: PlayerId, index: number, count: number): { x: number; y: number } {
  const spawn = game.players[owner];
  const bounds = getArenaBounds(game.mapId);
  const blockers = [
    ...game.barricades,
    ...game.mapBoards,
    ...game.movingBlocks,
    ...game.tnts.filter((tnt) => tnt.active),
    ...game.ricochetBlocks,
    ...game.allyCheckpoints,
  ];

  for (let attempt = 0; attempt < 24; attempt += 1) {
    const ring = Math.floor((index + attempt) / 6) + 1;
    const angle = ((index + attempt * 0.73) / Math.max(1, count)) * Math.PI * 2 + (owner === 'blue' ? 0.4 : 3.6);
    const x = clamp(spawn.x + Math.cos(angle) * 7 * ring, 5, bounds.width - 5);
    const y = clamp(spawn.y + Math.sin(angle) * 5 * ring, 5, bounds.height - 5);
    if (!isBlockedPlayerPosition(x, y, game.mapId, blockers)) {
      return { x, y };
    }
  }

  return { x: spawn.x, y: spawn.y };
}

function clampCount(value: number): number {
  return Math.min(maxTeamBots, Math.max(0, Math.round(value)));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
