import type { AllyCheckpoint, AllyUnit, CodeAction, CodeBlock, CodeTeam, ConveyorBlock, DecorationBlock, DecorationColor, DecorationKind, LaserBlock, LaserColor, MagnetBlock, MovingBlock, Obstacle, PlayerId, PortalBlock, RicochetBlock, TntBlock, TrapBlock, TrapKind, VehicleBlock, VehicleKind } from './arenaTypes';
import type { CustomMapSize, EditorCell } from './customMapTypes';
import { editorCellHeight, editorCellWidth } from './customMapTypes';

export function loadObjectCells<T>(
  cells: EditorCell[],
  size: CustomMapSize,
  predicate: (cell: EditorCell) => boolean,
  factory: (cell: EditorCell, obstacle: Obstacle, index: number) => T,
): T[] {
  return cells.filter(predicate).map((cell, index) => factory(cell, cellToObstacle(cell, size), index));
}

export function createMover(cell: EditorCell, obstacle: Obstacle, index: number): MovingBlock {
  if (cell.kind === 'carousel') {
    const size = Math.max(obstacle.width, obstacle.height) * 1.9;
    return {
      id: index + 1,
      originX: obstacle.x + obstacle.width / 2 - size / 2,
      originY: obstacle.y + obstacle.height / 2 - size / 2,
      x: obstacle.x,
      y: obstacle.y,
      lastX: obstacle.x,
      lastY: obstacle.y,
      width: size,
      height: size,
      axis: 'orbit',
      range: Math.max(obstacle.width, obstacle.height) * 0.55,
      speed: 1.05,
      phase: index * 1.4,
    };
  }

  if (cell.kind === 'piston' || cell.kind === 'stickyPiston') {
    const direction = normalizePistonDirection(cell.pistonDirection);
    return {
      id: index + 1,
      originX: obstacle.x,
      originY: obstacle.y,
      x: obstacle.x,
      y: obstacle.y,
      lastX: obstacle.x,
      lastY: obstacle.y,
      baseWidth: obstacle.width,
      baseHeight: obstacle.height,
      width: obstacle.width,
      height: obstacle.height,
      axis: 'piston',
      direction,
      range: clamp(cell.pistonLength ?? 8, 1, 80) * (direction === 'up' || direction === 'down' ? editorCellHeight : editorCellWidth),
      speed: clamp(cell.pistonSpeed ?? 3, 1, 10),
      phase: index * 0.7,
      active: cell.pistonActive ?? true,
      sticky: cell.kind === 'stickyPiston',
    };
  }

  return {
    id: index + 1,
    originX: obstacle.x,
    originY: obstacle.y,
    x: obstacle.x,
    y: obstacle.y,
    lastX: obstacle.x,
    lastY: obstacle.y,
    width: obstacle.width,
    height: obstacle.height,
    axis: cell.kind === 'moverUp' ? 'y' : 'x',
    range: cell.kind === 'moverUp' ? 10 : 14,
    speed: cell.kind === 'moverUp' ? 1.25 : 1.1,
    phase: index * 1.7,
  };
}

export function createTnt(cell: EditorCell, obstacle: Obstacle, index: number): TntBlock {
  return { ...obstacle, id: index + 1, kind: getTntKind(cell.kind), active: true, respawnTimer: 0, fuseTimer: 0, fuseOwner: null };
}

export function createPortal(cell: EditorCell, obstacle: Obstacle): PortalBlock {
  return { ...obstacle, kind: cell.kind === 'portalOrange' ? 'orange' : 'blue' };
}

export function createTrap(cell: EditorCell, obstacle: Obstacle): TrapBlock {
  return { ...obstacle, kind: getTrapKind(cell.kind) };
}

export function createRicochet(_cell: EditorCell, obstacle: Obstacle): RicochetBlock {
  return obstacle;
}

export function createConveyor(cell: EditorCell, obstacle: Obstacle): ConveyorBlock {
  return { ...obstacle, axis: cell.kind === 'conveyorY' ? 'y' : 'x' };
}

export function createVehicle(cell: EditorCell, obstacle: Obstacle): VehicleBlock {
  return { ...obstacle, kind: getVehicleKind(cell.kind) };
}

export function createDecoration(cell: EditorCell, obstacle: Obstacle): DecorationBlock {
  const kind = getDecorationKind(cell.kind);
  const color = normalizeDecorationColor(cell.decorColor);
  if (kind === 'table' || kind === 'sofa' || kind === 'bed') {
    return { ...obstacle, kind, color, width: obstacle.width * 2 };
  }

  if (kind === 'shelf') {
    return { ...obstacle, kind, color, height: obstacle.height * 2 };
  }

  if (kind === 'console') {
    return { ...obstacle, kind, color, width: obstacle.width * 2, height: obstacle.height * 1.35 };
  }

  return { ...obstacle, kind, color };
}

