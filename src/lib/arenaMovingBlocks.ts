import { PLAYER_SIZE, type MovingBlock, type Player, type PlayerId } from './arenaTypes';
import { getArenaBounds } from './arenaBounds';

const playerRadius = PLAYER_SIZE / 2;

export function tickMovingBlocks(blocks: MovingBlock[], elapsed: number): MovingBlock[] {
  return blocks.map((block) => {
    const offset = Math.sin(elapsed * block.speed + block.phase) * block.range;
    const angle = elapsed * block.speed + block.phase;
    return {
      ...block,
      x: block.axis === 'orbit' ? block.originX + Math.cos(angle) * block.range : block.axis === 'x' ? block.originX + offset : block.originX,
      y: block.axis === 'orbit' ? block.originY + Math.sin(angle) * block.range : block.axis === 'y' ? block.originY - offset : block.originY,
    };
  });
}

export function pushPlayersFromMovingBlocks(
  players: Record<PlayerId, Player>,
  blocks: MovingBlock[],
): Record<PlayerId, Player> {
  return {
    blue: pushPlayer(players.blue, blocks),
    red: pushPlayer(players.red, blocks),
  };
}

function pushPlayer(player: Player, blocks: MovingBlock[]): Player {
  if (player.hp <= 0) {
    return player;
  }

  return blocks.reduce((next, block) => pushFromBlock(next, block), player);
}

function pushFromBlock(player: Player, block: MovingBlock): Player {
  const closestX = clamp(player.x, block.x, block.x + block.width);
  const closestY = clamp(player.y, block.y, block.y + block.height);
  const dx = player.x - closestX;
  const dy = player.y - closestY;
  const distance = Math.hypot(dx, dy);

  if (distance >= playerRadius) {
    return player;
  }

  const push = distance > 0 ? pushByVector(player, dx, dy, distance) : pushFromInside(player, block);
  const bounds = getArenaBounds('custom');
  return {
    ...player,
    x: clamp(push.x, 4, bounds.width - 4),
    y: clamp(push.y, 4, bounds.height - 4),
  };
}

function pushByVector(player: Player, dx: number, dy: number, distance: number) {
  const force = playerRadius - distance + 0.25;
  return {
    x: player.x + (dx / distance) * force,
    y: player.y + (dy / distance) * force,
  };
}

function pushFromInside(player: Player, block: MovingBlock) {
  const left = Math.abs(player.x - block.x);
  const right = Math.abs(block.x + block.width - player.x);
  const top = Math.abs(player.y - block.y);
  const bottom = Math.abs(block.y + block.height - player.y);
  const nearest = Math.min(left, right, top, bottom);

  if (nearest === left) return { x: block.x - playerRadius - 0.25, y: player.y };
  if (nearest === right) return { x: block.x + block.width + playerRadius + 0.25, y: player.y };
  if (nearest === top) return { x: player.x, y: block.y - playerRadius - 0.25 };
  return { x: player.x, y: block.y + block.height + playerRadius + 0.25 };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
