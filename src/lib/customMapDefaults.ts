import type { EditorCell } from './customMapTypes';

export function defaultCustomCells(): EditorCell[] {
  return [
    { col: 6, row: 3, kind: 'wall' },
    { col: 13, row: 5, kind: 'board' },
    { col: 9, row: 7, kind: 'grass' },
    { col: 10, row: 7, kind: 'grass' },
    { col: 8, row: 2, kind: 'water' },
    { col: 2, row: 5, kind: 'flag' },
    { col: 17, row: 5, kind: 'flag' },
    { col: 9, row: 4, kind: 'mover' },
    { col: 11, row: 4, kind: 'moverUp' },
    { col: 8, row: 8, kind: 'tntBlue' },
    { col: 12, row: 8, kind: 'tntRed' },
    { col: 10, row: 8, kind: 'tntGray' },
    { col: 10, row: 3, kind: 'ricochet' },
    { col: 7, row: 6, kind: 'spikes' },
    { col: 12, row: 6, kind: 'lava' },
    { col: 9, row: 9, kind: 'poison' },
    { col: 5, row: 9, kind: 'portalBlue' },
    { col: 15, row: 2, kind: 'portalOrange' },
  ];
}
