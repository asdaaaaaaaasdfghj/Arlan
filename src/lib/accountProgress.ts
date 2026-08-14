import type { User } from '@supabase/supabase-js';
import {
  loadAchievementProgress,
  loadUnlockedAchievements,
  saveAchievementProgress,
  saveUnlockedAchievements,
  type AchievementProgress,
  type AchievementId,
} from './achievements';
import {
  loadActiveCustomMapSlotId,
  loadCustomMapData,
  loadCustomMapSlots,
  saveCustomMapData,
  saveCustomMapSlots,
} from './customMapStorage';
import { defaultCustomWeapons, type CustomMapSlot, type CustomWeaponSettings, type CustomWeaponStats, type EditorCell, type SavedCustomMap } from './customMapTypes';
import { applyVisualSettings, loadGameSettings, saveGameSettings, type GameSettings } from './gameSettings';
import { loadGameStats, saveGameStats, type GameStats } from './gameStats';
import { loadPlayerProfile, savePlayerProfile, type PlayerProfile } from './playerProfile';
import { supabase } from './supabase';

const accountProgressBackupPrefix = 'duel-arena-account-progress:';

export type CloudProgress = {
  settings: GameSettings;
  stats: GameStats;
  achievements: AchievementId[];
  achievementProgress: AchievementProgress;
  customMap: SavedCustomMap;
  customMaps?: {
    activeSlotId: string;
    slots: CustomMapSlot[];
  };
  playerProfile?: PlayerProfile;
  savedAt: string;
};

export async function saveProgressToAccount(user: User): Promise<void> {
  const progress = collectLocalProgress();
  saveLocalAccountProgress(user.id, progress);
  const { error } = await supabase.from('user_progress').upsert({
    user_id: user.id,
    progress,
    updated_at: new Date().toISOString(),
  });

  if (error) throw new Error(getProgressErrorMessage(error));
}

export async function loadProgressFromAccount(user: User): Promise<CloudProgress | null> {
  const { data, error } = await supabase
    .from('user_progress')
    .select('progress')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    if (isMissingProgressTable(error)) throw new Error(getProgressErrorMessage(error));
    throw new Error(error.message);
  }

  return (data?.progress as CloudProgress | null) ?? loadLocalAccountProgress(user.id);
}

export function applyCloudProgress(progress: CloudProgress) {
  const customMapSize = {
    cols: progress.customMap.size?.cols ?? 20,
    rows: progress.customMap.size?.rows ?? 12,
  };
  const customMapCells = (progress.customMap.cells ?? []).flatMap((cell): EditorCell[] => {
    if (!Number.isFinite(cell.col) || !Number.isFinite(cell.row) || !cell.kind) {
      return [];
    }

    return [{ ...cell, col: Number(cell.col), row: Number(cell.row), kind: cell.kind }];
  });

  saveGameSettings(progress.settings);
  applyVisualSettings(progress.settings);
  saveGameStats(progress.stats);
  if (progress.playerProfile) {
    savePlayerProfile(progress.playerProfile);
  }
  saveUnlockedAchievements(progress.achievements);
  saveAchievementProgress(progress.achievementProgress);
  if (progress.customMaps) {
    saveCustomMapSlots(progress.customMaps.slots, progress.customMaps.activeSlotId);
  } else {
    saveCustomMapData(customMapCells, customMapSize, progress.customMap.theme, normalizeCloudWeapons(progress.customMap.weapons));
  }
}

function normalizeCloudWeapons(value: SavedCustomMap['weapons']): CustomWeaponSettings {
  return {
    blaster: normalizeWeaponStats(value?.blaster, defaultCustomWeapons.blaster),
    railgun: normalizeWeaponStats(value?.railgun, defaultCustomWeapons.railgun),
    shotgun: normalizeWeaponStats(value?.shotgun, defaultCustomWeapons.shotgun),
    custom4: normalizeWeaponStats(value?.custom4, defaultCustomWeapons.custom4),
    custom5: normalizeWeaponStats(value?.custom5, defaultCustomWeapons.custom5),
  };
}

function normalizeWeaponStats(value: Partial<CustomWeaponStats> | undefined, fallback: CustomWeaponStats): CustomWeaponStats {
  return {
    name: typeof value?.name === 'string' && value.name.trim() ? value.name.trim().slice(0, 18) : fallback.name,
    cooldown: finiteOrFallback(value?.cooldown, fallback.cooldown),
    damage: finiteOrFallback(value?.damage, fallback.damage),
    speed: finiteOrFallback(value?.speed, fallback.speed),
    bullets: finiteOrFallback(value?.bullets, fallback.bullets),
    spread: finiteOrFallback(value?.spread, fallback.spread),
    size: finiteOrFallback(value?.size, fallback.size),
  };
}

function finiteOrFallback(value: unknown, fallback: number): number {
  return Number.isFinite(value) ? Number(value) : fallback;
}

function collectLocalProgress(): CloudProgress {
  const customMap = loadCustomMapData();
  return {
    settings: loadGameSettings(),
    stats: loadGameStats(),
    achievements: loadUnlockedAchievements(),
    achievementProgress: loadAchievementProgress(),
    customMap,
    customMaps: {
      activeSlotId: loadActiveCustomMapSlotId(),
      slots: loadCustomMapSlots(),
    },
    playerProfile: loadPlayerProfile(),
    savedAt: new Date().toISOString(),
  };
}

function saveLocalAccountProgress(userId: string, progress: CloudProgress) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(`${accountProgressBackupPrefix}${userId}`, JSON.stringify(progress));
}

function loadLocalAccountProgress(userId: string): CloudProgress | null {
  if (typeof window === 'undefined') return null;

  try {
    const saved = window.localStorage.getItem(`${accountProgressBackupPrefix}${userId}`);
    return saved ? JSON.parse(saved) as CloudProgress : null;
  } catch {
    return null;
  }
}

function isMissingProgressTable(error: { message?: string; code?: string }): boolean {
  const message = error.message ?? '';
  return error.code === 'PGRST205' || message.includes('user_progress') || message.includes('schema cache') || message.includes('relation');
}

function getProgressErrorMessage(error: { message?: string; code?: string }): string {
  if (isMissingProgressTable(error)) {
    return 'Cloud progress table is missing. Run: npm run db:push -- --yes';
  }

  return error.message ?? 'Could not sync cloud progress.';
}
