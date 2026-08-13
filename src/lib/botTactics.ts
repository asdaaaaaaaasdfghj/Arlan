import type { GameState, Player } from './arenaTypes';

export type PointTarget = {
  x: number;
  y: number;
};

export function addStrafeTarget<T extends PointTarget>(
  from: Player,
  to: T,
  game: GameState,
  seed: number,
  strength: number,
): T {
  const wave = Math.sin(game.timeLeft * 0.75 + seed);
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  const offset = strength * Math.sign(wave || 1);

  return {
    ...to,
    x: clamp(to.x + (-dy / length) * offset, 6, 94),
    y: clamp(to.y + (dx / length) * offset, 6, 58),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
