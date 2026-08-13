import { ARENA_HEIGHT, ARENA_WIDTH, type MapId } from './arenaTypes';
import { loadCustomSize } from './customMap';
import { editorCellHeight, editorCellWidth } from './customMapTypes';

export type ArenaBounds = {
  width: number;
  height: number;
};

export function getArenaBounds(mapId: MapId): ArenaBounds {
  if (mapId !== 'custom') {
    return { width: ARENA_WIDTH, height: ARENA_HEIGHT };
  }

  const size = loadCustomSize();
  return {
    width: Math.max(ARENA_WIDTH, size.cols * editorCellWidth),
    height: Math.max(ARENA_HEIGHT, size.rows * editorCellHeight),
  };
}
