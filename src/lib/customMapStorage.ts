import type { Obstacle } from './arenaTypes';
import { defaultCustomCells } from './customMapDefaults';
import {
  defaultMapSize,
  defaultCustomWeapons,
  editorCellHeight,
  editorCellWidth,
  editorCols,
  editorRows,
  maxMapCells,
  minMapCells,
  type CustomMapSize,
  type CustomMapSlot,
  type CustomMapTheme,
  type CustomWeaponSettings,
  type CustomWeaponStats,
  type EditableWeaponId,
  type EditorCell,
  type SavedCustomMap,
  defaultMapTheme,
} from './customMapTypes';

const legacyCustomMapKey = 'duel-arena-custom-map';
const customMapSlotsKey = 'duel-arena-custom-map-slots';
const activeCustomMapSlotKey = 'duel-arena-active-custom-map-slot';
const customMapSlotCount = 8;
let cachedSlots: CustomMapSlot[] | null = null;
let cachedActiveSlotId: string | null = null;

export function loadCustomMapData(): { cells: EditorCell[]; size: CustomMapSize; theme: CustomMapTheme; weapons: CustomWeaponSettings } {
  const activeSlot = loadCustomMapSlots().find((slot) => slot.id === loadActiveCustomMapSlotId());
  return activeSlot
    ? { cells: activeSlot.cells, size: activeSlot.size, theme: activeSlot.theme, weapons: activeSlot.weapons }
    : { cells: defaultCustomCells(), size: defaultMapSize, theme: defaultMapTheme, weapons: defaultCustomWeapons };
}

export function saveCustomMapData(cells: EditorCell[], size: CustomMapSize, theme = loadCustomMapData().theme, weapons = loadCustomMapData().weapons) {
  saveCustomMapSlot(loadActiveCustomMapSlotId(), cells, size, theme, weapons);
}

export function loadCustomMapSlots(): CustomMapSlot[] {
  if (typeof window === 'undefined') {
    return createDefaultSlots();
  }

  if (cachedSlots) {
    return cachedSlots;
  }

  const saved = window.localStorage.getItem(customMapSlotsKey);
  if (!saved) {
    const slots = createDefaultSlots(loadLegacyMap());
    window.localStorage.setItem(customMapSlotsKey, JSON.stringify(slots));
    cachedSlots = slots;
    return slots;
  }

  try {
    const parsed = JSON.parse(saved) as Array<Partial<CustomMapSlot>>;
    cachedSlots = createDefaultSlots().map((fallback) => normalizeSlot(parsed.find((slot) => slot.id === fallback.id), fallback));
    return cachedSlots;
  } catch {
    cachedSlots = createDefaultSlots(loadLegacyMap());
    return cachedSlots;
  }
}

export function saveCustomMapSlot(id: string, cells: EditorCell[], size: CustomMapSize, theme: CustomMapTheme, weapons: CustomWeaponSettings) {
  const slots = loadCustomMapSlots().map((slot) => (
    slot.id === id
      ? { ...slot, cells: normalizeCells(cells, clampSize(size)), size: clampSize(size), theme, weapons: normalizeWeapons(weapons), updatedAt: new Date().toISOString() }
      : slot
  ));

  window.localStorage.setItem(customMapSlotsKey, JSON.stringify(slots));
  cachedSlots = slots;
  setActiveCustomMapSlot(id);
}

export function saveCustomMapSlots(slots: CustomMapSlot[], activeSlotId = loadActiveCustomMapSlotId()) {
  const normalized = createDefaultSlots().map((fallback) => normalizeSlot(slots.find((slot) => slot.id === fallback.id), fallback));
  window.localStorage.setItem(customMapSlotsKey, JSON.stringify(normalized));
  cachedSlots = normalized;
  setActiveCustomMapSlot(activeSlotId);
}

export function loadActiveCustomMapSlotId(): string {
  if (typeof window === 'undefined') {
    return 'slot-1';
  }

  if (cachedActiveSlotId) {
    return cachedActiveSlotId;
  }

  cachedActiveSlotId = window.localStorage.getItem(activeCustomMapSlotKey) ?? 'slot-1';
  return cachedActiveSlotId;
}

