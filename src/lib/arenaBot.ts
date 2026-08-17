import { isPointInsideObstacle } from './arenaMap';
import { createCaptureBotInput } from './arenaCaptureBot';
import { createPaintBotInput } from './arenaPaintBot';
import { findBotMoveTarget } from './arenaBotPath';
import { hillZone } from './arenaKingHill';
import { getLavaExitX, isLavaSurvivalMode } from './arenaLavaSurvival';
import { addStrafeTarget } from './botTactics';
import { isZombieMode } from './arenaModes';
import { isSurvivalGrace } from './arenaSurvivalMode';
import type { AllyCheckpoint, Barricade, GameInput, GameState, Player, PlayerInput, Zombie } from './arenaTypes';
import type { BotDifficulty } from './gameSettings';
import { cannotSeeInGrass, canSeeWhilePoisoned } from './botVision';

const botProfiles: Record<BotDifficulty, { aim: number; duelDistance: number; shootRange: number; grenadeMin: number; grenadeMax: number; lead: number; strafe: number }> = {
  easy: { aim: 0.3, duelDistance: 28, shootRange: 32, grenadeMin: 32, grenadeMax: 38, lead: 0, strafe: 5 },
  newbie: { aim: 0.44, duelDistance: 23, shootRange: 40, grenadeMin: 25, grenadeMax: 42, lead: 0.03, strafe: 6 },
  normal: { aim: 0.55, duelDistance: 18, shootRange: 48, grenadeMin: 18, grenadeMax: 45, lead: 0.06, strafe: 7 },
  hard: { aim: 0.82, duelDistance: 12, shootRange: 58, grenadeMin: 12, grenadeMax: 49, lead: 0.1, strafe: 9 },
  veryHard: { aim: 0.96, duelDistance: 10, shootRange: 66, grenadeMin: 9, grenadeMax: 54, lead: 0.15, strafe: 11 },
  ultra: { aim: 1.12, duelDistance: 8, shootRange: 76, grenadeMin: 7, grenadeMax: 60, lead: 0.2, strafe: 13 },
  impossible: { aim: 0.22, duelDistance: 6, shootRange: 92, grenadeMin: 5, grenadeMax: 76, lead: 0.32, strafe: 18 },
  thermonuclear: { aim: 0.08, duelDistance: 4, shootRange: 130, grenadeMin: 0, grenadeMax: 120, lead: 0.62, strafe: 8 },
};

const emptyBotInput: PlayerInput = {
  up: false,
  down: false,
  left: false,
  right: false,
  shoot: false,
  build: false,
  grenade: false,
  enterVehicle: false,
};

export function withRedBotInput(
  game: GameState,
  input: GameInput,
  enabled: boolean,
  difficulty: BotDifficulty,
): GameInput {
  if (!enabled || game.status !== 'playing' || game.players.red.hp <= 0) return input;

  return {
    ...input,
    red: createRedBotInput(game, difficulty),
  };
}

