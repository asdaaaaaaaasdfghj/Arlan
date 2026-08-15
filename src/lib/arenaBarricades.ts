import {
  BARRICADE_HEIGHT,
  BARRICADE_HP,
  BARRICADE_WIDTH,
  BUILD_COOLDOWN,
  type Barricade,
  type GameInput,
  type MapId,
  type Player,
  type PlayerId,
} from './arenaTypes';
import { rectOverlapsBlockers } from './arenaMap';
import { getArenaBounds } from './arenaBounds';

const BUILD_DISTANCE = 8;
const MAX_BARRICADES = 8;
const MAX_BLOCKS = 28;
const BUILD_BLOCK_SIZE = 5;
const BUILD_BLOCK_HP = 120;

export function buildBarricades(
  players: Record<PlayerId, Player>,
  input: GameInput,
  barricades: Barricade[],
  blockers: Barricade[],
  mapId: MapId,
  nextId: number,
  options: { cooldown?: number; maxBuilds?: number } = {},
): { players: Record<PlayerId, Player>; barricades: Barricade[]; nextId: number } {
  let created = [...barricades];
  let nextBarricadeId = nextId;
  const nextPlayers = { ...players };
  const cooldown = options.cooldown ?? BUILD_COOLDOWN;

  (Object.keys(players) as PlayerId[]).forEach((id) => {
    const player = nextPlayers[id];
    const maxBuilds = options.maxBuilds ?? (mapId === 'custom' ? MAX_BARRICADES : MAX_BARRICADES);
    if (!input[id].build || player.hp <= 0 || player.buildCooldown > 0 || created.length >= maxBuilds) {
      return;
    }

    const barricade = createBarricade(player, nextBarricadeId);
    if (!canPlaceBarricade(barricade, [...created, ...blockers], mapId)) {
      return;
    }

    created = [...created, barricade];
    nextBarricadeId += 1;
    nextPlayers[id] = { ...player, buildCooldown: cooldown };
  });

  return { players: nextPlayers, barricades: created, nextId: nextBarricadeId };
}

export function buildArenaBlocks(
  players: Record<PlayerId, Player>,
  input: GameInput,
  blocks: Barricade[],
  blockers: Barricade[],
  mapId: MapId,
  nextId: number,
): { players: Record<PlayerId, Player>; barricades: Barricade[]; nextId: number } {
  let created = [...blocks];
  let nextBlockId = nextId;
  const nextPlayers = { ...players };

  (Object.keys(players) as PlayerId[]).forEach((id) => {
    const player = nextPlayers[id];
    if (!input[id].build || player.hp <= 0 || player.buildCooldown > 0 || created.length >= MAX_BLOCKS) {
      return;
    }

    const block = createBuildBlock(player, nextBlockId);
    if (!canPlaceBarricade(block, [...created, ...blockers], mapId)) {
      return;
    }

    created = [...created, block];
    nextBlockId += 1;
    nextPlayers[id] = { ...player, buildCooldown: BUILD_COOLDOWN };
  });

  return { players: nextPlayers, barricades: created, nextId: nextBlockId };
}

function createBarricade(player: Player, id: number): Barricade {
  const horizontal = Math.abs(player.facingX) >= Math.abs(player.facingY);
  const width = horizontal ? BARRICADE_HEIGHT : BARRICADE_WIDTH;
  const height = horizontal ? BARRICADE_WIDTH : BARRICADE_HEIGHT;
  const centerX = player.x + player.facingX * BUILD_DISTANCE;
  const centerY = player.y + player.facingY * BUILD_DISTANCE;

  return {
    id,
    x: centerX - width / 2,
    y: centerY - height / 2,
    width,
    height,
    hp: BARRICADE_HP,
  };
}

function createBuildBlock(player: Player, id: number): Barricade {
  const centerX = player.x + player.facingX * BUILD_DISTANCE;
  const centerY = player.y + player.facingY * BUILD_DISTANCE;

  return {
    id,
    x: centerX - BUILD_BLOCK_SIZE / 2,
    y: centerY - BUILD_BLOCK_SIZE / 2,
    width: BUILD_BLOCK_SIZE,
    height: BUILD_BLOCK_SIZE,
    hp: BUILD_BLOCK_HP,
    variant: 'buildBlock',
  };
}

function canPlaceBarricade(barricade: Barricade, existing: Barricade[], mapId: MapId): boolean {
  const bounds = getArenaBounds(mapId);
  const insideArena = (
    barricade.x > 2
    && barricade.x + barricade.width < bounds.width - 2
    && barricade.y > 2
    && barricade.y + barricade.height < bounds.height - 2
  );

  return insideArena && !rectOverlapsBlockers(barricade, mapId, existing);
}
