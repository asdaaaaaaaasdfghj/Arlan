import { useEffect, useRef, type MutableRefObject } from 'react';
import type { GameState } from './arenaShooter';
import { isMiniGamesMode, getMiniGameRule } from './arenaMiniGames';
import { isSwordMode } from './arenaModes';
import type { PlayerId } from './arenaTypes';

const shotSoundUrl = `${import.meta.env.BASE_URL}sounds/revolver-shot.mp3`;
const flameSoundUrl = `${import.meta.env.BASE_URL}sounds/fireignite.mp3`;

export function useShotSound(game: GameState) {
  const previousShotsRef = useRef(getPlayerShots(game));
  const audioPoolsRef = useRef<Record<ShotSound, HTMLAudioElement[]>>({
    shot: [],
    flame: [],
  });

  useEffect(() => {
    const nextShots = getPlayerShots(game);
    const previousShots = previousShotsRef.current;
    previousShotsRef.current = nextShots;

    if (isSwordMode(game.mode) || (isMiniGamesMode(game) && getMiniGameRule(game).sword)) {
      return;
    }

    (['blue', 'red'] satisfies PlayerId[]).forEach((id) => {
      if (nextShots[id] <= previousShots[id]) {
        return;
      }

      playSound(getSoundForPlayer(game, id), audioPoolsRef);
    });
  }, [game.players.blue.shotsFired, game.players.red.shotsFired]);
}

type ShotSound = 'shot' | 'flame';

function getPlayerShots(game: GameState): Record<PlayerId, number> {
  return {
    blue: game.players.blue.shotsFired,
    red: game.players.red.shotsFired,
  };
}

function getSoundForPlayer(game: GameState, id: PlayerId): ShotSound {
  return game.players[id].weapon === 'flamethrower' ? 'flame' : 'shot';
}

function playSound(kind: ShotSound, audioPoolsRef: MutableRefObject<Record<ShotSound, HTMLAudioElement[]>>) {
  const sound = getReadyAudio(audioPoolsRef.current[kind], kind === 'flame' ? flameSoundUrl : shotSoundUrl);
  sound.currentTime = 0;
  sound.volume = kind === 'flame' ? 0.38 : 0.45;
  void sound.play().catch(() => undefined);
}

function getReadyAudio(pool: HTMLAudioElement[], url: string): HTMLAudioElement {
  const ready = pool.find((sound) => sound.paused || sound.ended);
  if (ready) {
    return ready;
  }

  const sound = new Audio(url);
  sound.preload = 'auto';
  pool.push(sound);
  return sound;
}