export function createLaser(cell: EditorCell, obstacle: Obstacle): LaserBlock {
  return {
    ...obstacle,
    damage: 38,
    color: normalizeLaserColor(cell.laserColor),
    sides: Math.round(clamp(cell.laserSides ?? 1, 1, 4)),
    perSide: Math.round(clamp(cell.laserPerSide ?? 1, 1, 4)),
  };
}

export function createCodeBlock(cell: EditorCell, obstacle: Obstacle): CodeBlock {
  return {
    ...obstacle,
    action: normalizeCodeAction(cell.codeAction),
    team: normalizeCodeTeam(cell.codeTeam),
    power: clamp(cell.codePower ?? 24, 1, 80),
    cooldownTimer: 0,
  };
}

export function createMagnet(cell: EditorCell, obstacle: Obstacle): MagnetBlock {
  return {
    ...obstacle,
    kind: cell.kind === 'magnetPush' ? 'push' : 'pull',
    force: clamp(cell.magnetForce ?? 26, 4, 50),
    radius: clamp(cell.magnetRadius ?? 18, 6, 40),
    affectBullets: cell.magnetBullets ?? false,
    affectGrenades: cell.magnetGrenades ?? true,
  };
}

export function createAllyCheckpoint(cell: EditorCell, obstacle: Obstacle, index: number): AllyCheckpoint {
  return { ...obstacle, id: index + 1, owner: getOwner(cell.kind), hp: 180 };
}

export function createAlly(cell: EditorCell, obstacle: Obstacle, index: number): AllyUnit {
  const owner = getOwner(cell.kind);
  return {
    id: index + 1,
    owner,
    x: obstacle.x + obstacle.width / 2,
    y: obstacle.y + obstacle.height / 2,
    hp: 55,
    cooldown: 0.5 + index * 0.12,
    respawnTimer: 0,
    checkpointId: null,
    facingX: owner === 'blue' ? 1 : -1,
    facingY: 0,
  };
}

export function cellToObstacle(cell: EditorCell, _size: CustomMapSize): Obstacle {
  const cellWidth = editorCellWidth;
  const cellHeight = editorCellHeight;
  return {
    id: `custom-${cell.kind}-${cell.col}-${cell.row}`,
    x: cell.col * cellWidth,
    y: cell.row * cellHeight,
    width: cellWidth,
    height: cellHeight,
  };
}

function getTntKind(kind: EditorCell['kind']): TntBlock['kind'] {
  if (kind === 'tntRed') return 'red';
  if (kind === 'tntGray') return 'gray';
  return 'blue';
}

function getOwner(kind: EditorCell['kind']): PlayerId {
  return kind === 'redAlly' || kind === 'redCheckpoint' ? 'red' : 'blue';
}

function getVehicleKind(kind: EditorCell['kind']): VehicleKind {
  if (kind === 'vehicleTank') return 'tank';
  if (kind === 'vehicleHover') return 'hover';
  return 'buggy';
}

function getTrapKind(kind: EditorCell['kind']): TrapKind {
  if (kind === 'sawTrap') return 'saw';
  if (kind === 'mineTrap') return 'mine';
  if (kind === 'bearTrap') return 'bear';
  if (kind === 'webTrap') return 'web';
  return kind as TrapKind;
}

function getDecorationKind(kind: EditorCell['kind']): DecorationKind {
  if (kind === 'decorBarrel') return 'barrel';
  if (kind === 'decorLamp') return 'lamp';
  if (kind === 'decorRocks') return 'rocks';
  if (kind === 'decorTable') return 'table';
  if (kind === 'decorSofa') return 'sofa';
  if (kind === 'decorShelf') return 'shelf';
  if (kind === 'decorConsole') return 'console';
  if (kind === 'decorBed') return 'bed';
  if (kind === 'decorPlant') return 'plant';
  if (kind === 'decorRug') return 'rug';
  return 'crate';
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeLaserColor(value: unknown): LaserColor {
  return value === 'blue' || value === 'green' || value === 'purple' ? value : 'red';
}

function normalizeCodeAction(value: unknown): CodeAction {
  return value === 'heal'
    || value === 'speed'
    || value === 'shock'
    || value === 'build'
    || value === 'spawnZombie'
    || value === 'particles'
    ? value
    : 'damage';
}

function normalizeCodeTeam(value: unknown): CodeTeam {
  return value === 'blue' || value === 'red' ? value : 'all';
}

function normalizeDecorationColor(value: unknown): DecorationColor {
  return value === 'red' || value === 'blue' || value === 'yellow' || value === 'purple' || value === 'gray' ? value : 'green';
}

function normalizePistonDirection(value: unknown): NonNullable<MovingBlock['direction']> {
  return value === 'left' || value === 'up' || value === 'down' ? value : 'right';
}
