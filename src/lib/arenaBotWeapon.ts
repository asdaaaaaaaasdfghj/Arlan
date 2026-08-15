import { isPointInsideObstacle } from './arenaMap';
import { getMiniGameWeapon, isMiniGamesMode } from './arenaMiniGames';
import type { GameState, Player, WeaponId, Zombie } from './arenaTypes';
import type { BotDifficulty } from './gameSettings';
import { getWeaponOrder } from './arenaWeapons';
import { cannotSeeInGrass, canSeeWhilePoisoned } from './botVision';

type BotTarget = Player | Zombie;

export function chooseRedBotWeapon(game: GameState, enabled: boolean, difficulty: BotDifficulty = 'normal'): WeaponId {
  if (isMiniGamesMode(game)) {
    return getMiniGameWeapon(game);
  }

  if (game.mode === 'flameDuel') {
    return 'flamethrower';
  }

  if (!enabled || game.mode === 'railDuel' || game.status !== 'playing') {
    return game.players.red.weapon;
  }

  const red = game.players.red;
  const target = chooseTarget(game);
  if (!target) {
    return game.players.red.weapon;
  }

  const distance = Math.hypot(target.x - red.x, target.y - red.y);
  const lineBlocked = isLineBlocked(red, target, game);
  const weapons = getWeaponOrder(game.mapId);

  if (isTopDifficulty(difficulty) && game.mapId === 'custom' && distance <= 28 && weapons.includes('custom5')) return 'custom5';
  if (distance < (isTopDifficulty(difficulty) ? 22 : 18) && !lineBlocked) return weapons.includes('shotgun') ? 'shotgun' : 'blaster';
  if (distance > (isTopDifficulty(difficulty) ? 30 : 38) && !lineBlocked) return weapons.includes('railgun') ? 'railgun' : 'blaster';
  if (game.mapId === 'custom' && distance > 24 && weapons.includes('custom4')) return 'custom4';
  if (game.mapId === 'custom' && distance <= 24 && weapons.includes('custom5')) return 'custom5';
  return 'blaster';
}

function isTopDifficulty(difficulty: BotDifficulty): boolean {
  return difficulty === 'veryHard' || difficulty === 'ultra';
}

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
    return Math.hypot(zombie.x - game.players.red.x, zombie.y - game.players.red.y)
      < Math.hypot(nearest.x - game.players.red.x, nearest.y - game.players.red.y) ? zombie : nearest;
  }, null);
}

function isLineBlocked(from: Player, to: BotTarget, game: GameState): boolean {
  const blockers = [...game.barricades, ...game.mapBoards, ...game.movingBlocks, ...game.tnts.filter((tnt) => tnt.active), ...game.ricochetBlocks];
  return Array.from({ length: 17 }, (_, index) => (index + 1) / 18).some((progress) => (
    isPointInsideObstacle(from.x + (to.x - from.x) * progress, from.y + (to.y - from.y) * progress, game.mapId, blockers)
  ));
}
