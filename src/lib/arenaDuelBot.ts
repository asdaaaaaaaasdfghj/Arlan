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

const profiles: Record<BotDifficulty, { aim: number; distance: number; shootRange: number; grenadeMin: number }> = {
  easy: { aim: 0.3, distance: 28, shootRange: 32, grenadeMin: 32 },
  newbie: { aim: 0.44, distance: 23, shootRange: 40, grenadeMin: 25 },
  normal: { aim: 0.55, distance: 18, shootRange: 48, grenadeMin: 18 },
  hard: { aim: 0.82, distance: 12, shootRange: 58, grenadeMin: 12 },
  veryHard: { aim: 0.96, distance: 10, shootRange: 64, grenadeMin: 10 },
  ultra: { aim: 1.08, distance: 8, shootRange: 72, grenadeMin: 8 },
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

  const distance = Math.hypot(enemy.x - player.x, enemy.y - player.y);
  const lineBlocked = isLineBlocked(player, enemy, game);
  const aimedAtTarget = isAimedAt(player, enemy, profile.aim);
  const desiredDistance = isSwordMode(game.mode) ? 14 : profile.distance + Math.sin(style.seed) * 7;
  const shouldMove = distance > desiredDistance || lineBlocked || !aimedAtTarget;
  const tacticalTarget = isSwordMode(game.mode) ? enemy : addStrafeTarget(player, enemy, game, style.seed, 10);
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
    grenade: !isSwordMode(game.mode) && !lineBlocked && aimedAtTarget && distance > profile.grenadeMin && distance < 42,
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

function isAimedAt(from: Player, to: Player, tolerance: number): boolean {
  const targetAngle = Math.atan2(to.y - from.y, to.x - from.x);
  const facingAngle = Math.atan2(from.facingY, from.facingX);
  const angleDiff = Math.abs(Math.atan2(Math.sin(targetAngle - facingAngle), Math.cos(targetAngle - facingAngle)));
  return angleDiff < tolerance;
}
