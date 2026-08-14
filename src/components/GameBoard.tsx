import type { CSSProperties } from 'react';
import { ARENA_HEIGHT, ARENA_WIDTH, type GameState } from '../lib/arenaShooter';
import { getArenaBounds, type ArenaBounds } from '../lib/arenaBounds';
import { getHillZone } from '../lib/arenaKingHill';
import { getMapObstacles } from '../lib/arenaMap';
import { getMiniGameIndex, getMiniGameRule, isMiniGamesMode, miniGameDuration } from '../lib/arenaMiniGames';
import { poisonSeconds } from '../lib/arenaTraps';
import { loadCustomCodeBlocks, loadCustomConveyors, loadCustomDecorations, loadCustomMagnets, loadCustomSolidDecorations, loadCustomSwapRifts, loadCustomTerrain, loadCustomTheme, loadCustomVehicles } from '../lib/customMap';
import type { Language } from '../lib/gameSettings';
import { modeDescription, modeName, t } from '../lib/i18n';
import type { PlayerProfile } from '../lib/playerProfile';
import { DisasterSprite } from './DisasterSprite';
import { FlagSprite } from './FlagSprite';
import { CodeBlockSprite, ConveyorSprite, DecorationSprite, LaserSprite, MagnetSprite, MapBoardSprite, MovingBlockSprite, PortalSprite, RicochetSprite, SwapRiftSprite, TerrainSprite, TntSprite, TrapSprite, VehicleSprite } from './MapBlockSprites';
import {
  BarricadeSprite,
  AllyCheckpointSprite,
  AllySprite,
  BulletSprite,
  GrenadeSprite,
  HitEffectSprite,
  PlayerSprite,
  PowerUpSprite,
  ZombieSprite,
} from './GameSprites';

type GameBoardProps = {
  game: GameState;
  language: Language;
  cameraMode?: 'follow' | 'overview';
  playerProfiles?: Partial<Record<keyof GameState['players'], PlayerProfile>>;
  playerEmotes?: Partial<Record<keyof GameState['players'], string>>;
  showPlayerNames?: boolean;
  useProfileColors?: boolean;
};

export function GameBoard({ game, language, cameraMode = 'follow', playerProfiles, playerEmotes, showPlayerNames = true, useProfileColors = true }: GameBoardProps) {
  const bounds = getArenaBounds(game.mapId);
  const cameras = cameraMode === 'overview'
    ? [createCamera('overview', bounds.width / 2, bounds.height / 2, getOverviewZoom(bounds), null, null)]
    : getCameras(game, bounds);

  return (
    <div className={`arena-camera-layout ${cameras.length > 1 ? 'arena-camera-split' : ''}`}>
      {cameras.map((camera) => (
        <ArenaPane
          camera={camera}
          game={game}
          language={language}
          bounds={bounds}
          playerProfiles={playerProfiles}
          playerEmotes={playerEmotes}
          showPlayerNames={showPlayerNames}
          useProfileColors={useProfileColors}
          key={camera.id}
        />
      ))}
    </div>
  );
}

