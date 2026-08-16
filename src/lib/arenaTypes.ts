export type PlayerId = 'blue' | 'red';
export type GameStatus = 'ready' | 'playing' | 'finished';
export type GameMode = 'duel' | 'zombies' | 'quickDraw' | 'blitz' | 'tankDuel' | 'railDuel'
  | 'grenadeMayhem' | 'flameDuel' | 'paintBattle' | 'miniGames' | 'spleef' | 'tileRun' | 'hideSeek' | 'hungerGames' | 'swapRift' | 'craftSurvival' | 'timeDuel' | 'swordDuel' | 'swarmNight' | 'nightmare' | 'fortress' | 'endlessDuel' | 'disasters' | 'captureFlag' | 'kingHill' | 'glassWars' | 'luckyBlocks';
export type WeaponId = 'blaster' | 'railgun' | 'shotgun' | 'flamethrower' | 'custom4' | 'custom5' | 'termos';
export type MapId = 'crossfire' | 'lanes' | 'bunker' | 'open' | 'custom';

export type Player = {
  id: PlayerId;
  x: number;
  y: number;
  hp: number;
  score: number;
  facingX: number;
  facingY: number;
  slideX: number;
  slideY: number;
  cooldown: number;
  buildCooldown: number;
  grenadeCooldown: number;
  speedBoost: number;
  weapon: WeaponId;
  shotsFired: number;
  selfGrenadeDeaths: number;
  deathCount: number;
  lastDeathX: number;
  lastDeathY: number;
  poisonTimer: number;
  burnTimer: number;
  shockTimer: number;
  acidTimer: number;
  snareTimer: number;
  portalCooldown: number;
  vehicleKind: VehicleKind | null;
};

export type Bullet = {
  id: number;
  owner: PlayerId;
  weapon: WeaponId;
  x: number;
  y: number;
  dx: number;
  dy: number;
  damage: number;
  size: number;
  bounces: number;
  portalCooldown: number;
};

export type Obstacle = { id: string; x: number; y: number; width: number; height: number };

export type Zombie = { id: number; x: number; y: number; hp: number };

export type Barricade = { id: number; x: number; y: number; width: number; height: number; hp: number; variant?: 'board' | 'glass' | 'buildBlock' | 'lucky' };

export type AllyUnit = {
  id: number;
  owner: PlayerId;
  x: number;
  y: number;
  hp: number;
  cooldown: number;
  respawnTimer: number;
  checkpointId: number | null;
  facingX: number;
  facingY: number;
};

export type AllyCheckpoint = Barricade & { owner: PlayerId; role?: 'ally' | 'core' };

export type MovingBlock = {
  id: number;
  originX: number; originY: number; x: number; y: number; width: number; height: number;
  lastX: number; lastY: number;
  baseWidth?: number; baseHeight?: number;
  axis: 'x' | 'y' | 'orbit' | 'piston';
  direction?: 'right' | 'left' | 'up' | 'down';
  range: number; speed: number; phase: number;
  active?: boolean;
  sticky?: boolean;
};

export type TntBlock = {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  kind: 'blue' | 'red' | 'gray';
  active: boolean;
  respawnTimer: number;
  fuseTimer: number;
  fuseOwner: PlayerId | null;
};

export type RicochetBlock = Obstacle;
export type PortalBlock = Obstacle & { kind: 'blue' | 'orange' };
export type ConveyorBlock = Obstacle & { axis: 'x' | 'y' };
export type LaserColor = 'red' | 'blue' | 'green' | 'purple';
export type LaserBlock = Obstacle & {
  damage: number;
  color: LaserColor;
  sides: number;
  perSide: number;
};
export type CodeAction = 'damage' | 'heal' | 'speed' | 'shock' | 'build' | 'spawnZombie' | 'particles';
export type CodeTeam = 'all' | PlayerId;
export type CodeBlock = Obstacle & {
  action: CodeAction;
  team: CodeTeam;
  power: number;
  cooldownTimer: number;
};
export type MagnetBlock = Obstacle & {
  kind: 'pull' | 'push';
  force: number;
  radius: number;
  affectBullets: boolean;
  affectGrenades: boolean;
};
export type VehicleKind = 'buggy' | 'tank' | 'hover';
export type VehicleBlock = Obstacle & { kind: VehicleKind };
export type DecorationKind = 'crate' | 'barrel' | 'lamp' | 'rocks' | 'table' | 'sofa' | 'shelf' | 'console' | 'bed' | 'plant' | 'rug';
export type DecorationColor = 'green' | 'red' | 'blue' | 'yellow' | 'purple' | 'gray';
export type DecorationBlock = Obstacle & { kind: DecorationKind; color: DecorationColor };
export type TrapKind = 'spikes' | 'lava' | 'acid' | 'zap' | 'poison' | 'saw' | 'mine' | 'bear' | 'web';
export type TrapBlock = Obstacle & { kind: TrapKind };
export type PaintTile = Obstacle & { owner: PlayerId };
export type FloorHole = Obstacle & { owner: PlayerId | null; age: number };

