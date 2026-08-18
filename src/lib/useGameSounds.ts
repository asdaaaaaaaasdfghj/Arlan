import { useEffect, useRef, type MutableRefObject } from 'react';
import type { GameState } from './arenaShooter';
import { isMiniGamesMode, getMiniGameRule } from './arenaMiniGames';
import { isSwordMode } from './arenaModes';
import type { PlayerId } from './arenaTypes';

const shotSoundUrl = `${import.meta.env.BASE_URL}sounds/revolver-shot.mp3`;
const flameSoundUrl = `${import.meta.env.BASE_URL}sounds/fireignite.mp3`;
const swordSoundUrl = `${import.meta.env.BASE_URL}sounds/sword-blade.mp3`;
const lavaSoundUrl = `${import.meta.env.BASE_URL}sounds/lava-crunchy-bang.mp3`;
const teleportSoundUrl = `${import.meta.env.BASE_URL}sounds/teleport-opening-sound.mp3`;

export function useGameSounds(game: GameState) {
  const previousShotsRef = useRef(getPlayerShots(game));
  const previousEffectsRef = useRef(getPlayerEffects(game));
  const audioPoolsRef = useRef<Record<GameSound, HTMLAudioElement[]>>({
    shot: [],
    flame: [],
    sword: [],
    lava: [],
    teleport: [],
  });

  useEffect(() => {
    const nextShots = getPlayerShots(game);
    const previousShots = previousShotsRef.current;
    previousShotsRef.current = nextShots;

    (['blue', 'red'] satisfies PlayerId[]).forEach((id) => {
      if (nextShots[id] <= previousShots[id]) {
        return;
      }

      playSound(getSoundForPlayer(game, id), audioPoolsRef);
    });
  }, [game.players.blue.shotsFired, game.players.red.shotsFired]);

  useEffect(() => {
    const nextEffects = getPlayerEffects(game);
    const previousEffects = previousEffectsRef.current;
    previousEffectsRef.current = nextEffects;

    (['blue', 'red'] satisfies PlayerId[]).forEach((id) => {
      if (nextEffects[id].burnTimer > previousEffects[id].burnTimer + 0.2) {
        playSound('lava', audioPoolsRef);
      }

      if (nextEffects[id].portalCooldown > previousEffects[id].portalCooldown + 0.1) {
        playSound('teleport', audioPoolsRef);
      }
    });
  }, [
    game.players.blue.burnTimer,
    game.players.red.burnTimer,
    game.players.blue.portalCooldown,
    game.players.red.portalCooldown,
  ]);
}

type GameSound = 'shot' | 'flame' | 'sword' | 'lava' | 'teleport';

type PlayerEffects = Record<PlayerId, {
  burnTimer: number;
  portalCooldown: number;
}>;

function getPlayerShots(game: GameState): Record<PlayerId, number> {
  return {
    blue: game.players.blue.shotsFired,
    red: game.players.red.shotsFired,
  };
}

function getPlayerEffects(game: GameState): PlayerEffects {
  return {
    blue: {
      burnTimer: game.players.blue.burnTimer,
      portalCooldown: game.players.blue.portalCooldown,
    },
    red: {
      burnTimer: game.players.red.burnTimer,
      portalCooldown: game.players.red.portalCooldown,
    },
  };
}

function getSoundForPlayer(game: GameState, id: PlayerId): GameSound {
  if (isSwordMode(game.mode) || (isMiniGamesMode(game) && getMiniGameRule(game).sword)) {
    return 'sword';
  }

  return game.players[id].weapon === 'flamethrower' ? 'flame' : 'shot';
}

function playSound(kind: GameSound, audioPoolsRef: MutableRefObject<Record<GameSound, HTMLAudioElement[]>>) {
  const sound = getReadyAudio(audioPoolsRef.current[kind], getSoundUrl(kind));
  sound.currentTime = 0;
  sound.playbackRate = getPlaybackRate(kind);
  sound.volume = getVolume(kind) * randomBetween(0.92, 1.06);
  void sound.play().catch(() => undefined);
}

function getSoundUrl(kind: GameSound): string {
  if (kind === 'flame') return flameSoundUrl;
  if (kind === 'sword') return swordSoundUrl;
  if (kind === 'lava') return lavaSoundUrl;
  if (kind === 'teleport') return teleportSoundUrl;
  return shotSoundUrl;
}

function getVolume(kind: GameSound): number {
  if (kind === 'flame') return 0.38;
  if (kind === 'sword') return 0.5;
  if (kind === 'lava') return 0.5;
  if (kind === 'teleport') return 0.46;
  return 0.45;
}

function getPlaybackRate(kind: GameSound): number {
  if (kind === 'shot') return randomBetween(0.92, 1.1);
  if (kind === 'flame') return randomBetween(0.96, 1.04);
  if (kind === 'sword') return randomBetween(0.94, 1.08);
  return randomBetween(0.98, 1.03);
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
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
