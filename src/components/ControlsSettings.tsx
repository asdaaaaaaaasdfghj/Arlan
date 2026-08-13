import { useState } from 'react';
import type { PlayerId, PlayerInput } from '../lib/arenaTypes';
import { defaultControlBindings, type ControlBindings } from '../lib/gameKeys';
import type { Language } from '../lib/gameSettings';
import { t } from '../lib/i18n';

type ControlsSettingsProps = {
  controls: ControlBindings;
  language: Language;
  onChange: (controls: ControlBindings) => void;
};

type ListeningKey = {
  player: PlayerId;
  action: keyof PlayerInput;
} | null;

const actions: Array<{ id: keyof PlayerInput; labelKey: Parameters<typeof t>[1] }> = [
  { id: 'up', labelKey: 'up' },
  { id: 'down', labelKey: 'down' },
  { id: 'left', labelKey: 'left' },
  { id: 'right', labelKey: 'right' },
  { id: 'shoot', labelKey: 'shoot' },
  { id: 'build', labelKey: 'build' },
  { id: 'grenade', labelKey: 'grenade' },
  { id: 'enterVehicle', labelKey: 'enterVehicle' },
];

export function ControlsSettings({ controls, language, onChange }: ControlsSettingsProps) {
  const [listening, setListening] = useState<ListeningKey>(null);

  function captureKey(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (!listening) {
      return;
    }

    event.preventDefault();
    onChange({
      ...controls,
      [listening.player]: {
        ...controls[listening.player],
        [listening.action]: event.code,
      },
    });
    setListening(null);
  }

  return (
    <section className="settings-panel">
      <div className="settings-heading-row">
        <div>
          <p className="eyebrow">{t(language, 'keyboard')}</p>
          <h2>{t(language, 'controls')}</h2>
        </div>
        <button type="button" className="ghost-button" onClick={() => onChange(defaultControlBindings)}>{t(language, 'reset')}</button>
      </div>
      <div className="controls-settings-grid">
        <PlayerControls player="blue" controls={controls} language={language} listening={listening} onListen={setListening} onKey={captureKey} />
        <PlayerControls player="red" controls={controls} language={language} listening={listening} onListen={setListening} onKey={captureKey} />
      </div>
    </section>
  );
}

function PlayerControls({ player, controls, language, listening, onListen, onKey }: {
  player: PlayerId;
  controls: ControlBindings;
  language: Language;
  listening: ListeningKey;
  onListen: (key: ListeningKey) => void;
  onKey: (event: React.KeyboardEvent<HTMLButtonElement>) => void;
}) {
  return (
    <div className={`controls-card controls-card-${player}`}>
      <strong>{player === 'blue' ? t(language, 'bluePlayer') : t(language, 'redPlayer')}</strong>
      {actions.map((action) => {
        const active = listening?.player === player && listening.action === action.id;

        return (
          <button
            type="button"
            className={active ? 'listening-key' : ''}
            key={action.id}
            onClick={() => onListen({ player, action: action.id })}
            onKeyDown={onKey}
          >
            <span>{t(language, action.labelKey)}</span>
            <b>{active ? t(language, 'pressKey') : formatKey(controls[player][action.id])}</b>
          </button>
        );
      })}
    </div>
  );
}

function formatKey(code: string): string {
  return code
    .replace('Key', '')
    .replace('Digit', '')
    .replace('Arrow', '')
    .replace('Space', 'Space')
    .replace('ShiftLeft', 'L Shift')
    .replace('ShiftRight', 'R Shift')
    .replace('Slash', '/');
}
