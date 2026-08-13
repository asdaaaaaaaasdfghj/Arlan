import { ARENA_HEIGHT, type MapId, type Obstacle } from './arenaTypes';

export type SpawnPoint = {
  x: number;
  y: number;
};

export const mapNames: Record<MapId, string> = {
  crossfire: 'Crossfire',
  lanes: 'Lanes',
  bunker: 'Bunker',
  open: 'Open Field',
  custom: 'Custom Map',
};

export const mapOrder: MapId[] = ['crossfire', 'lanes', 'bunker', 'open', 'custom'];

export const arenaMaps: Record<MapId, Obstacle[]> = {
  crossfire: [
    { id: 'north-left', x: 28, y: 12, width: 16, height: 6 },
    { id: 'north-right', x: 56, y: 12, width: 16, height: 6 },
    { id: 'center', x: 44, y: 29, width: 12, height: 8 },
    { id: 'south-left', x: 28, y: 46, width: 16, height: 6 },
    { id: 'south-right', x: 56, y: 46, width: 16, height: 6 },
  ],
  lanes: [
    { id: 'lane-top', x: 18, y: 18, width: 28, height: 5 },
    { id: 'lane-mid', x: 54, y: 30, width: 28, height: 5 },
    { id: 'lane-bottom', x: 18, y: 42, width: 28, height: 5 },
  ],
  bunker: [
    { id: 'left-bunker', x: 20, y: 24, width: 14, height: 16 },
    { id: 'right-bunker', x: 66, y: 24, width: 14, height: 16 },
    { id: 'gate-top', x: 43, y: 14, width: 14, height: 5 },
    { id: 'gate-bottom', x: 43, y: 45, width: 14, height: 5 },
  ],
  open: [
    { id: 'small-top', x: 47, y: 16, width: 6, height: 6 },
    { id: 'small-bottom', x: 47, y: 42, width: 6, height: 6 },
  ],
  custom: [],
};

export const mapSpawns: Record<MapId, Record<'blue' | 'red', SpawnPoint>> = {
  crossfire: {
    blue: { x: 18, y: ARENA_HEIGHT / 2 },
    red: { x: 82, y: ARENA_HEIGHT / 2 },
  },
  lanes: {
    blue: { x: 12, y: ARENA_HEIGHT / 2 },
    red: { x: 90, y: ARENA_HEIGHT / 2 },
  },
  bunker: {
    blue: { x: 12, y: ARENA_HEIGHT / 2 },
    red: { x: 88, y: ARENA_HEIGHT / 2 },
  },
  open: {
    blue: { x: 18, y: ARENA_HEIGHT / 2 },
    red: { x: 82, y: ARENA_HEIGHT / 2 },
  },
  custom: {
    blue: { x: 12, y: ARENA_HEIGHT / 2 },
    red: { x: 88, y: ARENA_HEIGHT / 2 },
  },
};
