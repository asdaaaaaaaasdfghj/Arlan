import { isPointInsideObstacle } from './arenaMap';
import { findBotMoveTarget } from './arenaBotPath';
import { addStrafeTarget } from './botTactics';
import type { GameState, Player, PlayerInput, PlayerId } from './arenaTypes';
import type { BotDifficulty } from './gameSettings';
import { isHiddenInGrass } from './customMap';
import { isSwordMode } from './arenaModes';

export type DuelBotStyle = {
  seed: number;
};

const profiles: Record<BotDifficulty, { aim: number; distance: number; shootRange: number; grenadeMin: number; grenadeMax: number; lead: number; strafe: number }> = {
  easy: { aim: 0.3, distance: 28, shootRange: 32, grenadeMin: 32, grenadeMax: 38, lead: 0, strafe: 6 },
  newbie: { aim: 0.44, distance: 23, shootRange: 40, grenadeMin: 25, grenadeMax: 42, lead: 0.03, strafe: 7 },
  normal: { aim: 0.55, distance: 18, shootRange: 48, grenadeMin: 18, grenadeMax: 45, lead: 0.06, strafe: 10 },
  hard: { aim: 0.82, distance: 12, shootRange: 58, grenadeMin: 12, grenadeMax: 49, lead: 0.1, strafe: 12 },
  veryHard: { aim: 0.96, distance: 10, shootRange: 66, grenadeMin: 9, grenadeMax: 54, lead: 0.15, strafe: 14 },
  ultra: { aim: 1.12, distance: 8, shootRange: 76, grenadeMin: 7, grenadeMax: 60, lead: 0.2, strafe: 16 },
  impossible: { aim: 0.22, distance: 6, shootRange: 92, grenadeMin: 5, grenadeMax: 76, lead: 0.32, strafe: 22 },
  thermonuclear: { aim: 0.08, distance: 4, shootRange: 130, grenadeMin: 0, grenadeMax: 120, lead: 0.62, strafe: 8 },
};

const emptyInput: PlayerInput = {
  up: false,
  down: false,
  left: false,
  right: false,
  shoot: false,
  build: false,
  grenade: false,
  enterVehicle: false,
};

export function createDuelBotInput(
  game: GameState,
  playerId: PlayerId,
  difficulty: BotDifficulty,
  style: DuelBotStyle = { seed: 0 },
): PlayerInput {
  const profile = profiles[difficulty];
  const player = game.players[playerId];
  const enemy = game.players[playerId === 'blue' ? 'red' : 'blue'];

  if (player.hp <= 0 || enemy.hp <= 0 || cannotSeeInGrass(player, enemy, game)) {
    return { ...emptyInput };
  }

  const target = predictEnemy(enemy, profile.lead);
  const distance = Math.hypot(target.x - player.x, target.y - player.y);
  const lineBlocked = isLineBlocked(player, enemy, game);
  const aimedAtTarget = isAimedAt(player, target, profile.aim);
  const desiredDistance = isSwordMode(game.mode) ? 14 : profile.distance + Math.sin(style.seed) * 7;
  const tooClose = !isSwordMode(game.mode) && distance < desiredDistance * 0.72;
  const shouldMove = distance > desiredDistance || tooClose || lineBlocked || !aimedAtTarget;
  const tacticalTarget = difficulty === 'thermonuclear'
    ? target
    : tooClose ? retreatFrom(player, target) : isSwordMode(game.mode) ? enemy : addStrafeTarget(player, target, game, style.seed, profile.strafe);
  const moveTarget = shouldMove ? findBotMoveTarget(game, player, tacticalTarget) : enemy;
  const moveDx = moveTarget.x - player.x;
  const moveDy = moveTarget.y - player.y;

  return {
    up: shouldMove && moveDy < -1.5,
    down: shouldMove && moveDy > 1.5,
    left: shouldMove && moveDx < -1.5,
    right: shouldMove && moveDx > 1.5,
    shoot: !lineBlocked && aimedAtTarget && distance < (isSwordMode(game.mode) ? 20 : profile.shootRange),
    build: false,
    grenade: !isSwordMode(game.mode) && !lineBlocked && aimedAtTarget && distance > profile.grenadeMin && distance < profile.grenadeMax && shouldThrowGrenade(game.elapsedTime, difficulty, style.seed),
    enterVehicle: false,
  };
}

function isLineBlocked(from: Player, to: Player, game: GameState): boolean {
  const blockers = [...game.barricades, ...game.mapBoards, ...game.movingBlocks, ...game.tnts.filter((tnt) => tnt.active), ...game.ricochetBlocks];

  for (let step = 1; step < 18; step += 1) {
    const progress = step / 18;
    const x = from.x + (to.x - from.x) * progress;
    const y = from.y + (to.y - from.y) * progress;
    if (isPointInsideObstacle(x, y, game.mapId, blockers)) return true;
  }

  return false;
}

function cannotSeeInGrass(from: Player, to: Player, game: GameState): boolean {
  return game.mapId === 'custom' && isHiddenInGrass(to.x, to.y) && Math.hypot(from.x - to.x, from.y - to.y) > 12;
}

function predictEnemy(enemy: Player, lead: number): Player {
  return { ...enemy, x: enemy.x + enemy.slideX * lead, y: enemy.y + enemy.slideY * lead };
}

function retreatFrom(from: Player, target: Player): Player {
  const dx = from.x - target.x;
  const dy = from.y - target.y;
  const length = Math.hypot(dx, dy) || 1;
  return { ...target, x: from.x + (dx / length) * 18, y: from.y + (dy / length) * 18 };
}

function shouldThrowGrenade(elapsedTime: number, difficulty: BotDifficulty, seed: number): boolean {
  if (difficulty === 'thermonuclear') return true;
  if (difficulty === 'impossible') return true;
  if (difficulty === 'ultra') return true;
  if (difficulty === 'veryHard') return Math.sin(elapsedTime * 8.5 + seed) > -0.35;
  if (difficulty === 'hard') return Math.sin(elapsedTime * 5.8 + seed) > 0.05;
  return Math.sin(elapsedTime * 4.2 + seed) > 0.42;
}

function isAimedAt(from: Player, to: Player, tolerance: number): boolean {
  const targetAngle = Math.atan2(to.y - from.y, to.x - from.x);
  const facingAngle = Math.atan2(from.facingY, from.facingX);
  const angleDiff = Math.abs(Math.atan2(Math.sin(targetAngle - facingAngle), Math.cos(targetAngle - facingAngle)));
  return angleDiff < tolerance;
}
