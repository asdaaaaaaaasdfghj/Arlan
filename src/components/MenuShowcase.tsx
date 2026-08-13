import { useEffect, useRef, useState } from 'react';
import { createDuelBotInput, type DuelBotStyle } from '../lib/arenaDuelBot';
import { mapNames } from '../lib/arenaMap';
import { createInitialGame, emptyInput, startGame, tickGame, type GameInput } from '../lib/arenaShooter';
import { mapName, modeName } from '../lib/i18n';
import type { GameMode, MapId, PlayerId, PlayerInput, Zombie } from '../lib/arenaTypes';
import type { Language } from '../lib/gameSettings';
import { GameBoard } from './GameBoard';

type MenuShowcaseProps = {
  language: Language;
};

export function MenuShowcase({ language }: MenuShowcaseProps) {
  const stylesRef = useRef(createStyles());
  const previewIndexRef = useRef(0);
  const [game, setGame] = useState(() => createPreviewGame(previewIndexRef.current));

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setGame((current) => {
        if (current.status === 'finished' || current.elapsedTime > 12) {
          previewIndexRef.current = (previewIndexRef.current + 1) % previews.length;
          stylesRef.current = createStyles();
          return createPreviewGame(previewIndexRef.current);
        }

        return tickGame(current, createBotInput(current, stylesRef.current), 1 / 30);
      });
    }, 1000 / 30);

    return () => window.clearInterval(timerId);
  }, []);

  return (
    <div className="menu-showcase" aria-label="Live bot fight preview">
      <div className="showcase-badge">
        <strong>{modeName(game.mode, language)}</strong>
        <span>{mapName(game.mapId, mapNames[game.mapId], language)}</span>
      </div>
      <GameBoard game={game} language={language} cameraMode="overview" />
    </div>
  );
}

const previews: Array<{ mode: GameMode; map: MapId }> = [
  { mode: 'duel', map: 'crossfire' },
  { mode: 'zombies', map: 'open' },
  { mode: 'captureFlag', map: 'bunker' },
  { mode: 'grenadeMayhem', map: 'lanes' },
  { mode: 'kingHill', map: 'open' },
  { mode: 'captureFlag', map: 'bunker' },
  { mode: 'glassWars', map: 'crossfire' },
  { mode: 'railDuel', map: 'lanes' },
];

function createPreviewGame(index: number) {
  const preview = previews[index] ?? previews[0];
  return startGame(createInitialGame(preview.mode, preview.map));
}

function createStyles(): Record<'blue' | 'red', DuelBotStyle> {
  return {
    blue: { seed: Math.random() * 100 },
    red: { seed: Math.random() * 100 },
  };
}

function createBotInput(
  game: Parameters<typeof createDuelBotInput>[0],
  styles: Record<'blue' | 'red', DuelBotStyle>,
): GameInput {
  if (game.mode === 'zombies') {
    return {
      ...emptyInput,
      blue: createZombiePreviewInput(game, 'blue', styles.blue.seed),
      red: createZombiePreviewInput(game, 'red', styles.red.seed),
    };
  }

  return {
    ...emptyInput,
    blue: addModeFlavor(createDuelBotInput(game, 'blue', 'normal', styles.blue), game.mode, game.elapsedTime, styles.blue.seed),
    red: addModeFlavor(createDuelBotInput(game, 'red', 'normal', styles.red), game.mode, game.elapsedTime, styles.red.seed),
  };
}

function addModeFlavor(input: GameInput['blue'], mode: GameMode, elapsed: number, seed: number): GameInput['blue'] {
  if (mode === 'glassWars') {
    return { ...input, build: Math.sin(elapsed * 2.1 + seed) > 0.82 };
  }

  if (mode === 'grenadeMayhem') {
    return { ...input, grenade: input.grenade || Math.sin(elapsed * 1.7 + seed) > 0.9 };
  }

  return input;
}

function createZombiePreviewInput(game: Parameters<typeof createDuelBotInput>[0], playerId: PlayerId, seed: number): PlayerInput {
  const player = game.players[playerId];
  const zombie = nearestZombie(player.x, player.y, game.zombies);
  if (!zombie || player.hp <= 0) {
    return { ...emptyInput[playerId], build: Math.sin(game.elapsedTime * 1.8 + seed) > 0.92 };
  }

  const dx = zombie.x - player.x;
  const dy = zombie.y - player.y;
  const distance = Math.hypot(dx, dy);
  const retreat = distance < 20;
  const strafe = Math.sin(game.elapsedTime * 1.6 + seed);

  return {
    ...emptyInput[playerId],
    up: retreat ? dy > 1.5 : dy < -1.5,
    down: retreat ? dy < -1.5 : dy > 1.5,
    left: retreat ? dx > 1.5 : strafe < -0.25,
    right: retreat ? dx < -1.5 : strafe > 0.25,
    shoot: distance < 44,
    build: distance < 18 && Math.sin(game.elapsedTime * 2.4 + seed) > 0.55,
    grenade: distance > 16 && distance < 34 && Math.sin(game.elapsedTime * 1.9 + seed) > 0.84,
  };
}

function nearestZombie(x: number, y: number, zombies: Zombie[]): Zombie | null {
  return zombies.reduce<Zombie | null>((nearest, zombie) => {
    if (!nearest) return zombie;
    return Math.hypot(zombie.x - x, zombie.y - y) < Math.hypot(nearest.x - x, nearest.y - y) ? zombie : nearest;
  }, null);
}
