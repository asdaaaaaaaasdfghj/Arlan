import type { AllyUnit, GameState, PlayerId } from './arenaTypes';

export type TeamBotCounts = {
  blue: number;
  red: number;
};

const teamBotHp = 55;
const maxTeamBots = 12;

export function addTeamBots(game: GameState, counts: TeamBotCounts): GameState {
  const blueCount = clampCount(counts.blue);
  const redCount = clampCount(counts.red);
  if (blueCount === 0 && redCount === 0) return game;

  return {
    ...game,
    allies: [
      ...game.allies,
      ...createTeamBots('blue', blueCount, 90000, game),
      ...createTeamBots('red', redCount, 91000, game),
    ],
  };
}

function createTeamBots(owner: PlayerId, count: number, idStart: number, game: GameState): AllyUnit[] {
  const spawn = game.players[owner];
  return Array.from({ length: count }, (_, index) => {
    const ring = Math.floor(index / 6) + 1;
    const angle = (index / Math.max(1, count)) * Math.PI * 2 + (owner === 'blue' ? 0.4 : 3.6);
    return {
      id: idStart + index,
      owner,
      x: clamp(spawn.x + Math.cos(angle) * 7 * ring, 5, 95),
      y: clamp(spawn.y + Math.sin(angle) * 5 * ring, 5, 59),
      hp: teamBotHp,
      cooldown: index * 0.12,
      respawnTimer: 0,
      checkpointId: null,
      facingX: owner === 'blue' ? 1 : -1,
      facingY: 0,
    };
  });
}

function clampCount(value: number): number {
  return Math.min(maxTeamBots, Math.max(0, Math.round(value)));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