export function setActiveCustomMapSlot(id: string) {
  window.localStorage.setItem(activeCustomMapSlotKey, id);
  cachedActiveSlotId = id;
}

function createDefaultSlots(firstSlotMap?: { cells: EditorCell[]; size: CustomMapSize; theme: CustomMapTheme; weapons: CustomWeaponSettings }): CustomMapSlot[] {
  return Array.from({ length: customMapSlotCount }, (_, index) => {
    const first = index === 0;
    return {
      id: `slot-${index + 1}`,
      name: `Slot ${index + 1}`,
      cells: first ? firstSlotMap?.cells ?? defaultCustomCells() : [],
      size: first ? firstSlotMap?.size ?? defaultMapSize : defaultMapSize,
      theme: first ? firstSlotMap?.theme ?? defaultMapTheme : defaultMapTheme,
      weapons: first ? firstSlotMap?.weapons ?? defaultCustomWeapons : defaultCustomWeapons,
    };
  });
}

function normalizeSlot(slot: Partial<CustomMapSlot> | undefined, fallback: CustomMapSlot): CustomMapSlot {
  const size = clampSize(slot?.size ?? fallback.size);
  return {
    id: fallback.id,
    name: typeof slot?.name === 'string' && slot.name.trim() ? slot.name : fallback.name,
    cells: normalizeCells(slot?.cells ?? fallback.cells, size),
    size,
    theme: isMapTheme(slot?.theme) ? slot.theme : fallback.theme,
    weapons: normalizeWeapons(slot?.weapons),
    updatedAt: typeof slot?.updatedAt === 'string' ? slot.updatedAt : fallback.updatedAt,
  };
}

function loadLegacyMap(): { cells: EditorCell[]; size: CustomMapSize; theme: CustomMapTheme; weapons: CustomWeaponSettings } {
  const fallback = { cells: defaultCustomCells(), size: defaultMapSize, theme: defaultMapTheme, weapons: defaultCustomWeapons };
  if (typeof window === 'undefined') {
    return fallback;
  }

  const saved = window.localStorage.getItem(legacyCustomMapKey);
  if (!saved) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(saved) as SavedCustomMap | Array<Partial<EditorCell> & Partial<Obstacle>>;
    const values = Array.isArray(parsed) ? parsed : parsed.cells ?? [];
    const size = Array.isArray(parsed) ? defaultMapSize : clampSize(parsed.size ?? defaultMapSize);
    const theme = Array.isArray(parsed) || !isMapTheme(parsed.theme) ? defaultMapTheme : parsed.theme;
    const weapons = Array.isArray(parsed) ? defaultCustomWeapons : normalizeWeapons(parsed.weapons);
    return { cells: normalizeCells(values, size), size, theme, weapons };
  } catch {
    return fallback;
  }
}

function normalizeWeapons(value: unknown): CustomWeaponSettings {
  const source = value as Partial<Record<EditableWeaponId, Partial<CustomWeaponStats>>> | undefined;
  return {
    blaster: normalizeWeaponStats(source?.blaster, defaultCustomWeapons.blaster),
    railgun: normalizeWeaponStats(source?.railgun, defaultCustomWeapons.railgun),
    shotgun: normalizeWeaponStats(source?.shotgun, defaultCustomWeapons.shotgun),
    custom4: normalizeWeaponStats(source?.custom4, defaultCustomWeapons.custom4),
    custom5: normalizeWeaponStats(source?.custom5, defaultCustomWeapons.custom5),
  };
}

function normalizeWeaponStats(value: Partial<CustomWeaponStats> | undefined, fallback: CustomWeaponStats): CustomWeaponStats {
  return {
    name: normalizeWeaponName(value?.name, fallback.name),
    cooldown: clampNumber(value?.cooldown, 0, 3, fallback.cooldown),
    damage: clampNumber(value?.damage, 1, 120, fallback.damage),
    speed: clampNumber(value?.speed, 20, 180, fallback.speed),
    bullets: Math.round(clampNumber(value?.bullets, 1, 12, fallback.bullets)),
    spread: clampNumber(value?.spread, 0, 1.2, fallback.spread),
    size: clampNumber(value?.size, 4, 24, fallback.size),
  };
}

