import type { CSSProperties } from 'react';
import {
  ARENA_HEIGHT,
  ARENA_WIDTH,
  type AllyCheckpoint,
  type AllyUnit,
  BARRICADE_HP,
  type Barricade,
  type Bullet,
  type Grenade,
  type HitEffect,
  type Player,
  type PowerUp,
  type TimeEcho,
  type Zombie,
} from '../lib/arenaShooter';
import type { PlayerProfile } from '../lib/playerProfile';

export function PlayerSprite({ player, profile, showName = true, useProfileColor = true, hidden = false, scale = 1 }: {
  player: Player;
  profile?: PlayerProfile;
  showName?: boolean;
  useProfileColor?: boolean;
  hidden?: boolean;
  scale?: number;
}) {
  const classes = [
    'fighter',
    `fighter-${player.id}`,
    `fighter-skin-${profile?.skin ?? 'none'}`,
    player.hp <= 0 ? 'fighter-dead' : 'fighter-alive',
    player.cooldown > 0 ? 'fighter-shooting' : '',
    player.burnTimer > 0 ? 'fighter-burning' : '',
    player.shockTimer > 0 ? 'fighter-shocked' : '',
    player.acidTimer > 0 ? 'fighter-acid' : '',
    hidden ? 'fighter-hidden' : '',
  ].filter(Boolean).join(' ');
  const style = {
    left: xPercent(player.x),
    top: yPercent(player.y),
    '--fighter-color': useProfileColor ? profile?.color : undefined,
    '--fighter-scale': scale,
    '--aim-angle': `${Math.atan2(player.facingY, player.facingX)}rad`,
  } as CSSProperties;

  return (
    <div className={classes} style={style}>
      {profile && showName && <span className="fighter-name">{profile.nickname}</span>}
      <span className="fighter-cannon" />
      <span className="fighter-core" />
    </div>
  );
}

export function AllySprite({ ally }: { ally: AllyUnit }) {
  if (ally.hp <= 0) return null;

  return (
    <div
      className={`ally ally-${ally.owner}`}
      style={{
        left: xPercent(ally.x),
        top: yPercent(ally.y),
        '--aim-angle': `${Math.atan2(ally.facingY, ally.facingX)}rad`,
      } as CSSProperties}
    >
      <span className="ally-cannon" />
      <span className="ally-core" />
    </div>
  );
}

export function AllyCheckpointSprite({ checkpoint }: { checkpoint: AllyCheckpoint }) {
  const maxHp = checkpoint.role === 'core' ? 1 : 180;
  const classes = [
    'ally-checkpoint',
    `ally-checkpoint-${checkpoint.owner}`,
    checkpoint.role === 'core' ? 'ally-checkpoint-core' : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={classes}
      style={{
        left: xPercent(checkpoint.x),
        top: yPercent(checkpoint.y),
        width: xPercent(checkpoint.width),
        height: yPercent(checkpoint.height),
      }}
    >
      <i style={{ width: `${Math.max(0, (checkpoint.hp / maxHp) * 100)}%` }} />
    </div>
  );
}

export function BarricadeSprite({ barricade }: { barricade: Barricade }) {
  return (
    <div
      className="barricade"
      style={{
        left: xPercent(barricade.x),
        top: yPercent(barricade.y),
        width: xPercent(barricade.width),
        height: yPercent(barricade.height),
      }}
    >
      <i style={{ width: `${(barricade.hp / BARRICADE_HP) * 100}%` }} />
    </div>
  );
}

export function ZombieSprite({ zombie }: { zombie: Zombie }) {
  return (
    <div className="zombie" style={{ left: xPercent(zombie.x), top: yPercent(zombie.y) }}>
      <span className="zombie-arm zombie-arm-left" />
      <span className="zombie-face" />
      <span className="zombie-arm zombie-arm-right" />
    </div>
  );
}

export function TimeEchoSprite({ echo }: { echo: TimeEcho }) {
  return (
    <div
      className={`time-echo time-echo-${echo.owner} time-echo-${echo.phase}`}
      style={{
        left: xPercent(echo.x),
        top: yPercent(echo.y),
        '--aim-angle': `${Math.atan2(echo.facingY, echo.facingX)}rad`,
        '--echo-opacity': Math.max(0.18, Math.min(0.72, echo.age / 1.8)),
      } as CSSProperties}
    >
      <span className="time-echo-cannon" />
      <span className="time-echo-core" />
    </div>
  );
}

export function HitEffectSprite({ effect }: { effect: HitEffect }) {
  return (
    <span
      className={`hit-effect hit-effect-${effect.kind}`}
      style={{ left: xPercent(effect.x), top: yPercent(effect.y) }}
    />
  );
}

export function PowerUpSprite({ powerUp }: { powerUp: PowerUp }) {
  return (
    <div
      className={`power-up power-up-${powerUp.kind}`}
      style={{ left: xPercent(powerUp.x), top: yPercent(powerUp.y) }}
    >
      {getPowerUpLabel(powerUp.kind)}
    </div>
  );
}

export function GrenadeSprite({ grenade }: { grenade: Grenade }) {
  return (
    <span
      className={`grenade grenade-${grenade.owner}`}
      style={{ left: xPercent(grenade.x), top: yPercent(grenade.y) }}
    />
  );
}

export function BulletSprite({ bullet }: { bullet: Bullet }) {
  return (
    <span
      className={`bullet bullet-${bullet.owner} bullet-${bullet.weapon}`}
      style={{
        left: xPercent(bullet.x),
        top: yPercent(bullet.y),
        width: `${bullet.size}px`,
        height: `${bullet.size}px`,
      }}
    />
  );
}

function getPowerUpLabel(kind: PowerUp['kind']) {
  if (kind === 'heal' || kind === 'superHeal') {
    return '+';
  }

  if (kind === 'speed' || kind === 'overdrive') return '>>';
  if (kind === 'repair') return 'B';
  if (kind === 'termos') return '*';
  if (kind === 'weaponBlaster') return 'BL';
  if (kind === 'weaponRailgun') return 'RG';
  if (kind === 'weaponShotgun') return 'SG';
  if (kind === 'weaponFlame') return 'FL';
  if (kind === 'damage') return '!';
  if (kind === 'shock') return 'Z';
  if (kind === 'poison') return 'P';
  return 'F';
}

function xPercent(value: number): string {
  return `${(value / ARENA_WIDTH) * 100}%`;
}

function yPercent(value: number): string {
  return `${(value / ARENA_HEIGHT) * 100}%`;
}
