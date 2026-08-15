import type { GameState, PlayerId } from '../lib/arenaShooter';
import { isSwordMode, modeConfigs } from '../lib/arenaModes';
import { getMiniGameRule, isMiniGamesMode, miniGameDuration } from '../lib/arenaMiniGames';
import { isSurvivalGrace, survivalGraceSeconds } from '../lib/arenaSurvivalMode';
import { getWeaponConfig } from '../lib/arenaWeapons';
import { getScoreToWin } from '../lib/arenaRules';
import type { Language } from '../lib/gameSettings';
import { modeDescription, modeName, t } from '../lib/i18n';

type GameHudProps = {
  game: GameState;
  language: Language;
};

const playerNames: Record<PlayerId, string> = {
  blue: 'Blue',
  red: 'Red',
};

export function GameHud({ game, language }: GameHudProps) {
  return (
    <header className="game-hud">
      <div>
        <p>{game.status === 'playing' ? t(language, 'liveDuel') : t(language, 'multiplayerShooter')}</p>
        <h1>{modeName(game.mode, language)}</h1>
        <p className="mode-description">{modeDescription(game.mode, language)}</p>
        {isSurvivalGrace(game.mode, game.elapsedTime) && <p className="mode-description">{getSurvivalGraceText(game, language)}</p>}
        {isMiniGamesMode(game) && <p className="mode-description">{getMiniGameText(game)}</p>}
      </div>
      <div className="round-clock">
        {getClockText(game)}
        {game.zombies.length > 0 && <small>{game.zombies.length} {t(language, 'zombies')}</small>}
        {game.disasters.length > 0 && <small>{game.disasters.length} {t(language, 'disasters')}</small>}
      </div>
      <div className="score-row">
        <PlayerStat id="blue" game={game} />
        <PlayerStat id="red" game={game} />
      </div>
    </header>
  );
}

function PlayerStat({ id, game }: { id: PlayerId; game: GameState }) {
  const player = game.players[id];
  const weapon = getWeaponConfig(player.weapon, game.mapId);
  const miniSword = isMiniGamesMode(game) && getMiniGameRule(game).sword;
  const weaponText = isSwordMode(game.mode) || miniSword ? 'Sword - 0.46s' : `${weapon.name} - ${weapon.cooldown}s`;
  const scoreToWin = getScoreToWin(game.mode, game);
  const scoreText = game.mode === 'paintBattle'
    ? `${player.score.toFixed(1)}%`
    : scoreToWin > 0 ? `${Math.floor(player.score)}/${scoreToWin}` : Math.floor(player.score);

  return (
    <section className={`player-stat player-stat-${id}`}>
      <strong>{playerNames[id]}</strong>
      <span>{scoreText}</span>
      <p className="weapon-name">
        {weaponText}
      </p>
      <div className="hp-track" aria-label={`${playerNames[id]} health`}>
        <i style={{ width: `${player.hp}%` }} />
      </div>
    </section>
  );
}

function getMiniGameText(game: GameState): string {
  const rule = getMiniGameRule(game);
  const remaining = miniGameDuration - Math.floor(game.elapsedTime % miniGameDuration);
  return `${rule.name}: ${rule.description} · next in ${remaining}s`;
}

function getSurvivalGraceText(game: GameState, language: Language): string {
  const remaining = Math.max(0, Math.ceil(survivalGraceSeconds - game.elapsedTime));
  return language === 'ru' ? `Мирное время: строй базу. Оружие через ${remaining}s` : `Peace time: build a base. Weapons in ${remaining}s`;
}

function getClockText(game: GameState): string {
  if (isMiniGamesMode(game)) {
    const index = Math.min(10, Math.floor(game.elapsedTime / miniGameDuration) + 1);
    return `${index}/10`;
  }

  return modeConfigs[game.mode].noTimer ? '∞' : `${Math.ceil(game.timeLeft)}s`;
}