function normalizeWeaponName(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, 18) : fallback;
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  return Number.isFinite(value) ? Math.min(max, Math.max(min, Number(value))) : fallback;
}

function isMapTheme(value: unknown): value is CustomMapTheme {
  return value === 'arena' || value === 'desert' || value === 'mountain' || value === 'snow' || value === 'acidLab' || value === 'volcanic' || value === 'night';
}

function normalizeCells(values: Array<Partial<EditorCell> & Partial<Obstacle>>, size: CustomMapSize): EditorCell[] {
  return values.map(toCell).filter((cell): cell is EditorCell => Boolean(cell)).filter((cell) => isInsideSize(cell, size));
}

function toCell(value: Partial<EditorCell> & Partial<Obstacle>): EditorCell | null {
  if (Number.isFinite(value.col) && Number.isFinite(value.row)) {
    return {
      col: value.col ?? 0,
      row: value.row ?? 0,
      kind: value.kind ?? 'wall',
      magnetForce: finiteOrUndefined(value.magnetForce),
      magnetRadius: finiteOrUndefined(value.magnetRadius),
      magnetBullets: value.magnetBullets,
      magnetGrenades: value.magnetGrenades,
      laserSides: finiteOrUndefined(value.laserSides),
      laserColor: normalizeLaserColor(value.laserColor),
      laserPerSide: finiteOrUndefined(value.laserPerSide),
      codeAction: normalizeCodeAction(value.codeAction),
      codeTeam: normalizeCodeTeam(value.codeTeam),
      codePower: finiteOrUndefined(value.codePower),
      decorColor: normalizeDecorationColor(value.decorColor),
      pistonLength: finiteOrUndefined(value.pistonLength),
      pistonSpeed: finiteOrUndefined(value.pistonSpeed),
      pistonDirection: normalizePistonDirection(value.pistonDirection),
      pistonActive: value.pistonActive,
    };
  }

  if (Number.isFinite(value.x) && Number.isFinite(value.y)) {
    return {
      col: Math.round((value.x ?? 0) / editorCellWidth),
      row: Math.round((value.y ?? 0) / editorCellHeight),
      kind: 'wall',
    };
  }

  return null;
}

function clampSize(size: Partial<CustomMapSize>): CustomMapSize {
  return {
    cols: clamp(Math.round(size.cols ?? editorCols), minMapCells, maxMapCells),
    rows: clamp(Math.round(size.rows ?? editorRows), minMapCells, maxMapCells),
  };
}

function isInsideSize(cell: EditorCell, size: CustomMapSize): boolean {
  return cell.col >= 0 && cell.col < size.cols && cell.row >= 0 && cell.row < size.rows;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function finiteOrUndefined(value: unknown): number | undefined {
  return Number.isFinite(value) ? Number(value) : undefined;
}

function normalizeLaserColor(value: unknown): EditorCell['laserColor'] {
  return value === 'blue' || value === 'green' || value === 'purple' || value === 'red' ? value : undefined;
}

function normalizeCodeAction(value: unknown): EditorCell['codeAction'] {
  return value === 'damage'
    || value === 'heal'
    || value === 'speed'
    || value === 'shock'
    || value === 'build'
    || value === 'spawnZombie'
    || value === 'particles'
    ? value
    : undefined;
}

function normalizeCodeTeam(value: unknown): EditorCell['codeTeam'] {
  return value === 'blue' || value === 'red' || value === 'all' ? value : undefined;
}

function normalizeDecorationColor(value: unknown): EditorCell['decorColor'] {
  return value === 'green'
    || value === 'red'
    || value === 'blue'
    || value === 'yellow'
    || value === 'purple'
    || value === 'gray'
    ? value
    : undefined;
}

function normalizePistonDirection(value: unknown): EditorCell['pistonDirection'] {
  return value === 'left' || value === 'up' || value === 'down' || value === 'right' ? value : undefined;
}
