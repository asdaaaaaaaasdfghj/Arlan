import { useEffect, useRef, useState } from 'react';
import {
  findNewAchievements,
  loadUnlockedAchievements,
  saveUnlockedAchievements,
  type AchievementContext,
  type AchievementId,
} from './achievements';
import type { GameState } from './arenaTypes';

export function useAchievementToasts(game: GameState, enabled: boolean, context: AchievementContext) {
  const [toast, setToast] = useState<AchievementId | null>(null);
  const [leaving, setLeaving] = useState(false);
  const unlockedRef = useRef<AchievementId[]>(loadUnlockedAchievements());

  useEffect(() => {
    const next = findNewAchievements(game, unlockedRef.current, context);
    if (next.length === 0) {
      return;
    }

    unlockedRef.current = [...unlockedRef.current, ...next];
    saveUnlockedAchievements(unlockedRef.current);
    if (enabled) {
      setLeaving(false);
      setToast(next[0]);
    }
  }, [context, enabled, game]);

  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const leaveTimer = window.setTimeout(() => setLeaving(true), 2200);
    const removeTimer = window.setTimeout(() => setToast(null), 2800);
    return () => {
      window.clearTimeout(leaveTimer);
      window.clearTimeout(removeTimer);
    };
  }, [toast]);

  return { toast, leaving };
}
