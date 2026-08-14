import type { GameState, PlayerId } from './arenaTypes';
import { loadGuestProfile, loadPlayerProfile, type PlayerProfile } from './playerProfile';

const leaderboardKey = 'duel-arena-leaderboard';

export type LeaderboardEntry = {
  id: string;
  nickname: string;
  color: string;
  guest: boolean;
  kills: number;
  wins: number;
  matches: number;
};

export function loadLeaderboard(): LeaderboardEntry[] {
  if (typeof window === 'undefined') return [];

  try {
    const saved = window.localStorage.getItem(leaderboardKey);
    const parsed = saved ? JSON.parse(saved) as unknown : [];
    return Array.isArray(parsed) ? parsed.map(normalizeEntry).sort(sortEntries) : [];
  } catch {
    return [];
  }
}

export function clearLeaderboard() {
  window.localStorage.removeItem(leaderboardKey);
}

export function recordLeaderboardGame(game: GameState) {
  if (game.status !== 'finished') return;

  const blueProfile = loadPlayerProfile();
  const redProfile = loadGuestProfile();
  const entries = loadLeaderboard();
  const blueKills = game.players.red.deathCount;
  const redKills = game.players.blue.deathCount;

  saveEntries([
    upsertEntry(entries, 'blue', blueProfile, false, blueKills, game.winner === 'blue'),
    upsertEntry(entries, 'red', redProfile, true, redKills, game.winner === 'red'),
  ]);
}

function upsertEntry(
  entries: LeaderboardEntry[],
  player: PlayerId,
  profile: PlayerProfile,
  guest: boolean,
  kills: number,
  won: boolean,
): LeaderboardEntry {
  const id = `${guest ? 'guest' : 'player'}:${profile.nickname}:${player}`;
  const current = entries.find((entry) => entry.id === id) ?? {
    id,
    nickname: profile.nickname,
    color: profile.color,
    guest,
    kills: 0,
    wins: 0,
    matches: 0,
  };

  return {
    ...current,
    nickname: profile.nickname,
    color: profile.color,
    kills: current.kills + Math.max(0, kills),
    wins: current.wins + (won ? 1 : 0),
    matches: current.matches + 1,
  };
}

function saveEntries(changed: LeaderboardEntry[]) {
  const unchanged = loadLeaderboard().filter((entry) => !changed.some((next) => next.id === entry.id));
  window.localStorage.setItem(leaderboardKey, JSON.stringify([...unchanged, ...changed].sort(sortEntries)));
}

function normalizeEntry(value: Partial<LeaderboardEntry>): LeaderboardEntry {
  return {
    id: typeof value.id === 'string' ? value.id : crypto.randomUUID(),
    nickname: typeof value.nickname === 'string' ? value.nickname : 'Player',
    color: typeof value.color === 'string' ? value.color : '#3a86ff',
    guest: Boolean(value.guest),
    kills: Math.max(0, Number(value.kills) || 0),
    wins: Math.max(0, Number(value.wins) || 0),
    matches: Math.max(0, Number(value.matches) || 0),
  };
}

function sortEntries(left: LeaderboardEntry, right: LeaderboardEntry): number {
  return right.wins - left.wins || right.kills - left.kills || right.matches - left.matches;
}
