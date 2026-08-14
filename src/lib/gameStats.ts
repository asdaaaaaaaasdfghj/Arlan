import { modeOrder } from './arenaModes';
import type { GameMode, GameState } from './arenaTypes';
import { recordLeaderboardGame } from './leaderboard';

const statsKey = 'duel-arena-stats';

export type GameStats = {
  matches: number;
  draws: number;
  blueWins: number;
  redWins: number;
  survivalWins: number;
  zombieWins: number;
  catastropheWins: number;
  deaths: number;
  shots: number;
  secondsPlayed: number;
  winsByMode: Record<GameMode, number>;
};

export function loadGameStats(): GameStats {
  const fallback = createEmptyStats();
  if (typeof window === 'undefined') return fallback;

  const saved = window.localStorage.getItem(statsKey);
  if (!saved) return fallback;

  try {
    return normalizeStats(JSON.parse(saved) as Partial<GameStats>);
  } catch {
    return fallback;
  }
}

export function saveGameStats(stats: GameStats) {
  window.localStorage.setItem(statsKey, JSON.stringify(stats));
}

export function clearGameStats() {
  window.localStorage.removeItem(statsKey);
}

export function recordFinishedGame(game: GameState) {
  if (game.status !== 'finished') return;

  recordLeaderboardGame(game);
  const stats = loadGameStats();
  const winner = game.winner;
  const modeWins = winner && winner !== 'draw' ? addModeWin(stats.winsByMode, game.mode) : stats.winsByMode;

  saveGameStats({
    ...stats,
    matches: stats.matches + 1,
    draws: stats.draws + (winner === 'draw' ? 1 : 0),
    blueWins: stats.blueWins + (winner === 'blue' ? 1 : 0),
    redWins: stats.redWins + (winner === 'red' ? 1 : 0),
    survivalWins: stats.survivalWins + (winner === 'survivors' ? 1 : 0),
    zombieWins: stats.zombieWins + (winner === 'zombies' ? 1 : 0),
    catastropheWins: stats.catastropheWins + (winner === 'catastrophes' ? 1 : 0),
    deaths: stats.deaths + game.players.blue.deathCount + game.players.red.deathCount,
    shots: stats.shots + game.players.blue.shotsFired + game.players.red.shotsFired,
    secondsPlayed: stats.secondsPlayed + Math.round(game.elapsedTime),
    winsByMode: modeWins,
  });
}

export function formatPlayTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${rest}s`;
  return `${rest}s`;
}

function createEmptyStats(): GameStats {
  return {
    matches: 0,
    draws: 0,
    blueWins: 0,
    redWins: 0,
    survivalWins: 0,
    zombieWins: 0,
    catastropheWins: 0,
    deaths: 0,
    shots: 0,
    secondsPlayed: 0,
    winsByMode: Object.fromEntries(modeOrder.map((mode) => [mode, 0])) as Record<GameMode, number>,
  };
}

function normalizeStats(value: Partial<GameStats>): GameStats {
  const fallback = createEmptyStats();
  return {
    ...fallback,
    ...value,
    winsByMode: { ...fallback.winsByMode, ...(value.winsByMode ?? {}) },
  };
}

function addModeWin(wins: Record<GameMode, number>, mode: GameMode): Record<GameMode, number> {
  return { ...wins, [mode]: wins[mode] + 1 };
}