function ArenaPane({ game, language, bounds, camera, playerProfiles, playerEmotes, showPlayerNames, useProfileColors }: {
  game: GameState;
  language: Language;
  bounds: ArenaBounds;
  camera: CameraView;
  playerProfiles?: GameBoardProps['playerProfiles'];
  playerEmotes?: GameBoardProps['playerEmotes'];
  showPlayerNames: boolean;
  useProfileColors: boolean;
}) {
  const water = game.mapId === 'custom' ? loadCustomTerrain('water') : [];
  const ice = game.mapId === 'custom' ? loadCustomTerrain('ice') : [];
  const grass = game.mapId === 'custom' ? loadCustomTerrain('grass') : [];
  const conveyors = game.mapId === 'custom' ? loadCustomConveyors() : [];
  const magnets = game.mapId === 'custom' ? loadCustomMagnets() : [];
  const swapRifts = game.mapId === 'custom' ? loadCustomSwapRifts() : [];
  const codeBlocks = game.mapId === 'custom' ? game.codeBlocks ?? loadCustomCodeBlocks() : [];
  const vehicles = game.mapId === 'custom' ? game.vehicles ?? loadCustomVehicles() : [];
  const decorations = game.mapId === 'custom' ? loadCustomDecorations() : [];
  const solidDecorations = game.mapId === 'custom' ? loadCustomSolidDecorations() : [];
  const theme = game.mapId === 'custom' ? loadCustomTheme() : 'arena';
  const poisonedPlayer = getPoisonedPlayerForCamera(camera, game);
  const mapObstacles = getMapObstacles(game.mapId);
  const laserBlockers = [
    ...mapObstacles,
    ...game.mapBoards,
    ...game.movingBlocks,
    ...game.tnts.filter((tnt) => tnt.active),
    ...game.ricochetBlocks,
    ...game.allyCheckpoints,
    ...game.barricades,
    ...solidDecorations,
  ];

  return (
    <section className={`arena arena-theme-${theme} arena-mode-${game.mode} ${isMiniGamesMode(game) && getMiniGameRule(game).sword ? 'arena-mode-swordDuel' : ''}`} aria-label="Battle arena" style={cameraVars(camera, bounds)}>
      <div className="arena-world">
        <div className="arena-grid" />
        {(game.paintTiles ?? []).map((tile) => <PaintTileSprite tile={tile} key={tile.id} />)}
        {(game.floorHoles ?? []).map((hole) => <FloorHoleSprite hole={hole} key={hole.id} />)}
        {game.mode === 'kingHill' && <HillZoneSprite mapId={game.mapId} />}
        {water.map((terrain) => <TerrainSprite terrain={terrain} kind="water" key={terrain.id} />)}
        {ice.map((terrain) => <TerrainSprite terrain={terrain} kind="ice" key={terrain.id} />)}
        {conveyors.map((conveyor) => <ConveyorSprite conveyor={conveyor} key={conveyor.id} />)}
        {magnets.map((magnet) => <MagnetSprite magnet={magnet} key={magnet.id} />)}
        {swapRifts.map((rift) => <SwapRiftSprite rift={rift} key={rift.id} />)}
        {codeBlocks.map((block) => <CodeBlockSprite block={block} key={block.id} />)}
        {vehicles.map((vehicle) => <VehicleSprite vehicle={vehicle} key={vehicle.id} />)}
        {decorations.map((decoration) => <DecorationSprite decoration={decoration} key={decoration.id} />)}
        {mapObstacles.map((obstacle) => (
          <div className={`map-wall ${getWallClass(obstacle.id)}`} key={obstacle.id} style={rectStyle(obstacle)} />
        ))}
        {game.mapBoards.map((board) => <MapBoardSprite board={board} key={board.id} />)}
        {game.movingBlocks.map((block) => <MovingBlockSprite block={block} key={block.id} />)}
        {(game.lasers ?? []).map((laser) => <LaserSprite laser={laser} blockers={laserBlockers} key={laser.id} />)}
        {game.ricochetBlocks.map((block) => <RicochetSprite block={block} key={block.id} />)}
        {game.portals.map((portal) => <PortalSprite portal={portal} key={portal.id} />)}
        {game.traps.map((trap) => <TrapSprite trap={trap} key={trap.id} />)}
        {game.tnts.map((tnt) => <TntSprite tnt={tnt} key={tnt.id} />)}
        {game.allyCheckpoints.map((checkpoint) => <AllyCheckpointSprite checkpoint={checkpoint} key={checkpoint.id} />)}
        {game.mode === 'captureFlag' && Object.values(game.flags).map((flag) => <FlagSprite flag={flag} key={flag.owner} />)}
        <PlayerSprite player={game.players.blue} profile={playerProfiles?.blue} showName={showPlayerNames} useProfileColor={useProfileColors} />
        <PlayerSprite player={game.players.red} profile={playerProfiles?.red} showName={showPlayerNames} useProfileColor={useProfileColors} />
        {playerEmotes?.blue && <PlayerEmoteLabel player={game.players.blue} label={playerEmotes.blue} />}
        {playerEmotes?.red && <PlayerEmoteLabel player={game.players.red} label={playerEmotes.red} />}
        {game.allies.map((ally) => <AllySprite ally={ally} key={ally.id} />)}
        {grass.map((terrain) => <TerrainSprite terrain={terrain} kind="grass" key={terrain.id} />)}
        {game.zombies.map((zombie) => <ZombieSprite zombie={zombie} key={zombie.id} />)}
        {game.barricades.map((item) => <BarricadeSprite barricade={item} key={item.id} />)}
        {game.powerUps.map((powerUp) => <PowerUpSprite powerUp={powerUp} key={powerUp.id} />)}
        {game.disasters.map((disaster) => <DisasterSprite disaster={disaster} key={disaster.id} />)}
        {game.bullets.map((bullet) => <BulletSprite bullet={bullet} key={bullet.id} />)}
        {game.grenades.map((grenade) => <GrenadeSprite grenade={grenade} key={grenade.id} />)}
        {game.hitEffects.map((effect) => <HitEffectSprite effect={effect} key={effect.id} />)}
      </div>
      {camera.arrow && <span className="camera-arrow" style={{ '--arrow-angle': `${camera.arrow.angle}rad` } as CSSProperties}>➤</span>}
      {poisonedPlayer && (
        <PoisonFog timer={poisonedPlayer.poisonTimer} x={poisonedPlayer.x} y={poisonedPlayer.y} />
      )}
      {isMiniGamesMode(game) && <MiniGameBanner game={game} />}
      {game.status !== 'playing' && <GameOverlay game={game} language={language} />}
    </section>
  );
}

