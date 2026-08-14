import { useState } from 'react';
import type { CSSProperties } from 'react';
import { Link } from 'wouter';
import { clearLeaderboard, loadLeaderboard, type LeaderboardEntry } from '../lib/leaderboard';
import { loadGameSettings } from '../lib/gameSettings';
import './leaderboard.css';

export function LeaderboardPage() {
  const [entries, setEntries] = useState(loadLeaderboard);
  const [settings] = useState(loadGameSettings);
  const language = settings.language;

  function resetLeaderboard() {
    clearLeaderboard();
    setEntries([]);
  }

  return (
    <main className="leaderboard-page">
      <nav className="menu-nav">
        <Link href="/">{language === 'ru' ? 'Главная' : 'Home'}</Link>
        <Link href="/game">{language === 'ru' ? 'Играть' : 'Play'}</Link>
      </nav>
      <section className="leaderboard-panel">
        <div className="leaderboard-heading">
          <div>
            <p className="eyebrow">{language === 'ru' ? 'Таблица лидеров' : 'Leaderboard'}</p>
            <h1>{language === 'ru' ? 'Лучшие игроки' : 'Top players'}</h1>
          </div>
          <button type="button" className="danger-button" onClick={resetLeaderboard}>
            {language === 'ru' ? 'Сброс' : 'Reset'}
          </button>
        </div>
        {entries.length === 0 ? (
          <p className="leaderboard-empty">
            {language === 'ru' ? 'Пока пусто. Закончи матч, и игроки появятся здесь.' : 'Nothing here yet. Finish a match to add players.'}
          </p>
        ) : (
          <div className="leaderboard-table" role="table" aria-label={language === 'ru' ? 'Таблица лидеров' : 'Leaderboard'}>
            <div className="leaderboard-row header" role="row">
              <span>#</span>
              <span>{language === 'ru' ? 'Игрок' : 'Player'}</span>
              <span>{language === 'ru' ? 'Убийства' : 'Kills'}</span>
              <span>{language === 'ru' ? 'Победы' : 'Wins'}</span>
              <span>{language === 'ru' ? 'Матчи' : 'Matches'}</span>
            </div>
            {entries.map((entry, index) => (
              <LeaderboardRow entry={entry} place={index + 1} key={entry.id} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function LeaderboardRow({ entry, place }: { entry: LeaderboardEntry; place: number }) {
  return (
    <div className="leaderboard-row" role="row">
      <b>{place}</b>
      <span className="leaderboard-player">
        <i style={{ '--leader-color': entry.color } as CSSProperties} />
        {entry.nickname}
        {entry.guest && <em>Guest</em>}
      </span>
      <strong>{entry.kills}</strong>
      <strong>{entry.wins}</strong>
      <span>{entry.matches}</span>
    </div>
  );
}
