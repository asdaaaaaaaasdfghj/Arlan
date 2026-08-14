import { type GameMode, type GameState, type Player, type PlayerId } from './arenaTypes';
import { isGlassCoreDestroyed } from './arenaGlassWars';
import { isDisasterMode, isZombieMode, modeConfigs } from './arenaModes';
import { getPaintBattleWinner } from './arenaPaint';

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

  if (isZombieMode(mode)) {
    return players.blue.hp <= 0 && players.red.hp <= 0 ? 'zombies' : timeLeft <= 0 ? 'survivors' : null;
  }

  if (isDisasterMode(mode)) {
    return players.blue.hp <= 0 && players.red.hp <= 0 ? 'catastrophes' : timeLeft <= 0 ? 'survivors' : null;
  }

  if (mode === 'paintBattle') {
    return timeLeft <= 0 && state ? getPaintBattleWinner(state) : null;
  }

  const scoreToWin = modeConfigs[mode].scoreToWin;

  if (players.blue.score >= scoreToWin) {
    return 'blue';
  }

  if (players.red.score >= scoreToWin) {
    return 'red';
  }

  if (timeLeft > 0 || modeConfigs[mode].noTimer) {
    return null;
  }

  if (players.blue.score === players.red.score) {
    return 'draw';
  }

  return players.blue.score > players.red.score ? 'blue' : 'red';
}