function MiniGameBanner({ game }: { game: GameState }) {
  const phaseAge = game.elapsedTime % miniGameDuration;
  if (game.status !== 'playing' || phaseAge > 3.2) return null;

  const rule = getMiniGameRule(game);
  return (
    <div className="mini-game-banner">
      <span>{getMiniGameIndex(game.elapsedTime) + 1}/10</span>
      <strong>{rule.name}</strong>
      <small>{rule.description}</small>
    </div>
  );
}

function getPoisonedPlayerForCamera(camera: CameraView, game: GameState): GameState['players']['blue'] | null {
  if (camera.id === 'red') {
    return game.players.red.poisonTimer > 0 ? game.players.red : null;
  }

  if (camera.id === 'blue') {
    return game.players.blue.poisonTimer > 0 ? game.players.blue : null;
  }

  if (game.players.blue.poisonTimer > 0) return game.players.blue;
  if (game.players.red.poisonTimer > 0) return game.players.red;
  return null;
}

function PaintTileSprite({ tile }: { tile: GameState['paintTiles'][number] }) {
  return <span className={`paint-tile paint-tile-${tile.owner}`} style={rectStyle(tile)} />;
}

function FloorHoleSprite({ hole }: { hole: GameState['floorHoles'][number] }) {
  return <span className={`floor-hole floor-hole-${hole.owner ?? 'neutral'}`} style={rectStyle(hole)} />;
}

function PlayerEmoteLabel({ player, label }: { player: GameState['players']['blue']; label: string }) {
  return (
    <span
      className="online-emote-bubble"
      style={{
        left: xPercent(player.x),
        top: yPercent(player.y - 8),
      }}
    >
      {label}
    </span>
  );
}

type CameraView = {
  id: string;
  focusX: number;
  focusY: number;
  zoom: number;
  arrow: { angle: number } | null;
};

function getCameras(game: GameState, bounds: ArenaBounds): CameraView[] {
  const blue = game.players.blue;
  const red = game.players.red;
  const distance = Math.hypot(blue.x - red.x, blue.y - red.y);
  const zoom = game.mapId === 'custom' && (bounds.width > ARENA_WIDTH || bounds.height > ARENA_HEIGHT) ? 1.85 : 1.18;

  if (game.status === 'playing' && distance > 52 && game.mapId === 'custom') {
    return [
      createCamera('blue', blue.x, blue.y, zoom, blue, red),
      createCamera('red', red.x, red.y, zoom, red, blue),
    ];
  }

  return [createCamera('main', (blue.x + red.x) / 2, (blue.y + red.y) / 2, zoom, blue, red)];
}

function createCamera(
  id: string,
  focusX: number,
  focusY: number,
  zoom: number,
  self: { x: number; y: number } | null,
  target: { x: number; y: number } | null,
): CameraView {
  return {
    id,
    focusX,
    focusY,
    zoom,
    arrow: self && target && isTargetOutside(focusX, focusY, target, zoom)
      ? { angle: Math.atan2(target.y - self.y, target.x - self.x) }
      : null,
  };
}

