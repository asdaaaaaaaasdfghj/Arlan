import type { CodeAction, CodeTeam, DecorationColor, LaserColor, Obstacle, WeaponId } from './arenaTypes';

export const editorCols = 20;
export const editorRows = 12;
export const editorCellWidth = 5;
export const editorCellHeight = 64 / editorRows;
export const minMapCells = 10;
export const maxMapCells = 100;
export const defaultMapSize = { cols: editorCols, rows: editorRows };
export const boardHp = 80;
export const defaultMapTheme: CustomMapTheme = 'arena';

export type CustomMapTheme = 'arena' | 'desert' | 'mountain' | 'snow' | 'acidLab' | 'volcanic' | 'night';
export type EditableWeaponId = Exclude<WeaponId, 'termos' | 'flamethrower'>;
export type CustomWeaponStats = {
  name: string;
  cooldown: number;
  damage: number;
  speed: number;
  bullets: number;
  spread: number;
  size: number;
};
export type CustomWeaponSettings = Record<EditableWeaponId, CustomWeaponStats>;

export const defaultCustomWeapons: CustomWeaponSettings = {
  blaster: { name: 'Blaster', cooldown: 0.42, damage: 16, speed: 74, bullets: 1, spread: 0, size: 10 },
  railgun: { name: 'Railgun', cooldown: 1.1, damage: 42, speed: 108, bullets: 1, spread: 0, size: 8 },
  shotgun: { name: 'Shotgun', cooldown: 0.85, damage: 13, speed: 60, bullets: 3, spread: 0.28, size: 11 },
  custom4: { name: 'Custom 4', cooldown: 0.55, damage: 20, speed: 76, bullets: 1, spread: 0, size: 10 },
  custom5: { name: 'Custom 5', cooldown: 0.95, damage: 12, speed: 62, bullets: 5, spread: 0.22, size: 9 },
};

export type CustomBlockKind = 'wall' | 'stoneWall' | 'metalWall' | 'glassWall' | 'sandWall' | 'board' | 'luckyBlock' | 'grass' | 'water' | 'ice' | 'flag' | 'blueFlag' | 'redFlag' | 'hillZone' | 'zombieSpawn' | 'healSpawn' | 'speedSpawn' | 'repairSpawn' | 'mover' | 'moverUp' | 'carousel' | 'piston' | 'stickyPiston' | 'swapRift' | 'laser' | 'codeBlock'
  | 'tntBlue' | 'tntRed' | 'tntGray' | 'ricochet' | 'portalBlue' | 'portalOrange'
  | 'spikes' | 'lava' | 'acid' | 'zap' | 'poison'
  | 'blueAlly' | 'redAlly' | 'blueCheckpoint' | 'redCheckpoint' | 'conveyorX' | 'conveyorY'
  | 'magnetPull' | 'magnetPush' | 'vehicleBuggy' | 'vehicleTank' | 'vehicleHover'
  | 'decorCrate' | 'decorBarrel' | 'decorLamp' | 'decorRocks' | 'decorTable' | 'decorSofa' | 'decorShelf' | 'decorConsole' | 'decorBed' | 'decorPlant' | 'decorRug'
  | 'sawTrap' | 'mineTrap' | 'bearTrap' | 'webTrap';

export type EditorCell = {
  col: number;
  row: number;
  kind: CustomBlockKind;
  magnetForce?: number;
  magnetRadius?: number;
  magnetBullets?: boolean;
  magnetGrenades?: boolean;
  laserSides?: number;
  laserColor?: LaserColor;
  laserPerSide?: number;
  codeAction?: CodeAction;
  codeTeam?: CodeTeam;
  codePower?: number;
  decorColor?: DecorationColor;
  pistonLength?: number;
  pistonSpeed?: number;
  pistonDirection?: 'right' | 'left' | 'up' | 'down';
  pistonActive?: boolean;
};

export type CustomMapSize = {
  cols: number;
  rows: number;
};

export type SavedCustomMap = {
  size?: Partial<CustomMapSize>;
  cells?: Array<Partial<EditorCell> & Partial<Obstacle>>;
  theme?: CustomMapTheme;
  weapons?: Partial<Record<EditableWeaponId, Partial<CustomWeaponStats>>>;
};

export type CustomMapSlot = {
  id: string;
  name: string;
  cells: EditorCell[];
  size: CustomMapSize;
  theme: CustomMapTheme;
  weapons: CustomWeaponSettings;
  updatedAt?: string;
};

export type BlockToolCategory = 'building' | 'mechanisms' | 'traps' | 'modes' | 'transport' | 'decorations';
export type BlockTool = { kind: CustomBlockKind; label: string; category: BlockToolCategory };

