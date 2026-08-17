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
  const [splash, setSplash] = useState(pickSplashText);
  const [achievementToast, setAchievementToast] = useState<AchievementId | null>(null);
  const [secretCreditsOpen, setSecretCreditsOpen] = useState(false);
  const [outTheWaterOpen, setOutTheWaterOpen] = useState(false);
  const [jumpscareOpen, setJumpscareOpen] = useState(false);
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
    if (!jumpscareOpen) {
      return undefined;
    }

    const timerId = window.setTimeout(() => setJumpscareOpen(false), 1250);
    return () => window.clearTimeout(timerId);
  }, [jumpscareOpen]);

  useEffect(() => {
    let buffer = '';
    const creditsCode = 'ABSOLUTEZERO';
    const waterCode = 'OUTTHEWATER';
    const lostMediaCode = 'LOSTMEDIA';
    const hardCode = 'HARD';
    const starCode = 'STAR';
    const gameFaqsCode = 'GMFQS';
    const powerCode = 'POWER';
    const openUpCode = 'OPENUP';
    const jumpscareCode = 'FNAF';
    const lostMediaUrl = 'https://minecraft.wiki/w/Category_talk:Lost_media#lost_mini_game_Out_of_the_water';
    const hardUrl = 'https://hardforum.com/threads/minecraft.1494304/#post-1036200514';
    const starUrl = 'https://forum.esforces.com/threads/8-bit-legos.77442/';
    const gameFaqsUrl = 'https://gamefaqs.gamespot.com/boards/606524-minecraft/60138896?validate=1';
    const powerUrl = 'https://ru.namemc.com/profile/power.1';
    const maxCodeLength = Math.max(creditsCode.length, waterCode.length, lostMediaCode.length, hardCode.length, starCode.length, gameFaqsCode.length, powerCode.length, openUpCode.length, jumpscareCode.length);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.altKey || event.metaKey || event.key.length !== 1) return;
      buffer = `${buffer}${event.key.toUpperCase()}`.slice(-maxCodeLength);
      if (buffer.endsWith(creditsCode)) {
        setSecretCreditsOpen(true);
      }
      if (buffer.endsWith(waterCode)) {
        setOutTheWaterOpen(true);
      }
      if (buffer.endsWith(lostMediaCode)) {
        window.open(lostMediaUrl, '_blank', 'noopener,noreferrer');
      }
      if (buffer.endsWith(hardCode)) {
        window.open(hardUrl, '_blank', 'noopener,noreferrer');
      }
      if (buffer.endsWith(starCode)) {
        window.open(starUrl, '_blank', 'noopener,noreferrer');
      }
      if (buffer.endsWith(gameFaqsCode)) {
        window.open(gameFaqsUrl, '_blank', 'noopener,noreferrer');
      }
      if (buffer.endsWith(powerCode)) {
        window.open(powerUrl, '_blank', 'noopener,noreferrer');
      }
      if (buffer.endsWith(openUpCode)) {
        document.documentElement.dataset.openUp = 'true';
      }
      if (buffer.endsWith(jumpscareCode)) {
        setJumpscareOpen(true);
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
            <ActionLink className="primary-link" href={playHref} icon="▶">{t(language, 'play')}</ActionLink>
            <ActionLink href="/online" icon="◎">{language === 'ru' ? 'Онлайн' : 'Online'}</ActionLink>
            <ActionLink href="/editor" icon="▣">{t(language, 'mapEditor')}</ActionLink>
            <ActionLink href="/catalog" icon="▦">{language === 'ru' ? 'Каталог' : 'Catalog'}</ActionLink>
            <ActionLink href="/forum" icon="≡">{language === 'ru' ? 'Форум' : 'Forum'}</ActionLink>
            <ActionLink href="/friends" icon="⚭">{language === 'ru' ? 'Друзья' : 'Friends'}</ActionLink>
            <ActionLink href="/tutorial" icon="?">{language === 'ru' ? 'Туториал' : 'Tutorial'}</ActionLink>
            <ActionLink href="/leaderboard" icon="#">{language === 'ru' ? 'Лидеры' : 'Leaders'}</ActionLink>
            <ActionLink href="/profile" icon="◉">{language === 'ru' ? 'Профиль' : 'Profile'}</ActionLink>
            <ActionLink href="/settings" icon="⚙">{t(language, 'settings')}</ActionLink>
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
      {secretCreditsOpen && <SecretCredits onClose={() => {
        setSecretCreditsOpen(false);
        setSplash('I have no idea who this is; I made the game alone.');
      }} />}
      {outTheWaterOpen && <OutTheWaterSecret onClose={() => setOutTheWaterOpen(false)} />}
      {jumpscareOpen && <JumpscareSecret />}
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

function OutTheWaterSecret({ onClose }: { onClose: () => void }) {
  return (
    <section className="out-water-secret" onClick={onClose} role="presentation">
      <img src={`${import.meta.env.BASE_URL}secrets/out-the-water.png`} alt="Out the water secret" />
    </section>
  );
}

function JumpscareSecret() {
  return (
    <section className="jumpscare-secret" aria-label="Jumpscare">
      <div className="jumpscare-static" />
      <div className="jumpscare-face">
        <span className="jumpscare-ear left" />
        <span className="jumpscare-ear right" />
        <span className="jumpscare-eye left" />
        <span className="jumpscare-eye right" />
        <span className="jumpscare-nose" />
        <span className="jumpscare-mouth" />
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

function ActionLink({ className = 'secondary-link', href, icon, children }: {
  className?: string;
  href: string;
  icon: string;
  children: ReactNode;
}) {
  return (
    <Link className={className} href={href}>
      <span className="action-icon" aria-hidden="true">{icon}</span>
      <span>{children}</span>
    </Link>
  );
}
