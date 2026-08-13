import {
  ARENA_HEIGHT,
  ARENA_WIDTH,
  type Barricade,
  type CodeBlock,
  type ConveyorBlock,
  type DecorationBlock,
  type LaserBlock,
  type MagnetBlock,
  type MovingBlock,
  type Obstacle,
  type PortalBlock,
  type RicochetBlock,
  type TntBlock,
  type TrapBlock,
  type VehicleBlock,
} from '../lib/arenaShooter';
import type { CSSProperties } from 'react';
import { getLaserBeamRects, type LaserBlocker } from '../lib/arenaLasers';
import { boardHp } from '../lib/customMap';

type Rect = Pick<Obstacle, 'x' | 'y' | 'width' | 'height'>;

export function MapBoardSprite({ board }: { board: Barricade }) {
  const maxHp = board.variant === 'glass' ? 1 : board.variant === 'lucky' ? 55 : boardHp;

  return (
    <div className={`map-board map-board-${board.variant ?? 'board'}`} style={rectStyle(board)}>
      <i style={{ width: `${Math.max(0, (board.hp / maxHp) * 100)}%` }} />
    </div>
  );
}

export function TerrainSprite({ terrain, kind }: { terrain: Obstacle; kind: 'grass' | 'water' | 'ice' }) {
  return <span className={`terrain terrain-${kind}`} style={rectStyle(terrain)} />;
}

export function ConveyorSprite({ conveyor }: { conveyor: ConveyorBlock }) {
  const axisClass = conveyor.axis === 'y' ? 'conveyor-vertical' : 'conveyor-horizontal';
  return <span className={`conveyor-block ${axisClass}`} style={rectStyle(conveyor)} />;
}

export function LaserSprite({ laser, blockers = [] }: { laser: LaserBlock; blockers?: LaserBlocker[] }) {
  return (
    <>
      <span className={`laser-emitter laser-color-${laser.color}`} style={rectStyle(laser)} />
      {getLaserBeamRects(laser, blockers).map((beam, index) => (
        <span className={`laser-beam laser-color-${laser.color}`} style={rectStyle(beam)} key={`${laser.id}-${index}`} />
      ))}
    </>
  );
}

export function CodeBlockSprite({ block }: { block: CodeBlock }) {
  return <span className={`code-block code-block-${block.action}`} style={rectStyle(block)} />;
}

export function VehicleSprite({ vehicle }: { vehicle: VehicleBlock }) {
  return <span className={`vehicle-block vehicle-block-${vehicle.kind}`} style={rectStyle(vehicle)} />;
}

export function DecorationSprite({ decoration }: { decoration: DecorationBlock }) {
  return <span className={`decoration-block decoration-block-${decoration.kind}`} style={decorStyle(decoration)} />;
}

export function MagnetSprite({ magnet }: { magnet: MagnetBlock }) {
  return <span className={`magnet-block magnet-block-${magnet.kind}`} style={rectStyle(magnet)} />;
}

export function SwapRiftSprite({ rift }: { rift: Obstacle }) {
  return <span className="swap-rift-block" style={rectStyle(rift)} />;
}

export function MovingBlockSprite({ block }: { block: MovingBlock }) {
  const axisClass = block.axis === 'orbit'
    ? 'moving-block-carousel'
    : block.axis === 'piston'
      ? `${block.sticky ? 'moving-block-sticky-piston' : 'moving-block-piston'} piston-dir-${block.direction ?? 'right'} ${block.active === false ? 'moving-block-piston-off' : ''}`
      : block.axis === 'y' ? 'moving-block-vertical' : 'moving-block-horizontal';
  return <span className={`moving-block ${axisClass}`} style={rectStyle(block)} />;
}

export function TntSprite({ tnt }: { tnt: TntBlock }) {
  if (!tnt.active) {
    return null;
  }

  const fuseClass = tnt.fuseOwner ? 'tnt-block-lit' : '';
  return <span className={`tnt-block tnt-block-${tnt.kind} ${fuseClass}`} style={rectStyle(tnt)}>TNT</span>;
}

export function RicochetSprite({ block }: { block: RicochetBlock }) {
  return <span className="ricochet-block" style={rectStyle(block)} />;
}

export function PortalSprite({ portal }: { portal: PortalBlock }) {
  return <span className={`portal-block portal-block-${portal.kind}`} style={rectStyle(portal)} />;
}

export function TrapSprite({ trap }: { trap: TrapBlock }) {
  return <span className={`trap-block trap-block-${trap.kind}`} style={rectStyle(trap)} />;
}

function rectStyle(rect: Rect) {
  return {
    left: `${(rect.x / ARENA_WIDTH) * 100}%`,
    top: `${(rect.y / ARENA_HEIGHT) * 100}%`,
    width: `${(rect.width / ARENA_WIDTH) * 100}%`,
    height: `${(rect.height / ARENA_HEIGHT) * 100}%`,
  };
}

function decorStyle(decoration: DecorationBlock): CSSProperties {
  return {
    ...rectStyle(decoration),
    '--decor-color': getDecorationColor(decoration.color),
  } as CSSProperties;
}

function getDecorationColor(color: DecorationBlock['color']): string {
  if (color === 'red') return '#ef476f';
  if (color === 'blue') return '#3a86ff';
  if (color === 'yellow') return '#ffd43b';
  if (color === 'purple') return '#845ef7';
  if (color === 'gray') return '#868e96';
  return '#2f9e44';
}