function createRedBotInput(game: GameState, difficulty: BotDifficulty): PlayerInput {
  if (isSurvivalGrace(game.mode, game.elapsedTime)) {
    return createSurvivalBuilderInput(game);
  }

  if (game.mode === 'captureFlag' && game.zombies.length === 0) {
    return createCaptureBotInput(game, difficulty);
  }

  if (game.mode === 'paintBattle') {
    return createPaintBotInput(game, difficulty);
  }

  if (isLavaSurvivalMode(game.mode)) {
    return createLavaRunnerInput(game);
  }

  const profile = botProfiles[difficulty];
  const red = game.players.red;
  const target = chooseTarget(game);

  if (!target) {
    return { ...emptyBotInput };
  }

  const breakable = findBreakableBetween(red, target, game);
  const actionTarget = breakable ?? predictTarget(target, profile.lead);
  const dx = actionTarget.x - red.x;
  const dy = actionTarget.y - red.y;
  const distance = Math.hypot(dx, dy);
  const wantsDistance = isZombieMode(game.mode) ? 24 : profile.duelDistance;
  const lineBlocked = breakable ? false : isLineBlocked(red, target, game);
  const tooClose = !isZombieMode(game.mode) && distance < wantsDistance * 0.72;
  const chase = distance > wantsDistance || lineBlocked || Boolean(breakable);
  const dodge = !chase && Math.abs(dy) < 10;
  const aimedAtTarget = isAimedAt(red, actionTarget, profile.aim);
  const needsAimStep = !lineBlocked && !aimedAtTarget;
  const needsHill = game.mode === 'kingHill' && !isInsideHill(red);
  const shouldMove = chase || tooClose || needsAimStep || needsHill;
  const hillTarget = needsHill ? hillZone : actionTarget;
  const tacticalTarget = difficulty === 'thermonuclear'
    ? actionTarget
    : tooClose
    ? retreatFrom(red, actionTarget)
    : isZombieMode(game.mode) ? target : addStrafeTarget(red, hillTarget, game, red.score * 1.9 + target.x * 0.13, profile.strafe);
  const moveTarget = breakable ? actionTarget : shouldMove ? findBotMoveTarget(game, red, tacticalTarget) : actionTarget;
  const moveDx = moveTarget.x - red.x;
  const moveDy = moveTarget.y - red.y;

  return {
    up: shouldMove ? moveDy < -1.5 : dodge && red.y > 16,
    down: shouldMove ? moveDy > 1.5 : dodge && red.y <= 48,
    left: shouldMove && moveDx < -1.5,
    right: shouldMove && moveDx > 1.5,
    shoot: !lineBlocked && aimedAtTarget && distance < profile.shootRange,
    build: isZombieMode(game.mode) && nearestZombieDistance(red, game.zombies) < 18,
    grenade: !lineBlocked && aimedAtTarget && distance > profile.grenadeMin && distance < profile.grenadeMax && shouldThrowGrenade(game.elapsedTime, difficulty, red.x),
    enterVehicle: false,
  };
}

function createLavaRunnerInput(game: GameState): PlayerInput {
  const red = game.players.red;
  const exit = { x: getLavaExitX(), y: red.y };
  const routeTarget = { x: getLavaExitX(), y: 32 };
  const breakable = findBreakableBetween(red, exit, game);
  const moveTarget = breakable ?? findBotMoveTarget(game, red, routeTarget);
  const dx = moveTarget.x - red.x;
  const dy = moveTarget.y - red.y;
  const aimedAtWall = breakable ? isAimedAt(red, breakable, 0.82) : false;

  return {
    up: dy < -1.2,
    down: dy > 1.2,
    left: dx < -1.2,
    right: dx > 1.2,
    shoot: Boolean(breakable) && aimedAtWall,
    build: false,
    grenade: false,
    enterVehicle: false,
  };
}

function createSurvivalBuilderInput(game: GameState): PlayerInput {
  const red = game.players.red;
  const center = { x: 72, y: 32 };
  const phase = Math.floor(game.elapsedTime * 1.7) % 4;
  const patrol = [
    { x: center.x + 9, y: center.y - 8 },
    { x: center.x - 4, y: center.y - 10 },
    { x: center.x - 8, y: center.y + 7 },
    { x: center.x + 8, y: center.y + 9 },
  ][phase];
  const moveTarget = findBotMoveTarget(game, red, patrol);
  const dx = moveTarget.x - red.x;
  const dy = moveTarget.y - red.y;
  const buildPulse = game.elapsedTime % 1.8 < 0.14;
  const nearbyWalls = game.barricades.filter((item) => (
    Math.hypot(item.x + item.width / 2 - red.x, item.y + item.height / 2 - red.y) < 13
  )).length;
  const redSideWalls = game.barricades.filter((item) => item.x + item.width / 2 > 55).length;

  return {
    up: dy < -1.2,
    down: dy > 1.2,
    left: dx < -1.2,
    right: dx > 1.2,
    shoot: false,
    build: buildPulse && nearbyWalls === 0 && redSideWalls < 7,
    grenade: false,
    enterVehicle: false,
  };
}

type BreakableTarget = { x: number; y: number };
type BotTarget = Player | Zombie | BreakableTarget;

