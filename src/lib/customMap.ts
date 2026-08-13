import type { AllyCheckpoint, AllyUnit, Barricade, CodeBlock, ConveyorBlock, DecorationBlock, LaserBlock, MagnetBlock, MovingBlock, Obstacle, PortalBlock, PowerUp, PowerUpKind, RicochetBlock, TntBlock, TrapBlock, VehicleBlock } from './arenaTypes';
import { cellToObstacle, createAlly, createAllyCheckpoint, createCodeBlock, createConveyor, createDecoration, createLaser, createMagnet, createMover, createPortal, createRicochet, createTnt, createTrap, createVehicle, loadObjectCells } from './customMapObjects';
import {
  loadActiveCustomMapSlotId,
  loadCustomMapData,
  loadCustomMapSlots,
  saveCustomMapData,
  setActiveCustomMapSlot,
} from './customMapStorage';
import { boardHp, type CustomMapSize, type CustomMapSlot, type CustomMapTheme, type CustomWeaponSettings, type EditorCell } from './customMapTypes';
export {
  boardHp,
  blockToolGroups,
  blockTools,
  defaultCustomWeapons,
  defaultMapSize,
  maxMapCells,
  minMapCells,
  type CustomBlockKind,
  type CustomMapSize,
  type CustomMapSlot,
  type CustomMapTheme,
  type CustomWeaponSettings,
  type CustomWeaponStats,
  type EditableWeaponId,
  type EditorCell,
} from './customMapTypes';

export function loadCustomCells(): EditorCell[] {
  return loadCustomMapData().cells;
}

export function loadCustomSize(): CustomMapSize {
  return loadCustomMapData().size;
}

export function loadCustomTheme(): CustomMapTheme {
  return loadCustomMapData().theme;
}

export function loadCustomWeapons(): CustomWeaponSettings {
  return loadCustomMapData().weapons;
}

export function saveCustomMap(cells: EditorCell[], size: CustomMapSize, theme?: CustomMapTheme, weapons?: CustomWeaponSettings) {
  saveCustomMapData(cells, size, theme, weapons);
}

export function loadCustomSlots(): CustomMapSlot[] {
  return loadCustomMapSlots();
}

export function loadActiveCustomSlotId(): string {
  return loadActiveCustomMapSlotId();
}

export function setActiveCustomSlot(id: string) {
  setActiveCustomMapSlot(id);
}

export function saveCustomCells(cells: EditorCell[]) {
  saveCustomMap(cells, loadCustomSize());
}

export function loadCustomMap(): Obstacle[] {
  const size = loadCustomSize();
  return loadCustomCells().filter(isWallCell).map((cell) => cellToObstacle(cell, size));
}

export function loadCustomBoards(): Barricade[] {
  const size = loadCustomSize();
  return loadCustomCells().filter(isDestructibleBuildCell).map((cell, index) => ({
    ...cellToObstacle(cell, size),
    id: index + 1,
    hp: getBuildCellHp(cell.kind),
    variant: getBuildCellVariant(cell.kind),
  }));
}

export function loadCustomTerrain(kind: 'grass' | 'water' | 'ice'): Obstacle[] {
  const size = loadCustomSize();
  return loadCustomCells().filter((cell) => cell.kind === kind).map((cell) => cellToObstacle(cell, size));
}

export function loadCustomFlags(): Obstacle[] {
  const size = loadCustomSize();
  const cells = loadCustomCells();
  const generic = cells.filter((cell) => cell.kind === 'flag').map((cell) => cellToObstacle(cell, size));
  const blue = cells.find((cell) => cell.kind === 'blueFlag');
  const red = cells.find((cell) => cell.kind === 'redFlag');
  return [
    blue ? cellToObstacle(blue, size) : generic[0],
    red ? cellToObstacle(red, size) : generic[1],
  ].filter((flag): flag is Obstacle => Boolean(flag));
}

export function loadCustomHillZones(): Obstacle[] {
  const size = loadCustomSize();
  return loadCustomCells().filter((cell) => cell.kind === 'hillZone').map((cell) => cellToObstacle(cell, size));
}

