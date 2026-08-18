import { useEffect, useRef, type MutableRefObject } from 'react';
import type { GameState } from './arenaShooter';
import { isMiniGamesMode, getMiniGameRule } from './arenaMiniGames';
import { isSwordMode } from './arenaModes';

const shotSoundUrl = `${import.meta.env.BASE_URL}sounds/revolver-shot.mp3`;

export function useShotSound(game: GameState) {
  const previousShotsRef = useRef(getShotCount(game));
  const audioPoolRef = useRef<HTMLAudioElement[]>([]);

  useEffect(() => {
    const nextShots = getShotCount(game);
    const previousShots = previousShotsRef.current;
    previousShotsRef.current = nextShots;

    if (nextShots <= previousShots) {
      return;
    }

    if (isSwordMode(game.mode) || (isMiniGamesMode(game) && getMiniGameRule(game).sword)) {
      return;
    }

    playShot(audioPoolRef);
  }, [game.players.blue.shotsFired, game.players.red.shotsFired]);
}

function getShotCount(game: GameState): number {
  return game.players.blue.shotsFired + game.players.red.shotsFired;
}

function playShot(audioPoolRef: MutableRefObject<HTMLAudioElement[]>) {
  const sound = getReadyAudio(audioPoolRef.current);
  sound.currentTime = 0;
  sound.volume = 0.45;
  void sound.play().catch(() => undefined);
}

function getReadyAudio(pool: HTMLAudioElement[]): HTMLAudioElement {
  const ready = pool.find((sound) => sound.paused || sound.ended);
  if (ready) {
    return ready;
  }

  const sound = new Audio(shotSoundUrl);
  sound.preload = 'auto';
  pool.push(sound);
  return sound;
}
