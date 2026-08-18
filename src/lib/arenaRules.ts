import { type GameMode, type GameState, type Player, type PlayerId } from './arenaTypes';
import { isGlassCoreDestroyed } from './arenaGlassWars';
import { isLavaSurvivalMode } from './arenaLavaSurvival';
import { isDisasterMode, isZombieMode, modeConfigs } from './arenaModes';
import { getPaintBattleWinner } from './arenaPaint';
import { getSeaBattleWinner } from './arenaSeaBattle';
import { countTeamBots } from './arenaTeamBots';

export function findWinner(
  players: Record<PlayerId, Player>,
  timeLeft: number,
  mode: GameMode,
  state?: GameState,
): GameState['winner'] {
  if (mode === 'glassWars' && state) {
    const blueLost = isGlassCoreDestroyed(state.allyCheckpoints, 'blue') && players.blue.hp <= 0;
    const redLost = isGlassCoreDestroyed(state.allyCheckpoints, 'red') && players.red.hp <= 0;
    if (blueLost && redLost) return 'draw';
    if (blueLost) return 'red';
    if (redLost) return 'blue';
    return null;
  }

  if (mode === 'seaBattle' && state) {
    return getSeaBattleWinner(state.ships);
  }

  if (isZombieMode(mode)) {
    return players.blue.hp <= 0 && players.red.hp <= 0 ? 'zombies' : timeLeft <= 0 ? 'survivors' : null;
  }

  if (isDisasterMode(mode)) {
    return players.blue.hp <= 0 && players.red.hp <= 0 ? 'catastrophes' : timeLeft <= 0 ? 'survivors' : null;
  }

  if (mode === 'paintBattle') {
    return timeLeft <= 0 && state ? getPaintBattleWinner(state) : null;
  }

  if (isLavaSurvivalMode(mode)) {
    if (players.blue.score >= 1 && players.red.score >= 1) return 'draw';
    if (players.blue.score >= 1) return 'blue';
    if (players.red.score >= 1) return 'red';
    if (players.blue.hp <= 0 && players.red.hp <= 0) return 'draw';
    if (timeLeft <= 0) return getFarthestRunner(players);
    return null;
  }

  if (mode === 'miniGames') {
    return timeLeft <= 0 ? getScoreWinner(players) : null;
  }

  const scoreToWin = getScoreToWin(mode, state);

  if (players.blue.score >= scoreToWin) {
    return 'blue';
  }

  if (players.red.score >= scoreToWin) {
    return 'red';
  }

  if (timeLeft > 0 || modeConfigs[mode].noTimer) {
    return null;
  }

  return getScoreWinner(players);
}

export function getScoreToWin(mode: GameMode, state?: GameState): number {
  const baseScore = mode === 'miniGames' ? 5 : modeConfigs[mode].scoreToWin;
  if (!state || baseScore <= 0 || mode === 'kingHill' || mode === 'captureFlag' || mode === 'glassWars') {
    return baseScore;
  }

  return baseScore + Math.ceil(countTeamBots(state) / 2);
}

function getScoreWinner(players: Record<PlayerId, Player>): GameState['winner'] {
  if (players.blue.score === players.red.score) {
    return 'draw';
  }

  return players.blue.score > players.red.score ? 'blue' : 'red';
}

function getFarthestRunner(players: Record<PlayerId, Player>): GameState['winner'] {
  if (Math.abs(players.blue.x - players.red.x) < 2) {
    return 'draw';
  }

  return players.blue.x > players.red.x ? 'blue' : 'red';
}
