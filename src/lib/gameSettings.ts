import type { GameMode, MapId } from './arenaTypes';
import { defaultControlBindings, normalizeControlBindings, type ControlBindings } from './gameKeys';

export type BotDifficulty = 'easy' | 'newbie' | 'normal' | 'hard' | 'veryHard' | 'ultra';
export type Language = 'en' | 'ru';
export type GameFps = 24 | 30 | 45 | 60;

export const fpsOptions: GameFps[] = [24, 30, 45, 60];
export const botDifficultyOptions: BotDifficulty[] = ['easy', 'newbie', 'normal', 'hard', 'veryHard', 'ultra'];

export type GameSettings = {
  defaultMode: GameMode;
  defaultMap: MapId;
  gameFps: GameFps;
  animations: boolean;
  touchControls: boolean;
  achievementToasts: boolean;
  darkMode: boolean;
  lowSpecMode: boolean;
  music: boolean;
  redBot: boolean;
  botUsesWeapons: boolean;
  secretZombies: boolean;
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
  music: false,
  redBot: true,
  botUsesWeapons: false,
  secretZombies: true,
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