export function loadCustomZombieSpawns(): Obstacle[] {
  const size = loadCustomSize();
  return loadCustomCells().filter((cell) => cell.kind === 'zombieSpawn').map((cell) => cellToObstacle(cell, size));
}

export function loadCustomPowerUps(): PowerUp[] {
  const size = loadCustomSize();
  return loadCustomCells()
    .filter(isPowerSpawnCell)
    .map((cell, index) => {
      const obstacle = cellToObstacle(cell, size);
      return {
        id: index + 1,
        kind: getPowerUpKind(cell.kind),
        x: obstacle.x + obstacle.width / 2,
        y: obstacle.y + obstacle.height / 2,
      };
    });
}

export function loadCustomSwapRifts(): Obstacle[] {
  const size = loadCustomSize();
  return loadCustomCells().filter((cell) => cell.kind === 'swapRift').map((cell) => cellToObstacle(cell, size));
}

export function loadCustomRicochets(): RicochetBlock[] {
  const size = loadCustomSize();
  return loadObjectCells(loadCustomCells(), size, (cell) => cell.kind === 'ricochet', createRicochet);
}

export function loadCustomPortals(): PortalBlock[] {
  const size = loadCustomSize();
  return loadObjectCells(loadCustomCells(), size, isPortalCell, createPortal);
}

export function loadCustomTraps(): TrapBlock[] {
  const size = loadCustomSize();
  return loadObjectCells(loadCustomCells(), size, isTrapCell, createTrap);
}

export function loadCustomMovers(): MovingBlock[] {
  const size = loadCustomSize();
  return loadObjectCells(loadCustomCells(), size, isMoverCell, createMover);
}

export function loadCustomConveyors(): ConveyorBlock[] {
  const size = loadCustomSize();
  return loadObjectCells(loadCustomCells(), size, isConveyorCell, createConveyor);
}

export function loadCustomVehicles(): VehicleBlock[] {
  const size = loadCustomSize();
  return loadObjectCells(loadCustomCells(), size, isVehicleCell, createVehicle);
}

export function loadCustomDecorations(): DecorationBlock[] {
  const size = loadCustomSize();
  return loadObjectCells(loadCustomCells(), size, isDecorationCell, createDecoration);
}

export function loadCustomSolidDecorations(): Obstacle[] {
  return loadCustomDecorations().filter((item) => item.kind !== 'rug');
}

export function loadCustomLasers(): LaserBlock[] {
  const size = loadCustomSize();
  return loadObjectCells(loadCustomCells(), size, (cell) => cell.kind === 'laser', createLaser);
}

export function loadCustomCodeBlocks(): CodeBlock[] {
  const size = loadCustomSize();
  return loadObjectCells(loadCustomCells(), size, (cell) => cell.kind === 'codeBlock', createCodeBlock);
}

export function loadCustomMagnets(): MagnetBlock[] {
  const size = loadCustomSize();
  return loadObjectCells(loadCustomCells(), size, isMagnetCell, createMagnet);
}

export function loadCustomTnts(): TntBlock[] {
  const size = loadCustomSize();
  return loadObjectCells(loadCustomCells(), size, isTntCell, createTnt);
}

export function loadCustomAllyCheckpoints(): AllyCheckpoint[] {
  const size = loadCustomSize();
  return loadObjectCells(loadCustomCells(), size, isAllyCheckpointCell, createAllyCheckpoint);
}

export function loadCustomAllies(): AllyUnit[] {
  const size = loadCustomSize();
  const checkpoints = loadCustomAllyCheckpoints();
  return loadObjectCells(loadCustomCells(), size, isAllyCell, createAlly)
    .map((ally) => ({ ...ally, checkpointId: findNearestCheckpoint(ally, checkpoints) }));
}

export function isHiddenInGrass(x: number, y: number): boolean {
  return loadCustomTerrain('grass').some((grass) => (
    x >= grass.x && x <= grass.x + grass.width && y >= grass.y && y <= grass.y + grass.height
  ));
}

export function isSpawnCell(cell: Pick<EditorCell, 'col' | 'row'>, size: CustomMapSize = loadCustomSize()): boolean {
  const spawnCols = Math.max(2, Math.floor(size.cols * 0.2));
  const centerRow = Math.floor(size.rows / 2);
  return (cell.col < spawnCols || cell.col >= size.cols - spawnCols) && Math.abs(cell.row - centerRow) <= 2;
}

