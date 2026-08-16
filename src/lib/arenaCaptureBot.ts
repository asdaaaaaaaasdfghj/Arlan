import { isPointInsideObstacle } from './arenaMap';
import { findBotMoveTarget } from './arenaBotPath';
import type { FlagState, GameState, Player, PlayerInput } from './arenaTypes';
import type { BotDifficulty } from './gameSettings';
import { isHiddenInGrass } from './customMap';

type CaptureTarget = Player | FlagState;

const ctfProfiles: Record<BotDifficulty, { aim: number; chasePlayer: number; shootRange: number; defend: boolean }> = {
  easy: { aim: 0.36, chasePlayer: 9, shootRange: 32, defend: false },
  newbie: { aim: 0.48, chasePlayer: 11, shootRange: 38, defend: false },
  normal: { aim: 0.62, chasePlayer: 13, shootRange: 46, defend: true },
  hard: { aim: 0.9, chasePlayer: 16, shootRange: 56, defend: true },
  veryHard: { aim: 1.02, chasePlayer: 20, shootRange: 64, defend: true },
  ultra: { aim: 1.15, chasePlayer: 24, shootRange: 74, defend: true },
  impossible: { aim: 1.46, chasePlayer: 30, shootRange: 92, defend: true },
};

export function createCaptureBotInput(game: GameState, difficulty: BotDifficulty): PlayerInput {
  const profile = ctfProfiles[difficulty];
  const red = game.players.red;
  const target = chooseCaptureTarget(game, difficulty);
  const dx = target.x - red.x;
  const dy = target.y - red.y;
  const distance = Math.hypot(dx, dy);
  const lineBlocked = isLineBlocked(red, target, game);
  const moveTarget = findBotMoveTarget(game, red, target);
  const moveDx = moveTarget.x - red.x;
  const moveDy = moveTarget.y - red.y;
  const canShoot = isPlayerTarget(target) && !lineBlocked && isAimedAt(red, target, profile.aim);
  const closeEnough = isPlayerTarget(target) ? profile.chasePlayer : 2.5;

  return {
    up: distance > closeEnough && moveDy < -1,
    down: distance > closeEnough && moveDy > 1,
    left: distance > closeEnough && moveDx < -1,
    right: distance > closeEnough && moveDx > 1,
    shoot: canShoot && distance < profile.shootRange,
    grenade: canShoot && distance > 16 && distance < getGrenadeRange(difficulty) && shouldThrowGrenade(game.elapsedTime, difficulty, red.x),
    build: false,
    enterVehicle: false,
  };
}

function chooseCaptureTarget(game: GameState, difficulty: BotDifficulty): CaptureTarget {
  const profile = ctfProfiles[difficulty];
  const red = game.players.red;
  const blue = game.players.blue;
  const redHasBlueFlag = game.flags.blue.carrier === 'red';
  const blueHasRedFlag = game.flags.red.carrier === 'blue';

  if (profile.defend && redHasBlueFlag && blueHasRedFlag && canSeePlayer(red, blue, game)) {
    return blue;
  }

  if (redHasBlueFlag) {
    return game.flags.red;
  }

  if (profile.defend && blueHasRedFlag && canSeePlayer(red, blue, game)) {
    return blue;
  }

  return game.flags.blue;
}

function isLineBlocked(from: Player, to: CaptureTarget, game: GameState): boolean {
  const blockers = [...game.barricades, ...game.mapBoards, ...game.movingBlocks, ...game.tnts.filter((tnt) => tnt.active), ...game.ricochetBlocks];

  for (let step = 1; step < 18; step += 1) {
    const progress = step / 18;
    const x = from.x + (to.x - from.x) * progress;
    const y = from.y + (to.y - from.y) * progress;

    if (isPointInsideObstacle(x, y, game.mapId, blockers)) {
      return true;
    }
  }

  return false;
}

function canSeePlayer(from: Player, to: Player, game: GameState): boolean {
  if (game.mapId !== 'custom' || !isHiddenInGrass(to.x, to.y)) {
    return true;
  }

  return Math.hypot(from.x - to.x, from.y - to.y) <= 12;
}

function isAimedAt(from: Player, to: Player, tolerance: number): boolean {
  const targetAngle = Math.atan2(to.y - from.y, to.x - from.x);
  const facingAngle = Math.atan2(from.facingY, from.facingX);
  const angleDiff = Math.abs(Math.atan2(Math.sin(targetAngle - facingAngle), Math.cos(targetAngle - facingAngle)));

  return angleDiff < tolerance;
}

function isPlayerTarget(target: CaptureTarget): target is Player {
  return 'hp' in target;
}

function getGrenadeRange(difficulty: BotDifficulty): number {
  if (difficulty === 'impossible') return 78;
  if (difficulty === 'ultra') return 60;
  if (difficulty === 'veryHard') return 54;
  if (difficulty === 'hard') return 48;
  return 42;
}

function shouldThrowGrenade(elapsedTime: number, difficulty: BotDifficulty, seed: number): boolean {
  if (difficulty === 'impossible') return true;
  if (difficulty === 'ultra') return true;
  if (difficulty === 'veryHard') return Math.sin(elapsedTime * 8.5 + seed) > -0.35;
  if (difficulty === 'hard') return Math.sin(elapsedTime * 5.8 + seed) > 0.05;
  return Math.sin(elapsedTime * 4.2 + seed) > 0.42;
}
