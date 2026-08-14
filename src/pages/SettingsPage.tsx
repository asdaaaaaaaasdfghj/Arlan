import { useState } from 'react';
import { Link } from 'wouter';
import { ControlsSettings } from '../components/ControlsSettings';
import {
  achievements,
  clearUnlockedAchievements,
  getAchievementText,
  loadUnlockedAchievements,
  type AchievementId,
} from '../lib/achievements';
import { mapNames, mapOrder } from '../lib/arenaMap';
import { modeGroups, modeOrder } from '../lib/arenaModes';
import { applyVisualSettings, fpsOptions, loadGameSettings, saveGameSettings, type GameFps, type GameSettings } from '../lib/gameSettings';
import { clearGameStats, formatPlayTime, loadGameStats, type GameStats } from '../lib/gameStats';
import { mapName, modeName, t } from '../lib/i18n';
import './settings.css';
import './settings-controls.css';

export function SettingsPage() {
  const [settings, setSettings] = useState(loadGameSettings);
  const language = settings.language;
  const [unlocked, setUnlocked] = useState<AchievementId[]>(loadUnlockedAchievements);
  const [stats, setStats] = useState<GameStats>(loadGameStats);

  function updateSettings(next: GameSettings) {
    setSettings(next);
    saveGameSettings(next);
    applyVisualSettings(next);
  }

  function resetAchievements() {
    clearUnlockedAchievements();
    setUnlocked([]);
  }

  function resetStats() {
    clearGameStats();
    setStats(loadGameStats());
  }

  return (
    <main className="settings-page">
      <nav className="menu-nav">
        <Link href="/">{t(language, 'home')}</Link>
        <Link href="/game">{t(language, 'play')}</Link>
      </nav>
      <section className="settings-panel">
        <p className="eyebrow">{t(language, 'gameSetup')}</p>
        <h1>{t(language, 'settings')}</h1>
        <SelectField label={t(language, 'language')} value={settings.language} onChange={(value) => updateSettings({ ...settings, language: value as GameSettings['language'] })}>
          <option value="en">English</option>
          <option value="ru">Русский</option>
        </SelectField>
        <SelectField label={t(language, 'defaultMode')} value={settings.defaultMode} onChange={(value) => updateSettings({ ...settings, defaultMode: value as GameSettings['defaultMode'] })}>
          {modeGroups.map((group) => (
            <optgroup label={group.label[language]} key={group.id}>
              {group.modes.map((mode) => <option value={mode} key={mode}>{modeName(mode, language)}</option>)}
            </optgroup>
          ))}
        </SelectField>
        <SelectField label={t(language, 'defaultMap')} value={settings.defaultMap} onChange={(value) => updateSettings({ ...settings, defaultMap: value as GameSettings['defaultMap'] })}>
          {mapOrder.map((mapId) => <option value={mapId} key={mapId}>{mapName(mapId, mapNames[mapId], language)}</option>)}
        </SelectField>
        <SelectField label={t(language, 'gameFps')} value={String(settings.gameFps)} onChange={(value) => updateSettings({ ...settings, gameFps: Number(value) as GameFps, lowSpecMode: Number(value) === 24 ? settings.lowSpecMode : false })}>
          {fpsOptions.map((fps) => <option value={fps} key={fps}>{fps} FPS</option>)}
        </SelectField>
        <Toggle label={t(language, 'animations')} checked={settings.animations} onChange={(checked) => updateSettings({ ...settings, animations: checked })} />
        <Toggle label={t(language, 'darkMode')} checked={settings.darkMode} onChange={(checked) => updateSettings({ ...settings, darkMode: checked })} />
        <Toggle label={t(language, 'lowSpecMode')} checked={settings.lowSpecMode} onChange={(checked) => updateSettings({ ...settings, lowSpecMode: checked, gameFps: checked ? 24 : settings.gameFps, animations: checked ? false : settings.animations })} />
        <Toggle label={t(language, 'music')} checked={settings.music} onChange={(checked) => updateSettings({ ...settings, music: checked })} />
        <Toggle label={t(language, 'redBot')} checked={settings.redBot} onChange={(checked) => updateSettings({ ...settings, redBot: checked })} />
        <Toggle label={t(language, 'botUsesWeapons')} checked={settings.botUsesWeapons} onChange={(checked) => updateSettings({ ...settings, botUsesWeapons: checked })} />
        <Toggle label={t(language, 'secretZombies')} checked={settings.secretZombies} onChange={(checked) => updateSettings({ ...settings, secretZombies: checked })} />
        <SelectField label={t(language, 'botDifficulty')} value={settings.botDifficulty} onChange={(value) => updateSettings({ ...settings, botDifficulty: value as GameSettings['botDifficulty'] })}>
          <option value="easy">Easy</option>
          <option value="normal">Normal</option>
          <option value="hard">Hard</option>
        </SelectField>
        <Toggle label={t(language, 'touchControls')} checked={settings.touchControls} onChange={(checked) => updateSettings({ ...settings, touchControls: checked })} />
        <Toggle label={t(language, 'achievementPopups')} checked={settings.achievementToasts} onChange={(checked) => updateSettings({ ...settings, achievementToasts: checked })} />
      </section>
      <ControlsSettings
        controls={settings.controls}
        language={language}
        onChange={(controls) => updateSettings({ ...settings, controls })}
      />
      <section className="settings-panel">
        <div className="settings-heading-row">
          <div>
            <p className="eyebrow">{language === 'ru' ? 'Статистика' : 'Statistics'}</p>
            <h2>{language === 'ru' ? 'Игровая статистика' : 'Game stats'}</h2>
          </div>
          <button type="button" className="danger-button" onClick={resetStats}>{t(language, 'reset')}</button>
        </div>
        <div className="stats-grid">
          <StatCard label={language === 'ru' ? 'Матчи' : 'Matches'} value={stats.matches} />
          <StatCard label={language === 'ru' ? 'Время' : 'Time played'} value={formatPlayTime(stats.secondsPlayed)} />
          <StatCard label={language === 'ru' ? 'Смерти' : 'Deaths'} value={stats.deaths} />
          <StatCard label={language === 'ru' ? 'Выстрелы' : 'Shots'} value={stats.shots} />
          <StatCard label={language === 'ru' ? 'Победы синего' : 'Blue wins'} value={stats.blueWins} />
          <StatCard label={language === 'ru' ? 'Победы красного' : 'Red wins'} value={stats.redWins} />
          <StatCard label={language === 'ru' ? 'Выживания' : 'Survival wins'} value={stats.survivalWins} />
          <StatCard label={language === 'ru' ? 'Ничьи' : 'Draws'} value={stats.draws} />
        </div>
        <div className="mode-stats">
          {modeOrder.map((mode) => (
            <span key={mode}>
              <b>{modeName(mode, language)}</b>
              {stats.winsByMode[mode]}
            </span>
          ))}
        </div>
      </section>
      <section className="settings-panel">
        <div className="settings-heading-row">
          <div>
            <p className="eyebrow">{t(language, 'progress')}</p>
            <h2>{t(language, 'achievements')}</h2>
          </div>
          <button type="button" className="danger-button" onClick={resetAchievements}>{t(language, 'reset')}</button>
        </div>
        <div className="achievement-grid">
          {achievements.map((achievement) => (
            <article className={unlocked.includes(achievement.id) ? 'achievement-card unlocked' : 'achievement-card'} key={achievement.id}>
              <strong>{getAchievementText(achievement.id, language).title}</strong>
              <span>{getAchievementText(achievement.id, language).description}</span>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <article className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function SelectField({ label, value, onChange, children }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label>
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)}>{children}</select>
    </label>
  );
}

function Toggle({ label, checked, onChange }: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="switch-row">
      {label}
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}