function isTargetOutside(focusX: number, focusY: number, target: { x: number; y: number }, zoom: number): boolean {
  return Math.abs(target.x - focusX) > ARENA_WIDTH / zoom / 2 || Math.abs(target.y - focusY) > ARENA_HEIGHT / zoom / 2;
}

function getOverviewZoom(bounds: ArenaBounds): number {
  return Math.min(1, ARENA_WIDTH / bounds.width, ARENA_HEIGHT / bounds.height);
}

function cameraVars(camera: CameraView, bounds: ArenaBounds): CSSProperties {
  const viewWidth = ARENA_WIDTH / camera.zoom;
  const viewHeight = ARENA_HEIGHT / camera.zoom;
  const maxX = Math.max(viewWidth / 2, bounds.width - viewWidth / 2);
  const maxY = Math.max(viewHeight / 2, bounds.height - viewHeight / 2);
  const focusX = clamp(camera.focusX, viewWidth / 2, maxX);
  const focusY = clamp(camera.focusY, viewHeight / 2, maxY);

  return {
    '--camera-shift-x': `${50 - (focusX / ARENA_WIDTH) * 100 * camera.zoom}%`,
    '--camera-shift-y': `${50 - (focusY / ARENA_HEIGHT) * 100 * camera.zoom}%`,
    '--camera-zoom': camera.zoom,
    '--arena-world-width': bounds.width,
    '--arena-world-height': bounds.height,
  } as CSSProperties;
}

function rectStyle(rect: { x: number; y: number; width: number; height: number }) {
  return {
    left: `${(rect.x / ARENA_WIDTH) * 100}%`,
    top: `${(rect.y / ARENA_HEIGHT) * 100}%`,
    width: `${(rect.width / ARENA_WIDTH) * 100}%`,
    height: `${(rect.height / ARENA_HEIGHT) * 100}%`,
  };
}

function xPercent(value: number): string {
  return `${(value / ARENA_WIDTH) * 100}%`;
}

function yPercent(value: number): string {
  return `${(value / ARENA_HEIGHT) * 100}%`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getWallClass(id: string): string {
  if (id.includes('stoneWall')) return 'map-wall-stone';
  if (id.includes('metalWall')) return 'map-wall-metal';
  if (id.includes('glassWall')) return 'map-wall-glass';
  if (id.includes('sandWall')) return 'map-wall-sand';
  return '';
}

function PoisonFog({ timer, x, y }: { timer: number; x: number; y: number }) {
  const opacity = Math.min(1, timer / (poisonSeconds * 0.34));
  return (
    <span
      className="poison-fog"
      style={{
        '--fog-x': `${(x / ARENA_WIDTH) * 100}%`,
        '--fog-y': `${(y / ARENA_HEIGHT) * 100}%`,
        '--fog-opacity': opacity,
      } as CSSProperties}
    />
  );
}

function HillZoneSprite({ mapId }: { mapId: GameState['mapId'] }) {
  const zone = getHillZone(mapId);
  const size = zone.radius * 2;
  return (
    <span
      className="hill-zone"
      style={{
        left: `${((zone.x - zone.radius) / ARENA_WIDTH) * 100}%`,
        top: `${((zone.y - zone.radius) / ARENA_HEIGHT) * 100}%`,
        width: `${(size / ARENA_WIDTH) * 100}%`,
        height: `${(size / ARENA_HEIGHT) * 100}%`,
      }}
    />
  );
}

function GameOverlay({ game, language }: { game: GameState; language: Language }) {
  const title = game.status === 'ready' ? modeName(game.mode, language) : getResultText(game.winner, language);

  return (
    <div className="game-overlay">
      <h2>{title}</h2>
      <p>{modeDescription(game.mode, language)}</p>
    </div>
  );
}

function getResultText(winner: GameState['winner'], language: Language) {
  if (winner === 'draw') {
    return t(language, 'drawRound');
  }

  if (winner === 'survivors') {
    return t(language, 'survivorsWin');
  }

  if (winner === 'zombies') {
    return t(language, 'zombiesWin');
  }

  if (winner === 'catastrophes') {
    return t(language, 'catastrophesWin');
  }

  return winner === 'blue' ? t(language, 'blueWins') : t(language, 'redWins');
}
