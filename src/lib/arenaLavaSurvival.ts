import { ARENA_HEIGHT, ARENA_WIDTH, type Barricade, type GameState, type Player, type PlayerId } from './arenaTypes';

const gateHeight = 14;
const wallWidth = 3.4;
const lavaDelay = 4;
const lavaSpeed = 2.55;
const exitX = ARENA_WIDTH - 6;

export function isLavaSurvivalMode(mode: GameState['mode']): boolean {
  return mode === 'lavaSurvival';
}

export function createLavaMaze(seed = Math.random()): Barricade[] {
  const random = createRandom(seed);
  const walls: Barricade[] = [];
  const wallXs = [18, 30, 42, 54, 66, 78, 88];
  let previousGate = 28 + random() * 12;

  wallXs.forEach((x, index) => {
    const gateY = clamp(previousGate + (random() - 0.5) * 24, 10, ARENA_HEIGHT - gateHeight - 10);
    previousGate = gateY;
    addVerticalWall(walls, 7000 + index * 8, x, gateY);

    if (index < wallXs.length - 1) {
      addMazeChunks(walls, 7100 + index * 8, x + 5, wallXs[index + 1] - 7, gateY, random);
    }
  });

  return walls;
}

export function createLavaSurvivalPlayers(players: Record<PlayerId, Player>): Record<PlayerId, Player> {
  return {
    blue: { ...players.blue, x: 8, y: 20, facingX: 1, facingY: 0 },
    red: { ...players.red, x: 8, y: 44, facingX: 1, facingY: 0 },
  };
}

export function tickLavaSurvival(state: GameState, players: Record<PlayerId, Player>, delta: number): Record<PlayerId, Player> {
  if (!isLavaSurvivalMode(state.mode)) return players;

  const front = getLavaFront(state.elapsedTime);
  return {
    blue: tickRunner(players.blue, front, delta),
    red: tickRunner(players.red, front, delta),
  };
}

export function getLavaFront(elapsedTime: number): number {
  return Math.min(ARENA_WIDTH + 8, -7 + Math.max(0, elapsedTime - lavaDelay) * lavaSpeed);
}

export function getLavaExitX(): number {
  return exitX;
}

function tickRunner(player: Player, lavaFront: number, delta: number): Player {
  if (player.score >= 1 || player.hp <= 0) return player;

  const escaped = player.x >= exitX;
  const burning = player.x < lavaFront;
  return {
    ...player,
    score: escaped ? 1 : player.score,
    hp: burning ? Math.max(0, player.hp - 86 * delta) : player.hp,
    burnTimer: burning ? Math.max(player.burnTimer, 1.2) : player.burnTimer,
    speedBoost: escaped ? Math.max(player.speedBoost, 1.5) : player.speedBoost,
  };
}

function addVerticalWall(walls: Barricade[], id: number, x: number, gateY: number) {
  walls.push(createMazeWall(id, x, 4, wallWidth, Math.max(0, gateY - 4)));
  walls.push(createMazeWall(id + 1, x, gateY + gateHeight, wallWidth, Math.max(0, ARENA_HEIGHT - gateY - gateHeight - 4)));
}

function addMazeChunks(walls: Barricade[], id: number, minX: number, maxX: number, gateY: number, random: () => number) {
  const yA = gateY > ARENA_HEIGHT / 2 ? 10 + random() * 12 : ARENA_HEIGHT - 22 - random() * 12;
  const yB = clamp(gateY + (random() > 0.5 ? 13 : -13), 8, ARENA_HEIGHT - 10);
  walls.push(createMazeWall(id, minX, yA, Math.max(5, maxX - minX), 3.2));
  walls.push(createMazeWall(id + 1, minX + random() * Math.max(1, maxX - minX - 4), yB, 3.2, 7 + random() * 8));
}

function createMazeWall(id: number, x: number, y: number, width: number, height: number): Barricade {
  return { id, x, y, width, height, hp: 999, variant: 'board' };
}

function createRandom(seed: number): () => number {
  let value = Math.floor(seed * 1000000) || 9173;
  return () => {
    value = (value * 48271) % 2147483647;
    return value / 2147483647;
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
