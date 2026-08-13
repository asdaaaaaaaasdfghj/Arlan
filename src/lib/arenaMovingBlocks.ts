import { PLAYER_SIZE, type MovingBlock, type Player, type PlayerId } from './arenaTypes';
import { getArenaBounds } from './arenaBounds';

const playerRadius = PLAYER_SIZE / 2;

export function tickMovingBlocks(blocks: MovingBlock[], elapsed: number): MovingBlock[] {
  return blocks.map((block) => {
    const offset = Math.sin(elapsed * block.speed + block.phase) * block.range;
    const angle = elapsed * block.speed + block.phase;
    if (block.axis === 'piston') {
      const progress = block.active === false ? 0 : getPistonProgress(elapsed * block.speed + block.phase);
      const baseWidth = block.baseWidth ?? block.width;
      const baseHeight = block.baseHeight ?? block.height;
      const extension = progress * block.range;
      const direction = block.direction ?? 'right';
      return {
        ...block,
        lastX: getPistonHeadX(block),
        lastY: getPistonHeadY(block),
        x: direction === 'left' ? block.originX - extension : block.originX,
        y: direction === 'up' ? block.originY - extension : block.originY,
        width: direction === 'left' || direction === 'right' ? baseWidth + extension : baseWidth,
        height: direction === 'up' || direction === 'down' ? baseHeight + extension : baseHeight,
        baseWidth,
        baseHeight,
      };
    }

    return {
      ...block,
      lastX: block.x,
      lastY: block.y,
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
  const stickyPull = block.sticky ? pullStickyPlayer(player, block) : player;
  const closestX = clamp(player.x, block.x, block.x + block.width);
  const closestY = clamp(player.y, block.y, block.y + block.height);
  const dx = stickyPull.x - closestX;
  const dy = stickyPull.y - closestY;
  const distance = Math.hypot(dx, dy);

  if (distance >= playerRadius) {
    return stickyPull;
  }

  const push = distance > 0 ? pushByVector(stickyPull, dx, dy, distance) : pushFromInside(stickyPull, block);
  const bounds = getArenaBounds('custom');
  return {
    ...stickyPull,
    x: clamp(push.x, 4, bounds.width - 4),
    y: clamp(push.y, 4, bounds.height - 4),
  };
}

function getPistonProgress(value: number): number {
  const wave = (Math.sin(value) + 1) / 2;
  return wave * wave * (3 - 2 * wave);
}

function pullStickyPlayer(player: Player, block: MovingBlock): Player {
  if (block.axis !== 'piston') return player;
  const headX = getPistonHeadX(block);
  const headY = getPistonHeadY(block);
  const movedX = headX - block.lastX;
  const movedY = headY - block.lastY;
  if (isExtending(block, movedX, movedY) || Math.hypot(movedX, movedY) < 0.01) return player;

  const nearHead = isNearPistonHead(player, block, headX, headY);
  return nearHead ? { ...player, x: player.x + movedX, y: player.y + movedY } : player;
}

function getPistonHeadX(block: MovingBlock): number {
  if (block.direction === 'left') return block.x;
  if (block.direction === 'up' || block.direction === 'down') return block.x + block.width / 2;
  return block.x + block.width;
}

function getPistonHeadY(block: MovingBlock): number {
  if (block.direction === 'up') return block.y;
  if (block.direction === 'left' || block.direction === 'right' || !block.direction) return block.y + block.height / 2;
  return block.y + block.height;
}

function isExtending(block: MovingBlock, movedX: number, movedY: number): boolean {
  if (block.direction === 'left') return movedX < 0;
  if (block.direction === 'up') return movedY < 0;
  if (block.direction === 'down') return movedY > 0;
  return movedX > 0;
}

function isNearPistonHead(player: Player, block: MovingBlock, headX: number, headY: number): boolean {
  if (block.direction === 'left' || block.direction === 'right' || !block.direction) {
    return Math.abs(player.x - (headX + (block.direction === 'left' ? -playerRadius : playerRadius))) < 1.7
      && player.y >= block.y - playerRadius
      && player.y <= block.y + block.height + playerRadius;
  }

  return Math.abs(player.y - (headY + (block.direction === 'up' ? -playerRadius : playerRadius))) < 1.7
    && player.x >= block.x - playerRadius
    && player.x <= block.x + block.width + playerRadius;
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