function isMoverCell(cell: EditorCell): boolean {
  return cell.kind === 'mover' || cell.kind === 'moverUp' || cell.kind === 'carousel';
}

function isWallCell(cell: EditorCell): boolean {
  return cell.kind === 'wall' || cell.kind === 'stoneWall' || cell.kind === 'metalWall' || cell.kind === 'sandWall';
}

function isDestructibleBuildCell(cell: EditorCell): boolean {
  return cell.kind === 'board' || cell.kind === 'glassWall' || cell.kind === 'luckyBlock';
}

function getBuildCellHp(kind: EditorCell['kind']): number {
  if (kind === 'glassWall') return 1;
  if (kind === 'luckyBlock') return 55;
  return boardHp;
}

function getBuildCellVariant(kind: EditorCell['kind']): Barricade['variant'] {
  if (kind === 'glassWall') return 'glass';
  if (kind === 'luckyBlock') return 'lucky';
  return 'board';
}

function isConveyorCell(cell: EditorCell): boolean {
  return cell.kind === 'conveyorX' || cell.kind === 'conveyorY';
}

function isMagnetCell(cell: EditorCell): boolean {
  return cell.kind === 'magnetPull' || cell.kind === 'magnetPush';
}

function isVehicleCell(cell: EditorCell): boolean {
  return cell.kind === 'vehicleBuggy' || cell.kind === 'vehicleTank' || cell.kind === 'vehicleHover';
}

function isDecorationCell(cell: EditorCell): boolean {
  return cell.kind === 'decorCrate'
    || cell.kind === 'decorBarrel'
    || cell.kind === 'decorLamp'
    || cell.kind === 'decorRocks'
    || cell.kind === 'decorTable'
    || cell.kind === 'decorSofa'
    || cell.kind === 'decorShelf'
    || cell.kind === 'decorConsole'
    || cell.kind === 'decorBed'
    || cell.kind === 'decorPlant'
    || cell.kind === 'decorRug';
}

function isTntCell(cell: EditorCell): boolean {
  return cell.kind === 'tntBlue' || cell.kind === 'tntRed' || cell.kind === 'tntGray';
}

function isPortalCell(cell: EditorCell): boolean {
  return cell.kind === 'portalBlue' || cell.kind === 'portalOrange';
}

function isTrapCell(cell: EditorCell): boolean {
  return cell.kind === 'spikes'
    || cell.kind === 'lava'
    || cell.kind === 'acid'
    || cell.kind === 'zap'
    || cell.kind === 'poison'
    || cell.kind === 'sawTrap'
    || cell.kind === 'mineTrap'
    || cell.kind === 'bearTrap'
    || cell.kind === 'webTrap';
}

function isAllyCell(cell: EditorCell): boolean {
  return cell.kind === 'blueAlly' || cell.kind === 'redAlly';
}

function isAllyCheckpointCell(cell: EditorCell): boolean {
  return cell.kind === 'blueCheckpoint' || cell.kind === 'redCheckpoint';
}

function isPowerSpawnCell(cell: EditorCell): boolean {
  return cell.kind === 'healSpawn' || cell.kind === 'speedSpawn' || cell.kind === 'repairSpawn';
}

function getPowerUpKind(kind: EditorCell['kind']): PowerUpKind {
  if (kind === 'speedSpawn') return 'speed';
  if (kind === 'repairSpawn') return 'repair';
  return 'heal';
}

function findNearestCheckpoint(ally: AllyUnit, checkpoints: AllyCheckpoint[]): number | null {
  const ownCheckpoints = checkpoints.filter((checkpoint) => checkpoint.owner === ally.owner);
  const nearest = ownCheckpoints.sort((a, b) => centerDistance(ally, a) - centerDistance(ally, b))[0];
  return nearest?.id ?? null;
}

function centerDistance(ally: AllyUnit, checkpoint: AllyCheckpoint): number {
  return Math.hypot(ally.x - (checkpoint.x + checkpoint.width / 2), ally.y - (checkpoint.y + checkpoint.height / 2));
}
