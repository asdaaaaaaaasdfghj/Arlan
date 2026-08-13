import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'wouter';
import { GameBoard } from '../components/GameBoard';
import { GameControls } from '../components/GameControls';
import { GameHud } from '../components/GameHud';
import {
  changeWeapon,
  createInitialGame,
  emptyInput,
  startGame,
  tickGame,
  type GameInput,
  type GameMode,
  type MapId,
  type PlayerId,
  type PlayerInput,
  type WeaponId,
} from '../lib/arenaShooter';
import { loadGameSettings, saveGameSettings } from '../lib/gameSettings';
import { useCheatCode } from '../lib/useCheatCode';
import { useGameKeyboard } from '../lib/useGameKeyboard';
import { useGameMusic } from '../lib/useGameMusic';
import { mapOrder } from '../lib/arenaMap';
import { withRedBotInput } from '../lib/arenaBot';
import { chooseRedBotWeapon } from '../lib/arenaBotWeapon';
import { modeOrder } from '../lib/arenaModes';
import { getAchievementText } from '../lib/achievements';
import { recordFinishedGame } from '../lib/gameStats';
import { loadPlayerProfile } from '../lib/playerProfile';
import { useAchievementToasts } from '../lib/useAchievementToasts';
import { t } from '../lib/i18n';
import './game.css';

export function GamePage() {
  const [settings] = useState(loadGameSettings);
  const language = settings.language;
  const initialChoice = getInitialChoice(settings.defaultMode, settings.defaultMap);
  const [game, setGame] = useState(() => createInitialGame(initialChoice.mode, initialChoice.mapId));
  const [musicOn, setMusicOn] = useState(settings.music);
  const [playerProfile] = useState(loadPlayerProfile);
  const inputRef = useRef<GameInput>(cloneInput(emptyInput));
  const redHumanRef = useRef(false);
  const recordedMatchRef = useRef<string | null>(null);
  const achievementContext = useMemo(() => ({
    redBot: settings.redBot,
    botDifficulty: settings.botDifficulty,
  }), [settings.botDifficulty, settings.redBot]);
  const achievementToast = useAchievementToasts(game, settings.achievementToasts, achievementContext);
  useGameMusic(musicOn);
  useCheatCode(() => setWeapon('blue', 'termos'));

  function restartGame() {
    inputRef.current = cloneInput(emptyInput);
    redHumanRef.current = false;
    setGame((current) => ({ ...createInitialGame(current.mode, current.mapId), status: 'playing' }));
  }

  function handleAction() {
    redHumanRef.current = false;
    setGame((current) => (current.status === 'ready' ? startGame(current) : {
      ...createInitialGame(current.mode, current.mapId),
      status: 'playing',
    }));
  }

  function setPressed(player: PlayerId, key: keyof PlayerInput, pressed: boolean) {
    if (player === 'red' && pressed) {
      redHumanRef.current = true;
    }

    inputRef.current = {
      ...inputRef.current,
      [player]: { ...inputRef.current[player], [key]: pressed },
    };
  }

  function setWeapon(player: PlayerId, weapon: WeaponId) {
    setGame((current) => changeWeapon(current, player, weapon));
  }

  function toggleMusic() {
    const next = !musicOn;
    setMusicOn(next);
    saveGameSettings({ ...settings, music: next });
  }

  useGameKeyboard({
    status: game.status,
    mapId: game.mapId,
    onRestart: restartGame,
    onStart: () => setGame((current) => startGame(current)),
    onPress: setPressed,
    onWeaponChange: setWeapon,
    controls: settings.controls,
  });

  useEffect(() => {
    if (game.status !== 'finished') {
      recordedMatchRef.current = null;
      return;
    }

    const matchKey = `${game.mode}:${game.mapId}:${game.winner}:${Math.round(game.elapsedTime)}:${game.players.blue.score}:${game.players.red.score}`;
    if (recordedMatchRef.current === matchKey) {
      return;
    }

    recordedMatchRef.current = matchKey;
    recordFinishedGame(game);
  }, [game]);

  useEffect(() => {
    const fps = settings.gameFps;
    const timerId = window.setInterval(() => {
      setGame((current) => {
        const botEnabled = settings.redBot && !redHumanRef.current;
        const botWeapon = chooseRedBotWeapon(current, botEnabled && settings.botUsesWeapons);
        const armedGame = current.players.red.weapon === botWeapon ? current : changeWeapon(current, 'red', botWeapon);
        return tickGame(
          armedGame,
          withRedBotInput(armedGame, inputRef.current, botEnabled, settings.botDifficulty),
          1 / fps,
          settings.secretZombies,
        );
      });
    }, 1000 / fps);
    return () => window.clearInterval(timerId);
  }, [settings.botDifficulty, settings.botUsesWeapons, settings.gameFps, settings.redBot, settings.secretZombies]);

  return (
    <main className={`game-page ${settings.animations && !settings.lowSpecMode ? '' : 'reduce-motion'} ${settings.lowSpecMode ? 'low-spec-game' : ''}`}>
      <nav className="game-nav">
        <Link href="/">{t(language, 'home')}</Link>
        <button type="button" className="music-button" onClick={toggleMusic}>
          {t(language, 'music')} {musicOn ? t(language, 'on') : t(language, 'off')}
        </button>
      </nav>
      <GameHud game={game} language={language} />
      <GameBoard
        game={game}
        language={language}
        playerProfiles={{ blue: playerProfile }}
        showPlayerNames={false}
        useProfileColors={false}
      />
      <GameControls
        game={game}
        showTouchControls={settings.touchControls}
        language={language}
        onAction={handleAction}
        onPress={setPressed}
        onWeaponChange={setWeapon}
      />
      {achievementToast.toast && (
        <div className={`achievement-toast ${achievementToast.leaving ? 'leaving' : ''}`}>
          <strong>{getAchievementText(achievementToast.toast, language).title}</strong>
          <span>{getAchievementText(achievementToast.toast, language).description}</span>
        </div>
      )}
    </main>
  );
}

function getInitialChoice(defaultMode: GameMode, defaultMap: MapId): { mode: GameMode; mapId: MapId } {
  const params = new URLSearchParams(window.location.search);
  const mode = params.get('mode');
  const mapId = params.get('map');

  return {
    mode: modeOrder.includes(mode as GameMode) ? mode as GameMode : defaultMode,
    mapId: mapOrder.includes(mapId as MapId) ? mapId as MapId : defaultMap,
  };
}

function cloneInput(input: GameInput): GameInput {
  return { blue: { ...input.blue }, red: { ...input.red } };
}
