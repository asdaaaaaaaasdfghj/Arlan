import { type ReactNode, useEffect, useState } from 'react';
import { Link } from 'wouter';
import { MenuShowcase } from '../components/MenuShowcase';
import { mapNames, mapOrder } from '../lib/arenaMap';
import { modeGroups } from '../lib/arenaModes';
import { loadGameSettings, type Language } from '../lib/gameSettings';
import { mapName, modeDescription, modeName, t } from '../lib/i18n';
import { pickSplashText } from '../lib/splashTexts';
import type { GameMode, MapId } from '../lib/arenaShooter';
import { useVersionStatus } from '../lib/appVersion';
import { getAchievementText, unlockAchievement, type AchievementId } from '../lib/achievements';
import './home.css';
import './game-toasts.css';

export function HomePage() {
  const [settings] = useState(loadGameSettings);
  const language = settings.language;
  const [mode, setMode] = useState<GameMode>(settings.defaultMode);
  const [mapId, setMapId] = useState<MapId>(settings.defaultMap);
  const [splash] = useState(pickSplashText);
  const [achievementToast, setAchievementToast] = useState<AchievementId | null>(null);
  const [secretCreditsOpen, setSecretCreditsOpen] = useState(false);
  const versionStatus = useVersionStatus();
  const playHref = `/game?mode=${mode}&map=${mapId}`;

  useEffect(() => {
    if (!versionStatus.outdated || !unlockAchievement('updateConfusion')) {
      return;
    }

    setAchievementToast('updateConfusion');
  }, [versionStatus.outdated]);

  useEffect(() => {
    if (!achievementToast) {
      return undefined;
    }

    const timerId = window.setTimeout(() => setAchievementToast(null), 2800);
    return () => window.clearTimeout(timerId);
  }, [achievementToast]);

  useEffect(() => {
    let buffer = '';
    const code = 'ABSOLUTEZERO';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.altKey || event.metaKey || event.key.length !== 1) return;
      buffer = `${buffer}${event.key.toUpperCase()}`.slice(-code.length);
      if (buffer === code) {
        setSecretCreditsOpen(true);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <main className="home-page">
      {versionStatus.outdated && <UpdateNotice language={language} />}
      {achievementToast && (
        <div className="achievement-toast">
          <strong>{getAchievementText(achievementToast, language).title}</strong>
          <span>{getAchievementText(achievementToast, language).description}</span>
        </div>
      )}
      <section className="home-hero-grid">
        <div className="home-hero">
          <p className="eyebrow">{t(language, 'localShooter')}</p>
          <div className="title-wrap">
            <h1>Duel Arena</h1>
            <span className="menu-splash">{splash}</span>
          </div>
          <p>{t(language, 'heroCopy')}</p>
          <MenuPicker title={t(language, 'mode')}>
            {modeGroups.map((group) => (
              <section className="mode-picker-group" key={group.id}>
                <strong className="mode-picker-group-title">{group.label[language] ?? group.label.en}</strong>
                <div>
                  {group.modes.map((item) => (
                    <button className={mode === item ? 'selected' : ''} type="button" key={item} onClick={() => setMode(item)}>
                      {modeName(item, language)}
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </MenuPicker>
          <MenuPicker title={t(language, 'map')}>
            {mapOrder.map((item) => (
              <button className={mapId === item ? 'selected' : ''} type="button" key={item} onClick={() => setMapId(item)}>
                {mapName(item, mapNames[item], language)}
              </button>
            ))}
          </MenuPicker>
          <div className="home-actions">
            <Link className="primary-link" href={playHref}>{t(language, 'play')}</Link>
            <Link className="secondary-link" href="/online">{language === 'ru' ? 'Онлайн' : 'Online'}</Link>
            <Link className="secondary-link" href="/editor">{t(language, 'mapEditor')}</Link>
            <Link className="secondary-link" href="/catalog">{language === 'ru' ? 'Каталог' : 'Catalog'}</Link>
            <Link className="secondary-link" href="/forum">{language === 'ru' ? 'Форум' : 'Forum'}</Link>
            <Link className="secondary-link" href="/tutorial">{language === 'ru' ? 'Туториал' : 'Tutorial'}</Link>
            <Link className="secondary-link" href="/leaderboard">{language === 'ru' ? 'Лидеры' : 'Leaders'}</Link>
            <Link className="secondary-link" href="/profile">{language === 'ru' ? 'Профиль' : 'Profile'}</Link>
            <Link className="secondary-link" href="/settings">{t(language, 'settings')}</Link>
          </div>
          <section className="home-selection">
            <div>
              <span>{t(language, 'mode')}</span>
              <strong>{modeName(mode, language)}</strong>
            </div>
            <div>
              <span>{t(language, 'map')}</span>
              <strong>{mapName(mapId, mapNames[mapId], language)}</strong>
            </div>
            <p>{modeDescription(mode, language)}</p>
          </section>
        </div>
        <MenuShowcase language={language} />
      </section>
      {secretCreditsOpen && <SecretCredits onClose={() => setSecretCreditsOpen(false)} />}
    </main>
  );
}

function SecretCredits({ onClose }: { onClose: () => void }) {
  return (
    <section className="absolute-zero-secret" onClick={onClose} role="presentation">
      <div>
        <h2>Made by:</h2>
        <p>Power</p>
        <p>Absolute_zero</p>
        <p>Btsharp</p>
        <p>Himanyo</p>
        <p>Dilligaf</p>
        <p>Snaggles</p>
        <p>Zuel122</p>
        <p>Rudy2006</p>
      </div>
    </section>
  );
}

function UpdateNotice({ language }: { language: Language }) {
  return (
    <section className="update-notice">
      <strong>{language === 'ru' ? 'Обновите игру' : 'Update the game'}</strong>
      <span>
        {language === 'ru'
          ? 'Открыта старая версия. Нажми кнопку обновления браузера. Если не помогло: Ctrl + F5 или закрой вкладку и открой сайт заново.'
          : 'You are using an old version. Press browser reload. If that does not help: Ctrl + F5 or close this tab and open the site again.'}
      </span>
      <button type="button" onClick={() => window.location.reload()}>
        {language === 'ru' ? 'Обновить' : 'Reload'}
      </button>
    </section>
  );
}

function MenuPicker({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="menu-picker">
      <strong>{title}</strong>
      <div>{children}</div>
    </section>
  );
}
