import {
  ARENA_HEIGHT,
  ARENA_WIDTH,
  type Barricade,
  type CodeAction,
  type CodeBlock,
  type GameState,
  type HitEffect,
  type Player,
  type PlayerId,
  type Zombie,
} from './arenaTypes';

type CodeBlockResult = Pick<GameState, 'players' | 'zombies' | 'barricades' | 'codeBlocks' | 'hitEffects' | 'nextZombieId' | 'nextBarricadeId' | 'nextEffectId'>;

export function tickCodeBlocks(
  state: Pick<GameState, 'players' | 'zombies' | 'barricades' | 'mapBoards' | 'codeBlocks' | 'nextZombieId' | 'nextBarricadeId' | 'nextEffectId'>,
  delta: number,
): CodeBlockResult {
  const result: CodeBlockResult = {
    players: state.players,
    zombies: state.zombies,
    barricades: state.barricades,
    codeBlocks: [],
    hitEffects: [],
    nextZombieId: state.nextZombieId,
    nextBarricadeId: state.nextBarricadeId,
    nextEffectId: state.nextEffectId,
  };

  for (const block of state.codeBlocks) {
    const nextBlock = { ...block, cooldownTimer: Math.max(0, (block.cooldownTimer ?? 0) - delta) };
    const targets = Object.values(result.players).filter((player) => shouldTrigger(nextBlock, player));

    if (targets.length === 0) {
      result.codeBlocks.push(nextBlock);
      continue;
    }

    if (isContinuousAction(nextBlock.action)) {
      result.players = targets.reduce((players, player) => ({
        ...players,
        [player.id]: applyPlayerAction(players[player.id], nextBlock.action, nextBlock.power, delta),
      }), result.players);
      result.codeBlocks.push(nextBlock);
      continue;
    }

    if (nextBlock.cooldownTimer > 0) {
      result.codeBlocks.push(nextBlock);
      continue;
    }

    runWorldAction(result, nextBlock, targets[0], state.mapBoards);
    result.codeBlocks.push({ ...nextBlock, cooldownTimer: getWorldActionCooldown(nextBlock.action) });
  }

  return result;
}

function shouldTrigger(block: CodeBlock, player: Player): boolean {
  return player.hp > 0 && shouldAffectPlayer(block, player.id) && isTouching(player, block);
}

function shouldAffectPlayer(block: CodeBlock, playerId: PlayerId): boolean {
  return block.team === 'all' || block.team === playerId;
}

function isContinuousAction(action: CodeAction): boolean {
  return action === 'damage' || action === 'heal' || action === 'speed' || action === 'shock';
}

function applyPlayerAction(player: Player, action: CodeAction, power: number, delta: number): Player {
  if (action === 'heal') {
    return { ...player, hp: Math.min(100, player.hp + power * delta) };
  }

  if (action === 'speed') {
    return { ...player, speedBoost: Math.max(player.speedBoost, Math.max(0.8, power / 18)) };
  }

  if (action === 'shock') {
    return { ...player, shockTimer: Math.max(player.shockTimer, Math.max(0.25, power / 24)) };
  }

  return { ...player, hp: Math.max(0, player.hp - power * delta) };
}

function runWorldAction(result: CodeBlockResult, block: CodeBlock, player: Player, mapBoards: Barricade[]) {
  if (block.action === 'build') {
    const barricade = createCodeBarricade(block, player, result.nextBarricadeId);
    if (!isBlocked(barricade, [...result.barricades, ...mapBoards])) {
      result.barricades = [...result.barricades, barricade];
      result.nextBarricadeId += 1;
    }
  }

  if (block.action === 'spawnZombie') {
    result.zombies = [...result.zombies, createCodeZombie(block, result.nextZombieId)];
    result.nextZombieId += 1;
  }

  const particles = createCodeParticles(block, result.nextEffectId, block.power);
  result.hitEffects = [...result.hitEffects, ...particles];
  result.nextEffectId += particles.length;
}

function createCodeBarricade(block: CodeBlock, player: Player, id: number): Barricade {
  const size = 5.5;
  return {
    id,
    x: clamp(block.x + block.width / 2 + player.facingX * 6 - size / 2, 0, ARENA_WIDTH - size),
    y: clamp(block.y + block.height / 2 + player.facingY * 6 - size / 2, 0, ARENA_HEIGHT - size),
    width: size,
    height: size,
    hp: 45 + block.power * 3,
    variant: 'buildBlock',
  };
}

function createCodeZombie(block: CodeBlock, id: number): Zombie {
  return {
    id,
    x: block.x + block.width / 2,
    y: block.y + block.height / 2,
    hp: 32 + block.power,
  };
}

function createCodeParticles(block: CodeBlock, firstId: number, power: number): HitEffect[] {
  const count = Math.max(2, Math.min(8, Math.round(power / 10)));
  return Array.from({ length: count }, (_, index) => ({
    id: firstId + index,
    x: block.x + block.width / 2 + Math.cos(index * 1.7) * 3,
    y: block.y + block.height / 2 + Math.sin(index * 1.7) * 3,
    kind: 'explosion',
    age: 0.32,
  }));
}

function getWorldActionCooldown(action: CodeAction): number {
  if (action === 'spawnZombie') return 2.2;
  if (action === 'build') return 1.15;
  return 0.45;
}

function isBlocked(rect: Barricade, blockers: Barricade[]): boolean {
  return blockers.some((blocker) => (
    rect.x < blocker.x + blocker.width
    && rect.x + rect.width > blocker.x
    && rect.y < blocker.y + blocker.height
    && rect.y + rect.height > blocker.y
  ));
}

function isTouching(player: Player, block: CodeBlock): boolean {
  return player.x >= block.x
    && player.x <= block.x + block.width
    && player.y >= block.y
    && player.y <= block.y + block.height;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
