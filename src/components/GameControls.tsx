import type { GameState, PlayerId, PlayerInput, WeaponId } from '../lib/arenaShooter';
import { isFlameMode, isSwordMode } from '../lib/arenaModes';
import { getMiniGameRule, getMiniGameWeapon, isMiniGamesMode } from '../lib/arenaMiniGames';
import { getWeaponConfig, getWeaponOrder } from '../lib/arenaWeapons';
import type { Language } from '../lib/gameSettings';
import { t } from '../lib/i18n';

type GameControlsProps = {
  game: GameState;
  showTouchControls: boolean;
  language: Language;
  onAction: () => void;
  onPress: (player: PlayerId, key: keyof PlayerInput, pressed: boolean) => void;
  onWeaponChange: (player: PlayerId, weapon: WeaponId) => void;
};

const controls: Array<{ labelKey: Parameters<typeof t>[1]; key: keyof PlayerInput }> = [
  { labelKey: 'up', key: 'up' },
  { labelKey: 'left', key: 'left' },
  { labelKey: 'fire', key: 'shoot' },
  { labelKey: 'right', key: 'right' },
  { labelKey: 'down', key: 'down' },
  { labelKey: 'build', key: 'build' },
  { labelKey: 'grenade', key: 'grenade' },
  { labelKey: 'enterVehicle', key: 'enterVehicle' },
];

export function GameControls({
  game,
  showTouchControls,
  language,
  onAction,
  onPress,
  onWeaponChange,
}: GameControlsProps) {
  return (
    <footer>
      <div className="game-controls">
        <ControlPanel game={game} player="blue" showTouchControls={showTouchControls} language={language} onPress={onPress} onWeaponChange={onWeaponChange} />
        <button className="round-action" type="button" onClick={onAction}>
          {game.status === 'finished' ? t(language, 'restart') : game.status === 'ready' ? t(language, 'start') : t(language, 'reset')}
        </button>
        <ControlPanel game={game} player="red" showTouchControls={showTouchControls} language={language} onPress={onPress} onWeaponChange={onWeaponChange} />
      </div>
    </footer>
  );
}

function ControlPanel({ game, player, showTouchControls, language, onPress, onWeaponChange }: {
  game: GameState;
  player: PlayerId;
  showTouchControls: boolean;
  language: Language;
  onPress: GameControlsProps['onPress'];
  onWeaponChange: GameControlsProps['onWeaponChange'];
}) {
  const miniSword = isMiniGamesMode(game) && getMiniGameRule(game).sword;
  const weapons = isMiniGamesMode(game)
    ? [getMiniGameWeapon(game)]
    : isFlameMode(game.mode)
    ? ['flamethrower' as const]
    : game.mode === 'railDuel'
      ? ['railgun' as const]
      : getWeaponOrder(game.mapId);

  return (
    <div className="control-panel">
      {showTouchControls && <TouchPad player={player} language={language} onPress={onPress} />}
      <div className="weapon-picker">
        {(isSwordMode(game.mode) || miniSword) && <button className="active-weapon" type="button">Sword</button>}
        {!isSwordMode(game.mode) && !miniSword && weapons.map((weapon) => (
          <button
            className={game.players[player].weapon === weapon ? 'active-weapon' : ''}
            type="button"
            key={weapon}
            onClick={() => onWeaponChange(player, weapon)}
          >
            {getWeaponConfig(weapon, game.mapId).name}
          </button>
        ))}
      </div>
    </div>
  );
}

function TouchPad({ player, language, onPress }: {
  player: PlayerId;
  language: Language;
  onPress: GameControlsProps['onPress'];
}) {
  return (
    <div className={`touch-pad touch-pad-${player}`}>
      {controls.map((control) => (
        <button
          type="button"
          key={control.key}
          onPointerDown={() => onPress(player, control.key, true)}
          onPointerUp={() => onPress(player, control.key, false)}
          onPointerLeave={() => onPress(player, control.key, false)}
        >
          {t(language, control.labelKey)}
        </button>
      ))}
    </div>
  );
}
