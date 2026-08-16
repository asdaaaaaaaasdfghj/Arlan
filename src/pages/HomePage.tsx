import { type ReactNode, useState } from 'react';
import { Link } from 'wouter';
import { MenuShowcase } from '../components/MenuShowcase';
import { mapNames, mapOrder } from '../lib/arenaMap';
import { modeGroups } from '../lib/arenaModes';
import { loadGameSettings, type Language } from '../lib/gameSettings';
import { mapName, modeDescription, modeName, t } from '../lib/i18n';
import { pickSplashText } from '../lib/splashTexts';
import type { GameMode, MapId } from '../lib/arenaShooter';
import { useVersionStatus } from '../lib/appVersion';
import './home.css';

export function HomePage() {
  const [settings] = useState(loadGameSettings);
  const language = settings.language;
  const [mode, setMode] = useState<GameMode>(settings.defaultMode);
  const [mapId, setMapId] = useState<MapId>(settings.defaultMap);
  const [splash] = useState(pickSplashText);
  const versionStatus = useVersionStatus();
  const playHref = `/game?mode=${mode}&map=${mapId}`;

  return (
    <main className="home-page">
      {versionStatus.outdated && <UpdateNotice language={language} />}
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
    </main>
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
