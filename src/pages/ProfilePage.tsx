import type { User } from '@supabase/supabase-js';
import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { Auth } from '../components/Auth';
import { loadGameSettings, type Language } from '../lib/gameSettings';
import { t } from '../lib/i18n';
import { getAchievementText, unlockAchievement, type AchievementId } from '../lib/achievements';
import { syncFriendProfile } from '../lib/friends';
import { loadGuestProfile, loadPlayerProfile, playerSkins, savePlayerProfile, type PlayerProfile, type PlayerSkinId } from '../lib/playerProfile';
import { isSupabaseConfigured, supabase, supabaseProjectRef } from '../lib/supabase';
import { useCloudProgress } from '../lib/useCloudProgress';
import './profile.css';
import './game-toasts.css';

function CloudSetupCard() {
  const linkCommand = supabaseProjectRef
    ? `npm run db:link -- --project-ref ${supabaseProjectRef}`
    : 'npm run db:link -- --project-ref YOUR_PROJECT_REF';

  void getErrorMessage;

  return (
    <section className="profile-setup-card">
      <strong>Cloud progress setup</strong>
      <span>Run these commands once in PowerShell inside the project folder:</span>
      <code>cd C:\Users\Admin\Desktop\Arlan\Arlan</code>
      <code>{linkCommand}</code>
      <code>npm run db:push -- --yes</code>
    </section>
  );
}

const labels = {
  ru: {
    account: 'Аккаунт',
    profile: 'Профиль',
    supabaseMissing: 'Supabase не настроен.',
    saved: 'Прогресс сохранён в аккаунт.',
    loaded: 'Прогресс загружен. Обнови страницу, если что-то не поменялось сразу.',
    noSave: 'В аккаунте пока нет сохранения.',
    save: 'Сохранить прогресс',
    load: 'Загрузить прогресс',
    signOut: 'Выйти',
    nickname: 'Ник',
    color: 'Цвет',
    skin: 'Скин',
    saveLook: 'Сохранить ник, цвет и скин',
    lookSaved: 'Ник, цвет и скин сохранены.',
    onlineOnly: 'Будет видно только в онлайн-игре.',
  },
  en: {
    account: 'Account',
    profile: 'Profile',
    supabaseMissing: 'Supabase is not configured.',
    saved: 'Progress saved to account.',
    loaded: 'Progress loaded. Refresh if something does not update instantly.',
    noSave: 'No save found in this account.',
    save: 'Save progress',
    load: 'Load progress',
    signOut: 'Sign out',
    nickname: 'Nickname',
    color: 'Color',
    skin: 'Skin',
    saveLook: 'Save name, color and skin',
    lookSaved: 'Name, color and skin saved.',
    onlineOnly: 'Visible only in online games.',
  },
} as const;

const skinNames: Record<'ru' | 'en', Record<PlayerSkinId, string>> = {
  ru: {
    none: 'Пусто',
    cube: 'Пиксель',
    ship: 'Молния',
    ball: 'Кольцо',
    ufo: 'Глаза',
    wave: 'Волна',
    robot: 'Лицо',
  },
  en: {
    none: 'Empty',
    cube: 'Pixel',
    ship: 'Bolt',
    ball: 'Ring',
    ufo: 'Eyes',
    wave: 'Wave',
    robot: 'Face',
  },
};

