import { ARENA_HEIGHT, ARENA_WIDTH, type GameState, type LaserBlock, type PlayerId, type Zombie } from './arenaTypes';

const beamThickness = 1.05;
const sideOrder = ['right', 'left', 'down', 'up'] as const;
type LaserSide = typeof sideOrder[number];
export type LaserBlocker = { x: number; y: number; width: number; height: number };

export function tickLasers(
  players: GameState['players'],
  zombies: Zombie[],
  lasers: LaserBlock[],
  delta: number,
  blockers: LaserBlocker[] = [],
): Pick<GameState, 'players' | 'zombies'> {
  if (lasers.length === 0) {
    return { players, zombies };
  }

  const nextPlayers = { ...players };
  (Object.keys(nextPlayers) as PlayerId[]).forEach((id) => {
    const player = nextPlayers[id];
    if (player.hp <= 0 || !lasers.some((laser) => pointInLaserBeam(player.x, player.y, laser, blockers))) {
      return;
    }

    nextPlayers[id] = {
      ...player,
      hp: Math.max(0, player.hp - lasers.reduce((damage, laser) => (
        pointInLaserBeam(player.x, player.y, laser, blockers) ? damage + laser.damage * delta : damage
      ), 0)),
    };
  });

  return {
    players: nextPlayers,
    zombies: zombies
      .map((zombie) => lasers.some((laser) => pointInLaserBeam(zombie.x, zombie.y, laser, blockers))
        ? { ...zombie, hp: zombie.hp - 44 * delta }
        : zombie)
      .filter((zombie) => zombie.hp > 0),
  };
}

export function getLaserBeamRect(laser: LaserBlock): LaserBlocker {
  return getLaserBeamRects(laser)[0];
}

export function getLaserBeamRects(laser: LaserBlock, blockers: LaserBlocker[] = []): LaserBlocker[] {
  return sideOrder.slice(0, laser.sides).flatMap((side) => createSideBeams(laser, side, blockers));
}

function pointInLaserBeam(x: number, y: number, laser: LaserBlock, blockers: LaserBlocker[]): boolean {
  return getLaserBeamRects(laser, blockers).some((beam) => (
    x >= beam.x && x <= beam.x + beam.width && y >= beam.y && y <= beam.y + beam.height
  ));
}

function createSideBeams(laser: LaserBlock, side: LaserSide, blockers: LaserBlocker[]): LaserBlocker[] {
  const perSide = Math.max(1, Math.min(4, Math.round(laser.perSide)));
  return Array.from({ length: perSide }, (_, index) => clipBeam(createBeam(laser, side, getOffset(index, perSide)), side, blockers));
}

function createBeam(laser: LaserBlock, side: LaserSide, offset: number): LaserBlocker {
  const centerX = laser.x + laser.width / 2;
  const centerY = laser.y + laser.height / 2;

  if (side === 'left') {
    return { x: 0, y: centerY + offset - beamThickness / 2, width: laser.x, height: beamThickness };
  }

  if (side === 'down') {
    return { x: centerX + offset - beamThickness / 2, y: laser.y + laser.height, width: beamThickness, height: Math.max(0, ARENA_HEIGHT - laser.y - laser.height) };
  }

  if (side === 'up') {
    return { x: centerX + offset - beamThickness / 2, y: 0, width: beamThickness, height: laser.y };
  }

  return { x: laser.x + laser.width, y: centerY + offset - beamThickness / 2, width: Math.max(0, ARENA_WIDTH - laser.x - laser.width), height: beamThickness };
}

function getOffset(index: number, total: number): number {
  return (index - (total - 1) / 2) * 2.35;
}

function clipBeam(beam: LaserBlocker, side: LaserSide, blockers: LaserBlocker[]): LaserBlocker {
  const blocker = findNearestBeamBlocker(beam, side, blockers);
  if (!blocker) return beam;

  if (side === 'right') {
    return { ...beam, width: Math.max(0, blocker.x - beam.x) };
  }

  if (side === 'left') {
    const endX = beam.x + beam.width;
    return { ...beam, x: blocker.x + blocker.width, width: Math.max(0, endX - blocker.x - blocker.width) };
  }

  if (side === 'down') {
    return { ...beam, height: Math.max(0, blocker.y - beam.y) };
  }

  const endY = beam.y + beam.height;
  return { ...beam, y: blocker.y + blocker.height, height: Math.max(0, endY - blocker.y - blocker.height) };
}

function findNearestBeamBlocker(beam: LaserBlocker, side: LaserSide, blockers: LaserBlocker[]): LaserBlocker | null {
  const candidates = blockers.filter((blocker) => rectanglesOverlap(beam, blocker));
  if (side === 'right') return candidates.sort((a, b) => a.x - b.x)[0] ?? null;
  if (side === 'left') return candidates.sort((a, b) => b.x + b.width - (a.x + a.width))[0] ?? null;
  if (side === 'down') return candidates.sort((a, b) => a.y - b.y)[0] ?? null;
  return candidates.sort((a, b) => b.y + b.height - (a.y + a.height))[0] ?? null;
}

function rectanglesOverlap(first: LaserBlocker, second: LaserBlocker): boolean {
  return (
    first.x < second.x + second.width
    && first.x + first.width > second.x
    && first.y < second.y + second.height
    && first.y + first.height > second.y
  );
}
