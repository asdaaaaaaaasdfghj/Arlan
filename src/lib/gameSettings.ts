import type { GameMode, MapId } from './arenaTypes';
import { defaultControlBindings, normalizeControlBindings, type ControlBindings } from './gameKeys';

export type BotDifficulty = 'easy' | 'newbie' | 'normal' | 'hard' | 'veryHard' | 'ultra' | 'impossible' | 'thermonuclear';
export type Language = 'en' | 'ru' | 'es' | 'de' | 'fr' | 'kk';
export type GameFps = 24 | 30 | 45 | 60;

export const fpsOptions: GameFps[] = [24, 30, 45, 60];
export const botDifficultyOptions: BotDifficulty[] = ['easy', 'newbie', 'normal', 'hard', 'veryHard', 'ultra', 'impossible', 'thermonuclear'];
export const languageOptions: Language[] = ['en', 'ru', 'es', 'de', 'fr', 'kk'];

export type GameSettings = {
  defaultMode: GameMode;
  defaultMap: MapId;
  gameFps: GameFps;
  animations: boolean;
  touchControls: boolean;
  achievementToasts: boolean;
  darkMode: boolean;
  lowSpecMode: boolean;
  tankPlayers: boolean;
  music: boolean;
  soundEffects: boolean;
  redBot: boolean;
  blueTeamBots: number;
  redTeamBots: number;
  botUsesWeapons: boolean;
  secretZombies: boolean;
  roundMutations: boolean;
  botDifficulty: BotDifficulty;
  language: Language;
  controls: ControlBindings;
};

const storageKey = 'duel-arena-settings';

export const defaultSettings: GameSettings = {
  defaultMode: 'duel',
  defaultMap: 'crossfire',
  gameFps: 30,
  animations: true,
  touchControls: true,
  achievementToasts: true,
  darkMode: false,
  lowSpecMode: false,
  tankPlayers: false,
  music: false,
  soundEffects: true,
  redBot: true,
  blueTeamBots: 0,
  redTeamBots: 0,
  botUsesWeapons: false,
  secretZombies: true,
  roundMutations: false,
  botDifficulty: 'normal',
  language: 'en',
  controls: defaultControlBindings,
};

export function loadGameSettings(): GameSettings {
  const saved = window.localStorage.getItem(storageKey);
  if (!saved) {
    return defaultSettings;
  }

  try {
    const parsed = JSON.parse(saved) as Partial<GameSettings>;
    return {
      ...defaultSettings,
      ...parsed,
      controls: normalizeControlBindings(parsed.controls),
      gameFps: normalizeFps(parsed.gameFps),
      botDifficulty: normalizeBotDifficulty(parsed.botDifficulty),
      language: normalizeLanguage(parsed.language),
      blueTeamBots: normalizeBotCount(parsed.blueTeamBots),
      redTeamBots: normalizeBotCount(parsed.redTeamBots),
    };
  } catch {
    return defaultSettings;
  }
}

export function saveGameSettings(settings: GameSettings) {
  window.localStorage.setItem(storageKey, JSON.stringify(settings));
}

export function applyTheme(darkMode: boolean) {
  document.documentElement.dataset.theme = darkMode ? 'dark' : 'light';
}

export function applyVisualSettings(settings: Pick<GameSettings, 'darkMode' | 'lowSpecMode'>) {
  applyTheme(settings.darkMode);
  document.documentElement.dataset.performance = settings.lowSpecMode ? 'low' : 'normal';
}

function normalizeFps(value: unknown): GameFps {
  return fpsOptions.includes(value as GameFps) ? value as GameFps : defaultSettings.gameFps;
}

function normalizeBotDifficulty(value: unknown): BotDifficulty {
  return botDifficultyOptions.includes(value as BotDifficulty) ? value as BotDifficulty : defaultSettings.botDifficulty;
}

function normalizeLanguage(value: unknown): Language {
  return languageOptions.includes(value as Language) ? value as Language : defaultSettings.language;
}

function normalizeBotCount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(12, Math.max(0, Math.round(value))) : 0;
}
