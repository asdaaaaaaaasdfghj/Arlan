import { ARENA_HEIGHT, ARENA_WIDTH, type NaturalDisaster } from '../lib/arenaShooter';

export function DisasterSprite({ disaster }: { disaster: NaturalDisaster }) {
  const active = disaster.age <= disaster.activeAt;
  const label = getLabel(disaster.kind);

  return (
    <span
      className={`disaster disaster-${disaster.kind} ${active ? 'disaster-active' : 'disaster-warning'}`}
      style={{
        left: xPercent(disaster.x),
        top: yPercent(disaster.y),
        width: xPercent(disaster.width),
        height: yPercent(disaster.height),
      }}
    >
      <span className="disaster-aura" />
      <span className="disaster-pattern" />
      <i>{label.icon}</i>
      <b>{label.text}</b>
    </span>
  );
}

function getLabel(kind: NaturalDisaster['kind']): { icon: string; text: string } {
  if (kind === 'storm') {
    return { icon: 'Z', text: 'STORM' };
  }

  if (kind === 'quake') {
    return { icon: '!', text: 'QUAKE' };
  }

  return kind === 'flood'
    ? { icon: '~', text: 'FLOOD' }
    : { icon: '^', text: 'FIRE' };
}

function xPercent(value: number): string {
  return `${(value / ARENA_WIDTH) * 100}%`;
}

function yPercent(value: number): string {
  return `${(value / ARENA_HEIGHT) * 100}%`;
}