export const blockTools: BlockTool[] = [
  { kind: 'wall', label: 'Wall', category: 'building' },
  { kind: 'stoneWall', label: 'Stone wall', category: 'building' },
  { kind: 'metalWall', label: 'Metal wall', category: 'building' },
  { kind: 'glassWall', label: 'Glass wall', category: 'building' },
  { kind: 'sandWall', label: 'Sand wall', category: 'building' },
  { kind: 'board', label: 'Board', category: 'building' },
  { kind: 'luckyBlock', label: 'Lucky block', category: 'building' },
  { kind: 'grass', label: 'Grass', category: 'building' },
  { kind: 'water', label: 'Water', category: 'building' },
  { kind: 'ice', label: 'Ice', category: 'building' },
  { kind: 'mover', label: 'Mover', category: 'mechanisms' },
  { kind: 'moverUp', label: 'Mover up', category: 'mechanisms' },
  { kind: 'carousel', label: 'Carousel', category: 'mechanisms' },
  { kind: 'piston', label: 'Piston', category: 'mechanisms' },
  { kind: 'stickyPiston', label: 'Sticky piston', category: 'mechanisms' },
  { kind: 'swapRift', label: 'Swap rift', category: 'mechanisms' },
  { kind: 'laser', label: 'Laser', category: 'mechanisms' },
  { kind: 'codeBlock', label: 'Code block', category: 'mechanisms' },
  { kind: 'conveyorX', label: 'Conveyor left/right', category: 'mechanisms' },
  { kind: 'conveyorY', label: 'Conveyor up/down', category: 'mechanisms' },
  { kind: 'magnetPull', label: 'Pull magnet', category: 'mechanisms' },
  { kind: 'magnetPush', label: 'Push magnet', category: 'mechanisms' },
  { kind: 'ricochet', label: 'Ricochet', category: 'mechanisms' },
  { kind: 'portalBlue', label: 'Blue portal', category: 'mechanisms' },
  { kind: 'portalOrange', label: 'Orange portal', category: 'mechanisms' },
  { kind: 'vehicleBuggy', label: 'Buggy', category: 'transport' },
  { kind: 'vehicleTank', label: 'Tank', category: 'transport' },
  { kind: 'vehicleHover', label: 'Hover', category: 'transport' },
  { kind: 'decorCrate', label: 'Crate', category: 'decorations' },
  { kind: 'decorBarrel', label: 'Barrel', category: 'decorations' },
  { kind: 'decorLamp', label: 'Lamp', category: 'decorations' },
  { kind: 'decorRocks', label: 'Rocks', category: 'decorations' },
  { kind: 'decorTable', label: 'Table', category: 'decorations' },
  { kind: 'decorSofa', label: 'Sofa', category: 'decorations' },
  { kind: 'decorShelf', label: 'Shelf', category: 'decorations' },
  { kind: 'decorBed', label: 'Bed', category: 'decorations' },
  { kind: 'decorPlant', label: 'Plant', category: 'decorations' },
  { kind: 'decorRug', label: 'Rug', category: 'decorations' },
  { kind: 'tntBlue', label: 'Blue TNT', category: 'traps' },
  { kind: 'tntRed', label: 'Red TNT', category: 'traps' },
  { kind: 'tntGray', label: 'Chain TNT', category: 'traps' },
  { kind: 'spikes', label: 'Spikes', category: 'traps' },
  { kind: 'lava', label: 'Lava', category: 'traps' },
  { kind: 'acid', label: 'Acid', category: 'traps' },
  { kind: 'zap', label: 'Zap', category: 'traps' },
  { kind: 'poison', label: 'Poison', category: 'traps' },
  { kind: 'sawTrap', label: 'Saw', category: 'traps' },
  { kind: 'mineTrap', label: 'Mine', category: 'traps' },
  { kind: 'bearTrap', label: 'Bear trap', category: 'traps' },
  { kind: 'webTrap', label: 'Web trap', category: 'traps' },
  { kind: 'flag', label: 'Flag', category: 'modes' },
  { kind: 'blueFlag', label: 'Blue flag', category: 'modes' },
  { kind: 'redFlag', label: 'Red flag', category: 'modes' },
  { kind: 'hillZone', label: 'Hill zone', category: 'modes' },
  { kind: 'zombieSpawn', label: 'Zombie spawn', category: 'modes' },
  { kind: 'healSpawn', label: 'Heal spawn', category: 'modes' },
  { kind: 'speedSpawn', label: 'Speed spawn', category: 'modes' },
  { kind: 'repairSpawn', label: 'Repair spawn', category: 'modes' },
  { kind: 'blueAlly', label: 'Blue ally', category: 'modes' },
  { kind: 'redAlly', label: 'Red ally', category: 'modes' },
  { kind: 'blueCheckpoint', label: 'Blue checkpoint', category: 'modes' },
  { kind: 'redCheckpoint', label: 'Red checkpoint', category: 'modes' },
];

export const blockToolGroups: Array<{ category: BlockToolCategory; labelKey: BlockToolCategory; tools: BlockTool[] }> = [
  { category: 'building', labelKey: 'building', tools: blockTools.filter((tool) => tool.category === 'building') },
  { category: 'mechanisms', labelKey: 'mechanisms', tools: blockTools.filter((tool) => tool.category === 'mechanisms') },
  { category: 'transport', labelKey: 'transport', tools: blockTools.filter((tool) => tool.category === 'transport') },
  { category: 'decorations', labelKey: 'decorations', tools: blockTools.filter((tool) => tool.category === 'decorations') },
  { category: 'traps', labelKey: 'traps', tools: blockTools.filter((tool) => tool.category === 'traps') },
  { category: 'modes', labelKey: 'modes', tools: blockTools.filter((tool) => tool.category === 'modes') },
];
