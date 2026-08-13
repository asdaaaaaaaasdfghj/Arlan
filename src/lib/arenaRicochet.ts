import type { Bullet, RicochetBlock } from './arenaTypes';

const maxBounces = 5;
const nudge = 0.35;

export function bounceBullet(bullet: Bullet, block: RicochetBlock): Bullet | null {
  if (bullet.bounces >= maxBounces) {
    return null;
  }

  const horizontalHit = getHorizontalHit(bullet, block);
  const dx = horizontalHit ? -bullet.dx : bullet.dx;
  const dy = horizontalHit ? bullet.dy : -bullet.dy;

  return {
    ...bullet,
    dx,
    dy,
    x: bullet.x + dx * nudge,
    y: bullet.y + dy * nudge,
    bounces: bullet.bounces + 1,
  };
}

export function pointInRicochet(x: number, y: number, blocks: RicochetBlock[]): RicochetBlock | null {
  return blocks.find((block) => (
    x >= block.x && x <= block.x + block.width && y >= block.y && y <= block.y + block.height
  )) ?? null;
}

function getHorizontalHit(bullet: Bullet, block: RicochetBlock): boolean {
  const centerX = block.x + block.width / 2;
  const centerY = block.y + block.height / 2;
  const scaledX = Math.abs((bullet.x - centerX) / block.width);
  const scaledY = Math.abs((bullet.y - centerY) / block.height);
  return scaledX > scaledY;
}