export type TimeEcho = {
  id: number;
  owner: PlayerId;
  x: number;
  y: number;
  facingX: number;
  facingY: number;
  age: number;
  phase: 'past' | 'future';
};

export type HitEffect = {
  id: number;
  x: number;
  y: number;
  kind: 'player' | 'zombie' | 'explosion';
  age: number;
};

export type PowerUpKind = 'heal' | 'speed' | 'repair' | 'superHeal' | 'overdrive' | 'termos' | 'weaponBlaster' | 'weaponRailgun' | 'weaponShotgun' | 'weaponFlame' | 'damage' | 'shock' | 'poison' | 'burn';

export type PowerUp = { id: number; kind: PowerUpKind; x: number; y: number };

export type Grenade = {
  id: number;
  owner: PlayerId;
  x: number;
  y: number;
  dx: number;
  dy: number;
  timer: number;
};

export type DisasterKind = 'fire' | 'storm' | 'quake' | 'flood';
export type NaturalDisaster = {
  id: number; kind: DisasterKind; x: number; y: number; width: number; height: number;
  age: number; activeAt: number; damage: number;
};
export type FlagState = {
  owner: PlayerId;
  baseX: number;
  baseY: number;
  x: number;
  y: number;
  carrier: PlayerId | null;
};
export type PlayerInput = {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  shoot: boolean;
  build: boolean;
  grenade: boolean;
  enterVehicle: boolean;
};
export type GameState = {
  mode: GameMode;
  mapId: MapId;
  status: GameStatus;
  players: Record<PlayerId, Player>;
  allies: AllyUnit[];
  allyCheckpoints: AllyCheckpoint[];
  zombies: Zombie[];
  barricades: Barricade[];
  mapBoards: Barricade[];
  movingBlocks: MovingBlock[];
  lasers: LaserBlock[];
  codeBlocks: CodeBlock[];
  vehicles: VehicleBlock[];
  tnts: TntBlock[];
  ricochetBlocks: RicochetBlock[];
  portals: PortalBlock[];
  traps: TrapBlock[];
  paintTiles: PaintTile[];
  floorHoles: FloorHole[];
  timeEchoes: TimeEcho[];
  farArenaActive: boolean;
  bullets: Bullet[];
  grenades: Grenade[];
  powerUps: PowerUp[];
  disasters: NaturalDisaster[];
  flags: Record<PlayerId, FlagState>;
  hitEffects: HitEffect[];
  timeLeft: number;
  elapsedTime: number;
  nextBulletId: number;
  nextGrenadeId: number;
  nextZombieId: number;
  nextBarricadeId: number;
  nextPowerUpId: number;
  nextDisasterId: number;
  nextEffectId: number;
  powerUpTimer: number;
  zombieTimer: number;
  disasterTimer: number;
  winner: PlayerId | 'draw' | 'survivors' | 'zombies' | 'catastrophes' | null;
};
export type GameInput = Record<PlayerId, PlayerInput>;
export const ARENA_WIDTH = 100;
export const ARENA_HEIGHT = 64;
export const PLAYER_SPEED = 34;
export const PLAYER_SIZE = 5.5;
export const ZOMBIE_SIZE = 5.2;
export const BULLET_HIT_SIZE = 4.8;
export const BARRICADE_WIDTH = 10;
export const BARRICADE_HEIGHT = 4;
export const BARRICADE_HP = 260;
export const BUILD_COOLDOWN = 1.4;
export const SPEED_BOOST_SECONDS = 5;
export const emptyInput: GameInput = {
  blue: { up: false, down: false, left: false, right: false, shoot: false, build: false, grenade: false, enterVehicle: false },
  red: { up: false, down: false, left: false, right: false, shoot: false, build: false, grenade: false, enterVehicle: false },
};