function chooseTarget(game: GameState): BotTarget | null {
  const zombie = chooseNearestZombie(game);
  if (zombie && canSeeWhilePoisoned(game.players.red, zombie)) {
    return zombie;
  }

  if (
    game.players.blue.hp <= 0
    || cannotSeeInGrass(game.players.red, game.players.blue, game.mapId)
    || !canSeeWhilePoisoned(game.players.red, game.players.blue)
  ) {
    return null;
  }

  return game.players.blue;
}

function chooseNearestZombie(game: GameState): Zombie | null {
  return game.zombies.reduce<Zombie | null>((nearest, zombie) => {
    if (!nearest) return zombie;
    const nearestDistance = Math.hypot(nearest.x - game.players.red.x, nearest.y - game.players.red.y);
    const zombieDistance = Math.hypot(zombie.x - game.players.red.x, zombie.y - game.players.red.y);
    return zombieDistance < nearestDistance ? zombie : nearest;
  }, null);
}

function nearestZombieDistance(player: Player, zombies: Zombie[]): number {
  if (zombies.length === 0) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.min(...zombies.map((zombie) => Math.hypot(zombie.x - player.x, zombie.y - player.y)));
}

function isInsideHill(player: Player): boolean {
  return Math.hypot(player.x - hillZone.x, player.y - hillZone.y) <= hillZone.radius;
}

function isLineBlocked(from: Player, to: BotTarget, game: GameState): boolean {
  const steps = 18;

  for (let step = 1; step < steps; step += 1) {
    const progress = step / steps;
    const x = from.x + (to.x - from.x) * progress;
    const y = from.y + (to.y - from.y) * progress;

    const blockers = [...game.barricades, ...game.mapBoards, ...game.movingBlocks, ...game.tnts.filter((tnt) => tnt.active), ...game.ricochetBlocks];
    if (isPointInsideObstacle(x, y, game.mapId, blockers)) {
      return true;
    }
  }

  return false;
}

function findBreakableBetween(from: Player, to: BotTarget, game: GameState): BreakableTarget | null {
  const breakables = [
    ...game.mapBoards,
    ...game.allyCheckpoints.filter((checkpoint) => checkpoint.variant === 'glass' || checkpoint.role === 'core'),
  ];

  for (let step = 1; step < 18; step += 1) {
    const progress = step / 18;
    const x = from.x + (to.x - from.x) * progress;
    const y = from.y + (to.y - from.y) * progress;
    const blocker = breakables.find((item) => pointInRect(x, y, item));

    if (blocker) {
      return { x: blocker.x + blocker.width / 2, y: blocker.y + blocker.height / 2 };
    }
  }

  return null;
}

function pointInRect(x: number, y: number, rect: Barricade | AllyCheckpoint): boolean {
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}

function predictTarget(target: BotTarget, lead: number): BotTarget {
  return 'slideX' in target
    ? { ...target, x: target.x + target.slideX * lead, y: target.y + target.slideY * lead }
    : target;
}

function retreatFrom(from: Player, target: BotTarget): BreakableTarget {
  const dx = from.x - target.x;
  const dy = from.y - target.y;
  const length = Math.hypot(dx, dy) || 1;
  return { x: from.x + (dx / length) * 18, y: from.y + (dy / length) * 18 };
}

function shouldThrowGrenade(elapsedTime: number, difficulty: BotDifficulty, seed: number): boolean {
  if (difficulty === 'thermonuclear') return true;
  if (difficulty === 'impossible') return true;
  if (difficulty === 'ultra') return true;
  if (difficulty === 'veryHard') return Math.sin(elapsedTime * 8.5 + seed) > -0.35;
  if (difficulty === 'hard') return Math.sin(elapsedTime * 5.8 + seed) > 0.05;
  return Math.sin(elapsedTime * 4.2 + seed) > 0.42;
}

function isAimedAt(from: Player, to: BotTarget, tolerance: number): boolean {
  const targetAngle = Math.atan2(to.y - from.y, to.x - from.x);
  const facingAngle = Math.atan2(from.facingY, from.facingX);
  const angleDiff = Math.abs(Math.atan2(Math.sin(targetAngle - facingAngle), Math.cos(targetAngle - facingAngle)));

  return angleDiff < tolerance;
}
