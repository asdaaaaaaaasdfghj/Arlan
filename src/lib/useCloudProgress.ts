import { useState } from 'react';
import type { User } from '@supabase/supabase-js';
import {
  applyCloudProgress,
  isCloudProgressSetupError,
  loadProgressFromAccount,
  saveProgressToAccount,
} from './accountProgress';

type Language = 'ru' | 'en';

type CloudProgressState = {
  busy: boolean;
  message: string;
  setupNeeded: boolean;
  save: () => Promise<void>;
  load: () => Promise<void>;
  clearMessage: () => void;
};

export function useCloudProgress(user: User | null, language: Language, onLoaded: () => void): CloudProgressState {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [setupNeeded, setSetupNeeded] = useState(false);

  async function run(success: string, action: (currentUser: User) => Promise<void>) {
    if (!user) return;
    const currentUser = user;
    setBusy(true);
    setMessage('');
    setSetupNeeded(false);
    try {
      await action(currentUser);
      setMessage(success);
    } catch (error) {
      setSetupNeeded(isCloudProgressSetupError(error));
      setMessage(getCloudProgressMessage(error, language));
    } finally {
      setBusy(false);
    }
  }

  return {
    busy,
    message,
    setupNeeded,
    save: () => run(getSuccessMessage('save', language), saveProgressToAccount),
    load: () => run(getSuccessMessage('load', language), async (currentUser) => {
      const progress = await loadProgressFromAccount(currentUser);
      if (!progress) throw new Error('No cloud save found.');
      applyCloudProgress(progress);
      onLoaded();
    }),
    clearMessage: () => setMessage(''),
  };
}

function getSuccessMessage(action: 'save' | 'load', language: Language): string {
  if (language === 'ru') {
    return action === 'save' ? 'Progress saved to cloud.' : 'Progress loaded from cloud.';
  }

  return action === 'save' ? 'Progress saved to cloud.' : 'Progress loaded from cloud.';
}

function getCloudProgressMessage(error: unknown, language: Language): string {
  if (isCloudProgressSetupError(error)) {
    return language === 'ru'
      ? 'Cloud progress table is missing. Run the commands below once.'
      : 'Cloud progress table is missing. Run the commands below once.';
  }

  if (error instanceof Error) return error.message;
  return language === 'ru' ? 'Could not sync progress.' : 'Could not sync progress.';
}
