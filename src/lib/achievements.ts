import { mapOrder } from './arenaMap';
import { isZombieMode, modeOrder } from './arenaModes';
import type { GameMode, GameState, MapId } from './arenaTypes';
import { achievementRu, achievementTranslations, achievements, type Achievement, type AchievementId } from './achievementCatalog';
import type { BotDifficulty, Language } from './gameSettings';
export { achievements, type Achievement, type AchievementId } from './achievementCatalog';

export type AchievementContext = {
  redBot: boolean;
  botDifficulty: BotDifficulty;
};

export type AchievementProgress = {
  wonModes: GameMode[];
  playedMaps: MapId[];
};

const storageKey = 'duel-arena-achievements';
const progressKey = 'duel-arena-achievement-progress';

export function loadUnlockedAchievements(): AchievementId[] {
  const saved = window.localStorage.getItem(storageKey);
  if (!saved) {
    return [];
  }

  try {
    return JSON.parse(saved) as AchievementId[];
  } catch {
    return [];
  }
}

export function saveUnlockedAchievements(ids: AchievementId[]) {
  window.localStorage.setItem(storageKey, JSON.stringify(withCollector(ids)));
}

export function clearUnlockedAchievements() {
  window.localStorage.removeItem(storageKey);
  window.localStorage.removeItem(progressKey);
}

export function unlockAchievement(id: AchievementId): boolean {
  const unlocked = loadUnlockedAchievements();
  if (unlocked.includes(id)) return false;
  saveUnlockedAchievements([...unlocked, id]);
  return true;
}

export function findNewAchievements(
  game: GameState,
  unlocked: AchievementId[],
  context: AchievementContext,
): AchievementId[] {
  const progress = updateProgress(game, loadAchievementProgress());
  saveAchievementProgress(progress);

  const next = achievements
    .filter((achievement) => achievement.id !== 'collector')
    .filter((achievement) => !unlocked.includes(achievement.id) && isUnlocked(achievement.id, game, context, progress))
    .map((achievement) => achievement.id);
  return withCollector([...unlocked, ...next]).filter((id) => !unlocked.includes(id));
}

export function getAchievement(id: AchievementId): Achievement {
  return achievements.find((achievement) => achievement.id === id) ?? achievements[0];
}

export function getAchievementText(id: AchievementId, language: Language): Achievement {
  const achievement = getAchievement(id);
  if (language === 'ru') {
    return {
      id,
      title: achievementRu[id][0],
      description: achievementRu[id][1],
    };
  }

  const translation = achievementTranslations[language]?.[id];
  if (!translation) {
    return achievement;
  }

  return {
    id,
    title: translation[0],
    description: translation[1],
  };
}

function isUnlocked(
  id: AchievementId,
  game: GameState,
  context: AchievementContext,
  progress: AchievementProgress,
): boolean {
  const score = game.players.blue.score + game.players.red.score;

  if (id === 'firstScore') return score > 0;
  if (id === 'duelWin') return game.winner === 'blue' || game.winner === 'red';
  if (id === 'survivor') return game.winner === 'survivors';
  if (id === 'builder') return game.mode === 'zombies' && game.nextBarricadeId >= 4;
  if (id === 'grenadier') return game.mode === 'grenadeMayhem' && score > 0;
  if (id === 'zombieHunter') return isZombieMode(game.mode) && score >= 10;
  if (id === 'silentSurvivor') return didBlueSurviveSilently(game);
  if (id === 'selfDestruct') return game.players.blue.selfGrenadeDeaths > 0 || game.players.red.selfGrenadeDeaths > 0;
  if (id === 'easyBotOops') return context.redBot && context.botDifficulty === 'easy' && game.winner === 'red';
  if (id === 'painSpeedrun') return context.redBot && context.botDifficulty === 'thermonuclear' && game.players.blue.score >= 1;
  if (id === 'modeMaster') return modeOrder.every((mode) => progress.wonModes.includes(mode));
  if (id === 'collector') return false;
  return mapOrder.filter((mapId) => mapId !== 'custom').every((mapId) => progress.playedMaps.includes(mapId));
}

function withCollector(ids: AchievementId[]): AchievementId[] {
  const uniqueIds = [...new Set(ids)];
  const achievementIds = achievements.map((achievement) => achievement.id);
  const normalIds = achievementIds.filter((id) => id !== 'collector');
  const hasEveryNormal = normalIds.every((id) => uniqueIds.includes(id));
  return hasEveryNormal && !uniqueIds.includes('collector') ? [...uniqueIds, 'collector'] : uniqueIds;
}

function didBlueSurviveSilently(game: GameState): boolean {
  return game.status === 'finished'
    && game.mode !== 'endlessDuel'
    && game.players.blue.hp > 0
    && game.players.blue.shotsFired === 0;
}

function updateProgress(game: GameState, progress: AchievementProgress): AchievementProgress {
  if (game.status !== 'finished') {
    return progress;
  }

  return {
    wonModes: isBlueWin(game) ? addUnique(progress.wonModes, game.mode) : progress.wonModes,
    playedMaps: game.mapId === 'custom' ? progress.playedMaps : addUnique(progress.playedMaps, game.mapId),
  };
}

function isBlueWin(game: GameState): boolean {
  return game.winner === 'blue' || game.winner === 'survivors';
}

export function loadAchievementProgress(): AchievementProgress {
  const saved = window.localStorage.getItem(progressKey);
  if (!saved) {
    return { wonModes: [], playedMaps: [] };
  }

  try {
    return JSON.parse(saved) as AchievementProgress;
  } catch {
    return { wonModes: [], playedMaps: [] };
  }
}

export function saveAchievementProgress(progress: AchievementProgress) {
  window.localStorage.setItem(progressKey, JSON.stringify(progress));
}

function addUnique<T>(items: T[], item: T): T[] {
  return items.includes(item) ? items : [...items, item];
}
