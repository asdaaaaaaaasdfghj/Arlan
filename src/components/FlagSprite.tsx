import { ARENA_HEIGHT, ARENA_WIDTH, type FlagState } from '../lib/arenaShooter';

export function FlagSprite({ flag }: { flag: FlagState }) {
  return (
    <span
      className={`ctf-flag ctf-flag-${flag.owner} ${flag.carrier ? 'ctf-flag-carried' : ''}`}
      style={{
        left: `${(flag.x / ARENA_WIDTH) * 100}%`,
        top: `${(flag.y / ARENA_HEIGHT) * 100}%`,
      }}
    >
      <i />
    </span>
  );
}