export function ProfilePage() {
  const [settings] = useState(loadGameSettings);
  const language = settings.language;
  const text = getProfileLabels(language);
  const [user, setUser] = useState<User | null>(null);
  const [message, setMessage] = useState('');
  const [achievementToast, setAchievementToast] = useState<AchievementId | null>(null);
  const [playerProfile, setPlayerProfile] = useState(loadPlayerProfile);
  const cloudProgress = useCloudProgress(user, language, () => setPlayerProfile(loadPlayerProfile()));
  const guestProfile = loadGuestProfile();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!achievementToast) {
      return undefined;
    }

    const timerId = window.setTimeout(() => setAchievementToast(null), 2800);
    return () => window.clearTimeout(timerId);
  }, [achievementToast]);

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
  }

  function updatePlayerProfile(next: Partial<PlayerProfile>) {
    setPlayerProfile((current) => ({ ...current, ...next }));
  }

  async function saveLook() {
    savePlayerProfile(playerProfile);
    if (isGuestLook(playerProfile, guestProfile) && unlockAchievement('guestSkinCopy')) {
      setAchievementToast('guestSkinCopy');
    }
    cloudProgress.clearMessage();
    try {
      if (user && isSupabaseConfigured) {
        await syncFriendProfile(user, playerProfile);
      }
      setMessage(text.lookSaved);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : text.lookSaved);
    }
  }

  return (
    <main className="profile-page">
      <nav className="menu-nav">
        <Link href="/">{t(language, 'home')}</Link>
        <Link href="/settings">{t(language, 'settings')}</Link>
      </nav>
      <section className="profile-panel">
        <p className="eyebrow">{text.account}</p>
        <h1>{text.profile}</h1>
        {!user && (
          <section className="profile-guest-card">
            <strong>{language === 'ru' ? 'Ты сейчас гость' : 'You are a guest'}</strong>
            <span className="profile-preview" style={{ '--profile-color': guestProfile.color } as CSSProperties}>
              <span className={`profile-preview-icon skin-${guestProfile.skin}`} />
              {guestProfile.nickname}
            </span>
            <p>{language === 'ru' ? 'В онлайн-игре ты будешь серым. Войди в аккаунт, чтобы выбрать ник, цвет и скин.' : 'In online games you will be gray. Sign in to choose a nickname, color, and skin.'}</p>
            {isSupabaseConfigured && <Auth />}
          </section>
        )}
        {user && (
          <section className="profile-look">
            <label>
              {text.nickname}
              <input value={playerProfile.nickname} maxLength={16} onChange={(event) => updatePlayerProfile({ nickname: event.target.value })} />
            </label>
            <label>
              {text.color}
              <input type="color" value={playerProfile.color} onChange={(event) => updatePlayerProfile({ color: event.target.value })} />
            </label>
            <div className="profile-skins" aria-label={text.skin}>
              {playerSkins.map((skin) => (
                <button
                  className={`profile-skin-button ${playerProfile.skin === skin ? 'active' : ''}`}
                  type="button"
                  onClick={() => updatePlayerProfile({ skin })}
                  key={skin}
                >
                  <span className={`profile-skin-icon skin-${skin}`} style={{ '--profile-color': playerProfile.color } as CSSProperties} />
                  <b>{getSkinName(skin, language)}</b>
                </button>
              ))}
            </div>
            <span className="profile-preview" style={{ '--profile-color': playerProfile.color } as CSSProperties}>
              <span className={`profile-preview-icon skin-${playerProfile.skin}`} />
              {playerProfile.nickname || 'Player'}
            </span>
            <button type="button" onClick={() => void saveLook()}>{text.saveLook}</button>
            <p>{text.onlineOnly}</p>
          </section>
        )}
        {!isSupabaseConfigured && <p>{text.supabaseMissing}</p>}
        {user && (
          <div className="profile-actions">
            <strong>{user.email}</strong>
            <button type="button" disabled={cloudProgress.busy} onClick={() => { setMessage(''); void cloudProgress.save(); }}>{text.save}</button>
            <button type="button" className="ghost-button" disabled={cloudProgress.busy} onClick={() => { setMessage(''); void cloudProgress.load(); }}>{text.load}</button>
            <button type="button" className="danger-button" disabled={cloudProgress.busy} onClick={signOut}>{text.signOut}</button>
          </div>
        )}
        {cloudProgress.setupNeeded && <CloudSetupCard />}
        {(message || cloudProgress.message) && <p className="profile-message">{message || cloudProgress.message}</p>}
      </section>
      {achievementToast && (
        <div className="achievement-toast">
          <strong>{getAchievementText(achievementToast, language).title}</strong>
          <span>{getAchievementText(achievementToast, language).description}</span>
        </div>
      )}
    </main>
  );
}

function getProfileLabels(language: Language) {
  return language === 'ru' ? labels.ru : labels.en;
}

function getSkinName(skin: PlayerSkinId, language: Language): string {
  return skinNames[language === 'ru' ? 'ru' : 'en'][skin];
}

function isGuestLook(profile: PlayerProfile, guestProfile: PlayerProfile): boolean {
  return profile.skin === guestProfile.skin && profile.color.toLowerCase() === guestProfile.color.toLowerCase();
}

function getErrorMessage(error: unknown, language: Language): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = String(error.message);
    if (message.includes('user_progress') || message.includes('relation')) {
      return language === 'ru'
        ? 'Таблица прогресса ещё не создана. Нужно применить миграции: npm run db:push -- --yes'
        : 'Progress table is missing. Apply migrations: npm run db:push -- --yes';
    }

    return message;
  }

  return language === 'ru' ? 'Не получилось сохранить прогресс.' : 'Could not save progress.';
}
